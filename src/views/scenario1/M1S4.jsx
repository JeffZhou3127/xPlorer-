import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import ThrottleControl from "../../components/ThrottleControl/ThrottleControl.jsx";
import PitchControl from "../../components/PitchControl/PitchControl.jsx";
import FlightView from "../../components/FlightView/FlightView.jsx";
import TrajectoryView from "../../components/TrajectoryView/TrajectoryView.jsx";
import ViewSwitch from "../../components/ViewSwitch/ViewSwitch.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import FlightStats from "../../components/FlightStats/FlightStats.jsx";
import MissionClock from "../../components/MissionClock/MissionClock.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import { maxSrbFuel } from "../../components/RocketDiagram/rocketLayout.js";
import useFlight from "../../hooks/useFlight.js";
import { flightReadouts, inRange, initialFlight, isCoasting, timeToApogee } from "../../utils/flightSim.js";
import { ORBIT_ALTITUDE_KM, ORBIT_WINDOW_KM } from "../../utils/rocketPhysics.js";
import { selectRocket } from "../../store/rocketSlice.js";
import { selectSpacecraftMass } from "../../store/spacecraftSlice.js";

// Fastest the rocket can turn either way, in degrees per second.
const MAX_PITCH_RATE = 5;

// Highest time warp the clock's stepper allows (0 = paused, then 1× up to this, in whole steps).
const MAX_TIME_WARP = 5;

// Mission goals, in order (around the low Earth orbit height used in the designer):
// 1. "ascent": bring the apogee into TARGET_APOGEE_KM. Checked live: the card is green,
//    with "Next goal", only while the apogee is in the window.
// 2. "Next goal" starts a "coast": engines off and held off, time sped up (coastWarpFor)
//    until COAST_LEAD seconds before apogee.
// 3. "circularize": the engines can restart; the goal is met by shutting everything down
//    with the perigee inside TARGET_PERIGEE_KM and the apogee still inside
//    TARGET_APOGEE_KM (a near-circular 300 km orbit).
// Goals only turn their card green; nothing shuts the engines down automatically.
const TARGET_APOGEE_KM = ORBIT_WINDOW_KM; // { min, max }
const TARGET_PERIGEE_KM = ORBIT_WINDOW_KM;
const metres = ({ min, max }) => ({ min: min * 1000, max: max * 1000 });
const windowText = ({ min, max }) => `${min}–${max} km`;
const COAST_LEAD = 60; // s before apogee
const COAST_SECONDS = 10; // real seconds a coast should take, roughly

// Time warp for a coast starting now: a whole number that gets to COAST_LEAD s before
// apogee in about COAST_SECONDS real seconds. 1x when that is already quicker (or the
// rocket is already within COAST_LEAD of apogee).
const coastWarpFor = (flight) => {
  const toCoastEnd = (timeToApogee(flight) ?? 0) - COAST_LEAD;
  return Math.max(1, Math.round(toCoastEnd / COAST_SECONDS));
};

const missionPhase = (flight, coastStarted) => {
  if (!coastStarted) return "ascent";
  return isCoasting(flight, coastStarted) ? "coast" : "circularize";
};

// "m:ss" for a duration in seconds.
const duration = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Status line under "Flight controls" for the later phases (undefined = the default).
const statusNote = (phase, enginesOn, coastWarp) => {
  if (phase === "coast") {
    return `Coasting to apogee at ${coastWarp}x. The engines can restart ${COAST_LEAD} s before apogee.`;
  }
  if (phase === "circularize" && !enginesOn) {
    return "Coast over. Restart the engines near apogee to circularise the orbit.";
  }
  return undefined;
};

// The apogee bar (both goals show it).
const apogeeMeter = (apogee) => ({
  label: "Apogee",
  value: apogee === null ? null : apogee / 1000,
  valueText: "escape",
  target: TARGET_APOGEE_KM,
});

// Props for the PhaseGoal card in each phase.
const goalCard = (phase, flight, readouts, coastWarp, onNextGoal, onContinue) => {
  if (phase === "ascent") {
    const { apogee } = readouts;
    const tooHigh = apogee === null || apogee > TARGET_APOGEE_KM.max * 1000;
    return {
      step: 1,
      goal: `Raise the apogee to ${windowText(TARGET_APOGEE_KM)}`,
      meters: [apogeeMeter(apogee)],
      note: tooHigh
        ? `The apogee is above ${TARGET_APOGEE_KM.max} km. Point the rocket against its direction of travel and burn briefly to bring it back down.`
        : `Burn until the apogee is between ${TARGET_APOGEE_KM.min} and ${TARGET_APOGEE_KM.max} km. Turning toward horizontal as you climb builds the sideways speed an orbit needs.`,
      reached: inRange(apogee, metres(TARGET_APOGEE_KM)),
      reachedText: "Apogee in range. Press Next goal before it climbs out of the window: coast up to apogee, then circularise the orbit.",
      action: { label: "Next goal", onClick: onNextGoal },
    };
  }

  const { apogee, perigee } = readouts;
  const toApogee = timeToApogee(flight);
  const apogeeOk = inRange(apogee, metres(TARGET_APOGEE_KM));
  const perigeeOk = inRange(perigee, metres(TARGET_PERIGEE_KM));
  let note;
  if (phase === "coast") {
    note = `Coasting to apogee at ${coastWarp}x. The engines unlock ${COAST_LEAD} s before apogee (apogee in ${duration(toApogee ?? 0)}).`;
  } else if (perigee !== null && perigee > TARGET_PERIGEE_KM.max * 1000) {
    note = `The perigee is above ${TARGET_PERIGEE_KM.max} km. Burn against the direction of travel to lower it back into the window, then shut down.`;
  } else if (apogee === null || apogee > TARGET_APOGEE_KM.max * 1000) {
    note = `The apogee has climbed above ${TARGET_APOGEE_KM.max} km. Burn briefly against the direction of travel to bring it back into the window.`;
  } else if (apogeeOk && perigeeOk) {
    note = "Apogee and perigee in range. Shut the engines down to lock in the orbit.";
  } else {
    note = `${toApogee ? `Apogee in ${duration(toApogee)}. ` : ""}Burn horizontally near apogee to raise the perigee into ${windowText(TARGET_PERIGEE_KM)}, keeping the apogee in ${windowText(TARGET_APOGEE_KM)}, then shut the engines down.`;
  }
  return {
    step: 2,
    goal: `Circularise the orbit at ${ORBIT_ALTITUDE_KM} km`,
    meters: [
      apogeeMeter(apogee),
      {
        label: "Perigee",
        value: perigee === null ? null : perigee / 1000,
        valueText: "below surface",
        target: TARGET_PERIGEE_KM,
      },
    ],
    note,
    reached: flight.orbitGoalTime !== null,
    reachedText: `Orbit achieved! Engines shut down with the apogee in ${windowText(TARGET_APOGEE_KM)} and the perigee in ${windowText(TARGET_PERIGEE_KM)}.`,
    action: { label: "Continue", onClick: onContinue },
  };
};

// The right pane shows either the rocket's attitude or its 3D trajectory around Earth.
const VIEW_OPTIONS = [
  { value: "attitude", label: "Attitude" },
  { value: "trajectory", label: "Trajectory 3D" },
];

// Mission 1, step 4: the flight panel. Reached from the "Ready to Launch?" alert in step 3.
// The designs are final from here on, so there is no Back button.
// The countdown starts at T−10: the controls can be set straight away, but nothing
// moves, burns or lights until T−0.
// Left: flight controls, then live flight stats below a divider. Right: the attitude view
// (the rocket as designed in step 2, with its exhaust) or the 3D trajectory, each with the
// fuel gauges beside it. The mission clock sits at the bottom centre.
const M1S4 = () => {
  const { stages, srbs: storedSrbs } = useSelector(selectRocket);
  // Same SRB fuel cap the rocket designer applies at render time.
  const srbs = storedSrbs && { ...storedSrbs, fuel: Math.min(storedSrbs.fuel, maxSrbFuel(stages)) };
  const payloadMass = useSelector(selectSpacecraftMass);

  const [pitchRate, setPitchRate] = useState(0);
  const [throttle, setThrottle] = useState(100); // percent
  const [enginesOn, setEnginesOn] = useState(true);
  const [timeWarp, setTimeWarp] = useState(1);
  const [view, setView] = useState("attitude");
  const [coastStarted, setCoastStarted] = useState(false); // "Next goal" pressed
  const [coastWarp, setCoastWarp] = useState(1); // set by "Next goal"
  // Shutting the engines down keeps the throttle setting for when they restart.
  const effectiveThrottle = enginesOn ? throttle / 100 : 0;
  const flight = useFlight(() => initialFlight(stages, srbs), {
    stages,
    srbs,
    payloadMass,
    pitchRate,
    throttle: effectiveThrottle,
    targetPerigee: metres(TARGET_PERIGEE_KM),
    targetApogee: metres(TARGET_APOGEE_KM),
    coastLead: COAST_LEAD,
    coastStarted,
    timeScale: timeWarp,
    coastWarp,
  });

  // A crash, or running out of fuel short of the goals, ends the mission.
  const navigate = useNavigate();
  useEffect(() => {
    if (!flight.failure) return;
    navigate("/mission-failure", {
      state: {
        failure: flight.failure,
        targets: { apogee: TARGET_APOGEE_KM, perigee: TARGET_PERIGEE_KM },
      },
    });
  }, [flight.failure, navigate]);

  const launched = flight.time >= 0;
  const readouts = flightReadouts(flight);
  const phase = missionPhase(flight, coastStarted);
  const coasting = phase === "coast";

  // "Next goal": shut the engines down and coast toward apogee, sped up so it takes about
  // COAST_SECONDS. The sim ends the coast COAST_LEAD s before apogee, and the clock is
  // back at 1x then.
  const startCoast = () => {
    setEnginesOn(false);
    setTimeWarp(1);
    setCoastWarp(coastWarpFor(flight));
    setCoastStarted(true);
  };
  const { stageIndex, separation: lastSeparation } = flight;
  const stageFuel = flight.stageFuel[stageIndex];
  const srbsAttached = flight.srbFuel !== null;
  // Spent stages and boosters have separated, so only what's left is drawn.
  const remainingStages = stages.slice(stageIndex);
  // The rocket as it was just before the latest separation, for the staging animation.
  const separation = lastSeparation && {
    fromStages: stages.slice(lastSeparation.stageIndex),
    fromSrbs: lastSeparation.srbs ? srbs : null,
    kind: lastSeparation.stage ? "stage" : "srbs",
    elapsed: flight.time - lastSeparation.time,
  };

  const gauges = [{ key: "stage", label: `Stage ${stageIndex + 1}`, fraction: stageFuel }];
  if (srbsAttached) gauges.push({ key: "srbs", label: "SRBs", fraction: flight.srbFuel });

  return (
    <>
      <SplitPane
        left={
          <>
            <FlightControls
              launched={launched}
              note={statusNote(phase, enginesOn, coastWarp)}
            >
              <ThrottleControl
                throttle={throttle}
                onChange={setThrottle}
                enginesOn={enginesOn}
                onEnginesChange={setEnginesOn}
                hasSrbs={srbsAttached}
                canShutDown={launched}
                locked={
                  coasting
                    ? { title: "Coasting to apogee", detail: `Engines unlock ${COAST_LEAD} s before apogee` }
                    : null
                }
              />
              <div className="flight-controls__column">
                <PitchControl rate={pitchRate} maxRate={MAX_PITCH_RATE} onChange={setPitchRate} />
                <PhaseGoal steps={2} unit="km" {...goalCard(phase, flight, readouts, coastWarp, startCoast, () => navigate("/m1-s5", { state: { flight: { stageIndex, stageFuel: flight.stageFuel } } }))} />
              </div>
            </FlightControls>
            <FlightStats
              readouts={readouts}
              drag={flight.drag}
              pitch={flight.pitch}
              pitchRate={pitchRate}
              throttle={enginesOn ? throttle : null}
              stageNumber={stageIndex + 1}
            />
          </>
        }
        right={
          <>
            <ViewSwitch label="Flight view" options={VIEW_OPTIONS} value={view} onChange={setView} />
            {view === "attitude" ? (
              <FlightView
                stages={remainingStages}
                srbs={srbsAttached ? srbs : null}
                pitch={flight.pitch}
                throttle={launched && stageFuel > 0 ? effectiveThrottle : 0}
                srbsFiring={launched && srbsAttached}
                separation={separation}
                paused={!coasting && timeWarp === 0}
                aside={<FuelGauges gauges={gauges} />}
              />
            ) : (
              <TrajectoryView flight={flight} showTarget={flight.orbitGoalTime === null} aside={<FuelGauges gauges={gauges} />} />
            )}
          </>
        }
      />
      <MissionClock
        time={flight.time}
        warp={coasting ? coastWarp : timeWarp}
        maxWarp={MAX_TIME_WARP}
        onWarpChange={setTimeWarp}
        locked={coasting}
      />
    </>
  );
};

export default M1S4;
