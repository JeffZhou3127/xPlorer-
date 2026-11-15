// Simplified rocket performance model for the design screen.
// Masses are in tonnes, pressures in pascals, altitudes in kilometres.

export const G0 = 9.80665; // standard gravity, m/s²
const SEA_LEVEL_PRESSURE = 101325;
const SCALE_HEIGHT_KM = 8.5; // isothermal atmosphere approximation

// Low Earth orbit target: circular orbital velocity v = √(GM / r) at 300 km altitude
// (about 7,726 m/s). Gravity and drag losses on the way up are not included.
export const EARTH_GM = 3.986004418e14; // m³/s²
export const EARTH_RADIUS = 6371e3; // m
export const ORBIT_ALTITUDE_KM = 300;
// Mission 1's flight goals: the apogee, then the perigee, must end up in this window (km).
export const ORBIT_WINDOW_KM = { min: ORBIT_ALTITUDE_KM - 10, max: ORBIT_ALTITUDE_KM + 10 };
export const ORBIT_DELTA_V = Math.sqrt(EARTH_GM / (EARTH_RADIUS + ORBIT_ALTITUDE_KM * 1000));

// Characteristic velocity (c*), ratio of specific heats of the exhaust,
// average bulk density of the propellant load (t/m³), propellant price ($M per tonne)
// and a tank cost multiplier (cryogenic hydrogen needs insulated, more expensive tanks).
export const PROPELLANTS = {
  kerolox: {
    label: "Kerolox (RP-1 / LOX)",
    cStar: 1800,
    gamma: 1.22,
    density: 1.03,
    pricePerTonne: 0.0004,
    tankCostFactor: 1,
  },
  methalox: {
    label: "Methalox (CH₄ / LOX)",
    cStar: 1860,
    gamma: 1.2,
    density: 0.83,
    pricePerTonne: 0.0003,
    tankCostFactor: 1.1,
  },
  hydrolox: {
    label: "Hydrolox (LH₂ / LOX)",
    cStar: 2330,
    gamma: 1.2,
    density: 0.36,
    pricePerTonne: 0.004,
    tankCostFactor: 1.6,
  },
};

// Higher chamber pressure keeps the nozzle working well at sea level;
// efficiency covers propellant spent driving the turbopumps.
// Engine cost ($M each) rises with the complexity of the cycle.
export const ENGINE_CYCLES = {
  "gas-generator": { label: "Gas generator", chamberPressure: 7e6, engineCost: 2 },
  "staged-combustion": {
    label: "Staged combustion",
    chamberPressure: 20e6,
    efficiency: 0.99,
    engineCost: 5,
  },
  "full-flow": {
    label: "Full flow staged combustion",
    chamberPressure: 30e6,
    efficiency: 0.995,
    engineCost: 8,
  },
};

// Open cycle dumps the turbine exhaust overboard; closed cycle routes it into the nozzle.
export const GAS_GENERATOR_VARIANTS = {
  open: { label: "Open cycle", efficiency: 0.96, costFactor: 1 },
  closed: { label: "Closed cycle", efficiency: 0.98, costFactor: 1.25 },
};

export const EXPANSION_RATIO_RANGE = { min: 5, max: 100 };
// Above ~100 km (the Kármán line) the air is effectively vacuum.
export const ALTITUDE_RANGE_KM = { min: 0, max: 110 };

const COMBUSTION_EFFICIENCY = 0.98;
const TANK_MASS_PER_M3 = 0.055; // tank structure per cubic metre of propellant, t
const ENGINE_MASS = 1; // per engine, t
const STAGE_HARDWARE_MASS = 1; // plumbing, avionics and interstage per stage, t
const THROAT_AREA = 0.08; // nozzle throat area of one engine, m² (about Merlin-sized)

// Nozzle flow separates once wall pressure drops below ~40% of ambient (Summerfield criterion).
const SEPARATION_RATIO = 0.4;

export const ambientPressure = (altitudeKm) =>
  SEA_LEVEL_PRESSURE * Math.exp(-altitudeKm / SCALE_HEIGHT_KM);

// Isentropic nozzle relations (pressure ratios are relative to chamber pressure).
const pressureRatioAtMach = (mach, g) => (1 + ((g - 1) / 2) * mach * mach) ** (-g / (g - 1));

const areaRatioAtMach = (mach, g) =>
  (1 / mach) * ((2 / (g + 1)) * (1 + ((g - 1) / 2) * mach * mach)) ** ((g + 1) / (2 * (g - 1)));

const machAtPressureRatio = (ratio, g) =>
  Math.sqrt((2 / (g - 1)) * (ratio ** (-(g - 1) / g) - 1));

// Supersonic exit Mach number for an expansion ratio (bisection; area ratio rises with Mach).
const machAtAreaRatio = (areaRatio, g) => {
  let low = 1;
  let high = 100;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (areaRatioAtMach(mid, g) < areaRatio) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
};

const thrustCoefficient = (areaRatio, exitRatio, ambientRatio, g) =>
  Math.sqrt(
    ((2 * g * g) / (g - 1)) *
      (2 / (g + 1)) ** ((g + 1) / (g - 1)) *
      (1 - exitRatio ** ((g - 1) / g)),
  ) +
  (exitRatio - ambientRatio) * areaRatio;

const engineEfficiency = (stage) =>
  COMBUSTION_EFFICIENCY *
  (stage.cycle === "gas-generator"
    ? GAS_GENERATOR_VARIANTS[stage.gasGenerator].efficiency
    : ENGINE_CYCLES[stage.cycle].efficiency);

// Thrust coefficient and engine efficiency at the given altitude (Infinity for vacuum).
const nozzlePerformance = (stage, altitudeKm) => {
  const { gamma } = PROPELLANTS[stage.propellant];
  const { chamberPressure } = ENGINE_CYCLES[stage.cycle];
  const ambientRatio = ambientPressure(altitudeKm) / chamberPressure;

  let areaRatio = stage.expansionRatio;
  let exitRatio = pressureRatioAtMach(machAtAreaRatio(areaRatio, gamma), gamma);

  // A badly over-expanded nozzle separates; only the part upstream of that point produces thrust.
  if (exitRatio < SEPARATION_RATIO * ambientRatio) {
    exitRatio = SEPARATION_RATIO * ambientRatio;
    areaRatio = areaRatioAtMach(machAtPressureRatio(exitRatio, gamma), gamma);
  }

  const cf = Math.max(0, thrustCoefficient(areaRatio, exitRatio, ambientRatio, gamma));
  return { cf, efficiency: engineEfficiency(stage) };
};

// Specific impulse in seconds at the given altitude (Infinity for vacuum).
export const specificImpulse = (stage, altitudeKm) => {
  const { cf, efficiency } = nozzlePerformance(stage, altitudeKm);
  return (PROPELLANTS[stage.propellant].cStar * efficiency * cf) / G0;
};

// Total thrust of the stage's engines in newtons. Every engine has the same throat size,
// so a higher chamber pressure pushes more propellant through it and makes more thrust.
export const stageThrust = (stage, altitudeKm) => {
  const { cf, efficiency } = nozzlePerformance(stage, altitudeKm);
  return stage.engines * ENGINE_CYCLES[stage.cycle].chamberPressure * THROAT_AREA * cf * efficiency;
};

// Seconds to empty the tanks with every engine at full throttle. Propellant flow through
// a throat (chamber pressure × throat area ÷ c*) does not depend on altitude.
export const stageBurnTime = (stage) => {
  const massFlow =
    (stage.engines * ENGINE_CYCLES[stage.cycle].chamberPressure * THROAT_AREA) /
    PROPELLANTS[stage.propellant].cStar;
  return (stage.fuel * 1000) / massFlow;
};

// Costs are in millions of dollars (placeholder figures for the game).
const TANK_COST_PER_M3 = 0.02;
const STAGE_HARDWARE_COST = 2; // avionics, plumbing, interstage
// A bigger nozzle bell needs more material and cooling: +1% engine cost per unit of ratio.
const NOZZLE_COST_PER_RATIO = 0.01;

export const stageCost = (stage) => {
  const propellant = PROPELLANTS[stage.propellant];
  const cycleFactor =
    stage.cycle === "gas-generator" ? GAS_GENERATOR_VARIANTS[stage.gasGenerator].costFactor : 1;
  const engineCost =
    ENGINE_CYCLES[stage.cycle].engineCost *
    cycleFactor *
    (1 + stage.expansionRatio * NOZZLE_COST_PER_RATIO);
  const tankCost =
    (stage.fuel / propellant.density) * TANK_COST_PER_M3 * propellant.tankCostFactor;

  return (
    stage.engines * engineCost +
    tankCost +
    stage.fuel * propellant.pricePerTonne +
    STAGE_HARDWARE_COST
  );
};

export const dryMass = (stage) =>
  (stage.fuel / PROPELLANTS[stage.propellant].density) * TANK_MASS_PER_M3 +
  stage.engines * ENGINE_MASS +
  STAGE_HARDWARE_MASS;

// Strap-on solid rocket boosters (a pair; `fuel` is their combined propellant).
// Solid propellant is dense, cheap and simple, but less efficient than liquid engines.
export const SRB_DENSITY = 1.8; // t/m³
const SRB_ISP = 250; // averaged over the climb from sea level, s
export const SRB_BURN_TIME = 100; // s
const SRB_CASING_FRACTION = 0.12; // steel casing and nozzle, as a share of propellant mass
const SRB_HARDWARE_MASS = 1; // attachment struts and separation hardware, t
const SRB_COST_PER_TONNE = 0.03;
const SRB_HARDWARE_COST = 1.5;

// The boosters fire from the pad alongside Stage 1 and are dropped once empty.
// For Δv they are treated as their own phase that carries the whole fuelled stack.
export const srbDryMass = (srbs) => srbs.fuel * SRB_CASING_FRACTION + SRB_HARDWARE_MASS;

// Combined thrust of the pair in newtons, constant for the whole burn.
export const srbThrust = (srbs) => ((srbs.fuel * 1000) / SRB_BURN_TIME) * SRB_ISP * G0;

const computeSrbStats = (srbs, stackMass) => {
  const dry = srbDryMass(srbs);
  const startMass = stackMass + dry + srbs.fuel;
  const thrust = srbThrust(srbs);

  return {
    cost: srbs.fuel * SRB_COST_PER_TONNE + SRB_HARDWARE_COST,
    isp: SRB_ISP,
    thrust,
    burnTime: SRB_BURN_TIME,
    dryMass: dry,
    wetMass: dry + srbs.fuel,
    startMass,
    deltaV: SRB_ISP * G0 * Math.log(startMass / (stackMass + dry)),
  };
};

// Per-stage performance; `stages` is ordered from the bottom stage up.
// Each stage pushes everything above it, so mass is accumulated from the top down.
// `srbs` is optional ({ fuel }) and adds a booster phase below Stage 1.
// `payloadMass` is the spacecraft on top, in tonnes (from the spacecraft designer).
export const computeRocketStats = (stages, srbs, payloadMass) => {
  const results = Array.from({ length: stages.length });
  let massAbove = payloadMass;
  let totalDeltaV = 0;
  let totalCost = 0;

  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i];
    const dry = dryMass(stage);
    const startMass = massAbove + dry + stage.fuel;
    const endMass = massAbove + dry;
    const isp = specificImpulse(stage, stage.altitude);
    const deltaV = isp * G0 * Math.log(startMass / endMass);
    const thrust = stageThrust(stage, stage.altitude);
    const cost = stageCost(stage);

    results[i] = {
      cost,
      id: stage.id,
      isp,
      thrust,
      burnTime: stageBurnTime(stage),
      dryMass: dry,
      wetMass: dry + stage.fuel,
      startMass,
      deltaV,
    };
    massAbove = startMass;
    totalDeltaV += deltaV;
    totalCost += cost;
  }

  let srbStats = null;
  if (srbs) {
    srbStats = computeSrbStats(srbs, massAbove);
    massAbove = srbStats.startMass;
    totalDeltaV += srbStats.deltaV;
    totalCost += srbStats.cost;
  }

  // Stage 1 at sea level plus any boosters lift the whole fuelled rocket off the pad.
  const liftoffThrust = stageThrust(stages[0], 0) + (srbStats?.thrust ?? 0);
  const liftoffThrustToWeight = liftoffThrust / (massAbove * 1000 * G0);

  return {
    stages: results,
    srbs: srbStats,
    totalDeltaV,
    totalCost,
    liftoffMass: massAbove,
    liftoffThrustToWeight,
    payloadMass,
  };
};

// Each attached stage's share of a burn, in firing order: `stages` from `stageIndex` up,
// with `stageFuel` the fraction of each stage's fuel still on board. Each stage pushes the
// stages above it and the payload (t); `isp(stage)` gives its specific impulse in seconds.
// Returns [{ index, fuel (t), startMass (t), exhaust (m/s), deltaV (m/s) }].
export const stagePhases = (stages, stageIndex, stageFuel, payloadMass, isp) => {
  const phases = [];
  let massAbove = payloadMass;
  for (let i = stages.length - 1; i >= stageIndex; i--) {
    const fuel = stages[i].fuel * stageFuel[i];
    const dry = massAbove + dryMass(stages[i]);
    const exhaust = isp(stages[i]) * G0;
    phases.unshift({ index: i, fuel, startMass: dry + fuel, exhaust, deltaV: exhaust * Math.log((dry + fuel) / dry) });
    massAbove = dry + fuel;
  }
  return phases;
};

// Burns `deltaV` (m/s) with the stages from `stageIndex` up, in order, dropping every
// stage it empties (the top stage stays on, even when empty). Arguments as stagePhases.
// Returns { stageIndex, stageFuel, short }: the stage now firing, the fuel fractions
// left, and the Δv still missing when the stages ran out (0 if the burn was completed).
export const spendDeltaV = (stages, stageIndex, stageFuel, payloadMass, deltaV, isp) => {
  const fuelLeft = [...stageFuel];
  let active = stageIndex;
  let need = deltaV;
  for (const { index, fuel, startMass, exhaust, deltaV: phaseDeltaV } of stagePhases(
    stages,
    stageIndex,
    stageFuel,
    payloadMass,
    isp,
  )) {
    if (need <= 0) break;
    const share = Math.min(need, phaseDeltaV);
    const burned = startMass * (1 - Math.exp(-share / exhaust));
    fuelLeft[index] = fuel > 0 ? Math.max(0, (fuel - burned) / stages[index].fuel) : 0;
    need -= share;
    if (share >= phaseDeltaV && index < stages.length - 1) active = index + 1;
  }
  return { stageIndex: active, stageFuel: fuelLeft, short: Math.max(0, need) };
};
