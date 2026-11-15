import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import ThreePane from "../../components/ThreePane/ThreePane.jsx";
import RocketStats from "../../components/RocketStats/RocketStats.jsx";
import RocketDiagram from "../../components/RocketDiagram/RocketDiagram.jsx";
import RocketForm from "../../components/RocketForm/RocketForm.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import DevJump from "../../components/DevJump/DevJump.jsx"; // DEV ONLY: remove with the element below
import { overBudgetReason } from "../../utils/format.js";
import { useRocketDesign } from "../../hooks/useRocketDesign.js";
import { selectSpacecraftMass } from "../../store/spacecraftSlice.js";

// Placeholder mission budget in millions of dollars.
const BUDGET = 60;

// Mission 1, step 2: design the rocket that lifts the spacecraft from step 1 to orbit.
// The rocket design and the spacecraft (payload) mass both come from the Redux store.
const M1S2 = () => {
  const navigate = useNavigate();
  const { stats, form, diagram, statsPanel } = useRocketDesign(useSelector(selectSpacecraftMass));

  return (
    <>
      <ThreePane
        left={<RocketForm {...form} />}
        center={<RocketDiagram {...diagram} />}
        right={<RocketStats {...statsPanel} budget={BUDGET} />}
      />
      {/* Only the budget blocks Continue; the Δv meters are guidance for the designer. */}
      <StepNav
        onBack={() => navigate("/m1-s1")}
        onContinue={() => navigate("/m1-s3")}
        blockedReason={overBudgetReason(stats.totalCost, BUDGET)}
      />
      <DevJump /> {/* DEV ONLY: remove with the import above */}
    </>
  );
};

export default M1S2;
