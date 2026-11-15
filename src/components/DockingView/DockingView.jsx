import { format } from "../../utils/format.js";
import { DOCKING_TOLERANCE, length, sub, worldToBody } from "../../utils/dockingSim.js";
import "./DockingView.css";

// Camera: 40° field of view across the 1000-unit-wide view box; nothing closer than NEAR m.
const FOCAL = 500 / Math.tan((20 * Math.PI) / 180);
const NEAR = 0.05;

// Depot geometry in the docking frame (see dockingSim.js), metres. The port collar sticks
// out of the front of the depot's main cylinder; the target cross sits at the back of
// the collar, so it lines up with the ring only when the spacecraft is on the port's axis.
const RING_RADIUS = 0.8;
const HATCH_RADIUS = 0.55;
const COLLAR_DEPTH = 0.6;
const CROSS_ARM = 0.3;
const BODY_RADIUS = 2.2;
const BODY_LENGTH = 12;
const PANEL = { inner: 3, outer: 14, half: 1.8, z: -8, cells: 5 };

const circle = (radius, z, cx = 0, cy = 0, n = 64) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), z };
  });

const segment = (x1, y1, z1, x2, y2, z2) => [
  { x: x1, y: y1, z: z1 },
  { x: x2, y: y2, z: z2 },
];

// Long lines are split up so the part in front of the camera still draws when the rest
// is behind it.
const subdivide = (points, n = 12) =>
  points.slice(1).flatMap((b, i) => {
    const a = points[i];
    return Array.from({ length: n + (i === points.length - 2 ? 1 : 0) }, (_, k) => ({
      x: a.x + ((b.x - a.x) * k) / n,
      y: a.y + ((b.y - a.y) * k) / n,
      z: a.z + ((b.z - a.z) * k) / n,
    }));
  });

const panel = (side) => {
  const { inner, outer, half, z, cells } = PANEL;
  const x = (d) => side * d;
  const lines = [
    subdivide([
      { x: x(inner), y: -half, z },
      { x: x(outer), y: -half, z },
      { x: x(outer), y: half, z },
      { x: x(inner), y: half, z },
      { x: x(inner), y: -half, z },
    ]),
    segment(x(inner), 0, z, x(outer), 0, z),
    // Boom from the body to the panel.
    segment(x(BODY_RADIUS), 0, z, x(inner), 0, z),
  ];
  for (let i = 1; i < cells; i++) {
    const d = inner + ((outer - inner) * i) / cells;
    lines.push(segment(x(d), -half, z, x(d), half, z));
  }
  return lines;
};

const DEPOT = {
  body: [
    circle(BODY_RADIUS, -COLLAR_DEPTH),
    circle(BODY_RADIUS, -COLLAR_DEPTH - BODY_LENGTH),
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * 2 * Math.PI;
      const x = BODY_RADIUS * Math.cos(a);
      const y = BODY_RADIUS * Math.sin(a);
      return subdivide(segment(x, y, -COLLAR_DEPTH, x, y, -COLLAR_DEPTH - BODY_LENGTH));
    }),
  ],
  panels: [...panel(1), ...panel(-1)],
  collar: [
    circle(RING_RADIUS, 0),
    circle(RING_RADIUS, -COLLAR_DEPTH),
    ...[0, 1, 2, 3].map((i) => {
      const a = (i / 4) * 2 * Math.PI + Math.PI / 4;
      const x = RING_RADIUS * Math.cos(a);
      const y = RING_RADIUS * Math.sin(a);
      return segment(x, y, 0, x, y, -COLLAR_DEPTH);
    }),
  ],
  hatch: [circle(HATCH_RADIUS, -COLLAR_DEPTH)],
  cross: [
    segment(-CROSS_ARM, 0, -COLLAR_DEPTH, CROSS_ARM, 0, -COLLAR_DEPTH),
    segment(0, -CROSS_ARM, -COLLAR_DEPTH, 0, CROSS_ARM, -COLLAR_DEPTH),
  ],
};

// Background stars, as fixed directions in the docking frame (a seeded scatter, so they
// stay put between renders). Being infinitely far away, they move only as the
// spacecraft turns.
const STARS = (() => {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 140 }, () => {
    const x = (random() - 0.5) * 1.6;
    const y = (random() - 0.5) * 1.6;
    return { dir: { x, y, z: -1 }, r: random() < 0.15 ? 1.6 : 0.9 };
  });
})();

// Screen position of a point (or, with `direction`, of a direction) seen from the camera,
// or null when it is behind the camera.
const project = (point, camera, direction = false) => {
  const r = worldToBody(direction ? point : sub(point, camera.pos), camera.attitude);
  const depth = -r.z;
  if (depth < NEAR) return null;
  return [(FOCAL * r.x) / depth, (-FOCAL * r.y) / depth];
};

// SVG path through `points`, broken wherever a point is behind the camera.
const pathFor = (lines, camera) =>
  lines
    .map((points) => {
      let d = "";
      let pen = false;
      for (const point of points) {
        const p = project(point, camera);
        if (!p) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
        pen = true;
      }
      return d;
    })
    .join("");

// Signed value with a direction word, e.g. "1.25 R"; 0 when it rounds to zero.
const signed = (value, digits, positive, negative) => {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return format(0, digits);
  return `${format(Math.abs(rounded), digits)} ${rounded > 0 ? positive : negative}`;
};

// One HUD readout; green when `ok` (within the docking tolerance).
const Readout = ({ label, value, unit, ok }) => (
  <div className={`docking-view__readout ${ok ? "docking-view__readout--ok" : ""}`}>
    <span className="docking-view__readout-label">{label}</span>
    <span className="docking-view__readout-value">
      {value} <span className="docking-view__readout-unit">{unit}</span>
    </span>
  </div>
);

const ANGLES = [
  { axis: "roll", label: "Roll", positive: "R", negative: "L" },
  { axis: "pitch", label: "Pitch", positive: "U", negative: "D" },
  { axis: "yaw", label: "Yaw", positive: "R", negative: "L" },
];

// The view from the spacecraft's docking camera, approaching the depot: a wireframe of
// the depot, the fixed boresight reticle, and a HUD with the offsets from the port's axis
// (top), attitude errors and turn rates (left) and range and closing rate (bottom).
// `docking` is the dockingSim state. `aside` sits to the right (the RCS gauge).
const DockingView = ({ docking, aside }) => {
  const { pos, vel, attitude, rates, result } = docking;
  const camera = { pos, attitude };
  const offsetOk = (v) => Math.abs(v) <= DOCKING_TOLERANCE.offset;
  const angleOk = (v) => Math.abs(v) <= DOCKING_TOLERANCE.angle;
  const closing = -vel.z;

  return (
    <div className="docking-view">
      <div className="docking-view__screen">
        <svg
          className="docking-view__svg"
          viewBox="-500 -500 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="Docking camera view of the refueling depot"
        >
          <rect x={-5000} y={-5000} width={10000} height={10000} className="dv-bg" />
          {STARS.map(({ dir, r }, i) => {
            const p = project(dir, camera, true);
            return p && <circle key={i} cx={p[0]} cy={p[1]} r={r} className="dv-star" />;
          })}

          <path d={pathFor(DEPOT.panels, camera)} className="dv-line dv-line--panel" />
          <path d={pathFor(DEPOT.body, camera)} className="dv-line" />
          <path d={pathFor(DEPOT.collar, camera)} className="dv-line dv-line--collar" />
          <path d={pathFor(DEPOT.hatch, camera)} className="dv-line dv-line--hatch" />
          <path d={pathFor(DEPOT.cross, camera)} className="dv-line dv-line--target" />

          {/* Boresight: where the spacecraft's docking port points. */}
          <g className="dv-reticle">
            <circle r={40} />
            <path d="M -90 0 H -50 M 50 0 H 90 M 0 -90 V -50 M 0 50 V 90" />
            <path d="M -8 0 H 8 M 0 -8 V 8" />
          </g>
        </svg>

        <div className="docking-view__hud docking-view__hud--top">
          <Readout label="X" value={signed(pos.x, 2, "R", "L")} unit="m" ok={offsetOk(pos.x)} />
          <Readout label="Y" value={signed(pos.y, 2, "U", "D")} unit="m" ok={offsetOk(pos.y)} />
          <Readout label="Z" value={format(pos.z, 2)} unit="m" />
        </div>

        <div className="docking-view__hud docking-view__hud--left">
          {ANGLES.map(({ axis, label, positive, negative }) => (
            <div key={axis} className="docking-view__angle">
              <Readout
                label={label}
                value={signed(attitude[axis], 1, positive, negative)}
                unit="°"
                ok={angleOk(attitude[axis])}
              />
              <span className="docking-view__rate">
                {signed(rates[axis], 2, positive, negative)} °/s
              </span>
            </div>
          ))}
        </div>

        <div className="docking-view__hud docking-view__hud--bottom">
          <Readout label="Range" value={format(length(pos), 2)} unit="m" />
          <Readout
            label="Closing rate"
            value={format(closing, 2)}
            unit="m/s"
            ok={closing > 0 && length(vel) < DOCKING_TOLERANCE.speed}
          />
        </div>

        {result && (
          <p
            className={`docking-view__banner ${result.docked ? "docking-view__banner--docked" : "docking-view__banner--failed"}`}
            role="status"
          >
            {result.docked ? "Docked" : "Docking failed"}
          </p>
        )}
      </div>
      {aside}
    </div>
  );
};

export default DockingView;
