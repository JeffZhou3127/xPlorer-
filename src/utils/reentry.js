import { EARTH_GM, EARTH_RADIUS, G0 } from "./rocketPhysics.js";
import { SCALED_EARTH_GM, SCALED_EARTH_RADIUS } from "./landerPhysics.js";

// Earth reentry (mission 1, step 14; mission 2, step 10): the capsule, its service module
// gone, falls into the atmosphere on the way back from Mars, or from the Moon to the
// half-size Earth of mission 2 (same surface gravity, so the same atmosphere). No React.
// The planet ({ gm, radius }) rides along in the state, so the stepping functions need
// only the state.
// 2D, round non-rotating Earth, exponential atmosphere. State in polar form: distance from
// the centre `r`, downrange angle `theta`, speed `v` and flight path angle `gamma`
// (radians, negative = descending). Lift comes from the angle of attack and points up
// (away from the Earth, lift-up roll), pulling the capsule out of the thick air: it lowers
// the peak heating and deceleration, but too much of it on a shallow entry skips the
// capsule back out into space. Tilting the capsule also turns one shoulder of the heat
// shield into the flow, which takes more of the heat than the rest.
// Distances in m, speeds in m/s, time in s, temperatures in °C.

export const ENTRY_ALTITUDE = 120e3; // the entry interface, where the sim starts

// The planets to come home to: mission 1's Earth and mission 2's half-size one.
export const EARTH_ENTRY = { gm: EARTH_GM, radius: EARTH_RADIUS };
export const SCALED_EARTH_ENTRY = { gm: SCALED_EARTH_GM, radius: SCALED_EARTH_RADIUS };
export const DEFAULT_V_INF = 3000; // arriving from Mars, without route state

// Form limits: entry (flight path) angle below the horizon, and angle of attack, degrees.
export const ENTRY_ANGLE_RANGE = { min: 2, max: 12, step: 0.1 };
export const AOA_RANGE = { min: 0, max: 25, step: 0.5 };
export const DEFAULT_ENTRY_ANGLE = 8;
export const DEFAULT_AOA = 0;

// Capsule: ballistic coefficient m / (Cd·A) (kg/m²), heat shield nose radius (m), lift
// to drag ratio per degree of angle of attack (Apollo flew at about 0.3).
const BALLISTIC_COEFFICIENT = 350;
const NOSE_RADIUS = 4;
const LIFT_PER_DEGREE = 0.016;

// Exponential atmosphere.
const SEA_LEVEL_DENSITY = 1.225; // kg/m³
const SCALE_HEIGHT = 7200; // m

// Heating: Sutton–Graves stagnation heat flux (W/m²) and radiative equilibrium surface
// temperature. Each heat shield section takes the stagnation flux times its factor; the
// windward shoulder's grows with the angle of attack, the leeward one's shrinks.
const SUTTON_GRAVES = 1.7415e-4;
const EMISSIVITY_SIGMA = 0.85 * 5.670374e-8;
export const SHIELD_SECTIONS = [
  { key: "windward", label: "Windward shoulder", factor: (aoa) => 1 + 0.04 * aoa },
  { key: "centre", label: "Centre", factor: () => 1 },
  { key: "leeward", label: "Leeward shoulder", factor: (aoa) => Math.max(0.3, 1 - 0.025 * aoa) },
];
export const SHIELD_LIMIT_C = 2750; // the ablator burns through above this
// Past this deceleration (g) the capsule breaks up (and burns up).
export const G_LIMIT = 15;

// The radio blackout: the plasma around the capsule cuts the radio below this altitude
// (it starts at the lowest point of a skip if that is higher).
export const BLACKOUT_ALTITUDE = 85e3;
// Under this speed the drogue and main parachutes can open.
const PARACHUTE_SPEED = 300;
// Climbing back above this, the capsule has skipped off the atmosphere.
const SKIP_ALTITUDE = ENTRY_ALTITUDE + 5e3;
const MAX_TIME = 3600;
const SUBSTEP = 0.05;

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const toCelsius = (kelvin) => kelvin - 273.15;

export const density = (altitude) => SEA_LEVEL_DENSITY * Math.exp(-Math.max(0, altitude) / SCALE_HEIGHT);
export const liftToDrag = (aoa) => aoa * LIFT_PER_DEGREE;

// Surface temperature (°C) of each heat shield section for a stagnation flux `q` (W/m²).
export const shieldTemps = (q, aoa) =>
  Object.fromEntries(
    SHIELD_SECTIONS.map(({ key, factor }) => [
      key,
      Math.max(-50, toCelsius(Math.pow((q * factor(aoa)) / EMISSIVITY_SIGMA, 0.25))),
    ]),
  );

// Speed at the entry interface for a hyperbolic excess speed `vInf` (mission 1's Earth).
export const entrySpeed = (vInf) => Math.sqrt(vInf * vInf + (2 * EARTH_GM) / (EARTH_RADIUS + ENTRY_ALTITUDE));

// Speed and angle below the horizon (degrees) at the entry interface of a path whose
// perigee (ignoring the air) is `perigeeAltitude` m up at `perigeeSpeed` m/s: energy and
// angular momentum carry over. A perigee above the interface just grazes it, level.
export const entryFromPerigee = (perigeeAltitude, perigeeSpeed, planet) => {
  const rp = planet.radius + Math.min(perigeeAltitude, ENTRY_ALTITUDE);
  const re = planet.radius + ENTRY_ALTITUDE;
  const speed = Math.sqrt(perigeeSpeed ** 2 + 2 * planet.gm * (1 / re - 1 / rp));
  const angle = deg(Math.acos(Math.min(1, (rp * perigeeSpeed) / (re * speed))));
  return { speed, angle };
};

// The capsule at `planet`'s entry interface at `speed` m/s, `angle` degrees below the
// horizon.
export const entryState = (speed, angle, planet = EARTH_ENTRY) => {
  const temps = shieldTemps(0, 0);
  return {
    planet,
    t: 0,
    r: planet.radius + ENTRY_ALTITUDE,
    theta: 0,
    v: speed,
    gamma: -rad(angle),
    aoa: 0,
    gLoad: 0,
    heatFlux: 0,
    temps,
    maxTemps: { ...temps },
    maxG: 0,
    dipped: false, // has been below the entry interface
    lowest: ENTRY_ALTITUDE,
    outcome: null, // null while flying, else "burnup" | "skip" | "splashdown"
    cause: null, // for "burnup": "heat" (a shield section too hot) or "overload" (past G_LIMIT)
  };
};

const step = (s, aoa, dt) => {
  const { gm, radius } = s.planet;
  const altitude = s.r - radius;
  const rho = density(altitude);
  const g = gm / (s.r * s.r);
  const drag = (0.5 * rho * s.v * s.v) / BALLISTIC_COEFFICIENT;
  // The guidance rolls the lift up while falling and down while climbing (holding the
  // capsule in the atmosphere), so more lift means more control.
  const lift = drag * liftToDrag(aoa) * (s.gamma > 0 ? -1 : 1);
  const cos = Math.cos(s.gamma);
  const v = s.v + (-drag - g * Math.sin(s.gamma)) * dt;
  const gamma = s.gamma + (lift / s.v + (s.v / s.r - g / s.v) * cos) * dt;
  const r = s.r + s.v * Math.sin(s.gamma) * dt;
  const theta = s.theta + ((s.v * cos) / s.r) * dt;
  const heatFlux = SUTTON_GRAVES * Math.sqrt(rho / NOSE_RADIUS) * s.v ** 3;
  const temps = shieldTemps(heatFlux, aoa);
  const gLoad = Math.hypot(drag, lift) / G0;
  const maxTemps = Object.fromEntries(Object.entries(temps).map(([k, c]) => [k, Math.max(c, s.maxTemps[k])]));
  const next = {
    ...s,
    t: s.t + dt,
    r,
    theta,
    v,
    gamma,
    aoa,
    gLoad,
    heatFlux,
    temps,
    maxTemps,
    maxG: Math.max(s.maxG, gLoad),
    dipped: s.dipped || r - radius < ENTRY_ALTITUDE - 1e3,
    lowest: Math.min(s.lowest, r - radius),
  };
  if (Object.values(temps).some((c) => c > SHIELD_LIMIT_C)) Object.assign(next, { outcome: "burnup", cause: "heat" });
  else if (gLoad > G_LIMIT) Object.assign(next, { outcome: "burnup", cause: "overload" });
  else if (v < PARACHUTE_SPEED) next.outcome = "splashdown";
  else if (next.dipped && gamma > 0 && r - radius > SKIP_ALTITUDE) next.outcome = "skip";
  else if (next.t >= MAX_TIME) next.outcome = gamma > 0 ? "skip" : "splashdown";
  return next;
};

// Has the radio blackout begun? Below BLACKOUT_ALTITUDE, or at the bottom of a dip that
// never got that low.
export const inBlackout = (s) => s.r - s.planet.radius <= BLACKOUT_ALTITUDE || (s.dipped && s.gamma >= 0);

// Advance `s` by `dt` s at angle of attack `aoa` (degrees), stopping early at an outcome or,
// with `untilBlackout`, at the start of the blackout.
export const stepEntry = (s, aoa, dt, { untilBlackout = false } = {}) => {
  let next = s;
  let left = dt;
  while (left > 1e-9 && next.outcome === null && !(untilBlackout && inBlackout(next))) {
    const h = Math.min(SUBSTEP, left);
    next = step(next, aoa, h);
    left -= h;
  }
  return next;
};

// The rest of the entry from `s` at a fixed angle of attack, to its outcome.
export const finishEntry = (s, aoa) => stepEntry(s, aoa, MAX_TIME);
// From `s` to the start of the blackout (or an earlier outcome).
export const toBlackout = (s, aoa) => stepEntry(s, aoa, MAX_TIME, { untilBlackout: true });

// Readouts for the stats panel.
export const entryReadouts = (s) => ({
  altitude: s.r - s.planet.radius,
  speed: s.v,
  pathAngle: deg(s.gamma),
  downrange: s.theta * s.planet.radius,
  gLoad: s.gLoad,
  heatFlux: s.heatFlux,
  temps: s.temps,
  maxTemps: s.maxTemps,
  maxG: s.maxG,
});

export const REENTRY_FAILURE_KINDS = ["burnup", "skip"];
export const isReentryFailure = (failure) => REENTRY_FAILURE_KINDS.includes(failure?.kind);

// The failure record for the mission failure view; `from` ("Mars" or "Moon") picks the
// advice.
export const reentryFailure = (s, entryAngle, from = "Mars") => {
  const hottest = SHIELD_SECTIONS.reduce((a, b) => (s.maxTemps[b.key] > s.maxTemps[a.key] ? b : a));
  return {
    kind: s.outcome,
    cause: s.cause,
    body: "Earth",
    from,
    time: s.t,
    entryAngle,
    aoa: s.aoa,
    altitude: s.r - s.planet.radius,
    speed: s.v,
    lowest: s.lowest,
    maxG: s.maxG,
    section: hottest.label,
    maxTemp: s.maxTemps[hottest.key],
  };
};
