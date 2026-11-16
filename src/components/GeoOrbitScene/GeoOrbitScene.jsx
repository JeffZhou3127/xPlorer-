import "../RocketDiagram/RocketDiagram.css";
import "./GeoOrbitScene.css";

// Centre of Earth, its radius and the orbit's, in the 400 × 260 scene (not to scale).
const CX = 200;
const CY = 208;
const EARTH_R = 20;
const ORBIT_R = 38;

// Meridians seen from above the north pole, every 30°.
const MERIDIANS = Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 6);

// The CubeSat mission's success animation, a blueprint like the other end screens (for
// MissionSuccess's `scene`): seen from above the north pole, the CubeSat circles Earth
// in geostationary orbit while Earth turns at the same rate, so the CubeSat stays over
// the same marked spot on the equator.
const GeoOrbitScene = () => (
  <svg className="geo-orbit" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice">
    <defs>
      <pattern id="geo-orbit-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
      </pattern>
      <pattern id="geo-orbit-grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <rect width="50" height="50" fill="url(#geo-orbit-grid-minor)" />
        <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
      </pattern>
    </defs>
    <rect x="-200" y="-100" width="800" height="400" fill="url(#geo-orbit-grid)" />

    <line className="rd-center" x1={CX - ORBIT_R - 12} y1={CY} x2={CX + ORBIT_R + 12} y2={CY} />
    <line className="rd-center" x1={CX} y1={CY - ORBIT_R - 12} x2={CX} y2={CY + ORBIT_R + 12} />
    <circle className="geo-orbit__orbit" cx={CX} cy={CY} r={ORBIT_R} />
    <text className="geo-orbit__label" x={CX + ORBIT_R + 6} y={CY - 4}>
      Geostationary
    </text>
    <text className="geo-orbit__label" x={CX + ORBIT_R + 6} y={CY + 6}>
      35,786 km
    </text>

    {/* Earth, the spot under the CubeSat and the CubeSat turn together. */}
    <g className="geo-orbit__spin">
      <circle className="geo-orbit__earth" cx={CX} cy={CY} r={EARTH_R} />
      <circle className="rd-hidden" cx={CX} cy={CY} r={EARTH_R * 0.5} />
      {MERIDIANS.map((angle) => (
        <line
          key={angle}
          className="rd-hidden"
          x1={CX - EARTH_R * Math.cos(angle)}
          y1={CY - EARTH_R * Math.sin(angle)}
          x2={CX + EARTH_R * Math.cos(angle)}
          y2={CY + EARTH_R * Math.sin(angle)}
        />
      ))}
      <line className="geo-orbit__tether" x1={CX} y1={CY - EARTH_R} x2={CX} y2={CY - ORBIT_R + 4} />
      <circle className="geo-orbit__spot" cx={CX} cy={CY - EARTH_R} r={1.6} />

      {/* CubeSat at the top of its orbit, moving left (anticlockwise), panels out. */}
      <g transform={`translate(${CX} ${CY - ORBIT_R})`}>
        <rect className="rd-engine" x={-1.6} y={-6.5} width={3.2} height={3.4} />
        <rect className="rd-engine" x={-1.6} y={3.1} width={3.2} height={3.4} />
        <rect className="rd-engine" x={-2.6} y={-2.6} width={5.2} height={5.2} />
      </g>
    </g>
  </svg>
);

export default GeoOrbitScene;
