import { useDispatch, useSelector } from "react-redux";
import { maxSrbFuel } from "../components/RocketDiagram/rocketLayout.js";
import { computeRocketStats } from "../utils/rocketPhysics.js";
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
} from "../store/rocketSlice.js";

// The rocket design from the store, wired up for the rocket designer screens (M1S2, M2S2).
// Returns the stats for `payloadMass` (tonnes) and the props for RocketForm, RocketDiagram
// and RocketStats.
export const useRocketDesign = (payloadMass) => {
  const dispatch = useDispatch();
  const { stages, srbs: storedSrbs } = useSelector(selectRocket);

  // Shrinking the lower stages lowers the SRB height limit, so cap the stored fuel to it.
  // (The minimum is enforced by the input itself, so typing a partial number still works.)
  const srbFuelRange = { max: maxSrbFuel(stages) };
  srbFuelRange.min = Math.min(MIN_SRB_FUEL, srbFuelRange.max);
  const srbs = storedSrbs && { ...storedSrbs, fuel: Math.min(storedSrbs.fuel, srbFuelRange.max) };
  const stats = computeRocketStats(stages, srbs, payloadMass);

  const changeStage = (id, patch) => dispatch(updateStage({ id, patch }));

  return {
    stats,
    form: {
      stages,
      maxStages: MAX_STAGES,
      fuelRanges: rangesFor(stages.length),
      engineRanges: ENGINE_RANGES,
      onAddStage: () => dispatch(addStage()),
      onRemoveStage: (id) => dispatch(removeStage(id)),
      onStageChange: changeStage,
      srbs,
      canAddSrbs: stages.length >= MIN_STAGES_FOR_SRBS,
      srbFuelRange,
      onAddSrbs: () => dispatch(addSrbs()),
      onRemoveSrbs: () => dispatch(removeSrbs()),
      onSrbsChange: (patch) => dispatch(updateSrbs(patch)),
    },
    diagram: { stages, srbs },
    statsPanel: {
      stages,
      stats,
      onAltitudeChange: (id, altitude) => changeStage(id, { altitude }),
    },
  };
};
