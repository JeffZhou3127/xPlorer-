import { LIFTOFF_DELTA_V } from "./landerPhysics.js";
import { MOON } from "./moonArrival.js";
import { scriptedFlight } from "./scriptedFlight.js";

// Mission 2, step 8: the liftoff from the Moon back into orbit, flown automatically and
// shown as an animation (M2S8). No React.
// A short countdown, then a vertical rise clear of the surface, a pitch-over and the powered
// ascent into a 15 × 100 km orbit, half an orbit's coast up to its 100 km high point and a
// circularization burn there into a 100 × 100 km orbit. It spends LIFTOFF_DELTA_V in all.

const G = MOON.gm / MOON.radius ** 2;

export const LIFTOFF_ORBIT_KM = 100;
// The low point of the orbit the powered ascent ends in.
const INSERTION_KM = 15;
// Real seconds of countdown before the engine lights (the clock starts at T−COUNTDOWN).
export const COUNTDOWN_SECONDS = 4;

// Keyframes of the liftoff (simulated seconds after ignition, altitude m, vertical and
// horizontal speed m/s, pitch ° from vertical: +90 is the nose along the direction of
// travel, Δv spent m/s). On the half-size Moon a 15 × 100 km orbit is ~1,205 m/s at its
// low point and ~1,099 m/s at its high point; circular at 100 km is ~1,125 m/s.
const KEYS = [
  { t: 0, altitude: 0, vertical: 0, horizontal: 0, pitch: 0, deltaV: 0 },
  { t: 10, altitude: 100, vertical: 20, horizontal: 0, pitch: 0, deltaV: 40 },
  { t: 60, altitude: 2000, vertical: 50, horizontal: 150, pitch: 55, deltaV: 280 },
  { t: 420, altitude: INSERTION_KM * 1000, vertical: 0, horizontal: 1205, pitch: 85, deltaV: 1215 },
  { t: 2949, altitude: LIFTOFF_ORBIT_KM * 1000, vertical: 0, horizontal: 1099, pitch: 90, deltaV: 1215 },
  { t: 2979, altitude: LIFTOFF_ORBIT_KM * 1000, vertical: 0, horizontal: 1125, pitch: 90, deltaV: LIFTOFF_DELTA_V },
];
const SEGMENTS = [
  { phase: "rise", play: 3, throttle: 1 },
  { phase: "pitchover", play: 4, throttle: 1 },
  { phase: "ascent", play: 9, throttle: 1 },
  { phase: "coast", play: 5, throttle: 0 },
  { phase: "circularize", play: 3, throttle: 0.8 },
];

// A lander that runs dry on the way up falls back, its sideways speed easing gravity a
// little (but never below a fifth of it).
const gravity = ({ altitude, horizontal }) =>
  Math.max(0.2 * G, G - horizontal ** 2 / (MOON.radius + altitude));

// The low point (km) of the orbit left by a circularization burn cut short after `share`
// (0–1) of it.
export const strandedPerilune = (share) => INSERTION_KM + (LIFTOFF_ORBIT_KM - INSERTION_KM) * share;

// The liftoff of a lander that can give `availableDeltaV` m/s (see scriptedFlight for what
// it returns). It opens with COUNTDOWN_SECONDS of phase "countdown"; running dry during the
// circularization leaves it "stranded" in a lopsided orbit, anywhere earlier it falls back
// and is "crashed"; otherwise it ends in "orbit".
export const liftoffPlan = (availableDeltaV) =>
  scriptedFlight({
    keys: KEYS,
    segments: SEGMENTS,
    availableDeltaV,
    lead: COUNTDOWN_SECONDS,
    leadPhase: "countdown",
    clockStart: -COUNTDOWN_SECONDS,
    gravity,
    strandedIn: ["circularize"],
    finish: { result: "orbit", hold: {} },
  });
