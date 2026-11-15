import { useId } from "react";
import { format } from "../../utils/format.js";
import "./EjectionForm.css";

// A slider with a number box beside it. The number box accepts any value while typing and
// is clamped on blur.
const Field = ({ label, hint, unit, range, value, disabled, onChange }) => {
  const id = useId();
  const clamp = (v) => Math.min(range.max, Math.max(range.min, v));
  return (
    <div className="ejection-form__field">
      <label className="ejection-form__label" htmlFor={id}>
        {label}
      </label>
      <p className="ejection-form__hint">{hint}</p>
      <div className="ejection-form__inputs">
        <input
          id={id}
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <input
          type="number"
          className="ejection-form__number"
          aria-label={`${label} (${unit})`}
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (e.target.value !== "" && !Number.isNaN(v)) onChange(v);
          }}
          onBlur={() => onChange(clamp(value))}
        />
        <span className="ejection-form__unit">{unit}</span>
      </div>
    </div>
  );
};

const Readout = ({ label, value, alert = false }) => (
  <div className={`ejection-form__readout ${alert ? "ejection-form__readout--alert" : ""}`}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

// The ejection burn form: the burn's direction (`angle`, degrees from the direction Earth
// moves along its orbit) and size (`burn`, m/s), what that gives (`vInf`, m/s or null if
// Earth isn't escaped) against what the active stage has (`available`, m/s,
// `stageLabel`), and the Eject button at the bottom. Eject is greyed out with
// `blockedReason` shown under it when the burn can't be made; `locked` freezes the form
// once the burn is done.
const EjectionForm = ({
  angle,
  burn,
  angleRange,
  burnRange,
  onAngleChange,
  onBurnChange,
  vInf,
  available,
  stageLabel,
  blockedReason,
  locked,
  onEject,
}) => (
  <form
    className="ejection-form"
    onSubmit={(e) => {
      e.preventDefault();
      if (!blockedReason && !locked) onEject();
    }}
  >
    <h3 className="ejection-form__title">Ejection burn</h3>
    <Field
      label="Burn angle"
      hint="From the direction Earth moves along its orbit: 0° is straight ahead, + points outward (away from the Sun)."
      unit="°"
      range={angleRange}
      value={angle}
      disabled={locked}
      onChange={onAngleChange}
    />
    <Field
      label="Burn Δv"
      hint="Velocity added by the burn, made from the parking orbit."
      unit="m/s"
      range={burnRange}
      value={burn}
      disabled={locked}
      onChange={onBurnChange}
    />

    <dl className="ejection-form__readouts">
      <Readout label="Required Δv" value={`${format(burn)} m/s`} alert={burn > available} />
      <Readout label={`${stageLabel} Δv available`} value={`${format(Math.floor(available))} m/s`} />
      <Readout
        label="Departure speed (v∞)"
        value={vInf === null ? "Doesn't escape Earth" : `${format(vInf / 1000, 2)} km/s`}
        alert={vInf === null}
      />
    </dl>

    <button type="submit" className="ejection-form__eject" disabled={Boolean(blockedReason) || locked}>
      Eject
    </button>
    {blockedReason && !locked && <p className="ejection-form__blocked">{blockedReason}</p>}
  </form>
);

export default EjectionForm;
