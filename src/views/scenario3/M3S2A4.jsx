import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import useRedo from "../../hooks/useRedo.js";
import useCubesatFlight from "../../hooks/useCubesatFlight.js";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import AttitudeControl from "../../components/AttitudeControl/AttitudeControl.jsx";
import ThrottleControl from "../../components/ThrottleControl/ThrottleControl.jsx";
import OrbitStats from "../../components/OrbitStats/OrbitStats.jsx";
import ViewRow from "../../components/ViewRow/ViewRow.jsx";
import FlightView from "../../components/FlightView/FlightView.jsx";
import CubesatBody from "../../components/CubesatBody/CubesatBody.jsx";
import { CUBESAT_CENTER, CUBESAT_RADIUS } from "../../components/CubesatBody/cubesatLayout.js";
import TrajectoryView from "../../components/TrajectoryView/TrajectoryView.jsx";
import { GEO_SCENE } from "../../components/TrajectoryView/geoScene.js";
import MissionClock from "../../components/MissionClock/MissionClock.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import MissionSuccess from "../../components/MissionSuccess/MissionSuccess.jsx";
import GeoOrbitScene from "../../components/GeoOrbitScene/GeoOrbitScene.jsx";
import { flightReadouts, inRange, timeToApogee } from "../../utils/flightSim.js";
import { format } from "../../utils/format.js";
import {
  ATTITUDES,
  DEFAULT_TRANSFER,
  GEO_ALTITUDE_KM,
  cubesatBeforeApogee,
  initialCubesat,
  isTurning,
  orbitalPeriod,
} from "../../utils/cubesatFlight.js";

// Time warp levels: an orbit takes 1½ hours at 150 km and over 10 at a geostationary
// apogee. While the engine burns the warp is capped, so a burn can't run away.
const WARP_STEPS = [0, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
const MAX_BURN_WARP = 10;
const BURN_WARP_STEPS = WARP_STEPS.filter((w) => w <= MAX_BURN_WARP);

// Both goals aim for geostationary height, give or take GOAL_MARGIN_KM.
const GOAL_MARGIN_KM = 500;
const TARGET_KM = { min: GEO_ALTITUDE_KM - GOAL_MARGIN_KM, max: GEO_ALTITUDE_KM + GOAL_MARGIN_KM };
const TARGET_M = { min: TARGET_KM.min * 1000, max: TARGET_KM.max * 1000 };
const targetText = `${format(TARGET_KM.min)}–${format(TARGET_KM.max)} km`;
const tooHigh = (altitude) => altitude === null || altitude > TARGET_M.max;

// M3S4 starts this long (s of mission time) before the apogee.
const START_LEAD = 60;

const meter = (label, value, valueText) => ({
  label,
  value: value === null ? null : value / 1000,
  valueText,
  target: TARGET_KM,
});

// "m:ss" (or "h:mm:ss") for a duration in seconds.
const duration = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  const mmss = `${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mmss}` : mmss.replace(/^0/, "");
};

// What differs between the two flown steps of mission 3:
// - "raise" (/m3-s2): from the 150 km circular orbit, raise the apogee to geostationary
//   height; Continue goes to the part 2 lesson with the orbit reached.
// - "circularize" (/m3-s4): picks up on that orbit (route state `transfer`, `time`, or
//   DEFAULT_TRANSFER) a minute before apogee, facing prograde; raise the perigee to match.
//   Finish shows the mission success screen.
// Each goal is met once the engine is off with its meters in the window, and stays met.
const STEPS = {
  raise: {
    step: 1,
    back: "/m3-s1",
    initial: () => initialCubesat(),
    facing: null,
    goal: "Raise the apogee to geostationary height",
    meters: ({ apogee }) => [meter("Apogee", apogee, "escape")],
    met: ({ apogee }) => inRange(apogee, TARGET_M),
    note: ({ readouts: { apogee }, enginesOn, facing }) => {
      if (apogee === null) {
        return "The CubeSat is on an escape path. Face retrograde and burn to bring the apogee back down.";
      }
      if (tooHigh(apogee)) {
        return `The apogee is above ${format(TARGET_KM.max)} km. Face retrograde and burn briefly to lower it.`;
      }
      if (apogee >= TARGET_M.min) return "Apogee in range. Shut the engine down to lock it in.";
      if (enginesOn && facing === "prograde") {
        return `Keep burning prograde until the apogee reaches ${targetText}. 10x time warp shortens the wait.`;
      }
      return "Face prograde, then turn the engine on: a burn along the direction of travel raises the far side of the orbit.";
    },
    reachedText: `Apogee raised! The far side of the orbit now reaches ${targetText}, geostationary height.`,
    actionLabel: "Continue",
  },
  circularize: {
    step: 2,
    back: "/m3-s3",
    initial: (state) => cubesatBeforeApogee(state?.transfer ?? DEFAULT_TRANSFER, START_LEAD, state?.time ?? null),
    facing: "prograde",
    goal: "Circularise the orbit at geostationary height",
    meters: ({ perigee, apogee }) => [meter("Perigee", perigee, "below surface"), meter("Apogee", apogee, "escape")],
    met: ({ perigee, apogee }) => inRange(perigee, TARGET_M) && inRange(apogee, TARGET_M),
    note: ({ flight, readouts: { perigee, apogee }, enginesOn, facing }) => {
      if (apogee === null) {
        return "The CubeSat is on an escape path. Face retrograde and burn to slow it back down.";
      }
      if (tooHigh(apogee) || tooHigh(perigee)) {
        return `The orbit has climbed above ${format(TARGET_KM.max)} km. Face retrograde and burn briefly to bring it back down.`;
      }
      if (inRange(perigee, TARGET_M) && inRange(apogee, TARGET_M)) {
        return "Perigee and apogee in range. Shut the engine down to lock in the orbit.";
      }
      if (enginesOn && facing === "prograde") {
        return `Keep burning prograde until the perigee reaches ${targetText}. Lower the throttle near the end for finer control.`;
      }
      const toApogee = timeToApogee(flight);
      return toApogee > 0
        ? `Apogee in ${duration(toApogee)}. Face prograde and burn there to raise the perigee to match it.`
        : "Face prograde and burn to raise the perigee to match the apogee.";
    },
    reachedText: "Orbit circularised! The CubeSat is in geostationary orbit.",
    actionLabel: "Finish",
  },
};

// The attitude ring is fixed to the direction of travel: prograde at the top, radial out
// to the right (the orbit runs anticlockwise seen from above), so the CubeSat turns by
// its attitude.
const MARKS = [
  { angle: 0, label: "Prograde" },
  { angle: 90, label: "Radial out" },
  { angle: 180, label: "Retrograde" },
  { angle: 270, label: "Radial in" },
];

const attitudeText = (attitude) => {
  const deg = Math.round(attitude);
  if (deg === 0) return "CubeSat facing prograde";
  if (Math.abs(deg) === 180) return "CubeSat facing retrograde";
  return `CubeSat turned ${Math.abs(deg)} degrees from prograde toward radial ${deg > 0 ? "out" : "in"}`;
};

const hoursMinutes = (seconds) => `${Math.floor(seconds / 3600)} h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")} min`;

// The mission success screen for the final orbit.
const Success = ({ flight }) => {
  const { perigee, apogee } = flightReadouts(flight);
  return (
    <MissionSuccess
      delay={2.5}
      scene={<GeoOrbitScene />}
      text="Your CubeSat is in geostationary orbit. It circles Earth once a day, exactly as fast as Earth turns, so it hangs over the same spot on the equator."
      summary={[
        { label: "Orbit", value: `${format(perigee / 1000)} × ${format(apogee / 1000)} km` },
        { label: "Orbital period", value: hoursMinutes(orbitalPeriod(flight)), info: "orbitalPeriod" },
        { label: "Speed", value: `${format(Math.hypot(flight.vx, flight.vy) / 1000, 2)} km/s` },
        { label: "Mission time", value: hoursMinutes(flight.time) },
      ]}
    />
  );
};

// Mission 3, steps 2 and 4: the CubeSat flown by hand (`step` "raise" or "circularize",
// see STEPS). Left (a third of the width): the engine and throttle beside Face prograde /
// Face retrograde (the CubeSat swings round in about half a second and holds that
// direction) and the goal card, whose action (Continue or Finish) appears once the goal
// is met; orbit readouts below. Right, side by side: the attitude ring (as in the
// launch, here fixed to prograde) and the 3D trajectory with the geostationary ring.
// Propellant is unlimited (the mass stays the same).
const M3S2A4 = ({ step }) => {
  const config = STEPS[step];
  const navigate = useNavigate();
  const { state } = useLocation();
  const redo = useRedo();
  const [facing, setFacing] = useState(config.facing); // "prograde" | "retrograde" | null
  const [throttle, setThrottle] = useState(100); // percent
  const [enginesOn, setEnginesOn] = useState(false);
  const [warp, setWarp] = useState(1);
  const [finished, setFinished] = useState(null); // the flight at Finish

  const targetAttitude = facing === null ? null : ATTITUDES[facing];
  const flight = useCubesatFlight(() => config.initial(state), {
    throttle: enginesOn && !finished ? throttle / 100 : 0,
    targetAttitude,
    warp: finished ? 0 : warp,
  });
  const turning = isTurning(flight.attitude, targetAttitude);
  const burning = enginesOn && throttle > 0 && !flight.crashed;
  const readouts = flightReadouts(flight);

  const [reached, setReached] = useState(false);
  const goalMet = !enginesOn && !flight.crashed && config.met(readouts);
  // Latched during render (React re-renders straight away), so it sticks even if the
  // engine is turned back on.
  if (goalMet && !reached) setReached(true);

  if (finished) return <Success flight={finished} />;

  const changeEngines = (on) => {
    if (on) setWarp((w) => Math.min(w, MAX_BURN_WARP));
    setEnginesOn(on);
  };

  const onAction = () => {
    if (step === "circularize") {
      setFinished(flight);
      return;
    }
    const { perigee, apogee } = readouts;
    navigate("/m3-s3", {
      state: {
        transfer: perigee !== null && apogee !== null ? { perigee, apogee } : DEFAULT_TRANSFER,
        time: flight.time,
      },
    });
  };

  let note = "Choose a direction to face, then turn the engine on.";
  if (flight.crashed) note = "The CubeSat's orbit dipped into Earth. Press Redo to start over.";
  else if (burning) note = `Engine burning. Time warp is limited to ${MAX_BURN_WARP}x during a burn.`;
  else if (facing !== null) note = `Facing ${facing}. Turn the engine on to burn.`;

  return (
    <>
      <SplitPane
        narrowLeft
        left={
          <>
            <FlightControls title="CubeSat controls" note={note} onRedo={redo}>
              <ThrottleControl
                throttle={throttle}
                onChange={setThrottle}
                enginesOn={enginesOn}
                onEnginesChange={changeEngines}
                hasSrbs={false}
                engineLabel="Engine"
                startLabel="Turn on engine"
                note="Unlimited propellant for this mission: the CubeSat's mass stays the same."
              />
              <div className="flight-controls__column">
                <AttitudeControl value={facing} onChange={setFacing} turning={turning} />
                <PhaseGoal
                  step={config.step}
                  steps={2}
                  unit="km"
                  goal={config.goal}
                  meters={config.meters(readouts)}
                  note={config.note({ flight, readouts, enginesOn, facing })}
                  reached={reached}
                  reachedText={config.reachedText}
                  action={{ label: config.actionLabel, onClick: onAction }}
                />
              </div>
            </FlightControls>
            <OrbitStats
              readouts={readouts}
              periodSeconds={orbitalPeriod(flight)}
              throttle={enginesOn ? throttle : null}
            />
          </>
        }
        right={
          <ViewRow>
            <FlightView
              pitch={flight.attitude}
              craft={{
                body: <CubesatBody throttle={burning ? throttle / 100 : 0} />,
                pivot: CUBESAT_CENTER,
                radius: CUBESAT_RADIUS,
              }}
              marks={MARKS}
              label={attitudeText(flight.attitude)}
              paused={warp === 0}
            />
            <TrajectoryView flight={flight} scene={GEO_SCENE} />
          </ViewRow>
        }
      />
      <MissionClock
        time={flight.time}
        warp={warp}
        steps={enginesOn ? BURN_WARP_STEPS : WARP_STEPS}
        onWarpChange={setWarp}
      />
      <StepNav onBack={() => navigate(config.back, { state })} />
    </>
  );
};

export default M3S2A4;
