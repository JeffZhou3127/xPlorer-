import { useEffect, useState } from "react";
import { EARTH_RADIUS, RAISED_APOGEE, START_RADIUS } from "../../utils/orbitRaise.js";
import {
  FINAL_RADIUS,
  RAISED_ORBIT,
  STILL_SECONDS,
  orbitCircularizeFrame,
} from "../../utils/orbitCircularize.js";
import "../RocketDiagram/RocketDiagram.css";
import "../OrbitRaiseView/OrbitRaiseView.css";
import "./OrbitCircularizeView.css";

const CAPTIONS = {
  coast: "Coasting to apogee · 150 × 35,786 km",
  burn: "Prograde burn at apogee",
  circular: "Orbit circularised · 35,786 km",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Blueprint animation continuing OrbitRaiseView (and sharing its styles): the CubeSat
// coasts from perigee up to apogee on the raised ellipse, burns prograde there, and the
// perigee on the far side rises until the orbit is a circle at the apogee's height.
// Loops; with reduced motion it shows one frame just after the burn.
const OrbitCircularizeView = () => {
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

  const { phase, x, y, heading, orbit, perigee } = orbitCircularizeFrame(seconds);
  const burning = phase === "burn";
  const changed = phase !== "coast";
  const circular = phase === "circular";

  return (
    <div className="orbit-raise orbit-circularize">
      <svg
        className="orbit-raise__svg"
        viewBox="-190 -170 380 340"
        role="img"
        aria-label="A CubeSat on a long elliptical orbit coasts up to its highest point and burns in its direction of travel there, raising the low side of the orbit until the orbit is a circle at the height of the apogee."
      >
        <defs>
          <pattern id="orbit-circ-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
          </pattern>
          <pattern id="orbit-circ-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#orbit-circ-grid-minor)" />
            <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
          </pattern>
        </defs>

        {/* Oversized so the grid also covers the letterbox around the viewBox. */}
        <rect x="-2000" y="-2000" width="4000" height="4000" fill="url(#orbit-circ-grid)" />

        {/* Apse line through Earth's centre. */}
        <line className="rd-center" x1={-RAISED_APOGEE - 20} y1={0} x2={FINAL_RADIUS + 20} y2={0} />
        <line className="rd-center" x1={0} y1={-FINAL_RADIUS - 10} x2={0} y2={FINAL_RADIUS + 10} />

        <circle className="orbit-raise__earth" r={EARTH_RADIUS} />
        <text className="orbit-raise__label orbit-raise__label--earth" x={0} y={EARTH_RADIUS - 10}>
          Earth
        </text>

        {/* Part 1's raised ellipse, dashed once the burn has changed the orbit. */}
        <ellipse
          className={changed ? "rd-hidden" : "orbit-raise__orbit"}
          cx={RAISED_ORBIT.cx}
          cy={0}
          rx={RAISED_ORBIT.rx}
          ry={RAISED_ORBIT.ry}
        />
        {changed && <ellipse className="orbit-raise__orbit" cx={orbit.cx} cy={0} rx={orbit.rx} ry={orbit.ry} />}

        {/* Apogee: where the burn happens; it stays at the same height. */}
        <g className="orbit-raise__burn-point">
          <circle cx={-RAISED_APOGEE} cy={0} r={2.5} />
          <text className="orbit-raise__label" x={-RAISED_APOGEE} y={-8}>
            {circular ? "Burn point" : "Apogee · burn point"}
          </text>
        </g>

        {/* The low side: rises during the burn until it matches the apogee. */}
        <g className="orbit-raise__apogee">
          {changed && perigee > START_RADIUS + 1 && (
            <circle className="orbit-circularize__old" cx={START_RADIUS} cy={0} r={2} />
          )}
          <circle cx={perigee} cy={0} r={2.5} />
          <text className="orbit-raise__label" x={perigee} y={13}>
            {circular ? "Same height" : burning ? "Perigee rising" : "Perigee"}
          </text>
        </g>

        <g transform={`translate(${x} ${y}) rotate(${heading}) scale(1.3)`}>
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
        <li>Dashed ellipse: the raised orbit from Part 1</li>
        <li>Not to scale</li>
      </ul>
    </div>
  );
};

export default OrbitCircularizeView;
