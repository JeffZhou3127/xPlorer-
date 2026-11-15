// Mission 2's launch (step 3) flies itself: the rocket spends the Δv a 200 km orbit needs
// (M2_ORBIT_DELTA_V, the same figure the rocket designer measures against) stage by stage,
// SRBs first. No React.
import { M2_ORBIT_DELTA_V } from "./landerPhysics.js";
import { computeRocketStats, specificImpulse, spendDeltaV, stagePhases } from "./rocketPhysics.js";

// Each stage at the Isp of the operating altitude set in the designer, as in its stats.
const designIsp = (stage) => specificImpulse(stage, stage.altitude);

// The launch of `stages` and `srbs` (or null) with the lander (`payloadMass`, t) on top.
// Returns:
// - delivered: the Δv the rocket gave (m/s), and short: how far that falls below orbit;
// - stateAt(deltaV): the rocket once it has gained `deltaV`: { stageIndex, stageFuel
//   (fractions left), srbFuel (fraction left, or null once dropped or never fitted) };
// - events: the separations in order, [{ deltaV (when), kind ("srbs" | "stage"),
//   stageIndex (the stage firing just before) }].
export const launchPlan = (stages, srbs, payloadMass) => {
  const srbDeltaV = srbs ? computeRocketStats(stages, srbs, payloadMass).srbs.deltaV : 0;
  const full = stages.map(() => 1);
  const stateAt = (deltaV) => ({
    ...spendDeltaV(stages, 0, full, payloadMass, Math.max(0, deltaV - srbDeltaV), designIsp),
    srbFuel: srbs && deltaV < srbDeltaV ? 1 - deltaV / srbDeltaV : null,
  });
  const { short } = stateAt(M2_ORBIT_DELTA_V);
  const delivered = M2_ORBIT_DELTA_V - short;

  const events = srbs ? [{ deltaV: Math.min(srbDeltaV, delivered), kind: "srbs", stageIndex: 0 }] : [];
  let gained = srbDeltaV;
  for (const { index, deltaV } of stagePhases(stages, 0, full, payloadMass, designIsp)) {
    gained += deltaV;
    if (gained > delivered || index === stages.length - 1) break;
    events.push({ deltaV: gained, kind: "stage", stageIndex: index });
  }
  return { delivered, short, stateAt, events };
};
