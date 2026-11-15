import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import ThreePane from "../../components/ThreePane/ThreePane.jsx";
import SpacecraftForm from "../../components/SpacecraftForm/SpacecraftForm.jsx";
import SpacecraftDiagram from "../../components/SpacecraftDiagram/SpacecraftDiagram.jsx";
import SpacecraftStats from "../../components/SpacecraftStats/SpacecraftStats.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import { overBudgetReason } from "../../utils/format.js";
import { computeSpacecraftStats } from "../../utils/spacecraftPhysics.js";
import { selectSpacecraftDesign, updateDesign } from "../../store/spacecraftSlice.js";

// Placeholder spacecraft budget in millions of dollars.
const BUDGET = 32;

// Mission 1, step 1: design the spacecraft. The design lives in the Redux store, so the
// rocket designer (step 2) can use its mass as the payload.
const M1S1 = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const design = useSelector(selectSpacecraftDesign);
  const stats = computeSpacecraftStats(design);

  return (
    <>
      <ThreePane
        left={<SpacecraftForm design={design} onChange={(patch) => dispatch(updateDesign(patch))} />}
        center={<SpacecraftDiagram design={design} />}
        right={<SpacecraftStats stats={stats} budget={BUDGET} />}
      />
      {/* As on the rocket screen, only the budget blocks Continue; the system meters are
          guidance for the designer. */}
      <StepNav
        onBack={() => navigate("/scenario1")}
        onContinue={() => navigate("/m1-s2")}
        blockedReason={overBudgetReason(stats.totalCost, BUDGET)}
      />
    </>
  );
};

export default M1S1;
