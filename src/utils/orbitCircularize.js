import { RAISED_APOGEE, START_RADIUS } from "./orbitRaise.js";

// Geometry and timeline for the M3S3 "raising orbits, part 2" animation, continuing
// orbitRaise.js (same diagram units, not to scale): the CubeSat starts at the perigee of
// part 1's raised ellipse (perigee on +x, apogee on −x), coasts up to the apogee, burns
// prograde there (paused, as if the burn were instant) until the perigee has risen to
// the apogee's height, then flies half of the new circular orbit back round to the old
// perigee side, with Kepler timing throughout.

const CIRCLE_SECONDS = 3; // one lap of part 1's starting orbit (sets the time scale)
const BURN_SECONDS = 2.2;
const HOLD_SECONDS = 1.2; // back on the old perigee side before the loop restarts

// Ellipse with its perigee on +x and apogee on −x.
const ellipse = (perigee, apogee) => {
  const a = (perigee + apogee) / 2;
  const e = (apogee - perigee) / (apogee + perigee);
  return { a, e, b: a * Math.sqrt(1 - e * e) };
};

// Kepler's third law, scaled to part 1's starting orbit.
const periodOf = ({ a }) => CIRCLE_SECONDS * (a / START_RADIUS) ** 1.5;

export const FINAL_RADIUS = RAISED_APOGEE;
const RAISED = ellipse(START_RADIUS, RAISED_APOGEE);
const FINAL = ellipse(FINAL_RADIUS, FINAL_RADIUS);

const COAST_END = periodOf(RAISED) / 2; // perigee to apogee
const BURN_END = COAST_END + BURN_SECONDS;
const HALF_LAP_END = BURN_END + periodOf(FINAL) / 2;
export const LOOP_SECONDS = HALF_LAP_END + HOLD_SECONDS;
// The single frame shown when motion is reduced: the burn finished, orbit circular.
export const STILL_SECONDS = BURN_END - 0.001;

const easeInOut = (p) => (1 - Math.cos(Math.PI * p)) / 2;

// Position (SVG coordinates, y down, Earth at the origin; anticlockwise on screen) and
// heading (degrees, SVG rotation) at mean anomaly `m`, solving Kepler's equation.
const onOrbit = ({ a, e, b }, m) => {
  let E = m;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  const heading = Math.atan2(b * Math.cos(E), -a * Math.sin(E));
  return { x: a * (Math.cos(E) - e), y: -b * Math.sin(E), heading: (-heading * 180) / Math.PI };
};

// Everything the diagram draws at `seconds` into the looping animation.
// `phase` is "coast" (on the raised ellipse), "burn" or "circular"; `orbit` is the orbit
// to draw ({ cx, rx, ry }) and `perigee` its low-side distance from Earth's centre (on +x).
export const orbitCircularizeFrame = (seconds) => {
  const t = seconds % LOOP_SECONDS;
  const at = (shape, m) => ({
    ...onOrbit(shape, m),
    orbit: { cx: -shape.a * shape.e, rx: shape.a, ry: shape.b },
    perigee: shape.a * (1 - shape.e),
  });

  if (t < COAST_END) {
    return { phase: "coast", ...at(RAISED, (Math.PI * t) / COAST_END) };
  }
  if (t < BURN_END) {
    const progress = easeInOut((t - COAST_END) / BURN_SECONDS);
    const perigee = START_RADIUS + (FINAL_RADIUS - START_RADIUS) * progress;
    return { phase: "burn", ...at(ellipse(perigee, RAISED_APOGEE), Math.PI) };
  }
  const lap = Math.min((t - BURN_END) / (HALF_LAP_END - BURN_END), 1);
  return { phase: "circular", ...at(FINAL, Math.PI + Math.PI * lap) };
};

// Part 1's raised ellipse, drawn dashed once the orbit has been circularised.
export const RAISED_ORBIT = { cx: -RAISED.a * RAISED.e, rx: RAISED.a, ry: RAISED.b };
