import { useId } from "react";
import { format } from "../../utils/format.js";
import "./PitchControl.css";

// Describes a signed rate, e.g. "2.5°/s right" or "Holding".
const describeRate = (rate) =>
  rate === 0 ? "Holding attitude" : `${format(Math.abs(rate), 1)}°/s ${rate < 0 ? "left" : "right"}`;

// Pitch-rate slider. The slider sets how fast the rocket turns, not its angle:
// the centre holds the current attitude, the ends turn it at `maxRate` degrees per second.
const PitchControl = ({ rate, maxRate, onChange }) => {
  const id = useId();
  const ticksId = useId();
  // The filled part of the track runs from the centre (0) to the thumb, as fractions of
  // the track; the CSS turns them into gradient stops.
  const position = (rate + maxRate) / (2 * maxRate);
  const fill = { "--pc-from": Math.min(0.5, position), "--pc-to": Math.max(0.5, position) };

  return (
    <fieldset className="pitch-control">
      <legend className="pitch-control__title">Pitch control</legend>

      <div className="pitch-control__label-row">
        <label className="pitch-control__label" htmlFor={id}>
          Pitch rate
        </label>
        <output className="pitch-control__readout" htmlFor={id}>
          {describeRate(rate)}
        </output>
      </div>

      <input
        id={id}
        type="range"
        className="pitch-control__slider"
        min={-maxRate}
        max={maxRate}
        step={0.1}
        value={rate}
        list={ticksId}
        style={fill}
        aria-valuetext={describeRate(rate)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <datalist id={ticksId}>
        {[-maxRate, -maxRate / 2, 0, maxRate / 2, maxRate].map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <div className="pitch-control__scale" aria-hidden="true">
        <span>◀ {maxRate}°/s left</span>
        <span>0</span>
        <span>{maxRate}°/s right ▶</span>
      </div>

      <button
        type="button"
        className="pitch-control__hold"
        onClick={() => onChange(0)}
        disabled={rate === 0}
      >
        Hold attitude (0°/s)
      </button>

      <p className="pitch-control__note">
        The slider sets how fast the rocket turns, not which way it points. Centre it to stop
        turning and hold the current angle.
      </p>
    </fieldset>
  );
};

export default PitchControl;
