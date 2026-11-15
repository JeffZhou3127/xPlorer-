import { EARTH_GM, EARTH_RADIUS, G0, ORBIT_ALTITUDE_KM, dryMass, specificImpulse } from "./rocketPhysics.js";

// The Earth–Mars ejection burn (mission 1, step 8). No React.
// Patched conics: the burn is made in the circular parking orbit, giving a hyperbolic
// excess speed (v∞) on leaving Earth; from there only the Sun pulls. Earth and Mars move on
// circular, coplanar orbits. Heliocentric frame: the Sun at the origin, planets moving
// counter-clockwise; distances in m, speeds in m/s, time in s.

export const SUN_GM = 1.32712440018e20;
export const AU = 1.495978707e11;
export const EARTH_ORBIT = AU;
export const MARS_ORBIT = 1.523679 * AU;
export const MARS_RADIUS = 3389.5e3;
export const MARS_GM = 4.282837e13;
export const DAY = 86400;

// Mars leads Earth by this angle at the burn (about a Hohmann launch window's 44°).
export const PHASE_ANGLE = 44;
// Where Earth is at the burn (degrees from the scene's +x axis): at the bottom of the view.
export const EARTH_START = -90;

// Passing Mars closer than this (centre to centre) counts as an encounter: about the edge
// of Mars's sphere of influence, where its own gravity takes over.
export const ENCOUNTER_DISTANCE = 0.58e9;

// How far ahead the trajectory is followed, and its integration step.
export const MAX_DAYS = 500;
const STEP = DAY / 4;

// Form limits: burn angle in degrees, burn Δv in m/s.
export const ANGLE_RANGE = { min: -90, max: 90, step: 0.1 };
export const BURN_RANGE = { min: 0, max: 6000, step: 1 };

const PARKING_RADIUS = EARTH_RADIUS + ORBIT_ALTITUDE_KM * 1000;
export const PARKING_SPEED = Math.sqrt(EARTH_GM / PARKING_RADIUS);
// Smallest burn that escapes Earth from the parking orbit.
export const ESCAPE_BURN = Math.sqrt((2 * EARTH_GM) / PARKING_RADIUS) - PARKING_SPEED;

const rad = (deg) => (deg * Math.PI) / 180;
const meanMotion = (radius) => Math.sqrt(SUN_GM / radius ** 3);
const EARTH_RATE = meanMotion(EARTH_ORBIT);
const MARS_RATE = meanMotion(MARS_ORBIT);

const onCircle = (radius, angle) => ({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });

// Planet positions `t` seconds after the burn.
export const earthAt = (t) => onCircle(EARTH_ORBIT, rad(EARTH_START) + EARTH_RATE * t);
export const marsAt = (t) => onCircle(MARS_ORBIT, rad(EARTH_START + PHASE_ANGLE) + MARS_RATE * t);

// Speed left over after escaping Earth (v∞), or null if the burn doesn't escape.
// A prograde burn deep in Earth's gravity well gains the most (the Oberth effect).
export const excessSpeed = (burn) => {
  const v = PARKING_SPEED + burn;
  const squared = v * v - (2 * EARTH_GM) / PARKING_RADIUS;
  return squared > 0 ? Math.sqrt(squared) : null;
};

// Δv the active stage can give (vacuum Isp), pushing every stage above it (all full after
// refueling) and the spacecraft (`payloadMass`, t). `stages` are the stages still
// attached, bottom (active) first.
export const stageDeltaV = (stages, payloadMass) => {
  const [active, ...above] = stages;
  if (!active) return 0;
  const massAbove = payloadMass + above.reduce((sum, s) => sum + dryMass(s) + s.fuel, 0);
  const dry = massAbove + dryMass(active);
  return specificImpulse(active, 1000) * G0 * Math.log((dry + active.fuel) / dry);
};

// Propellant (t) the active stage burns to give `burn` m/s, by the rocket equation; same
// stack as stageDeltaV. Can exceed the stage's own fuel, when the burn is too big for it.
export const burnPropellant = (stages, payloadMass, burn) => {
  const [active, ...above] = stages;
  if (!active) return 0;
  const massAbove = payloadMass + above.reduce((sum, s) => sum + dryMass(s) + s.fuel, 0);
  const full = massAbove + dryMass(active) + active.fuel;
  return full * (1 - Math.exp(-burn / (specificImpulse(active, 1000) * G0)));
};

// The heliocentric path after a burn of `burn` m/s, leaving Earth `angle` degrees from the
// direction Earth moves along its orbit (0 = straight ahead, positive = outward, away
// from the Sun). Returns null if the burn doesn't escape Earth, else
// { vInf, points: [{ t, x, y }] (one a day), closest: { distance, t, at, mars } }.
export const transferPath = (burn, angle) => {
  const vInf = excessSpeed(burn);
  if (vInf === null) return null;

  const start = earthAt(0);
  const r0 = Math.hypot(start.x, start.y);
  const radial = { x: start.x / r0, y: start.y / r0 };
  const tangent = { x: -radial.y, y: radial.x }; // counter-clockwise, as Earth moves
  const earthSpeed = EARTH_ORBIT * EARTH_RATE;
  const a = rad(angle);
  const along = earthSpeed + vInf * Math.cos(a);
  const out = vInf * Math.sin(a);

  let pos = { ...start };
  let vel = { x: tangent.x * along + radial.x * out, y: tangent.y * along + radial.y * out };
  const accel = (p) => {
    const r = Math.hypot(p.x, p.y);
    const k = -SUN_GM / (r * r * r);
    return { x: k * p.x, y: k * p.y };
  };

  const points = [{ t: 0, ...pos }];
  let closest = { distance: Infinity, t: 0, at: pos, mars: marsAt(0) };
  let acc = accel(pos);
  const steps = (MAX_DAYS * DAY) / STEP;
  for (let i = 1; i <= steps; i++) {
    // Velocity Verlet.
    const half = { x: vel.x + (acc.x * STEP) / 2, y: vel.y + (acc.y * STEP) / 2 };
    const prev = pos;
    pos = { x: pos.x + half.x * STEP, y: pos.y + half.y * STEP };
    acc = accel(pos);
    vel = { x: half.x + (acc.x * STEP) / 2, y: half.y + (acc.y * STEP) / 2 };
    const t = i * STEP;

    // Closest approach within this step, treating both paths as straight over it.
    const m0 = marsAt(t - STEP);
    const m1 = marsAt(t);
    const d0 = { x: prev.x - m0.x, y: prev.y - m0.y };
    const dd = { x: pos.x - m1.x - d0.x, y: pos.y - m1.y - d0.y };
    const len = dd.x * dd.x + dd.y * dd.y;
    const u = len > 0 ? Math.min(1, Math.max(0, -(d0.x * dd.x + d0.y * dd.y) / len)) : 0;
    const distance = Math.hypot(d0.x + dd.x * u, d0.y + dd.y * u);
    if (distance < closest.distance) {
      const tc = t - STEP + STEP * u;
      closest = {
        distance,
        t: tc,
        at: { x: prev.x + (pos.x - prev.x) * u, y: prev.y + (pos.y - prev.y) * u },
        mars: marsAt(tc),
      };
    }
    if (i % (DAY / STEP) === 0) points.push({ t, ...pos });
  }
  return { vInf, points, closest };
};

// Speed relative to Mars (m/s) at the path's closest approach: the v∞ the spacecraft
// arrives with. The spacecraft's velocity comes from its positions an hour either side.
export const arrivalSpeed = (path) => {
  const { t } = path.closest;
  const h = 3600;
  const before = positionAt(path.points, t - h);
  const after = positionAt(path.points, t + h);
  const m0 = marsAt(t - h);
  const m1 = marsAt(t + h);
  return Math.hypot(after.x - before.x - (m1.x - m0.x), after.y - before.y - (m1.y - m0.y)) / (2 * h);
};

// Spacecraft position `t` s after the burn, between the path's daily points.
export const positionAt = (points, t) => {
  const i = Math.min(points.length - 2, Math.max(0, Math.floor(t / DAY)));
  const p = points[i];
  const q = points[i + 1];
  const u = Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t)));
  return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u };
};
