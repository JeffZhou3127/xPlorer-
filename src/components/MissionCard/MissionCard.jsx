import { Link } from "react-router";
import "./MissionCard.css";

// One mission on the home page: its name, difficulty (`level`, coloured by `difficulty`
// 1–3: green, yellow, red), description and a link to its objective page (`to`).
const MissionCard = ({ name, description, difficulty, level, to }) => (
  <article className="mission-card">
    <header>
      <h2 className="mission-card__name">{name}</h2>
      <p className={`mission-card__level mission-card__level--${difficulty}`}>{level}</p>
    </header>
    <p className="mission-card__description">{description}</p>
    <Link className="mission-card__select" to={to} aria-label={`Select the ${name}`}>
      Select mission
    </Link>
  </article>
);

export default MissionCard;
