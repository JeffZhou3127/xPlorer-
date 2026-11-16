import SpacecraftBody from "./SpacecraftBody.jsx";
import { AFT, CX, LANDER_VIEW_HEIGHT, SM_BOTTOM, TUNNEL, VIEW_HEIGHT, VIEW_WIDTH } from "./spacecraftLayout.js";
import "../RocketDiagram/RocketDiagram.css";
import "./SpacecraftDiagram.css";

// Blueprint-style outline of the spacecraft: the command pod on top of the service module
// (the payload section), with its systems attached (SpacecraftBody), on a grid.

const describe = ({ solarPanels, batteries, radiators, landerFuel }) => {
  const fitted = [
    solarPanels && `${solarPanels} solar panels`,
    batteries && `${batteries} batteries`,
    radiators && `${radiators} radiators`,
  ].filter(Boolean);
  const vehicle = landerFuel === undefined ? "" : " on a landing stage";
  return `Blueprint outline of the command pod and service module${vehicle}${
    fitted.length ? ` with ${fitted.join(", ")}` : ""
  }`;
};

const SpacecraftDiagram = ({ design }) => {
  const lander = design.landerFuel !== undefined;
  const viewHeight = lander ? LANDER_VIEW_HEIGHT : VIEW_HEIGHT;

  return (
    <svg
      className="spacecraft-diagram"
      viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
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

      <rect width={VIEW_WIDTH} height={viewHeight} fill="url(#sd-grid)" />

      <line
        className="rd-center"
        x1={CX}
        x2={CX}
        y1={TUNNEL.top - 14}
        y2={lander ? viewHeight - 16 : SM_BOTTOM + AFT.height + 14}
      />

      <SpacecraftBody design={design} />
    </svg>
  );
};

export default SpacecraftDiagram;
