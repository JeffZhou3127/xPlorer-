import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import useRedo from "../../hooks/useRedo.js";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import EjectionForm, { Field } from "../../components/EjectionForm/EjectionForm.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import CruiseStats from "../../components/CruiseStats/CruiseStats.jsx";
import TransferView from "../../components/TransferView/TransferView.jsx";
import {
  MOON_RETURN_SCENE,
  enlargedBurnPoint,
  returnPhaseLines,
} from "../../components/TransferView/moonScene.js";
import useCoast from "../../hooks/useCoast.js";
import { selectLanderDesign } from "../../store/landerSlice.js";
import { format } from "../../utils/format.js";
import { CABIN_MAX_C, CABIN_NOMINAL_C, cruiseTimeline, systemsAt } from "../../utils/cruiseSystems.js";
import {
  LANDING_DELTA_V,
  LIFTOFF_DELTA_V,
  computeLanderStats,
  landerBurnPropellant,
  landerFuelLeft,
} from "../../utils/landerPhysics.js";
import { HEAT_LOAD_KW, POWER_DEMAND_KW } from "../../utils/spacecraftPhysics.js";
import {
  ANGLE_RANGE,
  BURN_RANGE,
  DAY,
  HOUR,
  MAX_TIME,
  MOON_START_ANGLE,
  PERIGEE_TARGET_KM,
  POSITION_RANGE,
  earthCourse,
  moonAt,
  positionAt,
  positionDirection,
  returnPath,
} from "../../utils/moonReturn.js";

// Simulated time per real second while the lander coasts (a ~4 day trip takes ~12 s).
const COAST_RATE = 8 * HOUR;
// The planned path is drawn this far past the perigee.
const PLANNED_TAIL = 2 * HOUR;

const DEFAULT_POSITION = 0;
const DEFAULT_ANGLE = 0;
const DEFAULT_BURN = 0;

// Δv the landing and the liftoff have already taken from the landing stage.
const SPENT = LANDING_DELTA_V + LIFTOFF_DELTA_V;

// The direction the Moon travels along its orbit at the burn (a unit vector).
const MOON_TRAVEL = {
  x: Math.cos(((MOON_START_ANGLE + 90) * Math.PI) / 180),
  y: Math.sin(((MOON_START_ANGLE + 90) * Math.PI) / 180),
};

const thousandKm = (m) => m / 1e6;
const km = (m) => m / 1000;

// Mission 2, step 9: the trans-Earth injection, the trans-lunar injection (M2S4) in reverse.
// From the 100 × 100 km lunar orbit (M2S8), the player picks where in that orbit to burn
// (the lander's position, clockwise from the Moon's direction of travel around Earth), the
// burn's angle and its Δv, from what the landing stage has left after the landing and the
// liftoff. The goal is a perigee 0–100 km above Earth, into the atmosphere but not steeply.
// Left: the burn form with Eject, the goal card and the lander's systems. Right: the 3D view
// of Earth, the Moon (its lunar orbit drawn enlarged until the burn) and the planned path,
// with the RCS and battery gauges. Eject flies the path to the perigee; a systems failure on
// the way goes to /mission-failure.
// Route state in: as M2S8 passed it on. Out (Continue): the same state with `lander:
// { fuelLeft }` after the burn and `arrival: { perigeeAltitude (m), speed (m/s at perigee) }`.
const M2S9 = () => {
  const navigate = useNavigate();
  const redo = useRedo();
  const { state } = useLocation();
  const design = useSelector(selectLanderDesign);
  const spacecraft = useMemo(() => computeLanderStats(design), [design]);
  const available = Math.max(0, spacecraft.landerDeltaV - SPENT);
  const onBoard = landerFuelLeft(spacecraft.totalMass, design.landerFuel, SPENT);

  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [angle, setAngle] = useState(DEFAULT_ANGLE);
  const [burn, setBurn] = useState(DEFAULT_BURN);
  const [launched, setLaunched] = useState(false);

  const path = useMemo(() => returnPath(burn, angle, position), [burn, angle, position]);
  const { perigee, result, escapes, moonVInf } = path;
  const pathEnd = path.points.at(-1).t;
  const coastEnd = Math.min(MAX_TIME, pathEnd, perigee.t);

  // The lander's systems over the whole coast, worked out at Eject.
  const timeline = useMemo(
    () => (launched ? cruiseTimeline(earthCourse(path), spacecraft, spacecraft.rcsDeltaV, coastEnd) : null),
    [launched, path, spacecraft, coastEnd],
  );
  const failure = timeline?.failure ?? null;
  const [time, setTime] = useCoast(launched, failure ? Math.min(coastEnd, failure.time) : coastEnd, COAST_RATE);
  const arrived = launched && time >= coastEnd;

  const perigeeKm = km(perigee.altitude);
  const hitsMoon = result === "moon";
  const onTarget = !hitsMoon && perigeeKm >= PERIGEE_TARGET_KM.min && perigeeKm <= PERIGEE_TARGET_KM.max;

  // A system failed: once the coast reaches it, hand over to the mission failure view.
  useEffect(() => {
    if (failure && time >= failure.time) {
      navigate("/mission-failure", {
        state: { failure, retryState: state, retryPath: "/m2-s9", redesignPath: "/m2-s1" },
      });
    }
  }, [failure, time, navigate, state]);

  // Before the burn: the systems as they are in lunar orbit.
  const systems = timeline
    ? systemsAt(timeline.samples, time)
    : {
        au: 1,
        solar: spacecraft.solarEarth,
        battery: spacecraft.batteryCapacity,
        temperature: CABIN_NOMINAL_C,
        rcs: spacecraft.rcsDeltaV,
      };
  const limits = {
    demand: POWER_DEMAND_KW,
    batteryCapacity: spacecraft.batteryCapacity,
    heatLoad: HEAT_LOAD_KW,
    heatRejection: spacecraft.heatRejection,
    cabinNominal: CABIN_NOMINAL_C,
    cabinMax: CABIN_MAX_C,
    rcsStart: spacecraft.rcsDeltaV,
  };

  const propellant = { needed: landerBurnPropellant(spacecraft.totalMass, SPENT, burn), available: onBoard };
  const stageLabel = "Landing stage";

  let blockedReason = null;
  if (burn > available) {
    blockedReason = `The landing stage can only give ${format(Math.floor(available))} m/s after the landing and the liftoff.`;
  } else if (!escapes) {
    blockedReason = "Too small to leave the Moon: the lander would stay in lunar orbit.";
  } else if (hitsMoon) {
    blockedReason = "This path crashes into the Moon. Point the burn less inward.";
  }

  const retry = () => {
    setLaunched(false);
    setTime(0);
  };
  const toNext = () => {
    navigate("/m2-s10", {
      state: {
        ...state,
        lander: { fuelLeft: landerFuelLeft(spacecraft.totalMass, design.landerFuel, SPENT + burn) },
        arrival: { perigeeAltitude: perigee.altitude, speed: perigee.speed },
      },
    });
  };

  // What the transfer view draws.
  const moonStart = useMemo(() => moonAt(0), []);
  const direction = useMemo(() => positionDirection(position), [position]);
  const phase = useMemo(
    () => returnPhaseLines(moonStart, MOON_TRAVEL, direction, position),
    [moonStart, direction, position],
  );
  // TransferView's path shape (its "closest" is the perigee); stable while the path is.
  const drawnPath = useMemo(() => ({ points: path.points, closest: { t: path.perigee.t } }), [path]);
  const craft = launched ? positionAt(path.points, time) : null;
  const moonNow = moonAt(time);
  const bodies = {
    earth: { x: 0, y: 0 },
    moon: moonNow,
    burn: launched ? null : enlargedBurnPoint(moonStart, direction),
    craft,
    closest: arrived ? null : perigee.at,
  };

  const day = format(perigee.t / DAY, 1);
  let note = "Set where in the lunar orbit to burn, and the burn's direction and size. The amber path shows where it would take you.";
  if (launched && !arrived) note = "Burn complete. Falling back toward Earth… Watch the lander's systems below.";
  else if (arrived) note = onTarget ? "On course for reentry!" : "Off course for reentry.";

  let failedText = "";
  if (perigeeKm < PERIGEE_TARGET_KM.min) {
    failedText = `The path dives too steeply: its perigee would be ${format(Math.round(-perigeeKm))} km below the surface, so the capsule would burn up.`;
  } else {
    failedText = `The perigee is ${format(Math.round(perigeeKm))} km up, above the atmosphere: the capsule would sail past Earth.`;
  }

  return (
    <SplitPane
      left={
        <>
          <FlightControls onRedo={redo} title="Trans-Earth injection" note={note}>
            <div className="flight-controls__column">
              <EjectionForm
                angle={angle}
                burn={burn}
                angleRange={ANGLE_RANGE}
                burnRange={BURN_RANGE}
                onAngleChange={setAngle}
                onBurnChange={setBurn}
                available={available}
                propellant={propellant}
                stageLabel={stageLabel}
                blockedReason={blockedReason}
                locked={launched}
                onEject={() => setLaunched(true)}
                angleHint="From the lander's direction of travel in its lunar orbit: 0° is straight ahead, + points outward (away from the Moon)."
                departure={{
                  label: "Speed leaving the Moon (v∞)",
                  info: "vInf",
                  value: moonVInf === null ? "Doesn't escape the Moon" : `${format(moonVInf)} m/s`,
                  alert: !escapes,
                }}
              >
                <Field
                  label="Position in orbit"
                  info="orbitPosition"
                  hint="Where the lander is around the Moon at the burn, clockwise from the direction the Moon travels around Earth."
                  unit="°"
                  range={POSITION_RANGE}
                  value={position}
                  disabled={launched}
                  onChange={setPosition}
                />
              </EjectionForm>
              <PhaseGoal
                step={1}
                steps={1}
                goal="Aim for Earth's atmosphere"
                unit="km"
                meters={[
                  {
                    label: "Perigee altitude",
                    value: hitsMoon ? null : perigeeKm,
                    valueText: "Hits the Moon",
                    target: PERIGEE_TARGET_KM,
                  },
                ]}
                note={`Passes closest to Earth on day ${day}. Bring the perigee ${PERIGEE_TARGET_KM.min}–${PERIGEE_TARGET_KM.max} km above the surface: low enough for the atmosphere to catch the capsule, high enough not to dive in too steeply.`}
                reached={arrived && onTarget}
                reachedText={`Back at Earth on day ${day}, with the perigee ${format(Math.round(perigeeKm))} km up at ${format(perigee.speed / 1000, 2)} km/s.`}
                failed={arrived && !onTarget}
                failedText={failedText}
                action={arrived ? (onTarget ? { label: "Continue", onClick: toNext } : { label: "Try again", onClick: retry }) : undefined}
              />
            </div>
          </FlightControls>
          <CruiseStats
            day={Math.floor(time / DAY)}
            target="Earth"
            targetDistance={craft ? Math.hypot(craft.x, craft.y) : null}
            systems={systems}
            limits={limits}
          />
        </>
      }
      right={
        <TransferView
          scene={MOON_RETURN_SCENE}
          path={drawnPath}
          tail={PLANNED_TAIL}
          launched={launched}
          time={time}
          bodies={bodies}
          phase={phase}
          readout={launched ? `Day ${format(time / DAY, 1)} · ${format(thousandKm(Math.hypot(craft.x, craft.y)))} thousand km from Earth` : `Burn at ${position}° around the Moon`}
          aside={
            <FuelGauges
              title="Systems"
              gauges={[
                {
                  key: "rcs",
                  label: "RCS",
                  fraction: spacecraft.rcsDeltaV > 0 ? systems.rcs / spacecraft.rcsDeltaV : 0,
                  detail: `${format(systems.rcs, 1)} m/s`,
                },
                {
                  key: "battery",
                  label: "Battery",
                  fraction: systems.battery / spacecraft.batteryCapacity,
                  detail: `${format(systems.battery, 1)} kWh`,
                },
              ]}
            />
          }
        />
      }
    />
  );
};

export default M2S9;
