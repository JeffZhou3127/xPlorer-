import { createSlice } from "@reduxjs/toolkit";
import { computeSpacecraftStats } from "../utils/spacecraftPhysics.js";

// The spacecraft design from mission 1, step 1. Every system is always fitted; the player
// picks its size ("small", "medium" or "large"). RCS fuel is in kilograms.
const initialState = {
  solarPanels: "small",
  batteries: "small",
  radiators: "small",
  rcsFuel: 100,
};

const spacecraftSlice = createSlice({
  name: "spacecraft",
  initialState,
  reducers: {
    updateDesign: (state, { payload }) => ({ ...state, ...payload }),
  },
});

export const { updateDesign } = spacecraftSlice.actions;

export const selectSpacecraftDesign = (state) => state.spacecraft;
// The fully fuelled spacecraft is the rocket's payload.
export const selectSpacecraftMass = (state) => computeSpacecraftStats(state.spacecraft).totalMass;

export default spacecraftSlice.reducer;
