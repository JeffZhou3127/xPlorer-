import { RangeField } from "../StageCard/StageCard.jsx";
import "../StageCard/StageCard.css";
import "./SrbCard.css";

// Strap-on solid rocket boosters. The only setting is how much propellant they carry.
const SrbCard = ({ srbs, minFuel, maxFuel, onChange, onRemove }) => (
  <fieldset className="stage-card">
    <legend className="stage-card__title">SRBs</legend>
    <p className="srb-card__note">Two boosters on the sides of Stage 1, dropped once empty.</p>

    <RangeField
      info="srbFuel"
      label={`Fuel amount (tonnes, ${minFuel}–${maxFuel})`}
      ariaLabel="SRB fuel amount in tonnes"
      min={minFuel}
      max={maxFuel}
      value={srbs.fuel}
      onChange={(fuel) => onChange({ fuel })}
    />

    <button type="button" className="stage-card__remove" onClick={onRemove}>
      Remove SRBs
    </button>
  </fieldset>
);

export default SrbCard;
