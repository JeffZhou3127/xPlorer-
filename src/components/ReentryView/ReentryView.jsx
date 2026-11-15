import "../RocketDiagram/RocketDiagram.css";
import "./ReentryView.css";

// Heat shield arcs: a circle around (SHIELD_CX, 0) of radius SHIELD_R, swept between these
// angles (degrees, SVG's y-down sense). The upper part (y < 0) faces into the flow when
// the capsule trims for lift-up, so it is the windward shoulder.
const SHIELD_CX = 40;
const SHIELD_R = 46;
const SHIELD_ARCS = { windward: [193.3, 220], centre: [166.7, 193.3], leeward: [140, 166.7] };

const polar = (deg) => {
  const a = (deg * Math.PI) / 180;
  return [SHIELD_CX + SHIELD_R * Math.cos(a), SHIELD_R * Math.sin(a)];
};
const arcPath = ([from, to]) => {
  const [x0, y0] = polar(from);
  const [x1, y1] = polar(to);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${SHIELD_R} ${SHIELD_R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
// Where the shield meets the cone (x, and ±y).
const [EDGE_X, EDGE_Y] = (([x, y]) => [x, Math.abs(y)])(polar(220));
const CONE = `M ${EDGE_X.toFixed(2)} ${(-EDGE_Y).toFixed(2)} L 62 -9 L 62 9 L ${EDGE_X.toFixed(2)} ${EDGE_Y.toFixed(2)} Z`;
// The pressure vessel inside the cone (hidden line).
const INNER = `M ${(EDGE_X + 7).toFixed(2)} ${(-EDGE_Y + 5).toFixed(2)} L 56 -5 L 56 5 L ${(EDGE_X + 7).toFixed(2)} ${(EDGE_Y - 5).toFixed(2)}`;

// Heat shield colour for a temperature `fraction` of the burn-through limit: the
// blueprint's cyan while cool, then yellow, orange and red at the limit.
const STOPS = [
  [0, [0, 229, 255]],
  [0.5, [255, 211, 77]],
  [0.8, [255, 140, 46]],
  [1, [255, 59, 48]],
];
const heatColor = (fraction) => {
  const f = Math.min(1, Math.max(0, fraction));
  const i = Math.max(1, STOPS.findIndex(([at]) => at >= f));
  const [a, ca] = STOPS[i - 1];
  const [b, cb] = STOPS[i];
  const u = (f - a) / (b - a || 1);
  return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * u)).join(",")})`;
};

// Streamlines of the hot flow around the capsule and into its wake (capsule frame: the
// flow comes from -x), as offsets from the axis.
const STREAMS = [-1, 1].flatMap((side) => [side * 40, side * 54]);

const STAGE_TEXT = {
  separation: "Service module jettison",
  ready: "Capsule at the entry interface",
  entry: "Entry",
};

// The reentry seen from beside the capsule, drawn as a blueprint (grid, white outlines,
// shared `.rd-*` line styles). `phase`: "separation" (the service module is pushed off and
// drifts away: 0.8 s, then 4 s, see M1S14), "ready" or "entry". `altitude` (m) sets how
// much of the Earth fills the view, `pathAngle` and `aoa` (degrees) the capsule's attitude
// (heat shield into the flow, tilted by the angle of attack), `temps` (°C by heat shield
// section) the shield's colours against `shieldLimit`, and `glow` (0–1) the shock wave and
// hot wake around it. `aside` (optional) floats over the right edge.
const ReentryView = ({ phase, altitude, pathAngle, aoa, temps, shieldLimit, glow, readout, aside }) => {
  const horizon = 120 + 130 * Math.min(1, Math.max(0, altitude / 120e3));
  // The heat shield faces the flow, which comes from the left along the flight path.
  const attitude = pathAngle - aoa;
  const shaking = phase === "entry" && glow > 0.35;

  return (
    <div className="reentry-view">
      <svg className="reentry-view__svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img"
        aria-label={`Capsule ${STAGE_TEXT[phase].toLowerCase()}, angle of attack ${aoa}°`}>
        <defs>
          <pattern id="reentry-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
          </pattern>
          <pattern id="reentry-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#reentry-grid-minor)" />
            <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
          </pattern>
        </defs>

        <rect width="400" height="300" fill="url(#reentry-grid)" />

        {/* The Earth below: its limb, and the top of the atmosphere (dashed). */}
        <circle cx="200" cy={horizon + 1400} r="1414" className="rd-hidden" />
        <circle cx="200" cy={horizon + 1400} r="1400" className="reentry-view__earth" />

        <g transform={`translate(200 140) rotate(${attitude})`}>
          {/* Shock wave ahead of the heat shield, and the hot flow streaming past. */}
          <g className="reentry-view__plasma" style={{ opacity: glow }}>
            <path d="M 4 -64 Q -42 0 4 64" className="reentry-view__shock reentry-view__shock--outer" />
            <path d="M -2 -50 Q -32 0 -2 50" className="reentry-view__shock" />
            {STREAMS.map((y) => (
              <path
                key={y}
                d={`M -40 ${y * 0.9} Q 4 ${y * 1.05} 60 ${y * 0.75} L 220 ${y * 1.3}`}
                className="reentry-view__stream"
              />
            ))}
          </g>

          <g className={shaking ? "reentry-view__craft reentry-view__craft--shake" : "reentry-view__craft"}>
            {/* Service module behind the heat shield until jettisoned. */}
            {phase === "separation" && (
              <g className="reentry-view__sm">
                <rect x="-66" y="-30" width="58" height="60" className="rd-engine" />
                <path d="M -66 -14 L -84 -22 L -84 22 L -66 14 Z" className="rd-engine" />
                <rect x="-60" y="-22" width="46" height="44" rx="8" className="rd-hidden" />
                <g className="reentry-view__puffs">
                  <circle cx="-38" cy="-36" r="5" />
                  <circle cx="-38" cy="36" r="5" />
                </g>
              </g>
            )}

            {/* Command module: cone (with its pressure vessel), docking tunnel, window,
                then the heat shield in three sections. */}
            <path d={CONE} className="rd-engine" />
            <path d={INNER} className="rd-hidden" />
            <path d="M 62 -9 L 70 -9 L 70 9 L 62 9" className="rd-outline" />
            <rect x="24" y="-13" width="8" height="6" className="rd-outline" />
            <line x1="-16" y1="0" x2="80" y2="0" className="rd-center" />
            {Object.entries(SHIELD_ARCS).map(([key, arc]) => (
              <path
                key={key}
                d={arcPath(arc)}
                className="reentry-view__shield"
                style={{ stroke: heatColor(temps[key] / shieldLimit) }}
              />
            ))}
          </g>
        </g>

        {/* Direction of travel. */}
        {phase !== "separation" && (
          <g className="reentry-view__velocity" transform={`translate(200 140) rotate(${pathAngle})`}>
            <line x1="-80" y1="0" x2="-125" y2="0" />
            <path d="M -125 0 L -117 -4 L -117 4 Z" />
          </g>
        )}
      </svg>

      <div className="reentry-view__top">
        <p className="reentry-view__readout">{STAGE_TEXT[phase]}</p>
        {readout && <p className="reentry-view__readout reentry-view__readout--right">{readout}</p>}
      </div>
      <ul className="reentry-view__legend">
        <li>Arrow: direction of travel · dashed arc: top of the atmosphere</li>
        <li>Heat shield: windward shoulder (top), centre, leeward shoulder</li>
        <li>Shield colour: cyan when cool, red at burn-through</li>
      </ul>
      {aside && <div className="reentry-view__aside">{aside}</div>}
    </div>
  );
};

export default ReentryView;
