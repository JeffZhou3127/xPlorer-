import { clamp01, logScore, metres, percent } from "./scienceExperiments.js";
import { format } from "./format.js";

// Science experiments on the lunar surface (mission 2, step 7). No React.
// Same shape as the Mars-orbit set in scienceExperiments.js: nine instruments, each with
// `params`, `defaults` (poor on purpose) and a deterministic `run(values)` that returns
// { quality (0–100), findings: [{ label, value }], summary, hint }.
// Settings typed into a number box can briefly sit below their minimum, so models guard
// against zero where they divide.

// 1. Seismometer --------------------------------------------------------------------------
const SHROUDS = {
  none: { label: "None", noise: 5 },
  foil: { label: "Foil skirt", noise: 1.5 },
  insulated: { label: "Insulated shroud", noise: 0.3 },
};
const LANDER_VIBRATION = 50; // nm of ground motion 1 m from the lander's pumps and fans
const SENSOR_NOISE = 0.2; // nm, the instrument's own floor
// Moonquakes above a noise level of `n` nm per hour: QUAKE_RATE / n.
const QUAKE_RATE = 0.05;
const QUAKES_NEEDED = 10;

const runSeismometer = ({ distance, hours, shroud }) => {
  const lander = LANDER_VIBRATION / Math.max(1, distance) ** 2;
  const thermal = SHROUDS[shroud].noise;
  const noise = Math.hypot(lander, thermal, SENSOR_NOISE);
  const quakes = (QUAKE_RATE / noise) * hours;
  let hint = null;
  if (lander > thermal) hint = "The lander's own pumps and fans shake the ground. Set the seismometer farther away.";
  else if (shroud !== "insulated") hint = "Every sunrise and sunset the metal creaks as it heats and cools. Wrap it better.";
  else if (quakes < QUAKES_NEEDED) hint = "Moonquakes are rare. Listen for longer.";
  return {
    quality: percent(quakes / QUAKES_NEEDED),
    findings: [
      { label: "Lander vibration", value: `${format(lander, 2)} nm` },
      { label: "Thermal noise", value: `${format(thermal, 1)} nm` },
      { label: "Noise floor", value: `${format(noise, 2)} nm` },
      { label: "Moonquakes recorded", value: format(Math.floor(quakes)) },
    ],
    summary:
      quakes >= 3
        ? "Deep moonquakes repeat from the same spots about 1,000 km down, in step with Earth's tides: the Moon is still faintly alive inside."
        : "Nothing but the hum of the lander and the creak of the instrument.",
    hint,
  };
};

// 2. Heat flow probe ----------------------------------------------------------------------
const SURFACE_SWING_K = 140; // the day–night temperature swing at the surface
const SKIN_DEPTH_CM = 9; // the swing shrinks e-fold every SKIN_DEPTH_CM down
const DRILL_HEAT_K = 20; // warming left by the drill, fading over DRILL_COOLING_H
const DRILL_COOLING_H = 20;
const HEAT_FLOW = 21; // mW/m²

const runHeatFlow = ({ depth, hours }) => {
  const swing = SURFACE_SWING_K * Math.exp(-depth / SKIN_DEPTH_CM);
  const drill = DRILL_HEAT_K * Math.exp(-hours / DRILL_COOLING_H);
  const error = Math.hypot(swing, drill);
  const quality = percent(logScore(error, 0.1, 30));
  let hint = null;
  if (swing > drill) hint = "The day–night swing still reaches the sensors. Drill deeper, where the temperature holds steady.";
  else if (quality < 100) hint = "The ground is still warm from drilling. Wait longer before measuring.";
  return {
    quality,
    findings: [
      { label: "Day–night swing at depth", value: `${format(swing, 2)} K` },
      { label: "Drilling heat left", value: `${format(drill, 2)} K` },
      { label: "Measurement error", value: `${format(error, 2)} K` },
      { label: "Heat flow", value: error <= 1 ? `${HEAT_FLOW} mW/m²` : "—" },
    ],
    summary:
      error <= 1
        ? `${HEAT_FLOW} mW/m² of heat seeps out of the Moon, a quarter of Earth's: its interior has mostly cooled.`
        : "The probe is measuring the Sun's warmth, not the Moon's.",
    hint,
  };
};

// 3. Laser retroreflector -----------------------------------------------------------------
const EARTH_ELEVATION = 52; // ° above the horizon; Earth hangs still in the lunar sky
const ACCEPTANCE = 17; // ° off-axis where the corner cubes stop returning light
const DUST_REACH_M = 40; // liftoff blast coats nearby ground, fading e-fold over this
const RETURNS_NEEDED = 60; // photons per minute back at the Earth station

const runRetroreflector = ({ aim, distance }) => {
  const error = Math.abs(aim - EARTH_ELEVATION);
  const response = clamp01(1 - error / ACCEPTANCE);
  const dust = 0.9 * Math.exp(-distance / DUST_REACH_M);
  const returns = 100 * response * (1 - dust);
  let hint = null;
  if (response === 0) hint = "No light comes back. Aim the array at Earth: look up and find it.";
  else if (error > 3) hint = `Close: tilt the array to point straight at Earth, ${EARTH_ELEVATION}° up.`;
  else if (dust > 0.1) hint = "Dust from the lander's liftoff will coat the mirrors. Set it farther away.";
  return {
    quality: percent(returns / RETURNS_NEEDED),
    findings: [
      { label: "Aim error", value: `${format(error)}°` },
      { label: "Dust coating after liftoff", value: `${format(dust * 100)} %` },
      { label: "Returns per minute", value: format(returns, 1) },
      { label: "Range precision", value: returns > 0 ? `${format(20 / Math.sqrt(returns), 1)} mm` : "—" },
    ],
    summary:
      returns >= 30
        ? "The Earth–Moon distance, to the millimetre: the Moon is drifting 3.8 cm farther away every year."
        : "Too few photons come home to time them.",
    hint,
  };
};

// 4. X-ray spectrometer -------------------------------------------------------------------
const ROCK_TARGETS = {
  dusty: { label: "Dusty rock surface", purity: 0.3, summary: "Mostly the dust's composition, not the rock's: a mix from all over the Moon." },
  brushed: { label: "Brushed-clean rock", purity: 1, summary: "Basalt rich in iron and titanium: lava that flooded this basin 3.5 billion years ago." },
  soil: { label: "Loose soil", purity: 0.6, summary: "Mare basalt mixed with bright highland rock thrown here by distant impacts." },
};
const XRAY_RATE = 400; // counts per minute in contact
const XRAY_SNR_NEEDED = 50;

const runXray = ({ standoff, minutes, target }) => {
  const rate = XRAY_RATE / (1 + standoff / 10) ** 2;
  const counts = rate * minutes;
  const snr = Math.sqrt(counts) / 2;
  const { purity, summary } = ROCK_TARGETS[target];
  let hint = null;
  if (target === "dusty") hint = "You're measuring the dust coating, not the rock. Brush it clean first.";
  else if (standoff > 10) hint = "Few X-rays reach the detector from this far away. Move it closer to the rock.";
  else if (snr < XRAY_SNR_NEEDED) hint = "Count for longer to bring the noise down.";
  else if (target === "soil") hint = "Soil is a mix of rocks from everywhere. Pick one rock to learn where it came from.";
  return {
    quality: percent((snr / XRAY_SNR_NEEDED) * purity),
    findings: [
      { label: "X-rays counted", value: format(counts) },
      { label: "Signal-to-noise", value: format(snr, 1) },
      { label: "Iron oxide (FeO)", value: `18 ± ${format(Math.min(18, 54 / Math.max(snr, 1)), 1)} %` },
    ],
    summary: snr >= 10 ? summary : "The spectrum is too noisy to read.",
    hint,
  };
};

// 5. Ground-penetrating radar -------------------------------------------------------------
// In regolith: reach ≈ RADAR_DEPTH / f (m), resolution ≈ RADAR_RESOLUTION / f (m), f in MHz.
const RADAR_DEPTH = 6000;
const RADAR_RESOLUTION = 173;
const SUBSURFACE = {
  regolith: { label: "Bottom of the loose soil", depth: 8, detail: 0.5 },
  lava: { label: "Buried lava flows", depth: 150, detail: 10 },
};

const runRadar = ({ frequency, target }) => {
  const f = Math.max(1, frequency);
  const depth = RADAR_DEPTH / f;
  const resolution = RADAR_RESOLUTION / f;
  const goal = SUBSURFACE[target];
  const reach = clamp01(depth / goal.depth);
  const sharpness = clamp01(goal.detail / resolution);
  let hint = null;
  if (reach < 1) hint = "The echo fades before it gets deep enough. Lower frequencies reach deeper.";
  else if (sharpness < 1) hint = "The layers blur together. Higher frequencies resolve finer detail.";
  return {
    quality: percent(reach * sharpness),
    findings: [
      { label: "Penetration", value: metres(depth) },
      { label: "Vertical resolution", value: `${format(resolution, 2)} m` },
    ],
    summary:
      reach * sharpness >= 0.6
        ? target === "regolith"
          ? "The loose soil is 6 m deep here: three billion years of meteorites grinding the bedrock to powder."
          : "Lava flows stacked 140 m deep: the basin filled in eruption after eruption."
        : "The echo shows no clear structure.",
    hint,
  };
};

// 6. Soil core ----------------------------------------------------------------------------
const CORE_SITES = {
  blast: { label: "Beside the lander", intact: 0.5, note: "The descent engine blew away and stirred the top layers." },
  crater: { label: "Rim of a fresh crater", intact: 0.3, note: "Crater rims are churned-up rubble from deep below: no layers survive." },
  plain: { label: "Undisturbed plain", intact: 1, note: null },
};
const CORE_NEEDED_CM = 200;

const runCore = ({ depth, site }) => {
  const { intact, note } = CORE_SITES[site];
  const length = clamp01(depth / CORE_NEEDED_CM);
  const layers = Math.round((depth / 5) * intact);
  const years = depth * 2.5; // million years of soil per cm, roughly
  let hint = note;
  if (!hint && length < 1) hint = "Drill deeper for a longer record.";
  return {
    quality: percent(length * intact),
    findings: [
      { label: "Core length", value: `${format(depth)} cm` },
      { label: "Layers intact", value: format(layers) },
      { label: "Span of time", value: `${format(years)} million years` },
    ],
    summary:
      layers >= 20
        ? "Dozens of soil layers, each darkened by solar wind while it lay on top: a record of the Sun's activity."
        : "A jumble of soil without much of a story.",
    hint,
  };
};

// 7. Solar wind collector -----------------------------------------------------------------
const FACINGS = {
  sun: { label: "Face the Sun", catch: 1 },
  up: { label: "Straight up", catch: 0.6 },
  shade: { label: "In the lander's shade", catch: 0.02 },
};
const EXPOSURE_NEEDED_H = 40; // sunward hours for a clean measurement

const runSolarWind = ({ hours, facing }) => {
  const dose = hours * FACINGS[facing].catch;
  const helium = dose * 5; // 10¹⁰ atoms per cm² per hour
  let hint = null;
  if (facing === "shade") hint = "The solar wind streams straight from the Sun. Don't hide the foil from it.";
  else if (facing === "up") hint = "The Sun is low in the lunar morning sky. Tilt the foil to face it.";
  else if (dose < EXPOSURE_NEEDED_H) hint = "Leave the foil out longer to collect more atoms.";
  return {
    quality: percent(dose / EXPOSURE_NEEDED_H),
    findings: [
      { label: "Helium caught", value: `${format(helium)} × 10¹⁰ /cm²` },
      { label: "Neon caught", value: `${format(helium / 600, 2)} × 10¹⁰ /cm²` },
      { label: "Helium-3 ratio", value: dose >= 10 ? "1 in 2,350" : "—" },
    ],
    summary:
      dose >= 10
        ? "Helium, neon and argon straight from the Sun: its original make-up, never mixed into a planet."
        : "Only a trace of gas: not enough to measure.",
    hint,
  };
};

// 8. Extreme ultraviolet camera -----------------------------------------------------------
const EUV_FILTERS = {
  visible: { label: "Visible light", factor: 0, note: "Sunlit Earth blinds the camera in visible light; the faint glow around it is lost." },
  lyman: { label: "Hydrogen (121.6 nm)", factor: 0.3, note: "Earth's hydrogen halo outshines the plasmasphere at this wavelength. Try ionised helium." },
  helium: { label: "Ionised helium (30.4 nm)", factor: 1, note: null },
};
const EUV_SNR_NEEDED = 20;

const runEuv = ({ minutes, filter }) => {
  const { factor, note } = EUV_FILTERS[filter];
  const snr = 4 * Math.sqrt(minutes) * factor;
  let hint = note;
  if (!hint && snr < EUV_SNR_NEEDED) hint = "The plasmasphere glows very faintly. Expose longer.";
  return {
    quality: percent(snr / EUV_SNR_NEEDED),
    findings: [
      { label: "Exposure", value: `${format(minutes)} min` },
      { label: "Signal-to-noise", value: format(snr, 1) },
    ],
    summary:
      snr >= 8
        ? "Earth's plasmasphere, a cloud of charged gas glowing in helium light, bulging and shrinking as solar storms hit."
        : "Earth is a blazing disc with nothing visible around it.",
    hint,
  };
};

// 9. Ultraviolet telescope ----------------------------------------------------------------
const UV_SNR_NEEDED = 15;

const runTelescope = ({ angle, minutes }) => {
  // Sunlight scattered into the baffle and off the bright ground, relative to the star.
  const glare = 50 * Math.exp(-(angle - 10) / 20);
  const snr = Math.sqrt(minutes / (1 + glare));
  let hint = null;
  if (glare > 1) hint = "Sunlight is leaking into the telescope. Point it farther from the Sun.";
  else if (snr < UV_SNR_NEEDED) hint = "The star is faint. The Moon turns slowly, so you can stare for hours.";
  return {
    quality: percent(snr / UV_SNR_NEEDED),
    findings: [
      { label: "Stray light", value: `${format(glare, 2)} × the star` },
      { label: "Signal-to-noise", value: format(snr, 1) },
    ],
    summary:
      snr >= 5
        ? "Hours of steady light from a flaring star: no air and no fast day–night cycle make the Moon a stable observatory."
        : "The star flickers in and out of the noise.",
    hint,
  };
};

// The experiments, in display order (fields as in scienceExperiments.js).
export const LUNAR_EXPERIMENTS = [
  {
    id: "seismometer",
    title: "Moonquakes",
    instrument: "Seismometer",
    description: "Set a seismometer on the ground and listen for moonquakes, which show what lies deep inside. It is so sensitive it feels the lander's pumps and its own metal creaking.",
    params: [
      { key: "distance", label: "Distance from lander", type: "range", info: "deploymentDistance", unit: "m", min: 1, max: 100 },
      { key: "hours", label: "Listening time", type: "range", info: "integrationTime", unit: "h", min: 1, max: 72 },
      { key: "shroud", label: "Thermal cover", type: "select", info: "thermalShroud", options: SHROUDS },
    ],
    defaults: { distance: 2, hours: 4, shroud: "none" },
    run: runSeismometer,
  },
  {
    id: "heatflow",
    title: "Heat from inside",
    instrument: "Heat flow probe",
    description: "Drill a hole and lower temperature sensors into it. How fast heat leaks out of the Moon tells how hot its core still is.",
    params: [
      { key: "depth", label: "Hole depth", type: "range", info: "probeDepth", unit: "cm", min: 10, max: 300 },
      { key: "hours", label: "Wait before measuring", type: "range", info: "settlingTime", unit: "h", min: 1, max: 120 },
    ],
    defaults: { depth: 20, hours: 2 },
    run: runHeatFlow,
  },
  {
    id: "retroreflector",
    title: "Earth–Moon distance",
    instrument: "Laser retroreflector",
    description: "Leave an array of corner mirrors for telescopes on Earth to bounce lasers off. Timing the echo measures the distance to the Moon.",
    params: [
      { key: "aim", label: "Aim elevation", type: "range", info: "aimElevation", unit: "°", min: 0, max: 90 },
      { key: "distance", label: "Distance from lander", type: "range", info: "deploymentDistance", unit: "m", min: 5, max: 200 },
    ],
    defaults: { aim: 90, distance: 10 },
    run: runRetroreflector,
  },
  {
    id: "xray",
    title: "Rock chemistry",
    instrument: "X-ray spectrometer",
    description: "A small radioactive source makes atoms in a rock glow in X-rays, each element at its own energy. The detector must sit close and count for a long time.",
    params: [
      { key: "standoff", label: "Distance to rock", type: "range", info: "standoffDistance", unit: "mm", min: 0, max: 50 },
      { key: "minutes", label: "Counting time", type: "range", info: "integrationTime", unit: "min", min: 1, max: 180 },
      { key: "target", label: "Target", type: "select", options: ROCK_TARGETS },
    ],
    defaults: { standoff: 40, minutes: 5, target: "dusty" },
    run: runXray,
  },
  {
    id: "radar",
    title: "Below the surface",
    instrument: "Ground-penetrating radar",
    description: "The crew drags a radar across the ground. Its pulses echo off buried layers: low frequencies reach deeper, high ones see finer detail.",
    params: [
      { key: "frequency", label: "Frequency", type: "range", info: "groundRadarFrequency", unit: "MHz", min: 10, max: 800 },
      { key: "target", label: "Target", type: "select", options: SUBSURFACE },
    ],
    defaults: { frequency: 200, target: "lava" },
    run: runRadar,
  },
  {
    id: "core",
    title: "Soil history",
    instrument: "Core drill",
    description: "Drill out a column of soil to bring home. Undisturbed layers record billions of years of meteorites and solar wind.",
    params: [
      { key: "depth", label: "Core depth", type: "range", info: "coreDepth", unit: "cm", min: 10, max: 250 },
      { key: "site", label: "Drilling site", type: "select", options: CORE_SITES },
    ],
    defaults: { depth: 30, site: "blast" },
    run: runCore,
  },
  {
    id: "solarwind",
    title: "Solar wind",
    instrument: "Collector foil",
    description: "Hang a sheet of aluminium foil in the sunlight. Atoms streaming from the Sun bury themselves in it, to be counted back on Earth.",
    params: [
      { key: "hours", label: "Exposure", type: "range", unit: "h", min: 1, max: 72 },
      { key: "facing", label: "Foil facing", type: "select", options: FACINGS },
    ],
    defaults: { hours: 2, facing: "shade" },
    run: runSolarWind,
  },
  {
    id: "euv",
    title: "Earth's plasmasphere",
    instrument: "Extreme ultraviolet camera",
    description: "From the Moon, the whole of Earth fits in one picture, including a faint cloud of charged gas around it that is invisible from the ground.",
    params: [
      { key: "minutes", label: "Exposure", type: "range", unit: "min", min: 1, max: 60 },
      { key: "filter", label: "Filter", type: "select", info: "euvFilter", options: EUV_FILTERS },
    ],
    defaults: { minutes: 2, filter: "visible" },
    run: runEuv,
  },
  {
    id: "telescope",
    title: "Watching a star",
    instrument: "Ultraviolet telescope",
    description: "With no air and a two-week night and day, the Moon lets a small telescope stare at one star for hours, watching it flare.",
    params: [
      { key: "angle", label: "Angle from the Sun", type: "range", info: "sunAngle", unit: "°", min: 10, max: 180 },
      { key: "minutes", label: "Observing time", type: "range", info: "integrationTime", unit: "min", min: 1, max: 600 },
    ],
    defaults: { angle: 30, minutes: 10 },
    run: runTelescope,
  },
];
