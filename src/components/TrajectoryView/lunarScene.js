import { MOON, PERIAPSIS_ALTITUDE_KM, TARGET_APOGEE_KM } from "../../utils/moonArrival.js";
import { format } from "../../utils/format.js";
import {
  COLORS,
  UNIT,
  attrs,
  cameraAt,
  dashedLoop,
  graticule,
  line,
  lineSet,
  marker,
  pointString,
  rocketCamera,
} from "./trajectoryScene.js";

// The 3D scene around the Moon for the lunar orbit insertion (mission 2, step 5), drawn
// like MARS_SCENE but equatorial: the flight plane is the x–y plane (the Moon's equator)
// and +z its north pole, so seen from above the spacecraft passes clockwise. The flight
// frame's +y (toward the periapsis) stays +y. Scene units are 1,000 km.
const R = MOON.radius / UNIT;
// The point on the equator under the periapsis.
const UNDER_PASS = [0, R, 0];

export const toScene = ({ x, y }) => [x / UNIT, y / UNIT, 0];

// The goal orbit, the middle of the apogee window: perigee at +y, apogee opposite.
const targetOrbit = () => {
  const rp = R + PERIAPSIS_ALTITUDE_KM / 1000;
  const ra = R + (TARGET_APOGEE_KM.min + TARGET_APOGEE_KM.max) / 2000;
  const e = (ra - rp) / (ra + rp);
  const p = rp * (1 + e);
  return dashedLoop((nu) => {
    const r = p / (1 + e * Math.cos(nu));
    return [r * Math.sin(nu), r * Math.cos(nu), 0];
  });
};

const MOON_COLORS = {
  surface: 'diffuseColor="0.2 0.2 0.21" emissiveColor="0.07 0.07 0.075" specularColor="0.05 0.05 0.05"',
  grid: "0.42 0.44 0.47",
  axis: "0.85 0.6 0.45", // #d99973, as around Mars (the legend colour)
};

// The whole Moon from above and a little to the south, north up: the approach comes in
// from the lower left (about 3.9 units out); the goal orbit hugs the surface (0.92 units).
const MOON_CAMERA = cameraAt([0, -6.5, 9.5], [-0.6, 0.2, 0], [0, 0, 1]);
// Straight above the low pass, looking down at the equator.
const PASS_CAMERA = cameraAt([0, R + 0.15, 1.6], [0, R + 0.05, 0], [0, 1, 0]);

const markup = () => `
<x3d class="trajectory-view__x3d" showStat="false" showLog="false" showProgress="false">
  <scene>
    <background skyColor="0.004 0.012 0.03"></background>
    <navigationInfo type='"EXAMINE" "ANY"' headlight="true"></navigationInfo>
    <viewpoint data-view="moon" description="Whole Moon" fieldOfView="0.8" ${attrs(MOON_CAMERA)}></viewpoint>
    <viewpoint data-view="rocket" description="Rocket" fieldOfView="0.8" ${attrs(MOON_CAMERA)}></viewpoint>
    <viewpoint data-view="pass" description="Low pass" fieldOfView="0.8" ${attrs(PASS_CAMERA)}></viewpoint>

    <shape>
      <appearance><material ${MOON_COLORS.surface}></material></appearance>
      <sphere radius="${R}" subdivision="96,96"></sphere>
    </shape>
    ${line("grid", MOON_COLORS.grid, graticule(R))}
    ${line("axis", MOON_COLORS.axis, lineSet([[[0, 0, -R * 1.6], [0, 0, R * 1.6]]]))}
    ${line("target", COLORS.target, targetOrbit(), 0.45)}
    ${line("flown", COLORS.flown)}
    ${line("predicted", COLORS.predicted)}

    ${marker("pad", MOON_COLORS.axis, pointString(UNDER_PASS))}
    ${marker("apsis", COLORS.predicted)}
    ${marker("rocket", "1 1 1", pointString(UNDER_PASS))}
  </scene>
</x3d>`;

export const LUNAR_SCENE = {
  toScene,
  markup,
  views: [
    { id: "moon", label: "Whole Moon", camera: () => MOON_CAMERA },
    { id: "rocket", label: "Rocket", camera: (position) => rocketCamera(position, [0, 0, 0.5], 0.15) },
    { id: "pass", label: "Low pass", camera: () => PASS_CAMERA },
  ],
  // The equator under the periapsis (drawn with the launch pad's marker).
  landmarks: { pad: UNDER_PASS },
  apsis: "lowest",
  legend: (showTarget) => [
    { key: "flown", label: "Flown" },
    { key: "predicted", label: "Coast path (engines off)" },
    ...(showTarget
      ? [{ key: "target", label: `Target orbit (${format(PERIAPSIS_ALTITUDE_KM)} × ${format((TARGET_APOGEE_KM.min + TARGET_APOGEE_KM.max) / 2)} km)` }]
      : []),
    { key: "axis", label: "Polar axis (north up)" },
  ],
};
