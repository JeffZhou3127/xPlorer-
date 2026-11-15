import { MARS } from "./flightSim.js";

// Arriving at Mars (mission 1, step 9). No React.
// The spacecraft falls in from interplanetary space on a hyperbola whose closest point
// (periapsis, shown as "perigee" like the rest of the flight panel) is
// PERIAPSIS_ALTITUDE_KM over Mars's north pole. Without a burn it swings past and leaves;
// slowing down near periapsis captures it into an orbit.
// Flight frame (as in flightSim): Mars at the origin, the periapsis straight up the +y
// axis (the north pole), the spacecraft moving toward +x as it passes it.

export const PERIAPSIS_ALTITUDE_KM = 1000;
// The view opens this high up on the way in.
export const START_ALTITUDE_KM = 10000;
// Arrival speed relative to Mars when M1S8A13 doesn't pass one (about a Hohmann transfer's).
export const DEFAULT_V_INF = 2650;

// The goal: an orbit of 1,000 × 17,000 km, within these windows.
export const TARGET_PERIGEE_KM = { min: 900, max: 1100 };
export const TARGET_APOGEE_KM = { min: 16000, max: 18000 };

// Position and velocity { x, y, vx, vy } (m, m/s) on the arrival hyperbola for `vInf`
// (m/s), START_ALTITUDE_KM up and still falling toward the periapsis.
export const arrivalState = (vInf) => {
  const { gm, radius } = MARS;
  const rp = radius + PERIAPSIS_ALTITUDE_KM * 1000;
  const r = radius + START_ALTITUDE_KM * 1000;
  const e = 1 + (rp * vInf * vInf) / gm;
  const p = rp * (1 + e); // semi-latus rectum
  // True anomaly here (negative: before periapsis).
  const nu = -Math.acos(Math.min(1, Math.max(-1, (p / r - 1) / e)));
  const speed = Math.sqrt(gm / p);
  // Perifocal axes: P toward the periapsis (+y), Q the direction of travel there (+x).
  const along = { radial: r * Math.cos(nu), side: r * Math.sin(nu) };
  const vel = { radial: -speed * Math.sin(nu), side: speed * (e + Math.cos(nu)) };
  return { x: along.side, y: along.radial, vx: vel.side, vy: vel.radial };
};
