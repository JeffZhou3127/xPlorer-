import { useEffect, useState } from "react";
import {
  EARTH_RADIUS,
  START_RADIUS,
  STILL_SECONDS,
  orbitRaiseFrame,
} from "../../utils/orbitRaise.js";
import "../RocketDiagram/RocketDiagram.css";
import "./OrbitRaiseView.css";

const CAPTIONS = {
  coast: "Coasting · 150 × 150 km",
  burn: "Prograde burn",
  raised: "Apogee raised",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Blueprint animation of an apogee-raising burn, filling the right pane like ReentryView:
// a CubeSat circles Earth, burns prograde, and its orbit stretches into an ellipse whose
// high point is opposite the burn. Loops; with reduced motion it shows one frame just
// after the burn. Shares the blueprint line styles (.rd-*) from RocketDiagram.css.
const OrbitRaiseView = () => {
  const [seconds, setSeconds] = useState(() => (prefersReducedMotion() ? STILL_SECONDS : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      setSeconds((now - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const { phase, x, y, heading, orbit, apogee } = orbitRaiseFrame(seconds);
  const burning = phase === "burn";
  const raised = phase !== "coast";

  return (
    <div className="orbit-raise">
      <svg
        className="orbit-raise__svg"
        viewBox="-180 -115 270 230"
        role="img"
        aria-label="A CubeSat in a circular orbit burns in its direction of travel, stretching the orbit into an ellipse whose highest point is on the opposite side of Earth."
      >
        <defs>
          <pattern id="orbit-raise-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
          </pattern>
          <pattern id="orbit-raise-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#orbit-raise-grid-minor)" />
            <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
          </pattern>
        </defs>

        {/* Oversized so the grid also covers the letterbox around the viewBox. */}
        <rect x="-2000" y="-2000" width="4000" height="4000" fill="url(#orbit-raise-grid)" />

        {/* Apse line through Earth's centre. */}
        <line className="rd-center" x1={-170} y1={0} x2={START_RADIUS + 22} y2={0} />
        <line className="rd-center" x1={0} y1={-EARTH_RADIUS - 10} x2={0} y2={EARTH_RADIUS + 10} />

        <circle className="orbit-raise__earth" r={EARTH_RADIUS} />
        <text className="orbit-raise__label orbit-raise__label--earth" x={0} y={EARTH_RADIUS - 10}>
          Earth
        </text>

        {/* Starting orbit, dashed once the orbit has been raised. */}
        <circle className={raised ? "rd-hidden" : "orbit-raise__orbit"} r={START_RADIUS} />
        {raised && <ellipse className="orbit-raise__orbit" cx={orbit.cx} cy={0} rx={orbit.rx} ry={orbit.ry} />}

        {/* Burn point: it stays at the same height and becomes the perigee. */}
        <g className="orbit-raise__burn-point">
          <circle cx={START_RADIUS} cy={0} r={2} />
          <text className="orbit-raise__label orbit-raise__label--start" x={START_RADIUS + 5} y={10}>
            {raised ? "Perigee" : "Burn point"}
          </text>
        </g>

        {raised && (
          <g className="orbit-raise__apogee">
            <circle cx={-apogee} cy={0} r={2} />
            <text className="orbit-raise__label" x={-apogee} y={-6}>
              Apogee
            </text>
          </g>
        )}

        <g transform={`translate(${x} ${y}) rotate(${heading})`}>
          {burning && <path className="orbit-raise__plume" d="M -5 -2.5 L -18 0 L -5 2.5 Z" />}
          <g className="orbit-raise__velocity">
            <line x1={7} y1={0} x2={22} y2={0} />
            <path d="M 26 0 L 21 -2.5 L 21 2.5 Z" />
          </g>
          {/* CubeSat: body with a solar panel either side. */}
          <rect className="rd-engine" x={-2.5} y={-10} width={5} height={5} />
          <rect className="rd-engine" x={-2.5} y={5} width={5} height={5} />
          <rect className="rd-engine" x={-4} y={-4} width={8} height={8} />
        </g>
      </svg>

      <p className="orbit-raise__readout" aria-live="polite">
        {CAPTIONS[phase]}
      </p>
      <ul className="orbit-raise__legend">
        <li>Arrow: direction of travel · flame: engine burning</li>
        <li>Dashed circle: the starting orbit</li>
        <li>Not to scale</li>
      </ul>
    </div>
  );
};

export default OrbitRaiseView;
