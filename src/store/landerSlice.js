import { createSlice } from "@reduxjs/toolkit";
import { computeLanderStats } from "../utils/landerPhysics.js";

// The lander design from mission 2, step 1: the spacecraft's systems (sizes "small", "medium"
// or "large", RCS fuel in kilograms) plus the landing stage's fuel in tonnes.
const initialState = {
  solarPanels: "small",
  batteries: "small",
  radiators: "small",
  rcsFuel: 100,
  landerFuel: 10,
};

const landerSlice = createSlice({
  name: "lander",
  initialState,
  reducers: {
    updateLanderDesign: (state, { payload }) => ({ ...state, ...payload }),
  },
});

export const { updateLanderDesign } = landerSlice.actions;

export const selectLanderDesign = (state) => state.lander;
// The fully fuelled lander is the rocket's payload.
export const selectLanderMass = (state) => computeLanderStats(state.lander).totalMass;

export default landerSlice.reducer;
