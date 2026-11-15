import { cameraAt, lineSet } from "../TrajectoryView/trajectoryScene.js";
import { EARTH_ORBIT, MARS_ORBIT, PLANETS, targetName } from "../../utils/marsTransfer.js";

// Geometry and markup for the 3D transfer scene, Earth to Mars or back (no React), in the
// style of the flight panel's trajectory view, plus helpers shared with moonScene.js.
// Scene units are 1 million km (1e9 m); the planets' orbital plane is the scene's x–y
// plane, with the Sun at the origin.
const UNIT = 1e9;

export const toScene = ({ x, y }) => [x / UNIT, y / UNIT, 0];

export const circle = (radius, segments = 240) =>
  Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * 2 * Math.PI;
    return [radius * Math.cos(a), radius * Math.sin(a), 0];
  });

// The phase angle at the burn, as polylines in metres around the central body: a ray out
// to the departing body (`fromRadius`) at `startAngle`, one to the target (`toRadius`)
// `phaseAngle` further on (degrees), and an arc of `arcRadius` between them.
export const phaseLines = (startAngle, phaseAngle, fromRadius, toRadius, arcRadius) => {
  const point = (deg, radius) => ({
    x: radius * Math.cos((deg * Math.PI) / 180),
    y: radius * Math.sin((deg * Math.PI) / 180),
  });
  return [
    [{ x: 0, y: 0 }, point(startAngle, fromRadius)],
    [{ x: 0, y: 0 }, point(startAngle + phaseAngle, toRadius)],
    Array.from({ length: 33 }, (_, i) => point(startAngle + (phaseAngle * i) / 32, arcRadius)),
  ];
};

// The phase marks for an Earth–Mars `leg` (TO_MARS or TO_EARTH).
export const planetPhaseLines = (leg) =>
  phaseLines(
    leg.startAngle,
    leg.phaseAngle,
    PLANETS[leg.from].orbit,
    PLANETS[leg.to].orbit,
    Math.min(EARTH_ORBIT, MARS_ORBIT) * 0.45,
  );

// The whole of Mars's orbit, from above and a little to the south, so the plane reads as 3D.
export const SYSTEM_CAMERA = cameraAt([0, -330, 520], [0, -20, 0]);

// Marker radius as a share of its distance from the camera, so the bodies keep the same
// size on screen however the view is zoomed.
export const MARKER_SIZES = { sun: 0.02, earth: 0.011, mars: 0.011, craft: 0.007, ghost: 0.011, closest: 0.006 };

// Colours (emissive RGB) shared with the legend in TransferView.css.
export const COLORS = {
  sun: "1 0.85 0.4", // #ffd966
  earth: "0.35 0.6 1", // #5999ff
  mars: "1 0.45 0.3", // #ff734d
  earthOrbit: "0.2 0.33 0.55",
  marsOrbit: "0.55 0.26 0.18",
  phase: "0.45 0.5 0.56", // #737f8f
  planned: "1 0.72 0.25", // #ffb840
  flown: "0 0.9 1", // #00e5ff
};

export const marker = (part, color, transparency = 0) => `
  <transform data-part="${part}" scale="1 1 1">
    <shape>
      <appearance><material diffuseColor="0 0 0" emissiveColor="${color}" transparency="${transparency}"></material></appearance>
      <sphere radius="1"></sphere>
    </shape>
  </transform>`;

export const line = (part, color, { point = "", coordIndex = "" } = {}, transparency = 0) => `
  <shape data-part="${part}">
    <appearance><material emissiveColor="${color}" transparency="${transparency}"></material></appearance>
    <indexedLineSet coordIndex="${coordIndex}"><coordinate point="${point}"></coordinate></indexedLineSet>
  </shape>`;

export const attrs = (values) =>
  Object.entries(values)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");

// The TransferView scene for `leg` (TO_MARS or TO_EARTH); the paths, phase marks and the
// bodies' positions are filled in live. The ghost marks the target planet at the closest
// approach.
export const marsTransferScene = (leg) => ({
  toScene,
  markerSizes: MARKER_SIZES,
  markup: () => `
<x3d class="transfer-view__x3d" showStat="false" showLog="false" showProgress="false">
  <scene>
    <background skyColor="0.004 0.012 0.03"></background>
    <navigationInfo type='"EXAMINE" "ANY"' headlight="true"></navigationInfo>
    <viewpoint description="Solar system" fieldOfView="0.8" ${attrs(SYSTEM_CAMERA)}></viewpoint>

    ${line("earthOrbit", COLORS.earthOrbit, lineSet([circle(EARTH_ORBIT / UNIT)]))}
    ${line("marsOrbit", COLORS.marsOrbit, lineSet([circle(MARS_ORBIT / UNIT)]))}
    ${line("phase", COLORS.phase, undefined, 0.3)}
    ${line("planned", COLORS.planned)}
    ${line("flown", COLORS.flown)}

    ${marker("sun", COLORS.sun)}
    ${marker("earth", COLORS.earth)}
    ${marker("mars", COLORS.mars)}
    ${marker("ghost", COLORS[leg.to], 0.6)}
    ${marker("closest", COLORS.planned)}
    ${marker("craft", "1 1 1")}
  </scene>
</x3d>`,
  legend: (launched) => [
    { key: "earth", label: "Earth" },
    { key: "mars", label: "Mars" },
    { key: "planned", label: "Planned path" },
    ...(launched ? [{ key: "flown", label: "Flown" }] : []),
    { key: leg.to === "earth" ? "ghost-earth" : "ghost", label: `${targetName(leg)} at closest approach` },
  ],
});
