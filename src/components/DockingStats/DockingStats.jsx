import { Info, Stat } from "../RocketStats/RocketStats.jsx";
import { format } from "../../utils/format.js";
import "../RocketStats/RocketStats.css";
import "../FlightStats/FlightStats.css";

// Signed speed with a direction word, e.g. "0.05 R"; 0 when it rounds to zero.
const signed = (value, positive, negative) => {
  const rounded = Number(value.toFixed(2));
  if (rounded === 0) return format(0, 2);
  return `${format(Math.abs(rounded), 2)} ${rounded > 0 ? positive : negative}`;
};

const Group = ({ title, info, children }) => (
  <section className="flight-stats__group" aria-label={title}>
    <h3 className="flight-stats__group-title">
      <span>
        {title}
        {info && <Info topic={info} />}
      </span>
    </h3>
    <dl className="flight-stats__grid">{children}</dl>
  </section>
);

// Docking readouts under the docking controls (same look as FlightStats): the
// spacecraft's velocity relative to the depot (`vel`, m/s, docking frame) and the RCS Δv
// left and spent (m/s).
const DockingStats = ({ vel, rcsRemaining, rcsUsed }) => (
  <div className="flight-stats">
    <h2 className="rocket-stats__title">Approach</h2>

    <Group title="Relative velocity" info="relativeVelocity">
      <Stat label="Sideways" value={signed(vel.x, "R", "L")} unit="m/s" />
      <Stat label="Vertical" value={signed(vel.y, "U", "D")} unit="m/s" />
      <Stat label="Closing" info="closingSpeed" value={format(-vel.z, 2)} unit="m/s" />
      <Stat label="Speed" value={format(Math.hypot(vel.x, vel.y, vel.z), 2)} unit="m/s" />
    </Group>

    <Group title="RCS">
      <Stat label="Δv left" info="rcsDeltaV" value={format(rcsRemaining, 2)} unit="m/s" />
      <Stat label="Δv used" value={format(rcsUsed, 2)} unit="m/s" />
    </Group>
  </div>
);

export default DockingStats;
