import { Link } from "react-router";
import "./MissionObjective.css";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// A mission's opening page: its name, the flight plan (`plan`, steps in order) and a
// Start Mission link to `startPath`, plus a link back to the home page. `video` loops behind the page under the home page's
// dark overlay, with `poster` (the mission's still image) shown until it plays; under
// reduced motion only the poster shows.
const MissionObjective = ({ name, plan, startPath, video, poster }) => {
  return (
    <div className="mission-objective-page">
      {video && (
        <div className="mission-objective__backdrop" aria-hidden="true">
          <video
            className="mission-objective__video"
            src={video}
            poster={poster}
            autoPlay={!prefersReducedMotion()}
            loop
            muted
            playsInline
            preload="auto"
          />
        </div>
      )}
      <section className="mission-objective">
        <h2 className="mission-objective__name">{name}</h2>
        <h3 className="mission-objective__plan-title">Flight plan</h3>
        <ol className="mission-objective__plan">
          {plan.map((step) => (
            <li key={step} className="mission-objective__step">
              {step}
            </li>
          ))}
        </ol>
        <Link className="mission-objective__start" to={startPath}>
          Start Mission
        </Link>
        <Link className="mission-objective__home" to="/">
          ← Missions
        </Link>
      </section>
    </div>
  );
};

export default MissionObjective;
