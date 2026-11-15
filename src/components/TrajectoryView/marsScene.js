import { MARS_RADIUS } from "../../utils/marsTransfer.js";
import { PERIAPSIS_ALTITUDE_KM, TARGET_APOGEE_KM } from "../../utils/marsArrival.js";
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

// The 3D scene around Mars for the orbit insertion (mission 1, step 9), drawn like the
// launch's trajectory view (see EARTH_SCENE in trajectoryScene.js). Scene units are
// 1,000 km; +z is Mars's north pole. The flight plane is the polar x–z plane: the flight
// frame's +y (toward the arrival periapsis) maps to +z, so the closest pass is straight
// over the north pole.
const R = MARS_RADIUS / UNIT;
const POLE = [0, 0, R];

export const toScene = ({ x, y }) => [x / UNIT, 0, y / UNIT];

// The goal orbit, the middle of both windows: perigee over the north pole, apogee over the south.
const targetOrbit = () => {
  const rp = R + PERIAPSIS_ALTITUDE_KM / 1000;
  const ra = R + (TARGET_APOGEE_KM.min + TARGET_APOGEE_KM.max) / 2000;
  const e = (ra - rp) / (ra + rp);
  const p = rp * (1 + e);
  return dashedLoop((nu) => {
    const r = p / (1 + e * Math.cos(nu));
    return [r * Math.sin(nu), 0, r * Math.cos(nu)];
  });
};

const MARS_COLORS = {
  surface: 'diffuseColor="0.16 0.06 0.03" emissiveColor="0.07 0.025 0.012" specularColor="0.08 0.04 0.02"',
  grid: "0.5 0.22 0.1",
  axis: "0.85 0.6 0.45", // #d99973
};

// Whole planet with the approach and the goal orbit, north up.
// (The goal orbit reaches about 20 units below the planet, the approach 13 units above.)
const MARS_CAMERA = cameraAt([22, -66, 0], [0, 0, -4], [0, 0, 1]);
// Looking down at the north pole, where the periapsis is.
const POLE_CAMERA = cameraAt([3, -9, 9.5], [0, 0, R + 1], [0, 0, 1]);

const markup = () => `
<x3d class="trajectory-view__x3d" showStat="false" showLog="false" showProgress="false">
  <scene>
    <background skyColor="0.004 0.012 0.03"></background>
    <navigationInfo type='"EXAMINE" "ANY"' headlight="true"></navigationInfo>
    <viewpoint data-view="mars" description="Whole Mars" fieldOfView="0.8" ${attrs(MARS_CAMERA)}></viewpoint>
    <viewpoint data-view="rocket" description="Rocket" fieldOfView="0.8" ${attrs(MARS_CAMERA)}></viewpoint>
    <viewpoint data-view="pole" description="North pole" fieldOfView="0.8" ${attrs(POLE_CAMERA)}></viewpoint>

    <shape>
      <appearance><material ${MARS_COLORS.surface}></material></appearance>
      <sphere radius="${R}" subdivision="96,96"></sphere>
    </shape>
    ${line("grid", MARS_COLORS.grid, graticule(R))}
    ${line("axis", MARS_COLORS.axis, lineSet([[[0, 0, -R * 1.6], [0, 0, R * 1.6]]]))}
    ${line("target", COLORS.target, targetOrbit(), 0.45)}
    ${line("flown", COLORS.flown)}
    ${line("predicted", COLORS.predicted)}

    ${marker("pad", MARS_COLORS.axis, pointString(POLE))}
    ${marker("apsis", COLORS.predicted)}
    ${marker("rocket", "1 1 1", pointString(POLE))}
  </scene>
</x3d>`;

const km = (value) => format(value);

export const MARS_SCENE = {
  toScene,
  markup,
  views: [
    { id: "mars", label: "Whole Mars", camera: () => MARS_CAMERA },
    { id: "rocket", label: "Rocket", camera: (position) => rocketCamera(position, [0, -2.5, 0], 0.6) },
    { id: "pole", label: "North pole", camera: () => POLE_CAMERA },
  ],
  // The north pole, under the periapsis (drawn with the launch pad's marker).
  landmarks: { pad: POLE },
  apsis: "lowest",
  legend: (showTarget) => [
    { key: "flown", label: "Flown" },
    { key: "predicted", label: "Coast path (engines off)" },
    ...(showTarget
      ? [{ key: "target", label: `Target orbit (${km(PERIAPSIS_ALTITUDE_KM)} × ${km((TARGET_APOGEE_KM.min + TARGET_APOGEE_KM.max) / 2)} km)` }]
      : []),
    { key: "axis", label: "Polar axis (north up)" },
  ],
};
