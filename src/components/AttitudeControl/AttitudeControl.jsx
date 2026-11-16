import { Info } from "../InfoTip/InfoTip.jsx";
import "../ThrottleControl/ThrottleControl.css";
import "./AttitudeControl.css";

const OPTIONS = [
  { value: "prograde", label: "Face prograde" },
  { value: "retrograde", label: "Face retrograde" },
];

// Card of attitude buttons, styled like ThrottleControl: each points the spacecraft
// along (prograde) or against (retrograde) its direction of travel and holds it there.
// `value` is the selected direction (or null), `turning` true while the spacecraft is
// still swinging round to it.
const AttitudeControl = ({ value, onChange, turning }) => (
  <fieldset className="throttle-control attitude-control">
    <legend className="throttle-control__title">
      Attitude
      <Info topic="attitude" />
    </legend>
    {OPTIONS.map(({ value: option, label }) => (
      <div key={option} className="attitude-control__row">
        <button
          type="button"
          className="attitude-control__button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {label}
        </button>
        <Info topic={option} />
      </div>
    ))}
    <p className="throttle-control__note">
      {value === null && "Pointing radial out. Choose a direction to face."}
      {value !== null && (turning ? `Turning to ${value}…` : `Holding ${value}.`)}
    </p>
  </fieldset>
);

export default AttitudeControl;
