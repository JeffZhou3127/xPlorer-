import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import ReentryForm from "../../components/ReentryForm/ReentryForm.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import ReentryView from "../../components/ReentryView/ReentryView.jsx";
import ReentryStats from "../../components/ReentryStats/ReentryStats.jsx";
import MissionClock from "../../components/MissionClock/MissionClock.jsx";
import RadioBlackout from "../../components/RadioBlackout/RadioBlackout.jsx";
import Splashdown from "../../components/Splashdown/Splashdown.jsx";
import { format, formatMissionTime } from "../../utils/format.js";
import {
  AOA_RANGE,
  DEFAULT_AOA,
  DEFAULT_ENTRY_ANGLE,
  DEFAULT_V_INF,
  ENTRY_ANGLE_RANGE,
  G_LIMIT,
  SHIELD_LIMIT_C,
  SHIELD_SECTIONS,
  entryReadouts,
  entryState,
  finishEntry,
  inBlackout,
  liftToDrag,
  reentryFailure,
  stepEntry,
} from "../../utils/reentry.js";

// Before the blackout the entry runs in real time, or at the player's warp (0 = paused, up
// to MAX_WARP), so there is time to read the stats and adjust the angle of attack. The
// blackout lasts BLACKOUT_SECONDS of real time, sped up automatically to cover the rest
// of the entry.
const MAX_WARP = 5;
const BLACKOUT_SECONDS = 15;
// How long the service module jettison takes (matches ReentryView.css: 0.8 s delay + 4 s).
const SEPARATION_MS = 4800;
// Heat flux (W/m²) at which the shock wave and hot wake are fully drawn (about what the
// capsule sees at the blackout, so they build up while the player watches).
const FULL_GLOW_FLUX = 4e5;

const windwardFactor = (aoa) => SHIELD_SECTIONS.find((s) => s.key === "windward").factor(aoa);

// Mission 1, step 14: Earth reentry, from M1S13's Continue once Earth is reached (route
// state `arrival.vInf`, the speed the transfer arrives with). It opens with the service
// module being jettisoned. Left: the reentry form (entry angle, locked at Start; angle of
// attack, adjustable until the radio blackout) and the goal card. Right: the view of the
// capsule with its heat shield sections coloured by temperature, and the reentry stats.
// Start flies the entry live, in real time (the player can pause or warp up to MAX_WARP),
// down to the blackout (about 30 s). Then the screen flickers and goes black ("Radio
// Blackout") while the mission clock runs on at an automatic warp that covers the rest of
// the entry in BLACKOUT_SECONDS. Then: burned up or
// skipped back out into space → the mission failure view (retry from here); splashdown →
// the "Mission success!" screen, with a link home.
const M1S14 = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const vInf = state?.arrival?.vInf ?? DEFAULT_V_INF;

  // "separation" | "ready" | "entry" | "blackout" | "splashdown"
  const [phase, setPhase] = useState("separation");
  const [entryAngle, setEntryAngle] = useState(DEFAULT_ENTRY_ANGLE);
  const [aoa, setAoa] = useState(DEFAULT_AOA);
  const [sim, setSim] = useState(null); // the entry once started
  const [warp, setWarp] = useState(1); // the player's warp before the blackout
  // Set at the blackout: { from (s), final (the entry's end state), warp, startedAt (ms) }.
  const [blackout, setBlackout] = useState(null);
  const [blackoutTime, setBlackoutTime] = useState(0);

  const aoaRef = useRef(aoa);
  const warpRef = useRef(warp);
  const startRef = useRef(null); // the entry interface state Start begins from
  useEffect(() => {
    aoaRef.current = aoa;
    warpRef.current = warp;
  }, [aoa, warp]);

  // The service module drifts away (ReentryView's animation), then the capsule is free.
  useEffect(() => {
    const timer = setTimeout(() => setPhase((p) => (p === "separation" ? "ready" : p)), SEPARATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const preview = useMemo(() => entryState(vInf, entryAngle), [vInf, entryAngle]);
  const shown = sim ?? preview;
  const readouts = entryReadouts(shown);

  // Live entry, down to the blackout.
  useEffect(() => {
    if (phase !== "entry") return undefined;
    let frame;
    let last = performance.now();
    let current = startRef.current;
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (warpRef.current === 0) {
        frame = requestAnimationFrame(tick);
        return;
      }
      current = stepEntry(current, aoaRef.current, dt * warpRef.current, { untilBlackout: true });
      setSim(current);
      if (current.outcome !== null || inBlackout(current)) {
        const final = finishEntry(current, aoaRef.current);
        setBlackout({
          from: current.t,
          final,
          warp: Math.max(1, (final.t - current.t) / BLACKOUT_SECONDS),
          startedAt: now,
        });
        setBlackoutTime(current.t);
        setPhase("blackout");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // The blackout: the clock runs on at its warp, then the outcome.
  useEffect(() => {
    if (phase !== "blackout" || !blackout) return undefined;
    let frame;
    const tick = (now) => {
      const elapsed = (now - blackout.startedAt) / 1000;
      setBlackoutTime(Math.min(blackout.final.t, blackout.from + elapsed * blackout.warp));
      if (elapsed < BLACKOUT_SECONDS) {
        frame = requestAnimationFrame(tick);
      } else if (blackout.final.outcome === "splashdown") {
        setPhase("splashdown");
      } else {
        navigate("/mission-failure", {
          state: { failure: reentryFailure(blackout.final, entryAngle), retryState: state },
        });
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, blackout, entryAngle, navigate, state]);

  const start = () => {
    const initial = entryState(vInf, entryAngle);
    startRef.current = initial;
    setSim(initial);
    setPhase("entry");
  };

  if (phase === "splashdown") {
    const final = entryReadouts(blackout.final);
    return (
      <Splashdown
        summary={[
          { label: "Entry angle", value: `${format(entryAngle, 1)}°`, info: "entryAngle" },
          { label: "Angle of attack", value: `${format(blackout.final.aoa, 1)}°`, info: "angleOfAttack" },
          { label: "Peak deceleration", value: `${format(final.maxG, 1)} g`, info: "gForce" },
          { label: "Hottest shield", info: "heatShield", value: `${format(Math.max(...Object.values(final.maxTemps)))} °C` },
          { label: "Downrange", info: "downrange", value: `${format(final.downrange / 1000)} km` },
          { label: "Entry to parachutes", value: formatMissionTime(blackout.final.t) },
        ]}
      />
    );
  }

  const started = phase === "entry" || phase === "blackout";
  const glow = Math.min(1, readouts.heatFlux / FULL_GLOW_FLUX);
  // The clock's warp: the player's before the blackout (adjustable once started), the
  // automatic one during it.
  let clockTime = 0;
  let clockWarp = warp;
  if (phase === "entry") {
    clockTime = shown.t;
  } else if (phase === "blackout") {
    clockTime = blackoutTime;
    clockWarp = Math.round(blackout.warp);
  }

  let note = "The service module is being jettisoned. Set the entry angle and angle of attack meanwhile.";
  if (phase === "ready") note = "Capsule free. Set the entry angle and angle of attack, then Start.";
  if (phase === "blackout") note = "Radio blackout. The angle of attack is locked.";
  if (phase === "entry") {
    note = "Falling into the atmosphere in real time (speed up or pause with the clock). The angle of attack can still be changed until the radio blackout.";
  }

  return (
    <>
      <SplitPane
        left={
          <FlightControls title="Reentry controls" note={note}>
            <div className="flight-controls__column">
              <ReentryForm
                entryAngle={entryAngle}
                aoa={aoa}
                entryAngleRange={ENTRY_ANGLE_RANGE}
                aoaRange={AOA_RANGE}
                onEntryAngleChange={setEntryAngle}
                onAoaChange={setAoa}
                entrySpeed={preview.v}
                liftToDrag={liftToDrag(aoa)}
                windwardFactor={windwardFactor(aoa)}
                started={started}
                aoaLocked={phase === "blackout"}
                blockedReason={phase === "separation" ? "Waiting for the service module to clear." : null}
                onStart={start}
              />
              <PhaseGoal
                step={1}
                steps={1}
                goal="Splash down in the ocean"
                meters={[]}
                note={`Thread the entry corridor: steep enough not to skip off the atmosphere, shallow enough that the heat shield stays under ${format(SHIELD_LIMIT_C)} °C and the deceleration under ${G_LIMIT} g. Capsules coming home from Mars aim for about 6–7° below the horizon; lift widens the corridor, but too much angle of attack overheats the windward shoulder.`}
              />
            </div>
          </FlightControls>
        }
        right={
          <>
            <ReentryView
              phase={phase === "blackout" ? "entry" : phase}
              altitude={readouts.altitude}
              pathAngle={readouts.pathAngle}
              aoa={aoa}
              temps={readouts.temps}
              shieldLimit={SHIELD_LIMIT_C}
              glow={phase === "entry" || phase === "blackout" ? glow : 0}
              readout={started ? `${format(readouts.altitude / 1000, 1)} km · ${format(readouts.speed / 1000, 2)} km/s` : null}
            />
            <ReentryStats readouts={readouts} sections={SHIELD_SECTIONS} shieldLimit={SHIELD_LIMIT_C} gLimit={G_LIMIT} />
          </>
        }
      />
      <MissionClock
        time={clockTime}
        warp={clockWarp}
        maxWarp={phase === "blackout" ? clockWarp : MAX_WARP}
        onWarpChange={setWarp}
        locked={phase !== "entry"}
        caption="Since entry interface"
      />
      {phase === "blackout" && (
        <RadioBlackout>
          <p>
            The air ahead of the capsule is squeezed into a glowing plasma hotter than the surface of the Sun. It
            blocks radio waves, so mission control can't hear the crew or see the telemetry.
          </p>
          <p>
            The angle of attack is locked at {format(blackout.final.aoa, 1)}°. Now it is up to the heat shield. Contact
            should return once the capsule has slowed down.
          </p>
        </RadioBlackout>
      )}
    </>
  );
};

export default M1S14;
