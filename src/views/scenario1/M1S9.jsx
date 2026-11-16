import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import useRedo from "../../hooks/useRedo.js";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import ThrottleControl from "../../components/ThrottleControl/ThrottleControl.jsx";
import PitchControl from "../../components/PitchControl/PitchControl.jsx";
import FlightView from "../../components/FlightView/FlightView.jsx";
import TrajectoryView from "../../components/TrajectoryView/TrajectoryView.jsx";
import { MARS_SCENE } from "../../components/TrajectoryView/marsScene.js";
import { LUNAR_SCENE } from "../../components/TrajectoryView/lunarScene.js";
import ViewSwitch from "../../components/ViewSwitch/ViewSwitch.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import FlightStats from "../../components/FlightStats/FlightStats.jsx";
import MissionClock from "../../components/MissionClock/MissionClock.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import useFlight from "../../hooks/useFlight.js";
import {
  MARS,
  flightInSpace,
  flightReadouts,
  inRange,
  isCoasting,
  retrogradePitch,
  timeToPerigee,
} from "../../utils/flightSim.js";
import * as marsArrival from "../../utils/marsArrival.js";
import * as moonArrival from "../../utils/moonArrival.js";
import { format } from "../../utils/format.js";
import { selectRocket } from "../../store/rocketSlice.js";
import { selectSpacecraftMass } from "../../store/spacecraftSlice.js";
import { selectLanderMass } from "../../store/landerSlice.js";

// Same limits as the launch panel (M1S4).
const MAX_PITCH_RATE = 5;
const MAX_TIME_WARP = 5;

// The approach is sped up until this long before perigee, taking about COAST_SECONDS.
const COAST_LEAD = 60; // s
const COAST_SECONDS = 10;

// What differs between arriving at Mars (mission 1, step 9) and at the Moon (mission 2,
// step 5): the body and its scene, the arrival model (approach state, default v∞, goal
// windows), the payload, the wording, and where Continue and a failure lead.
const ARRIVALS = {
  mars: {
    body: MARS,
    scene: MARS_SCENE,
    model: marsArrival,
    selectPayloadMass: selectSpacecraftMass,
    title: "Mars orbit insertion",
    name: "Mars",
    next: "/m1-s10",
    retryPath: "/m1-s9",
    redesignPath: "/m1-s2",
  },
  moon: {
    body: moonArrival.MOON,
    scene: LUNAR_SCENE,
    model: moonArrival,
    selectPayloadMass: selectLanderMass,
    title: "Lunar orbit insertion",
    name: "the Moon",
    next: "/m2-s6",
    retryPath: "/m2-s5",
    redesignPath: "/m2-s2",
  },
};

const metres = ({ min, max }) => ({ min: min * 1000, max: max * 1000 });
const windowText = ({ min, max }) => `${format(min)}–${format(max)} km`;
const targetText = ({ PERIAPSIS_ALTITUDE_KM, TARGET_APOGEE_KM }) =>
  `${format(PERIAPSIS_ALTITUDE_KM)} × ${format((TARGET_APOGEE_KM.min + TARGET_APOGEE_KM.max) / 2)} km`;

// "m:ss" for a duration in seconds.
const duration = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const VIEW_OPTIONS = [
  { value: "attitude", label: "Attitude" },
  { value: "trajectory", label: "Trajectory 3D" },
];

// The goal card's note: what to do next.
const goalNote = (coasting, coastWarp, flight, { apogee, perigee }, { name, model }) => {
  const { TARGET_APOGEE_KM, TARGET_PERIGEE_KM } = model;
  if (coasting) {
    return `Falling toward ${name} at ${coastWarp}x. The engines unlock ${COAST_LEAD} s before perigee (perigee in ${duration(timeToPerigee(flight))}).`;
  }
  const apogeeOk = inRange(apogee, metres(TARGET_APOGEE_KM));
  const perigeeOk = inRange(perigee, metres(TARGET_PERIGEE_KM));
  if (apogeeOk && perigeeOk) return "Apogee and perigee in range. Shut the engines down to lock in the orbit.";
  if (perigee === null || !perigeeOk) {
    return `The perigee is outside ${windowText(TARGET_PERIGEE_KM)}. Burning against the direction of travel lowers the far side of the orbit; keep the burn centred on perigee so the perigee itself stays put.`;
  }
  if (apogee === null) {
    return `Still on an escape path. Burn against the direction of travel (the rocket is already pointed that way) around perigee until an apogee appears and drops into ${windowText(TARGET_APOGEE_KM)}.`;
  }
  if (apogee > TARGET_APOGEE_KM.max * 1000) {
    return `Captured, but the apogee is above ${format(TARGET_APOGEE_KM.max)} km. Keep burning against the direction of travel.`;
  }
  return `The apogee is below ${format(TARGET_APOGEE_KM.min)} km: the burn went on too long. Burn briefly along the direction of travel to raise it.`;
};

// Orbit insertion: mission 1, step 9 at Mars (`arrival` "mars", from M1S8A13's Continue)
// and mission 2, step 5 at the Moon (`arrival` "moon", from M2S4's); App.jsx passes a
// matching `key`. The spacecraft falls in on a hyperbola (v∞ from the transfer, route
// state `arrival.vInf`) whose closest point is the model's PERIAPSIS_ALTITUDE_KM up: over
// Mars's north pole, or over the Moon's equator (passing clockwise seen from above its
// north pole). It must brake into the goal orbit. The same flight panel as the launch
// (M1S4): the approach is coasted at high warp, pointed against the direction of travel,
// until COAST_LEAD s before perigee; then the throttle unlocks. The goal is met by
// shutting the engines down with both apsides in their windows. Crashing, running out of
// fuel, or climbing away on an escape path past the apogee window ends at the mission
// failure view.
const M1S9 = ({ arrival = "mars" }) => {
  const config = ARRIVALS[arrival];
  const { body, scene, model, name } = config;
  const { TARGET_APOGEE_KM, TARGET_PERIGEE_KM } = model;
  const navigate = useNavigate();
  const redo = useRedo();
  const { state } = useLocation();
  const { stages } = useSelector(selectRocket);
  const payloadMass = useSelector(config.selectPayloadMass);

  // Stages and fuel left after the transfer burn; without them, the top stage, full.
  const startStage = state?.flight?.stageIndex ?? stages.length - 1;
  const startFuel = state?.flight?.stageFuel ?? stages.map(() => 1);
  const vInf = state?.arrival?.vInf ?? model.DEFAULT_V_INF;

  const [pitchRate, setPitchRate] = useState(0);
  const [throttle, setThrottle] = useState(100); // percent, for when the engines light
  const [enginesOn, setEnginesOn] = useState(false);
  const [timeWarp, setTimeWarp] = useState(1);
  const [view, setView] = useState("trajectory");
  const effectiveThrottle = enginesOn ? throttle / 100 : 0;

  const [initial] = useState(() => {
    const at = model.arrivalState(vInf);
    return flightInSpace({
      body,
      stages,
      stageIndex: startStage,
      stageFuel: startFuel,
      ...at,
      pitch: retrogradePitch(at),
    });
  });
  // The approach takes about COAST_SECONDS of real time.
  const [coastWarp] = useState(() =>
    Math.max(1, Math.round((timeToPerigee(initial) - COAST_LEAD) / COAST_SECONDS)),
  );
  const flight = useFlight(() => initial, {
    stages,
    srbs: null,
    payloadMass,
    pitchRate,
    throttle: effectiveThrottle,
    targetPerigee: metres(TARGET_PERIGEE_KM),
    targetApogee: metres(TARGET_APOGEE_KM),
    coastLead: COAST_LEAD,
    coastStarted: true,
    coastTo: "perigee",
    // Kept pointed against the direction of travel while the approach is sped up.
    coastRetrograde: true,
    failOnEscape: true,
    timeScale: timeWarp,
    coastWarp,
  });
  const coasting = isCoasting(flight, true);

  useEffect(() => {
    if (!flight.failure) return;
    navigate("/mission-failure", {
      state: {
        failure: flight.failure,
        targets: { apogee: TARGET_APOGEE_KM, perigee: TARGET_PERIGEE_KM },
        retryState: state,
        retryPath: config.retryPath,
        redesignPath: config.redesignPath,
      },
    });
  }, [flight.failure, navigate, state, config, TARGET_APOGEE_KM, TARGET_PERIGEE_KM]);

  const readouts = flightReadouts(flight);
  const { stageIndex, separation: lastSeparation } = flight;
  const stageFuel = flight.stageFuel[stageIndex];
  const remainingStages = stages.slice(stageIndex);
  const separation = lastSeparation && {
    fromStages: stages.slice(lastSeparation.stageIndex),
    fromSrbs: null,
    kind: "stage",
    elapsed: flight.time - lastSeparation.time,
  };
  const gauges = [{ key: "stage", label: `Stage ${stageIndex + 1}`, fraction: stageFuel }];
  const reached = flight.orbitGoalTime !== null;

  let note = "Engines lit. Controls act immediately.";
  if (coasting) note = `Approaching ${name} at ${coastWarp}x, pointed against the direction of travel.`;
  else if (reached) note = `In orbit around ${name}.`;
  else if (!enginesOn) note = "Approach over. Restart the engines near perigee to brake into orbit.";

  return (
    <>
      <SplitPane
        left={
          <>
            <FlightControls onRedo={redo} title={config.title} note={note}>
              <ThrottleControl
                throttle={throttle}
                onChange={setThrottle}
                enginesOn={enginesOn}
                onEnginesChange={setEnginesOn}
                hasSrbs={false}
                locked={
                  coasting
                    ? { title: `Approaching ${name}`, detail: `Engines unlock ${COAST_LEAD} s before perigee` }
                    : null
                }
              />
              <div className="flight-controls__column">
                <PitchControl rate={pitchRate} maxRate={MAX_PITCH_RATE} onChange={setPitchRate} />
                <PhaseGoal
                  step={1}
                  steps={1}
                  unit="km"
                  goal={`Brake into a ${targetText(model)} orbit`}
                  meters={[
                    {
                      label: "Perigee",
                      value: readouts.perigee === null ? null : readouts.perigee / 1000,
                      valueText: "below surface",
                      target: TARGET_PERIGEE_KM,
                    },
                    {
                      label: "Apogee",
                      value: readouts.apogee === null ? null : readouts.apogee / 1000,
                      valueText: "escape",
                      target: TARGET_APOGEE_KM,
                    },
                  ]}
                  note={goalNote(coasting, coastWarp, flight, readouts, config)}
                  reached={reached}
                  reachedText={`Captured! Engines shut down in orbit around ${name} with the perigee in ${windowText(TARGET_PERIGEE_KM)} and the apogee in ${windowText(TARGET_APOGEE_KM)}.`}
                  action={{
                    label: "Continue",
                    // The stages left after the capture burn go on to the next step.
                    onClick: () =>
                      navigate(config.next, {
                        state: { ...state, flight: { stageIndex, stageFuel: flight.stageFuel } },
                      }),
                  }}
                />
              </div>
            </FlightControls>
            <FlightStats
              readouts={readouts}
              drag={flight.drag}
              pitch={flight.pitch}
              pitchRate={coasting ? 0 : pitchRate}
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
                srbs={null}
                pitch={flight.pitch}
                throttle={stageFuel > 0 ? effectiveThrottle : 0}
                separation={separation}
                paused={!coasting && timeWarp === 0}
                aside={<FuelGauges gauges={gauges} />}
              />
            ) : (
              <TrajectoryView flight={flight} scene={scene} showTarget={!reached} aside={<FuelGauges gauges={gauges} />} />
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
        caption="Since arrival"
      />
    </>
  );
};

export default M1S9;
