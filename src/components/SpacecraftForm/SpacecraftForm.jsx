import { RangeField } from "../StageCard/StageCard.jsx";
import SystemCard from "../SystemCard/SystemCard.jsx";
import {
  BATTERIES,
  RADIATORS,
  RCS_FUEL_RANGE_KG,
  SOLAR_PANELS,
} from "../../utils/spacecraftPhysics.js";
import "../StageCard/StageCard.css";
import "../SrbCard/SrbCard.css";
import "../RocketForm/RocketForm.css";

// Systems every spacecraft carries, in the order they are listed; the player picks each size.
const SYSTEMS = [
  {
    key: "solarPanels",
    title: "Solar panels",
    note: "Two wings that unfold from the sides of the service module.",
    options: SOLAR_PANELS,
  },
  {
    key: "batteries",
    title: "Batteries",
    note: "Packed inside the service module.",
    options: BATTERIES,
  },
  {
    key: "radiators",
    title: "Radiators",
    note: "Two panels near the base of the service module.",
    options: RADIATORS,
  },
];

// `design` is { solarPanels, batteries, radiators, rcsFuel }; each system is a size key.
const SpacecraftForm = ({ design, onChange }) => (
  <form className="rocket-form" onSubmit={(e) => e.preventDefault()}>
    <h2 className="rocket-form__title">Design</h2>
    <p className="rocket-form__hint">
      The command pod carries the crew. Choose the best size for each system on the service
      module beneath it: bigger gives more capacity but adds mass for the rocket to lift.
    </p>

    <div className="rocket-form__stages">
      <fieldset className="stage-card">
        <legend className="stage-card__title">RCS</legend>
        <p className="srb-card__note">Thrusters on the service module, fed from two tanks inside.</p>
        <RangeField
          info="rcsFuel"
          label={`Fuel amount (kg, ${RCS_FUEL_RANGE_KG.min}–${RCS_FUEL_RANGE_KG.max})`}
          ariaLabel="RCS fuel amount in kilograms"
          min={RCS_FUEL_RANGE_KG.min}
          max={RCS_FUEL_RANGE_KG.max}
          value={design.rcsFuel}
          onChange={(rcsFuel) => onChange({ rcsFuel })}
        />
      </fieldset>

      {SYSTEMS.map(({ key, title, note, options }) => (
        <SystemCard
          key={key}
          title={title}
          note={note}
          info={key}
          size={design[key]}
          options={options}
          onChange={(size) => onChange({ [key]: size })}
        />
      ))}
    </div>
  </form>
);

export default SpacecraftForm;
