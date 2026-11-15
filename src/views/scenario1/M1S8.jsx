import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import EjectionForm from "../../components/EjectionForm/EjectionForm.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import CruiseStats from "../../components/CruiseStats/CruiseStats.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import TransferView from "../../components/TransferView/TransferView.jsx";
import { selectRocket } from "../../store/rocketSlice.js";
import { selectSpacecraftDesign, selectSpacecraftMass } from "../../store/spacecraftSlice.js";
import { format } from "../../utils/format.js";
import { HEAT_LOAD_KW, POWER_DEMAND_KW, computeSpacecraftStats } from "../../utils/spacecraftPhysics.js";
import { CABIN_MAX_C, CABIN_NOMINAL_C, cruiseTimeline, systemsAt } from "../../utils/cruiseSystems.js";
import {
  ANGLE_RANGE,
  BURN_RANGE,
  DAY,
  ENCOUNTER_DISTANCE,
  ESCAPE_BURN,
  MAX_DAYS,
  arrivalSpeed,
  burnPropellant,
  marsAt,
  positionAt,
  stageDeltaV,
  transferPath,
} from "../../utils/marsTransfer.js";

// Simulated days per real second while the spacecraft coasts to Mars.
const DAYS_PER_SECOND = 25;
// The coast stops this long after the closest approach to Mars.
const COAST_PAST_CLOSEST = 15 * DAY;

const DEFAULT_ANGLE = 0;
const DEFAULT_BURN = 3600;

const millionKm = (m) => m / 1e9;

// Seconds since the burn, advancing once `running` until `until`.
const useCoast = (running, until) => {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setTime((t) => Math.min(until, t + dt * DAYS_PER_SECOND * DAY));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, until]);
  return [time, setTime];
};

// Mission 1, step 8: the ejection burn to Mars, reached from M1S7's Undock. The spacecraft
// is in its 300 km parking orbit with Mars 44° ahead of Earth.
// Left: the burn form (angle from Earth's orbital direction and Δv, with a meter of the
// propellant it takes) with Eject at the bottom, greyed out if the active stage can't give
// that Δv; the goal card; then the spacecraft's systems (CruiseStats). Right: the 3D
// Earth–Mars view with the planned path and RCS/battery gauges. Eject flies the path to
// the closest approach and says whether Mars was reached; if so, Continue leads to the
// orbit insertion (M1S9). The systems are worked out for
// the whole coast at Eject (cruiseTimeline); if one fails on the way (battery flat, cabin
// overheated, RCS dry), the coast stops there and the mission failure view takes over.
const M1S8 = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { stages } = useSelector(selectRocket);
  const payloadMass = useSelector(selectSpacecraftMass);
  const design = useSelector(selectSpacecraftDesign);
  const spacecraft = useMemo(() => computeSpacecraftStats(design), [design]);
  // RCS Δv left after docking (M1S6 passes what it used along).
  const rcsStart = Math.max(0, spacecraft.rcsDeltaV - (state?.rcsUsed ?? 0));

  // The stages left after the flight (passed along from M1S4), all full after refueling.
  const stageIndex = state?.flight?.stageIndex ?? stages.length - 1;
  const attached = stages.slice(stageIndex);
  const available = stageDeltaV(attached, payloadMass);

  const [angle, setAngle] = useState(DEFAULT_ANGLE);
  const [burn, setBurn] = useState(DEFAULT_BURN);
  const [launched, setLaunched] = useState(false);

  const path = useMemo(() => transferPath(burn, angle), [burn, angle]);
  const closest = path?.closest ?? null;
  const coastEnd = closest ? Math.min(MAX_DAYS * DAY, closest.t + COAST_PAST_CLOSEST) : 0;
  const timeline = useMemo(
    () => (launched && path ? cruiseTimeline(path, spacecraft, rcsStart, coastEnd) : null),
    [launched, path, spacecraft, rcsStart, coastEnd],
  );
  const failure = timeline?.failure ?? null;
  const [time, setTime] = useCoast(launched, failure ? Math.min(coastEnd, failure.time) : coastEnd);
  const arrived = launched && closest !== null && time >= closest.t;
  const encounter = closest !== null && closest.distance <= ENCOUNTER_DISTANCE;

  // A system failed: once the coast reaches it, hand over to the mission failure view.
  useEffect(() => {
    if (failure && time >= failure.time) {
      navigate("/mission-failure", { state: { failure, retryState: state } });
    }
  }, [failure, time, navigate, state]);

  const systems = timeline
    ? systemsAt(timeline.samples, time)
    : { au: 1, solar: spacecraft.solarEarth, battery: spacecraft.batteryCapacity, temperature: CABIN_NOMINAL_C, rcs: rcsStart };
  const craft = launched && path ? positionAt(path.points, time) : null;
  const mars = marsAt(time);
  const limits = {
    demand: POWER_DEMAND_KW,
    batteryCapacity: spacecraft.batteryCapacity,
    heatLoad: HEAT_LOAD_KW,
    heatRejection: spacecraft.heatRejection,
    cabinNominal: CABIN_NOMINAL_C,
    cabinMax: CABIN_MAX_C,
    rcsStart,
  };

  let blockedReason = null;
  if (burn > available) {
    blockedReason = `Stage ${stageIndex + 1} can only give ${format(Math.floor(available))} m/s.`;
  } else if (path === null) {
    blockedReason = `Too small to escape Earth: at least ${format(Math.ceil(ESCAPE_BURN))} m/s is needed.`;
  }

  const retry = () => {
    setLaunched(false);
    setTime(0);
  };

  // On to the Mars orbit insertion (M1S9) with what the ejection burn left in the active
  // stage (the stages above it are full) and the speed the spacecraft arrives with.
  const propellant = { needed: burnPropellant(attached, payloadMass, burn), available: attached[0]?.fuel ?? 0 };
  const toMars = () => {
    const left = propellant.available > 0 ? Math.max(0, 1 - propellant.needed / propellant.available) : 0;
    const stageFuel = stages.map((_, i) => {
      if (i < stageIndex) return 0;
      return i === stageIndex ? left : 1;
    });
    navigate("/m1-s9", {
      state: { ...state, flight: { stageIndex, stageFuel }, arrival: { vInf: arrivalSpeed(path) } },
    });
  };

  const missBy = closest && millionKm(closest.distance);
  let note = "Set the burn's direction and size. The amber path shows where it would take you.";
  if (launched && !arrived) note = "Burn complete. Coasting toward Mars's orbit… Watch the spacecraft's systems below.";
  else if (arrived) note = encounter ? "Mars encounter!" : "Missed Mars.";

  return (
    <SplitPane
      left={
        <>
          <FlightControls title="Trans-Mars injection" note={note}>
            <div className="flight-controls__column">
              <EjectionForm
                angle={angle}
                burn={burn}
                angleRange={ANGLE_RANGE}
                burnRange={BURN_RANGE}
                onAngleChange={setAngle}
                onBurnChange={setBurn}
                vInf={path?.vInf ?? null}
                available={available}
                propellant={propellant}
                stageLabel={`Stage ${stageIndex + 1}`}
                blockedReason={blockedReason}
                locked={launched}
                onEject={() => setLaunched(true)}
              />
              <PhaseGoal
                step={1}
                steps={1}
                goal="Intercept Mars"
                unit="million km"
                meters={
                  closest
                    ? [
                        {
                          label: "Closest approach",
                          value: missBy,
                          target: { min: 0, max: millionKm(ENCOUNTER_DISTANCE) },
                        },
                      ]
                    : []
                }
                note={
                  closest
                    ? `Passes Mars on day ${Math.round(closest.t / DAY)}. Get within ${format(millionKm(ENCOUNTER_DISTANCE), 2)} million km, where Mars's gravity takes over.`
                    : "The burn doesn't escape Earth yet."
                }
                reached={arrived && encounter}
                reachedText={`Mars encounter on day ${Math.round((closest?.t ?? 0) / DAY)}, passing ${format(Math.round((closest?.distance ?? 0) / 1000))} km from its centre.`}
                failed={arrived && !encounter}
                failedText={`Missed Mars by ${format(missBy ?? 0, 2)} million km.`}
                action={arrived ? (encounter ? { label: "Continue", onClick: toMars } : { label: "Try again", onClick: retry }) : undefined}
              />
            </div>
          </FlightControls>
          <CruiseStats
            day={Math.floor(time / DAY)}
            marsDistance={craft ? Math.hypot(craft.x - mars.x, craft.y - mars.y) : null}
            systems={systems}
            limits={limits}
          />
        </>
      }
      right={
        <TransferView
          path={path}
          launched={launched}
          time={time}
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

export default M1S8;
