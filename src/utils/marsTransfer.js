import { EARTH_GM, EARTH_RADIUS, G0, ORBIT_ALTITUDE_KM, dryMass, specificImpulse } from "./rocketPhysics.js";

// Interplanetary transfers between Earth and Mars: the ejection burn (mission 1, step 8,
// Earth to Mars) and the return (step 13, Mars to Earth). No React.
// Patched conics: the burn is made at the periapsis of the departure orbit, giving a
// hyperbolic excess speed (v∞) on leaving the planet; from there only the Sun pulls. Earth
// and Mars move on circular, coplanar orbits. Heliocentric frame: the Sun at the origin,
// planets moving counter-clockwise; distances in m, speeds in m/s, time in s.
// Each function takes a leg (TO_MARS or TO_EARTH), which says where the transfer starts,
// where it is going and how the planets are placed at the burn.

export const SUN_GM = 1.32712440018e20;
export const AU = 1.495978707e11;
export const EARTH_ORBIT = AU;
export const MARS_ORBIT = 1.523679 * AU;
export const MARS_RADIUS = 3389.5e3;
export const MARS_GM = 4.282837e13;
export const DAY = 86400;

// How far ahead the trajectory is followed, and its integration step.
export const MAX_DAYS = 500;
const STEP = DAY / 4;

// Form limits: burn angle in degrees, burn Δv in m/s.
export const ANGLE_RANGE = { min: -90, max: 90, step: 0.1 };
export const BURN_RANGE = { min: 0, max: 6000, step: 1 };

const rad = (deg) => (deg * Math.PI) / 180;
const meanMotion = (radius) => Math.sqrt(SUN_GM / radius ** 3);

export const PLANETS = {
  earth: { name: "Earth", orbit: EARTH_ORBIT, rate: meanMotion(EARTH_ORBIT) },
  mars: { name: "Mars", orbit: MARS_ORBIT, rate: meanMotion(MARS_ORBIT) },
};

// The orbit the burn is made from, around a planet of `gm`: the burn is at its periapsis
// (`radius`), where the spacecraft moves at `speed`.
const departureOrbit = (gm, periapsis, apoapsis) => ({
  gm,
  radius: periapsis,
  speed: Math.sqrt(gm * (2 / periapsis - 2 / (periapsis + apoapsis))),
});

const PARKING_RADIUS = EARTH_RADIUS + ORBIT_ALTITUDE_KM * 1000;
// The science orbit M1S9 captures into (1,000 × 17,000 km, see marsArrival.js; not
// imported, since marsArrival depends on this module through flightSim).
const MARS_PERIAPSIS = MARS_RADIUS + 1000e3;
const MARS_APOAPSIS = MARS_RADIUS + 17000e3;

// Leg fields:
// - from, to: PLANETS keys.
// - phaseAngle: degrees the target planet leads the departure planet by at the burn
//   (negative: it trails).
// - startAngle: where the departure planet is at the burn (degrees from the scene's +x
//   axis; -90 is the bottom of the view).
// - retrograde: the burn angle's 0° points against the departure planet's motion
//   (inward, toward a lower orbit) rather than along it.
// - departure: the orbit the burn is made from (departureOrbit).
// - encounterDistance: passing the target closer than this (centre to centre) counts as an
//   encounter, about the edge of its sphere of influence, where its own gravity takes over.

// Earth to Mars, from the 300 km parking orbit. Mars leads by about a Hohmann launch
// window's 44°: a pure Hohmann burn (~3.6 km/s, 0°) misses by ~1 million km because the
// ideal is 44.3°; ~3.65–3.7 km/s with a small angle hits.
export const TO_MARS = {
  from: "earth",
  to: "mars",
  phaseAngle: 44,
  startAngle: -90,
  retrograde: false,
  departure: departureOrbit(EARTH_GM, PARKING_RADIUS, PARKING_RADIUS),
  encounterDistance: 0.58e9,
};

// Mars back to Earth, from the science orbit's periapsis (the elliptical orbit is already
// most of the way to escape: 410 m/s escapes). Earth trails Mars by the return window's
// phase angle, about -75° for a Hohmann return: ~1.13–1.2 km/s straight back (0°) meets
// Earth after ~260 days, closest at ~1,145 m/s.
export const TO_EARTH = {
  from: "mars",
  to: "earth",
  phaseAngle: -75,
  startAngle: -90,
  retrograde: true,
  departure: departureOrbit(MARS_GM, MARS_PERIAPSIS, MARS_APOAPSIS),
  encounterDistance: 0.93e9,
};

export const originName = (leg) => PLANETS[leg.from].name;
export const targetName = (leg) => PLANETS[leg.to].name;

// Where `planet` (a PLANETS key) is `t` seconds after the burn.
export const planetAt = (leg, planet, t) => {
  const { orbit, rate } = PLANETS[planet];
  const start = planet === leg.from ? leg.startAngle : leg.startAngle + leg.phaseAngle;
  const angle = rad(start) + rate * t;
  return { x: orbit * Math.cos(angle), y: orbit * Math.sin(angle) };
};
export const targetAt = (leg, t) => planetAt(leg, leg.to, t);

// Smallest burn that escapes the departure planet.
export const escapeBurn = ({ departure: { gm, radius, speed } }) => Math.sqrt((2 * gm) / radius) - speed;

// Speed left over after escaping the departure planet (v∞), or null if the burn doesn't
// escape. A prograde burn deep in the gravity well gains the most (the Oberth effect).
export const excessSpeed = ({ departure: { gm, radius, speed } }, burn) => {
  const v = speed + burn;
  const squared = v * v - (2 * gm) / radius;
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

// The heliocentric path after a burn of `burn` m/s on `leg`, leaving the departure planet
// `angle` degrees from its direction of motion (or against it, on a retrograde leg;
// positive = outward, away from the Sun). Returns null if the burn doesn't escape, else
// { vInf, points: [{ t, x, y }] (one a day), closest: { distance, t, at, target } } with
// the closest approach to the target planet and where that planet is then.
export const transferPath = (leg, burn, angle) => {
  const vInf = excessSpeed(leg, burn);
  if (vInf === null) return null;

  const { orbit, rate } = PLANETS[leg.from];
  const start = planetAt(leg, leg.from, 0);
  const radial = { x: start.x / orbit, y: start.y / orbit };
  const tangent = { x: -radial.y, y: radial.x }; // counter-clockwise, as the planets move
  const a = rad(angle);
  const along = orbit * rate + (leg.retrograde ? -1 : 1) * vInf * Math.cos(a);
  const out = vInf * Math.sin(a);

  let pos = { ...start };
  let vel = { x: tangent.x * along + radial.x * out, y: tangent.y * along + radial.y * out };
  const accel = (p) => {
    const r = Math.hypot(p.x, p.y);
    const k = -SUN_GM / (r * r * r);
    return { x: k * p.x, y: k * p.y };
  };

  const points = [{ t: 0, ...pos }];
  let closest = { distance: Infinity, t: 0, at: pos, target: targetAt(leg, 0) };
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
    const m0 = targetAt(leg, t - STEP);
    const m1 = targetAt(leg, t);
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
        target: targetAt(leg, tc),
      };
    }
    if (i % (DAY / STEP) === 0) points.push({ t, ...pos });
  }
  return { vInf, points, closest };
};

// Speed relative to the target (m/s) at the path's closest approach: the v∞ the spacecraft
// arrives with. The spacecraft's velocity comes from its positions an hour either side.
export const arrivalSpeed = (leg, path) => {
  const { t } = path.closest;
  const h = 3600;
  const before = positionAt(path.points, t - h);
  const after = positionAt(path.points, t + h);
  const m0 = targetAt(leg, t - h);
  const m1 = targetAt(leg, t + h);
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
