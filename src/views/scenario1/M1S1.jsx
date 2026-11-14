import { useState } from "react";
import ThreePane from "../../components/ThreePane/ThreePane.jsx";
import RocketStats from "../../components/RocketStats/RocketStats.jsx";
import RocketDiagram from "../../components/RocketDiagram/RocketDiagram.jsx";
import RocketForm from "../../components/RocketForm/RocketForm.jsx";
import { computeRocketStats } from "../../utils/rocketPhysics.js";

// Fuel ranges in tonnes, by position counted from the top stage down.
// Stages lower in the stack lift more mass, so they carry more propellant.
const FUEL_RANGES = [
  { min: 10, max: 50 },
  { min: 50, max: 150 },
  { min: 150, max: 400 },
];
const MAX_STAGES = FUEL_RANGES.length;

// Default engine count by position from the top: boosters need far more thrust.
const DEFAULT_ENGINES = [1, 2, 7];

// Default operating altitude for each position above the bottom stage, in km.
const STAGING_ALTITUDE_STEP = 50;

// Ranges for a rocket of `count` stages, indexed from the bottom stage up (like `stages`).
const rangesFor = (count) => FUEL_RANGES.slice(0, count).toReversed();

const clampFuel = (fuel, { min, max }) => Math.min(max, Math.max(min, fuel));

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
  const stats = computeRocketStats(stages);

  // New stages go underneath as the new booster; the stages above keep their position and fuel.
  // Stages lifted off the pad get a default altitude unless the user already set one.
  const addStage = () =>
    setStages((current) =>
      current.length >= MAX_STAGES
        ? current
        : [
            createStage(current.length),
            ...current.map((stage, i) =>
              stage.altitude === 0 ? { ...stage, altitude: (i + 1) * STAGING_ALTITUDE_STEP } : stage,
            ),
          ],
    );

  // Removing a stage moves the ones below it up into a smaller range, so re-fit every stage.
  const removeStage = (id) =>
    setStages((current) => {
      if (current.length <= 1) return current;
      const remaining = current.filter((stage) => stage.id !== id);
      const ranges = rangesFor(remaining.length);
      return remaining.map((stage, index) => ({
        ...stage,
        fuel: clampFuel(stage.fuel, ranges[index]),
      }));
    });

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
          onAddStage={addStage}
          onRemoveStage={removeStage}
          onStageChange={updateStage}
        />
      }
      center={<RocketDiagram stages={stages} />}
      right={
        <RocketStats
          stages={stages}
          stats={stats}
          onAltitudeChange={(id, altitude) => updateStage(id, { altitude })}
        />
      }
    />
  );
};

export default M1S1;
