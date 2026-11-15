// Simplified spacecraft systems model for the payload design screen.
// Masses are in tonnes, power in kW, stored energy in kWh and RCS fuel in kilograms.
// Every figure is a placeholder tuned for gameplay, in the right ballpark for a crew vehicle.
import { G0 } from "./rocketPhysics.js";

// Fixed parts of every spacecraft (cost in $M).
// The command pod carries the crew, life support and heat shield; the service module
// (the payload section) is the structure the power, thermal and RCS systems mount on.
export const COMMAND_POD = { mass: 7, cost: 14 };
export const SERVICE_MODULE = { mass: 2.5, cost: 4.5 };

// Steady electrical load of life support and avionics.
export const POWER_DEMAND_KW = 3;
// Almost all electricity ends up as heat, and the crew adds body heat on top.
const CREW_HEAT_KW = 0.4;
export const HEAT_LOAD_KW = POWER_DEMAND_KW + CREW_HEAT_KW;

// Sunlight weakens with the square of the distance from the Sun, so at Mars (1.52 AU)
// solar panels make only about 43% of the power they make near Earth.
const MARS_DISTANCE_AU = 1.524;
export const MARS_SOLAR_FACTOR = 1 / MARS_DISTANCE_AU ** 2;

// The batteries must run the spacecraft with no sunlight for this long
// (orbital night plus a safe-mode reserve).
export const BATTERY_BACKUP_HOURS = 4;
export const BATTERY_TARGET_KWH = POWER_DEMAND_KW * BATTERY_BACKUP_HOURS;

// Systems every spacecraft carries, each in a size the player picks. `power` is the panels' output near Earth.
export const SOLAR_PANELS = {
  small: { label: "Small (4 kW)", power: 4, mass: 0.3, cost: 2.5 },
  medium: { label: "Medium (8 kW)", power: 8, mass: 0.6, cost: 5 },
  large: { label: "Large (14 kW)", power: 14, mass: 1, cost: 8.5 },
};

export const BATTERIES = {
  small: { label: "Small (6 kWh)", capacity: 6, mass: 0.08, cost: 1 },
  medium: { label: "Medium (12 kWh)", capacity: 12, mass: 0.15, cost: 2 },
  large: { label: "Large (24 kWh)", capacity: 24, mass: 0.3, cost: 3.5 },
};

export const RADIATORS = {
  small: { label: "Small (2 kW)", rejection: 2, mass: 0.2, cost: 1.5 },
  medium: { label: "Medium (4 kW)", rejection: 4, mass: 0.4, cost: 3 },
  large: { label: "Large (7 kW)", rejection: 7, mass: 0.7, cost: 5 },
};

// Reaction control system: small hydrazine thrusters for attitude control and docking.
export const RCS_FUEL_RANGE_KG = { min: 0, max: 600 };
const RCS_ISP = 220; // s, monopropellant hydrazine
const RCS_TANK_FRACTION = 0.15; // tank mass per unit of fuel mass
const RCS_COST_PER_KG = 0.002; // $M, fuel and tankage
// Enough to rendezvous and dock with the refueling station and hold attitude on the way.
export const RCS_DELTA_V_TARGET = 30;

// Mass and cost of the command pod, service module and every system on it, in the order the
// stats panel lists them. `design` is { solarPanels, batteries, radiators, rcsFuel }.
export const spacecraftParts = ({ solarPanels, batteries, radiators, rcsFuel }) => {
  const rcsFuelT = rcsFuel / 1000;
  return [
    { name: "Command pod", ...COMMAND_POD },
    { name: "Service module", ...SERVICE_MODULE },
    { name: "Solar panels", mass: SOLAR_PANELS[solarPanels].mass, cost: SOLAR_PANELS[solarPanels].cost },
    { name: "Batteries", mass: BATTERIES[batteries].mass, cost: BATTERIES[batteries].cost },
    { name: "Radiators", mass: RADIATORS[radiators].mass, cost: RADIATORS[radiators].cost },
    { name: "RCS", mass: rcsFuelT * (1 + RCS_TANK_FRACTION), cost: rcsFuel * RCS_COST_PER_KG },
  ];
};

export const sumOf = (parts, key) => parts.reduce((sum, part) => sum + part[key], 0);

// Rocket equation for the RCS burning all its fuel.
export const rcsDeltaV = (totalMass, rcsFuel) =>
  RCS_ISP * G0 * Math.log(totalMass / (totalMass - rcsFuel / 1000));

// Requirements every crewed vehicle shares, for the stats panel's meters.
export const batteryRequirement = (capacity) => ({
  label: "Battery backup",
  info: "batteryBackup",
  value: capacity,
  target: BATTERY_TARGET_KWH,
  unit: "kWh",
  digits: 0,
  note: `Enough to run the spacecraft for ${BATTERY_BACKUP_HOURS} hours without sunlight.`,
});

export const heatRequirement = (rejection) => ({
  label: "Heat rejection",
  info: "heatRejection",
  value: rejection,
  target: HEAT_LOAD_KW,
  unit: "kW",
});

export const computeSpacecraftStats = (design) => {
  const parts = spacecraftParts(design);
  const totalMass = sumOf(parts, "mass");
  const solarEarth = SOLAR_PANELS[design.solarPanels].power;
  const solarMars = solarEarth * MARS_SOLAR_FACTOR;
  const batteryCapacity = BATTERIES[design.batteries].capacity;
  const heatRejection = RADIATORS[design.radiators].rejection;
  const rcs = rcsDeltaV(totalMass, design.rcsFuel);

  return {
    parts,
    totalMass,
    dryMass: totalMass - design.rcsFuel / 1000,
    totalCost: sumOf(parts, "cost"),
    solarEarth,
    solarMars,
    batteryCapacity,
    heatRejection,
    rcsDeltaV: rcs,
    requirements: [
      {
        label: "Power at Mars",
        info: "powerAtMars",
        value: solarMars,
        target: POWER_DEMAND_KW,
        unit: "kW",
      },
      batteryRequirement(batteryCapacity),
      heatRequirement(heatRejection),
      {
        label: "RCS Δv",
        info: "rcsDeltaV",
        value: rcs,
        target: RCS_DELTA_V_TARGET,
        unit: "m/s",
        digits: 0,
        note: "Enough to dock with the refueling station and hold attitude on the way.",
      },
    ],
  };
};
