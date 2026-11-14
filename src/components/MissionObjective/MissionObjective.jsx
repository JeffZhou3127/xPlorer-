import { Link } from "react-router";
import "./MissionObjective.css";

const MissionObjective = ({ name, description, startPath }) => {
  return (
    <section className="mission-objective">
      <h2 className="mission-objective__name">{name}</h2>
      <p className="mission-objective__description">{description}</p>
      <Link className="mission-objective__start" to={startPath}>
        Start Mission
      </Link>
    </section>
  );
};

export default MissionObjective;
