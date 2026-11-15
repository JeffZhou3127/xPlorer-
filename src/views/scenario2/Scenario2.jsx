import MissionObjective from "../../components/MissionObjective/MissionObjective.jsx";

const Scenario2 = () => {
  return (
    <>
      <MissionObjective
        name="Moon Mission"
        description="Your objective is to land a person on the Moon and bring them safely back to Earth. You will use orbital mechanics to reach the Moon, then return home through the atmosphere behind a heat shield."
        startPath="/m2-s1"
      />
    </>
  );
};

export default Scenario2;
