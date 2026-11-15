import { MARS } from "./flightSim.js";
import { PERIAPSIS_ALTITUDE_KM, TARGET_APOGEE_KM } from "./marsArrival.js";
import { format } from "./format.js";

// Science experiments in Mars orbit (mission 1, step 10). No React.
// Nine instruments, each with a few settings (`params`) and a `run(values)` that turns
// them into a result: { quality (0–100), findings: [{ label, value }], summary, hint }.
// Models are simple and deterministic (the same settings always give the same result),
// tuned so a careless choice gives poor data and a thoughtful one gives good data.
// An experiment counts as complete once a run reaches COMPLETE_QUALITY.

export const COMPLETE_QUALITY = 60;
// Experiments needed before the mission can continue.
export const REQUIRED_EXPERIMENTS = 2;

// The science orbit from M1S9, in km and km³/s².
const R = MARS.radius / 1000;
const GM = MARS.gm / 1e9;
export const ORBIT_PERIAPSIS_KM = PERIAPSIS_ALTITUDE_KM;
export const ORBIT_APOAPSIS_KM = (TARGET_APOGEE_KM.min + TARGET_APOGEE_KM.max) / 2;
const RP = R + ORBIT_PERIAPSIS_KM;
const RA = R + ORBIT_APOAPSIS_KM;
const SEMI_MAJOR = (RP + RA) / 2;
// Specific angular momentum, km²/s.
const MOMENTUM = Math.sqrt(GM * SEMI_MAJOR * (1 - ((RA - RP) / (RA + RP)) ** 2));

// Orbital speed (km/s) at `altitude` (km) in the science orbit (vis-viva).
const orbitSpeed = (altitude) => {
  const r = R + altitude;
  return Math.sqrt(GM * (2 / r - 1 / SEMI_MAJOR));
};
// How fast the point under the spacecraft moves across the ground (km/s).
const groundSpeed = (altitude) => {
  const r = R + altitude;
  return (MOMENTUM / r) * (R / r);
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
// 1 at or below `good`, falling on a log scale to 0 at `bad` (good < bad).
const logScore = (value, good, bad) => clamp01(Math.log(bad / value) / Math.log(bad / good));
const percent = (q) => Math.round(clamp01(q) * 100);
const km = (v) => `${format(v)} km`;
const metres = (v) => (v >= 1000 ? `${format(v / 1000, 1)} km` : `${format(v)} m`);

// Shared by the two cameras: each pixel sees CAMERA_IFOV radians.
const CAMERA_IFOV = 20e-6;
// Signal-to-noise for an exposure (ms) through a filter/target brightness factor.
const cameraSnr = (exposureMs, brightness) => 25 * Math.sqrt(exposureMs * brightness);

const ALTITUDE_PARAM = {
  key: "altitude",
  label: "Altitude",
  type: "range",
  unit: "km",
  min: ORBIT_PERIAPSIS_KM,
  max: ORBIT_APOAPSIS_KM,
};

// 1. High-resolution camera ---------------------------------------------------------------
const FILTERS = {
  red: { label: "Red (650 nm)", brightness: 1 },
  nir: { label: "Near-infrared (900 nm)", brightness: 0.7 },
  blue: { label: "Blue (450 nm)", brightness: 0.25 },
};

const runCamera = ({ altitude, exposure, filter }) => {
  const pixel = altitude * 1000 * CAMERA_IFOV; // m
  const smear = groundSpeed(altitude) * 1000 * (exposure / 1000); // m
  const resolution = Math.hypot(pixel, smear);
  const snr = cameraSnr(exposure, FILTERS[filter].brightness);
  const sharpness = logScore(resolution, 30, 1000);
  const signal = clamp01(snr / 50);
  let summary = "Only regional geology shows: craters and volcanoes, no fine detail.";
  if (resolution <= 40) summary = "Boulders, dune ripples and dark slope streaks are visible.";
  else if (resolution <= 120) summary = "Dunes, gullies and layered crater walls are visible.";
  let hint = null;
  if (signal < 1) {
    hint =
      filter === "blue"
        ? "The image is grainy: Mars is dark in blue light. Try red, or a longer exposure."
        : "The image is grainy: lengthen the exposure to collect more light.";
  } else if (smear > pixel) {
    hint = "The ground moved during the exposure and smeared the image. Shorten the exposure.";
  } else if (sharpness < 1) {
    hint = "Each pixel covers too much ground. Take the picture lower in the orbit.";
  }
  return {
    quality: percent(sharpness * signal),
    findings: [
      { label: "Pixel size", value: metres(pixel) },
      { label: "Motion smear", value: metres(smear) },
      { label: "Effective resolution", value: metres(resolution) },
      { label: "Signal-to-noise", value: format(snr) },
    ],
    summary,
    hint,
  };
};

// 2. Atmospheric spectrometer -------------------------------------------------------------
// abundance in `unit`; sigma0: 1-σ noise for 1 s looking straight down.
const GASES = {
  co2: { label: "Carbon dioxide (CO₂)", name: "Carbon dioxide", abundance: 95, unit: "%", digits: 1, sigma0: 20 },
  co: { label: "Carbon monoxide (CO)", name: "Carbon monoxide", abundance: 700, unit: "ppm", digits: 0, sigma0: 1500 },
  h2o: { label: "Water vapour (H₂O)", name: "Water vapour", abundance: 210, unit: "ppm", digits: 0, sigma0: 600 },
  ch4: { label: "Methane (CH₄)", name: "Methane", abundance: 0, unit: "ppb", digits: 1, sigma0: 50 },
};
const GEOMETRIES = {
  nadir: { label: "Nadir (straight down)", gain: 1 },
  limb: { label: "Limb (edge of the atmosphere)", gain: 3 },
};

const runSpectrometer = ({ gas, integration, geometry }) => {
  const g = GASES[gas];
  const sigma = g.sigma0 / (Math.sqrt(integration) * GEOMETRIES[geometry].gain);
  const amount = (v) => `${format(v, g.digits)} ${g.unit}`;
  const profile = { label: "Vertical profile", value: geometry === "limb" ? "Yes" : "No (column only)" };
  if (g.abundance === 0) {
    // Nothing there to find: the result is how tight an upper limit the run sets.
    const limit = 3 * sigma;
    const quality = percent(logScore(limit, 2.5, 20));
    return {
      quality,
      findings: [
        { label: "Detected", value: "No" },
        { label: "Upper limit (3σ)", value: amount(limit) },
        { label: "Noise (1σ)", value: amount(sigma) },
        profile,
      ],
      summary:
        quality >= COMPLETE_QUALITY
          ? `No ${g.name.toLowerCase()} found down to ${amount(limit)}: a tight limit on any living or geological source.`
          : `No ${g.name.toLowerCase()} found, but the limit of ${amount(limit)} is too loose to rule much out.`,
      hint: quality < 100 ? "Integrate longer, and look through the limb for a longer path through the air." : null,
    };
  }
  const snr = g.abundance / sigma;
  const detected = snr >= 3;
  return {
    quality: percent(snr / 20),
    findings: [
      { label: "Detected", value: detected ? "Yes" : "No" },
      { label: "Abundance", value: detected ? `${amount(g.abundance)} ± ${amount(sigma)}` : "—" },
      { label: "Signal-to-noise", value: format(snr, 1) },
      profile,
    ],
    summary: detected
      ? `${g.name} measured at ${amount(g.abundance)}.`
      : `${g.name} is lost in the noise.`,
    hint: snr < 20 ? "The signal is weak: integrate longer, or look through the limb." : null,
  };
};

// 3. Magnetometer -------------------------------------------------------------------------
const REGIONS = {
  highlands: { label: "Southern highlands", surfaceField: 2000 },
  lowlands: { label: "Northern lowlands", surfaceField: 30 },
};
const CRUST_SCALE_KM = 300; // how quickly crustal fields fade with height
const SPACECRAFT_FIELD = 50; // nT, at the spacecraft body
const SOLAR_WIND_NOISE = 2; // nT, the solar wind's field draped around Mars

const runMagnetometer = ({ boom, altitude, region }) => {
  const field = REGIONS[region].surfaceField * (1 + altitude / CRUST_SCALE_KM) ** -3;
  const selfNoise = SPACECRAFT_FIELD / (1 + boom) ** 3;
  const noise = Math.hypot(selfNoise, SOLAR_WIND_NOISE);
  const snr = field / noise;
  let hint = null;
  if (selfNoise > SOLAR_WIND_NOISE) hint = "The spacecraft's own electronics swamp the sensor. Use a longer boom.";
  else if (region === "lowlands") hint = "The northern lowlands are barely magnetised. Try the old southern crust.";
  else if (snr < 10) hint = "Crustal fields fade fast with height. Measure lower in the orbit.";
  return {
    quality: percent(snr / 10),
    findings: [
      { label: "Crustal field", value: `${format(field, 1)} nT` },
      { label: "Spacecraft noise", value: `${format(selfNoise, 1)} nT` },
      { label: "Solar wind noise", value: `${format(SOLAR_WIND_NOISE, 1)} nT` },
      { label: "Signal-to-noise", value: format(snr, 1) },
    ],
    summary:
      snr >= 3
        ? "Magnetised stripes in the ancient crust: Mars once had a global magnetic field, but its dynamo died billions of years ago."
        : "No crustal magnetism stands out from the noise.",
    hint,
  };
};

// 4. Neutron spectrometer -----------------------------------------------------------------
const LATITUDES = {
  polar: { label: "Polar (above 60°)", water: 50, verdict: "Ice-rich ground within a metre of the surface." },
  mid: { label: "Mid-latitude (30–60°)", water: 8, verdict: "Patchy buried ice, a resource for future crews." },
  equator: { label: "Equatorial (below 30°)", water: 3, verdict: "Mostly dry ground, water bound in minerals." },
};
const WATER_NOISE = 10; // % water-equivalent hydrogen, 1-σ after one orbit

const runNeutrons = ({ latitude, orbits }) => {
  const { water, verdict } = LATITUDES[latitude];
  const sigma = WATER_NOISE / Math.sqrt(orbits);
  const snr = water / sigma;
  return {
    quality: percent(snr / 10),
    findings: [
      { label: "Water-equivalent hydrogen", value: `${format(water, 1)} ± ${format(sigma, 1)} %` },
      { label: "Signal-to-noise", value: format(snr, 1) },
      { label: "Orbits counted", value: format(orbits) },
    ],
    summary: snr >= 3 ? verdict : "Too few neutrons counted to tell how much hydrogen is there.",
    hint: snr < 10 ? "Count over more orbits; a weak signal needs more neutrons to stand out." : null,
  };
};

// 5. Ground-penetrating radar -------------------------------------------------------------
const SIDES = {
  night: { label: "Night side", plasma: 1 }, // ionosphere's plasma frequency, MHz
  day: { label: "Day side", plasma: 4 },
};
const RADAR_TARGETS = {
  base: { label: "Base of the polar ice cap" },
  layers: { label: "Layers inside the ice cap" },
};
const ICE_CAP_THICKNESS_KM = 3.7;
const ICE_LAYER_M = 30;

const runRadar = ({ frequency, side, target }) => {
  const { plasma } = SIDES[side];
  // Below the plasma frequency the ionosphere reflects the pulse; just above it, it smears it.
  const ionosphere = clamp01((frequency - plasma) / plasma);
  const depth = Math.min(ICE_CAP_THICKNESS_KM, 12 / frequency); // km
  const resolution = 212 / frequency; // m in ice, from a bandwidth of 40% of the frequency
  const reach = target === "base" ? depth / ICE_CAP_THICKNESS_KM : clamp01(ICE_LAYER_M / resolution);
  let hint = null;
  if (ionosphere === 0) hint = "The pulse bounced off the ionosphere. Use a higher frequency, or sound the night side.";
  else if (ionosphere < 1) hint = "The ionosphere distorted the echo. Go higher in frequency, or sound the night side.";
  else if (target === "base" && reach < 1) hint = "The pulse fades before the bottom. Lower frequencies reach deeper.";
  else if (target === "layers" && reach < 1) hint = "The layers blur together. Higher frequencies resolve finer detail.";
  let summary = "No usable echo from below the surface.";
  if (ionosphere > 0) {
    summary =
      target === "base"
        ? depth >= ICE_CAP_THICKNESS_KM
          ? `Echo from bedrock ${format(ICE_CAP_THICKNESS_KM, 1)} km down: enough ice to cover Mars 11 m deep if melted.`
          : `The echo fades ${format(depth, 1)} km into the ice, short of the bottom.`
        : resolution <= ICE_LAYER_M
          ? "Hundreds of layers, each a record of an ancient climate cycle."
          : "The ice looks uniform at this resolution.";
  }
  return {
    quality: percent(ionosphere * reach),
    findings: [
      { label: "Ionosphere loss", value: `${format((1 - ionosphere) * 100)} %` },
      { label: "Penetration", value: `${format(depth, 1)} km` },
      { label: "Vertical resolution", value: metres(resolution) },
    ],
    summary,
    hint,
  };
};

// 6. Thermal infrared camera --------------------------------------------------------------
const BANDS = {
  b7: { label: "7 µm", wavelength: 7e-6 },
  b12: { label: "12 µm", wavelength: 12e-6 },
  b25: { label: "25 µm", wavelength: 25e-6 },
};
const PLANCK_C2 = 1.4388e-2; // m·K

// Surface temperature (K) at local solar time `hour`: warmest after noon, coldest before dawn.
const surfaceTemperature = (hour) => 210 + 55 * Math.cos((2 * Math.PI * (hour - 13.5)) / 24);
// Temperature gap between rock and dust (K): rock holds heat through the night, dust doesn't.
// Largest before dawn, smaller in the afternoon, near zero mid-morning and early evening.
const rockDustContrast = (hour) => {
  const night = Math.cos((2 * Math.PI * (hour - 5)) / 24);
  return night > 0 ? 25 * night ** 2 :8 * -night * Math.abs(Math.cos((2 * Math.PI * (hour - 14)) / 12));
};
// Noise-equivalent temperature difference (arbitrary units) of a background-limited
// detector: photon noise (√ radiance, Planck's law) over the radiance change per kelvin.
// Cold ground is faint at short wavelengths, and long wavelengths respond weakly to
// temperature, so ~12 µm works best on a cold night.
const relativeNetd = (wavelength, t) => {
  const x = PLANCK_C2 / (wavelength * t);
  const radiance = 1 / (wavelength ** 5 * Math.expm1(x));
  const perKelvin = (x * Math.exp(x)) / (Math.expm1(x) * t); // d(ln radiance)/dT
  return 1 / (Math.sqrt(radiance) * perKelvin);
};
// Scaled so the 12 µm band looking at 250 K ground sees REFERENCE_NETD.
const REFERENCE_NETD = 1.2; // K
const REFERENCE = relativeNetd(12e-6, 250);
const runThermal = ({ hour, band }) => {
  const t = surfaceTemperature(hour);
  const contrast = rockDustContrast(hour);
  const { wavelength } = BANDS[band];
  const netd = REFERENCE_NETD * (relativeNetd(wavelength, t) / REFERENCE); // K
  const snr = contrast / netd;
  let hint = null;
  if (contrast < 10) hint = "Rock and dust are nearly the same temperature now. Look before dawn, when the dust has cooled.";
  else if (snr < 15) hint = "The detector is noisy in this band. Pick the one where cold ground glows brightest.";
  return {
    quality: percent(snr / 15),
    findings: [
      { label: "Surface temperature", value: `${format(t)} K (${format(t - 273.15)} °C)` },
      { label: "Rock–dust contrast", value: `${format(contrast, 1)} K` },
      { label: "Detector noise", value: `${format(netd, 2)} K` },
      { label: "Signal-to-noise", value: format(snr, 1) },
    ],
    summary:
      snr >= 5
        ? "Bare rock outcrops stand out warm against the cold dust: good landing sites and old lava flows."
        : "The surface looks thermally uniform.",
    hint,
  };
};

// 7. Radio occultation --------------------------------------------------------------------
const RADIO_BANDS = {
  s: { label: "S band (2.3 GHz)", wavelength: 0.13, clarity: 0.5 },
  x: { label: "X band (8.4 GHz)", wavelength: 0.036, clarity: 0.95 },
  ka: { label: "Ka band (32 GHz)", wavelength: 0.0094, clarity: 0.9 },
};
const LIMB_DISTANCE_M = 5e6; // spacecraft to the edge of the planet
const LIMB_DESCENT_KM_S = 2; // how fast the ray sinks through the atmosphere

const runOccultation = ({ band, rate }) => {
  const { wavelength, clarity } = RADIO_BANDS[band];
  const fresnel = Math.sqrt(wavelength * LIMB_DISTANCE_M); // m
  const sampling = (LIMB_DESCENT_KM_S * 1000) / rate; // m between samples
  const resolution = Math.max(fresnel, sampling);
  const sharpness = logScore(resolution, 500, 5000);
  let hint = null;
  if (clarity < 0.9) hint = "Charged particles in space scramble low-frequency signals. Try a higher band.";
  else if (sampling > fresnel) hint = "Samples are too far apart. Sample faster to resolve thin layers.";
  else if (sharpness < 1) hint = "Diffraction limits the detail. A shorter wavelength sharpens it.";
  return {
    quality: percent(sharpness * clarity),
    findings: [
      { label: "Diffraction limit", value: metres(fresnel) },
      { label: "Sample spacing", value: metres(sampling) },
      { label: "Vertical resolution", value: metres(resolution) },
      { label: "Surface pressure", value: "6.1 mbar" },
    ],
    summary:
      resolution <= 1000
        ? "Temperature profile from the ground to 40 km, with a 6 km deep afternoon boundary layer."
        : "A coarse temperature profile: no fine structure.",
    hint,
  };
};

// 8. Moon survey --------------------------------------------------------------------------
// Orbit altitude (km), orbital speed (km/s, circular), brightness for the camera.
const MOONS = {
  phobos: { label: "Phobos", altitude: 5989, brightness: 0.3 },
  deimos: { label: "Deimos", altitude: 20069, brightness: 0.3 },
};
const MIN_MOON_RANGE_KM = 150;

const runMoons = ({ moon, altitude, exposure }) => {
  const m = MOONS[moon];
  const range = Math.max(MIN_MOON_RANGE_KM, Math.abs(m.altitude - altitude));
  const moonSpeed = Math.sqrt(GM / (R + m.altitude));
  // Polar orbit against an equatorial moon: the paths cross at right angles.
  const relative = Math.hypot(orbitSpeed(altitude), moonSpeed) * (MIN_MOON_RANGE_KM / range);
  const pixel = range * 1000 * CAMERA_IFOV;
  const smear = relative * 1000 * (exposure / 1000);
  const resolution = Math.hypot(pixel, smear);
  const snr = cameraSnr(exposure, m.brightness);
  const sharpness = logScore(resolution, 15, 500);
  const signal = clamp01(snr / 40);
  let hint = null;
  if (pixel > 15) hint = `Too far away. Take the shot where your orbit comes closest to ${m.label}'s altitude.`;
  else if (signal < 1) hint = "The moons are as dark as coal. Expose longer.";
  else if (sharpness < 1) hint = "The moon raced across the frame. Shorten the exposure.";
  return {
    quality: percent(sharpness * signal),
    findings: [
      { label: "Range", value: km(range) },
      { label: "Pixel size", value: metres(pixel) },
      { label: "Motion smear", value: metres(smear) },
      { label: "Signal-to-noise", value: format(snr) },
    ],
    summary:
      resolution <= 50
        ? moon === "phobos"
          ? "Stickney crater and long parallel grooves: tidal stress is slowly tearing Phobos apart."
          : "A smooth, dust-blanketed surface with softened craters."
        : `${m.label} is a lumpy grey blob at this resolution.`,
    hint,
  };
};

// 9. Gravity mapping ----------------------------------------------------------------------
const GRAVITY_TARGETS = {
  tharsis: { label: "Tharsis volcanic bulge", signal: 5, verdict: "Tharsis is so massive it has tilted Mars's crust." },
  olympus: { label: "Olympus Mons", signal: 0.5, verdict: "Olympus Mons sits on a crust thick enough to hold up its weight." },
  co2: { label: "Seasonal CO₂ frost cap", signal: 0.04, verdict: "Each winter about a quarter of the atmosphere freezes onto the poles, and the mass shift shows." },
};
const DOPPLER_NOISE = { x: 0.1, ka: 0.03 }; // mm/s per pass
const DOPPLER_BANDS = {
  x: { label: "X band (8.4 GHz)" },
  ka: { label: "Ka band (32 GHz)" },
};

const runGravity = ({ target, band, orbits }) => {
  const { signal, verdict } = GRAVITY_TARGETS[target];
  const noise = DOPPLER_NOISE[band] / Math.sqrt(orbits);
  const snr = signal / noise;
  return {
    quality: percent(snr / 20),
    findings: [
      { label: "Velocity signal", value: `${format(signal, 2)} mm/s` },
      { label: "Tracking noise", value: `${format(noise, 3)} mm/s` },
      { label: "Signal-to-noise", value: format(snr, 1) },
    ],
    summary: snr >= 5 ? verdict : "The gravity signal is buried in tracking noise.",
    hint:
      snr < 20
        ? band === "x"
          ? "Track more orbits, or switch to Ka band for a quieter Doppler signal."
          : "Track more orbits to average the noise down."
        : null,
  };
};

// The experiments, in display order. `defaults` are the starting settings; `params` lists
// each setting: a "range" ({ min, max, unit }) or a "select" ({ options: { key: { label } } }).
export const EXPERIMENTS = [
  {
    id: "camera",
    title: "Surface imaging",
    instrument: "High-resolution camera",
    description: `Photograph the surface in detail. You can shoot anywhere from ${km(ORBIT_PERIAPSIS_KM)} to ${km(ORBIT_APOAPSIS_KM)} up; low means more detail, but the ground also races past faster.`,
    params: [
      ALTITUDE_PARAM,
      { key: "exposure", label: "Exposure", type: "range", unit: "ms", min: 1, max: 50 },
      { key: "filter", label: "Filter", type: "select", options: FILTERS },
    ],
    defaults: { altitude: 8000, exposure: 20, filter: "blue" },
    run: runCamera,
  },
  {
    id: "spectrometer",
    title: "Atmospheric gases",
    instrument: "Infrared spectrometer",
    description: "Measure a gas in the thin Martian air by the sunlight it absorbs. Trace gases need long looks; methane would hint at geology or even life.",
    params: [
      { key: "gas", label: "Target gas", type: "select", options: GASES },
      { key: "integration", label: "Integration time", type: "range", unit: "s", min: 1, max: 600 },
      { key: "geometry", label: "Viewing geometry", type: "select", options: GEOMETRIES },
    ],
    defaults: { gas: "h2o", integration: 10, geometry: "nadir" },
    run: runSpectrometer,
  },
  {
    id: "magnetometer",
    title: "Crustal magnetism",
    instrument: "Fluxgate magnetometer",
    description: "Mars has no global magnetic field today, but some rocks remember one. The sensor rides on a boom, away from the spacecraft's own electronics.",
    params: [
      { key: "boom", label: "Boom length", type: "range", unit: "m", min: 0, max: 10 },
      ALTITUDE_PARAM,
      { key: "region", label: "Region", type: "select", options: REGIONS },
    ],
    defaults: { boom: 1, altitude: 5000, region: "lowlands" },
    run: runMagnetometer,
  },
  {
    id: "neutrons",
    title: "Buried water ice",
    instrument: "Neutron spectrometer",
    description: "Cosmic rays knock neutrons out of the soil; hydrogen in buried ice slows them down. Counting them maps water up to a metre underground.",
    params: [
      { key: "latitude", label: "Latitude band", type: "select", options: LATITUDES },
      { key: "orbits", label: "Orbits counted", type: "range", unit: "orbits", min: 1, max: 100 },
    ],
    defaults: { latitude: "equator", orbits: 1 },
    run: runNeutrons,
  },
  {
    id: "radar",
    title: "Polar ice cap structure",
    instrument: "Sounding radar",
    description: "Radio pulses pass through ice and echo off buried layers. Low frequencies reach deeper; high ones see finer detail. The sunlit ionosphere blocks low frequencies.",
    params: [
      { key: "frequency", label: "Frequency", type: "range", unit: "MHz", min: 1, max: 25 },
      { key: "side", label: "Sounding on the", type: "select", options: SIDES },
      { key: "target", label: "Target", type: "select", options: RADAR_TARGETS },
    ],
    defaults: { frequency: 3, side: "day", target: "base" },
    run: runRadar,
  },
  {
    id: "thermal",
    title: "Surface materials",
    instrument: "Thermal infrared camera",
    description: "Rock holds the day's heat through the night; loose dust loses it fast. Comparing their temperatures tells bedrock from sand.",
    params: [
      { key: "hour", label: "Local solar time", type: "range", unit: "h", min: 0, max: 23 },
      { key: "band", label: "Wavelength band", type: "select", options: BANDS },
    ],
    defaults: { hour: 10, band: "b7" },
    run: runThermal,
  },
  {
    id: "occultation",
    title: "Atmospheric profile",
    instrument: "Radio occultation",
    description: "As the spacecraft slips behind Mars, its radio signal to Earth bends through the atmosphere. The bending gives temperature and pressure by height.",
    params: [
      { key: "band", label: "Radio band", type: "select", options: RADIO_BANDS },
      { key: "rate", label: "Sample rate", type: "range", unit: "Hz", min: 1, max: 50 },
    ],
    defaults: { band: "s", rate: 1 },
    run: runOccultation,
  },
  {
    id: "moons",
    title: "Phobos and Deimos",
    instrument: "High-resolution camera",
    description: `Photograph a moon as your orbit crosses its path. Phobos orbits ${km(MOONS.phobos.altitude)} up; Deimos ${km(MOONS.deimos.altitude)}, beyond your highest point.`,
    params: [
      { key: "moon", label: "Moon", type: "select", options: MOONS },
      ALTITUDE_PARAM,
      { key: "exposure", label: "Exposure", type: "range", unit: "ms", min: 1, max: 50 },
    ],
    defaults: { moon: "phobos", altitude: 1000, exposure: 5 },
    run: runMoons,
  },
  {
    id: "gravity",
    title: "Gravity field",
    instrument: "Radio Doppler tracking",
    description: "Mass under the surface tugs the spacecraft, shifting its radio signal by fractions of a millimetre per second. Many orbits build a gravity map.",
    params: [
      { key: "target", label: "Target", type: "select", options: GRAVITY_TARGETS },
      { key: "band", label: "Radio band", type: "select", options: DOPPLER_BANDS },
      { key: "orbits", label: "Orbits tracked", type: "range", unit: "orbits", min: 1, max: 200 },
    ],
    defaults: { target: "olympus", band: "x", orbits: 1 },
    run: runGravity,
  },
];
