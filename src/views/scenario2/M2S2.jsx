import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import ThreePane from "../../components/ThreePane/ThreePane.jsx";
import RocketStats from "../../components/RocketStats/RocketStats.jsx";
import RocketDiagram from "../../components/RocketDiagram/RocketDiagram.jsx";
import RocketForm from "../../components/RocketForm/RocketForm.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import { overBudgetReason } from "../../utils/format.js";
import { useRocketDesign } from "../../hooks/useRocketDesign.js";
import { M2_ORBIT_ALTITUDE_KM, M2_ORBIT_DELTA_V } from "../../utils/landerPhysics.js";
import { selectLanderMass } from "../../store/landerSlice.js";

// Placeholder mission budget in millions of dollars.
const BUDGET = 60;
const ORBIT = { altitudeKm: M2_ORBIT_ALTITUDE_KM, deltaV: M2_ORBIT_DELTA_V };

// Mission 2, step 2: design the rocket that lifts the lander from step 1 to orbit around the
// half-size Earth. It shares the rocket designer (and its stored design) with mission 1.
const M2S2 = () => {
  const navigate = useNavigate();
  const { stats, form, diagram, statsPanel } = useRocketDesign(useSelector(selectLanderMass));

  return (
    <>
      <ThreePane
        left={<RocketForm {...form} />}
        center={<RocketDiagram {...diagram} />}
        right={<RocketStats {...statsPanel} budget={BUDGET} orbit={ORBIT} orbitNote={null} />}
      />
      {/* Only the budget blocks Continue; the Δv meters are guidance for the designer. */}
      <StepNav
        onBack={() => navigate("/m2-s1")}
        onContinue={() => navigate("/m1-s3", { state: { back: "/m2-s2", next: "/m2-s3" } })}
        blockedReason={overBudgetReason(stats.totalCost, BUDGET)}
      />
    </>
  );
};

export default M2S2;
