import { useLocation, useNavigate } from "react-router";
import OrbitReport from "../../components/OrbitReport/OrbitReport.jsx";
import { ORBIT_ALTITUDE_KM } from "../../utils/rocketPhysics.js";

// Docking requirements for step 6.
const DOCKING_DISTANCE_M = 100; // starting distance from the depot
const DOCKING_ACCURACY_M = 0.1;
const DOCKING_MAX_SPEED = 0.2; // m/s, relative to the depot

// Mission 1, step 5: shown when the flight panel's second goal (circularise the orbit)
// is reached and the player presses Continue. Sets up the docking step.
const M1S5 = () => {
  const navigate = useNavigate();
  // The flight's leftover stages, passed on to refueling (M1S7).
  const { state } = useLocation();
  return (
    <OrbitReport
      paragraphs={[
        `You are now in a circular orbit ${ORBIT_ALTITUDE_KM} km above Earth.`,
        `After a few small manoeuvres, your rocket is now within ${DOCKING_DISTANCE_M} meters of a refueling depot.`,
        `To refuel, you need to dock with the depot to within ${DOCKING_ACCURACY_M} meters of accuracy, at less than ${DOCKING_MAX_SPEED} m/s relative velocity.`,
      ]}
      onContinue={() => navigate("/m1-s6", { state })}
    />
  );
};

export default M1S5;
