import { Stat } from "../RocketStats/RocketStats.jsx";
import { format } from "../../utils/format.js";
import "../RocketStats/RocketStats.css";
import "./FlightStats.css";

// Signed angle or rate as a magnitude with a direction, e.g. "12.3° R".
const signed = (value) => {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return format(0, 1);
  return `${format(Math.abs(rounded), 1)} ${rounded < 0 ? "L" : "R"}`;
};

// Signed speed with an explicit "+" or "−", e.g. "−42".
const signedSpeed = (value) => {
  const rounded = Math.round(value);
  if (rounded === 0) return "0";
  return `${rounded < 0 ? "−" : "+"}${format(Math.abs(rounded))}`;
};

const km = (metres) => format(metres / 1000, 1);

const Group = ({ title, children }) => (
  <section className="flight-stats__group" aria-label={title}>
    <h3 className="flight-stats__group-title">{title}</h3>
    <dl className="flight-stats__grid">{children}</dl>
  </section>
);

// Live flight readouts, under the flight controls in the left pane, in two compact
// groups: where the rocket is going (trajectory) and what it is doing (vehicle).
// `readouts` comes from `flightReadouts` (metres and m/s); `drag` is in newtons.
// `throttle` is a percentage, or null while the engines are shut down.
const FlightStats = ({ readouts, drag, pitch, pitchRate, throttle, stageNumber }) => {
  const { altitude, speed, horizontal, vertical, apogee, perigee } = readouts;

  return (
    <div className="flight-stats">
      <h2 className="rocket-stats__title">Flight</h2>

      <Group title="Trajectory">
        <Stat label="Altitude" value={km(altitude)} unit="km" />
        <Stat label="Velocity" info="velocity" value={format(Math.round(speed))} unit="m/s" />
        <Stat label="Horizontal" info="horizontalVelocity" value={signedSpeed(horizontal)} unit="m/s" />
        <Stat label="Vertical" info="verticalVelocity" value={signedSpeed(vertical)} unit="m/s" />
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
        <Stat label="Drag" info="drag" value={format(drag / 1000, 1)} unit="kN" />
      </Group>

      <Group title="Vehicle">
        <Stat label="Pitch" value={signed(pitch)} unit="°" />
        <Stat label="Pitch rate" value={signed(pitchRate)} unit="°/s" />
        {throttle === null ? (
          <Stat label="Throttle" value="Off" unit="" />
        ) : (
          <Stat label="Throttle" value={throttle} unit="%" />
        )}
        <Stat label="Active stage" value={stageNumber} unit="" />
      </Group>
    </div>
  );
};

export default FlightStats;
