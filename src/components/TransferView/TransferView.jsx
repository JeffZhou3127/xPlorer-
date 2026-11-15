import { useEffect, useRef, useState } from "react";
import { loadX3dom, shutdownX3dom } from "../TrajectoryView/x3domLoader.js";
import { lineSet, pointString } from "../TrajectoryView/trajectoryScene.js";
import { DAY, PHASE_ANGLE, earthAt, marsAt, positionAt } from "../../utils/marsTransfer.js";
import { MARKER_SIZES, sceneMarkup, toScene } from "./transferScene.js";
import "./TransferView.css";

// Days of the planned path drawn past the closest approach to Mars.
const PLANNED_TAIL_DAYS = 40;

const SUN = [0, 0, 0];

const setAttributes = (element, values) => {
  for (const [name, value] of Object.entries(values)) element?.setAttribute(name, value);
};

// Where X3DOM's camera currently is (including the user's own orbiting), or null
// before the scene is running.
const cameraPosition = (host) => {
  try {
    return host?.querySelector("x3d")?.runtime?.viewMatrix().inverse().e3() ?? null;
  } catch {
    return null;
  }
};

// 3D view of the Earth–Mars transfer, drawn with X3DOM like the flight panel's trajectory
// view (NASA mission-viz style): the Sun, Earth's and Mars's orbits, the planets `time` s
// after the burn, the 44° phase angle between them (before the burn), the path the burn
// would fly (amber, `path` from transferPath, with its closest approach and where Mars
// will be then), and once `launched`, the path flown (cyan) and the spacecraft.
// Drag to orbit, scroll or right-drag to zoom.
const TransferView = ({ path, launched, time }) => {
  const hostRef = useRef(null);
  const partsRef = useRef(null);
  const drawnRef = useRef({ path: undefined, positions: {} });
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"

  // Build the scene and start X3DOM once.
  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;

    host.innerHTML = sceneMarkup();
    const x3dElement = host.querySelector("x3d");
    const find = (selector) => host.querySelector(selector);
    const lineParts = (part) => ({
      set: find(`[data-part="${part}"] indexedlineset`),
      coords: find(`[data-part="${part}"] coordinate`),
      shape: find(`[data-part="${part}"]`),
    });
    partsRef.current = {
      planned: lineParts("planned"),
      flown: lineParts("flown"),
      phase: find('[data-part="phase"]'),
      markers: Object.fromEntries(Object.keys(MARKER_SIZES).map((part) => [part, find(`[data-part="${part}"]`)])),
    };
    drawnRef.current = { path: undefined, positions: {} };

    loadX3dom()
      .then((x3dom) => {
        if (cancelled) return;
        x3dom.reload();
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      shutdownX3dom(x3dElement);
      partsRef.current = null;
      host.innerHTML = "";
    };
  }, []);

  // Push the bodies and paths into the scene after every render.
  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;
    const drawn = drawnRef.current;
    const setLine = ({ set, coords }, polyline) => {
      const { point, coordIndex } = lineSet([polyline]);
      setAttributes(coords, { point });
      setAttributes(set, { coordIndex });
    };

    if (path !== drawn.path) {
      drawn.path = path;
      const until = path ? path.closest.t + PLANNED_TAIL_DAYS * DAY : 0;
      setLine(parts.planned, path ? path.points.filter((p) => p.t <= until).map(toScene) : []);
    }

    const closest = path?.closest ?? null;
    const arrived = launched && closest !== null && time >= closest.t;
    const craft = launched && path ? toScene(positionAt(path.points, time)) : null;
    setLine(
      parts.flown,
      launched && path ? [...path.points.filter((p) => p.t < time).map(toScene), craft] : [],
    );

    // Bodies; null hides one.
    const positions = {
      sun: SUN,
      earth: toScene(earthAt(time)),
      mars: toScene(marsAt(time)),
      craft,
      ghost: closest && !arrived ? toScene(closest.mars) : null,
      closest: closest && !arrived ? toScene(closest.at) : null,
    };
    for (const [part, at] of Object.entries(positions)) {
      setAttributes(parts.markers[part], {
        render: String(at !== null),
        ...(at && { translation: pointString(at) }),
      });
    }
    setAttributes(parts.phase, { render: String(!launched) });
    drawn.positions = positions;
  });

  // Keep the bodies the same size on screen, however far the camera is (its own loop, so
  // it keeps up with orbiting and zooming between renders).
  useEffect(() => {
    let frame;
    const scaleMarkers = () => {
      const parts = partsRef.current;
      const camera = cameraPosition(hostRef.current);
      if (parts && camera) {
        for (const [part, at] of Object.entries(drawnRef.current.positions)) {
          if (!at) continue;
          const size = Math.hypot(at[0] - camera.x, at[1] - camera.y, at[2] - camera.z) * MARKER_SIZES[part];
          setAttributes(parts.markers[part], { scale: `${size} ${size} ${size}` });
        }
      }
      frame = requestAnimationFrame(scaleMarkers);
    };
    frame = requestAnimationFrame(scaleMarkers);
    return () => cancelAnimationFrame(frame);
  }, []);

  const resetView = () => hostRef.current?.querySelector("x3d")?.runtime?.resetView();

  return (
    <div className="transfer-view">
      <div ref={hostRef} className="transfer-view__host" />
      {status !== "ready" && (
        <p className="transfer-view__status">
          {status === "loading" ? "Loading 3D view…" : "The 3D view couldn't load."}
        </p>
      )}

      <div className="transfer-view__top">
        <p className="transfer-view__readout">
          {launched ? `Day ${Math.floor(time / DAY)}` : `Mars leads Earth by ${PHASE_ANGLE}°`}
        </p>
        <button type="button" className="transfer-view__button" disabled={status !== "ready"} onClick={resetView}>
          Reset view
        </button>
      </div>

      <ul className="transfer-view__legend">
        <li className="transfer-view__key transfer-view__key--earth">Earth</li>
        <li className="transfer-view__key transfer-view__key--mars">Mars</li>
        <li className="transfer-view__key transfer-view__key--planned">Planned path</li>
        {launched && <li className="transfer-view__key transfer-view__key--flown">Flown</li>}
        <li className="transfer-view__key transfer-view__key--ghost">Mars at closest approach</li>
      </ul>
      <p className="transfer-view__hint">Drag to orbit · scroll to zoom</p>
    </div>
  );
};

export default TransferView;
