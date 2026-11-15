import { configureStore } from "@reduxjs/toolkit";
import spacecraftReducer from "./spacecraftSlice.js";
import rocketReducer from "./rocketSlice.js";

// App-wide state. It lives above the router, so designs survive moving between mission steps.
export const store = configureStore({
  reducer: {
    spacecraft: spacecraftReducer,
    rocket: rocketReducer,
  },
});
