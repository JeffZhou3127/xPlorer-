import { Info, Meter, Stat } from "../RocketStats/RocketStats.jsx";
import { format } from "../../utils/format.js";
import "../RocketStats/RocketStats.css";
import "../FlightStats/FlightStats.css";
import "./ReentryStats.css";

// Readouts for the reentry, under the view in the right pane (same look as FlightStats).
// `readouts` from entryReadouts; `sections` the heat shield sections ({ key, label });
// `shieldLimit` (°C) and `gLimit` what they are judged against (meters turn red past 85%).
const ReentryStats = ({ readouts, sections, shieldLimit, gLimit }) => {
  const { altitude, speed, pathAngle, downrange, gLoad, heatFlux, temps, maxTemps, maxG } = readouts;
  return (
    <div className="flight-stats reentry-stats">
      <h2 className="rocket-stats__title">Reentry</h2>

      <section className="flight-stats__group" aria-label="Trajectory">
        <h3 className="flight-stats__group-title">Trajectory</h3>
        <dl className="flight-stats__grid">
          <Stat label="Altitude" value={format(altitude / 1000, 1)} unit="km" />
          <Stat label="Speed" value={format(speed / 1000, 2)} unit="km/s" />
          <Stat label="Flight path" info="flightPathAngle" value={format(pathAngle, 1)} unit="°" />
          <Stat label="Downrange" info="downrange" value={format(downrange / 1000)} unit="km" />
        </dl>
      </section>

      <section className="flight-stats__group" aria-label="Loads">
        <h3 className="flight-stats__group-title">Loads</h3>
        <dl className="flight-stats__grid">
          <Stat label="Deceleration" info="gForce" value={format(gLoad, 1)} unit="g" />
          <Stat label="Peak" value={format(maxG, 1)} unit={`g / ${gLimit}`} />
          <Stat label="Heat flux" info="heatFlux" value={format(heatFlux / 1e4, 1)} unit="W/cm²" />
        </dl>
        <Meter label="Deceleration" value={gLoad} max={gLimit} alert={gLoad > gLimit * 0.85} />
      </section>

      <section className="flight-stats__group" aria-label="Heat shield">
        <h3 className="flight-stats__group-title">
          <span>
            Heat shield
            <Info topic="heatShield" />
          </span>
        </h3>
        {sections.map(({ key, label }) => (
          <div key={key} className="reentry-stats__section">
            <div className="reentry-stats__section-head">
              <span>{label}</span>
              <span className="reentry-stats__temp">
                {format(temps[key])} °C <span className="reentry-stats__peak">peak {format(maxTemps[key])}</span>
              </span>
            </div>
            <Meter
              label={`${label} temperature`}
              value={Math.max(0, temps[key])}
              max={shieldLimit}
              alert={temps[key] > shieldLimit * 0.85}
            />
          </div>
        ))}
        <p className="reentry-stats__note">The ablator burns through above {format(shieldLimit)} °C.</p>
      </section>
    </div>
  );
};

export default ReentryStats;
