import { LANDER_FUEL_RANGE_T } from "../../utils/landerPhysics.js";

// Geometry of the spacecraft drawing (SpacecraftBody), shared by the designer's blueprint
// (SpacecraftDiagram) and the landing view. All units are SVG user units.
export const VIEW_WIDTH = 440;
export const VIEW_HEIGHT = 360;
export const CX = VIEW_WIDTH / 2;

// Command pod: a docking tunnel on a cone-shaped capsule with a curved heat shield below.
export const TUNNEL = { top: 50, height: 12, half: 9 };
export const POD = { top: TUNNEL.top + TUNNEL.height, height: 88, topHalf: 16, baseHalf: 48 };
export const POD_BASE = POD.top + POD.height;
export const HEAT_SHIELD_BULGE = 10;

// Service module, with a short tapered aft bulkhead.
export const SM = { top: POD_BASE + HEAT_SHIELD_BULGE + 2, height: 130, half: 42 };
export const SM_BOTTOM = SM.top + SM.height;
export const AFT = { height: 12, half: 30 };

// Landing stage (lander designs only), hung under the service module in place of the aft
// bulkhead: a fuel tank whose length grows with the fuel, one engine and splayed legs.
export const LANDER_TANK = { half: 38, minHeight: 24, heightPerT: 2.4, rx: 16 };
export const LANDER_ENGINE = { throatHalf: 6, height: 26, exitHalf: 20 };
export const LEG = { reach: 84, drop: 10, pad: 10 };

// Where a landing stage carrying `fuel` tonnes ends: the tank bottom, the engine's exit and
// the footpads.
export const landingStageLayout = (fuel) => {
  const height = LANDER_TANK.minHeight + fuel * LANDER_TANK.heightPerT;
  const bottom = SM_BOTTOM + height;
  const exit = bottom + LANDER_ENGINE.height;
  return { height, bottom, exit, foot: exit + LEG.drop };
};

// A lander blueprint is drawn taller, sized for a full tank so the scale doesn't shift as
// fuel changes.
export const LANDER_VIEW_HEIGHT = landingStageLayout(LANDER_FUEL_RANGE_T.max).foot + 30;
