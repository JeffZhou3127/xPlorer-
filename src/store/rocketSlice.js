import { createSlice } from "@reduxjs/toolkit";
import { maxSrbFuel } from "../components/RocketDiagram/rocketLayout.js";

// Design rules for the rocket designer (mission 1, step 2).

// Fuel ranges in tonnes, by position counted from the top stage down.
// Stages lower in the stack lift more mass, so they carry more propellant.
const FUEL_RANGES = [
  { min: 10, max: 50 },
  { min: 50, max: 150 },
  { min: 150, max: 400 },
];
export const MAX_STAGES = FUEL_RANGES.length;

// Engine count limits by position counted from the bottom stage up (like `stages`).
// The booster has the widest base, so it can fit the largest cluster.
export const ENGINE_RANGES = [
  { min: 1, max: 9 },
  { min: 1, max: 5 },
  { min: 1, max: 3 },
];

// Total propellant across the strap-on solid rocket boosters, in tonnes. There is no fixed
// maximum: the boosters may be no taller than the stages below the top stage (maxSrbFuel).
export const MIN_SRB_FUEL = 5;
const DEFAULT_SRB_FUEL = 40;
// SRBs strap onto a wide booster stage, so the rocket needs one beneath an upper stage.
export const MIN_STAGES_FOR_SRBS = 2;

// Default engine count by position from the top: boosters need far more thrust.
const DEFAULT_ENGINES = [1, 2, 7];

// Default operating altitude for each position above the bottom stage, in km.
const STAGING_ALTITUDE_STEP = 50;

// Ranges for a rocket of `count` stages, indexed from the bottom stage up (like `stages`).
export const rangesFor = (count) => FUEL_RANGES.slice(0, count).toReversed();

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
const createStage = (positionFromTop, id) => {
  const { min, max } = FUEL_RANGES[positionFromTop];
  return {
    id,
    fuel: Math.round((min + max) / 2 / 5) * 5,
    propellant: "kerolox",
    cycle: "gas-generator",
    gasGenerator: "open",
    expansionRatio: positionFromTop === 0 ? 80 : 16,
    engines: DEFAULT_ENGINES[positionFromTop],
    altitude: 0,
  };
};

// `stages[0]` is the bottom stage. `srbs` is null until the user adds them.
const initialState = {
  stages: [createStage(0, 1)],
  srbs: null,
  nextStageId: 2,
};

const rocketSlice = createSlice({
  name: "rocket",
  initialState,
  reducers: {
    // New stages go underneath as the new booster; the stages above are pushed up a position,
    // which can lower their engine limit. Stages lifted off the pad get a default altitude
    // unless the user already set one.
    addStage: (state) => {
      if (state.stages.length >= MAX_STAGES) return;
      state.stages = fitToPositions([
        createStage(state.stages.length, state.nextStageId),
        ...state.stages.map((stage, i) =>
          stage.altitude === 0 ? { ...stage, altitude: (i + 1) * STAGING_ALTITUDE_STEP } : stage,
        ),
      ]);
      state.nextStageId += 1;
    },

    // Removing a stage moves the ones below it up into a smaller fuel range, so re-fit every
    // stage. SRBs are dropped too if the rocket falls below the stage count they need.
    removeStage: (state, { payload: id }) => {
      if (state.stages.length <= 1) return;
      state.stages = fitToPositions(state.stages.filter((stage) => stage.id !== id));
      if (state.stages.length < MIN_STAGES_FOR_SRBS) state.srbs = null;
    },

    updateStage: (state, { payload: { id, patch } }) => {
      const stage = state.stages.find((s) => s.id === id);
      if (stage) Object.assign(stage, patch);
    },

    addSrbs: (state) => {
      state.srbs = { fuel: Math.min(DEFAULT_SRB_FUEL, maxSrbFuel(state.stages)) };
    },

    removeSrbs: (state) => {
      state.srbs = null;
    },

    updateSrbs: (state, { payload }) => {
      if (state.srbs) Object.assign(state.srbs, payload);
    },
  },
});

export const { addStage, removeStage, updateStage, addSrbs, removeSrbs, updateSrbs } =
  rocketSlice.actions;

export const selectRocket = (state) => state.rocket;

export default rocketSlice.reducer;
