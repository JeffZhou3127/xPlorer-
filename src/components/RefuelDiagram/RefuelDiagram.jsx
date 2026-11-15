import RocketBody from "../RocketDiagram/RocketBody.jsx";
import { CENTER_X, GROUND_Y, layoutStages, rocketTop } from "../RocketDiagram/rocketLayout.js";
import "../RocketDiagram/RocketDiagram.css";
import "./RefuelDiagram.css";

// Side view of the docked stack, in rocket-diagram units: the rocket lies on its side with
// its nose cone (at x = 0) seated in the depot's docking collar on the right.

// Depot geometry: docking adapter, then the tank body with a solar wing above and below.
const COLLAR = { x: -8, length: 12, half: 16 };
const ADAPTER = { x: 4, length: 40, half: 20 };
const BODY = { x: ADAPTER.x + ADAPTER.length, length: 380, half: 62, dome: 26 };
const TANK_INSET = 6; // gap between the depot hull and its propellant tank
const WING = { mast: 26, length: 170, width: 120, cells: 4 };
const MARGIN = 40;

const bodyRight = BODY.x + BODY.length;
const bodyMid = BODY.x + BODY.length / 2;

// Hull of the depot: a cylinder with rounded ends.
const hullPath = ({ x, length, half, dome }) =>
  `M ${x + dome} ${-half} L ${x + length - dome} ${-half}
   Q ${x + length} ${-half} ${x + length} 0 Q ${x + length} ${half} ${x + length - dome} ${half}
   L ${x + dome} ${half} Q ${x} ${half} ${x} 0 Q ${x} ${-half} ${x + dome} ${-half} Z`;

// One solar wing, on the side `side` (−1 above, 1 below).
const Wing = ({ side }) => {
  const root = side * BODY.half;
  const panelStart = root + side * WING.mast;
  const panelEnd = panelStart + side * WING.length;
  const left = bodyMid - WING.width / 2;
  const cells = Array.from({ length: WING.cells - 1 }, (_, i) => panelStart + (side * WING.length * (i + 1)) / WING.cells);
  return (
    <g>
      <line className="rfd-line" x1={bodyMid} x2={bodyMid} y1={root} y2={panelStart} />
      <rect
        className="rfd-panel"
        x={left}
        y={Math.min(panelStart, panelEnd)}
        width={WING.width}
        height={WING.length}
      />
      {cells.map((y) => (
        <line key={y} className="rfd-panel-cell" x1={left} x2={left + WING.width} y1={y} y2={y} />
      ))}
      <line className="rfd-panel-cell" x1={bodyMid} x2={bodyMid} y1={panelStart} y2={panelEnd} />
    </g>
  );
};

// `stages`: the rocket's stages still attached (bottom first, as in the store).
// `levels`: fraction full (0–1) of each of those stages, in the same order.
// `depotLevel`: fraction left in the depot. `fillingIndex`: index in `stages` of the stage
// propellant is flowing into, or null when nothing is flowing.
const RefuelDiagram = ({ stages, levels, depotLevel, fillingIndex }) => {
  const top = rocketTop(stages, null);
  const { placed } = layoutStages(stages);
  // Rocket coordinates (nose up at (CENTER_X, top)) → this view (nose right at (0, 0)).
  const toView = `rotate(90) translate(${-CENTER_X} ${-top})`;
  const viewX = (rocketY) => top - rocketY;

  const minX = viewX(GROUND_Y) - MARGIN;
  const maxX = bodyRight + MARGIN;
  const halfH = BODY.half + WING.mast + WING.length + MARGIN;

  const tankLeft = BODY.x + TANK_INSET;
  const tankLength = BODY.length - TANK_INSET * 2;
  const tankHalf = BODY.half - TANK_INSET;
  const depotFill = tankLength * depotLevel;

  const filling = fillingIndex === null ? null : placed[fillingIndex];
  const flowEnd = filling && viewX(filling.tankTop + filling.tankH / 2);

  return (
    <svg
      className="refuel-diagram"
      viewBox={`${minX} ${-halfH} ${maxX - minX} ${halfH * 2}`}
      role="img"
      aria-label="The spacecraft docked nose first to the refueling depot"
    >
      <defs>
        <pattern id="rfd-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
        </pattern>
        <pattern id="rfd-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="url(#rfd-grid-minor)" />
          <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
        </pattern>
      </defs>
      <rect x={minX} y={-halfH} width={maxX - minX} height={halfH * 2} fill="url(#rfd-grid)" />

      {/* Depot: solar wings, hull, its propellant (draining toward the port), adapter and collar. */}
      <Wing side={-1} />
      <Wing side={1} />
      <rect
        className="rfd-fuel"
        x={tankLeft + tankLength - depotFill}
        y={-tankHalf}
        width={depotFill}
        height={tankHalf * 2}
      />
      <path className="rfd-line" d={hullPath(BODY)} />
      <rect className="rfd-line" x={ADAPTER.x} y={-ADAPTER.half} width={ADAPTER.length} height={ADAPTER.half * 2} />
      <rect className="rfd-collar" x={COLLAR.x} y={-COLLAR.half} width={COLLAR.length} height={COLLAR.half * 2} />

      {/* Rocket on its side: propellant in each tank (filling from the aft end), then the
          outline on top. */}
      <g transform={toView}>
        {placed.map((stage, i) => {
          const height = stage.tankH * levels[i];
          return (
            <rect
              key={stage.id}
              className={`rfd-fuel ${i === fillingIndex ? "rfd-fuel--filling" : ""}`}
              x={CENTER_X - stage.half}
              y={stage.tankTop + stage.tankH - height}
              width={stage.half * 2}
              height={height}
            />
          );
        })}
        <RocketBody stages={stages} srbs={null} />
      </g>

      {/* Propellant flowing from the depot tank, through the port, to the stage being filled. */}
      {flowEnd !== null && <line className="rfd-flow" x1={tankLeft + tankLength / 2} x2={flowEnd} y1={0} y2={0} />}
    </svg>
  );
};

export default RefuelDiagram;
