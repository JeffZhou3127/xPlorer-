import { Meter, Stat } from "../RocketStats/RocketStats.jsx";
import { format } from "../../utils/format.js";
import "../RocketStats/RocketStats.css";
import "../FlightStats/FlightStats.css";
import "./CruiseStats.css";

// A group of readouts with a meter under them and a status line (red with `alert`).
const Group = ({ title, meter, status, alert, children }) => (
  <section className="flight-stats__group" aria-label={title}>
    <h3 className="flight-stats__group-title">{title}</h3>
    <dl className="flight-stats__grid">{children}</dl>
    {meter && <Meter {...meter} alert={alert} />}
    <p className={`cruise-stats__status ${alert ? "cruise-stats__status--alert" : ""}`}>{status}</p>
  </section>
);

// The spacecraft's systems on the way to Mars, under the burn controls (same look as
// FlightStats). `systems` is the state now ({ au, solar (kW), battery (kWh), temperature
// (°C), rcs (m/s) }, from systemsAt), `limits` what it is judged against ({ demand (kW),
// batteryCapacity (kWh), heatLoad, heatRejection (kW), cabinNominal, cabinMax (°C),
// rcsStart (m/s) }), plus the day and the distance to Mars (m).
const CruiseStats = ({ day, marsDistance, systems, limits }) => {
  const { au, solar, battery, temperature, rcs } = systems;
  const surplus = solar - limits.demand;
  const batteryLow = battery < limits.batteryCapacity * 0.25;
  const overheating = limits.heatLoad > limits.heatRejection;
  const rcsLow = rcs < limits.rcsStart * 0.2;

  let powerStatus = `Panels cover the load with ${format(surplus, 2)} kW to spare.`;
  if (surplus < 0) {
    powerStatus = battery > 0
      ? `Panels ${format(-surplus, 2)} kW short: battery draining, about ${format(battery / -surplus, 1)} h left.`
      : "Battery flat.";
  }

  return (
    <div className="flight-stats cruise-stats">
      <h2 className="rocket-stats__title">Cruise systems</h2>

      <section className="flight-stats__group" aria-label="Trip">
        <h3 className="flight-stats__group-title">Trip</h3>
        <dl className="flight-stats__grid">
          <Stat label="Day" value={format(day)} unit="" />
          <Stat label="From the Sun" value={format(au, 3)} unit="AU" />
          <Stat label="To Mars" value={marsDistance === null ? "—" : format(marsDistance / 1e9, 1)} unit="million km" />
          <Stat label="Sunlight" value={format(100 / (au * au))} unit="% of Earth's" />
        </dl>
      </section>

      <Group
        title="Power"
        meter={{ label: "Battery charge", value: battery, max: limits.batteryCapacity }}
        alert={batteryLow || surplus < 0}
        status={powerStatus}
      >
        <Stat label="Solar output" value={format(solar, 2)} unit="kW" />
        <Stat label="Demand" value={format(limits.demand, 1)} unit="kW" />
        <Stat label="Battery" value={`${format(battery, 1)} / ${format(limits.batteryCapacity)}`} unit="kWh" />
      </Group>

      <Group
        title="Thermal"
        meter={{ label: "Cabin temperature", value: temperature, max: limits.cabinMax }}
        alert={overheating}
        status={
          overheating
            ? `Radiators ${format(limits.heatLoad - limits.heatRejection, 1)} kW short: the cabin is heating up (limit ${limits.cabinMax} °C).`
            : `Radiators hold the cabin at ${limits.cabinNominal} °C.`
        }
      >
        <Stat label="Cabin" value={format(temperature, 1)} unit="°C" />
        <Stat label="Heat load" value={format(limits.heatLoad, 1)} unit="kW" />
        <Stat label="Radiators" value={format(limits.heatRejection, 1)} unit="kW" />
      </Group>

      <Group
        title="RCS"
        meter={{ label: "RCS Δv left", value: rcs, max: limits.rcsStart || 1 }}
        alert={rcsLow}
        status={rcsLow ? "RCS running low: attitude trims are using the last of it." : "Small trims keep the panels pointed at the Sun."}
      >
        <Stat label="Δv left" value={format(rcs, 2)} unit="m/s" />
        <Stat label="After docking" value={format(limits.rcsStart, 2)} unit="m/s" />
      </Group>
    </div>
  );
};

export default CruiseStats;
