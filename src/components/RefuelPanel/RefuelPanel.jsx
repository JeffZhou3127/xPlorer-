import "./RefuelPanel.css";

// Full-screen refueling layout: `title` on top, then `left` (the spacecraft's gauges), the
// drawing (`children`) and `right` (the depot's gauges) side by side, and `status` with an
// optional `action` button ({ label, onClick }) underneath.
const RefuelPanel = ({ title, left, right, status, action, children }) => (
  <main className="refuel-panel">
    <h1 className="refuel-panel__title">{title}</h1>
    <div className="refuel-panel__side">{left}</div>
    <div className="refuel-panel__view">{children}</div>
    <div className="refuel-panel__side">{right}</div>
    <footer className="refuel-panel__footer">
      <p className="refuel-panel__status" aria-live="polite">
        {status}
      </p>
      {action && (
        <button type="button" className="refuel-panel__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </footer>
  </main>
);

export default RefuelPanel;
