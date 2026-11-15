import "./LaunchAlert.css";

// Centred confirmation shown before launch: once the player continues, the spacecraft and
// rocket designs are final. Back returns to the designs while they can still be changed.
const LaunchAlert = ({ onBack, onContinue }) => (
  <section className="launch-alert">
    <div className="launch-alert__panel" role="alert" aria-labelledby="launch-alert-title">
      <h1 className="launch-alert__title" id="launch-alert-title">
        Ready to Launch?
      </h1>
      <p className="launch-alert__warning">
        <span className="launch-alert__icon" aria-hidden="true">
          ⚠
        </span>
        Once you continue, you can't go back to change your spacecraft or rocket design.
      </p>
      <div className="launch-alert__actions">
        <button type="button" className="launch-alert__back" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="launch-alert__continue" onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  </section>
);

export default LaunchAlert;
