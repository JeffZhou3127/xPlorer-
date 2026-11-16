import MissionSuccess from "../MissionSuccess/MissionSuccess.jsx";
import "../RocketDiagram/RocketDiagram.css";
import "./Splashdown.css";

// Waves on the sea (dashed lines that drift), as [y, animation delay (s)].
const WAVES = [
  [212, 0],
  [226, -1],
  [242, -2],
];

// The splashdown animation (decorative).
const SplashdownScene = () => (
  <svg className="splashdown__scene" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice">
    <defs>
      <pattern id="splashdown-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
      </pattern>
      <pattern id="splashdown-grid" width="50" height="50" patternUnits="userSpaceOnUse">
        <rect width="50" height="50" fill="url(#splashdown-grid-minor)" />
        <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
      </pattern>
    </defs>
    <rect width="400" height="260" fill="url(#splashdown-grid)" />

    {/* Sea level, and waves below it. */}
    <rect x="-200" y="200" width="800" height="60" className="splashdown__sea" />
    <line x1="-200" y1="200" x2="600" y2="200" className="rd-outline" />
    {WAVES.map(([y, delay]) => (
      <line key={y} x1="-200" y1={y} x2="600" y2={y} className="splashdown__wave" style={{ animationDelay: `${delay}s` }} />
    ))}

    <g className="splashdown__descent">
      <g className="splashdown__chutes">
        {[-26, 0, 26].map((dx) => (
          <g key={dx} transform={`translate(${200 + dx} 0)`}>
            <path d="M -16 0 Q 0 -18 16 0 Z" className="rd-engine" />
            <path d="M -8 -0.5 Q -6 -10 0 -9 M 8 -0.5 Q 6 -10 0 -9 M 0 -9 L 0 0" className="rd-hidden" />
            <line x1="-16" y1="0" x2={-dx * 0.9} y2="44" className="splashdown__line" />
            <line x1="16" y1="0" x2={-dx * 0.9} y2="44" className="splashdown__line" />
          </g>
        ))}
      </g>
      {/* The capsule, heat shield down, its shield edge in cyan. */}
      <path d="M 192 44 L 208 44 L 216 60 L 184 60 Z" className="rd-engine" />
      <rect x="196" y="48" width="4" height="3" className="rd-outline" />
      <line x1="183" y1="60.5" x2="217" y2="60.5" className="splashdown__shield" />
      <line x1="200" y1="38" x2="200" y2="66" className="rd-center" />
    </g>

    <g className="splashdown__splash">
      <ellipse cx="200" cy="203" rx="24" ry="4" />
      <ellipse cx="200" cy="203" rx="40" ry="6" />
    </g>
  </svg>
);

// The end of the mission, drawn as a blueprint like the other views: the capsule drifts
// down under its three main parachutes and splashes into the ocean, then the
// MissionSuccess panel with `summary` (see MissionSuccess). `from` names where the crew
// is home from ("Mars" or "the Moon").
const Splashdown = ({ summary, from = "Mars" }) => (
  <MissionSuccess
    text={`Splashdown. The crew is home from ${from}, and the recovery ship is on its way.`}
    summary={summary}
    scene={<SplashdownScene />}
  />
);

export default Splashdown;
