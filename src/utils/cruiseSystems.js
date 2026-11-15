import { AU, DAY, marsAt, positionAt } from "./marsTransfer.js";
import { HEAT_LOAD_KW, POWER_DEMAND_KW } from "./spacecraftPhysics.js";

// The spacecraft's systems on the coast to Mars (mission 1, step 8). No React.
// Power: the panels make `solarEarth` kW at 1 AU, falling with the square of the distance
// from the Sun; the battery covers any shortfall and recharges from any surplus.
// Heat: the radiators reject up to their rating; anything above it warms the cabin.
// RCS: small attitude trims keep the panels on the Sun, spending RCS Δv as it flies.
// Every figure is a placeholder tuned for gameplay.

// Cabin temperature: where the thermostat holds it, and where the crew is in danger.
export const CABIN_NOMINAL_C = 21;
export const CABIN_MAX_C = 40;
// Heat (kJ) to warm the whole spacecraft by 1 °C: a small overload takes a few days.
const THERMAL_MASS_KJ_PER_K = 40000;

// RCS Δv (m/s) to turn to the cruise attitude after the burn, then spent per day on trims.
export const RCS_SETTLE = 1;
export const RCS_PER_DAY = 0.04;

// Integration step, and the spacing of the timeline's samples.
const STEP = 3600;

// Failure kinds this model raises (the flight panel's are "twr", "crash" and "fuel").
const CRUISE_FAILURE_KINDS = ["power", "heat", "rcs"];
export const isCruiseFailure = (failure) => CRUISE_FAILURE_KINDS.includes(failure?.kind);

// Hour-by-hour systems state from the burn to `until` s, for a spacecraft with `stats`
// (from computeSpacecraftStats) and `rcsStart` m/s of RCS Δv left after docking, along
// `path` (from transferPath). Returns { samples: [{ t, au, solar (kW), battery (kWh),
// temperature (°C), rcs (m/s) }], failure }, where `failure` is null or { kind: "power" |
// "heat" | "rcs", time, ...the state then, plus the design figures it is judged against }
// and the samples stop at it.
export const cruiseTimeline = (path, stats, rcsStart, until) => {
  const samples = [];
  let battery = stats.batteryCapacity;
  let temperature = CABIN_NOMINAL_C;
  let rcs = rcsStart - RCS_SETTLE;

  for (let t = 0; t <= until + STEP; t += STEP) {
    const at = positionAt(path.points, t);
    const au = Math.hypot(at.x, at.y) / AU;
    const now = { t, au, solar: stats.solarEarth / (au * au), battery, temperature, rcs };
    samples.push(now);

    let kind = null;
    if (rcs <= 0) kind = "rcs";
    else if (battery <= 0) kind = "power";
    else if (temperature >= CABIN_MAX_C) kind = "heat";
    if (kind) {
      const mars = marsAt(t);
      return {
        samples,
        failure: {
          ...now,
          kind,
          time: t,
          battery: Math.max(0, battery),
          rcs: Math.max(0, rcs),
          rcsStart,
          demand: POWER_DEMAND_KW,
          batteryCapacity: stats.batteryCapacity,
          heatLoad: HEAT_LOAD_KW,
          heatRejection: stats.heatRejection,
          marsDistance: Math.hypot(at.x - mars.x, at.y - mars.y),
        },
      };
    }

    battery = Math.min(stats.batteryCapacity, battery + (now.solar - POWER_DEMAND_KW) * (STEP / 3600));
    // Radiators with spare capacity hold the cabin at the thermostat setting.
    const excess = HEAT_LOAD_KW - stats.heatRejection;
    temperature = Math.max(CABIN_NOMINAL_C, temperature + (excess * STEP) / THERMAL_MASS_KJ_PER_K);
    rcs -= (RCS_PER_DAY * STEP) / DAY;
  }
  return { samples, failure: null };
};

// The systems state `t` s after the burn, between the timeline's samples.
export const systemsAt = (samples, t) => {
  const i = Math.min(samples.length - 1, Math.max(0, Math.floor(t / STEP)));
  const p = samples[i];
  const q = samples[Math.min(samples.length - 1, i + 1)];
  const u = q.t > p.t ? Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t))) : 0;
  const mix = (key) => p[key] + (q[key] - p[key]) * u;
  return {
    au: mix("au"),
    solar: mix("solar"),
    battery: Math.max(0, mix("battery")),
    temperature: mix("temperature"),
    rcs: Math.max(0, mix("rcs")),
  };
};
