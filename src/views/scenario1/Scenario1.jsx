import MissionObjective from "../../components/MissionObjective/MissionObjective.jsx";
import { missionById } from "../../utils/missions.js";

const MISSION = missionById("mars");

const Scenario1 = () => {
  return <MissionObjective name={MISSION.name} plan={MISSION.plan} startPath={MISSION.start} />;
};

export default Scenario1;
