import { Info } from "../InfoTip/InfoTip.jsx";
import "./ViewSwitch.css";

// Row of toggle buttons choosing one of `options` ({ value, label }). `info` (optional,
// a glossary key) adds a "?" explanation after the buttons.
const ViewSwitch = ({ label, info, options, value, onChange }) => (
  <div className="view-switch" role="group" aria-label={label}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className="view-switch__option"
        aria-pressed={option.value === value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
    {info && <Info topic={info} />}
  </div>
);

export default ViewSwitch;
