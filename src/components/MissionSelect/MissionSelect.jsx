import { useState } from "react";
import MissionCard from "../MissionCard/MissionCard.jsx";
import "./MissionSelect.css";

// The home page layout: the app's title and a row of mission cards, one per entry of
// `missions` (missions.js shape) in the order given. While a card is hovered or focused,
// its mission's `image` fades in behind the whole page under a dark overlay.
const MissionSelect = ({ missions }) => {
  const [activeId, setActiveId] = useState(null);

  return (
    <main className="mission-select">
      <div className="mission-select__backdrop" aria-hidden="true">
        {missions.map(({ id, image }) => (
          <div
            key={id}
            className={`mission-select__backdrop-image${
              id === activeId ? " mission-select__backdrop-image--active" : ""
            }`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
      </div>
      <header className="mission-select__header">
        <p className="mission-select__credit">made by xSim+</p>
        <h1 className="mission-select__title">
          x<span className="mission-select__title-p">P</span>lorer+
        </h1>
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
            onActivate={() => setActiveId(id)}
            onDeactivate={() => setActiveId((current) => (current === id ? null : current))}
          />
        ))}
      </div>
    </main>
  );
};

export default MissionSelect;
