import MissionObjective from "../../components/MissionObjective/MissionObjective.jsx";
import { Info } from "../../components/InfoTip/InfoTip.jsx";

const Scenario1 = () => {
  return (
    <>
      <MissionObjective
        name="Mars Mission"
        description={
          <>
            Your objective is to be the first person to reach Mars orbit. You will use orbital mechanics
            <Info topic="orbitalMechanics" /> to achieve a polar orbit
            <Info topic="polarOrbit" />.
          </>
        }
        startPath="/m1-s1"
      />
    </>
  );
};

export default Scenario1;
