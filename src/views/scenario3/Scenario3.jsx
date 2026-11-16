import MissionObjective from "../../components/MissionObjective/MissionObjective.jsx";

const Scenario3 = () => {
  return (
    <>
      <MissionObjective
        name="CubeSat Mission"
        description="Your objective is to deliver a CubeSat from a 150 × 150 km parking orbit to geostationary orbit. You will use orbital mechanics to raise its orbit to 35,786 km, where it circles Earth once a day and stays fixed over one spot on the equator."
        startPath="/m3-s1"
      />
    </>
  );
};

export default Scenario3;
