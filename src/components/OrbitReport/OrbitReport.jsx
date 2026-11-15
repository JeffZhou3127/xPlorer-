import "./OrbitReport.css";

// Centred green panel for a successful orbit: the "Orbited Reached!" header, one
// paragraph per entry in `paragraphs` (text or elements, e.g. with InfoTips), and a Continue button when `onContinue` is passed.
const OrbitReport = ({ paragraphs, onContinue }) => (
  <section className="orbit-report">
    <div className="orbit-report__panel" role="status" aria-labelledby="orbit-report-title">
      <h1 className="orbit-report__title" id="orbit-report-title">
        Orbited Reached!
      </h1>
      <div className="orbit-report__body">
        {paragraphs.map((content, i) => (
          // The paragraphs are fixed, so their order is a stable key.
          <p key={i} className="orbit-report__text">
            {content}
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
