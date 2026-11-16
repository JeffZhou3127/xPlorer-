import { useEffect, useRef, useState } from "react";
import { predictedPath } from "../../utils/flightSim.js";
import { loadX3dom, shutdownX3dom } from "./x3domLoader.js";
import { EARTH_SCENE, MARKER_SIZES, lineSet, pointString } from "./trajectoryScene.js";
import "./TrajectoryView.css";

// How often the predicted path is redrawn (ms of real time); it changes smoothly, so
// there's no need to rebuild a few hundred points every frame.
const PREDICTION_REFRESH = 150;

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

// Index of the predicted path's highest (or lowest) point ahead, or null when the rocket
// is already there or past it.
const apsisIndex = (path, which) => {
  const sign = which === "lowest" ? -1 : 1;
  let best = 0;
  path.forEach((p, i) => {
    if (sign * Math.hypot(p.x, p.y) > sign * Math.hypot(path[best].x, path[best].y)) best = i;
  });
  return path.length > 1 && best > 0 ? best : null;
};

// 3D view of the flight around a planet, drawn with X3DOM in the style of NASA's
// mission-viz demos. `scene` (EARTH_SCENE by default; see trajectoryScene.js) supplies the
// planet, its cameras and legend: around Earth, the planet with a latitude/longitude
// grid and the Kármán line (100 km) in the flight plane. On top: the target orbit as a
// dashed ghost (while `showTarget`), the path flown so far (cyan), the path the rocket
// would coast along with the engines off and no air (amber) with its high (or low) point
// ahead, and the rocket itself.
// Drag to orbit, scroll or right-drag to zoom; the buttons jump to the scene's cameras.
// The scene is built once as markup and then updated through the DOM, which X3DOM watches.
const TrajectoryView = ({ flight, showTarget = true, aside, scene = EARTH_SCENE }) => {
  const hostRef = useRef(null);
  const partsRef = useRef(null);
  const drawnRef = useRef({ track: null, predictedAt: 0, apsis: null, rocket: null });
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [view, setView] = useState(scene.views[0].id);
  const { toScene } = scene;

  // Build the scene and start X3DOM once.
  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;

    host.innerHTML = scene.markup();
    const x3dElement = host.querySelector("x3d");
    const find = (selector) => host.querySelector(selector);
    partsRef.current = {
      flown: find('[data-part="flown"] indexedlineset'),
      flownCoords: find('[data-part="flown"] coordinate'),
      predicted: find('[data-part="predicted"] indexedlineset'),
      predictedCoords: find('[data-part="predicted"] coordinate'),
      rocket: find('[data-part="rocket"]'),
      apsis: find('[data-part="apsis"]'),
      target: find('[data-part="target"]'),
      ...Object.fromEntries(Object.keys(scene.landmarks).map((part) => [part, find(`[data-part="${part}"]`)])),
      views: Object.fromEntries(scene.views.map(({ id }) => [id, find(`[data-view="${id}"]`)])),
    };
    drawnRef.current = { track: null, predictedAt: 0, apsis: null, rocket: null };

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

  // Push the live flight into the scene after every render.
  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) return;
    const drawn = drawnRef.current;
    const position = toScene(flight);

    setAttributes(parts.rocket, { translation: pointString(position) });
    setAttributes(parts.target, { render: String(showTarget) });

    // The flown path: the recorded track plus the rocket's current position. A flight
    // copies its track array whenever it adds a point (and may drop old ones).
    if (flight.track !== drawn.track) {
      drawn.track = flight.track;
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

      const index = apsisIndex(path, scene.apsis);
      drawn.apsis = index === null ? null : toScene(path[index]);
      setAttributes(parts.apsis, {
        render: String(drawn.apsis !== null),
        ...(drawn.apsis && { translation: pointString(drawn.apsis) }),
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
        const { rocket, apsis } = drawnRef.current;
        for (const [part, at] of Object.entries({ rocket, apsis, ...scene.landmarks })) {
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
  }, [scene]);

  const jumpTo = (id) => {
    const parts = partsRef.current;
    if (!parts) return;
    const viewpoint = parts.views[id];
    setAttributes(viewpoint, scene.views.find((v) => v.id === id).camera(toScene(flight)));
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
          {scene.views.map(({ id, label }) => (
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
          {scene.legend(showTarget).map(({ key, label }) => (
            <li key={key} className={`trajectory-view__key trajectory-view__key--${key}`}>
              {label}
            </li>
          ))}
        </ul>
        <p className="trajectory-view__hint">Drag to orbit · scroll to zoom</p>
      </div>
      {aside}
    </div>
  );
};

export default TrajectoryView;
