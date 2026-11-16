import "./FlightControls.css";

// Left half of the flight panel: a heading, a status line, then the control cards
// (passed as children) side by side. Wrap cards in `.flight-controls__column` to stack
// them in one column. `note`, when given, replaces the usual status line; `title`
// replaces the heading. `onRedo`, when given, adds a Redo button beside the heading that
// starts the step over (views pass `useRedo()`).
const statusText = (launched) =>
  launched
    ? "Engines lit. Controls act immediately."
    : "Countdown in progress. Set the throttle and pitch rate now; they take effect at T−0.";

const FlightControls = ({ launched, note, title = "Flight controls", onRedo, children }) => (
  <div className="flight-controls">
    <div className="flight-controls__header">
      <h2 className="flight-controls__title">{title}</h2>
      {onRedo && (
        <button type="button" className="flight-controls__redo" onClick={onRedo} title="Start this step over">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M 13 8 A 5 5 0 1 1 11.5 4.5" />
            <path className="flight-controls__redo-head" d="M 12.5 1.5 L 12.5 5.5 L 8.5 5.5" />
          </svg>
          Redo
        </button>
      )}
    </div>
    <p className="flight-controls__status">{note ?? statusText(launched)}</p>
    <div className="flight-controls__cards">{children}</div>
  </div>
);

export default FlightControls;
