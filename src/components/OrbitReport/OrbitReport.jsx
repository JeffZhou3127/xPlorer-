import "./OrbitReport.css";

// Centred green panel for a successful orbit: the "Orbited Reached!" header, one
// paragraph per entry in `paragraphs`, and a Continue button when `onContinue` is passed.
const OrbitReport = ({ paragraphs, onContinue }) => (
  <section className="orbit-report">
    <div className="orbit-report__panel" role="status" aria-labelledby="orbit-report-title">
      <h1 className="orbit-report__title" id="orbit-report-title">
        Orbited Reached!
      </h1>
      <div className="orbit-report__body">
        {paragraphs.map((text) => (
          <p key={text} className="orbit-report__text">
            {text}
          </p>
        ))}
      </div>
      {onContinue && (
        <button type="button" className="orbit-report__continue" onClick={onContinue}>
          Continue →
        </button>
      )}
    </div>
  </section>
);

export default OrbitReport;
