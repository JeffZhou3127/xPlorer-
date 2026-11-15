import "./FuelGauges.css";

// Low-fuel warning threshold (fraction of a full load).
const LOW_FUEL = 0.15;

// Vertical fuel bars, one per entry in `gauges` ({ key, label, fraction }).
const FuelGauges = ({ gauges }) => (
  <section className="fuel-gauges" aria-label="Fuel remaining">
    <h2 className="fuel-gauges__title">Fuel</h2>
    <div className="fuel-gauges__row">
      {gauges.map(({ key, label, fraction }) => {
        const percent = Math.round(fraction * 100);
        return (
          <div key={key} className="fuel-gauges__gauge">
            <div
              className="fuel-gauges__bar"
              role="meter"
              aria-label={`${label} fuel`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div
                className={`fuel-gauges__fill ${fraction < LOW_FUEL ? "fuel-gauges__fill--low" : ""}`}
                style={{ height: `${fraction * 100}%` }}
              />
            </div>
            <span className="fuel-gauges__percent">{percent}%</span>
            <span className="fuel-gauges__label">{label}</span>
          </div>
        );
      })}
    </div>
  </section>
);

export default FuelGauges;
