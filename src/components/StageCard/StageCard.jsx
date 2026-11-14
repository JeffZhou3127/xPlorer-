import { useId } from "react";
import {
  ENGINE_COUNT_RANGE,
  ENGINE_CYCLES,
  EXPANSION_RATIO_RANGE,
  GAS_GENERATOR_VARIANTS,
  PROPELLANTS,
} from "../../utils/rocketPhysics.js";
import "./StageCard.css";

// Slider with a matching number box.
const RangeField = ({ label, ariaLabel, min, max, value, onChange }) => {
  const id = useId();
  const clamp = (v) => Math.min(max, Math.max(min, v));

  return (
    <div className="stage-card__field">
      <label className="stage-card__label" htmlFor={id}>
        {label}
      </label>
      <div className="stage-card__range">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          type="number"
          className="stage-card__number"
          aria-label={ariaLabel}
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            // Allow partial values while typing (e.g. "2" on the way to "250");
            // the minimum is enforced on blur.
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(0, v)));
          }}
          onBlur={() => onChange(clamp(value))}
        />
      </div>
    </div>
  );
};

const SelectField = ({ label, value, options, onChange }) => {
  const id = useId();

  return (
    <div className="stage-card__field">
      <label className="stage-card__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="stage-card__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {Object.entries(options).map(([key, option]) => (
          <option key={key} value={key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const StageCard = ({ number, stage, minFuel, maxFuel, canRemove, onChange, onRemove }) => (
  <fieldset className="stage-card">
    <legend className="stage-card__title">Stage {number}</legend>

    <RangeField
      label={`Fuel amount (tonnes, ${minFuel}–${maxFuel})`}
      ariaLabel={`Stage ${number} fuel amount in tonnes`}
      min={minFuel}
      max={maxFuel}
      value={stage.fuel}
      onChange={(fuel) => onChange({ fuel })}
    />

    <SelectField
      label="Fuel type"
      value={stage.propellant}
      options={PROPELLANTS}
      onChange={(propellant) => onChange({ propellant })}
    />

    <SelectField
      label="Engine cycle"
      value={stage.cycle}
      options={ENGINE_CYCLES}
      onChange={(cycle) => onChange({ cycle })}
    />

    <RangeField
      label={`Engines (${ENGINE_COUNT_RANGE.min}–${ENGINE_COUNT_RANGE.max})`}
      ariaLabel={`Stage ${number} engine count`}
      min={ENGINE_COUNT_RANGE.min}
      max={ENGINE_COUNT_RANGE.max}
      value={stage.engines}
      onChange={(engines) => onChange({ engines })}
    />

    {stage.cycle === "gas-generator" && (
      <SelectField
        label="Gas generator exhaust"
        value={stage.gasGenerator}
        options={GAS_GENERATOR_VARIANTS}
        onChange={(gasGenerator) => onChange({ gasGenerator })}
      />
    )}

    <RangeField
      label={`Nozzle expansion ratio (${EXPANSION_RATIO_RANGE.min}–${EXPANSION_RATIO_RANGE.max})`}
      ariaLabel={`Stage ${number} nozzle expansion ratio`}
      min={EXPANSION_RATIO_RANGE.min}
      max={EXPANSION_RATIO_RANGE.max}
      value={stage.expansionRatio}
      onChange={(expansionRatio) => onChange({ expansionRatio })}
    />

    {canRemove && (
      <button type="button" className="stage-card__remove" onClick={onRemove}>
        Remove stage
      </button>
    )}
  </fieldset>
);

export default StageCard;
