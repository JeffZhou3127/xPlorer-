import MissionCard from "../MissionCard/MissionCard.jsx";
import "./MissionSelect.css";

// The home page layout: the app's title and a row of mission cards, one per entry of
// `missions` (missions.js shape) in the order given.
const MissionSelect = ({ missions }) => (
  <main className="mission-select">
    <header className="mission-select__header">
      <h1 className="mission-select__title">xPlorer+</h1>
      <p className="mission-select__subtitle">Choose a mission</p>
    </header>
    <div className="mission-select__missions">
      {missions.map(({ id, name, description, difficulty, level, path }) => (
        <MissionCard
          key={id}
          name={name}
          description={description}
          difficulty={difficulty}
          level={level}
          to={path}
        />
      ))}
    </div>
  </main>
);

export default MissionSelect;
