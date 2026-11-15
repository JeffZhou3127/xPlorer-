import "./FailureReport.css";

// Centred red panel for a failed mission: the "Mission Failed!" header, what went wrong
// (`reason`, `detail`), a short `summary` of the flight ([{ label, value }]), a `tip`,
// and buttons to retry the launch or go back and redesign the rocket.
const FailureReport = ({ reason, detail, tip, summary, onRetry, onRedesign }) => (
  <section className="failure-report">
    <div className="failure-report__panel" role="alert" aria-labelledby="failure-report-title">
      <h1 className="failure-report__title" id="failure-report-title">
        Mission Failed!
      </h1>

      <div className="failure-report__explanation">
        <p className="failure-report__reason">{reason}</p>
        {detail && <p className="failure-report__detail">{detail}</p>}
      </div>

      {summary.length > 0 && (
        <dl className="failure-report__summary">
          {summary.map(({ label, value }) => (
            <div key={label} className="failure-report__stat">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="failure-report__tip">
        <span className="failure-report__tip-label">Tip</span>
        {tip}
      </p>

      <div className="failure-report__actions">
        <button type="button" className="failure-report__secondary" onClick={onRedesign}>
          ← Redesign rocket
        </button>
        <button type="button" className="failure-report__primary" onClick={onRetry}>
          Retry launch ↻
        </button>
      </div>
    </div>
  </section>
);

export default FailureReport;
