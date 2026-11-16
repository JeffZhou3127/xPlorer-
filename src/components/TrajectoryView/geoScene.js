import { GEO_ALTITUDE_KM } from "../../utils/cubesatFlight.js";
import { format } from "../../utils/format.js";
import {
  COLORS,
  EARTH_CAMERA,
  R,
  attrs,
  cameraAt,
  dashedLoop,
  graticule,
  line,
  marker,
  rocketCamera,
  toScene,
} from "./trajectoryScene.js";

// The 3D scene for the CubeSat mission (mission 3): Earth as in EARTH_SCENE, with the
// geostationary orbit as the dashed target ring in the flight plane (Earth's equator,
// the scene's x–y plane). Scene units are 1,000 km.
const GEO = R + GEO_ALTITUDE_KM / 1000;

const geoRing = () => dashedLoop((a) => [GEO * Math.cos(a), GEO * Math.sin(a), 0], 180);

// Far enough out to see the whole geostationary ring, tilted like EARTH_CAMERA.
const GEO_CAMERA = cameraAt([22, 30, 112], [0, 0, 0]);

const markup = () => `
<x3d class="trajectory-view__x3d" showStat="false" showLog="false" showProgress="false">
  <scene>
    <background skyColor="0.004 0.012 0.03"></background>
    <navigationInfo type='"EXAMINE" "ANY"' headlight="true"></navigationInfo>
    <viewpoint data-view="earth" description="Whole Earth" fieldOfView="0.8" ${attrs(EARTH_CAMERA)}></viewpoint>
    <viewpoint data-view="rocket" description="CubeSat" fieldOfView="0.8" ${attrs(EARTH_CAMERA)}></viewpoint>
    <viewpoint data-view="geo" description="Geostationary" fieldOfView="0.8" ${attrs(GEO_CAMERA)}></viewpoint>

    <shape>
      <appearance><material diffuseColor="0.01 0.035 0.07" emissiveColor="0.005 0.015 0.03" specularColor="0.03 0.06 0.1"></material></appearance>
      <sphere radius="${R}" subdivision="96,96"></sphere>
    </shape>
    ${line("grid", COLORS.grid, graticule())}
    ${line("target", COLORS.target, geoRing(), 0.45)}
    ${line("flown", COLORS.flown)}
    ${line("predicted", COLORS.predicted)}

    ${marker("apsis", COLORS.predicted)}
    ${marker("rocket", "1 1 1")}
  </scene>
</x3d>`;

export const GEO_SCENE = {
  toScene,
  markup,
  views: [
    { id: "earth", label: "Whole Earth", camera: () => EARTH_CAMERA },
    { id: "rocket", label: "CubeSat", camera: (position) => rocketCamera(position) },
    { id: "geo", label: "Geostationary", camera: () => GEO_CAMERA },
  ],
  landmarks: {},
  apsis: "highest",
  legend: () => [
    { key: "flown", label: "Flown" },
    { key: "predicted", label: "Coast path (engine off)" },
    { key: "target", label: `Geostationary orbit (${format(GEO_ALTITUDE_KM)} km)` },
  ],
};
