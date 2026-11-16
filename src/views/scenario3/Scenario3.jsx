import MissionObjective from "../../components/MissionObjective/MissionObjective.jsx";
import { missionById } from "../../utils/missions.js";

const MISSION = missionById("cubesat");

const Scenario3 = () => {
  return <MissionObjective name={MISSION.name} plan={MISSION.plan} startPath={MISSION.start} />;
};

export default Scenario3;
