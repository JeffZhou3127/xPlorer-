import { PROPELLANTS } from "../../utils/rocketPhysics.js";
import "./RocketDiagram.css";

// Minimal blueprint-style rocket outline. All units are SVG user units.
const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 900;
const GROUND_Y = 860;
const CX = 150; // rocket centerline

// Body widths. The top stage matches the spacecraft fairing; lower stages are wider.
const NARROW_HALF = 30;
const WIDE_HALF = 42;

// Tank length is propellant volume (mass ÷ density) divided by cross-section area,
// so tank size is proportional to volume: low-density hydrogen needs much longer tanks
// than kerosene for the same mass, and a narrow tank grows faster than a wide one.
const UNITS_PER_M3_WIDE = 0.74; // tank length per m³ of propellant in a wide stage
const tankHeight = (fuel, propellant, half) =>
  (fuel / PROPELLANTS[propellant].density) * UNITS_PER_M3_WIDE * (WIDE_HALF / half) ** 2;

// Bottom stage engine section
const ENGINE_SECTION_HEIGHT = 20;
const ENGINE_FLARE = 4;

// Upper stage interstage (hides the upper stage engines). It grows to fit long nozzles.
const MIN_INTERSTAGE_HEIGHT = 34;
const INTERSTAGE_CLEARANCE = 6;

// Engine nozzles. Every engine has the same throat, so the exit radius scales with
// sqrt(expansion ratio), and a bell gets longer as it gets wider.
const THROAT_HALF = 2.75;
const CHAMBER_HALF = 5;
const NOZZLE_BASE_HEIGHT = 6;
const NOZZLE_LENGTH_PER_WIDTH = 2;
const nozzleSize = (expansionRatio) => {
  const exitHalf = THROAT_HALF * Math.sqrt(expansionRatio);
  return { exitHalf, height: NOZZLE_BASE_HEIGHT + NOZZLE_LENGTH_PER_WIDTH * (exitHalf - THROAT_HALF) };
};

const interstageHeight = (nozzle) =>
  Math.max(MIN_INTERSTAGE_HEIGHT, nozzle.height + INTERSTAGE_CLEARANCE);

// Engine positions seen from below, projected to the side view: `x` across the
// diagram and `z` toward the viewer. One engine sits in the middle; up to five form a
// ring; six or more add a center engine inside the ring. The ring is turned slightly so
// engines behind the front ones still peek out. Sorted back to front for drawing.
const clusterLayout = (count, half) => {
  if (count === 1) return [{ x: 0, z: 0 }];
  const hasCenter = count >= 6;
  const ringCount = hasCenter ? count - 1 : count;
  const radius = half * (hasCenter ? 0.7 : 0.5);
  const turn = Math.PI / (2 * ringCount);
  const positions = Array.from({ length: ringCount }, (_, k) => {
    const angle = turn + (2 * Math.PI * k) / ringCount;
    return { x: radius * Math.cos(angle), z: radius * Math.sin(angle) };
  });
  if (hasCenter) positions.push({ x: 0, z: 0 });
  return positions.toSorted((a, b) => a.z - b.z);
};

// Spacecraft: service module inside a fairing, crew capsule on top
const FAIRING_HEIGHT = 52;
const SM_INSET = 8;
const CAPSULE_HEIGHT = 32;
const CAPSULE_TOP_HALF = 10;
const NOSE_HEIGHT = 24;
const SPACECRAFT_HEIGHT = FAIRING_HEIGHT + CAPSULE_HEIGHT + NOSE_HEIGHT;

// Bell nozzle hanging from (cx, top): a short neck narrows from the mount to the throat,
// then the bell flares out steeply (~40° from the axis) and straightens out
// until the wall is almost parallel to the axis at the exit.
const bellPath = (cx, top, height, mountHalf, throatHalf, exitHalf) => {
  const neck = Math.min(3, height * 0.25);
  const throatY = top + neck;
  const bellH = height - neck;
  const bottom = top + height;
  const flare = exitHalf - throatHalf;
  // Control points as (offset from axis, y), mirrored for the left wall.
  const neckC1 = [mountHalf, top + neck * 0.5];
  const neckC2 = [throatHalf, top + neck * 0.5];
  const bellC1 = [throatHalf + flare * 0.4, throatY + bellH * 0.25];
  const bellC2 = [exitHalf - flare * 0.05, throatY + bellH * 0.6];
  const pt = (side, [dx, y]) => `${cx + side * dx} ${y}`;

  return `M ${pt(-1, [mountHalf, top])} L ${pt(1, [mountHalf, top])}
    C ${pt(1, neckC1)} ${pt(1, neckC2)} ${pt(1, [throatHalf, throatY])}
    C ${pt(1, bellC1)} ${pt(1, bellC2)} ${pt(1, [exitHalf, bottom])}
    L ${pt(-1, [exitHalf, bottom])}
    C ${pt(-1, bellC2)} ${pt(-1, bellC1)} ${pt(-1, [throatHalf, throatY])}
    C ${pt(-1, neckC2)} ${pt(-1, neckC1)} ${pt(-1, [mountHalf, top])} Z`;
};

// Bottom stage: tank, engine section, engine cluster.
// Nozzles are filled with the background, so front engines hide the ones behind them.
const FirstStage = ({ tankTop, tankH, half, engines, nozzle }) => {
  const sectionTop = tankTop + tankH;
  const nozzleTop = sectionTop + ENGINE_SECTION_HEIGHT;

  return (
    <g>
      <rect className="rd-outline" x={CX - half} y={tankTop} width={half * 2} height={tankH} />
      <path
        className="rd-outline"
        d={`M ${CX - half} ${sectionTop} L ${CX + half} ${sectionTop}
            L ${CX + half + ENGINE_FLARE} ${nozzleTop} L ${CX - half - ENGINE_FLARE} ${nozzleTop} Z`}
      />
      {clusterLayout(engines, half).map(({ x, z }, i) => (
        <path
          key={i}
          className={z < 0 ? "rd-engine rd-engine--back" : "rd-engine"}
          d={bellPath(CX + x, nozzleTop, nozzle.height, CHAMBER_HALF, THROAT_HALF, nozzle.exitHalf)}
        />
      ))}
    </g>
  );
};

// Upper stage: tank on an interstage that tapers to the stage below.
const UpperStage = ({ tankTop, tankH, half, belowHalf, engines, nozzle }) => {
  const interstageTop = tankTop + tankH;
  const interstageBottom = interstageTop + interstageHeight(nozzle);

  return (
    <g>
      <rect className="rd-outline" x={CX - half} y={tankTop} width={half * 2} height={tankH} />
      <path
        className="rd-outline"
        d={`M ${CX - half} ${interstageTop} L ${CX + half} ${interstageTop}
            L ${CX + belowHalf} ${interstageBottom} L ${CX - belowHalf} ${interstageBottom} Z`}
      />
      {clusterLayout(engines, half).map(({ x }, i) => (
        <path
          key={i}
          className="rd-hidden"
          d={bellPath(CX + x, interstageTop, nozzle.height, CHAMBER_HALF, THROAT_HALF, nozzle.exitHalf)}
        />
      ))}
    </g>
  );
};

// Fairing (hiding the smaller service module) and crew capsule.
const Spacecraft = ({ base, half }) => {
  const fairingTop = base - FAIRING_HEIGHT;
  const capsuleTop = fairingTop - CAPSULE_HEIGHT;
  const noseTip = capsuleTop - NOSE_HEIGHT;
  const smHalf = half - SM_INSET;
  const smBottom = base - 14;

  return (
    <g>
      <rect className="rd-outline" x={CX - half} y={fairingTop} width={half * 2} height={FAIRING_HEIGHT} />
      {/* Service module, hidden inside the fairing */}
      <rect
        className="rd-hidden"
        x={CX - smHalf}
        y={fairingTop + 6}
        width={smHalf * 2}
        height={smBottom - fairingTop - 6}
      />
      <path className="rd-hidden" d={bellPath(CX, smBottom, 10, 3, 2, 8)} />

      <path
        className="rd-outline"
        d={`M ${CX - half} ${fairingTop} L ${CX - CAPSULE_TOP_HALF} ${capsuleTop}
            L ${CX + CAPSULE_TOP_HALF} ${capsuleTop} L ${CX + half} ${fairingTop} Z`}
      />

      {/* Ogive nose cone */}
      <path
        className="rd-outline"
        d={`M ${CX - CAPSULE_TOP_HALF} ${capsuleTop}
            Q ${CX - CAPSULE_TOP_HALF} ${noseTip + NOSE_HEIGHT * 0.35} ${CX} ${noseTip}
            Q ${CX + CAPSULE_TOP_HALF} ${noseTip + NOSE_HEIGHT * 0.35} ${CX + CAPSULE_TOP_HALF} ${capsuleTop} Z`}
      />
    </g>
  );
};

const RocketDiagram = ({ stages }) => {
  // Lay out stages from the ground up; stages[0] is the bottom stage.
  // The top stage matches the fairing width; every stage below it is wide.
  const count = stages.length;
  const placed = [];
  let stackTop = GROUND_Y;
  for (const [index, stage] of stages.entries()) {
    const half = index === count - 1 ? NARROW_HALF : WIDE_HALF;
    const tankH = tankHeight(stage.fuel, stage.propellant, half);
    const nozzle = nozzleSize(stage.expansionRatio);
    const below = index === 0 ? ENGINE_SECTION_HEIGHT + nozzle.height : interstageHeight(nozzle);
    const tankTop = stackTop - below - tankH;
    placed.push({
      id: stage.id,
      isFirst: index === 0,
      half,
      belowHalf: placed.at(-1)?.half,
      tankTop,
      tankH,
      engines: stage.engines,
      nozzle,
    });
    stackTop = tankTop;
  }
  const overallTop = stackTop - SPACECRAFT_HEIGHT;

  // Extend the view upward when a tall rocket would not fit.
  const viewTop = Math.min(0, overallTop - 30);
  const viewHeight = VIEW_HEIGHT - viewTop;

  return (
    <svg
      className="rocket-diagram"
      viewBox={`0 ${viewTop} ${VIEW_WIDTH} ${viewHeight}`}
      role="img"
      aria-label={`Blueprint outline of a ${count}-stage rocket`}
    >
      <defs>
        <pattern id="rd-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
        </pattern>
        <pattern id="rd-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="url(#rd-grid-minor)" />
          <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
        </pattern>
      </defs>

      <rect y={viewTop} width={VIEW_WIDTH} height={viewHeight} fill="url(#rd-grid)" />

      <line className="rd-center" x1={CX} x2={CX} y1={overallTop - 14} y2={GROUND_Y + 14} />

      {placed.map((stage) =>
        stage.isFirst ? (
          <FirstStage
            key={stage.id}
            tankTop={stage.tankTop}
            tankH={stage.tankH}
            half={stage.half}
            engines={stage.engines}
            nozzle={stage.nozzle}
          />
        ) : (
          <UpperStage
            key={stage.id}
            tankTop={stage.tankTop}
            tankH={stage.tankH}
            half={stage.half}
            belowHalf={stage.belowHalf}
            engines={stage.engines}
            nozzle={stage.nozzle}
          />
        ),
      )}

      <Spacecraft base={stackTop} half={NARROW_HALF} />

      <line className="rd-outline" x1={30} x2={VIEW_WIDTH - 30} y1={GROUND_Y} y2={GROUND_Y} />
    </svg>
  );
};

export default RocketDiagram;
