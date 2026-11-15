import "./FlightControls.css";

// Left half of the flight panel: a heading, a status line, then the control cards
// (passed as children) side by side. Wrap cards in `.flight-controls__column` to stack
// them in one column. `note`, when given, replaces the usual status line; `title`
// replaces the heading.
const statusText = (launched) =>
  launched
    ? "Engines lit. Controls act immediately."
    : "Countdown in progress. Set the throttle and pitch rate now; they take effect at T−0.";

const FlightControls = ({ launched, note, title = "Flight controls", children }) => (
  <div className="flight-controls">
    <h2 className="flight-controls__title">{title}</h2>
    <p className="flight-controls__status">{note ?? statusText(launched)}</p>
    <div className="flight-controls__cards">{children}</div>
  </div>
);

export default FlightControls;
