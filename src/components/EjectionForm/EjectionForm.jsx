import { useId } from "react";
import { format } from "../../utils/format.js";
import { Info } from "../InfoTip/InfoTip.jsx";
import "./EjectionForm.css";

// A slider with a number box beside it. The number box accepts any value while typing and
// is clamped on blur. `info` (optional, a glossary key) adds a "?" after the label. Also
// used by ReentryForm.
export const Field = ({ label, info, hint, unit, range, value, disabled, onChange }) => {
  const id = useId();
  const clamp = (v) => Math.min(range.max, Math.max(range.min, v));
  return (
    <div className="ejection-form__field">
      <div className="ejection-form__label-row">
        <label className="ejection-form__label" htmlFor={id}>
          {label}
        </label>
        {info && <Info topic={info} />}
      </div>
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

// Propellant the burn needs (`needed`, t) against what the active stage holds
// (`available`, t). The bar spans whichever is larger: the stage's tank is marked with a
// tick, and the part of the burn past it shows red.
const FuelMeter = ({ needed, available, stageLabel }) => {
  const scale = Math.max(needed, available) || 1;
  const short = needed > available;
  const spare = available - needed;
  return (
    <div className={`ejection-form__meter ${short ? "ejection-form__meter--short" : ""}`}>
      <div className="ejection-form__meter-head">
        <span className="ejection-form__label-row">
          <span className="ejection-form__label">Propellant</span>
          <Info topic="burnPropellant" />
        </span>
        <span className="ejection-form__meter-value">
          {format(needed, 1)} / {format(available, 1)} t
        </span>
      </div>
      <div
        className="ejection-form__meter-bar"
        role="meter"
        aria-label={`Propellant needed against ${stageLabel} tank`}
        aria-valuemin={0}
        aria-valuemax={Math.round(available * 10) / 10}
        aria-valuenow={Math.round(needed * 10) / 10}
      >
        <div className="ejection-form__meter-tank" style={{ width: `${(available / scale) * 100}%` }} />
        <div
          className="ejection-form__meter-fill"
          style={{ width: `${(Math.min(needed, available) / scale) * 100}%` }}
        />
        {short && (
          <div
            className="ejection-form__meter-over"
            style={{ left: `${(available / scale) * 100}%`, width: `${((needed - available) / scale) * 100}%` }}
          />
        )}
      </div>
      <p className="ejection-form__meter-caption">
        {short
          ? `${format(-spare, 1)} t more than ${stageLabel} holds`
          : `${format(spare, 1)} t left in ${stageLabel} after the burn (${Math.round((spare / (available || 1)) * 100)}%)`}
      </p>
    </div>
  );
};

export const Readout = ({ label, info, value, alert = false }) => (
  <div className={`ejection-form__readout ${alert ? "ejection-form__readout--alert" : ""}`}>
    <dt>
      {label}
      {info && <Info topic={info} />}
    </dt>
    <dd>{value}</dd>
  </div>
);

// The ejection burn form: the burn's direction (`angle`, degrees from the direction `origin`
// ("Earth" or "Mars") moves along its orbit, or the opposite direction when `retrograde`)
// and size (`burn`, m/s), what that gives (`vInf`, m/s or null if `origin` isn't escaped)
// against what the active stage has (`available`, m/s, `stageLabel`) with a meter of the
// propellant that takes (`propellant`: { needed, available }, t), and the Eject button at
// the bottom. Eject is greyed out with
// `blockedReason` shown under it when the burn can't be made; `locked` freezes the form
// once the burn is done.
const EjectionForm = ({
  origin = "Earth",
  retrograde = false,
  angle,
  burn,
  angleRange,
  burnRange,
  onAngleChange,
  onBurnChange,
  vInf,
  available,
  propellant,
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
    <h3 className="ejection-form__title">
      Ejection burn
      <Info topic="ejectionBurn" />
    </h3>
    <Field
      label="Burn angle"
      info="burnAngle"
      hint={
        retrograde
          ? `Against the direction ${origin} moves along its orbit: 0° is straight back, + points outward (away from the Sun).`
          : `From the direction ${origin} moves along its orbit: 0° is straight ahead, + points outward (away from the Sun).`
      }
      unit="°"
      range={angleRange}
      value={angle}
      disabled={locked}
      onChange={onAngleChange}
    />
    <Field
      label="Burn Δv"
      info="burnDeltaV"
      hint="Velocity added by the burn, made from the parking orbit."
      unit="m/s"
      range={burnRange}
      value={burn}
      disabled={locked}
      onChange={onBurnChange}
    />

    <FuelMeter needed={propellant.needed} available={propellant.available} stageLabel={stageLabel} />

    <dl className="ejection-form__readouts">
      <Readout label="Required Δv" value={`${format(burn)} m/s`} alert={burn > available} />
      <Readout label={`${stageLabel} Δv available`} info="deltaV" value={`${format(Math.floor(available))} m/s`} />
      <Readout
        label="Departure speed (v∞)"
        info="vInf"
        value={vInf === null ? `Doesn't escape ${origin}` : `${format(vInf / 1000, 2)} km/s`}
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
