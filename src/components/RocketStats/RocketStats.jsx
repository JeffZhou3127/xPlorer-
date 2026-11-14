import { useId } from "react";
import {
  ALTITUDE_RANGE_KM,
  ORBIT_ALTITUDE_KM,
  ORBIT_DELTA_V,
  PAYLOAD_MASS,
} from "../../utils/rocketPhysics.js";
import { GLOSSARY } from "../../utils/glossary.js";
import InfoTip from "../InfoTip/InfoTip.jsx";
import "./RocketStats.css";

const format = (value, digits = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Costs are in millions of dollars.
const money = (value) => `$${format(value, 1)}M`;

// Progress bar toward a target; turns red when `over` is set.
const Meter = ({ label, value, max, over = false }) => (
  <div
    className="rocket-stats__bar"
    role="meter"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-valuenow={Math.round(value)}
  >
    <div
      className={`rocket-stats__bar-fill ${over ? "rocket-stats__bar-fill--over" : ""}`}
      style={{ width: `${Math.min(1, value / max) * 100}%` }}
    />
  </div>
);

const Info = ({ topic }) => <InfoTip term={GLOSSARY[topic].term}>{GLOSSARY[topic].text}</InfoTip>;

const Stat = ({ label, info, value, unit }) => (
  <div className="rocket-stats__stat">
    <dt>
      {label}
      {info && <Info topic={info} />}
    </dt>
    <dd>
      {value} <span className="rocket-stats__unit">{unit}</span>
    </dd>
  </div>
);

const StageStats = ({ number, altitude, stats, onAltitudeChange }) => {
  const altitudeId = useId();

  return (
    <section className="rocket-stats__stage" aria-label={`Stage ${number} statistics`}>
      <h3 className="rocket-stats__stage-title">Stage {number}</h3>

      <div className="rocket-stats__label-row">
        <label className="rocket-stats__label" htmlFor={altitudeId}>
          Operating altitude: <strong>{altitude} km</strong>
        </label>
        <Info topic="altitude" />
      </div>
      <input
        id={altitudeId}
        type="range"
        className="rocket-stats__slider"
        min={ALTITUDE_RANGE_KM.min}
        max={ALTITUDE_RANGE_KM.max}
        value={altitude}
        onChange={(e) => onAltitudeChange(Number(e.target.value))}
      />

      <dl className="rocket-stats__grid">
        <Stat label="Δv" info="deltaV" value={format(stats.deltaV)} unit="m/s" />
        <Stat label="Isp at altitude" info="isp" value={format(stats.isp)} unit="s" />
        <Stat label="Burn time" info="burnTime" value={format(stats.burnTime)} unit="s" />
        <Stat
          label="Wet / dry mass"
          info="mass"
          value={`${format(stats.wetMass, 1)} / ${format(stats.dryMass, 1)}`}
          unit="t"
        />
        <Stat label="Cost" info="cost" value={money(stats.cost)} unit="" />
      </dl>
    </section>
  );
};

// The boosters fire from the pad, so they have no altitude setting.
const SrbStats = ({ stats }) => (
  <section className="rocket-stats__stage" aria-label="Solid rocket booster statistics">
    <div className="rocket-stats__label-row">
      <h3 className="rocket-stats__stage-title">SRBs</h3>
      <Info topic="srbs" />
    </div>

    <dl className="rocket-stats__grid">
      <Stat label="Δv" info="deltaV" value={format(stats.deltaV)} unit="m/s" />
      <Stat label="Average Isp" info="isp" value={format(stats.isp)} unit="s" />
      <Stat label="Burn time" info="burnTime" value={format(stats.burnTime)} unit="s" />
      <Stat
        label="Wet / dry mass"
        info="mass"
        value={`${format(stats.wetMass, 1)} / ${format(stats.dryMass, 1)}`}
        unit="t"
      />
      <Stat label="Cost" info="cost" value={money(stats.cost)} unit="" />
    </dl>
  </section>
);

const RocketStats = ({ stages, stats, budget, onAltitudeChange, onContinue }) => {
  // Only the budget is a hard requirement; the Δv meters are guidance for the designer.
  const overBudget = stats.totalCost - budget;
  const canContinue = overBudget <= 0;
  const blockedReason = `The design is ${money(overBudget)} over budget.`;

  return (
    <div className="rocket-stats">
      <h2 className="rocket-stats__title">Stats</h2>

      <dl className="rocket-stats__grid rocket-stats__totals">
        <Stat label="Total Δv" info="totalDeltaV" value={format(stats.totalDeltaV)} unit="m/s" />
        <Stat label="Liftoff mass" info="liftoffMass" value={format(stats.liftoffMass, 1)} unit="t" />
        <Stat
          label="Liftoff thrust-to-weight"
          info="liftoffThrustToWeight"
          value={format(stats.liftoffThrustToWeight, 2)}
          unit=""
        />
        <Stat label="Payload" info="payload" value={format(PAYLOAD_MASS)} unit="t" />
      </dl>

      <div className="rocket-stats__orbit">
        <div className="rocket-stats__label">
          Low Earth orbit ({ORBIT_ALTITUDE_KM} km) needs about {format(ORBIT_DELTA_V)} m/s
        </div>
        <Meter label="Total delta-v compared with orbit" value={stats.totalDeltaV} max={ORBIT_DELTA_V} />
        <p className="rocket-stats__note">
          This is an estimate of the minimum Δv required; a real rocket may need more.
        </p>
        <p className="rocket-stats__note">
          The spacecraft refuels at a station in orbit before heading to Mars, so the rocket
          only needs to reach orbit.
          <Info topic="refuelingStation" />
        </p>
      </div>

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
          over={overBudget > 0}
        />
      </div>

      {/* Top stage first, matching the diagram and the design panel. */}
      {stages.toReversed().map((stage, i) => {
        const index = stages.length - 1 - i;
        return (
          <StageStats
            key={stage.id}
            number={index + 1}
            altitude={stage.altitude}
            stats={stats.stages[index]}
            onAltitudeChange={(altitude) => onAltitudeChange(stage.id, altitude)}
          />
        );
      })}

      {stats.srbs && <SrbStats stats={stats.srbs} />}

      <div className="rocket-stats__continue">
        {/* aria-disabled rather than disabled, so the button can still be hovered and
            focused to show why it is unavailable. */}
        <button
          type="button"
          className="rocket-stats__continue-button"
          aria-disabled={!canContinue}
          aria-describedby={canContinue ? undefined : "rocket-stats-blocked"}
          onClick={canContinue ? onContinue : undefined}
        >
          Continue →
        </button>
        {!canContinue && (
          <span className="rocket-stats__continue-tip" id="rocket-stats-blocked" role="tooltip">
            {blockedReason}
          </span>
        )}
      </div>
    </div>
  );
};

export default RocketStats;
