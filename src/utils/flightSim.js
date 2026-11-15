import {
  EARTH_GM,
  EARTH_RADIUS,
  SRB_BURN_TIME,
  ambientPressure,
  dryMass,
  srbDryMass,
  srbThrust,
  stageBurnTime,
  stageThrust,
} from "./rocketPhysics.js";

// Simplified flight model for the flight panel (no React). Time is in seconds from
// ignition (negative during the countdown); fuel is the fraction left (0–1).
// The rocket flies in a 2D plane through the centre of a round, non-rotating Earth.
// Position and velocity are in metres and m/s, with the origin at Earth's centre and
// the launch pad at (0, EARTH_RADIUS); +x is downrange (to the right on screen).
export const COUNTDOWN = 10;

// Longest single integration step (s). Bigger frame steps (time warp) are split up.
const SUBSTEP = 0.02;

// Air resistance: drag = ½ ρ v² Cd A.
const SEA_LEVEL_DENSITY = 1.225; // kg/m³; falls off with altitude like the pressure
const CORE_DIAMETER = 3.7; // m, a wide (lower) stage
const UPPER_DIAMETER = 2.6; // m, the narrow top stage and fairing
const SRB_DIAMETER = 1.8; // m, each booster

const airDensity = (altitude) =>
  (SEA_LEVEL_DENSITY * ambientPressure(altitude / 1000)) / ambientPressure(0);

// Speed of sound falls from ~340 m/s at sea level to ~295 m/s at 11 km, then holds.
const speedOfSound = (altitude) => 340 - 45 * Math.min(1, Math.max(0, altitude) / 11000);

// Drag coefficient against Mach number: low when subsonic, peaking through the
// transonic region (shock waves form), then easing off as the flow goes supersonic.
const dragCoefficient = (mach) => {
  if (mach < 0.8) return 0.3;
  if (mach < 1.1) return 0.3 + ((mach - 0.8) / 0.3) * 0.25;
  return Math.max(0.25, 0.55 - (mach - 1.1) * 0.1);
};

const circleArea = (diameter) => Math.PI * (diameter / 2) ** 2;

// Frontal area of what's left: the widest stage, plus the two boosters if attached.
const frontalArea = (stages, stageIndex, srbsAttached) =>
  circleArea(stageIndex < stages.length - 1 ? CORE_DIAMETER : UPPER_DIAMETER) +
  (srbsAttached ? 2 * circleArea(SRB_DIAMETER) : 0);

// Current mass in kg: the remaining stages (with their fuel left), boosters and payload.
const currentMass = (flight, stages, srbs, payloadMass) => {
  let tonnes = payloadMass;
  for (let i = flight.stageIndex; i < stages.length; i++) {
    tonnes += dryMass(stages[i]) + stages[i].fuel * flight.stageFuel[i];
  }
  if (flight.srbFuel !== null) tonnes += srbDryMass(srbs) + srbs.fuel * flight.srbFuel;
  return tonnes * 1000;
};

// Before T-0 the controls can be set, but nothing moves or burns.
export const initialFlight = (stages, srbs) => ({
  time: -COUNTDOWN,
  pitch: 0, // degrees from local vertical, positive = right (downrange)
  stageIndex: 0, // stages[stageIndex] is the active (bottom) stage; lower ones are gone
  stageFuel: stages.map(() => 1),
  srbFuel: srbs ? 1 : null, // null once dropped (or never fitted)
  // The most recent separation, for the staging animation:
  // { time, stageIndex (the active stage just before it), stage (a stage dropped?), srbs (SRBs dropped?) }
  separation: null,
  x: 0,
  y: EARTH_RADIUS,
  vx: 0,
  vy: 0,
  drag: 0, // current drag force, N
  // Positions flown so far ({ x, y } in m), one every TRACK_INTERVAL seconds from T-0.
  track: [],
  // When the orbit goal was met (see stepFlight), or null.
  orbitGoalTime: null,
  coastEndTime: null, // when a coast (controls.coastLead) reached its end
  liftedOff: false, // has left the ground at some point
  failure: null, // set (see failureRecord) when the mission fails; the flight then stops

  trackTime: null,
});

// Seconds of flight between recorded track points.
const TRACK_INTERVAL = 1;

// Is `value` (m, or null) inside `range` ({ min, max } in m)?
export const inRange = (value, range) => value !== null && value >= range.min && value <= range.max;

// What went wrong, for the mission failure screen: `kind` ("crash" | "fuel" | "twr"), which goal
// was being attempted (1 = apogee, 2 = orbit, from "Next goal" on), when, and the
// trajectory at that moment (metres and m/s).
const failureRecord = (kind, flight, goal, extra = {}) => {
  const { altitude, apogee, perigee } = flightReadouts(flight);
  return {
    kind,
    goal,
    time: flight.time,
    altitude,
    apogee,
    perigee,
    ...extra,
  };
};

// Wraps an angle into (-180, 180].
const wrapAngle = (deg) => 180 - ((((180 - deg) % 360) + 360) % 360);

// One integration step of `dt` seconds (all of it after T-0).
const integrate = (flight, controls, dt) => {
  const { stages, srbs, payloadMass, pitchRate, throttle } = controls;
  const { targetPerigee, coastLead, coastStarted = false } = controls;
  const { stageIndex, x, y, vx, vy } = flight;
  const r = Math.hypot(x, y);
  const up = { x: x / r, y: y / r };
  const right = { x: up.y, y: -up.x }; // local horizontal, downrange
  const altitude = r - EARTH_RADIUS;
  const mass = currentMass(flight, stages, srbs, payloadMass);

  // Thrust along the rocket's axis, tilted `pitch` from local vertical.
  const stage = stages[stageIndex];
  const srbsAttached = flight.srbFuel !== null;
  let thrust = flight.stageFuel[stageIndex] > 0 ? stageThrust(stage, altitude / 1000) * throttle : 0;
  if (srbsAttached) thrust += srbThrust(srbs);
  const angle = (flight.pitch * Math.PI) / 180;
  const axis = {
    x: up.x * Math.cos(angle) + right.x * Math.sin(angle),
    y: up.y * Math.cos(angle) + right.y * Math.sin(angle),
  };

  // Drag opposes the motion through the air.
  const speed = Math.hypot(vx, vy);
  const mach = speed / speedOfSound(altitude);
  const drag =
    0.5 * airDensity(altitude) * speed * speed * dragCoefficient(mach) *
    frontalArea(stages, stageIndex, srbsAttached);

  // Inverse-square gravity toward Earth's centre.
  const gravity = EARTH_GM / (r * r);

  const ax = (thrust * axis.x - (speed > 0 ? (drag * vx) / speed : 0)) / mass - gravity * up.x;
  const ay = (thrust * axis.y - (speed > 0 ? (drag * vy) / speed : 0)) / mass - gravity * up.y;

  // Semi-implicit Euler: update velocity first, then move with the new velocity.
  let nvx = vx + ax * dt;
  let nvy = vy + ay * dt;
  let nx = x + nvx * dt;
  let ny = y + nvy * dt;

  // The ground: the rocket can't sink into it, and stops dead when it touches down
  // (so it sits on the pad until thrust beats its weight).
  const nr = Math.hypot(nx, ny);
  let crashSpeed = null; // set if this step brings a flying rocket back to the ground
  if (nr < EARTH_RADIUS) {
    if (flight.liftedOff) crashSpeed = Math.hypot(nvx, nvy);
    nx = (nx / nr) * EARTH_RADIUS;
    ny = (ny / nr) * EARTH_RADIUS;
    nvx = 0;
    nvy = 0;
  }

  // Fuel use and staging.
  const stageFuel = [...flight.stageFuel];
  let { srbFuel, separation } = flight;
  let nextStage = stageIndex;
  const time = flight.time + dt;

  if (srbFuel !== null) {
    srbFuel -= dt / SRB_BURN_TIME;
    if (srbFuel <= 0) {
      srbFuel = null;
      separation = { time, stageIndex, stage: false, srbs: true };
    }
  }

  const left = stageFuel[stageIndex] - (throttle * dt) / stageBurnTime(stage);
  stageFuel[stageIndex] = Math.max(0, left);
  if (left <= 0 && stageIndex < stages.length - 1) {
    // SRBs still attached (or dropping this same step) go with the stage.
    separation = { time, stageIndex, stage: true, srbs: srbsAttached };
    nextStage += 1;
    srbFuel = null;
  }

  const next = {
    ...flight,
    time,
    pitch: wrapAngle(flight.pitch + pitchRate * dt),
    stageIndex: nextStage,
    stageFuel,
    srbFuel,
    separation,
    x: nx,
    y: ny,
    vx: nvx,
    vy: nvy,
    drag,
    liftedOff: flight.liftedOff || nr > EARTH_RADIUS,
  };

  // Mission phases (see stepFlight): ascent → coast → circularise. Each event is recorded
  // once, as the time it happened; nothing here touches the engines. (The ascent goal,
  // apogee in range, is checked live by the caller.)
  const coasting = coastStarted && next.coastEndTime === null;

  // Coast: ends within `coastLead` seconds of apogee (or past it, or escaping).
  if (coasting && coastLead !== undefined) {
    const remaining = timeToApogee(next);
    if (remaining === null || remaining <= coastLead) next.coastEndTime = time;
  }

  // Circularise goal: everything shut down (no thrust at all) with the perigee in range.
  if (coastStarted && !coasting && next.orbitGoalTime === null && targetPerigee !== undefined) {
    const { perigee } = flightReadouts(next);
    if (thrust === 0 && inRange(perigee, targetPerigee)) next.orbitGoalTime = time;
  }

  // Failures end the flight (stepFlight stops advancing once one is set).
  const goal = coastStarted ? 2 : 1;
  if (crashSpeed !== null) {
    next.failure = failureRecord("crash", next, goal, { speed: crashSpeed });
  } else if (next.orbitGoalTime === null && targetPerigee !== undefined) {
    // Out of fuel for good: the last stage is empty and no boosters are left, and the
    // orbit isn't there yet (perigee out of range), so no goal can still be reached.
    const last = stages.length - 1;
    const empty = nextStage === last && stageFuel[last] <= 0 && srbFuel === null;
    if (empty) {
      const { perigee } = flightReadouts(next);
      if (!inRange(perigee, targetPerigee)) next.failure = failureRecord("fuel", next, goal);
    }
  }
  return next;
};

// Thrust-to-weight ratio on the pad: full SRB thrust plus the first stage at `throttle`,
// against the whole rocket's weight at the surface.
export const launchTwr = (flight, controls) => {
  const { stages, srbs, payloadMass, throttle } = controls;
  const thrust =
    stageThrust(stages[flight.stageIndex], 0) * throttle + (flight.srbFuel !== null ? srbThrust(srbs) : 0);
  const weight = (currentMass(flight, stages, srbs, payloadMass) * EARTH_GM) / EARTH_RADIUS ** 2;
  return thrust / weight;
};

// Advances the flight by `dt` seconds.
// `controls`: { stages, srbs, payloadMass (t), pitchRate (°/s), throttle (0–1),
//   and the optional mission settings targetPerigee ({ min, max } in m), coastLead (s),
//   coastStarted (bool) }.
// - Pitch changes at `pitchRate`, measured from the local vertical.
// - The active stage burns at `throttle` of its full-throttle flow (0 = engines off);
//   its thrust depends on altitude (nozzle performance in thinning air).
// - Mission phases are recorded, never enforced (the caller handles the engines):
//   - ascent (until `coastStarted`): nothing is recorded; the caller checks the apogee;
//   - coast (from `coastStarted`): `flight.coastEndTime` is set once the rocket is within
//     `coastLead` seconds of apogee, which ends the coast;
//   - circularise (after the coast): `flight.orbitGoalTime` is set when the rocket is
//     producing no thrust with its perigee inside `targetPerigee`.
// - The mission fails (`flight.failure`, and the flight stops advancing) if the thrust
//   can't lift the rocket at T-0 (thrust-to-weight ratio below 1, see launchTwr), if
//   the rocket touches the ground again after leaving it, or runs out of fuel completely
//   (last stage empty, no SRBs) before the orbit goal, with the perigee out of range.
// - SRBs can't throttle or shut down: they burn at full thrust until empty, then drop away.
// - When the active stage runs dry it separates (taking any SRBs with it) and the next
//   stage takes over. The top stage stays on, empty, when it runs out.
// - Gravity (inverse square) and air drag act throughout.
export const stepFlight = (flight, controls, dt) => {
  let f = flight;
  let remaining = dt;

  // Countdown: nothing happens until T-0.
  if (f.time < 0) {
    const wait = Math.min(remaining, -f.time);
    f = { ...f, time: f.time + wait };
    remaining -= wait;
    // Ignition: a rocket whose thrust can't beat its weight never leaves the pad.
    if (f.time >= 0 && controls.targetPerigee !== undefined) {
      const twr = launchTwr(f, controls);
      if (twr < 1) f = { ...f, failure: failureRecord("twr", f, 1, { twr, throttle: controls.throttle }) };
    }
  }

  if (f.failure) return f; // the flight is over
  while (remaining > 1e-9 && !f.failure) {
    const step = Math.min(SUBSTEP, remaining);
    f = integrate(f, controls, step);
    remaining -= step;
  }

  // The track array is only copied when a point is added, about once a second.
  // (The small allowance absorbs rounding in frame times that add up to a whole second.)
  if (f.time >= 0 && (f.trackTime === null || f.time - f.trackTime >= TRACK_INTERVAL - 1e-6)) {
    f = { ...f, track: [...f.track, { x: f.x, y: f.y }], trackTime: f.time };
  }
  return f;
};

// Readouts derived from the flight state: altitude and apsides in metres above the
// surface, speeds in m/s. Horizontal is along the local horizon (positive = downrange),
// vertical is straight up (positive = climbing).
// Apogee and perigee are the high and low points of the orbit the rocket would follow
// from here if the engines stopped and there were no air (a Kepler orbit).
// `apogee` is null on an escape trajectory; `perigee` is null when the orbit dips
// below the surface (a suborbital hop, so there is no real low point).
export const flightReadouts = ({ x, y, vx, vy }) => {
  const r = Math.hypot(x, y);
  const up = { x: x / r, y: y / r };
  const vertical = vx * up.x + vy * up.y;
  const horizontal = vx * up.y - vy * up.x;
  const speed = Math.hypot(vx, vy);

  const energy = (speed * speed) / 2 - EARTH_GM / r; // specific orbital energy
  const momentum = x * vy - y * vx; // specific angular momentum
  let apogee = null;
  let perigee = null;
  if (energy < 0) {
    const a = -EARTH_GM / (2 * energy);
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * momentum * momentum) / EARTH_GM ** 2));
    apogee = a * (1 + e) - EARTH_RADIUS;
    const low = a * (1 - e) - EARTH_RADIUS;
    perigee = low > 0 ? low : null;
  }

  return { altitude: r - EARTH_RADIUS, speed, horizontal, vertical, apogee, perigee };
};

// Furthest the predicted path is drawn (m from Earth's centre), so escape paths end.
const MAX_PATH_RADIUS = 10 * EARTH_RADIUS;
// Angular step of the predicted path (radians, about 28 km of ground per step).
const PATH_STEP = Math.PI / 720;

// The path the rocket would coast along from here with the engines off and no air:
// a Kepler conic, followed forward until it hits the ground, completes one orbit, or
// heads off past MAX_PATH_RADIUS. Returns [{ x, y }] in metres (empty while at rest).
export const predictedPath = ({ x, y, vx, vy }) => {
  const r = Math.hypot(x, y);
  const speed = Math.hypot(vx, vy);
  if (speed < 1) return [];

  const energy = (speed * speed) / 2 - EARTH_GM / r;
  const momentum = x * vy - y * vx;

  // Straight up or down: the conic degenerates to a line along the radius.
  if (Math.abs(momentum) < 1e-3 * r * speed) {
    const climbing = x * vx + y * vy > 0;
    const top = energy < 0 ? Math.min(-EARTH_GM / energy, MAX_PATH_RADIUS) : MAX_PATH_RADIUS;
    const end = climbing ? top : EARTH_RADIUS;
    return [{ x, y }, { x: (x / r) * end, y: (y / r) * end }];
  }

  // Eccentricity vector (points at perigee) and semi-latus rectum.
  const k = speed * speed - EARTH_GM / r;
  const radial = x * vx + y * vy;
  const ex = (k * x - radial * vx) / EARTH_GM;
  const ey = (k * y - radial * vy) / EARTH_GM;
  const e = Math.hypot(ex, ey);
  const p = (momentum * momentum) / EARTH_GM;
  const perigeeAngle = Math.atan2(ey, ex);

  const start = Math.atan2(y, x);
  const direction = Math.sign(momentum); // +1 anticlockwise, −1 clockwise
  const points = [{ x, y }];
  for (let i = 1; i * PATH_STEP <= 2 * Math.PI; i++) {
    const angle = start + direction * i * PATH_STEP;
    const denominator = 1 + e * Math.cos(angle - perigeeAngle);
    if (e >= 1 && denominator <= 0.02) break; // nearing a hyperbola's asymptote
    const radius = p / denominator;
    if (radius > MAX_PATH_RADIUS) break;
    if (radius < EARTH_RADIUS) {
      points.push({ x: EARTH_RADIUS * Math.cos(angle), y: EARTH_RADIUS * Math.sin(angle) });
      break;
    }
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
};

// Seconds until the rocket reaches apogee if it coasts from here (Kepler, no air):
// 0 once it is at or past apogee, null on an escape path (no apogee).
export const timeToApogee = ({ x, y, vx, vy }) => {
  const r = Math.hypot(x, y);
  const energy = (vx * vx + vy * vy) / 2 - EARTH_GM / r;
  if (energy >= 0) return null;

  const a = -EARTH_GM / (2 * energy); // semi-major axis
  const momentum = x * vy - y * vx;
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * momentum * momentum) / EARTH_GM ** 2));
  if (e < 1e-6) return 0; // circular: every point is the apogee

  // Eccentric anomaly from the radius; it's in the first half of the orbit (0…π)
  // while climbing toward apogee, the second half while falling away from it.
  const climbing = x * vx + y * vy > 0;
  const eccentric = Math.acos(Math.min(1, Math.max(-1, (1 - r / a) / e)));
  if (!climbing) return 0;

  const mean = eccentric - e * Math.sin(eccentric);
  const meanMotion = Math.sqrt(EARTH_GM / a ** 3);
  return (Math.PI - mean) / meanMotion;
};
