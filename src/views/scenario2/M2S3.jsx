import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import FlightView from "../../components/FlightView/FlightView.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import MissionClock from "../../components/MissionClock/MissionClock.jsx";
import { maxSrbFuel } from "../../components/RocketDiagram/rocketLayout.js";
import useCoast from "../../hooks/useCoast.js";
import { selectRocket } from "../../store/rocketSlice.js";
import { selectLanderMass } from "../../store/landerSlice.js";
import { launchPlan } from "../../utils/autoLaunch.js";
import { format } from "../../utils/format.js";
import { M2_ORBIT_ALTITUDE_KM, M2_ORBIT_DELTA_V } from "../../utils/landerPhysics.js";

// Countdown, then the burn to orbit, in real seconds.
const COUNTDOWN = 5;
const BURN_SECONDS = 15;
// The rocket turns from vertical toward horizontal as it gains speed, ending near this.
const FINAL_PITCH = 85;

// Mission 2, step 3: the launch, flown automatically (mission 1's flight panel was too hard
// for this scenario). After a countdown the rocket burns the Δv a 200 km orbit needs
// (launchPlan): the SRBs first, then each stage in turn, dropping the ones it empties.
// Left: the goal card (speed gained against what orbit needs). Right: the rocket as designed
// with its exhaust, staging animation and fuel gauges; the clock sits at the bottom centre.
// Continue carries the stages left ({ flight: { stageIndex, stageFuel } }) on to the
// trans-lunar injection (step 4). A rocket that runs dry short of orbit goes back to the
// designer.
const M2S3 = () => {
  const navigate = useNavigate();
  const { stages, srbs: storedSrbs } = useSelector(selectRocket);
  // Same SRB fuel cap the rocket designer applies at render time.
  const srbs = useMemo(
    () => storedSrbs && { ...storedSrbs, fuel: Math.min(storedSrbs.fuel, maxSrbFuel(stages)) },
    [storedSrbs, stages],
  );
  const payloadMass = useSelector(selectLanderMass);
  const plan = useMemo(() => launchPlan(stages, srbs, payloadMass), [stages, srbs, payloadMass]);

  // Mission time runs at one steady warp, chosen so the climb plays in about BURN_SECONDS;
  // each phase burns for as long as its fuel really lasts, so separations fall when the
  // tanks run dry.
  const warp = Math.max(1, Math.round(plan.burnTime / BURN_SECONDS));
  const [clock] = useCoast(true, COUNTDOWN + plan.burnTime / warp, 1);
  // Mission time: real seconds (negative) in the countdown, then warped.
  const time = clock < COUNTDOWN ? clock - COUNTDOWN : (clock - COUNTDOWN) * warp;
  const burning = time >= 0 && time < plan.burnTime;
  const done = clock >= COUNTDOWN + plan.burnTime / warp;
  const gained = plan.deltaVAt(time);
  const now = plan.stateAt(gained);
  const reached = done && plan.short === 0;

  // The latest separation, for the staging animation (which runs in real seconds).
  const event = plan.events.findLast((e) => e.time <= time);
  const separation = event && {
    fromStages: stages.slice(event.stageIndex),
    fromSrbs: event.kind === "srbs" ? srbs : null, // the SRBs always drop before any stage
    kind: event.kind,
    elapsed: (time - event.time) / warp,
  };

  const gauges = [{ key: "stage", label: `Stage ${now.stageIndex + 1}`, fraction: now.stageFuel[now.stageIndex] }];
  if (now.srbFuel !== null) gauges.push({ key: "srbs", label: "SRBs", fraction: now.srbFuel });

  let note = "Countdown. The flight computer will fly the climb to orbit.";
  if (burning) note = "Climbing to orbit. Spent stages drop away as they run dry.";
  else if (reached) note = `In a ${M2_ORBIT_ALTITUDE_KM} km orbit.`;
  else if (done) note = "Out of fuel before reaching orbit.";

  return (
    <>
      <SplitPane
        left={
          <FlightControls title="Launch" note={note}>
            <PhaseGoal
              step={1}
              steps={1}
              goal={`Reach a ${M2_ORBIT_ALTITUDE_KM} km orbit`}
              unit="m/s"
              meters={[
                {
                  label: "Speed gained",
                  value: gained,
                  target: { min: M2_ORBIT_DELTA_V, max: M2_ORBIT_DELTA_V },
                },
              ]}
              note={`Orbit needs about ${format(M2_ORBIT_DELTA_V)} m/s; whatever fuel is left goes on to the Moon.`}
              reached={reached}
              reachedText={`Orbit reached with Stage ${now.stageIndex + 1} firing and ${Math.round(now.stageFuel[now.stageIndex] * 100)}% of its fuel left.`}
              failed={done && !reached}
              failedText={`The rocket ran out of fuel ${format(plan.short)} m/s short of orbit.`}
              action={
                reached
                  ? {
                      label: "Continue",
                      onClick: () => navigate("/m2-s4", { state: { flight: { stageIndex: now.stageIndex, stageFuel: now.stageFuel } } }),
                    }
                  : done
                    ? { label: "Redesign rocket", onClick: () => navigate("/m2-s2") }
                    : undefined
              }
            />
          </FlightControls>
        }
        right={
          <FlightView
            stages={stages.slice(now.stageIndex)}
            srbs={now.srbFuel !== null ? srbs : null}
            pitch={FINAL_PITCH * Math.sqrt(Math.min(1, gained / M2_ORBIT_DELTA_V))}
            throttle={burning ? 1 : 0}
            srbsFiring={burning && now.srbFuel !== null}
            separation={separation}
            aside={<FuelGauges gauges={gauges} />}
          />
        }
      />
      <MissionClock time={time} warp={time < 0 ? 1 : warp} maxWarp={warp} onWarpChange={() => {}} locked />
    </>
  );
};

export default M2S3;
