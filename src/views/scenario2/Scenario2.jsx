import MissionObjective from "../../components/MissionObjective/MissionObjective.jsx";
import { missionById } from "../../utils/missions.js";

const MISSION = missionById("moon");

const Scenario2 = () => {
  return (
    <MissionObjective
      name={MISSION.name}
      plan={MISSION.plan}
      startPath={MISSION.start}
      video={MISSION.video}
      poster={MISSION.image}
    />
  );
};

export default Scenario2;
