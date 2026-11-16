import { EARTH } from "./flightSim.js";

// CubeSat flight model for scenario 3 (no React). Same frame as flightSim: 2D, metres and
// m/s, origin at Earth's centre, round non-rotating Earth with no air. The flight state
// carries `body` so flightSim's flightReadouts and predictedPath work on it.
// Propellant is unlimited for this mission, but the CubeSat still has mass: thrust gives
// a fixed acceleration of THRUST_N / MASS_KG at full throttle.
export const MASS_KG = 24;
export const THRUST_N = 240; // 10 m/s² at full throttle
export const START_ALTITUDE_KM = 150;
export const GEO_ALTITUDE_KM = 35786; // geostationary orbit, above the equator

// Attitude is the angle of the nose from the prograde direction (degrees, positive
// toward radial out), held relative to the direction of travel. It turns toward a
// commanded attitude at SLEW_RATE degrees per second of real time (not mission time),
// so a 180° flip takes half a second whatever the time warp.
export const ATTITUDES = { prograde: 0, retrograde: 180 };
const SLEW_RATE = 360;
const START_ATTITUDE = 90; // radial out: neither button's direction

const SUBSTEP = 0.25; // s of mission time

// The path flown so far (for TrajectoryView): a point every TRACK_INTERVAL seconds of
// mission time, keeping only the latest MAX_TRACK_POINTS (several low orbits, or most of
// a transfer orbit).
const TRACK_INTERVAL = 30;
const MAX_TRACK_POINTS = 1500;

// Wraps an angle into (-180, 180].
export const wrapAngle = (deg) => 180 - ((((180 - deg) % 360) + 360) % 360);

// Circular orbit START_ALTITUDE_KM up, anticlockwise, starting at the top of the view.
export const initialCubesat = () => {
  const r = EARTH.radius + START_ALTITUDE_KM * 1000;
  return {
    body: EARTH,
    time: 0,
    x: 0,
    y: r,
    vx: -Math.sqrt(EARTH.gm / r),
    vy: 0,
    attitude: START_ATTITUDE,
    crashed: false,
    track: [], // [{ x, y }] in m; a new array whenever a point is added
    trackTime: null,
  };
};

// Default transfer orbit for M3S4 when M3S2 didn't pass one: perigee and apogee heights
// in metres, as a full-throttle prograde burn from START_ALTITUDE_KM leaves them.
export const DEFAULT_TRANSFER = { perigee: 163e3, apogee: GEO_ALTITUDE_KM * 1e3 };

// The CubeSat on an orbit with the given perigee and apogee heights (m), `lead` seconds of
// mission time before the apogee, facing prograde. Same orientation as initialCubesat
// after a burn there: perigee at the top of the view, apogee below Earth, anticlockwise.
// `time` is the mission time to start the clock at (null: the coast from perigee).
export const cubesatBeforeApogee = ({ perigee, apogee }, lead, time = null) => {
  const { gm, radius } = EARTH;
  const rp = radius + perigee;
  const ra = radius + apogee;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const b = a * Math.sqrt(1 - e * e);
  const n = Math.sqrt(gm / a ** 3); // mean motion
  // Mean anomaly `lead` seconds before apogee (π), then Kepler's equation for E.
  const m = Math.PI - n * lead;
  let E = m;
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  const rate = n / (1 - e * Math.cos(E)); // dE/dt
  // Perifocal frame (perigee on +x, anticlockwise), then turned 90° so the perigee is up.
  const px = a * (Math.cos(E) - e);
  const py = b * Math.sin(E);
  const pvx = -a * Math.sin(E) * rate;
  const pvy = b * Math.cos(E) * rate;
  return {
    ...initialCubesat(),
    time: time ?? m / n,
    x: -py,
    y: px,
    vx: -pvy,
    vy: pvx,
    attitude: ATTITUDES.prograde,
  };
};

// Unit vector the nose points along (world frame) for an attitude.
const noseDirection = ({ x, y, vx, vy }, attitude) => {
  const speed = Math.hypot(vx, vy);
  const sense = Math.sign(x * vy - y * vx) || 1; // +1 anticlockwise
  // Radial out is the velocity turned 90° away from the planet: clockwise when moving
  // anticlockwise.
  const angle = (-sense * attitude * Math.PI) / 180;
  const ux = vx / speed;
  const uy = vy / speed;
  return { x: ux * Math.cos(angle) - uy * Math.sin(angle), y: ux * Math.sin(angle) + uy * Math.cos(angle) };
};

// Where the nose (and so the thrust) points, as a world-frame unit vector.
export const thrustDirection = (flight) => noseDirection(flight, flight.attitude);

// Is the attitude still turning toward `target` (degrees, or null for none)?
export const isTurning = (attitude, target) => target !== null && Math.abs(wrapAngle(target - attitude)) > 0.5;

const slew = (attitude, target, realDt) => {
  if (target === null) return attitude;
  const diff = wrapAngle(target - attitude);
  const step = SLEW_RATE * realDt;
  // A half turn has no shorter side; it goes the positive way.
  return Math.abs(diff) <= step ? target : wrapAngle(attitude + (diff >= 0 ? step : -step));
};

// Advances the CubeSat by `dt` seconds of mission time and `realDt` of real time (for
// the attitude turn). `controls`: { throttle (0–1), targetAttitude (degrees, or null to
// hold) }. Stops for good once it hits the ground (`crashed`).
// Returns the same object when nothing changes (paused with the attitude settled).
export const stepCubesat = (flight, { throttle, targetAttitude }, dt, realDt) => {
  const attitude = slew(flight.attitude, targetAttitude, realDt);
  if (flight.crashed || (dt <= 0 && attitude === flight.attitude)) return flight;

  let { x, y, vx, vy, time } = flight;
  const { gm, radius } = flight.body;
  const accel = (THRUST_N / MASS_KG) * throttle;
  let remaining = dt;
  let crashed = false;
  while (remaining > 1e-9) {
    const step = Math.min(SUBSTEP, remaining);
    const r = Math.hypot(x, y);
    const nose = noseDirection({ x, y, vx, vy }, attitude);
    // Semi-implicit Euler: velocity first, then position with the new velocity.
    vx += (accel * nose.x - (gm * x) / r ** 3) * step;
    vy += (accel * nose.y - (gm * y) / r ** 3) * step;
    x += vx * step;
    y += vy * step;
    time += step;
    remaining -= step;
    if (Math.hypot(x, y) <= radius) {
      crashed = true;
      break;
    }
  }
  let { track, trackTime } = flight;
  if (trackTime === null || time - trackTime >= TRACK_INTERVAL) {
    track = [...track.slice(-(MAX_TRACK_POINTS - 1)), { x, y }];
    trackTime = time;
  }
  return { ...flight, time, x, y, vx, vy, attitude, crashed, track, trackTime };
};

// Orbital period in seconds, or null on an escape path.
export const orbitalPeriod = ({ x, y, vx, vy, body }) => {
  const energy = (vx * vx + vy * vy) / 2 - body.gm / Math.hypot(x, y);
  if (energy >= 0) return null;
  const a = -body.gm / (2 * energy);
  return 2 * Math.PI * Math.sqrt(a ** 3 / body.gm);
};
