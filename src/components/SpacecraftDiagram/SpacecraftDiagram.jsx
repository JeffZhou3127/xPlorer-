import {
  BATTERIES,
  RADIATORS,
  RCS_FUEL_RANGE_KG,
  SOLAR_PANELS,
} from "../../utils/spacecraftPhysics.js";
import "../RocketDiagram/RocketDiagram.css";
import "./SpacecraftDiagram.css";

// Blueprint-style outline of the spacecraft: the command pod on top of the service module
// (the payload section), with its systems attached. All units are SVG user units.
const VIEW_WIDTH = 440;
const VIEW_HEIGHT = 360;
const CX = VIEW_WIDTH / 2;

// Command pod: a docking tunnel on a cone-shaped capsule with a curved heat shield below.
const TUNNEL = { top: 50, height: 12, half: 9 };
const POD = { top: TUNNEL.top + TUNNEL.height, height: 88, topHalf: 16, baseHalf: 48 };
const POD_BASE = POD.top + POD.height;
const HEAT_SHIELD_BULGE = 10;

// Service module, with a short tapered aft bulkhead.
const SM = { top: POD_BASE + HEAT_SHIELD_BULGE + 2, height: 130, half: 42 };
const SM_BOTTOM = SM.top + SM.height;
const AFT = { height: 12, half: 30 };

// Solar wings mount on the upper service module, radiators near its base.
// Panel lengths scale with the rating so a bigger option is visibly bigger.
const BOOM = 12;
const SOLAR = { y: SM.top + 32, height: 40, lengthPerKw: 10, cell: 10 };
const RADIATOR = { y: SM_BOTTOM - 30, height: 22, lengthPerKw: 13, tubes: 3 };

// RCS thruster quads sit between the solar wings and the radiators.
const RCS_QUAD = { y: SM.top + 72, width: 7, height: 12, nozzle: 5 };

// Hidden internals: two spherical RCS tanks and a battery stack.
const TANK = { y: SM.top + 40, offset: 20, minR: 4, maxR: 16 };
const BATTERY = { half: 14, heightPerKwh: 1.5, cell: 9, bottomGap: 8 };

// A wing on one side (`side` is -1 or 1): a boom from the hull, then the panel.
const Wing = ({ side, y, length, height, className = "rd-outline", children }) => {
  const root = CX + side * SM.half;
  const panelNear = root + side * BOOM;
  const panelFar = panelNear + side * length;
  const left = Math.min(panelNear, panelFar);

  return (
    <g>
      <line className="rd-outline" x1={root} x2={panelNear} y1={y} y2={y} />
      <rect className={className} x={left} y={y - height / 2} width={length} height={height} />
      {children(left, left + length)}
    </g>
  );
};

const SolarWing = ({ side, power }) => (
  <Wing side={side} y={SOLAR.y} length={power * SOLAR.lengthPerKw} height={SOLAR.height}>
    {(left, right) => (
      <>
        {/* Cell grid: a line across the middle and dividers along the wing. */}
        <line className="sd-detail" x1={left} x2={right} y1={SOLAR.y} y2={SOLAR.y} />
        {Array.from({ length: Math.floor((right - left) / SOLAR.cell) - 1 }, (_, i) => {
          const x = left + (i + 1) * SOLAR.cell;
          return (
            <line
              key={i}
              className="sd-detail"
              x1={x}
              x2={x}
              y1={SOLAR.y - SOLAR.height / 2}
              y2={SOLAR.y + SOLAR.height / 2}
            />
          );
        })}
      </>
    )}
  </Wing>
);

const RadiatorWing = ({ side, rejection }) => (
  <Wing
    side={side}
    y={RADIATOR.y}
    length={rejection * RADIATOR.lengthPerKw}
    height={RADIATOR.height}
  >
    {(left, right) =>
      // Coolant tubes running the length of the panel.
      Array.from({ length: RADIATOR.tubes }, (_, i) => {
        const y = RADIATOR.y - RADIATOR.height / 2 + ((i + 1) * RADIATOR.height) / (RADIATOR.tubes + 1);
        return <line key={i} className="sd-detail" x1={left + 3} x2={right - 3} y1={y} y2={y} />;
      })
    }
  </Wing>
);

// Thruster block on the hull with nozzles pointing up, down and outward.
const RcsQuad = ({ side }) => {
  const inner = CX + side * SM.half;
  const outer = inner + side * RCS_QUAD.width;
  const top = RCS_QUAD.y - RCS_QUAD.height / 2;
  const bottom = RCS_QUAD.y + RCS_QUAD.height / 2;
  const mid = (inner + outer) / 2;

  return (
    <g>
      <rect
        className="rd-outline"
        x={Math.min(inner, outer)}
        y={top}
        width={RCS_QUAD.width}
        height={RCS_QUAD.height}
      />
      <line className="rd-outline" x1={mid} x2={mid} y1={top} y2={top - RCS_QUAD.nozzle} />
      <line className="rd-outline" x1={mid} x2={mid} y1={bottom} y2={bottom + RCS_QUAD.nozzle} />
      <line
        className="rd-outline"
        x1={outer}
        x2={outer + side * RCS_QUAD.nozzle}
        y1={RCS_QUAD.y}
        y2={RCS_QUAD.y}
      />
    </g>
  );
};

// Tank radius grows with the cube root of the fuel volume, like a real sphere.
const tankRadius = (fuel) =>
  TANK.minR + (TANK.maxR - TANK.minR) * Math.cbrt(fuel / RCS_FUEL_RANGE_KG.max);

const BatteryStack = ({ capacity }) => {
  const height = capacity * BATTERY.heightPerKwh;
  const bottom = SM_BOTTOM - BATTERY.bottomGap;
  const top = bottom - height;
  const cells = Math.round(height / BATTERY.cell);

  return (
    <g>
      <rect className="rd-hidden" x={CX - BATTERY.half} y={top} width={BATTERY.half * 2} height={height} />
      {Array.from({ length: cells - 1 }, (_, i) => {
        const y = top + ((i + 1) * height) / cells;
        return (
          <line key={i} className="rd-hidden" x1={CX - BATTERY.half} x2={CX + BATTERY.half} y1={y} y2={y} />
        );
      })}
    </g>
  );
};

const describe = ({ solarPanels, batteries, radiators }) => {
  const fitted = [
    solarPanels && `${solarPanels} solar panels`,
    batteries && `${batteries} batteries`,
    radiators && `${radiators} radiators`,
  ].filter(Boolean);
  return `Blueprint outline of the command pod and service module${
    fitted.length ? ` with ${fitted.join(", ")}` : ""
  }`;
};

const SpacecraftDiagram = ({ design }) => {
  const { solarPanels, batteries, radiators, rcsFuel } = design;
  const tankR = rcsFuel > 0 ? tankRadius(rcsFuel) : 0;

  return (
    <svg
      className="spacecraft-diagram"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={describe(design)}
    >
      <defs>
        <pattern id="sd-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
        </pattern>
        <pattern id="sd-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="url(#sd-grid-minor)" />
          <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
        </pattern>
      </defs>

      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#sd-grid)" />

      <line
        className="rd-center"
        x1={CX}
        x2={CX}
        y1={TUNNEL.top - 14}
        y2={SM_BOTTOM + AFT.height + 14}
      />

      {/* Command pod */}
      <rect
        className="rd-outline"
        x={CX - TUNNEL.half}
        y={TUNNEL.top}
        width={TUNNEL.half * 2}
        height={TUNNEL.height}
      />
      <path
        className="rd-outline"
        d={`M ${CX - POD.topHalf} ${POD.top} L ${CX + POD.topHalf} ${POD.top}
            L ${CX + POD.baseHalf} ${POD_BASE} L ${CX - POD.baseHalf} ${POD_BASE} Z`}
      />
      <path
        className="rd-outline"
        d={`M ${CX - POD.baseHalf} ${POD_BASE} Q ${CX} ${POD_BASE + HEAT_SHIELD_BULGE * 2}
            ${CX + POD.baseHalf} ${POD_BASE}`}
      />
      {[-1, 1].map((side) => (
        <rect
          key={side}
          className="rd-outline"
          x={CX + side * 14 - 5}
          y={POD.top + 22}
          width={10}
          height={9}
        />
      ))}

      {/* Service module */}
      <rect className="rd-outline" x={CX - SM.half} y={SM.top} width={SM.half * 2} height={SM.height} />
      <path
        className="rd-outline"
        d={`M ${CX - SM.half} ${SM_BOTTOM} L ${CX + SM.half} ${SM_BOTTOM}
            L ${CX + AFT.half} ${SM_BOTTOM + AFT.height} L ${CX - AFT.half} ${SM_BOTTOM + AFT.height} Z`}
      />

      {tankR > 0 &&
        [-1, 1].map((side) => (
          <circle key={side} className="rd-hidden" cx={CX + side * TANK.offset} cy={TANK.y} r={tankR} />
        ))}
      {batteries && <BatteryStack capacity={BATTERIES[batteries].capacity} />}

      {[-1, 1].map((side) => (
        <g key={side}>
          <RcsQuad side={side} />
          {solarPanels && <SolarWing side={side} power={SOLAR_PANELS[solarPanels].power} />}
          {radiators && <RadiatorWing side={side} rejection={RADIATORS[radiators].rejection} />}
        </g>
      ))}
    </svg>
  );
};

export default SpacecraftDiagram;
