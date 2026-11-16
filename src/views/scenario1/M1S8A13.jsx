import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import useRedo from "../../hooks/useRedo.js";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import EjectionForm from "../../components/EjectionForm/EjectionForm.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import CruiseStats from "../../components/CruiseStats/CruiseStats.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import TransferView from "../../components/TransferView/TransferView.jsx";
import { marsTransferScene, planetPhaseLines } from "../../components/TransferView/transferScene.js";
import useCoast from "../../hooks/useCoast.js";
import { selectRocket } from "../../store/rocketSlice.js";
import { selectSpacecraftDesign, selectSpacecraftMass } from "../../store/spacecraftSlice.js";
import { format } from "../../utils/format.js";
import { HEAT_LOAD_KW, POWER_DEMAND_KW, computeSpacecraftStats } from "../../utils/spacecraftPhysics.js";
import { CABIN_MAX_C, CABIN_NOMINAL_C, cruiseTimeline, planetCourse, systemsAt } from "../../utils/cruiseSystems.js";
import {
  ANGLE_RANGE,
  AU,
  BURN_RANGE,
  DAY,
  MAX_DAYS,
  PLANETS,
  TO_EARTH,
  TO_MARS,
  arrivalSpeed,
  burnPropellant,
  escapeBurn,
  originName,
  planetAt,
  positionAt,
  stageDeltaV,
  targetAt,
  targetName,
  transferPath,
} from "../../utils/marsTransfer.js";

// Simulated days per real second while the spacecraft coasts.
const DAYS_PER_SECOND = 25;
// The coast stops this long after the closest approach to the target planet.
const COAST_PAST_CLOSEST = 15 * DAY;

const DEFAULT_ANGLE = 0;
const DEFAULT_BURN = 0;

// Days of the planned path drawn past the closest approach to the target planet.
const PLANNED_TAIL_DAYS = 40;

const millionKm = (m) => m / 1e9;

// The two transfers this view flies: `transfer` is the leg from marsTransfer.js, `path`
// the route (for retrying after a systems failure), `next` where Continue leads.
const LEGS = {
  outbound: { transfer: TO_MARS, title: "Trans-Mars injection", path: "/m1-s8", next: "/m1-s9" },
  return: { transfer: TO_EARTH, title: "Trans-Earth injection", path: "/m1-s13", next: "/m1-s14" },
};

// Mission 1, steps 8 and 13: an ejection burn between the planets. `leg` picks which:
// - "outbound" (step 8, /m1-s8, from the first refueling's Undock): from the 300 km
//   parking orbit to Mars, 44° ahead of Earth. Continue leads to the orbit insertion (M1S9).
// - "return" (step 13, /m1-s13, from the second refueling's Undock): from the Mars science
//   orbit back to Earth, which trails Mars by the return window's phase angle. Continue
//   leads to the Earth reentry (M1S14).
// Left: the burn form (angle and Δv, with a meter of the propellant it takes) with Eject at
// the bottom, greyed out if the active stage can't give that Δv; the goal card; then the
// spacecraft's systems (CruiseStats). Right: the 3D transfer view with the planned path
// and RCS/battery gauges. Eject flies the path to the closest approach and says whether
// the target was reached. The systems are worked out for the whole coast at Eject
// (cruiseTimeline); if one fails on the way (battery flat, cabin overheated, RCS dry), the
// coast stops there and the mission failure view takes over.
// Route state: `flight` (the stages left, all full after refueling) and `rcsUsed` (RCS Δv
// spent so far); Continue adds what this cruise used.
const M1S8A13 = ({ leg: legName = "outbound" }) => {
  const navigate = useNavigate();
  const redo = useRedo();
  const { state } = useLocation();
  const { transfer: leg, title, path: routePath, next } = LEGS[legName];
  const origin = originName(leg);
  const target = targetName(leg);
  const { stages } = useSelector(selectRocket);
  const payloadMass = useSelector(selectSpacecraftMass);
  const design = useSelector(selectSpacecraftDesign);
  const spacecraft = useMemo(() => computeSpacecraftStats(design), [design]);
  // RCS Δv left after everything before this burn (dockings and any earlier cruise).
  const rcsStart = Math.max(0, spacecraft.rcsDeltaV - (state?.rcsUsed ?? 0));

  // The stages left (passed along from the flight), all full after refueling.
  const stageIndex = state?.flight?.stageIndex ?? stages.length - 1;
  const attached = stages.slice(stageIndex);
  const available = stageDeltaV(attached, payloadMass);

  const [angle, setAngle] = useState(DEFAULT_ANGLE);
  const [burn, setBurn] = useState(DEFAULT_BURN);
  const [launched, setLaunched] = useState(false);

  const path = useMemo(() => transferPath(leg, burn, angle), [leg, burn, angle]);
  const closest = path?.closest ?? null;
  const coastEnd = closest ? Math.min(MAX_DAYS * DAY, closest.t + COAST_PAST_CLOSEST) : 0;
  const timeline = useMemo(
    () => (launched && path ? cruiseTimeline(planetCourse(leg, path), spacecraft, rcsStart, coastEnd) : null),
    [leg, launched, path, spacecraft, rcsStart, coastEnd],
  );
  const failure = timeline?.failure ?? null;
  const [time, setTime] = useCoast(
    launched,
    failure ? Math.min(coastEnd, failure.time) : coastEnd,
    DAYS_PER_SECOND * DAY,
  );
  const arrived = launched && closest !== null && time >= closest.t;
  const encounter = closest !== null && closest.distance <= leg.encounterDistance;

  // A system failed: once the coast reaches it, hand over to the mission failure view.
  useEffect(() => {
    if (failure && time >= failure.time) {
      navigate("/mission-failure", { state: { failure, retryState: state, retryPath: routePath } });
    }
  }, [failure, time, navigate, state, routePath]);

  // Before the burn: the systems as they are at the departure planet.
  const startAu = PLANETS[leg.from].orbit / AU;
  const systems = timeline
    ? systemsAt(timeline.samples, time)
    : {
        au: startAu,
        solar: spacecraft.solarEarth / (startAu * startAu),
        battery: spacecraft.batteryCapacity,
        temperature: CABIN_NOMINAL_C,
        rcs: rcsStart,
      };
  const craft = launched && path ? positionAt(path.points, time) : null;
  const targetNow = targetAt(leg, time);
  // What the transfer view draws: the scene and phase marks for this leg, and the bodies now.
  const scene = useMemo(() => marsTransferScene(leg), [leg]);
  const phase = useMemo(() => planetPhaseLines(leg), [leg]);
  const showClosest = closest !== null && !arrived;
  const bodies = {
    sun: { x: 0, y: 0 },
    earth: planetAt(leg, "earth", time),
    mars: planetAt(leg, "mars", time),
    craft,
    ghost: showClosest ? closest.target : null,
    closest: showClosest ? closest.at : null,
  };
  const phaseText = `${target} ${leg.phaseAngle < 0 ? "trails" : "leads"} ${origin} by ${Math.abs(leg.phaseAngle)}°`;
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
    blockedReason = `Too small to escape ${origin}: at least ${format(Math.ceil(escapeBurn(leg)))} m/s is needed.`;
  }

  const retry = () => {
    setLaunched(false);
    setTime(0);
  };

  // Route state onward: what the ejection burn left in the active stage (the stages above
  // it are full), and the RCS Δv spent so far, including this cruise.
  const propellant = { needed: burnPropellant(attached, payloadMass, burn), available: attached[0]?.fuel ?? 0 };
  const onwardState = () => {
    const left = propellant.available > 0 ? Math.max(0, 1 - propellant.needed / propellant.available) : 0;
    const stageFuel = stages.map((_, i) => {
      if (i < stageIndex) return 0;
      return i === stageIndex ? left : 1;
    });
    return { ...state, flight: { stageIndex, stageFuel }, rcsUsed: spacecraft.rcsDeltaV - systems.rcs };
  };
  // On to the arrival (the Mars orbit insertion, or the Earth reentry) with the speed the
  // spacecraft arrives with.
  const toNext = () => {
    navigate(next, { state: { ...onwardState(), arrival: { vInf: arrivalSpeed(leg, path) } } });
  };

  const missBy = closest && millionKm(closest.distance);
  let note = "Set the burn's direction and size. The amber path shows where it would take you.";
  if (launched && !arrived) {
    note = `Burn complete. Coasting toward ${target}'s orbit… Watch the spacecraft's systems below.`;
  } else if (arrived) {
    note = encounter ? `${target} encounter!` : `Missed ${target}.`;
  }

  return (
    <SplitPane
      left={
        <>
          <FlightControls onRedo={redo} title={title} note={note}>
            <div className="flight-controls__column">
              <EjectionForm
                origin={origin}
                retrograde={leg.retrograde}
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
                goal={`Intercept ${target}`}
                unit="million km"
                meters={
                  closest
                    ? [
                        {
                          label: "Closest approach",
                          value: missBy,
                          target: { min: 0, max: millionKm(leg.encounterDistance) },
                        },
                      ]
                    : []
                }
                note={
                  closest
                    ? `Passes ${target} on day ${Math.round(closest.t / DAY)}. Get within ${format(millionKm(leg.encounterDistance), 2)} million km, where ${target}'s gravity takes over.`
                    : `The burn doesn't escape ${origin} yet.`
                }
                reached={arrived && encounter}
                reachedText={`${target} encounter on day ${Math.round((closest?.t ?? 0) / DAY)}, passing ${format(Math.round((closest?.distance ?? 0) / 1000))} km from its centre.`}
                failed={arrived && !encounter}
                failedText={`Missed ${target} by ${format(missBy ?? 0, 2)} million km.`}
                action={arrived ? (encounter ? { label: "Continue", onClick: toNext } : { label: "Try again", onClick: retry }) : undefined}
              />
            </div>
          </FlightControls>
          <CruiseStats
            day={Math.floor(time / DAY)}
            target={target}
            targetDistance={craft ? Math.hypot(craft.x - targetNow.x, craft.y - targetNow.y) : null}
            systems={systems}
            limits={limits}
          />
        </>
      }
      right={
        <TransferView
          scene={scene}
          path={path}
          tail={PLANNED_TAIL_DAYS * DAY}
          launched={launched}
          time={time}
          bodies={bodies}
          phase={phase}
          readout={launched ? `Day ${Math.floor(time / DAY)}` : phaseText}
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

export default M1S8A13;
