// Scripted flights over the Moon, flown automatically and shown as an animation: the
// landing (lunarLanding.js, M2S6) and the liftoff (lunarLiftoff.js, M2S8). No React.
// A script is a list of keyframes (simulated seconds `t`, altitude m, vertical and
// horizontal speed m/s, pitch ° from vertical, Δv spent m/s) and the segments between
// them, each played in `play` real seconds at a steady `throttle` (0–1). A craft with less
// Δv than the script needs runs dry partway and either falls or is left stranded in orbit.

const smoothstep = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, s) => a + (b - a) * s;

// The craft `s` (0–1) of the way through a segment, the script's times shifted by `offset`.
// Altitude follows a cubic Hermite curve whose slopes are the vertical speeds, so the two
// agree; the horizontal speed changes steadily, so the distance downrange is its integral.
const inSegment = ({ from, to, throttle, phase, play }, s, offset) => {
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
    time: offset + from.t + tau,
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

// How fast the ground below seems to slide past, seen from the craft (rad/s): horizontal
// speed over height, plus a few metres so it stays finite on the ground. Its integral,
// `sweep`, scrolls the scenery (LandingView), so the ground slows to a stop as the craft
// sheds its horizontal speed (or starts moving as it builds it up).
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

// Plays a script for a craft that can give `availableDeltaV` m/s. Options:
// - keys, segments: the keyframes and the segments between them (segments.length + 1 keys);
// - lead, leadPhase: real seconds held at the first keyframe before the script starts
//   (a separation, a countdown), shown at 1× as phase `leadPhase`;
// - clockStart: the mission clock (simulated s) at the start of the lead;
// - gravity(state): downward acceleration (m/s²) for a craft that runs dry at `state`;
// - strandedIn: phases where running dry leaves the craft in orbit rather than falling;
// - finish: { result, hold }: the outcome's name when the script completes, and fields
//   to override in the final state (say, zero speed on the ground);
// - settle: real seconds the view keeps playing after the end.
// Returns:
// - duration: real seconds from the start to the end of the animation;
// - outcome: { result: finish.result }, { result: "stranded", share (0–1 of the segment
//   flown), phase } or { result: "crashed", altitude (where the fuel ran out, m),
//   impactSpeed (m/s) };
// - stateAt(realSeconds): { phase (leadPhase, a segment's phase, "falling", or the
//   outcome's result once it is over), elapsed (real seconds into that phase), time
//   (simulated s), warp (simulated per real second), altitude, vertical, horizontal,
//   downrange (m, m/s), sweep (rad of ground slid past, for the scenery), pitch (°),
//   throttle (0–1), deltaV (m/s spent) }.
export const scriptedFlight = ({
  keys,
  segments: script,
  availableDeltaV,
  lead = 0,
  leadPhase = "lead",
  clockStart = 0,
  gravity,
  strandedIn = [],
  finish,
  settle = 2,
}) => {
  const offset = clockStart + lead;
  const segments = script.map((segment, i) => ({ ...segment, from: keys[i], to: keys[i + 1] }));
  const sweeps = segments.map((segment) => sweepTable((s) => inSegment(segment, s, offset), segment.to.t - segment.from.t));
  const starts = segments.reduce((list, segment) => [...list, list.at(-1) + inSegment(segment, 1, offset).downrange], [0]);
  const sweepStarts = sweeps.reduce((list, sweep) => [...list, list.at(-1) + sweep(1)], [0]);
  const atSegment = (index, s) => {
    const state = inSegment(segments[index], s, offset);
    return { ...state, downrange: starts[index] + state.downrange, sweep: sweepStarts[index] + sweeps[index](s) };
  };

  // A craft that falls short by a rounding error still makes it.
  const budget = availableDeltaV + 0.5;

  // Where the fuel runs out, if it does: the segment, the share of it flown and when.
  let dry = null;
  let playStart = lead;
  for (const [index, segment] of segments.entries()) {
    if (segment.to.deltaV > budget && segment.throttle > 0) {
      const s = Math.max(0, (budget - segment.from.deltaV) / (segment.to.deltaV - segment.from.deltaV));
      dry = { index, s, at: playStart + s * segment.play, state: atSegment(index, s) };
      break;
    }
    playStart += segment.play;
  }
  const stranded = dry !== null && strandedIn.includes(segments[dry.index].phase);

  // Out of fuel anywhere else: the craft falls freely from there, shown faster the higher
  // it falls from.
  let fall = null;
  if (dry && !stranded) {
    const { altitude, vertical: v, horizontal } = dry.state;
    const g = gravity(dry.state);
    const impact = (v + Math.sqrt(v * v + 2 * g * altitude)) / g; // simulated s
    const play = Math.min(5, 2 + Math.log10(1 + altitude / 100));
    const at = (s) => ({ horizontal, altitude: Math.max(0, altitude + v * s * impact - (g * (s * impact) ** 2) / 2) });
    fall = { g, impact, play, impactSpeed: Math.hypot(horizontal, v - g * impact), sweep: sweepTable(at, impact) };
  }

  let end = playStart;
  if (dry) end = dry.at + (fall?.play ?? 0);
  const last = dry ? null : atSegment(segments.length - 1, 1);

  let outcome = { result: finish.result };
  if (stranded) outcome = { result: "stranded", share: dry.s, phase: segments[dry.index].phase };
  else if (fall) outcome = { result: "crashed", altitude: dry.state.altitude, impactSpeed: fall.impactSpeed };

  const stateAt = (real) => {
    if (real < lead) {
      return { ...atSegment(0, 0), phase: leadPhase, elapsed: real, time: clockStart + real, throttle: 0, warp: 1 };
    }
    if (stranded && real >= end) {
      return { ...dry.state, phase: "stranded", elapsed: real - end, throttle: 0, warp: 1 };
    }
    if (fall && real >= dry.at) {
      const { g } = fall;
      const start = dry.state;
      const tau = Math.min(fall.impact, ((real - dry.at) / fall.play) * fall.impact);
      const falling = {
        ...start,
        time: start.time + tau,
        altitude: Math.max(0, start.altitude + start.vertical * tau - (g * tau * tau) / 2),
        vertical: start.vertical - g * tau,
        downrange: start.downrange + start.horizontal * tau,
        sweep: start.sweep + fall.sweep(tau / fall.impact),
        throttle: 0,
      };
      return real >= end
        ? { ...falling, phase: "crashed", elapsed: real - end, altitude: 0, warp: 1 }
        : { ...falling, phase: "falling", elapsed: real - dry.at, warp: fall.impact / fall.play };
    }
    if (real >= end) {
      return { ...last, ...finish.hold, phase: finish.result, elapsed: real - end, throttle: 0, warp: 1 };
    }
    let t = real - lead;
    for (const [index, segment] of segments.entries()) {
      if (t < segment.play || index === segments.length - 1) {
        return { ...atSegment(index, Math.min(1, t / segment.play)), elapsed: t };
      }
      t -= segment.play;
    }
    return last;
  };

  return { duration: end + settle, outcome, stateAt };
};
