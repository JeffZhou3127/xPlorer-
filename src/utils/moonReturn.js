// The trans-Earth injection (mission 2, step 9): a burn from the 100 × 100 km lunar orbit
// that leaves the Moon and falls back to Earth, aimed so that the perigee grazes the
// atmosphere (0–100 km up). No React.
// Earth-centred frame like moonTransfer.js: Earth at the origin, the Moon moving
// counter-clockwise on its circular orbit. The lander orbits the Moon clockwise (seen from
// above the north pole, as it arrived in M2S5). Both Earth and the Moon pull on the lander
// the whole way (the Moon moves as Earth's gravity alone would move it, so the lander
// parked around it moves with it); distances in m, speeds in m/s, time in s.
import { SCALED_EARTH_GM, SCALED_EARTH_RADIUS } from "./landerPhysics.js";
import { MOON } from "./moonArrival.js";
import { LIFTOFF_ORBIT_KM } from "./lunarLiftoff.js";
import { DAY, HOUR, MOON_ORBIT } from "./moonTransfer.js";

export { DAY, HOUR, MOON_ORBIT };

// How far ahead the path is followed, and how often its points are recorded.
export const MAX_TIME = 10 * DAY;
const POINT_STEP = 600;
// The path is followed this long past the perigee (for the drawing).
const PAST_PERIGEE = 2 * HOUR;

const MOON_RATE = Math.sqrt(SCALED_EARTH_GM / MOON_ORBIT ** 3); // rad/s
// Where the Moon is at the burn (degrees from +x: 90° is the top of the view).
export const MOON_START_ANGLE = 90;

export const LUNAR_ORBIT_RADIUS = MOON.radius + LIFTOFF_ORBIT_KM * 1000;
const LUNAR_ORBIT_SPEED = Math.sqrt(MOON.gm / LUNAR_ORBIT_RADIUS);

// The goal: perigee 0–100 km above Earth, to enter the atmosphere without skipping out.
export const PERIGEE_TARGET_KM = { min: 0, max: 100 };
// What the reentry (M2S10) assumes without route state: a 50 km perigee on a path falling
// from the Moon's distance.
export const DEFAULT_PERIGEE = {
  altitude: 50e3,
  speed: Math.sqrt(
    SCALED_EARTH_GM * (2 / (SCALED_EARTH_RADIUS + 50e3) - 2 / (SCALED_EARTH_RADIUS + 50e3 + MOON_ORBIT)),
  ),
};

// Form limits: the lander's position in its orbit and the burn angle in degrees, the burn
// in m/s. Escaping the Moon from 100 km takes ~470 m/s; falling back to Earth needs ~590 m/s
// relative to the Moon, pointing backward along its orbit, so the burn is ~570 m/s.
export const POSITION_RANGE = { min: 0, max: 360, step: 0.5 };
export const ANGLE_RANGE = { min: -90, max: 90, step: 0.1 };
export const BURN_RANGE = { min: 0, max: 2000, step: 1 };

const rad = (deg) => (deg * Math.PI) / 180;
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a, k) => ({ x: a.x * k, y: a.y * k });
const length = (a) => Math.hypot(a.x, a.y);

// Where the Moon is `t` s after the burn, and how fast it moves.
export const moonAt = (t) => {
  const angle = rad(MOON_START_ANGLE) + MOON_RATE * t;
  return { x: MOON_ORBIT * Math.cos(angle), y: MOON_ORBIT * Math.sin(angle) };
};
const moonVelocity = (t) => {
  const { x, y } = moonAt(t);
  return { x: -y * MOON_RATE, y: x * MOON_RATE };
};

// The unit vector from the Moon's centre to the lander at `position`° in its orbit,
// measured clockwise from the direction the Moon travels along its orbit at the burn.
export const positionDirection = (position) => {
  const travel = rad(MOON_START_ANGLE + 90);
  const angle = travel - rad(position);
  return { x: Math.cos(angle), y: Math.sin(angle) };
};

// Earth-centred Kepler perigee (m from Earth's centre) of a lander at `pos` with `vel`.
const keplerPerigee = (pos, vel) => {
  const r = length(pos);
  const energy = (vel.x ** 2 + vel.y ** 2) / 2 - SCALED_EARTH_GM / r;
  const momentum = pos.x * vel.y - pos.y * vel.x;
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * momentum * momentum) / SCALED_EARTH_GM ** 2));
  return (momentum * momentum) / SCALED_EARTH_GM / (1 + e);
};

// The path after a burn of `burn` m/s, `angle`° from the lander's direction of travel in its
// lunar orbit (positive = outward, away from the Moon), made at `position`° around the Moon.
// Returns { points: [{ t, x, y }] (every POINT_STEP s), escapes (whether the burn leaves the
// Moon), moonVInf (m/s relative to the Moon once clear of it, or null), perigee: { t, at,
// altitude (m above Earth's surface; negative when the path would pass below it), speed },
// result: "perigee" (passed it), "earth" (hit Earth before it: perigee from its orbit then),
// "moon" (hit the Moon) or "lost" (still out there after MAX_TIME) }.
export const returnPath = (burn, angle, position) => {
  const moon0 = moonAt(0);
  const radial = positionDirection(position);
  // Clockwise around the Moon: a quarter-turn clockwise from the radial direction.
  const tangent = { x: radial.y, y: -radial.x };
  const along = LUNAR_ORBIT_SPEED + burn * Math.cos(rad(angle));
  const out = burn * Math.sin(rad(angle));

  let pos = add(moon0, scale(radial, LUNAR_ORBIT_RADIUS));
  let vel = add(moonVelocity(0), add(scale(tangent, along), scale(radial, out)));

  const moonEnergy = (along * along + out * out) / 2 - MOON.gm / LUNAR_ORBIT_RADIUS;
  const escapes = moonEnergy >= 0;
  const moonVInf = escapes ? Math.sqrt(2 * moonEnergy) : null;

  const accel = (p, t) => {
    const r = length(p);
    const m = moonAt(t);
    const d = { x: p.x - m.x, y: p.y - m.y };
    const rm = length(d);
    const ke = -SCALED_EARTH_GM / r ** 3;
    const km = -MOON.gm / rm ** 3;
    return { x: ke * p.x + km * d.x, y: ke * p.y + km * d.y };
  };

  const points = [{ t: 0, ...pos }];
  let acc = accel(pos, 0);
  let t = 0;
  let result = "lost";
  let perigee = null;
  let closest = { r: Infinity, t: 0, at: pos, vel };
  let stopAt = MAX_TIME;
  while (t < stopAt && result === "lost") {
    // Velocity Verlet, with a step of about 1/500 of the shorter local circular orbit period
    // (around Earth or around the Moon).
    const r = length(pos);
    const m = moonAt(t);
    const rm = Math.hypot(pos.x - m.x, pos.y - m.y);
    const period = 2 * Math.PI * Math.min(Math.sqrt(r ** 3 / SCALED_EARTH_GM), Math.sqrt(rm ** 3 / MOON.gm));
    const steps = Math.ceil(POINT_STEP / (0.002 * period));
    const dt = POINT_STEP / steps;
    for (let i = 0; i < steps; i++) {
      const half = add(vel, scale(acc, dt / 2));
      pos = add(pos, scale(half, dt));
      t += dt;
      acc = accel(pos, t);
      vel = add(half, scale(acc, dt / 2));

      const re = length(pos);
      const moon = moonAt(t);
      if (Math.hypot(pos.x - moon.x, pos.y - moon.y) < MOON.radius) {
        result = "moon";
        break;
      }
      if (re < SCALED_EARTH_RADIUS) {
        // Below the surface: the perigee is where Earth's gravity alone would have taken it.
        result = "earth";
        perigee = { t, at: pos, altitude: keplerPerigee(pos, vel) - SCALED_EARTH_RADIUS, speed: length(vel) };
        break;
      }
      if (re < closest.r) closest = { r: re, t, at: pos, vel };
      // Past the perigee (moving away from Earth again, well inside the Moon's orbit).
      if (!perigee && re < MOON_ORBIT / 2 && pos.x * vel.x + pos.y * vel.y > 0 && closest.t < t) {
        perigee = { t: closest.t, at: closest.at, altitude: closest.r - SCALED_EARTH_RADIUS, speed: length(closest.vel) };
        stopAt = Math.min(MAX_TIME, t + PAST_PERIGEE);
      }
    }
    points.push({ t, ...pos });
    if (perigee && result === "lost" && t >= stopAt) result = "perigee";
  }
  if (!perigee) {
    perigee = { t: closest.t, at: closest.at, altitude: closest.r - SCALED_EARTH_RADIUS, speed: length(closest.vel) };
  }
  return { points, escapes, moonVInf, perigee, result };
};

// Lander position `t` s after the burn, between the path's points (which are evenly spaced).
export const positionAt = (points, t) => {
  const i = Math.min(points.length - 2, Math.max(0, Math.floor(t / POINT_STEP)));
  const p = points[i];
  const q = points[i + 1] ?? p;
  const u = q.t > p.t ? Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t))) : 0;
  return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u };
};

// The coast along `path` for the cruise systems (cruiseTimeline, see moonCourse): at Earth's
// distance from the Sun throughout, headed home.
export const earthCourse = (path) => ({
  at: (t) => positionAt(path.points, t),
  au: () => 1,
  targetAt: () => ({ x: 0, y: 0 }),
  target: "Earth",
  thermalMass: 15000,
});
