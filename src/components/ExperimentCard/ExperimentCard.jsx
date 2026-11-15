import { useId } from "react";
import { RangeField, SelectField } from "../StageCard/StageCard.jsx";
import { Info } from "../InfoTip/InfoTip.jsx";
import "./ExperimentCard.css";

// The data quality bar, green once it reaches `pass`.
const QualityBar = ({ quality, pass }) => (
  <div className="experiment-card__quality">
    <div className="experiment-card__quality-row">
      <span>
        Data quality
        <Info topic="dataQuality" />
      </span>
      <strong>{quality}%</strong>
    </div>
    <div
      className="experiment-card__bar"
      role="meter"
      aria-label="Data quality"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={quality}
    >
      <div
        className={`experiment-card__fill ${quality >= pass ? "experiment-card__fill--pass" : ""}`}
        style={{ width: `${quality}%` }}
      />
      <div className="experiment-card__pass" style={{ left: `${pass}%` }} />
    </div>
  </div>
);

// One science experiment: what it measures, a field per setting in `experiment.params`
// (values in `values`, changes via `onChange(key, value)`), a Run button, and the last
// run's `result` ({ quality, findings, summary, hint }). `running` shows the instrument
// collecting data; `stale` notes that the settings changed since the result; `complete`
// (a run reached `pass` quality at some point) turns the card green.
const ExperimentCard = ({ number, experiment, values, onChange, onRun, running, result, stale, complete, pass }) => {
  const titleId = useId();
  const { title, instrument, description, params } = experiment;

  return (
    <section
      className={`experiment-card ${complete ? "experiment-card--complete" : ""}`}
      aria-labelledby={titleId}
    >
      <header className="experiment-card__header">
        <span className="experiment-card__number">{String(number).padStart(2, "0")}</span>
        <div>
          <h2 className="experiment-card__title" id={titleId}>
            {title}
          </h2>
          <p className="experiment-card__instrument">{instrument}</p>
        </div>
        {complete && <span className="experiment-card__badge">Complete</span>}
      </header>

      <p className="experiment-card__description">{description}</p>

      <div className="experiment-card__params">
        {params.map((param) =>
          param.type === "select" ? (
            <SelectField
              key={param.key}
              label={param.label}
              info={param.info}
              value={values[param.key]}
              options={param.options}
              onChange={(v) => onChange(param.key, v)}
            />
          ) : (
            <RangeField
              key={param.key}
              label={`${param.label} (${param.unit}, ${param.min}–${param.max})`}
              ariaLabel={`${title}: ${param.label} in ${param.unit}`}
              info={param.info}
              min={param.min}
              max={param.max}
              value={values[param.key]}
              onChange={(v) => onChange(param.key, v)}
            />
          ),
        )}
      </div>

      <button type="button" className="experiment-card__run" onClick={onRun} disabled={running}>
        {running ? "Collecting data…" : result ? "Run again" : "Run experiment"}
      </button>

      <div className="experiment-card__result" aria-live="polite">
        {running && <div className="experiment-card__scan" aria-hidden="true" />}
        {!running && result && (
          <div className={stale ? "experiment-card__result--stale" : ""}>
            <QualityBar quality={result.quality} pass={pass} />
            <dl className="experiment-card__findings">
              {result.findings.map(({ label, value }) => (
                <div key={label} className="experiment-card__finding">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="experiment-card__summary">{result.summary}</p>
            {result.hint && result.quality < 100 && <p className="experiment-card__hint">{result.hint}</p>}
            {stale && <p className="experiment-card__stale">Settings changed since this run.</p>}
          </div>
        )}
      </div>
    </section>
  );
};

export default ExperimentCard;
