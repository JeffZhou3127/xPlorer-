import { useEffect, useRef, useState } from "react";
import { loadX3dom, shutdownX3dom } from "../TrajectoryView/x3domLoader.js";
import { lineSet, pointString } from "../TrajectoryView/trajectoryScene.js";
import "./TransferView.css";

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

// 3D view of a transfer, drawn with X3DOM like the flight panel's trajectory view (NASA
// mission-viz style). `scene` describes what is drawn, and must stay the same object (the
// scene is built once from it): { markup() (X3D with "planned", "flown" and "phase" lines
// and a marker per markerSizes key, all by data-part), toScene({ x, y } m → scene point),
// markerSizes ({ part: share of the camera distance }), legend(launched) → [{ key, label }] }
// (styled by .transfer-view__key--<key>). See transferScene.js (Earth–Mars) and moonScene.js.
// - `path` (or null): { points: [{ t, x, y }], closest: { t } }; the planned path (amber)
//   is drawn to `tail` s past the closest approach, and once `launched`, the path flown
//   up to `time` (cyan), ending at `bodies.craft`.
// - `bodies`: { part: { x, y } (m) or null to hide it }, one per marker.
// - `phase`: polylines of { x, y } (m) marking the phase angle, shown until `launched`;
//   pass the same array while it doesn't change.
// - `readout`: the text at the top left. `aside` (optional) floats over the right edge.
// Drag to orbit, scroll or right-drag to zoom.
const TransferView = ({ scene, path, tail, launched, time, bodies, phase, readout, aside }) => {
  const hostRef = useRef(null);
  const partsRef = useRef(null);
  const drawnRef = useRef({ path: undefined, phase: undefined, positions: {} });
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const { toScene, markerSizes } = scene;

  // Build the scene and start X3DOM once.
  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;

    host.innerHTML = scene.markup();
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
      phase: lineParts("phase"),
      markers: Object.fromEntries(Object.keys(scene.markerSizes).map((part) => [part, find(`[data-part="${part}"]`)])),
    };
    drawnRef.current = { path: undefined, phase: undefined, positions: {} };

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
  }, [scene]);

  // Push the bodies and paths into the scene after every render.
  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;
    const drawn = drawnRef.current;
    const setLines = ({ set, coords }, polylines) => {
      const { point, coordIndex } = lineSet(polylines);
      setAttributes(coords, { point });
      setAttributes(set, { coordIndex });
    };

    if (path !== drawn.path) {
      drawn.path = path;
      const until = path ? path.closest.t + tail : 0;
      setLines(parts.planned, [path ? path.points.filter((p) => p.t <= until).map(toScene) : []]);
    }
    if (phase !== drawn.phase) {
      drawn.phase = phase;
      setLines(parts.phase, phase.map((polyline) => polyline.map(toScene)));
    }

    const craft = launched && bodies.craft ? bodies.craft : null;
    setLines(parts.flown, [craft ? [...path.points.filter((p) => p.t < time), craft].map(toScene) : []]);

    // Bodies; null hides one.
    const positions = Object.fromEntries(
      Object.entries(bodies).map(([part, at]) => [part, at ? toScene(at) : null]),
    );
    for (const [part, at] of Object.entries(positions)) {
      setAttributes(parts.markers[part], {
        render: String(at !== null),
        ...(at && { translation: pointString(at) }),
      });
    }
    setAttributes(parts.phase.shape, { render: String(!launched) });
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
          const size = Math.hypot(at[0] - camera.x, at[1] - camera.y, at[2] - camera.z) * markerSizes[part];
          setAttributes(parts.markers[part], { scale: `${size} ${size} ${size}` });
        }
      }
      frame = requestAnimationFrame(scaleMarkers);
    };
    frame = requestAnimationFrame(scaleMarkers);
    return () => cancelAnimationFrame(frame);
  }, [markerSizes]);

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
        <p className="transfer-view__readout">{readout}</p>
        <button type="button" className="transfer-view__button" disabled={status !== "ready"} onClick={resetView}>
          Reset view
        </button>
      </div>

      <ul className="transfer-view__legend">
        {scene.legend(launched).map(({ key, label }) => (
          <li key={key} className={`transfer-view__key transfer-view__key--${key}`}>
            {label}
          </li>
        ))}
      </ul>
      {aside && <div className="transfer-view__aside">{aside}</div>}
      <p className="transfer-view__hint">Drag to orbit · scroll to zoom</p>
    </div>
  );
};

export default TransferView;
