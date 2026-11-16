import { Flame } from "../RocketDiagram/RocketBody.jsx";
import {
  BODY_HALF_HEIGHT as BH,
  BODY_HALF_WIDTH as BW,
  CUBESAT_CENTER,
  FLAME_LENGTH,
  NOZZLE_EXIT_HALF,
  NOZZLE_LENGTH,
  NOZZLE_THROAT_HALF,
  PANEL_GAP,
  PANEL_HALF_HEIGHT as PH,
  PANEL_LENGTH,
} from "./cubesatLayout.js";
import "../RocketDiagram/RocketDiagram.css";

const RAIL = 3; // corner rail width

// One solar panel on the `side` (−1 left, +1 right), in two hinged halves with cells.
const Panel = ({ side, cx, cy }) => {
  const inner = cx + side * (BW + PANEL_GAP);
  const outer = inner + side * PANEL_LENGTH;
  const mid = (inner + outer) / 2;
  const x = Math.min(inner, outer);
  const cells = [0.25, 0.75].map((t) => inner + side * PANEL_LENGTH * t);
  return (
    <g>
      <line className="rd-outline" x1={cx + side * BW} x2={inner} y1={cy} y2={cy} />
      <rect className="rd-engine" x={x} y={cy - PH} width={PANEL_LENGTH} height={PH * 2} />
      <line className="rd-outline" x1={mid} x2={mid} y1={cy - PH} y2={cy + PH} />
      {cells.map((cellX) => (
        <line key={cellX} className="rd-hidden" x1={cellX} x2={cellX} y1={cy - PH} y2={cy + PH} />
      ))}
      <line className="rd-hidden" x1={inner} x2={outer} y1={cy} y2={cy} />
    </g>
  );
};

// The CubeSat in blueprint lines, nose up, centred on CUBESAT_CENTER (see
// cubesatLayout.js). `throttle` (0–1) shows the thruster's plume.
const CubesatBody = ({ throttle = 0 }) => {
  const { x: cx, y: cy } = CUBESAT_CENTER;
  const bottom = cy + BH;
  const exit = bottom + NOZZLE_LENGTH;
  return (
    <g>
      {throttle > 0 && (
        <Flame cx={cx} top={exit} half={NOZZLE_EXIT_HALF} length={FLAME_LENGTH * throttle} kind="hypergolic" />
      )}
      <line className="rd-center" x1={cx} x2={cx} y1={cy - BH - 12} y2={exit + 6} />
      <Panel side={-1} cx={cx} cy={cy} />
      <Panel side={1} cx={cx} cy={cy} />

      {/* Thruster bell */}
      <path
        className="rd-engine"
        d={`M ${cx - NOZZLE_THROAT_HALF} ${bottom} L ${cx - NOZZLE_EXIT_HALF} ${exit}
            L ${cx + NOZZLE_EXIT_HALF} ${exit} L ${cx + NOZZLE_THROAT_HALF} ${bottom} Z`}
      />

      {/* Body: 2 × 3 units with rails at the corners */}
      <rect className="rd-engine" x={cx - BW} y={cy - BH} width={BW * 2} height={BH * 2} />
      {[-1, 1].map((side) => (
        <line
          key={side}
          className="rd-outline"
          x1={cx + side * (BW - RAIL)}
          x2={cx + side * (BW - RAIL)}
          y1={cy - BH}
          y2={cy + BH}
        />
      ))}
      {[-1 / 3, 1 / 3].map((t) => (
        <line key={t} className="rd-hidden" x1={cx - BW} x2={cx + BW} y1={cy + t * BH * 2} y2={cy + t * BH * 2} />
      ))}
      <line className="rd-hidden" x1={cx} x2={cx} y1={cy - BH} y2={cy + BH} />

      {/* Antenna on the nose */}
      <line className="rd-outline" x1={cx} x2={cx} y1={cy - BH} y2={cy - BH - 8} />
      <circle className="rd-engine" cx={cx} cy={cy - BH - 9.5} r={1.8} />
    </g>
  );
};

export default CubesatBody;
