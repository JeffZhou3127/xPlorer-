import { SelectField } from "../StageCard/StageCard.jsx";
import "../StageCard/StageCard.css";
import "../SrbCard/SrbCard.css";

// A spacecraft system (solar panels, batteries or radiators) and its size.
const SystemCard = ({ title, note, info, size, options, onChange }) => (
  <fieldset className="stage-card">
    <legend className="stage-card__title">{title}</legend>
    <p className="srb-card__note">{note}</p>

    <SelectField label="Size" info={info} value={size} options={options} onChange={onChange} />
  </fieldset>
);

export default SystemCard;
