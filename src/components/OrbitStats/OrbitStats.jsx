import { Stat } from "../RocketStats/RocketStats.jsx";
import { format } from "../../utils/format.js";
import "../RocketStats/RocketStats.css";
import "../FlightStats/FlightStats.css";

const km = (metres) => format(Math.round(metres / 1000));

// "1 h 28 min" or "52 min" for a period in seconds.
const period = (seconds) => {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

// Live orbit readouts under the controls, in FlightStats' look. `readouts` comes from
// flightSim's flightReadouts; `periodSeconds` is null on an escape path; `throttle` is a
// percentage, or null while the engine is off.
const OrbitStats = ({ readouts, periodSeconds, throttle }) => {
  const { altitude, speed, apogee, perigee } = readouts;
  return (
    <div className="flight-stats">
      <h2 className="rocket-stats__title">Orbit</h2>
      <section className="flight-stats__group" aria-label="Orbit">
        <dl className="flight-stats__grid">
          <Stat label="Altitude" value={km(altitude)} unit="km" />
          <Stat label="Velocity" info="velocity" value={format(Math.round(speed))} unit="m/s" />
          <Stat
            label="Apogee"
            info="apogee"
            value={apogee === null ? "Escape" : km(apogee)}
            unit={apogee === null ? "" : "km"}
          />
          <Stat
            label="Perigee"
            info="perigee"
            value={perigee === null ? "—" : km(perigee)}
            unit={perigee === null ? "" : "km"}
          />
          <Stat label="Period" info="orbitalPeriod" value={periodSeconds === null ? "—" : period(periodSeconds)} unit="" />
          <Stat label="Throttle" info="throttle" value={throttle === null ? "Off" : throttle} unit={throttle === null ? "" : "%"} />
        </dl>
      </section>
    </div>
  );
};

export default OrbitStats;
