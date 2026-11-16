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

// The TransferView scene for the trans-Earth injection (mission 2, step 9): as MOON_SCENE,
// without the parking orbit around Earth. The lunar orbit is far too small to see at this
// scale, so until the burn the "phase" lines draw it enlarged around the Moon (see
// returnPhaseLines) with the burn point on it (the "burn" marker); "closest" marks the
// perigee.
const RETURN_MARKER_SIZES = { earth: 0.014, moon: 0.01, burn: 0.007, craft: 0.007, closest: 0.006 };

export const MOON_RETURN_SCENE = {
  toScene,
  markerSizes: RETURN_MARKER_SIZES,
  markup: () => `
<x3d class="transfer-view__x3d" showStat="false" showLog="false" showProgress="false">
  <scene>
    <background skyColor="0.004 0.012 0.03"></background>
    <navigationInfo type='"EXAMINE" "ANY"' headlight="true"></navigationInfo>
    <viewpoint description="Earth and Moon" fieldOfView="0.8" ${attrs(CAMERA)}></viewpoint>

    ${line("moonOrbit", MOON_COLORS.moonOrbit, lineSet([circle(MOON_ORBIT / UNIT)]))}
    ${line("phase", COLORS.phase, undefined, 0.3)}
    ${line("planned", COLORS.planned)}
    ${line("flown", COLORS.flown)}

    ${marker("earth", COLORS.earth)}
    ${marker("moon", MOON_COLORS.moon)}
    ${marker("burn", "1 1 1")}
    ${marker("closest", COLORS.planned)}
    ${marker("craft", "1 1 1")}
  </scene>
</x3d>`,
  legend: (launched) => [
    { key: "earth", label: "Earth" },
    { key: "moon", label: "Moon" },
    { key: "planned", label: "Planned path" },
    ...(launched ? [{ key: "flown", label: "Flown" }] : [{ key: "burn", label: "Burn point (lunar orbit enlarged)" }]),
    { key: "perigee", label: "Perigee" },
  ],
};

// How much bigger the lunar orbit is drawn before the burn: a radius of 25,000 km.
export const ENLARGED_ORBIT = 25000e3;

// The burn point, drawn on the enlarged lunar orbit around the Moon (`moon`, m), at
// `direction` (a unit vector from the Moon's centre).
export const enlargedBurnPoint = (moon, direction) => ({
  x: moon.x + direction.x * ENLARGED_ORBIT,
  y: moon.y + direction.y * ENLARGED_ORBIT,
});

// The lander's position in its orbit, as polylines in metres: the enlarged orbit around the
// Moon (at `moon`), a ray along the Moon's direction of travel (`travel`, a unit vector),
// one to the burn point (`direction`) and a clockwise arc between them, `position`° long.
export const returnPhaseLines = (moon, travel, direction, position) => {
  const at = (angle, radius) => ({ x: moon.x + radius * Math.cos(angle), y: moon.y + radius * Math.sin(angle) });
  const start = Math.atan2(travel.y, travel.x);
  const sweep = (position * Math.PI) / 180;
  return [
    Array.from({ length: 97 }, (_, i) => at((i / 96) * 2 * Math.PI, ENLARGED_ORBIT)),
    [moon, at(start, ENLARGED_ORBIT * 1.4)],
    [moon, enlargedBurnPoint(moon, direction)],
    Array.from({ length: 33 }, (_, i) => at(start - (sweep * i) / 32, ENLARGED_ORBIT * 0.55)),
  ];
};
