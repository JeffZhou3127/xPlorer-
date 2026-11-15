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

// `stats` comes from computeSpacecraftStats or computeLanderStats, including the list of
// requirements to show; `name` labels the vehicle's mass.
const SpacecraftStats = ({ stats, budget, name = "Spacecraft" }) => {
  const overBudget = stats.totalCost - budget;

  return (
    <div className="rocket-stats">
      <h2 className="rocket-stats__title">Stats</h2>

      <dl className="rocket-stats__grid rocket-stats__totals">
        <Stat label={`${name} mass`} info="spacecraftMass" value={format(stats.totalMass, 2)} unit="t" />
        <Stat
          label="Solar power (Earth)"
          info="solarPanels"
          value={format(stats.solarEarth, 1)}
          unit="kW"
        />
        <Stat label="RCS Δv" info="rcsDeltaV" value={format(stats.rcsDeltaV)} unit="m/s" />
        {stats.landerDeltaV !== undefined && (
          <Stat label="Lander Δv" info="landerFuel" value={format(stats.landerDeltaV)} unit="m/s" />
        )}
      </dl>

      {stats.requirements.map((requirement) => (
        <Requirement key={requirement.label} {...requirement} />
      ))}

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
