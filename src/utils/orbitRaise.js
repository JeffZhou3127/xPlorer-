// Geometry and timeline for the M3S1 "raising orbits" animation. Diagram units, not to
// scale: Earth's radius is 40, the starting circular orbit 56 and the raised apogee 150.
// The spacecraft circles once, burns prograde at the right-hand side (paused, as if the
// burn were instant), then flies the new ellipse once with Kepler timing, so it visibly
// slows near the apogee.

export const EARTH_RADIUS = 40;
export const START_RADIUS = 56;
export const RAISED_APOGEE = 150;

const CIRCLE_SECONDS = 3; // one lap of the starting orbit
const BURN_SECONDS = 2.2;
const HOLD_SECONDS = 1.2; // back at the burn point before the loop restarts

// Ellipse with its perigee on the starting circle (on +x) and the given apogee.
const ellipse = (apogee) => {
  const a = (START_RADIUS + apogee) / 2;
  const e = (apogee - START_RADIUS) / (apogee + START_RADIUS);
  return { a, e, b: a * Math.sqrt(1 - e * e) };
};

const START = ellipse(START_RADIUS);
const RAISED = ellipse(RAISED_APOGEE);
// Kepler's third law: the period grows with the semi-major axis to the 1.5 power.
const RAISED_SECONDS = CIRCLE_SECONDS * (RAISED.a / START_RADIUS) ** 1.5;

const BURN_START = CIRCLE_SECONDS;
const BURN_END = BURN_START + BURN_SECONDS;
export const LOOP_SECONDS = BURN_END + RAISED_SECONDS + HOLD_SECONDS;
// The single frame shown when motion is reduced: the burn finished, apogee raised.
export const STILL_SECONDS = BURN_END - 0.001;

const easeInOut = (p) => (1 - Math.cos(Math.PI * p)) / 2;

// Position (SVG coordinates, y down, Earth at the origin) and heading (degrees, SVG
// rotation) at mean anomaly `m` on an orbit, solving Kepler's equation by Newton steps.
const onOrbit = ({ a, e, b }, m) => {
  let E = m;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e);
  const y = b * Math.sin(E);
  const heading = Math.atan2(b * Math.cos(E), -a * Math.sin(E));
  return { x, y: -y, heading: (-heading * 180) / Math.PI };
};

// Everything the diagram draws at `seconds` into the looping animation.
// `phase` is "coast" (starting circle), "burn" or "raised"; `orbit` is the ellipse to
// draw ({ cx, rx, ry }) and `apogee` its far-side distance from Earth's centre.
export const orbitRaiseFrame = (seconds) => {
  const t = seconds % LOOP_SECONDS;
  const at = (shape, m) => ({
    ...onOrbit(shape, m),
    orbit: { cx: -shape.a * shape.e, rx: shape.a, ry: shape.b },
    apogee: shape.a * (1 + shape.e),
  });

  if (t < BURN_START) {
    return { phase: "coast", burnProgress: 0, ...at(START, (2 * Math.PI * t) / CIRCLE_SECONDS) };
  }
  if (t < BURN_END) {
    const progress = (t - BURN_START) / BURN_SECONDS;
    const apogee = START_RADIUS + (RAISED_APOGEE - START_RADIUS) * easeInOut(progress);
    return { phase: "burn", burnProgress: progress, ...at(ellipse(apogee), 0) };
  }
  const lap = Math.min((t - BURN_END) / RAISED_SECONDS, 1);
  return { phase: "raised", burnProgress: 1, ...at(RAISED, 2 * Math.PI * lap) };
};
