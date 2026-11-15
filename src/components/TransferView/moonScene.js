import { cameraAt, lineSet } from "../TrajectoryView/trajectoryScene.js";
import { MOON_ORBIT, PARKING_RADIUS } from "../../utils/moonTransfer.js";
import { COLORS, attrs, circle, line, marker } from "./transferScene.js";

// The TransferView scene for the trans-lunar injection (mission 2, step 4): Earth at the
// centre, the spacecraft's parking orbit and the Moon's orbit. Scene units are 1,000 km;
// the orbits lie in the scene's x–y plane.
const UNIT = 1e6;

const toScene = ({ x, y }) => [x / UNIT, y / UNIT, 0];

const MOON_COLORS = {
  moon: "0.79 0.82 0.85", // #c9d1d9
  moonOrbit: "0.35 0.37 0.4",
  parkingOrbit: "0.2 0.33 0.55",
};

// The whole of the Moon's orbit, from above and a little to the south.
const CAMERA = cameraAt([0, -280, 440], [0, -17, 0]);

const MARKER_SIZES = { earth: 0.014, moon: 0.01, craft: 0.007, ghost: 0.01, closest: 0.006 };

export const MOON_SCENE = {
  toScene,
  markerSizes: MARKER_SIZES,
  markup: () => `
<x3d class="transfer-view__x3d" showStat="false" showLog="false" showProgress="false">
  <scene>
    <background skyColor="0.004 0.012 0.03"></background>
    <navigationInfo type='"EXAMINE" "ANY"' headlight="true"></navigationInfo>
    <viewpoint description="Earth and Moon" fieldOfView="0.8" ${attrs(CAMERA)}></viewpoint>

    ${line("parkingOrbit", MOON_COLORS.parkingOrbit, lineSet([circle(PARKING_RADIUS / UNIT, 90)]))}
    ${line("moonOrbit", MOON_COLORS.moonOrbit, lineSet([circle(MOON_ORBIT / UNIT)]))}
    ${line("phase", COLORS.phase, undefined, 0.3)}
    ${line("planned", COLORS.planned)}
    ${line("flown", COLORS.flown)}

    ${marker("earth", COLORS.earth)}
    ${marker("moon", MOON_COLORS.moon)}
    ${marker("ghost", MOON_COLORS.moon, 0.6)}
    ${marker("closest", COLORS.planned)}
    ${marker("craft", "1 1 1")}
  </scene>
</x3d>`,
  legend: (launched) => [
    { key: "earth", label: "Earth" },
    { key: "moon", label: "Moon" },
    { key: "planned", label: "Planned path" },
    ...(launched ? [{ key: "flown", label: "Flown" }] : []),
    { key: "ghost-moon", label: "Moon at closest approach" },
  ],
};
