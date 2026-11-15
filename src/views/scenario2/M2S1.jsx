import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import ThreePane from "../../components/ThreePane/ThreePane.jsx";
import SpacecraftForm from "../../components/SpacecraftForm/SpacecraftForm.jsx";
import SpacecraftDiagram from "../../components/SpacecraftDiagram/SpacecraftDiagram.jsx";
import SpacecraftStats from "../../components/SpacecraftStats/SpacecraftStats.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import { overBudgetReason } from "../../utils/format.js";
import { computeLanderStats } from "../../utils/landerPhysics.js";
import { selectLanderDesign, updateLanderDesign } from "../../store/landerSlice.js";

// Placeholder lander budget in millions of dollars.
const BUDGET = 36;

// Mission 2, step 1: design the lander, a capsule on a landing stage. It reuses the spacecraft
// designer; the landing stage's fuel field and Δv meters appear because the design has
// `landerFuel`. Its mass is the payload for the rocket designer (step 2).
const M2S1 = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const design = useSelector(selectLanderDesign);
  const stats = computeLanderStats(design);

  return (
    <>
      <ThreePane
        left={<SpacecraftForm design={design} onChange={(patch) => dispatch(updateLanderDesign(patch))} />}
        center={<SpacecraftDiagram design={design} />}
        right={<SpacecraftStats stats={stats} budget={BUDGET} name="Lander" />}
      />
      {/* As in mission 1, only the budget blocks Continue. */}
      <StepNav
        onBack={() => navigate("/scenario2")}
        onContinue={() => navigate("/m2-s2")}
        blockedReason={overBudgetReason(stats.totalCost, BUDGET)}
      />
    </>
  );
};

export default M2S1;
