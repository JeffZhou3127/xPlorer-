import { LANDING_DELTA_V } from "./landerPhysics.js";
import { MOON } from "./moonArrival.js";
import { scriptedFlight } from "./scriptedFlight.js";

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
];

// The landing of a lander that can give `availableDeltaV` m/s (see scriptedFlight for what
// it returns). It opens with SEPARATION_SECONDS of phase "separation"; running dry during
// the deorbit burn leaves the lander "stranded" in orbit, anywhere later it falls and is
// "crashed"; otherwise it ends "landed", at rest.
export const landingPlan = (availableDeltaV) =>
  scriptedFlight({
    keys: KEYS,
    segments: SEGMENTS,
    availableDeltaV,
    lead: SEPARATION_SECONDS,
    leadPhase: "separation",
    gravity: () => G,
    strandedIn: ["deorbit"],
    finish: { result: "landed", hold: { vertical: 0, horizontal: 0 } },
  });
