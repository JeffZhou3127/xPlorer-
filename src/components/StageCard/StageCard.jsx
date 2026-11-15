import { useId } from "react";
import {
  ENGINE_CYCLES,
  EXPANSION_RATIO_RANGE,
  GAS_GENERATOR_VARIANTS,
  PROPELLANTS,
} from "../../utils/rocketPhysics.js";
import { GLOSSARY } from "../../utils/glossary.js";
import InfoTip from "../InfoTip/InfoTip.jsx";
import "./StageCard.css";

// Field label with an optional "?" explanation. The tip sits outside the <label>
// so its text doesn't become part of the input's accessible name.
const FieldLabel = ({ htmlFor, label, info }) => (
  <div className="stage-card__label-row">
    <label className="stage-card__label" htmlFor={htmlFor}>
      {label}
    </label>
    {info && <InfoTip term={GLOSSARY[info].term}>{GLOSSARY[info].text}</InfoTip>}
  </div>
);

// Slider with a matching number box.
export const RangeField = ({ label, info, ariaLabel, min, max, value, onChange }) => {
  const id = useId();
  const clamp = (v) => Math.min(max, Math.max(min, v));

  return (
    <div className="stage-card__field">
      <FieldLabel htmlFor={id} label={label} info={info} />
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

export const SelectField = ({ label, info, value, options, onChange }) => {
  const id = useId();

  return (
    <div className="stage-card__field">
      <FieldLabel htmlFor={id} label={label} info={info} />
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

const StageCard = ({
  number,
  stage,
  minFuel,
  maxFuel,
  minEngines,
  maxEngines,
  canRemove,
  onChange,
  onRemove,
}) => (
  <fieldset className="stage-card">
    <legend className="stage-card__title">Stage {number}</legend>

    <SelectField
      label="Fuel type"
      info="propellant"
      value={stage.propellant}
      options={PROPELLANTS}
      onChange={(propellant) => onChange({ propellant })}
    />

    <RangeField
      info="fuel"
      label={`Fuel amount (tonnes, ${minFuel}–${maxFuel})`}
      ariaLabel={`Stage ${number} fuel amount in tonnes`}
      min={minFuel}
      max={maxFuel}
      value={stage.fuel}
      onChange={(fuel) => onChange({ fuel })}
    />

    <SelectField
      label="Engine cycle"
      info="cycle"
      value={stage.cycle}
      options={ENGINE_CYCLES}
      onChange={(cycle) => onChange({ cycle })}
    />

    {stage.cycle === "gas-generator" && (
      <SelectField
        label="Gas generator exhaust"
        info="gasGenerator"
        value={stage.gasGenerator}
        options={GAS_GENERATOR_VARIANTS}
        onChange={(gasGenerator) => onChange({ gasGenerator })}
      />
    )}

    <RangeField
      info="expansionRatio"
      label={`Nozzle expansion ratio (${EXPANSION_RATIO_RANGE.min}–${EXPANSION_RATIO_RANGE.max})`}
      ariaLabel={`Stage ${number} nozzle expansion ratio`}
      min={EXPANSION_RATIO_RANGE.min}
      max={EXPANSION_RATIO_RANGE.max}
      value={stage.expansionRatio}
      onChange={(expansionRatio) => onChange({ expansionRatio })}
    />

    <RangeField
      info="engines"
      label={`Engines (${minEngines}–${maxEngines})`}
      ariaLabel={`Stage ${number} engine count`}
      min={minEngines}
      max={maxEngines}
      value={stage.engines}
      onChange={(engines) => onChange({ engines })}
    />

    {canRemove && (
      <button type="button" className="stage-card__remove" onClick={onRemove}>
        Remove stage
      </button>
    )}
  </fieldset>
);

export default StageCard;
