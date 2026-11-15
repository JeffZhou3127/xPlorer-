// The trans-lunar injection (mission 2, step 4): a burn from the 200 km parking orbit around
// the half-size Earth toward the Moon. No React.
// Earth-centred frame: Earth at the origin, the spacecraft and the Moon both moving
// counter-clockwise in the same plane; distances in m, speeds in m/s, time in s.
// Only Earth pulls (patched conics): the Moon's own gravity takes over once the spacecraft
// passes within ENCOUNTER_DISTANCE of it, which is where this step ends.
import { M2_ORBIT_ALTITUDE_KM, SCALE, SCALED_EARTH_GM, SCALED_EARTH_RADIUS } from "./landerPhysics.js";
import { specificImpulse, spendDeltaV, stagePhases } from "./rocketPhysics.js";

export const HOUR = 3600;
export const DAY = 24 * HOUR;
// How far ahead the path is followed, and how often its points are recorded.
export const MAX_TIME = 10 * DAY;
const POINT_STEP = 600;

// The Moon, on a circular orbit at half its real distance (192,200 km). Same surface
// gravity, so its GM drops to a quarter, like Earth's; the orbit takes about 19 days.
export const MOON_ORBIT = 384400e3 / SCALE;
const MOON_RATE = Math.sqrt(SCALED_EARTH_GM / MOON_ORBIT ** 3); // rad/s
// The Moon's sphere of influence (real ~66,000 km), also halved.
export const ENCOUNTER_DISTANCE = 33000e3;

export const PARKING_RADIUS = SCALED_EARTH_RADIUS + M2_ORBIT_ALTITUDE_KM * 1000;
const PARKING_SPEED = Math.sqrt(SCALED_EARTH_GM / PARKING_RADIUS);
// Where the spacecraft is at the burn (degrees from +x; -90 is the bottom of the view).
export const START_ANGLE = -90;

// Form limits: the Moon's lead and the burn angle in degrees, the burn in m/s.
// A Hohmann-style burn (~2,180 m/s, 0°) reaches the Moon's distance after ~3.5 days, while
// the Moon moves on ~65°, so it should lead by about 115° at the burn.
export const PHASE_RANGE = { min: 0, max: 180, step: 0.5 };
export const ANGLE_RANGE = { min: -90, max: 90, step: 0.1 };
export const BURN_RANGE = { min: 0, max: 4000, step: 1 };

const rad = (deg) => (deg * Math.PI) / 180;

// Where the Moon is `t` s after the burn, when it led the spacecraft by `phaseAngle`°.
export const moonAt = (phaseAngle, t) => {
  const angle = rad(START_ANGLE + phaseAngle) + MOON_RATE * t;
  return { x: MOON_ORBIT * Math.cos(angle), y: MOON_ORBIT * Math.sin(angle) };
};

const moonVelocity = (phaseAngle, t) => {
  const { x, y } = moonAt(phaseAngle, t);
  return { x: -y * MOON_RATE, y: x * MOON_RATE };
};

// The path after a burn of `burn` m/s, `angle`° from the spacecraft's direction of travel
// (positive = outward, away from Earth), with the Moon `phaseAngle`° ahead. Returns
// { points: [{ t, x, y }] (every POINT_STEP s), closest: { distance, t, at, target, vInf },
// apogee (m from Earth's centre, or null if the path escapes Earth), crashes }: the closest
// approach to the Moon with where the Moon is then and the speed relative to it, and
// whether the path falls back into Earth (where it ends).
export const transferPath = (burn, angle, phaseAngle) => {
  const start = { x: PARKING_RADIUS * Math.cos(rad(START_ANGLE)), y: PARKING_RADIUS * Math.sin(rad(START_ANGLE)) };
  const radial = { x: start.x / PARKING_RADIUS, y: start.y / PARKING_RADIUS };
  const tangent = { x: -radial.y, y: radial.x };
  const along = PARKING_SPEED + burn * Math.cos(rad(angle));
  const out = burn * Math.sin(rad(angle));

  let pos = start;
  let vel = { x: tangent.x * along + radial.x * out, y: tangent.y * along + radial.y * out };
  const accel = (p) => {
    const r = Math.hypot(p.x, p.y);
    const k = -SCALED_EARTH_GM / (r * r * r);
    return { x: k * p.x, y: k * p.y };
  };

  // Kepler apogee of the path, from its energy and angular momentum.
  const energy = (along * along + out * out) / 2 - SCALED_EARTH_GM / PARKING_RADIUS;
  const momentum = PARKING_RADIUS * along;
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * momentum * momentum) / SCALED_EARTH_GM ** 2));
  const apogee = energy < 0 ? (-SCALED_EARTH_GM / (2 * energy)) * (1 + e) : null;

  const points = [{ t: 0, ...pos }];
  let closest = { distance: Infinity, t: 0, at: pos, target: moonAt(phaseAngle, 0), vInf: 0 };
  let acc = accel(pos);
  let t = 0;
  let crashes = false;
  while (t < MAX_TIME && !crashes) {
    // Velocity Verlet, with a step of about 1/500 of the local circular orbit's period,
    // so the fast pass near Earth stays accurate and the slow coast stays cheap.
    const r = Math.hypot(pos.x, pos.y);
    const steps = Math.ceil(POINT_STEP / (0.002 * 2 * Math.PI * Math.sqrt(r ** 3 / SCALED_EARTH_GM)));
    const dt = POINT_STEP / steps;
    for (let i = 0; i < steps; i++) {
      const half = { x: vel.x + (acc.x * dt) / 2, y: vel.y + (acc.y * dt) / 2 };
      pos = { x: pos.x + half.x * dt, y: pos.y + half.y * dt };
      acc = accel(pos);
      vel = { x: half.x + (acc.x * dt) / 2, y: half.y + (acc.y * dt) / 2 };
      t += dt;

      const moon = moonAt(phaseAngle, t);
      const distance = Math.hypot(pos.x - moon.x, pos.y - moon.y);
      if (distance < closest.distance) {
        const mv = moonVelocity(phaseAngle, t);
        closest = { distance, t, at: pos, target: moon, vInf: Math.hypot(vel.x - mv.x, vel.y - mv.y) };
      }
      if (Math.hypot(pos.x, pos.y) < SCALED_EARTH_RADIUS) {
        crashes = true;
        break;
      }
    }
    points.push({ t, ...pos });
  }
  return { points, closest, apogee, crashes };
};

// Spacecraft position `t` s after the burn, between the path's points.
export const positionAt = (points, t) => {
  const i = Math.min(points.length - 2, Math.max(0, Math.floor(t / POINT_STEP)));
  const p = points[i];
  const q = points[i + 1];
  const u = Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t)));
  return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u };
};

// In space the engines run at their vacuum Isp.
const vacuumIsp = (stage) => specificImpulse(stage, 1000);

// Δv the stages still attached can give in space (the active one part-used; `flight` is
// the route state's { stageIndex, stageFuel }), pushing the lander (`payloadMass`, t).
export const availableDeltaV = (stages, { stageIndex, stageFuel }, payloadMass) =>
  stagePhases(stages, stageIndex, stageFuel, payloadMass, vacuumIsp).reduce((sum, phase) => sum + phase.deltaV, 0);

// The stages after a burn of `burn` m/s: those it empties separate (see spendDeltaV).
export const burnStages = (stages, { stageIndex, stageFuel }, payloadMass, burn) =>
  spendDeltaV(stages, stageIndex, stageFuel, payloadMass, burn, vacuumIsp);

// Propellant (t) on board the attached stages.
export const fuelOnBoard = (stages, { stageIndex, stageFuel }) =>
  stages.reduce((sum, stage, i) => sum + (i >= stageIndex ? stage.fuel * stageFuel[i] : 0), 0);

// The coast along `path` for the cruise systems (cruiseTimeline, see planetCourse): at
// Earth's distance from the Sun throughout, headed for the Moon. The trip takes days rather
// than months, so the cabin warms faster (a smaller thermal buffer, tuned for gameplay):
// radiators too small for the heat load still overheat it before the Moon.
export const moonCourse = (path, phaseAngle) => ({
  at: (t) => positionAt(path.points, t),
  au: () => 1,
  targetAt: (t) => moonAt(phaseAngle, t),
  target: "Moon",
  thermalMass: 15000,
});
