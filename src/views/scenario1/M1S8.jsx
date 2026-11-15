import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import EjectionForm from "../../components/EjectionForm/EjectionForm.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import TransferView from "../../components/TransferView/TransferView.jsx";
import { selectRocket } from "../../store/rocketSlice.js";
import { selectSpacecraftMass } from "../../store/spacecraftSlice.js";
import { format } from "../../utils/format.js";
import {
  ANGLE_RANGE,
  BURN_RANGE,
  DAY,
  ENCOUNTER_DISTANCE,
  ESCAPE_BURN,
  MAX_DAYS,
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
// Left: the burn form (angle from Earth's orbital direction and Δv) with Eject at the
// bottom, greyed out if the active stage can't give that Δv; then the goal card. Right:
// the 3D Earth–Mars view with the planned path. Eject flies the path to the closest
// approach and says whether Mars was reached.
const M1S8 = () => {
  const { stages } = useSelector(selectRocket);
  const payloadMass = useSelector(selectSpacecraftMass);
  // The stages left after the flight (passed along from M1S4), all full after refueling.
  const stageIndex = useLocation().state?.flight?.stageIndex ?? stages.length - 1;
  const attached = stages.slice(stageIndex);
  const available = stageDeltaV(attached, payloadMass);

  const [angle, setAngle] = useState(DEFAULT_ANGLE);
  const [burn, setBurn] = useState(DEFAULT_BURN);
  const [launched, setLaunched] = useState(false);

  const path = useMemo(() => transferPath(burn, angle), [burn, angle]);
  const closest = path?.closest ?? null;
  const coastEnd = closest ? Math.min(MAX_DAYS * DAY, closest.t + COAST_PAST_CLOSEST) : 0;
  const [time, setTime] = useCoast(launched, coastEnd);
  const arrived = launched && closest !== null && time >= closest.t;
  const encounter = closest !== null && closest.distance <= ENCOUNTER_DISTANCE;

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

  const missBy = closest && millionKm(closest.distance);
  let note = "Set the burn's direction and size. The amber path shows where it would take you.";
  if (launched && !arrived) note = "Burn complete. Coasting toward Mars's orbit…";
  else if (arrived) note = encounter ? "Mars encounter!" : "Missed Mars.";

  return (
    <SplitPane
      left={
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
              action={arrived && !encounter ? { label: "Try again", onClick: retry } : undefined}
            />
          </div>
        </FlightControls>
      }
      right={<TransferView path={path} launched={launched} time={time} />}
    />
  );
};

export default M1S8;
