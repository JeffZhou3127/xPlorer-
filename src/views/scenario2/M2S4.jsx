import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import EjectionForm, { Field } from "../../components/EjectionForm/EjectionForm.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import CruiseStats from "../../components/CruiseStats/CruiseStats.jsx";
import TransferView from "../../components/TransferView/TransferView.jsx";
import { phaseLines } from "../../components/TransferView/transferScene.js";
import { MOON_SCENE } from "../../components/TransferView/moonScene.js";
import useCoast from "../../hooks/useCoast.js";
import { selectRocket } from "../../store/rocketSlice.js";
import { selectLanderDesign, selectLanderMass } from "../../store/landerSlice.js";
import { format } from "../../utils/format.js";
import { CABIN_MAX_C, CABIN_NOMINAL_C, cruiseTimeline, systemsAt } from "../../utils/cruiseSystems.js";
import { computeLanderStats } from "../../utils/landerPhysics.js";
import { HEAT_LOAD_KW, POWER_DEMAND_KW } from "../../utils/spacecraftPhysics.js";
import {
  ANGLE_RANGE,
  BURN_RANGE,
  DAY,
  ENCOUNTER_DISTANCE,
  HOUR,
  MAX_TIME,
  MOON_ORBIT,
  PARKING_RADIUS,
  PHASE_RANGE,
  START_ANGLE,
  availableDeltaV,
  burnStages,
  fuelOnBoard,
  moonAt,
  moonCourse,
  positionAt,
  transferPath,
} from "../../utils/moonTransfer.js";

// Simulated time per real second while the spacecraft coasts (a ~3.5 day trip takes ~10 s).
const COAST_RATE = 8 * HOUR;
// The coast stops this long after the closest approach; the planned path is drawn this far past it.
const COAST_PAST_CLOSEST = 6 * HOUR;
const PLANNED_TAIL = 12 * HOUR;

const DEFAULT_PHASE = 0;
const DEFAULT_ANGLE = 0;
const DEFAULT_BURN = 0;

const thousandKm = (m) => m / 1e6;

// Mission 2, step 4: the trans-lunar injection, mission 1's ejection burn (M1S8A13) aimed at
// the Moon instead of Mars. Besides the burn's angle and Δv, the player picks the Moon angle:
// how far the Moon leads the spacecraft around Earth at the burn. The burn may use every
// stage left after the launch: the ones it empties separate on the way.
// Left: the burn form (Moon angle, burn angle, Δv, the propellant it takes) with Eject, then
// the goal card. Right: the 3D view of Earth, the Moon and the planned path, with the RCS and
// battery gauges. Eject flies the path to the closest approach and says whether the spacecraft
// passed within the Moon's sphere of influence.
// Route state in: `flight` ({ stageIndex, stageFuel }) from the launch; without it, only the
// top stage is left, full. Out (Continue): `flight` after the burn and `arrival: { vInf }`,
// the speed relative to the Moon at the closest approach.
const M2S4 = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { stages } = useSelector(selectRocket);
  const payloadMass = useSelector(selectLanderMass);
  const flight = state?.flight ?? {
    stageIndex: stages.length - 1,
    stageFuel: stages.map((_, i) => (i === stages.length - 1 ? 1 : 0)),
  };
  const available = availableDeltaV(stages, flight, payloadMass);

  const [phaseAngle, setPhaseAngle] = useState(DEFAULT_PHASE);
  const [angle, setAngle] = useState(DEFAULT_ANGLE);
  const [burn, setBurn] = useState(DEFAULT_BURN);
  const [launched, setLaunched] = useState(false);

  const path = useMemo(() => transferPath(burn, angle, phaseAngle), [burn, angle, phaseAngle]);
  const { closest, apogee } = path;
  const pathEnd = path.points.at(-1).t;
  const coastEnd = Math.min(MAX_TIME, pathEnd, closest.t + COAST_PAST_CLOSEST);

  // The lander's systems over the whole coast, worked out at Eject (as on the way to Mars).
  const lander = useSelector(selectLanderDesign);
  const spacecraft = useMemo(() => computeLanderStats(lander), [lander]);
  const timeline = useMemo(
    () => (launched ? cruiseTimeline(moonCourse(path, phaseAngle), spacecraft, spacecraft.rcsDeltaV, coastEnd) : null),
    [launched, path, phaseAngle, spacecraft, coastEnd],
  );
  const failure = timeline?.failure ?? null;
  const [time, setTime] = useCoast(launched, failure ? Math.min(coastEnd, failure.time) : coastEnd, COAST_RATE);
  const arrived = launched && time >= Math.min(closest.t, pathEnd);
  const encounter = closest.distance <= ENCOUNTER_DISTANCE;

  // A system failed: once the coast reaches it, hand over to the mission failure view.
  useEffect(() => {
    if (failure && time >= failure.time) {
      navigate("/mission-failure", {
        state: { failure, retryState: state, retryPath: "/m2-s4", redesignPath: "/m2-s1" },
      });
    }
  }, [failure, time, navigate, state]);

  // Before the burn: the systems as they are in the parking orbit.
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

  // The stages after the burn, and the propellant it takes. Past what the stages hold, the
  // overflow is shown in proportion to the Δv missing.
  const after = burnStages(stages, flight, payloadMass, burn);
  const onBoard = fuelOnBoard(stages, flight);
  const burned = onBoard - fuelOnBoard(stages, after);
  const propellant = { needed: after.short > 0 ? (onBoard * burn) / Math.max(available, 1) : burned, available: onBoard };
  const first = flight.stageIndex + 1;
  const stageLabel = first === stages.length ? `Stage ${first}` : `Stages ${first}–${stages.length}`;

  const reachesMoon = apogee === null || apogee >= MOON_ORBIT - ENCOUNTER_DISTANCE;
  let blockedReason = null;
  if (burn > available) {
    blockedReason = `${stageLabel} can only give ${format(Math.floor(available))} m/s.`;
  } else if (!reachesMoon) {
    blockedReason = `Too small to reach the Moon: the path only climbs to ${format(thousandKm(apogee))} thousand km from Earth, and the Moon is ${format(thousandKm(MOON_ORBIT))} thousand km away.`;
  }

  const retry = () => {
    setLaunched(false);
    setTime(0);
  };
  const toNext = () => {
    navigate("/m2-s5", {
      state: { flight: { stageIndex: after.stageIndex, stageFuel: after.stageFuel }, arrival: { vInf: closest.vInf } },
    });
  };

  // What the transfer view draws.
  const phase = useMemo(
    () => phaseLines(START_ANGLE, phaseAngle, PARKING_RADIUS, MOON_ORBIT, MOON_ORBIT * 0.3),
    [phaseAngle],
  );
  const showClosest = !arrived;
  const craft = launched ? positionAt(path.points, time) : null;
  const moonNow = moonAt(phaseAngle, time);
  const bodies = {
    earth: { x: 0, y: 0 },
    moon: moonNow,
    craft,
    ghost: showClosest ? closest.target : null,
    closest: showClosest ? closest.at : null,
  };

  const day = format(closest.t / DAY, 1);
  let note = "Set where the Moon is, and the burn's direction and size. The amber path shows where it would take you.";
  if (launched && !arrived) note = "Burn complete. Coasting out toward the Moon… Watch the lander's systems below.";
  else if (arrived) note = encounter ? "Moon encounter!" : "Missed the Moon.";

  return (
    <SplitPane
      left={
        <>
          <FlightControls title="Trans-lunar injection" note={note}>
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
                angleHint="From the spacecraft's direction of travel in its parking orbit: 0° is straight ahead, + points outward (away from Earth)."
                departure={{
                  label: "Highest point from Earth",
                  info: "apogee",
                  value: apogee === null ? "Escapes Earth" : `${format(thousandKm(apogee))} thousand km`,
                  alert: !reachesMoon,
                }}
              >
                <Field
                  label="Moon angle"
                  info="moonPhaseAngle"
                  hint="How far the Moon is ahead of the spacecraft around Earth at the burn."
                  unit="°"
                  range={PHASE_RANGE}
                  value={phaseAngle}
                  disabled={launched}
                  onChange={setPhaseAngle}
                />
              </EjectionForm>
              <PhaseGoal
                step={1}
                steps={1}
                goal="Intercept the Moon"
                unit="thousand km"
                meters={[
                  {
                    label: "Closest approach",
                    value: thousandKm(closest.distance),
                    target: { min: 0, max: thousandKm(ENCOUNTER_DISTANCE) },
                  },
                ]}
                note={`Passes closest to the Moon on day ${day}. Get within ${format(thousandKm(ENCOUNTER_DISTANCE))} thousand km, where the Moon's gravity takes over.`}
                reached={arrived && encounter}
                reachedText={`Moon encounter on day ${day}, passing ${format(Math.round(closest.distance / 1000))} km from its centre.`}
                failed={arrived && !encounter}
                failedText={`Missed the Moon by ${format(thousandKm(closest.distance))} thousand km.`}
                action={arrived ? (encounter ? { label: "Continue", onClick: toNext } : { label: "Try again", onClick: retry }) : undefined}
              />
            </div>
          </FlightControls>
          <CruiseStats
            day={Math.floor(time / DAY)}
            target="Moon"
            targetDistance={craft ? Math.hypot(craft.x - moonNow.x, craft.y - moonNow.y) : null}
            systems={systems}
            limits={limits}
          />
        </>
      }
      right={
        <TransferView
          scene={MOON_SCENE}
          path={path}
          tail={PLANNED_TAIL}
          launched={launched}
          time={time}
          bodies={bodies}
          phase={phase}
          readout={launched ? `Day ${format(time / DAY, 1)}` : `Moon leads by ${phaseAngle}°`}
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

export default M2S4;
