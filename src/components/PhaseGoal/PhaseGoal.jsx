import { format } from "../../utils/format.js";
import "./PhaseGoal.css";

// One progress bar tracking `value` toward the `target` window ({ min, max }, in `unit`;
// the window is shaded on the bar, and the fill turns red past it).
// `value` may be null when there is nothing to show yet (e.g. no perigee): the bar is
// then empty and `valueText` explains why.
const GoalMeter = ({ label, value, valueText, target, unit }) => {
  // The bar runs a little past the window, so overshooting shows.
  const scale = target.max + (target.max - target.min) * 2;
  const at = (v) => `${Math.min(1, Math.max(0, v / scale)) * 100}%`;
  const over = value !== null && value > target.max;
  const shown = value === null ? valueText : format(value, 1);
  const range = `${target.min}–${target.max}`;

  return (
    <>
      <div
        className="phase-goal__bar"
        role="meter"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={Math.round(scale)}
        aria-valuenow={Math.round(Math.min(scale, Math.max(0, value ?? 0)))}
        aria-valuetext={`${shown} ${unit}, target ${range} ${unit}`}
      >
        <div
          className={`phase-goal__fill ${over ? "phase-goal__fill--over" : ""}`}
          style={{ width: at(value ?? 0) }}
        />
        <div
          className="phase-goal__window"
          style={{ left: at(target.min), width: `calc(${at(target.max)} - ${at(target.min)})` }}
        />
      </div>
      <p className="phase-goal__progress">
        {label} <strong>{shown}</strong> / target {range} {unit}
      </p>
    </>
  );
};

// The current goal for this phase of flight, under the pitch control: what to do, one
// bar per entry in `meters` ([{ label, value, valueText, target }], see GoalMeter, all in
// `unit`), a note, and, once `reached`, a green outline, `reachedText` and an optional
// `action` button ({ label, onClick }) for the next goal. `step`/`steps` number the goals
// ("Goal 1 of 2").
const PhaseGoal = ({ step, steps, goal, meters, unit, note, reached, reachedText, action }) => (
  <section
    className={`phase-goal ${reached ? "phase-goal--reached" : ""}`}
    aria-labelledby="phase-goal-title"
  >
    <h3 id="phase-goal-title" className="phase-goal__title">
      Phase goal {step} of {steps}
    </h3>
    <p className="phase-goal__goal">{goal}</p>

    {meters.map((meter) => (
      <GoalMeter key={meter.label} unit={unit} {...meter} />
    ))}

    <p className="phase-goal__status" role="status">
      {reached ? reachedText : note}
    </p>

    {reached && action && (
      <button type="button" className="phase-goal__action" onClick={action.onClick}>
        {action.label}
      </button>
    )}
  </section>
);

export default PhaseGoal;
