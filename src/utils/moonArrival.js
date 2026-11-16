import { SCALE } from "./landerPhysics.js";
import { approachState } from "./marsArrival.js";

// Arriving at the Moon (mission 2, step 5), like arriving at Mars (marsArrival.js). No React.
// The spacecraft falls in on a hyperbola whose closest point is PERIAPSIS_ALTITUDE_KM over
// the Moon's equator, passing clockwise seen from above the north pole, and brakes into a
// low orbit there. The Moon is half size like the rest of mission 2, with the same surface
// gravity (GM a quarter of the real one); no air.

export const MOON = { name: "Moon", gm: 4.9049e12 / SCALE ** 2, radius: 1737.4e3 / SCALE, atmosphere: false };

export const PERIAPSIS_ALTITUDE_KM = 50;
// The view opens this high up on the way in.
export const START_ALTITUDE_KM = 3000;
// Arrival speed relative to the Moon when M2S4 doesn't pass one (its ~2,180 m/s transfer's).
export const DEFAULT_V_INF = 590;

// The goal: a 50 × 150 km orbit (braking from the ~1,820 m/s pass to ~1,185 m/s
// takes ~635 m/s): the low point stays where the pass is, the high point 150 km up.
export const TARGET_PERIGEE_KM = { min: 40, max: 60 };
export const TARGET_APOGEE_KM = { min: 140, max: 160 };

export const arrivalState = (vInf) => approachState(MOON, vInf, PERIAPSIS_ALTITUDE_KM, START_ALTITUDE_KM);
