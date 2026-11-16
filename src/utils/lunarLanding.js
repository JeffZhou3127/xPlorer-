import { LANDING_DELTA_V } from "./landerPhysics.js";
import { MOON } from "./moonArrival.js";

// Mission 2, step 6: separating from the spent rocket stage in lunar orbit, then the landing,
// both flown automatically and shown as an animation (M2S6). No React.
// The landing follows a scripted profile from the low point (50 km) of the 50 × 150 km orbit: turn retrograde, a small
// deorbit burn, half an orbit's coast down to 15 km, the braking burn, a pitch-over approach
// and a slow final descent. It spends LANDING_DELTA_V in all; a lander with less runs dry
// on the way and falls.

const G = MOON.gm / MOON.radius ** 2; // surface gravity, as on the real Moon

// The separation, played at 1 simulated second per real second.
export const SEPARATION_SECONDS = 6;
// When the spent stage lets go, and how long it takes to drift out of sight.
export const RELEASE_AT = 1.5;

// Keyframes of the landing (simulated seconds after the separation, altitude m, vertical and
// horizontal speed m/s, pitch ° from vertical: −90 is the engine pointing along the
// direction of travel, Δv spent m/s). Each segment between two keyframes plays in `play` real
// seconds at a steady `throttle` (0–1).
const KEYS = [
  { t: 0, altitude: 50000, vertical: 0, horizontal: 1185, pitch: 0, deltaV: 0 },
  { t: 30, altitude: 50000, vertical: 0, horizontal: 1185, pitch: -90, deltaV: 0 },
  { t: 50, altitude: 49990, vertical: -1, horizontal: 1165, pitch: -90, deltaV: 20 },
  { t: 2450, altitude: 15000, vertical: -28, horizontal: 1170, pitch: -90, deltaV: 20 },
  { t: 2850, altitude: 2000, vertical: -40, horizontal: 110, pitch: -60, deltaV: 1135 },
  { t: 2950, altitude: 120, vertical: -3, horizontal: 6, pitch: -8, deltaV: 1240 },
  { t: 3030, altitude: 0, vertical: -1.5, horizontal: 0, pitch: 0, deltaV: LANDING_DELTA_V },
];
const SEGMENTS = [
  { phase: "turn", play: 2, throttle: 0 },
  { phase: "deorbit", play: 2, throttle: 1 },
  { phase: "coast", play: 4, throttle: 0 },
  { phase: "braking", play: 8, throttle: 1 },
  { phase: "approach", play: 6, throttle: 0.6 },
  { phase: "descent", play: 8, throttle: 0.4 },
].map((segment, i) => ({ ...segment, from: KEYS[i], to: KEYS[i + 1] }));

// After touchdown or impact, the view keeps playing this long (dust settling) before it ends.
const SETTLE_SECONDS = 2;

const smoothstep = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, s) => a + (b - a) * s;

// The lander `s` (0–1) of the way through a segment. Altitude follows a cubic Hermite curve
// whose slopes are the vertical speeds, so the two agree; the horizontal speed changes
// steadily, so the distance downrange is its integral.
const inSegment = ({ from, to, throttle, phase, play }, s) => {
  const span = to.t - from.t;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
  const h10 = s ** 3 - 2 * s ** 2 + s;
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  const altitude =
    h00 * from.altitude + h10 * span * from.vertical + h01 * to.altitude + h11 * span * to.vertical;
  const d00 = 6 * s ** 2 - 6 * s;
  const d10 = 3 * s ** 2 - 4 * s + 1;
  const d11 = 3 * s ** 2 - 2 * s;
  const vertical =
    (d00 * from.altitude - d00 * to.altitude) / span + d10 * from.vertical + d11 * to.vertical;
  const tau = s * span;
  return {
    phase,
    time: SEPARATION_SECONDS + from.t + tau,
    altitude: Math.max(0, altitude),
    vertical,
    horizontal: lerp(from.horizontal, to.horizontal, s),
    downrange: from.horizontal * tau + ((to.horizontal - from.horizontal) * tau * tau) / (2 * span),
    pitch: lerp(from.pitch, to.pitch, smoothstep(s)),
    throttle,
    deltaV: lerp(from.deltaV, to.deltaV, s),
    warp: span / play,
  };
};

// How fast the ground below seems to slide past, seen from the lander (rad/s): horizontal
// speed over height, plus a few metres so it stays finite at touchdown. Its integral,
// `sweep`, scrolls the scenery (LandingView), so the ground slows to a stop as the lander
// sheds its horizontal speed.
const EYE_HEIGHT = 30;
const sweepRate = ({ altitude, horizontal }) => horizontal / (altitude + EYE_HEIGHT);

// The sweep (rad) `s` (0–1) of the way through a path `at(s)` lasting `span` simulated
// seconds, by the trapezoid rule over a sampled table.
const sweepTable = (at, span, samples = 300) => {
  const table = [0];
  let previous = sweepRate(at(0));
  for (let i = 1; i <= samples; i++) {
    const current = sweepRate(at(i / samples));
    table.push(table[i - 1] + ((previous + current) / 2) * (span / samples));
    previous = current;
  }
  return (s) => {
    const x = Math.min(1, Math.max(0, s)) * samples;
    const i = Math.min(samples - 1, Math.floor(x));
    return lerp(table[i], table[i + 1], x - i);
  };
};

// Distance downrange and sweep at the start of each segment, and each segment's sweep.
const SWEEPS = SEGMENTS.map((segment) => sweepTable((s) => inSegment(segment, s), segment.to.t - segment.from.t));
const starts = SEGMENTS.reduce(
  (list, segment) => [...list, list.at(-1) + inSegment(segment, 1).downrange],
  [0],
);
const sweepStarts = SWEEPS.reduce((list, sweep) => [...list, list.at(-1) + sweep(1)], [0]);

// The landing of a lander that can give `availableDeltaV` m/s. Returns:
// - duration: real seconds from the separation to the end of the animation;
// - outcome: { result: "landed" }, { result: "stranded" } (not enough fuel to finish the
//   deorbit burn: it stays in orbit) or { result: "crashed", altitude (where the fuel ran
//   out, m), impactSpeed (m/s) };
// - stateAt(realSeconds): { phase ("separation", a segment's phase, "falling", or the
//   outcome's result once it is over), elapsed (real seconds into that phase), time
//   (simulated s), warp (simulated per real second), altitude, vertical, horizontal,
//   downrange (m, m/s), sweep (rad of ground slid past, for the scenery), pitch (°),
//   throttle (0–1), deltaV (m/s spent) }.
export const landingPlan = (availableDeltaV) => {
  // A lander that falls short by a rounding error still makes it.
  const budget = availableDeltaV + 0.5;
  const atSegment = (index, s) => {
    const state = inSegment(SEGMENTS[index], s);
    return { ...state, downrange: starts[index] + state.downrange, sweep: sweepStarts[index] + SWEEPS[index](s) };
  };

  // Where the fuel runs out, if it does: the segment, the share of it flown and when.
  let dry = null;
  let playStart = SEPARATION_SECONDS;
  for (const [index, segment] of SEGMENTS.entries()) {
    if (segment.to.deltaV > budget && segment.throttle > 0) {
      const s = Math.max(0, (budget - segment.from.deltaV) / (segment.to.deltaV - segment.from.deltaV));
      dry = { index, s, at: playStart + s * segment.play, state: atSegment(index, s) };
      break;
    }
    playStart += segment.play;
  }
  // Running dry during the deorbit burn leaves the lander in orbit.
  const stranded = dry !== null && SEGMENTS[dry.index].phase === "deorbit";

  // Out of fuel lower down: the lander falls freely from there, shown faster the higher it
  // falls from.
  let fall = null;
  if (dry && !stranded) {
    const { altitude, vertical: v, horizontal } = dry.state;
    const impact = (v + Math.sqrt(v * v + 2 * G * altitude)) / G; // simulated s
    const play = Math.min(5, 2 + Math.log10(1 + altitude / 100));
    const at = (s) => ({ horizontal, altitude: Math.max(0, altitude + v * s * impact - (G * (s * impact) ** 2) / 2) });
    fall = { impact, play, impactSpeed: Math.hypot(horizontal, v - G * impact), sweep: sweepTable(at, impact) };
  }

  let end = playStart;
  if (dry) end = dry.at + (fall?.play ?? 0);
  const last = dry ? null : atSegment(SEGMENTS.length - 1, 1);

  let outcome = { result: "landed" };
  if (stranded) outcome = { result: "stranded" };
  else if (fall) outcome = { result: "crashed", altitude: dry.state.altitude, impactSpeed: fall.impactSpeed };

  const stateAt = (real) => {
    if (real < SEPARATION_SECONDS) {
      return { ...atSegment(0, 0), phase: "separation", elapsed: real, time: real, warp: 1 };
    }
    if (stranded && real >= end) {
      return { ...dry.state, phase: "stranded", elapsed: real - end, throttle: 0, warp: 1 };
    }
    if (fall && real >= dry.at) {
      const start = dry.state;
      const tau = Math.min(fall.impact, ((real - dry.at) / fall.play) * fall.impact);
      const falling = {
        ...start,
        time: start.time + tau,
        altitude: Math.max(0, start.altitude + start.vertical * tau - (G * tau * tau) / 2),
        vertical: start.vertical - G * tau,
        downrange: start.downrange + start.horizontal * tau,
        sweep: start.sweep + fall.sweep(tau / fall.impact),
        throttle: 0,
      };
      return real >= end
        ? { ...falling, phase: "crashed", elapsed: real - end, altitude: 0, warp: 1 }
        : { ...falling, phase: "falling", elapsed: real - dry.at, warp: fall.impact / fall.play };
    }
    if (real >= end) {
      return { ...last, phase: "landed", elapsed: real - end, vertical: 0, horizontal: 0, throttle: 0, warp: 1 };
    }
    let t = real - SEPARATION_SECONDS;
    for (const [index, segment] of SEGMENTS.entries()) {
      if (t < segment.play || index === SEGMENTS.length - 1) {
        return { ...atSegment(index, Math.min(1, t / segment.play)), elapsed: t };
      }
      t -= segment.play;
    }
    return last;
  };

  return { duration: end + SETTLE_SECONDS, outcome, stateAt };
};
