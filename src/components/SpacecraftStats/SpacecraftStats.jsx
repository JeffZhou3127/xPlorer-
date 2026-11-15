import {
  BATTERY_BACKUP_HOURS,
  BATTERY_TARGET_KWH,
  HEAT_LOAD_KW,
  POWER_DEMAND_KW,
  RCS_DELTA_V_TARGET,
} from "../../utils/spacecraftPhysics.js";
import { format, money } from "../../utils/format.js";
import { Info, Meter, Stat } from "../RocketStats/RocketStats.jsx";
import "../RocketStats/RocketStats.css";

// A system requirement: how much the design provides against what it needs.
// The bar turns red until the requirement is met.
const Requirement = ({ label, info, value, target, unit, digits = 1, note }) => (
  <div className="rocket-stats__orbit">
    <div className="rocket-stats__label-row">
      <div className="rocket-stats__label">
        {label}: <strong>{format(value, digits)}</strong> of {format(target, digits)} {unit} needed
      </div>
      <Info topic={info} />
    </div>
    <Meter label={`${label} compared with requirement`} value={value} max={target} alert={value < target} />
    {note && <p className="rocket-stats__note">{note}</p>}
  </div>
);

const SpacecraftStats = ({ stats, budget }) => {
  const overBudget = stats.totalCost - budget;

  return (
    <div className="rocket-stats">
      <h2 className="rocket-stats__title">Stats</h2>

      <dl className="rocket-stats__grid rocket-stats__totals">
        <Stat label="Spacecraft mass" info="spacecraftMass" value={format(stats.totalMass, 2)} unit="t" />
        <Stat
          label="Solar power (Earth)"
          info="solarPanels"
          value={format(stats.solarEarth, 1)}
          unit="kW"
        />
        <Stat label="RCS Δv" info="rcsDeltaV" value={format(stats.rcsDeltaV)} unit="m/s" />
      </dl>

      <Requirement
        label="Power at Mars"
        info="powerAtMars"
        value={stats.solarMars}
        target={POWER_DEMAND_KW}
        unit="kW"
      />
      <Requirement
        label="Battery backup"
        info="batteryBackup"
        value={stats.batteryCapacity}
        target={BATTERY_TARGET_KWH}
        unit="kWh"
        digits={0}
        note={`Enough to run the spacecraft for ${BATTERY_BACKUP_HOURS} hours without sunlight.`}
      />
      <Requirement
        label="Heat rejection"
        info="heatRejection"
        value={stats.heatRejection}
        target={HEAT_LOAD_KW}
        unit="kW"
      />
      <Requirement
        label="RCS Δv"
        info="rcsDeltaV"
        value={stats.rcsDeltaV}
        target={RCS_DELTA_V_TARGET}
        unit="m/s"
        digits={0}
        note="Enough to dock with the refueling station and hold attitude on the way."
      />

      <div className="rocket-stats__orbit">
        <div className="rocket-stats__label-row">
          <div className="rocket-stats__label">
            Cost: <strong>{money(stats.totalCost)}</strong> of {money(budget)} budget
          </div>
          <Info topic="budget" />
        </div>
        <Meter
          label="Total cost compared with budget"
          value={stats.totalCost}
          max={budget}
          alert={overBudget > 0}
        />
      </div>

      <section className="rocket-stats__stage" aria-label="Mass and cost of each part">
        <h3 className="rocket-stats__stage-title">Parts</h3>
        <dl className="rocket-stats__grid">
          {stats.parts.map((part) => (
            <Stat
              key={part.name}
              label={part.name}
              info="spacecraftCost"
              value={`${format(part.mass, 2)} t · ${money(part.cost)}`}
              unit=""
            />
          ))}
        </dl>
      </section>
    </div>
  );
};

export default SpacecraftStats;
