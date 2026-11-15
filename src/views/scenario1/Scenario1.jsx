import MissionObjective from "../../components/MissionObjective/MissionObjective.jsx";

const Scenario1 = () => {
  return (
    <>
      <MissionObjective
        name="Mars Mission"
        description="Your objective is to be the first person to reach Mars orbit. You will use orbital mechanics to achieve a polar orbit."
        startPath="/m1-s1"
      />
    </>
  );
};

export default Scenario1;
