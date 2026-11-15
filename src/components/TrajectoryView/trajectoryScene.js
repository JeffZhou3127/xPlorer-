import { EARTH_RADIUS, ORBIT_ALTITUDE_KM } from "../../utils/rocketPhysics.js";

// Geometry and markup for the 3D trajectory scene (no React).
// Scene units are 1,000 km. The flight plane is the scene's x–y plane, which is Earth's
// equator: the pad is at (0, R, 0), +x is downrange and +z is north.
const UNIT = 1e6; // metres per scene unit
export const R = EARTH_RADIUS / UNIT;
const KARMAN = (EARTH_RADIUS + 100e3) / UNIT; // edge of space, 100 km up
const TARGET_ORBIT = (EARTH_RADIUS + ORBIT_ALTITUDE_KM * 1e3) / UNIT; // the mission's circular orbit

// Flight-plane position in metres → scene point.
export const toScene = ({ x, y }) => [x / UNIT, y / UNIT, 0];

const fmt = (n) => n.toFixed(4);
export const pointString = (point) => point.map(fmt).join(" ");

// Several polylines as one IndexedLineSet: { point, coordIndex } attribute strings.
export const lineSet = (polylines) => {
  const points = [];
  const index = [];
  for (const line of polylines) {
    if (line.length < 2) continue;
    for (const point of line) {
      index.push(points.length);
      points.push(pointString(point));
    }
    index.push(-1);
  }
  return { point: points.join(", "), coordIndex: index.join(" ") };
};

const circle = (radius, at, segments = 180) =>
  Array.from({ length: segments + 1 }, (_, i) => at((i / segments) * 2 * Math.PI, radius));

// Latitude and longitude lines every 15°, just above the surface.
const graticule = () => {
  const r = R * 1.001;
  const lines = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const phi = (lat * Math.PI) / 180;
    lines.push(
      circle(r * Math.cos(phi), (a, rr) => [rr * Math.cos(a), rr * Math.sin(a), r * Math.sin(phi)]),
    );
  }
  for (let lon = 0; lon < 180; lon += 15) {
    const lambda = (lon * Math.PI) / 180;
    lines.push(
      circle(r, (a, rr) => [
        rr * Math.cos(a) * Math.cos(lambda),
        rr * Math.cos(a) * Math.sin(lambda),
        rr * Math.sin(a),
      ]),
    );
  }
  return lineSet(lines);
};

const karmanLine = () =>
  lineSet([circle(KARMAN, (a, r) => [r * Math.cos(a), r * Math.sin(a), 0], 360)]);

// The target orbit as a dashed "ghost" circle in the flight plane: 120 dashes, each
// covering half of its 3° slot.
const ghostOrbit = (dashes = 120) => {
  const slot = (2 * Math.PI) / dashes;
  const at = (a) => [TARGET_ORBIT * Math.cos(a), TARGET_ORBIT * Math.sin(a), 0];
  return lineSet(
    Array.from({ length: dashes }, (_, i) => [at(i * slot), at(i * slot + slot / 4), at(i * slot + slot / 2)]),
  );
};

// Camera orientation (X3D axis–angle) for an eye looking at `target` with `up` roughly up.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => {
  const n = Math.hypot(...a);
  return [a[0] / n, a[1] / n, a[2] / n];
};

const lookAtOrientation = (eye, target, up) => {
  // Rotation taking the default camera (looking down −z, +y up) onto the wanted view:
  // its columns are the camera's right, up and back directions.
  const f = normalize(sub(target, eye));
  const r = normalize(cross(f, up));
  const u = cross(r, f);
  const [m00, m01, m02] = [r[0], u[0], -f[0]];
  const [m10, m11, m12] = [r[1], u[1], -f[1]];
  const [m20, m21, m22] = [r[2], u[2], -f[2]];

  let w, x, y, z;
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    [w, x, y, z] = [0.25 / s, (m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    [w, x, y, z] = [(m21 - m12) / s, 0.25 * s, (m01 + m10) / s, (m02 + m20) / s];
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    [w, x, y, z] = [(m02 - m20) / s, (m01 + m10) / s, 0.25 * s, (m12 + m21) / s];
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    [w, x, y, z] = [(m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, 0.25 * s];
  }
  const angle = 2 * Math.acos(Math.min(1, Math.max(-1, w)));
  const sin = Math.sqrt(Math.max(0, 1 - w * w));
  const axis = sin < 1e-6 ? [0, 1, 0] : [x / sin, y / sin, z / sin];
  return `${axis.map(fmt).join(" ")} ${fmt(angle)}`;
};

// Viewpoint attributes: position, orientation and the point Examine mode orbits around.
export const cameraAt = (eye, target, up = [0, 1, 0]) => ({
  position: pointString(eye),
  orientation: lookAtOrientation(eye, target, up),
  centerOfRotation: pointString(target),
});

export const PAD = [0, R, 0];

// Close to the pad, looking along the first part of the climb.
export const LAUNCH_CAMERA = cameraAt([-0.15, R + 0.2, 0.75], [0.15, R + 0.08, 0]);

// The whole planet, tilted so the flight plane reads as 3D.
export const EARTH_CAMERA = cameraAt([7, 9, 19], [0, 1.5, 0]);

// Beside the rocket, a little above and off the flight plane, with local up kept up.
export const rocketCamera = (position) => {
  const up = normalize(position);
  const eye = [position[0] + up[0] * 0.35, position[1] + up[1] * 0.35, 1.1];
  return cameraAt(eye, position, up);
};

const attrs = (values) =>
  Object.entries(values)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");

// Marker radius as a share of its distance from the camera, so markers keep the same
// size on screen whether the view is at the pad or showing the whole planet.
export const MARKER_SIZES = { rocket: 0.012, apogee: 0.009, pad: 0.007 };

// A unit sphere; TrajectoryView scales it every frame using MARKER_SIZES.
const marker = (part, color, translation = "0 0 0") => `
  <transform data-part="${part}" translation="${translation}" scale="0.01 0.01 0.01">
    <shape>
      <appearance><material diffuseColor="0 0 0" emissiveColor="${color}"></material></appearance>
      <sphere radius="1"></sphere>
    </shape>
  </transform>`;

const line = (part, color, { point = "", coordIndex = "" } = {}, transparency = 0) => `
  <shape data-part="${part}">
    <appearance><material emissiveColor="${color}" transparency="${transparency}"></material></appearance>
    <indexedLineSet coordIndex="${coordIndex}"><coordinate point="${point}"></coordinate></indexedLineSet>
  </shape>`;

// Colours (emissive RGB) shared with the legend in TrajectoryView.css.
export const COLORS = {
  flown: "0 0.9 1", // #00e5ff
  predicted: "1 0.72 0.25", // #ffb840
  karman: "0.45 0.5 0.56", // #737f8f
  target: "0.8 0.9 1", // #cce6ff, drawn half transparent
  grid: "0.05 0.35 0.45",
  pad: "1 0.48 0.45", // #ff7b72
};

// The static scene; the flown and predicted lines and the markers are filled in live.
export const sceneMarkup = () => `
<x3d class="trajectory-view__x3d" showStat="false" showLog="false" showProgress="false">
  <scene>
    <background skyColor="0.004 0.012 0.03"></background>
    <navigationInfo type='"EXAMINE" "ANY"' headlight="true"></navigationInfo>
    <viewpoint data-view="launch" description="Launch site" fieldOfView="0.8" ${attrs(LAUNCH_CAMERA)}></viewpoint>
    <viewpoint data-view="rocket" description="Rocket" fieldOfView="0.8" ${attrs(LAUNCH_CAMERA)}></viewpoint>
    <viewpoint data-view="earth" description="Whole Earth" fieldOfView="0.8" ${attrs(EARTH_CAMERA)}></viewpoint>

    <shape>
      <appearance><material diffuseColor="0.01 0.035 0.07" emissiveColor="0.005 0.015 0.03" specularColor="0.03 0.06 0.1"></material></appearance>
      <sphere radius="${R}" subdivision="96,96"></sphere>
    </shape>
    ${line("grid", COLORS.grid, graticule())}
    ${line("karman", COLORS.karman, karmanLine())}
    ${line("target", COLORS.target, ghostOrbit(), 0.45)}
    ${line("flown", COLORS.flown)}
    ${line("predicted", COLORS.predicted)}

    ${marker("pad", COLORS.pad, pointString(PAD))}
    ${marker("apogee", COLORS.predicted)}
    ${marker("rocket", "1 1 1", pointString(PAD))}
  </scene>
</x3d>`;
