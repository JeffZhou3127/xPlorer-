import RocketBody from "../RocketDiagram/RocketBody.jsx";
import { CENTER_X, FLAME_ROOM, GROUND_Y, rocketTop } from "../RocketDiagram/rocketLayout.js";
import "../RocketDiagram/RocketDiagram.css";
import "./FlightView.css";

// The rocket from the designer, turned to its current pitch, inside an attitude ring
// marked in degrees from vertical (positive = right, clockwise). The grid and ring stay
// fixed, so the turning is easy to see.
const HALF_WIDTH = 120; // widest the rocket gets either side of its centerline (with SRBs)
const RING_GAP = 14; // space between the rocket's sweep and the ring
const LABEL_SPACE = 0.13; // room outside the ring for the degree labels, as a share of its radius

// Staging animation, in flight seconds (so it speeds up with time warp).
const STAGING_DURATION = 3;
const RECENTER_SHARE = 0.6; // share of the animation spent re-centring the view

// Rotation centre and ring radius that fit a rocket (and its longest plume) at any angle.
const viewFor = (stages, srbs) => {
  const top = rocketTop(stages, srbs);
  const bottom = GROUND_Y + FLAME_ROOM;
  return {
    top,
    pivotY: (top + bottom) / 2,
    ring: Math.hypot((bottom - top) / 2, HALF_WIDTH) + RING_GAP,
  };
};

const smoothstep = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// Spent hardware falling away, drawn where it was on the rocket before separation:
// a stage drops back along the rocket's axis and tumbles; SRBs peel off outward.
const Debris = ({ separation }) => {
  const { fromStages, fromSrbs, kind, elapsed: t } = separation;
  const opacity = 1 - smoothstep((t / STAGING_DURATION - 0.45) / 0.55);

  if (kind === "srbs") {
    return (
      <g opacity={opacity}>
        <RocketBody
          stages={fromStages}
          srbs={fromSrbs}
          parts="srbs"
          srbDrift={{ dx: 10 * t + 12 * t * t, dy: 20 * t + 30 * t * t, angle: 10 * t }}
        />
      </g>
    );
  }

  const fall = 25 * t + 35 * t * t;
  return (
    <g
      opacity={opacity}
      transform={`translate(0 ${fall}) rotate(${6 * t} ${CENTER_X} ${GROUND_Y})`}
    >
      <RocketBody stages={fromStages} srbs={fromSrbs} parts="bottom" />
    </g>
  );
};

// `throttle` (0–1) and `srbsFiring` show the exhaust plumes. `aside` (e.g. fuel gauges)
// sits to the right of the drawing. `paused` freezes the plumes' flicker.
// `separation` ({ fromStages, fromSrbs, kind: "stage" | "srbs", elapsed }) describes the
// latest staging: for STAGING_DURATION seconds after it, the spent part falls away while
// the rest of the rocket stays put, and the view eases over to fit the smaller rocket.
const FlightView = ({ stages, srbs, pitch, throttle = 0, srbsFiring = false, separation, paused = false, aside }) => {
  const now = viewFor(stages, srbs);
  const staging = separation && separation.elapsed < STAGING_DURATION ? separation : null;

  let pivotY = now.pivotY;
  let ring = now.ring;
  let shift = 0; // moves the new rocket so its nose stays where it was
  if (staging) {
    const before = viewFor(staging.fromStages, staging.fromSrbs);
    const ease = smoothstep(staging.elapsed / (STAGING_DURATION * RECENTER_SHARE));
    shift = before.top - now.top;
    pivotY = lerp(before.pivotY, now.pivotY + shift, ease);
    ring = lerp(before.ring, now.ring, ease);
  }

  const pivot = { x: CENTER_X, y: pivotY };
  // Tight margin: the ring nearly fills the drawing, so the rocket is as big as it can be.
  const half = ring * (1 + LABEL_SPACE) + 2;
  const fontSize = ring * 0.06;
  const tick = ring * 0.04;

  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  // 0…180 to the right, −15…−165 to the left (with a real minus sign).
  const label = (deg) => (deg <= 180 ? `${deg}` : `−${360 - deg}`);

  return (
    <div className={`flight-view ${paused ? "flight-view--paused" : ""}`}>
      <svg
        className="flight-view__svg"
        viewBox={`${pivot.x - half} ${pivot.y - half} ${half * 2} ${half * 2}`}
        role="img"
        aria-label={`Rocket pitched ${Math.abs(Math.round(pitch))} degrees ${pitch < 0 ? "left" : "right"} of vertical`}
      >
        <defs>
          <pattern id="fv-grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" className="rd-grid-minor" />
          </pattern>
          <pattern id="fv-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#fv-grid-minor)" />
            <path d="M 50 0 L 0 0 0 50" className="rd-grid-major" />
          </pattern>
        </defs>

        <rect x={pivot.x - half} y={pivot.y - half} width={half * 2} height={half * 2} fill="url(#fv-grid)" />

        {/* Fixed vertical reference */}
        <line className="rd-center" x1={pivot.x} x2={pivot.x} y1={pivot.y - ring} y2={pivot.y + ring} />

        {/* Attitude ring: a labelled tick every 15°, with a minor tick between each (7.5°).
            Labels stay upright (only the tick is rotated) and sit just outside the ring. */}
        <circle className="fv-ring" cx={pivot.x} cy={pivot.y} r={ring} />
        {ticks.map((deg) => {
          const major = deg % 45 === 0;
          const rad = (deg * Math.PI) / 180;
          const labelRadius = ring + fontSize * 1.05;
          return (
            <g key={deg}>
              <g transform={`rotate(${deg} ${pivot.x} ${pivot.y})`}>
                <line
                  className={major ? "fv-tick fv-tick--major" : "fv-tick"}
                  x1={pivot.x}
                  x2={pivot.x}
                  y1={pivot.y - ring}
                  y2={pivot.y - ring + (major ? tick * 2 : tick * 1.4)}
                />
                <line
                  className="fv-tick fv-tick--minor"
                  x1={pivot.x}
                  x2={pivot.x}
                  y1={pivot.y - ring}
                  y2={pivot.y - ring + tick * 0.7}
                  transform={`rotate(7.5 ${pivot.x} ${pivot.y})`}
                />
              </g>
              <text
                className={major ? "fv-label fv-label--major" : "fv-label"}
                x={pivot.x + labelRadius * Math.sin(rad)}
                y={pivot.y - labelRadius * Math.cos(rad)}
                fontSize={major ? fontSize : fontSize * 0.82}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {label(deg)}°
              </text>
            </g>
          );
        })}

        {/* The rocket, any falling debris and the nose marker on the ring turn together. */}
        <g transform={`rotate(${pitch} ${pivot.x} ${pivot.y})`}>
          {staging && <Debris separation={staging} />}
          <g transform={shift ? `translate(0 ${shift})` : undefined}>
            <line className="rd-center" x1={CENTER_X} x2={CENTER_X} y1={now.top - 14} y2={GROUND_Y + 14} />
            <RocketBody stages={stages} srbs={srbs} throttle={throttle} srbsFiring={srbsFiring} />
          </g>
          <path
            className="fv-marker"
            d={`M ${pivot.x} ${pivot.y - ring + tick * 2.5}
                l ${-tick} ${tick * 1.8} l ${tick * 2} 0 Z`}
          />
        </g>
      </svg>
      {aside}
    </div>
  );
};

export default FlightView;
