import RocketBody from "./RocketBody.jsx";
import { CENTER_X as CX, GROUND_Y, rocketTop } from "./rocketLayout.js";
import "./RocketDiagram.css";

// Minimal blueprint-style rocket outline on a grid, standing on the pad.
// All units are SVG user units. The rocket itself is drawn by RocketBody.
const VIEW_WIDTH = 300;
const VIEW_HEIGHT = 900;

const RocketDiagram = ({ stages, srbs }) => {
  const count = stages.length;
  const overallTop = rocketTop(stages, srbs);

  // Extend the view upward when a tall rocket would not fit.
  const viewTop = Math.min(0, overallTop - 30);
  const viewHeight = VIEW_HEIGHT - viewTop;

  return (
    <svg
      className="rocket-diagram"
      viewBox={`0 ${viewTop} ${VIEW_WIDTH} ${viewHeight}`}
      role="img"
      aria-label={`Blueprint outline of a ${count}-stage rocket${srbs ? " with two solid rocket boosters" : ""}`}
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

      <RocketBody stages={stages} srbs={srbs} />

      <line className="rd-outline" x1={30} x2={VIEW_WIDTH - 30} y1={GROUND_Y} y2={GROUND_Y} />
    </svg>
  );
};

export default RocketDiagram;
