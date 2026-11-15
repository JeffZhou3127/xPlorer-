import { PROPELLANTS, SRB_DENSITY } from "../../utils/rocketPhysics.js";

// Diagram geometry shared by the drawing and the design rules that depend on it
// (the SRB fuel limit). All units are SVG user units.
export const GROUND_Y = 860;

// Body widths. The top stage matches the spacecraft fairing; lower stages are wider.
export const NARROW_HALF = 30;
export const WIDE_HALF = 42;

// Tank length is propellant volume (mass ÷ density) divided by cross-section area,
// so tank size is proportional to volume: low-density hydrogen needs much longer tanks
// than kerosene for the same mass, and a narrow tank grows faster than a wide one.
const UNITS_PER_M3_WIDE = 0.74; // tank length per m³ of propellant in a wide stage
const lengthPerM3 = (half) => UNITS_PER_M3_WIDE * (WIDE_HALF / half) ** 2;
const tankHeight = (fuel, propellant, half) =>
  (fuel / PROPELLANTS[propellant].density) * lengthPerM3(half);

// Bottom stage engine section
export const ENGINE_SECTION_HEIGHT = 20;

// Upper stage interstage (hides the upper stage engines). It grows to fit long nozzles.
const MIN_INTERSTAGE_HEIGHT = 34;
const INTERSTAGE_CLEARANCE = 6;

// Engine nozzles. Every engine has the same throat, so the exit radius scales with
// sqrt(expansion ratio), and a bell gets longer as it gets wider.
export const THROAT_HALF = 2.75;
const NOZZLE_BASE_HEIGHT = 6;
const NOZZLE_LENGTH_PER_WIDTH = 2;
const nozzleSize = (expansionRatio) => {
  const exitHalf = THROAT_HALF * Math.sqrt(expansionRatio);
  return { exitHalf, height: NOZZLE_BASE_HEIGHT + NOZZLE_LENGTH_PER_WIDTH * (exitHalf - THROAT_HALF) };
};

export const interstageHeight = (nozzle) =>
  Math.max(MIN_INTERSTAGE_HEIGHT, nozzle.height + INTERSTAGE_CLEARANCE);

// Lay out stages from the ground up; stages[0] is the bottom stage.
// The top stage matches the fairing width; every stage below it is wide.
export const layoutStages = (stages) => {
  const count = stages.length;
  const placed = [];
  let stackTop = GROUND_Y;
  for (const [index, stage] of stages.entries()) {
    const half = index === count - 1 ? NARROW_HALF : WIDE_HALF;
    const tankH = tankHeight(stage.fuel, stage.propellant, half);
    const nozzle = nozzleSize(stage.expansionRatio);
    const below = index === 0 ? ENGINE_SECTION_HEIGHT + nozzle.height : interstageHeight(nozzle);
    const tankTop = stackTop - below - tankH;
    placed.push({
      id: stage.id,
      isFirst: index === 0,
      half,
      belowHalf: placed.at(-1)?.half,
      tankTop,
      tankH,
      engines: stage.engines,
      nozzle,
    });
    stackTop = tankTop;
  }
  return { placed, stackTop };
};

// Solid rocket boosters: a slim case whose length follows propellant volume, like the tanks,
// with a pointed nose, a flared aft skirt and a short fixed nozzle resting on the pad.
export const SRB_HALF = 13;
export const SRB_NOZZLE = { height: 14, mountHalf: 7, throatHalf: 4, exitHalf: 8 };
export const SRB_SKIRT_HEIGHT = 10;
export const SRB_NOSE_HEIGHT = 26;
const SRB_FIXED_HEIGHT = SRB_NOZZLE.height + SRB_SKIRT_HEIGHT + SRB_NOSE_HEIGHT;

// Each booster holds half the propellant.
export const srbBodyHeight = (fuel) => (fuel / 2 / SRB_DENSITY) * lengthPerM3(SRB_HALF);

// The boosters may reach no higher than the top of every stage below the top stage
// (Stage 1 on a two-stage rocket, Stages 1 and 2 on a three-stage rocket).
// Returns the largest whole-tonne SRB fuel load that fits.
export const maxSrbFuel = (stages) => {
  const { placed } = layoutStages(stages);
  const limitTop = placed[Math.max(0, placed.length - 2)].tankTop;
  const bodyH = GROUND_Y - limitTop - SRB_FIXED_HEIGHT;
  return Math.max(0, Math.floor((bodyH / lengthPerM3(SRB_HALF)) * SRB_DENSITY * 2));
};

// Rocket centerline. The blueprint and the flight view both draw the rocket around it.
export const CENTER_X = 150;

// Spacecraft on top of the stack: service module inside a fairing, crew capsule, nose cone.
export const FAIRING_HEIGHT = 52;
export const CAPSULE_HEIGHT = 32;
export const NOSE_HEIGHT = 24;
const SPACECRAFT_HEIGHT = FAIRING_HEIGHT + CAPSULE_HEIGHT + NOSE_HEIGHT;

// Highest point of the whole rocket (spacecraft nose or SRB nose). The bottom is GROUND_Y.
export const rocketTop = (stages, srbs) => {
  const { stackTop } = layoutStages(stages);
  const srbTop = srbs
    ? GROUND_Y - SRB_FIXED_HEIGHT - srbBodyHeight(srbs.fuel)
    : Infinity;
  return Math.min(stackTop - SPACECRAFT_HEIGHT, srbTop);
};

// Exhaust plumes below the nozzles. A plume's length at full throttle grows with the
// nozzle exit; FLAME_ROOM is the longest any plume gets, so views can leave space for it.
export const flameLength = (exitHalf) => 16 + exitHalf * 2.5;
export const SRB_FLAME_LENGTH = 70;
export const FLAME_ROOM = Math.max(flameLength(THROAT_HALF * Math.sqrt(100)), SRB_FLAME_LENGTH);
