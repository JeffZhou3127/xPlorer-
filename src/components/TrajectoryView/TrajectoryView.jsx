import { useEffect, useRef, useState } from "react";
import { predictedPath } from "../../utils/flightSim.js";
import { ORBIT_ALTITUDE_KM } from "../../utils/rocketPhysics.js";
import { loadX3dom, shutdownX3dom } from "./x3domLoader.js";
import {
  EARTH_CAMERA,
  LAUNCH_CAMERA,
  MARKER_SIZES,
  PAD,
  lineSet,
  pointString,
  rocketCamera,
  sceneMarkup,
  toScene,
} from "./trajectoryScene.js";
import "./TrajectoryView.css";

// How often the predicted path is redrawn (ms of real time); it changes smoothly, so
// there's no need to rebuild a few hundred points every frame.
const PREDICTION_REFRESH = 150;

const VIEWS = [
  { id: "launch", label: "Launch site" },
  { id: "rocket", label: "Rocket" },
  { id: "earth", label: "Whole Earth" },
];

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

// 3D view of the flight around Earth, drawn with X3DOM in the style of NASA's
// mission-viz demos: Earth with a latitude/longitude grid, the Kármán line (100 km) in
// the flight plane, the target orbit as a dashed ghost ring (while `showTarget`), the path flown so far (cyan), the path the rocket would coast along
// with the engines off and no air (amber) and its highest point, and the rocket itself.
// Drag to orbit, scroll or right-drag to zoom; the buttons jump to preset cameras.
// The scene is built once as markup and then updated through the DOM, which X3DOM watches.
const TrajectoryView = ({ flight, showTarget = true, aside }) => {
  const hostRef = useRef(null);
  const partsRef = useRef(null);
  const drawnRef = useRef({ trackLength: -1, predictedAt: 0, apogee: null, rocket: null });
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [view, setView] = useState("launch");

  // Build the scene and start X3DOM once.
  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;

    host.innerHTML = sceneMarkup();
    const x3dElement = host.querySelector("x3d");
    const find = (selector) => host.querySelector(selector);
    partsRef.current = {
      flown: find('[data-part="flown"] indexedlineset'),
      flownCoords: find('[data-part="flown"] coordinate'),
      predicted: find('[data-part="predicted"] indexedlineset'),
      predictedCoords: find('[data-part="predicted"] coordinate'),
      rocket: find('[data-part="rocket"]'),
      apogee: find('[data-part="apogee"]'),
      target: find('[data-part="target"]'),
      views: Object.fromEntries(VIEWS.map(({ id }) => [id, find(`[data-view="${id}"]`)])),
    };
    drawnRef.current = { trackLength: -1, predictedAt: 0, apogee: null, rocket: null };

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

  // Push the live flight into the scene after every render.
  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;
    const drawn = drawnRef.current;
    const position = toScene(flight);

    setAttributes(parts.rocket, { translation: pointString(position) });
    setAttributes(parts.target, { render: String(showTarget) });

    // The flown path: the recorded track plus the rocket's current position.
    if (flight.track.length !== drawn.trackLength) {
      drawn.trackLength = flight.track.length;
      const { point, coordIndex } = lineSet([[...flight.track.map(toScene), position]]);
      setAttributes(parts.flownCoords, { point });
      setAttributes(parts.flown, { coordIndex });
    }

    const now = performance.now();
    if (now - drawn.predictedAt >= PREDICTION_REFRESH) {
      drawn.predictedAt = now;
      const path = predictedPath(flight);
      const { point, coordIndex } = lineSet([path.map(toScene)]);
      setAttributes(parts.predictedCoords, { point });
      setAttributes(parts.predicted, { coordIndex });

      // Highest point ahead, unless the rocket is already past it.
      let highest = 0;
      path.forEach((p, i) => {
        if (Math.hypot(p.x, p.y) > Math.hypot(path[highest].x, path[highest].y)) highest = i;
      });
      drawn.apogee = path.length > 1 && highest > 0 ? toScene(path[highest]) : null;
      setAttributes(parts.apogee, {
        render: String(drawn.apogee !== null),
        ...(drawn.apogee && { translation: pointString(drawn.apogee) }),
      });
    }

    drawn.rocket = position;
  });

  // Keep the markers the same size on screen, however far the camera is. This runs on
  // its own animation loop so it keeps up with orbiting and zooming while paused, when
  // the flight (and so this component) stops re-rendering.
  useEffect(() => {
    let frame;
    const scaleMarkers = () => {
      const parts = partsRef.current;
      const camera = cameraPosition(hostRef.current);
      if (parts && camera) {
        const { rocket, apogee } = drawnRef.current;
        for (const [part, at] of Object.entries({ rocket, pad: PAD, apogee })) {
          if (!at) continue;
          const size =
            Math.hypot(at[0] - camera.x, at[1] - camera.y, at[2] - camera.z) * MARKER_SIZES[part];
          setAttributes(parts[part], { scale: `${size} ${size} ${size}` });
        }
      }
      frame = requestAnimationFrame(scaleMarkers);
    };
    frame = requestAnimationFrame(scaleMarkers);
    return () => cancelAnimationFrame(frame);
  }, []);

  const jumpTo = (id) => {
    const parts = partsRef.current;
    if (!parts) return;
    const camera = { launch: LAUNCH_CAMERA, earth: EARTH_CAMERA }[id] ?? rocketCamera(toScene(flight));
    const viewpoint = parts.views[id];
    setAttributes(viewpoint, camera);
    setAttributes(viewpoint, { set_bind: "true" });
    // Re-binding the current viewpoint is a no-op, so also undo any manual navigation.
    hostRef.current.querySelector("x3d")?.runtime?.resetView();
    setView(id);
  };

  return (
    <div className="trajectory-view">
      <div className="trajectory-view__stage">
        <div ref={hostRef} className="trajectory-view__host" />
        {status !== "ready" && (
          <p className="trajectory-view__status">
            {status === "loading" ? "Loading 3D view…" : "The 3D view couldn't load."}
          </p>
        )}

        <div className="trajectory-view__views" role="group" aria-label="Camera">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="trajectory-view__view"
              aria-pressed={view === id}
              disabled={status !== "ready"}
              onClick={() => jumpTo(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="trajectory-view__legend">
          <li className="trajectory-view__key trajectory-view__key--flown">Flown</li>
          <li className="trajectory-view__key trajectory-view__key--predicted">Coast path (engines off, no air)</li>
          {showTarget && (
            <li className="trajectory-view__key trajectory-view__key--target">Target orbit ({ORBIT_ALTITUDE_KM} km)</li>
          )}
          <li className="trajectory-view__key trajectory-view__key--karman">Kármán line (100 km)</li>
        </ul>
        <p className="trajectory-view__hint">Drag to orbit · scroll to zoom</p>
      </div>
      {aside}
    </div>
  );
};

export default TrajectoryView;
