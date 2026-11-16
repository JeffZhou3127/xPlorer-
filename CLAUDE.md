# CLAUDE.md

Guidance for Claude Code in this repository.

## Overview

xPlorer+ is an early-stage React app: a Mars mission game. Routes, each step's Continue leading to the next:

`/` home → `/scenario1` objective → `/m1-s1` spacecraft designer → `/m1-s2` rocket designer → `/m1-s3` launch confirmation → `/m1-s4` flight panel → `/m1-s5` orbit reached → `/m1-s6` docking → `/m1-s7` refueling → `/m1-s8` Mars ejection burn → `/m1-s9` Mars orbit insertion → `/m1-s10` science → `/m1-s11` Mars depot docking → `/m1-s12` refueling → `/m1-s13` Earth ejection burn → `/m1-s14` reentry (splashdown, link home). `/mission-failure` is reached from M1S4, M1S8/M1S13 (systems failure), M1S9 (and M2S5) and M1S14 (and M2S10).

Scenario 2 (Moon and back, easier: Earth and Moon half size and half as far apart, same surface gravity): `/scenario2` objective → `/m2-s1` lander designer → `/m2-s2` rocket designer → `/m1-s3` launch confirmation (shared: M2S2 passes `{ back, next }` route state) → `/m2-s3` automatic launch (`autoLaunch.js`: spends `M2_ORBIT_DELTA_V` SRBs first, then stage by stage via `spendDeltaV`; mission time at one steady warp (~15 s of burn), each phase burning for its real burn time (`burnTime`, `deltaVAt`), so separations land when tanks run dry; `FlightView` animation; short of orbit → back to the designer) → `/m2-s4` trans-lunar injection → `/m2-s5` lunar orbit insertion (shared `M1S9` view, `arrival="moon"`) → `/m2-s6` lunar landing → `/m2-s7` surface science (shared `M1S10` view, `site="moon"`; Continue reads "Leave Lunar Surface") → `/m2-s8` lunar liftoff → `/m2-s9` trans-Earth injection → `/m2-s10` reentry (shared `M1S14` view, `trip="moon"`; splashdown, link home). Views in `src/views/scenario2/`.

Steps 6–8 and 11–13 share views: `M1S6A11` (docking), `M1S7A12` (refueling), `M1S8A13` (ejection). `App.jsx` passes `leg="outbound"` (6–8) or `"return"` (11–13) plus a matching `key`; each view keeps a `LEGS` table of what differs.

## Commands

`npm run dev` / `build` / `preview`; `npm run lint` (oxlint, `.oxlintrc.json`). No test framework.

## Stack and conventions

- **Vite 8 + React 19**, plain JS/JSX. Arrow-function components, double quotes, semicolons.
- **Lint**: oxlint `react` + `oxc`; `react/rules-of-hooks` error, `react/only-export-components` warning (component files export only components).
- **Routing**: `react-router` v8 (not `react-router-dom`), declarative. `src/App.jsx` holds only `<Routes>`. Views in `src/views/` (scenario views in `src/views/scenario1/`, `M1S2.jsx` → `/m1-s2`). New view: create it, add a `<Route>` in `App.jsx` and a `<Link>` in `Home.jsx`.
- **Layout**: views assemble components; each component has its own PascalCase folder in `src/components/` with its CSS. Non-UI logic (physics, wording) in `src/utils/` (no React); hooks in `src/hooks/`.
- **Entry**: `src/index.jsx` mounts `<App />` in `StrictMode`, Redux `Provider`, `BrowserRouter`. New top-level providers go there.
- **State**: Redux Toolkit for designs only (`spacecraftSlice.js`: `updateDesign(patch)`; `rocketSlice.js`: `{ stages, srbs, nextStageId }` with add/remove/update actions and design rules `FUEL_RANGES`, `ENGINE_RANGES`, `rangesFor`, SRB limits). Lost on reload. Views select/dispatch; components are presentational. Flight/docking/etc. state is local to the view.
- **Route state** carries leftover stages `{ flight: { stageIndex, stageFuel } }` from M1S4 all the way to M1S13, plus cumulative `rcsUsed` (dockings and the M1S8 cruise add to it; depots refuel stages, not RCS) and `arrival: { vInf }` into M1S9/M1S14. Without it, views fall back to "only the top stage left", no RCS used, `DEFAULT_V_INF`.
- **DevJump (temporary)**: dashed amber button on M1S2 that jumps to M1S8 with all stages full. Remove `src/components/DevJump/` and its `DEV ONLY` import/element in `M1S2.jsx`.

## Shared pieces

- `Meter` (red with `alert`), `Stat`, `Info` from `RocketStats.jsx`; `RangeField`/`SelectField` from `StageCard.jsx`.
- `src/utils/format.js`: `format`, `money`, `overBudgetReason`, `formatMissionTime`.
- **Glossary**: technical terms get a "?" `InfoTip` (bubble portalled to `document.body`). Text lives in `src/utils/glossary.js` (`GLOSSARY[key] = { term, text }`); render with `<Info topic="key" />` or the `info` prop many components take. Add new terms there, never inline.
- **Redo**: every player-flown flight view (not the automatic M2S3/M2S6) passes `onRedo={useRedo()}` to `FlightControls` (Redo button by the title). `useRedo` re-navigates to the same URL with the same route state (`replace`); `App` keys `<Routes>` on `location.key`, so the view remounts with fresh local state.
- Mission UI reused across views (optional props default to the original look): `FlightControls` (`title`), `MissionClock` (`caption`, `locked`; warp stepper, 0 = paused), `PhaseGoal` (meters `{ label, value, valueText, target: { min, max } }`, `reached` + `action`, `failed`/`failedText`; no fill transition), `FuelGauges` (`title`, per-gauge `detail`), `ViewSwitch`.
- `StepNav`: fixed Back/Continue bar beside a designer view's layout; buttons only when `onBack`/`onContinue` given, `blockedReason` disables Continue, `continueLabel` renames it. Buttons inset 205px and `ThreePane` side panes padded to clear the deployed site's corner badge. M1S3 and M1S4 have none.
- `TrajectoryView`/`TransferView` use X3DOM, loaded lazily by `x3domLoader.js` (torn down by `shutdownX3dom`). Scene markup built once (`trajectoryScene.js`, `marsScene.js`, `transferScene.js`) and updated via `setAttribute`; React never renders X3D tags. `TransferView` is generic: a page passes a stable `scene` (`marsTransferScene(leg)`, `MOON_SCENE`), `bodies` positions, `phase` lines (`phaseLines`) and `readout`. `useCoast` (hook) advances the coast clock.
- Failure wording: `src/utils/missionFailure.js`, shown by `FailureReport`. `MissionFailure` uses `retryState`/`retryPath` to offer a retry or a redesign.

## Designers (`/m1-s1`, `/m1-s2`)

Both `ThreePane` (form / blueprint diagram / stats); Continue depends **only on budget** (`BUDGET`: $32M spacecraft, $60M rocket, placeholders).

- **Spacecraft** `{ solarPanels, batteries, radiators, rcsFuel }`, each system `small`/`medium`/`large`. Model `spacecraftPhysics.js` (`computeSpacecraftStats`); its `totalMass` (`selectSpacecraftMass`) is the rocket's payload. `SpacecraftDiagram` reuses `.rd-*` classes from `RocketDiagram.css`.
- **Rocket**: stage `{ id, fuel, propellant, cycle, gasGenerator, expansionRatio, engines, altitude }`. `stages[0]` is the bottom stage; panels list top-first (`toReversed()`); new stages go underneath; max 3. Engine limits by position from the bottom, fuel ranges/defaults from the **top** (a lone stage is an upper stage; removal re-clamps). SRBs `null | { fuel }`, need ≥ 2 stages, fuel capped by `maxSrbFuel(stages)` (`rocketLayout.js`); burn as a separate first phase.
- `rocketPhysics.js` (tonnes, Pa, km): Isp from c\*, chamber pressure, turbopump efficiency and nozzle relations with exponential atmosphere and Summerfield separation; thrust `engines × Pc × At × CF × efficiency`; Δv by rocket equation top-down (`computeRocketStats(stages, srbs, payloadMass)`); `stageCost`. Target orbit 300 ± 10 km (`ORBIT_ALTITUDE_KM`, `ORBIT_WINDOW_KM`).
- **Lander** (`/m2-s1`, `landerSlice.js`): the spacecraft design plus `landerFuel` (t); `landerPhysics.js` (`computeLanderStats`, scaled-Earth orbit target `M2_ORBIT_*`). The spacecraft form/diagram/stats show the landing stage when the design has `landerFuel`; stats render `stats.requirements` (Δv meters fill landing → liftoff → ejection in order). `/m2-s2` shares the rocket slice with M1S2 via `useRocketDesign`; `RocketStats` takes `orbit`/`orbitNote`.
- `RocketBody.jsx` draws the rocket (diagram and `FlightView`); geometry in `rocketLayout.js`.

## Flight panel (`/m1-s4`) and orbit insertion (`/m1-s9`, `/m2-s5`)

`SplitPane`; `useFlight` steps `stepFlight` (`flightSim.js`) each animation frame (step ≤ 0.1 s × warp, controls via ref). Left: `FlightControls` with `ThrottleControl`, `PitchControl` (pitch rate, hold attitude), `PhaseGoal`, then `FlightStats`. Right: `FlightView` / `TrajectoryView` with `FuelGauges`.

- **Sim**: 2D, round non-rotating body (`EARTH`, or `MARS`/`MOON`: no air, vacuum thrust); Euler substeps; thrust, inverse-square gravity, drag. Empty stages separate (top stage stays). `flightReadouts` gives Kepler apogee/perigee (`null` apogee = escape, `null` perigee = hits ground) and apsis timers. M1S9 options: `coastTo`, `coastRetrograde`, `failOnEscape`.
- **M1S4 phases** (`missionPhase()`): ascent (apogee into 290–310 km, then Next goal) → coast (engines off, auto warp, controls locked until 60 s before apogee) → circularize (both apsides in window with no thrust; Continue to M1S5). Clock starts T−10. Failures `twr`, `crash`, `fuel`.
- **M1S9** (`marsArrival.js`): starts 10,000 km up on a hyperbola (`approachState`), coasts retrograde to 60 s before periapsis, then the player brakes into 900–1,100 × 16,000–18,000 km. Failures crash/fuel/escape (`isCaptureFailure`; M1S9 passes `retryPath`/`redesignPath`). App.jsx renders it with `arrival="mars"` or `"moon"` (+ matching `key`); its `ARRIVALS` table holds the differences.
- **M2S5** (same view, `moonArrival.js`, `LUNAR_SCENE` in `lunarScene.js`): half-size `MOON` (no air), equatorial pass 50 km up, clockwise seen from above the north pole; starts 3,000 km up (default v∞ 590 m/s) and brakes ~635 m/s into a 50 × 150 km orbit (perigee 40–60 km, apogee 140–160 km; climbing past 160 km uncaptured fails as escape). Continue → `/m2-s6`; failure Redesign → `/m2-s2`.

## Docking (`/m1-s6`, `/m1-s11`)

`useDocking` steps `dockingSim.js`: depot port at origin, z toward spacecraft; starts 100 m out with random offset and attitude errors. RCS pulses (coarse/fine) spend RCS Δv (design's minus `rcsUsed`). Docks at z = 0 within `DOCKING_TOLERANCE` (0.1 m, < 0.2 m/s, ≤ 1°), else `result.reasons`; drifting past `MAX_RANGE_M` fails. `RcsControls` (keyboard W/A/S/D/Q/E, arrows, Z/X, F for precision), `DockingStats`, `DockingView` (wireframe port camera with HUD).

## Refueling (`/m1-s7`, `/m1-s12`)

`RefuelPanel` layout; `refueling.js` fills attached stages top-first after `HOOKUP_SECONDS` over `TRANSFER_SECONDS` from a depot of `DEPOT_CAPACITY_T`. `RefuelDiagram` in the centre; Undock when done.

## Ejection burns (`/m1-s8`, `/m1-s13`)

Left: `EjectionForm` (burn angle and Δv, propellant meter, Eject disabled if over the active stage's Δv or not escaping), `PhaseGoal` (closest approach; Continue on encounter with `arrival: { vInf }`), `CruiseStats`. Right: `TransferView` (units 1 million km) with RCS/battery gauges.

- `marsTransfer.js`: every function takes a leg (`TO_MARS`/`TO_EARTH`). Patched conics: prograde burn in the parking orbit gives v∞, then Sun-only Verlet. Outbound ~3.65–3.7 km/s at a small angle hits Mars (target leads 44°); return ~1.13–1.2 km/s at 0° from the 1,000 × 17,000 km Mars orbit (Earth trails 75°).
- `cruiseSystems.js`: `cruiseTimeline(course, …)` (`planetCourse(leg, path)` here) simulates power (1/r² solar + battery), heat (cabin limit) and RCS hour by hour; the first failure (`power`/`heat`/`rcs`) goes to `/mission-failure`.

## Science (`/m1-s10`, `/m2-s7`)

One view, `M1S10`; App.jsx passes `site="mars"` or `"moon"` (+ matching `key`), and its `SITES` table holds the experiment list, intro and next route (`/m1-s11` or `/m2-s8`). Lunar surface experiments in `lunarExperiments.js` (`LUNAR_EXPERIMENTS`, same shape, scoring helpers imported from `scienceExperiments.js`).

`ScienceBoard` with an `ExperimentCard` per entry of `EXPERIMENTS` (`scienceExperiments.js`: nine, each `{ id, title, instrument, description, params, defaults, run }`; params `"range"` or `"select"`; `run` deterministic, returns `{ quality, findings, summary, hint }`). Defaults are poor on purpose. Complete at quality ≥ 60 (sticky); Continue needs 2. Results dim as stale when settings change.

## Reentry (`/m1-s14`, `/m2-s10`)

One view, `M1S14`; App.jsx passes `trip="mars"` or `"moon"` (+ matching `key`), and its `TRIPS` table holds the planet (`EARTH_ENTRY` / `SCALED_EARTH_ENTRY`), entry speed and starting angle from route state (Mars: `arrival.vInf`; Moon: `entryFromPerigee(arrival.perigeeAltitude, arrival.speed)`, default `DEFAULT_PERIGEE` in `moonReturn.js`), the retry path (passed to `/mission-failure` as `retryPath`) and wording; failures carry `from` for the tips. Lunar return enters at ~7.7 km/s; corridor ~8–9.5° at 0° AoA, ~8.5–11.5° at 10–20° (heat stays well under the limit; skip or overload fail). A 0–100 km M2S9 perigee maps to ~10.9°–4.4°, so only ~25–55 km starts inside the corridor; the angle stays adjustable.

Opens with service-module jettison (`SEPARATION_MS` must match the `ReentryView` CSS animation). `ReentryForm` (entry angle locked at Start; angle of attack until blackout; reuses `EjectionForm`'s `Field`/`Readout`), `ReentryView` (blueprint SVG, heat-shield sections coloured by temperature), `ReentryStats`. Flies live until the blackout (`inBlackout`), then `finishEntry` computes the rest while `RadioBlackout` covers the screen for 15 s. Ends in `Splashdown` or failure (burnup by heat > 2,750 °C or > 15 g, or skip above 125 km).

- `reentry.js`: 2D point mass (the planet `{ gm, radius }` rides in the state: `entryState(speed, angle, planet)`), ballistic coefficient 350 kg/m², L/D = 0.016 × AoA with lift up while descending; Sutton–Graves heating per section (windward shoulder × `1 + 0.04 × AoA`). Corridor ~5.75–6.25° at 0° AoA, ~5.75–7° at 10–15°.

## Moon transfer (`/m2-s4`)

M1S8's layout aimed at the Moon. `moonTransfer.js`: Earth-centred, Earth-only gravity (Verlet with steps scaled to the local orbit period, points every 600 s) from the 200 km parking orbit; the Moon (192,200 km, ~19-day orbit) leads by the player's **Moon angle**; encounter within 33,000 km. ~2,180 m/s at 0° with the Moon ~115° ahead hits. The burn may use every attached stage (`availableDeltaV`/`burnStages`, vacuum Isp, emptied stages separate). `EjectionForm` takes `children` (extra fields), `angleHint`, `departure` (readout override). The lander's systems run through `cruiseTimeline(moonCourse(path, phaseAngle), …)` with `CruiseStats` and RCS/battery gauges, like M1S8 (1 AU throughout, smaller `thermalMass` so undersized radiators overheat within the ~3.5-day trip); a failure goes to `/mission-failure` with `retryPath` `/m2-s4` and `redesignPath` `/m2-s1`. Continue passes `flight` and `arrival: { vInf }` relative to the Moon.

## Lunar landing (`/m2-s6`)

Automatic, like M2S3. `lunarLanding.js` `landingPlan(landerDeltaV)` (on `scriptedFlight.js`, shared with the liftoff: keyframes + segments, a lead phase, running dry → `falling`/`crashed` or `stranded`): `SEPARATION_SECONDS` of the spent stages (`flight.stageIndex` onward) dropping away (`RELEASE_AT`), then scripted keyframes (turn, deorbit, coast, braking, approach, descent; altitude as a Hermite curve of the vertical speeds), each played in a few real seconds, spending `LANDING_DELTA_V` (1,300 m/s, `landerPhysics.js`). Short of it the lander falls freely (`crashed`) or, dry in the deorbit burn, is `stranded`; both offer Redesign lander. `LandingView` draws `SpacecraftBody` (the lander drawing split out of `SpacecraftDiagram`, geometry in `spacecraftLayout.js`) with its engine plume over a log-scaled rising surface with dust and craters that slide by `sweep` (the integral of horizontal speed ÷ height, so they slow to a stop by touchdown); `LandingStats` readouts; fuel gauge via `landerFuelLeft`. Continue → `/m2-s7` with `lander: { fuelLeft }`.

## Lunar liftoff (`/m2-s8`)

Automatic, like M2S6, reusing `LandingView` (`stages={null}`; ground drawn as at 50 km above that) and `LandingStats` (`title="Ascent"`). `lunarLiftoff.js` `liftoffPlan(Δv left after LANDING_DELTA_V)`: countdown (clock from T−4), rise, pitch-over, powered ascent into 15 × 100 km, coast to the high point, circularize into 100 × 100 km, spending `LIFTOFF_DELTA_V` (1,250 m/s, `landerPhysics.js`). Dry before the circularization → falls back (`crashed`); dry during it → `stranded` (`strandedPerilune`); both offer Redesign lander. Continue → `/m2-s9` with `lander: { fuelLeft }`.

## Trans-Earth injection (`/m2-s9`)

M2S4's layout in reverse. `moonReturn.js` `returnPath(burn, angle, position)`: Earth-centred, Earth **and** Moon gravity (Verlet, step ~1/500 of the shorter local period around either), from the 100 km lunar orbit (clockwise around the Moon; the Moon starts at the top of the view, `MOON_START_ANGLE`). The player's **position in orbit** is clockwise from the Moon's direction of travel. Goal: Earth perigee 0–100 km (`PERIGEE_TARGET_KM`); hitting Earth gives the Kepler perigee at impact (negative altitude). ~570 m/s at 0° from ~32° or ~53° works. Eject blocked if over the landing stage's Δv (after `LANDING_DELTA_V + LIFTOFF_DELTA_V`), not escaping the Moon or hitting it. `MOON_RETURN_SCENE` (`moonScene.js`) draws the lunar orbit enlarged (`returnPhaseLines`, `burn` marker) until the burn; `closest` marks the perigee. Systems via `cruiseTimeline(earthCourse(path), …)`; failure retry `/m2-s9`. Continue → `/m2-s10` with `lander: { fuelLeft }` and `arrival: { perigeeAltitude, speed }`.
