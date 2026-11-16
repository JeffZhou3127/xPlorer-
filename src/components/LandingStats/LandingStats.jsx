import { Stat } from "../RocketStats/RocketStats.jsx";
import { format } from "../../utils/format.js";
import "../RocketStats/RocketStats.css";
import "../FlightStats/FlightStats.css";

// Live readouts of the lunar landing (M2S6) or liftoff (M2S8, `title="Ascent"`), under the flight controls in the left pane,
// styled like FlightStats. `state` comes from `landingPlan(...).stateAt` (metres, m/s);
// `deltaVLeft` is what the landing stage can still give (m/s).
const LandingStats = ({ state, deltaVLeft, title = "Descent" }) => {
  const { altitude, horizontal, vertical, throttle } = state;
  const high = altitude >= 1000;

  return (
    <div className="flight-stats">
      <h2 className="rocket-stats__title">Lander</h2>
      <section className="flight-stats__group" aria-label={title}>
        <h3 className="flight-stats__group-title">{title}</h3>
        <dl className="flight-stats__grid">
          <Stat
            label="Altitude"
            value={high ? format(altitude / 1000, 1) : format(Math.round(altitude))}
            unit={high ? "km" : "m"}
          />
          <Stat label="Horizontal" info="horizontalVelocity" value={format(Math.round(horizontal))} unit="m/s" />
          <Stat label="Vertical" info="verticalVelocity" value={format(vertical, 1)} unit="m/s" />
          <Stat
            label="Throttle"
            info="throttle"
            value={throttle > 0 ? Math.round(throttle * 100) : "Off"}
            unit={throttle > 0 ? "%" : ""}
          />
          <Stat label="Δv left" value={format(Math.max(0, Math.round(deltaVLeft)))} unit="m/s" />
        </dl>
      </section>
    </div>
  );
};

export default LandingStats;
