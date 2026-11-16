import { Link } from "react-router";
import { Info } from "../InfoTip/InfoTip.jsx";
import "./MissionSuccess.css";

// The end of a mission: `scene` (a full-screen SVG animation, decorative) behind the
// "Mission success!" panel, which fades in after `delay` seconds with `text`, a short
// `summary` ([{ label, value, info }], `info` an optional glossary key for a "?") and a
// link back home.
const MissionSuccess = ({ scene, text, summary = [], delay = 4.6 }) => (
  <section className="mission-success" style={{ "--ms-delay": `${delay}s` }}>
    <div className="mission-success__scene" aria-hidden="true">
      {scene}
    </div>

    <div className="mission-success__panel" role="status">
      <h1 className="mission-success__title">Mission success!</h1>
      <p className="mission-success__text">{text}</p>
      {summary.length > 0 && (
        <dl className="mission-success__summary">
          {summary.map(({ label, value, info }) => (
            <div key={label} className="mission-success__stat">
              <dt>
                {label}
                {info && <Info topic={info} />}
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <Link to="/" className="mission-success__home">
        Back to home
      </Link>
    </div>
  </section>
);

export default MissionSuccess;
