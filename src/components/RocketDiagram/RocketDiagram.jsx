import "./RocketDiagram.css";

// Minimal blueprint-style rocket outline. All units are SVG user units.
const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 900;
const GROUND_Y = 860;
const CX = 150; // rocket centerline

// Body widths. The top stage matches the spacecraft fairing; lower stages are wider.
const NARROW_HALF = 30;
const WIDE_HALF = 42;

// Tank length is propellant volume divided by cross-section area,
// so a narrow tank grows faster per tonne than a wide one.
const TANK_BASE = 12;
const UNITS_PER_TONNE_WIDE = 0.72;
const tankHeight = (fuel, half) =>
  TANK_BASE + fuel * UNITS_PER_TONNE_WIDE * (WIDE_HALF / half) ** 2;

// Bottom stage engine section
const ENGINE_SECTION_HEIGHT = 20;
const ENGINE_FLARE = 4;
const NOZZLE_HEIGHT = 24;

// Upper stage interstage (hides the upper stage engine)
const INTERSTAGE_HEIGHT = 34;

// Spacecraft: service module inside a fairing, crew capsule on top
const FAIRING_HEIGHT = 52;
const SM_INSET = 8;
const CAPSULE_HEIGHT = 32;
const CAPSULE_TOP_HALF = 10;
const NOSE_HEIGHT = 24;
const SPACECRAFT_HEIGHT = FAIRING_HEIGHT + CAPSULE_HEIGHT + NOSE_HEIGHT;

// Bell nozzle with its throat (top) centered at (cx, top).
const bellPath = (cx, top, height, topHalf, bottomHalf) => {
  const bottom = top + height;
  return `M ${cx - topHalf} ${top} L ${cx + topHalf} ${top}
    C ${cx + topHalf} ${top + height * 0.5} ${cx + bottomHalf} ${top + height * 0.7} ${cx + bottomHalf} ${bottom}
    L ${cx - bottomHalf} ${bottom}
    C ${cx - bottomHalf} ${top + height * 0.7} ${cx - topHalf} ${top + height * 0.5} ${cx - topHalf} ${top} Z`;
};

// Bottom stage: tank, engine section, engine cluster.
const FirstStage = ({ tankTop, tankH, half }) => {
  const sectionTop = tankTop + tankH;
  const nozzleTop = sectionTop + ENGINE_SECTION_HEIGHT;
  const nozzleOffsets = half === WIDE_HALF ? [-24, 0, 24] : [-13, 13];

  return (
    <g>
      <rect className="rd-outline" x={CX - half} y={tankTop} width={half * 2} height={tankH} />
      <path
        className="rd-outline"
        d={`M ${CX - half} ${sectionTop} L ${CX + half} ${sectionTop}
            L ${CX + half + ENGINE_FLARE} ${nozzleTop} L ${CX - half - ENGINE_FLARE} ${nozzleTop} Z`}
      />
      {nozzleOffsets.map((dx) => (
        <path key={dx} className="rd-outline" d={bellPath(CX + dx, nozzleTop, NOZZLE_HEIGHT, 5, 11)} />
      ))}
    </g>
  );
};

// Upper stage: tank on an interstage that tapers to the stage below.
const UpperStage = ({ tankTop, tankH, half, belowHalf }) => {
  const interstageTop = tankTop + tankH;
  const interstageBottom = interstageTop + INTERSTAGE_HEIGHT;

  return (
    <g>
      <rect className="rd-outline" x={CX - half} y={tankTop} width={half * 2} height={tankH} />
      <path
        className="rd-outline"
        d={`M ${CX - half} ${interstageTop} L ${CX + half} ${interstageTop}
            L ${CX + belowHalf} ${interstageBottom} L ${CX - belowHalf} ${interstageBottom} Z`}
      />
      <path
        className="rd-hidden"
        d={bellPath(CX, interstageTop, INTERSTAGE_HEIGHT - 6, 5, Math.min(half, belowHalf) * 0.7)}
      />
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
      <path className="rd-hidden" d={bellPath(CX, smBottom, 10, 3, 8)} />

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
    const tankH = tankHeight(stage.fuel, half);
    const below = index === 0 ? ENGINE_SECTION_HEIGHT + NOZZLE_HEIGHT : INTERSTAGE_HEIGHT;
    const tankTop = stackTop - below - tankH;
    placed.push({
      id: stage.id,
      isFirst: index === 0,
      half,
      belowHalf: placed.at(-1)?.half,
      tankTop,
      tankH,
    });
    stackTop = tankTop;
  }
  const overallTop = stackTop - SPACECRAFT_HEIGHT;

  return (
    <svg
      className="rocket-diagram"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
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

      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#rd-grid)" />

      <line className="rd-center" x1={CX} x2={CX} y1={overallTop - 14} y2={GROUND_Y + 14} />

      {placed.map((stage) =>
        stage.isFirst ? (
          <FirstStage key={stage.id} tankTop={stage.tankTop} tankH={stage.tankH} half={stage.half} />
        ) : (
          <UpperStage
            key={stage.id}
            tankTop={stage.tankTop}
            tankH={stage.tankH}
            half={stage.half}
            belowHalf={stage.belowHalf}
          />
        ),
      )}

      <Spacecraft base={stackTop} half={NARROW_HALF} />

      <line className="rd-outline" x1={30} x2={VIEW_WIDTH - 30} y1={GROUND_Y} y2={GROUND_Y} />
    </svg>
  );
};

export default RocketDiagram;
