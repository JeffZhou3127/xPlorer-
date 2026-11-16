// Mission 2 (Moon and back) lander model. The lander is the mission 1 spacecraft (command pod
// on a service module) standing on a landing stage: a fuel tank, one engine and landing legs.
// The landing stage is dropped before reentry, so only the capsule comes home.
// Masses are in tonnes, Δv in m/s and costs in $M (placeholder figures for the game).
import { EARTH_GM, EARTH_RADIUS, G0 } from "./rocketPhysics.js";
import {
  BATTERIES,
  POWER_DEMAND_KW,
  RADIATORS,
  SOLAR_PANELS,
  batteryRequirement,
  heatRequirement,
  rcsDeltaV,
  spacecraftParts,
  sumOf,
} from "./spacecraftPhysics.js";

// Mission 2 is the easier scenario: Earth and the Moon are half their real size and half as
// far apart. Surface gravity stays the same, so GM (g × r²) drops to a quarter and orbital
// speeds fall by √2.
export const SCALE = 2;
export const SCALED_EARTH_GM = EARTH_GM / SCALE ** 2;
export const SCALED_EARTH_RADIUS = EARTH_RADIUS / SCALE;

// Low orbit around the scaled Earth, about 5,430 m/s: the launch (M2S3) spends this much
// Δv from the rocket's stages.
export const M2_ORBIT_ALTITUDE_KM = 200;
export const M2_ORBIT_DELTA_V = Math.sqrt(
  SCALED_EARTH_GM / (SCALED_EARTH_RADIUS + M2_ORBIT_ALTITUDE_KM * 1000),
);

// Landing stage: engine, landing legs and structure, plus tankage per tonne of fuel.
export const LANDER_FUEL_RANGE_T = { min: 0, max: 30 };
const LANDING_STAGE = { mass: 0.9, cost: 4 };
const LANDER_TANK_FRACTION = 0.1;
const LANDER_TANK_COST_PER_T = 0.15;
const LANDER_ISP = 320; // s, storable hypergolic engine

// Δv budgeted for the landing (M2S6 flies it).
export const LANDING_DELTA_V = 1300;
// Δv budgeted for the liftoff into a 100 × 100 km lunar orbit (M2S8 flies it).
export const LIFTOFF_DELTA_V = 1250;

// Tonnes of landing-stage fuel left after the lander (`totalMass` t with `landerFuel` t on
// board) has spent `deltaV` m/s; never below 0.
export const landerFuelLeft = (totalMass, landerFuel, deltaV) =>
  Math.max(0, landerFuel - totalMass * (1 - Math.exp(-deltaV / (LANDER_ISP * G0))));

// Propellant (t) a burn of `deltaV` m/s takes from a lander (`totalMass` t when full) that
// has already spent `spent` m/s; not capped at what is left in the tank.
export const landerBurnPropellant = (totalMass, spent, deltaV) =>
  totalMass * Math.exp(-spent / (LANDER_ISP * G0)) * (1 - Math.exp(-deltaV / (LANDER_ISP * G0)));

// The lander's own burns, in flight order. On the scaled Moon (869 km radius) a 50 km orbit
// is about 1,150 m/s; landing and liftoff each add gravity losses and time to hover, and
// leaving that orbit for Earth (192,000 km away) takes about 590 m/s plus a margin.
const LANDER_BURNS = [
  {
    label: "Landing",
    info: "lunarLanding",
    target: LANDING_DELTA_V,
    note: "From the 50 × 150 km lunar orbit down to the surface, with time to hover.",
  },
  {
    label: "Liftoff",
    info: "lunarLiftoff",
    target: LIFTOFF_DELTA_V,
    note: "From the surface back up to a 100 × 100 km lunar orbit.",
  },
  {
    label: "Moon to Earth ejection",
    info: "transEarthInjection",
    target: 650,
    note: "Out of lunar orbit onto a path that falls back to Earth.",
  },
];

// With no docking, the RCS only has to hold attitude through the landing and the trip home.
const LANDER_RCS_DELTA_V_TARGET = 10;

// `design` is the spacecraft design plus `landerFuel` (tonnes).
export const computeLanderStats = (design) => {
  const { landerFuel } = design;
  const parts = [
    ...spacecraftParts(design),
    {
      name: "Landing stage",
      mass: LANDING_STAGE.mass + landerFuel * (1 + LANDER_TANK_FRACTION),
      cost: LANDING_STAGE.cost + landerFuel * LANDER_TANK_COST_PER_T,
    },
  ];
  const totalMass = sumOf(parts, "mass");
  const solarEarth = SOLAR_PANELS[design.solarPanels].power;
  const rcs = rcsDeltaV(totalMass, design.rcsFuel);
  const batteryCapacity = BATTERIES[design.batteries].capacity;
  const heatRejection = RADIATORS[design.radiators].rejection;
  // Every burn uses the same engine, so their Δv adds up: the burns use it in flight order.
  const landerDeltaV = LANDER_ISP * G0 * Math.log(totalMass / (totalMass - landerFuel));
  let remaining = landerDeltaV;

  return {
    parts,
    totalMass,
    totalCost: sumOf(parts, "cost"),
    solarEarth,
    batteryCapacity,
    heatRejection,
    rcsDeltaV: rcs,
    landerDeltaV,
    requirements: [
      ...LANDER_BURNS.map(({ target, ...burn }) => {
        const value = Math.min(remaining, target);
        remaining -= value;
        return { ...burn, value, target, unit: "m/s", digits: 0 };
      }),
      {
        label: "Power near the Moon",
        info: "powerDemand",
        value: solarEarth,
        target: POWER_DEMAND_KW,
        unit: "kW",
        note: "The Moon is as far from the Sun as Earth, so the panels make their full rated power.",
      },
      batteryRequirement(batteryCapacity),
      heatRequirement(heatRejection),
      {
        label: "RCS Δv",
        info: "rcsDeltaV",
        value: rcs,
        target: LANDER_RCS_DELTA_V_TARGET,
        unit: "m/s",
        digits: 0,
        note: "Enough to hold attitude through the landing, liftoff and trip home.",
      },
    ],
  };
};
