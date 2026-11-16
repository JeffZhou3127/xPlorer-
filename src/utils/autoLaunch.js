// Mission 2's launch (step 3) flies itself: the rocket spends the Δv a 200 km orbit needs
// (M2_ORBIT_DELTA_V, the same figure the rocket designer measures against) stage by stage,
// SRBs first. No React.
import { M2_ORBIT_DELTA_V } from "./landerPhysics.js";
import { computeRocketStats, specificImpulse, spendDeltaV, stageBurnTime, stagePhases } from "./rocketPhysics.js";

// Each stage at the Isp of the operating altitude set in the designer, as in its stats.
const designIsp = (stage) => specificImpulse(stage, stage.altitude);

// The launch of `stages` and `srbs` (or null) with the lander (`payloadMass`, t) on top.
// Returns:
// - delivered: the Δv the rocket gave (m/s), and short: how far that falls below orbit;
// - burnTime: mission seconds from liftoff until it has given `delivered`;
// - deltaVAt(seconds): the Δv gained that long after liftoff, each phase burning its fuel
//   at its engines' full flow (the SRBs over SRB_BURN_TIME);
// - stateAt(deltaV): the rocket once it has gained `deltaV`: { stageIndex, stageFuel
//   (fractions left), srbFuel (fraction left, or null once dropped or never fitted) };
// - events: the separations in order, [{ deltaV and time (when), kind ("srbs" | "stage"),
//   stageIndex (the stage firing just before) }].
export const launchPlan = (stages, srbs, payloadMass) => {
  const srbStats = srbs ? computeRocketStats(stages, srbs, payloadMass).srbs : null;
  const srbDeltaV = srbStats ? srbStats.deltaV : 0;
  const full = stages.map(() => 1);
  const stateAt = (deltaV) => ({
    ...spendDeltaV(stages, 0, full, payloadMass, Math.max(0, deltaV - srbDeltaV), designIsp),
    srbFuel: srbs && deltaV < srbDeltaV ? 1 - deltaV / srbDeltaV : null,
  });
  const { short } = stateAt(M2_ORBIT_DELTA_V);
  const delivered = M2_ORBIT_DELTA_V - short;

  // The burn phases in order, each losing mass at a steady `flow` (t/s):
  // Δv(τ) = exhaust × ln(startMass / (startMass − flow τ)).
  const phases = [];
  if (srbStats) {
    phases.push({
      kind: "srbs",
      stageIndex: 0,
      startMass: srbStats.startMass,
      exhaust: srbStats.deltaV / Math.log(srbStats.startMass / (srbStats.startMass - srbs.fuel)),
      flow: srbs.fuel / srbStats.burnTime,
      deltaV: srbDeltaV,
    });
  }
  for (const { index, fuel, startMass, exhaust, deltaV } of stagePhases(stages, 0, full, payloadMass, designIsp)) {
    phases.push({ kind: "stage", stageIndex: index, startMass, exhaust, flow: fuel / stageBurnTime(stages[index]), deltaV });
  }
  const timeFor = (phase, deltaV) => (phase.startMass / phase.flow) * (1 - Math.exp(-deltaV / phase.exhaust));

  // When each phase starts (mission seconds and Δv), cut off at `delivered`.
  let gained = 0;
  let time = 0;
  const timeline = [];
  for (const phase of phases) {
    if (gained >= delivered) break;
    const deltaV = Math.min(phase.deltaV, delivered - gained);
    const duration = timeFor(phase, deltaV);
    timeline.push({ ...phase, fromDeltaV: gained, from: time, duration, deltaV });
    gained += deltaV;
    time += duration;
  }
  const burnTime = time;

  const deltaVAt = (seconds) => {
    if (seconds <= 0) return 0;
    for (const phase of timeline) {
      const tau = seconds - phase.from;
      if (tau < phase.duration) {
        return phase.fromDeltaV + phase.exhaust * Math.log(phase.startMass / (phase.startMass - phase.flow * tau));
      }
    }
    return delivered;
  };

  // A separation as each phase but the last ends (the top stage stays with the lander).
  const events = timeline
    .slice(0, -1)
    .filter((phase) => phase.kind === "srbs" || phase.stageIndex < stages.length - 1)
    .map((phase) => ({
      deltaV: phase.fromDeltaV + phase.deltaV,
      time: phase.from + phase.duration,
      kind: phase.kind,
      stageIndex: phase.stageIndex,
    }));
  // A rocket that runs dry still drops its SRBs when they burn out.
  if (srbStats && timeline.length === 1) {
    events.push({ deltaV: delivered, time: burnTime, kind: "srbs", stageIndex: 0 });
  }

  return { delivered, short, burnTime, deltaVAt, stateAt, events };
};
