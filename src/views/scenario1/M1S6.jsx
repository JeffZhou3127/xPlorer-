import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import FlightControls from "../../components/FlightControls/FlightControls.jsx";
import RcsControls from "../../components/RcsControls/RcsControls.jsx";
import ViewSwitch from "../../components/ViewSwitch/ViewSwitch.jsx";
import PhaseGoal from "../../components/PhaseGoal/PhaseGoal.jsx";
import DockingStats from "../../components/DockingStats/DockingStats.jsx";
import DockingView from "../../components/DockingView/DockingView.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import MissionClock from "../../components/MissionClock/MissionClock.jsx";
import { selectSpacecraftDesign } from "../../store/spacecraftSlice.js";
import { computeSpacecraftStats } from "../../utils/spacecraftPhysics.js";
import {
  DOCKING_TOLERANCE,
  ROTATION_STEP,
  TRANSLATION_STEP,
  dockingErrors,
  initialDocking,
  rcsRemaining,
  rotate,
  stepDocking,
  translate,
} from "../../utils/dockingSim.js";

// Longest step the animation takes at once (s), so a stalled frame doesn't jump the approach.
const MAX_FRAME_STEP = 0.1;
// The approach is slow, so the clock allows more warp than the flight panel.
const MAX_TIME_WARP = 10;

const PRECISION_OPTIONS = [
  { value: "coarse", label: "Coarse" },
  { value: "fine", label: "Fine" },
];

// Keyboard shortcuts (as labelled on the RCS pads): a translation direction, or a
// rotation axis and sign. "f" toggles the precision.
const KEYS = {
  w: { direction: "up" },
  s: { direction: "down" },
  a: { direction: "left" },
  d: { direction: "right" },
  e: { direction: "forward" },
  q: { direction: "back" },
  ArrowUp: { axis: "pitch", sign: 1 },
  ArrowDown: { axis: "pitch", sign: -1 },
  ArrowLeft: { axis: "yaw", sign: -1 },
  ArrowRight: { axis: "yaw", sign: 1 },
  z: { axis: "roll", sign: -1 },
  x: { axis: "roll", sign: 1 },
};

// The key as KEYS names it (letters in lower case, so Shift or Caps Lock doesn't matter).
const keyName = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);

// The docking shortcut (a KEYS key or "f") this key press is, or null: modified presses
// and typing in a form field are left alone.
const shortcutKey = (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.target.closest?.("input, select, textarea")) return null;
  const key = keyName(e);
  return key === "f" || KEYS[key] ? key : null;
};

// Advances the approach once per animation frame, `warp` simulated seconds per real
// second (read through a ref so the loop starts only once).
const useDocking = (rcsDeltaV, warp) => {
  const [docking, setDocking] = useState(() => initialDocking(rcsDeltaV));
  const warpRef = useRef(warp);

  useEffect(() => {
    warpRef.current = warp;
  });

  useEffect(() => {
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(MAX_FRAME_STEP, (now - last) / 1000);
      last = now;
      const scale = warpRef.current;
      setDocking((d) => (scale > 0 ? stepDocking(d, dt * scale) : d));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return [docking, setDocking];
};

// What to work on next, for the goal card.
const guidance = (docking) => {
  const { offset, angle } = dockingErrors(docking);
  if (angle > DOCKING_TOLERANCE.angle) {
    return `Line up first: bring roll, pitch and yaw (HUD, left) within ${DOCKING_TOLERANCE.angle}° and stop them turning.`;
  }
  if (offset > DOCKING_TOLERANCE.offset) {
    return `Get onto the port's axis: bring X and Y within ${DOCKING_TOLERANCE.offset} m and stop the sideways drift, so the target cross sits in the middle of the ring.`;
  }
  return `On the axis. Close in slowly and make contact at under ${DOCKING_TOLERANCE.speed} m/s.`;
};

// Mission 1, step 6: docking with the refueling depot, reached from M1S5. The spacecraft
// starts 100 m out, slightly off the port's axis and out of alignment.
// Left: RCS pulse pads (with keyboard shortcuts), precision and the goal, then approach
// stats. Right: the docking camera with its HUD and the RCS gauge. The mission clock
// (with time warp) sits at the bottom centre. Once docked, Continue leads to M1S7.
const M1S6 = () => {
  const navigate = useNavigate();
  // The flight's leftover stages (from M1S5), passed on to refueling.
  const { state } = useLocation();
  const design = useSelector(selectSpacecraftDesign);
  const rcsDeltaV = computeSpacecraftStats(design).rcsDeltaV;

  const [warp, setWarp] = useState(1);
  const [precision, setPrecision] = useState("coarse");
  const [docking, setDocking] = useDocking(rcsDeltaV, warp);

  const translationStep = TRANSLATION_STEP[precision];
  const rotationStep = ROTATION_STEP[precision];
  const remaining = rcsRemaining(docking);
  const { result } = docking;

  const pulseTranslate = (direction) => setDocking((d) => translate(d, direction, translationStep));
  const pulseRotate = (axis, sign) => setDocking((d) => rotate(d, axis, sign, rotationStep));
  const retry = () => {
    setDocking(initialDocking(rcsDeltaV));
    setWarp(1);
  };

  // Shortcut keys held down, so the matching pad buttons light up.
  const [heldKeys, setHeldKeys] = useState(() => new Set());
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = shortcutKey(e);
      if (!key) return;
      setHeldKeys((held) => (held.has(key) ? held : new Set(held).add(key)));
    };
    const onKeyUp = (e) => {
      const key = keyName(e);
      setHeldKeys((held) => {
        if (!held.has(key)) return held;
        const next = new Set(held);
        next.delete(key);
        return next;
      });
    };
    // A key released while the window is in the background never sends keyup.
    const clear = () => setHeldKeys(new Set());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      const key = shortcutKey(e);
      if (key === "f") {
        setPrecision((p) => (p === "fine" ? "coarse" : "fine"));
        return;
      }
      const action = KEYS[key];
      if (!action) return;
      e.preventDefault();
      if (action.direction) {
        setDocking((d) => translate(d, action.direction, translationStep));
      } else {
        setDocking((d) => rotate(d, action.axis, action.sign, rotationStep));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setDocking, translationStep, rotationStep]);

  let note = "Each pulse adds a fixed velocity or turn rate, which lasts until an opposite pulse cancels it. Press F to switch precision.";
  if (result) note = result.docked ? "Docked with the depot." : "Docking failed.";
  else if (remaining < rotationStep) note = "RCS propellant exhausted.";

  return (
    <>
      <SplitPane
        left={
          <>
            <FlightControls title="Docking controls" note={note}>
              <RcsControls
                translationStep={translationStep}
                rotationStep={rotationStep}
                disabled={result !== null}
                heldKeys={heldKeys}
                onTranslate={pulseTranslate}
                onRotate={pulseRotate}
              />
              <div className="flight-controls__column">
                <ViewSwitch
                  label="Pulse precision"
                  options={PRECISION_OPTIONS}
                  value={precision}
                  onChange={setPrecision}
                />
                <PhaseGoal
                  step={1}
                  steps={1}
                  goal="Dock with the refueling depot"
                  meters={[]}
                  note={guidance(docking)}
                  reached={result?.docked ?? false}
                  reachedText="Docked! The spacecraft is latched to the depot and ready to refuel."
                  failed={result !== null && !result.docked}
                  failedText={result?.reasons.join(" ")}
                  action={
                    result?.docked
                      ? { label: "Continue", onClick: () => navigate("/m1-s7", { state }) }
                      : { label: "Retry docking", onClick: retry }
                  }
                />
              </div>
            </FlightControls>
            <DockingStats vel={docking.vel} rcsRemaining={remaining} rcsUsed={docking.rcsUsed} />
          </>
        }
        right={
          <DockingView
            docking={docking}
            aside={
              <FuelGauges
                gauges={[{ key: "rcs", label: "RCS", fraction: rcsDeltaV > 0 ? remaining / rcsDeltaV : 0 }]}
              />
            }
          />
        }
      />
      <MissionClock
        time={docking.time}
        warp={warp}
        maxWarp={MAX_TIME_WARP}
        onWarpChange={setWarp}
        locked={result !== null}
        caption="Docking Time"
      />
    </>
  );
};

export default M1S6;
