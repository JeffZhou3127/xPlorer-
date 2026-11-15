import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import ThreePane from "../../components/ThreePane/ThreePane.jsx";
import RocketStats from "../../components/RocketStats/RocketStats.jsx";
import RocketDiagram from "../../components/RocketDiagram/RocketDiagram.jsx";
import RocketForm from "../../components/RocketForm/RocketForm.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import { overBudgetReason } from "../../utils/format.js";
import { maxSrbFuel } from "../../components/RocketDiagram/rocketLayout.js";
import { computeRocketStats } from "../../utils/rocketPhysics.js";
import {
  ENGINE_RANGES,
  MAX_STAGES,
  MIN_SRB_FUEL,
  MIN_STAGES_FOR_SRBS,
  addSrbs,
  addStage,
  rangesFor,
  removeSrbs,
  removeStage,
  selectRocket,
  updateSrbs,
  updateStage,
} from "../../store/rocketSlice.js";
import { selectSpacecraftMass } from "../../store/spacecraftSlice.js";

// Placeholder mission budget in millions of dollars.
const BUDGET = 60;

// Mission 1, step 2: design the rocket that lifts the spacecraft from step 1 to orbit.
// The rocket design and the spacecraft (payload) mass both come from the Redux store.
const M1S2 = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { stages, srbs: storedSrbs } = useSelector(selectRocket);
  const payloadMass = useSelector(selectSpacecraftMass);

  // Shrinking the lower stages lowers the SRB height limit, so cap the stored fuel to it.
  // (The minimum is enforced by the input itself, so typing a partial number still works.)
  const srbFuelRange = { max: maxSrbFuel(stages) };
  srbFuelRange.min = Math.min(MIN_SRB_FUEL, srbFuelRange.max);
  const srbs = storedSrbs && { ...storedSrbs, fuel: Math.min(storedSrbs.fuel, srbFuelRange.max) };
  const stats = computeRocketStats(stages, srbs, payloadMass);

  const changeStage = (id, patch) => dispatch(updateStage({ id, patch }));

  return (
    <>
      <ThreePane
        left={
          <RocketForm
            stages={stages}
            maxStages={MAX_STAGES}
            fuelRanges={rangesFor(stages.length)}
            engineRanges={ENGINE_RANGES}
            onAddStage={() => dispatch(addStage())}
            onRemoveStage={(id) => dispatch(removeStage(id))}
            onStageChange={changeStage}
            srbs={srbs}
            canAddSrbs={stages.length >= MIN_STAGES_FOR_SRBS}
            srbFuelRange={srbFuelRange}
            onAddSrbs={() => dispatch(addSrbs())}
            onRemoveSrbs={() => dispatch(removeSrbs())}
            onSrbsChange={(patch) => dispatch(updateSrbs(patch))}
          />
        }
        center={<RocketDiagram stages={stages} srbs={srbs} />}
        right={
          <RocketStats
            stages={stages}
            stats={stats}
            budget={BUDGET}
            onAltitudeChange={(id, altitude) => changeStage(id, { altitude })}
          />
        }
      />
      {/* Only the budget blocks Continue; the Δv meters are guidance for the designer. */}
      <StepNav
        onBack={() => navigate("/m1-s1")}
        onContinue={() => navigate("/m1-s3")}
        blockedReason={overBudgetReason(stats.totalCost, BUDGET)}
      />
    </>
  );
};

export default M1S2;
