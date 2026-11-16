import { Link } from "react-router";
import "./MissionObjective.css";

// A mission's opening page: its name, the flight plan (`plan`, steps in order) and a
// Start Mission link to `startPath`.
const MissionObjective = ({ name, plan, startPath }) => {
  return (
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
    </section>
  );
};

export default MissionObjective;
