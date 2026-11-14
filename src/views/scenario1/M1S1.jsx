import { useState } from "react";
import ThreePane from "../../components/ThreePane/ThreePane.jsx";
import RocketStats from "../../components/RocketStats/RocketStats.jsx";
import RocketDiagram from "../../components/RocketDiagram/RocketDiagram.jsx";
import RocketForm from "../../components/RocketForm/RocketForm.jsx";
import { maxSrbFuel } from "../../components/RocketDiagram/rocketLayout.js";
import { computeRocketStats } from "../../utils/rocketPhysics.js";

// Fuel ranges in tonnes, by position counted from the top stage down.
// Stages lower in the stack lift more mass, so they carry more propellant.
const FUEL_RANGES = [
  { min: 10, max: 50 },
  { min: 50, max: 150 },
  { min: 150, max: 400 },
];
const MAX_STAGES = FUEL_RANGES.length;

// Engine count limits by position counted from the bottom stage up (like `stages`).
// The booster has the widest base, so it can fit the largest cluster.
const ENGINE_RANGES = [
  { min: 1, max: 9 },
  { min: 1, max: 5 },
  { min: 1, max: 3 },
];

// Total propellant across the strap-on solid rocket boosters, in tonnes. There is no fixed
// maximum: the boosters may be no taller than the stages below the top stage (maxSrbFuel).
const MIN_SRB_FUEL = 5;
const DEFAULT_SRB_FUEL = 40;
// SRBs strap onto a wide booster stage, so the rocket needs one beneath an upper stage.
const MIN_STAGES_FOR_SRBS = 2;

// Placeholder mission budget in millions of dollars.
const BUDGET = 60;

// Default engine count by position from the top: boosters need far more thrust.
const DEFAULT_ENGINES = [1, 2, 7];

// Default operating altitude for each position above the bottom stage, in km.
const STAGING_ALTITUDE_STEP = 50;

// Ranges for a rocket of `count` stages, indexed from the bottom stage up (like `stages`).
const rangesFor = (count) => FUEL_RANGES.slice(0, count).toReversed();

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

// Adding or removing a stage shifts the others to new positions, so re-fit every
// stage's fuel and engine count to the limits of the position it now sits in.
const fitToPositions = (stages) => {
  const fuelRanges = rangesFor(stages.length);
  return stages.map((stage, index) => ({
    ...stage,
    fuel: clamp(stage.fuel, fuelRanges[index]),
    engines: clamp(stage.engines, ENGINE_RANGES[index]),
  }));
};

// New stages always start at the bottom of the stack, on the launch pad.
// The very first stage is the top stage, so it gets a vacuum-sized nozzle.
let nextStageId = 1;
const createStage = (positionFromTop) => {
  const { min, max } = FUEL_RANGES[positionFromTop];
  return {
    id: nextStageId++,
    fuel: Math.round((min + max) / 2 / 5) * 5,
    propellant: "kerolox",
    cycle: "gas-generator",
    gasGenerator: "open",
    expansionRatio: positionFromTop === 0 ? 80 : 16,
    engines: DEFAULT_ENGINES[positionFromTop],
    altitude: 0,
  };
};

const M1S1 = () => {
  const [stages, setStages] = useState(() => [createStage(0)]);
  // null until the user adds SRBs.
  const [storedSrbs, setSrbs] = useState(null);
  // Shrinking the lower stages lowers the SRB height limit, so cap the stored fuel to it.
  // (The minimum is enforced by the input itself, so typing a partial number still works.)
  const srbFuelRange = { max: maxSrbFuel(stages) };
  srbFuelRange.min = Math.min(MIN_SRB_FUEL, srbFuelRange.max);
  const srbs = storedSrbs && { ...storedSrbs, fuel: Math.min(storedSrbs.fuel, srbFuelRange.max) };
  const stats = computeRocketStats(stages, srbs);

  // New stages go underneath as the new booster; the stages above are pushed up a position,
  // which can lower their engine limit. Stages lifted off the pad get a default altitude
  // unless the user already set one.
  const addStage = () =>
    setStages((current) =>
      current.length >= MAX_STAGES
        ? current
        : fitToPositions([
            createStage(current.length),
            ...current.map((stage, i) =>
              stage.altitude === 0 ? { ...stage, altitude: (i + 1) * STAGING_ALTITUDE_STEP } : stage,
            ),
          ]),
    );

  // Removing a stage moves the ones below it up into a smaller fuel range, so re-fit every stage.
  // SRBs are dropped too if the rocket falls below the stage count they need.
  const removeStage = (id) => {
    if (stages.length - 1 < MIN_STAGES_FOR_SRBS) setSrbs(null);
    setStages((current) =>
      current.length <= 1 ? current : fitToPositions(current.filter((stage) => stage.id !== id)),
    );
  };

  const updateStage = (id, patch) =>
    setStages((current) =>
      current.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
    );

  return (
    <ThreePane
      left={
        <RocketForm
          stages={stages}
          maxStages={MAX_STAGES}
          fuelRanges={rangesFor(stages.length)}
          engineRanges={ENGINE_RANGES}
          onAddStage={addStage}
          onRemoveStage={removeStage}
          onStageChange={updateStage}
          srbs={srbs}
          canAddSrbs={stages.length >= MIN_STAGES_FOR_SRBS}
          srbFuelRange={srbFuelRange}
          onAddSrbs={() => setSrbs({ fuel: Math.min(DEFAULT_SRB_FUEL, srbFuelRange.max) })}
          onRemoveSrbs={() => setSrbs(null)}
          onSrbsChange={(patch) => setSrbs({ ...srbs, ...patch })}
        />
      }
      center={<RocketDiagram stages={stages} srbs={srbs} />}
      right={
        <RocketStats
          stages={stages}
          stats={stats}
          budget={BUDGET}
          onAltitudeChange={(id, altitude) => updateStage(id, { altitude })}
          // TODO: navigate to the next step of the mission once it exists.
          onContinue={() => {}}
        />
      }
    />
  );
};

export default M1S1;
