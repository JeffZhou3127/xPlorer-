import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import LandingStats from "../../components/LandingStats/LandingStats.jsx";
import LandingView from "../../components/LandingView/LandingView.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import MissionClock from "../../components/MissionClock/MissionClock.jsx";
import useCoast from "../../hooks/useCoast.js";
import { selectRocket } from "../../store/rocketSlice.js";
import { selectLanderDesign } from "../../store/landerSlice.js";
import { format } from "../../utils/format.js";
import { LANDING_DELTA_V, computeLanderStats, landerFuelLeft } from "../../utils/landerPhysics.js";
import { RELEASE_AT, landingPlan } from "../../utils/lunarLanding.js";

const NOTES = {
  turn: "Turning so the engine points along the direction of travel.",
  deorbit: "Deorbit burn: lowering the path toward the surface.",
  coast: "Coasting down toward 15 km.",
  braking: "Braking burn: shedding orbital speed.",
  approach: "Pitching upright for the approach.",
  descent: "Final descent, kicking up dust.",
  falling: "Out of fuel! The lander is falling.",
  landed: "Touchdown!",
  crashed: "The lander hit the surface.",
  stranded: "Out of fuel during the deorbit burn: still in orbit.",
};

// Mission 2, step 6: the landing, flown automatically like the launch (M2S3). In the 50 × 150 km
// lunar orbit the spent rocket stage (all that is left of the rocket) lets go and drops
// away, leaving the lander; then the lander turns, deorbits, coasts down and brakes to a
// touchdown (landingPlan in lunarLanding.js), spending about LANDING_DELTA_V from its
// landing stage. A lander without enough runs dry and crashes (or never leaves orbit).
// Left: the goal card and the lander's readouts. Right: the lander over the Moon
// (LandingView) with its fuel gauge; the clock sits at the bottom centre.
// Route state in: `flight` ({ stageIndex }) from the orbit insertion: the stages still
// attached. Out (Continue): the same state plus `lander: { fuelLeft }` (t).
const M2S6 = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { stages } = useSelector(selectRocket);
  const design = useSelector(selectLanderDesign);
  const lander = useMemo(() => computeLanderStats(design), [design]);
  const spent = stages.slice(state?.flight?.stageIndex ?? stages.length - 1);

  const plan = useMemo(() => landingPlan(lander.landerDeltaV), [lander.landerDeltaV]);
  const [real] = useCoast(true, plan.duration, 1);
  const now = plan.stateAt(real);
  const { phase } = now;

  const fuelLeft = landerFuelLeft(lander.totalMass, design.landerFuel, now.deltaV);
  const landed = phase === "landed";
  const failed = phase === "crashed" || phase === "stranded";

  let note = NOTES[phase];
  if (phase === "separation") {
    note =
      now.elapsed < RELEASE_AT
        ? "At the low point of the 50 × 150 km lunar orbit. Releasing the spent rocket stage…"
        : "Stage released. The lander flies on alone.";
  }

  let failedText = "";
  if (plan.outcome.result === "crashed") {
    failedText = `The landing stage ran dry ${format(Math.round(plan.outcome.altitude))} m up and the lander hit the surface at ${format(Math.round(plan.outcome.impactSpeed))} m/s. It needs about ${format(LANDING_DELTA_V)} m/s of Δv to land.`;
  } else if (plan.outcome.result === "stranded") {
    failedText = "The landing stage ran dry before the deorbit burn was done, so the lander is stuck in orbit.";
  }

  return (
    <>
      <SplitPane
        left={
          <>
            <FlightControls title="Lunar landing" note={note}>
              <PhaseGoal
                step={1}
                steps={1}
                goal="Land on the Moon"
                unit="m/s"
                meters={[
                  {
                    label: "Δv spent",
                    value: now.deltaV,
                    target: { min: LANDING_DELTA_V, max: LANDING_DELTA_V },
                  },
                ]}
                note={`The flight computer flies the landing. It takes about ${format(LANDING_DELTA_V)} m/s from the landing stage.`}
                reached={landed}
                reachedText={`Touchdown, with ${format(fuelLeft, 1)} t of the landing stage's fuel left for the liftoff and the trip home.`}
                failed={failed}
                failedText={failedText}
                action={
                  landed
                    ? {
                        label: "Continue",
                        onClick: () => navigate("/m2-s7", { state: { ...state, lander: { fuelLeft } } }),
                      }
                    : failed
                      ? { label: "Redesign lander", onClick: () => navigate("/m2-s1") }
                      : undefined
                }
              />
            </FlightControls>
            <LandingStats state={now} deltaVLeft={lander.landerDeltaV - now.deltaV} />
          </>
        }
        right={
          <LandingView
            design={design}
            stages={spent}
            state={now}
            aside={
              <FuelGauges
                gauges={[
                  {
                    key: "lander",
                    label: "Lander",
                    fraction: design.landerFuel > 0 ? fuelLeft / design.landerFuel : 0,
                    detail: `${format(fuelLeft, 1)} t`,
                  },
                ]}
              />
            }
          />
        }
      />
      <MissionClock time={now.time} warp={Math.round(now.warp)} maxWarp={Math.round(now.warp)} onWarpChange={() => {}} locked />
    </>
  );
};

export default M2S6;
