import { Info } from "../InfoTip/InfoTip.jsx";
import "./FailureReport.css";

// Centred red panel for a failed mission: the "Mission Failed!" header, what went wrong
// (`reason`, `detail`), a short `summary` of the flight ([{ label, value, info }], `info` an
// optional glossary key for a "?"), a `tip`,
// and buttons to retry and to go back and redesign (`retryLabel`, `redesignLabel`; by
// default the launch and the rocket).
const FailureReport = ({
  reason,
  detail,
  tip,
  summary,
  onRetry,
  onRedesign,
  retryLabel = "Retry launch",
  redesignLabel = "Redesign rocket",
}) => (
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
          {summary.map(({ label, value, info }) => (
            <div key={label} className="failure-report__stat">
              <dt>
                {label}
                {info && <Info topic={info} />}
              </dt>
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
          ← {redesignLabel}
        </button>
        <button type="button" className="failure-report__primary" onClick={onRetry}>
          {retryLabel} ↻
        </button>
      </div>
    </div>
  </section>
);

export default FailureReport;
