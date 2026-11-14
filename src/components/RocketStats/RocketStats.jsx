import { useId } from "react";
import { ALTITUDE_RANGE_KM, ORBIT_DELTA_V, PAYLOAD_MASS } from "../../utils/rocketPhysics.js";
import "./RocketStats.css";

const format = (value, digits = 0) =>
  value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const Stat = ({ label, value, unit }) => (
  <div className="rocket-stats__stat">
    <dt>{label}</dt>
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

      <label className="rocket-stats__label" htmlFor={altitudeId}>
        Operating altitude: <strong>{altitude} km</strong>
      </label>
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
        <Stat label="Δv" value={format(stats.deltaV)} unit="m/s" />
        <Stat label="Isp at altitude" value={format(stats.isp)} unit="s" />
        <Stat label="Thrust-to-weight" value={format(stats.thrustToWeight, 2)} unit="" />
        <Stat label="Wet / dry mass" value={`${format(stats.wetMass, 1)} / ${format(stats.dryMass, 1)}`} unit="t" />
      </dl>
    </section>
  );
};

const RocketStats = ({ stages, stats, onAltitudeChange }) => {
  const orbitShare = Math.min(1, stats.totalDeltaV / ORBIT_DELTA_V);

  return (
    <div className="rocket-stats">
      <h2 className="rocket-stats__title">Stats</h2>

      <dl className="rocket-stats__grid rocket-stats__totals">
        <Stat label="Total Δv" value={format(stats.totalDeltaV)} unit="m/s" />
        <Stat label="Liftoff mass" value={format(stats.liftoffMass, 1)} unit="t" />
        <Stat label="Payload" value={format(PAYLOAD_MASS)} unit="t" />
      </dl>

      <div className="rocket-stats__orbit">
        <div className="rocket-stats__label">
          Low Earth orbit needs about {format(ORBIT_DELTA_V)} m/s
        </div>
        <div
          className="rocket-stats__bar"
          role="meter"
          aria-label="Total delta-v compared with orbit"
          aria-valuemin={0}
          aria-valuemax={ORBIT_DELTA_V}
          aria-valuenow={Math.round(stats.totalDeltaV)}
        >
          <div className="rocket-stats__bar-fill" style={{ width: `${orbitShare * 100}%` }} />
        </div>
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
    </div>
  );
};

export default RocketStats;
