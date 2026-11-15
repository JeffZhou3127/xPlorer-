import { useId } from "react";
import "./ThrottleControl.css";

// Vertical throttle lever (0–100%, top = full) with an engine on/off button below it.
// Both act only on the liquid-fuelled engines of the active stage; SRBs can't be
// throttled or shut down. While the engines are off the lever is hidden; turning them
// back on brings it back at the setting it had.
// `locked` ({ title, detail }) holds the engines off for a while (e.g. coasting to
// apogee): the message replaces the lever and the restart button is disabled.
// `canShutDown` false (e.g. during the countdown) disables the shut-down button; the
// lever still works.
const ThrottleControl = ({
  throttle,
  onChange,
  enginesOn,
  onEnginesChange,
  hasSrbs,
  locked = null,
  canShutDown = true,
}) => {
  const id = useId();
  const running = enginesOn && !locked;

  return (
    <fieldset className="throttle-control">
      <legend className="throttle-control__title">Throttle</legend>

      {locked && (
        <p className="throttle-control__off throttle-control__off--locked">
          {locked.title}
          <span className="throttle-control__off-detail">{locked.detail}</span>
        </p>
      )}
      {running && (
        <div className="throttle-control__body">
          <div className="throttle-control__scale" aria-hidden="true">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
          <input
            id={id}
            type="range"
            className="throttle-control__slider"
            min={0}
            max={100}
            step={1}
            value={throttle}
            style={{ "--tc-fill": throttle / 100 }}
            aria-valuetext={`${throttle}% throttle`}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <div className="throttle-control__readout">
            <label className="throttle-control__label" htmlFor={id}>
              Liquid engines
            </label>
            <output className="throttle-control__value" htmlFor={id}>
              {throttle}%
            </output>
          </div>
        </div>
      )}
      {!locked && !running && <p className="throttle-control__off">Engines shut down</p>}

      <button
        type="button"
        className={`throttle-control__engines ${running ? "" : "throttle-control__engines--off"}`}
        aria-pressed={!running}
        disabled={Boolean(locked) || (running && !canShutDown)}
        onClick={() => onEnginesChange(!enginesOn)}
      >
        {running ? "Shut down engines" : "Restart engines"}
      </button>

      <p className="throttle-control__note">
        Only liquid-fuelled engines can throttle or shut down.
        {running && !canShutDown && " They can be shut down after liftoff."}
        {hasSrbs && " The SRBs burn at full thrust until they run out."}
      </p>
    </fieldset>
  );
};

export default ThrottleControl;
