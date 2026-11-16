import RocketBody from "../RocketDiagram/RocketBody.jsx";
import { CENTER_X, NARROW_HALF, layoutStages } from "../RocketDiagram/rocketLayout.js";
import SpacecraftBody from "../SpacecraftDiagram/SpacecraftBody.jsx";
import { CX, SM, TUNNEL, landingStageLayout } from "../SpacecraftDiagram/spacecraftLayout.js";
import { RELEASE_AT } from "../../utils/lunarLanding.js";
import "../RocketDiagram/RocketDiagram.css";
import "./LandingView.css";

// The lander (SpacecraftBody) over the Moon, for mission 2's separation and landing (M2S6)
// and its liftoff (M2S8). The lander stays put with its footpads at the origin; the surface
// rises to meet it as it comes down (or falls away as it climbs) (on a log scale, so the last few hundred metres still show), flattening out
// from the curved limb seen from orbit, and its craters slide past as fast as the ground seems to
// move seen from the lander (`sweep`), slowing to a stop by touchdown.
const VIEW = { left: -420, top: -560, width: 840, height: 920 };
const ORBIT_ALTITUDE = 50000;
const GROUND_AT_ORBIT = 330; // how far below the footpads the surface sits from orbit
const LIMB_RADIUS = 1100; // drawn radius of the Moon from orbit
const SWEEP_SCALE = 20; // drawn units the craters slide per radian of ground swept past

const smoothstep = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

// How far below the footpads the surface is drawn at `altitude` (m), and its drawn radius.
// Higher orbits (the liftoff's 100 km) are drawn as the 50 km one, so the limb stays in view.
const groundDrop = (altitude) =>
  (GROUND_AT_ORBIT * Math.log10(1 + Math.min(altitude, ORBIT_ALTITUDE) / 20)) / Math.log10(1 + ORBIT_ALTITUDE / 20);
const groundRadius = (altitude) => LIMB_RADIUS * (ORBIT_ALTITUDE / Math.min(ORBIT_ALTITUDE, Math.max(altitude, 50))) ** 0.9;

// Fixed scenery: stars, and craters repeating every CRATER_PERIOD units downrange
// (x, radius, depth below the horizon line).
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: VIEW.left + ((i * 397) % VIEW.width),
  y: VIEW.top + ((i * 211 + (i % 7) * 53) % VIEW.height),
  r: i % 9 === 0 ? 1.6 : 0.9,
}));
const CRATER_PERIOD = 1300;
const CRATERS = [
  { x: 0, r: 60, depth: 40 },
  { x: 170, r: 26, depth: 110 },
  { x: 330, r: 90, depth: 70 },
  { x: 520, r: 34, depth: 22 },
  { x: 640, r: 48, depth: 150 },
  { x: 820, r: 110, depth: 120 },
  { x: 1000, r: 22, depth: 60 },
  { x: 1120, r: 70, depth: 20 },
];

// The spent stage(s) under the lander, scaled so the top stage is as wide as the lander's
// legs reach; after RELEASE_AT seconds they drop away, tumbling, and fade out.
const SpentStages = ({ stages, elapsed }) => {
  const { stackTop } = layoutStages(stages);
  const scale = SM.half / NARROW_HALF;
  const t = Math.max(0, elapsed - RELEASE_AT);
  const fall = 14 * t + 9 * t * t;
  const opacity = 1 - smoothstep((t - 2) / 2.5);
  if (opacity <= 0) return null;

  return (
    <g opacity={opacity}>
      {t > 0 && t < 0.5 && (
        <circle className="lv-flash" cx={0} cy={4} r={20 + 80 * t} opacity={1 - t / 0.5} />
      )}
      <g transform={`translate(0 ${6 + fall}) rotate(${5 * t}) scale(${scale}) translate(${-CENTER_X} ${-stackTop})`}>
        <rect className="rd-outline" x={CENTER_X - NARROW_HALF} y={stackTop - 5} width={NARROW_HALF * 2} height={5} />
        <RocketBody stages={stages} parts="stages" />
      </g>
    </g>
  );
};

// Dust blown off the surface by the engine near touchdown, settling afterwards.
const Dust = ({ y, strength }) =>
  strength > 0.01 && (
    <g className="lv-dust">
      {[-1, 1].map((side) =>
        Array.from({ length: 6 }, (_, i) => (
          <ellipse
            key={`${side}${i}`}
            cx={side * (50 + i * (30 + 40 * strength))}
            cy={y - 4 - i * 2 * strength}
            rx={26 + i * 12}
            ry={6 + i * 2}
            opacity={strength * (1 - i / 6) * 0.55}
          />
        )),
      )}
    </g>
  );

// `design`: the lander design. `stages`: the spent stack to drop (null once gone).
// `state`: from `landingPlan(...).stateAt` or `liftoffPlan(...).stateAt` (phase, elapsed, altitude, sweep, pitch,
// throttle).
const LandingView = ({ design, stages, state, aside }) => {
  const { phase, elapsed, altitude, sweep, pitch, throttle } = state;
  const { foot } = landingStageLayout(design.landerFuel);
  const centre = -(foot - TUNNEL.top) / 2; // the lander turns about its middle

  const drop = groundDrop(altitude);
  const radius = groundRadius(altitude);
  const surfaceAt = (x) => drop + radius - Math.sqrt(Math.max(0, radius * radius - x * x));

  // Craters show once the surface flattens out, sliding past with the distance downrange.
  const craterOpacity = 1 - smoothstep((altitude - 8000) / 12000);
  const closeness = 1 / (1 + altitude / 150);
  const scroll = sweep * SWEEP_SCALE;
  const wrap = (x) => ((((x - scroll) % CRATER_PERIOD) + CRATER_PERIOD) % CRATER_PERIOD) - CRATER_PERIOD / 2;

  const crashed = phase === "crashed";
  const settled = phase === "landed" || crashed;
  let dust = altitude < 60 ? (1 - altitude / 60) * throttle * 2 : 0;
  if (settled) dust = (crashed ? 1 : 0.8) * (1 - smoothstep(elapsed / 2));

  // A crashed lander ends up on its side.
  const tilt = crashed ? pitch + 35 * smoothstep(elapsed / 0.4) : pitch;

  return (
    <div className="landing-view">
      <svg
        className="landing-view__svg"
        viewBox={`${VIEW.left} ${VIEW.top} ${VIEW.width} ${VIEW.height}`}
        role="img"
        aria-label={`Lander ${Math.round(altitude)} metres above the Moon`}
      >
        <rect className="lv-sky" x={VIEW.left} y={VIEW.top} width={VIEW.width} height={VIEW.height} />
        {STARS.map(({ x, y, r }, i) => (
          <circle key={i} className="lv-star" cx={x} cy={y} r={r} />
        ))}

        <circle className="lv-ground" cx={0} cy={drop + radius} r={radius} />
        {craterOpacity > 0 && (
          <g opacity={craterOpacity}>
            {CRATERS.map(({ x, r, depth }, i) => {
              const cx = wrap(x);
              const rx = r * (0.35 + 0.65 * closeness);
              return (
                <ellipse key={i} className="lv-crater" cx={cx} cy={surfaceAt(cx) + depth} rx={rx} ry={rx * 0.22} />
              );
            })}
          </g>
        )}
        <Dust y={drop} strength={dust} />

        {phase === "separation" && stages && <SpentStages stages={stages} elapsed={elapsed} />}

        <g transform={`rotate(${tilt} 0 ${crashed ? 0 : centre})`} className={crashed ? "lv-wreck" : undefined}>
          <g transform={`translate(${-CX} ${-foot})`}>
            <SpacecraftBody design={design} throttle={throttle} />
          </g>
        </g>

        {crashed && elapsed < 1.2 && (
          <circle className="lv-flash lv-flash--impact" cx={0} cy={-30} r={40 + 220 * elapsed} opacity={1 - elapsed / 1.2} />
        )}
      </svg>
      {aside}
    </div>
  );
};

export default LandingView;
