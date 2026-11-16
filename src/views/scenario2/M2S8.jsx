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
import { selectLanderDesign } from "../../store/landerSlice.js";
import { format } from "../../utils/format.js";
import {
  LANDING_DELTA_V,
  LIFTOFF_DELTA_V,
  computeLanderStats,
  landerFuelLeft,
} from "../../utils/landerPhysics.js";
import { LIFTOFF_ORBIT_KM, liftoffPlan, strandedPerilune } from "../../utils/lunarLiftoff.js";

const ORBIT = `${LIFTOFF_ORBIT_KM} × ${LIFTOFF_ORBIT_KM} km`;

const NOTES = {
  countdown: "On the surface, the science done. Arming the engine for liftoff…",
  rise: "Liftoff! Climbing straight up, clear of the surface.",
  pitchover: "Pitching over toward the horizon.",
  ascent: "Powered ascent: building up orbital speed.",
  coast: `Engine off. Coasting up to the ${LIFTOFF_ORBIT_KM} km high point of the orbit.`,
  circularize: `Circularization burn: raising the low point to ${LIFTOFF_ORBIT_KM} km.`,
  orbit: `In a ${ORBIT} lunar orbit.`,
  falling: "Out of fuel! The lander is falling back.",
  crashed: "The lander fell back to the surface.",
  stranded: "Out of fuel during the circularization burn.",
};

// Mission 2, step 8: the liftoff from the Moon, flown automatically like the landing (M2S6),
// reached from the surface science (M2S7, "Leave Lunar Surface"). After a short countdown
// the lander rises, pitches over and climbs into a 15 × 100 km orbit, coasts up to its high
// point and circularizes into a 100 × 100 km orbit (liftoffPlan in lunarLiftoff.js),
// spending about LIFTOFF_DELTA_V from the landing stage after the landing's LANDING_DELTA_V.
// A lander without enough falls back (or is left in a lopsided orbit).
// Route state in: as M2S6 passed it on (`lander: { fuelLeft }` among it). Out (Continue):
// the same state with the lander's fuel updated.
const M2S8 = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const design = useSelector(selectLanderDesign);
  const lander = useMemo(() => computeLanderStats(design), [design]);
  // Δv still in the landing stage after the landing.
  const available = Math.max(0, lander.landerDeltaV - LANDING_DELTA_V);

  const plan = useMemo(() => liftoffPlan(available), [available]);
  const [real] = useCoast(true, plan.duration, 1);
  const now = plan.stateAt(real);
  const { phase } = now;

  const fuelLeft = landerFuelLeft(lander.totalMass, design.landerFuel, LANDING_DELTA_V + now.deltaV);
  const inOrbit = phase === "orbit";
  const failed = phase === "crashed" || phase === "stranded";

  let failedText = "";
  if (plan.outcome.result === "crashed") {
    failedText = `The landing stage ran dry ${format(plan.outcome.altitude / 1000, 1)} km up and the lander fell back, hitting the surface at ${format(Math.round(plan.outcome.impactSpeed))} m/s. The liftoff needs about ${format(LIFTOFF_DELTA_V)} m/s of Δv after the landing.`;
  } else if (plan.outcome.result === "stranded") {
    failedText = `The landing stage ran dry during the circularization burn, leaving the lander in a lopsided ${format(Math.round(strandedPerilune(plan.outcome.share)))} × ${LIFTOFF_ORBIT_KM} km orbit instead of ${ORBIT}.`;
  }

  return (
    <>
      <SplitPane
        left={
          <>
            <FlightControls title="Lunar liftoff" note={NOTES[phase]}>
              <PhaseGoal
                step={1}
                steps={1}
                goal={`Climb into a ${ORBIT} orbit`}
                unit="m/s"
                meters={[
                  {
                    label: "Δv spent",
                    value: now.deltaV,
                    target: { min: LIFTOFF_DELTA_V, max: LIFTOFF_DELTA_V },
                  },
                ]}
                note={`The flight computer flies the liftoff. It takes about ${format(LIFTOFF_DELTA_V)} m/s from the landing stage.`}
                reached={inOrbit}
                reachedText={`In a ${ORBIT} lunar orbit, with ${format(fuelLeft, 1)} t of fuel left for the trip home.`}
                failed={failed}
                failedText={failedText}
                action={
                  inOrbit
                    ? {
                        label: "Continue",
                        onClick: () => navigate("/m2-s9", { state: { ...state, lander: { fuelLeft } } }),
                      }
                    : failed
                      ? { label: "Redesign lander", onClick: () => navigate("/m2-s1") }
                      : undefined
                }
              />
            </FlightControls>
            <LandingStats title="Ascent" state={now} deltaVLeft={available - now.deltaV} />
          </>
        }
        right={
          <LandingView
            design={design}
            stages={null}
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

export default M2S8;
