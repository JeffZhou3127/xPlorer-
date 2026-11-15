# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

xPlorer+ is an early-stage React app. Routes: home (`/`), mission objective (`/scenario1`), spacecraft designer (`/m1-s1`), rocket designer (`/m1-s2`), launch confirmation (`/m1-s3`), flight panel (`/m1-s4`), orbit reached (`/m1-s5`, from goal 2's Continue; sets up docking), docking (`/m1-s6`, see below), refueling (`/m1-s7`, from the docked Continue; see below), Mars ejection burn (`/m1-s8`, from Undock; see below), Mars orbit insertion (`/m1-s9`, from M1S8's Continue once Mars is reached; see below), science experiments (`/m1-s10`, from M1S9's Continue once captured; see below), then the trip home: docking at the Mars depot (`/m1-s11`), refueling (`/m1-s12`) and the Earth ejection burn (`/m1-s13`), Earth reentry (`/m1-s14`, see below), and mission failure (`/mission-failure`, reached from the flight panel, a systems failure in M1S8 or M1S13, M1S9, or M1S14). Each step's Continue leads to the next; M1S14 ends in splashdown and a link home.

Steps 6–8 and 11–13 share views, named after both steps: `M1S6A11` (docking), `M1S7A12` (refueling), `M1S8A13` (ejection burn). `App.jsx` renders each with a `leg` prop, `"outbound"` (6–8) or `"return"` (11–13), plus a matching `key`; each view keeps a `LEGS` table of what differs (wording, next route).

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint`: oxlint (`.oxlintrc.json`)
- No test framework yet.

## Stack and structure

- **Vite 8 + React 19**, plain JS/JSX (no TypeScript). Arrow-function components, double quotes, semicolons.
- **Linting**: oxlint with `react` and `oxc` plugins; `react/rules-of-hooks` is an error, `react/only-export-components` a warning (component files export only components, for Fast Refresh).
- **Routing**: `react-router` v8, declarative. Import from `react-router`, not `react-router-dom`. `src/App.jsx` holds only `<Routes>`. Pages live in `src/views/` (scenario views in `src/views/scenario1/`, e.g. `M1S2.jsx` → `/m1-s2`; shared ones like `M1S6A11.jsx` serve `/m1-s6` and `/m1-s11`). Scenario `<Link>`s live in `Home.jsx`. To add a view: create it, add a `<Route>` in `App.jsx`, and a `<Link>` in `Home.jsx`.
- **Views vs. components**: views assemble components. Each component lives in its own PascalCase folder in `src/components/` with its CSS file, which it imports. Non-UI logic (physics, wording) lives in `src/utils/`; shared hooks in `src/hooks/` (`useFlight`).
- **Dev shortcut (temporary)**: `DevJump` (dashed amber button, top right of M1S2) jumps to M1S8 with every stage attached and full. To remove it, delete `src/components/DevJump/` and its import and element in `M1S2.jsx` (both marked `DEV ONLY`).
- **Entry**: `src/index.jsx` mounts `<App />` inside `StrictMode`, the Redux `Provider` and `BrowserRouter`. Put new top-level providers there.
- **State**: Redux Toolkit. `spacecraftSlice.js` (`updateDesign(patch)`) and `rocketSlice.js` (`{ stages, srbs, nextStageId }`; `addStage`, `removeStage`, `updateStage({ id, patch })`, `addSrbs`, `removeSrbs`, `updateSrbs`). Rocket design rules (`FUEL_RANGES`, `ENGINE_RANGES`, `rangesFor`, defaults, SRB limits) are in `rocketSlice.js`. Designs survive navigation but not a reload. Views use `useSelector`/dispatch; components are presentational.

## Shared pieces

- `Meter` (red with `alert`), `Stat`, `Info` from `RocketStats.jsx`; `RangeField`/`SelectField` from `StageCard.jsx`.
- `src/utils/format.js`: `format`, `money`, `overBudgetReason(cost, budget)`, `formatMissionTime`.
- `InfoTip`: "?" help button whose bubble is portalled to `document.body` (side panes scroll and would clip it). Text lives in `src/utils/glossary.js` (`GLOSSARY[key] = { term, text }`); `<Info topic="key" />` (exported from `InfoTip.jsx`, re-exported by `RocketStats.jsx`) renders one. Every page with technical terms has them: many components take an `info` glossary key (`Stat`, `RangeField`/`SelectField` and the science `params`, `EjectionForm`'s `Field`/`Readout` (also used by `ReentryForm`), `FuelGauges`, `ViewSwitch`, and summary rows in `FailureReport`/`Splashdown`). Add new terms to the glossary rather than writing them inline.
- Reused across the mission views (optional props keep their original look by default): `FlightControls` (`title`), `MissionClock` (`caption`, e.g. "Docking Time"; `locked`), `PhaseGoal` (`failed`/`failedText`), `FuelGauges` (`title`, per-gauge `detail`).
- Route state carries the leftover stages (`{ flight: { stageIndex, stageFuel } }`) the whole way: from M1S4 through M1S5–M1S7 to M1S8, which passes what the burn left to M1S9, whose capture burn's leftovers go through M1S10–M1S12 to M1S13. `rcsUsed` is the RCS Δv spent so far, cumulative: each docking adds its pulses and M1S8 adds the cruise's (the depots refuel only the stages, not the RCS). Views fall back to "only the top stage left" and no RCS used without it (e.g. opened directly).
- `StepNav`: fixed Back/Continue bar rendered by each designer view next to its layout (not inside a pane). Buttons show only when `onBack`/`onContinue` is passed; `blockedReason` disables Continue with a tooltip. Buttons are inset 205px from the edges to clear the deployed site's corner badge. `ThreePane` side panes have bottom padding to clear it. `M1S3` (buttons inside `LaunchAlert`) and `M1S4` have no `StepNav`.

## Spacecraft designer (`/m1-s1`)

`M1S1.jsx`, `ThreePane` layout. Design: `{ solarPanels, batteries, radiators, rcsFuel }`; each system is always fitted with size `small`/`medium`/`large` (default `small`), RCS fuel in kg.

- **Left `SpacecraftForm`**: RCS fuel slider and a size select per system (the player trades capacity against mass and cost).
- **Centre `SpacecraftDiagram`**: blueprint of the pod and service module only, reusing `.rd-*` classes from `RocketDiagram.css`.
- **Right `SpacecraftStats`**: mass, power, RCS Δv, requirement meters (power at Mars, battery backup, heat rejection, RCS Δv), cost and per-part list.
- **Model**: `src/utils/spacecraftPhysics.js` (`computeSpacecraftStats`), placeholder constants at the top. Its `totalMass` (`selectSpacecraftMass`) is the rocket's payload.
- Continue depends **only on the budget** (`BUDGET`, $32M placeholder).

## Rocket designer (`/m1-s2`)

`M1S2.jsx`, `ThreePane` layout.

- **Left `RocketForm`**: a `StageCard` per stage (fuel type, fuel amount, engine cycle, gas-generator exhaust when relevant, expansion ratio 5–100, engine count), plus `SrbCard`.
- **Centre `RocketDiagram`**: live SVG blueprint; tank height follows propellant volume (mass ÷ density).
- **Right `RocketStats`**: total Δv, liftoff mass, liftoff TWR, payload; LEO Δv meter (guidance only; the spacecraft refuels in orbit, so there is no Mars meter); cost vs budget; per-stage altitude slider (0–110 km) with Δv, Isp, burn time, masses and cost; SRB section.
- Continue depends **only on the budget** (`BUDGET`, $60M placeholder).

Stage conventions:

- `stages[0]` is the bottom stage (Stage 1); panels list top-first via `toReversed()`. New stages go **underneath** as the new booster. Max 3 stages.
- Shape: `{ id, fuel, propellant, cycle, gasGenerator, expansionRatio, engines, altitude }`.
- Engine limits by position from the bottom (`ENGINE_RANGES`: 1–9, 1–5, 1–3). Fuel ranges and defaults by position from the **top** (`rangesFor(count)`), so a lone stage is an upper stage; removing a stage re-clamps fuel.
- **SRBs**: `srbs` is `null` or `{ fuel }` (combined). Allowed only with ≥ `MIN_STAGES_FOR_SRBS` (2) stages. Height may not exceed the stages below the top stage, so fuel is capped by `maxSrbFuel(stages)` (`rocketLayout.js`) at render time. Physically a separate first phase, then dropped.

`src/utils/rocketPhysics.js` (no React; tunable constants at the top). Masses in tonnes, pressures in Pa, altitudes in km.

- Isp from c\*, cycle chamber pressure, turbopump efficiency and isentropic nozzle relations, with an exponential atmosphere and Summerfield separation (within a few percent of real engines).
- Thrust = `engines × Pc × At × CF × efficiency` (fixed throat area).
- Δv by the rocket equation, mass accumulated top-down on the payload: `computeRocketStats(stages, srbs, payloadMass)`.
- `ORBIT_DELTA_V`: circular velocity at `ORBIT_ALTITUDE_KM` (300 km), no losses. `ORBIT_WINDOW_KM` is 300 ± 10 km.
- Cost (`stageCost`, $M, placeholders): engines by cycle × gas-generator `costFactor` × expansion-ratio factor, tanks by volume × `tankCostFactor`, propellant per tonne, $2M per stage.

## Flight panel (`/m1-s4`)

`M1S4.jsx`, `SplitPane` layout. Flight state is local (not Redux): the `useFlight` hook (`src/hooks/useFlight.js`, shared with M1S9) steps `stepFlight` every `requestAnimationFrame` (frame step capped at 0.1 s, times the warp), reading controls through a ref.

- **Clock**: starts at T−10; nothing moves until T−0, but controls work immediately. `MissionClock` (bottom centre) has a warp stepper 0 (paused) to `MAX_TIME_WARP` (5×); at 0 the step is skipped entirely.
- **Left**: `FlightControls` with `ThrottleControl` (0–100%, shut down/restart; liquid engines only, SRBs always full), `PitchControl` (pitch **rate**, ±5°/s, plus "Hold attitude") and `PhaseGoal`; `FlightStats` below.
- **`PhaseGoal`**: presentational goal card with one bar per `meters` entry (`{ label, value, valueText, target: { min, max } }`), a note, and green + optional `action` button when `reached`. No width transition on the fill (it changes every frame). `goalCard()` in `M1S4` builds its props.
- **Right**: `ViewSwitch` between `FlightView` (rocket attitude with plumes and staging animation) and `TrajectoryView` (3D), each with `FuelGauges`.

**Mission phases** (`missionPhase()`; nothing shuts the engines down automatically):

1. **ascent**: bring the apogee into `TARGET_APOGEE_KM` (290–310 km). Checked live: **Next goal** shows only while in range.
2. **coast**: Next goal shuts the engines down, resets warp to 1x and runs at `coastWarp` (`coastWarpFor()`, ~10 real seconds). Clock and throttle are locked until the sim sets `coastEndTime` (`timeToApogee` ≤ `COAST_LEAD`, 60 s).
3. **circularize**: met when the sim sets `orbitGoalTime`: no thrust with both the perigee and the apogee inside 290–310 km (`targetPerigee`, `targetApogee`). Stays met; its card then shows **Continue** to `/m1-s5` (`M1S5`, an `OrbitReport` panel), passing `{ flight: { stageIndex, stageFuel } }` as route state; M1S5, M1S6 and M1S7 forward it on to M1S8.

**Failure** (`flight.failure`, after which `stepFlight` stops): `twr` (launch TWR < 1 at T−0), `crash` (touches ground after lifting off), `fuel` (everything empty and the orbit isn't in the window). M1S4 navigates to `/mission-failure` with `{ failure, targets }`; wording comes from `src/utils/missionFailure.js` (`explainFailure`, `failureSummary`), shown in `FailureReport`.

**Simulation** (`src/utils/flightSim.js`, no React):

- 2D flight around a round, non-rotating planet, `flight.body` (`EARTH` by default, or `MARS`: no air, so no drag, vacuum thrust and a 0.1 s substep); origin at its centre, pad at `(0, EARTH_RADIUS)`. `flightInSpace` starts a flight already in space; `flightReadouts`, `predictedPath` and the apsis timers all use the flight's body. Semi-implicit Euler in `SUBSTEP` (0.02 s) steps. Forces: thrust along the axis (pitch from *local* vertical), inverse-square gravity, drag ½ρv²CdA.
- Active stage drains at `throttle / stageBurnTime(stage)`; empty stages separate (taking SRBs), recorded in `flight.separation`. The top stage stays on when empty.
- Touching the ground zeroes velocity (the rocket sits on the pad until thrust beats weight).
- `flightReadouts`: altitude, speeds and Kepler apogee/perigee (`null` apogee = escape, whose perigee is the hyperbola's closest pass; `null` perigee = path hits ground). `timeToApogee` and `timeToPerigee` (ellipse or hyperbola) use Kepler's equation.
- Optional controls used by M1S9: `coastTo: "perigee"`, `coastRetrograde` (attitude held against the direction of travel while coasting) and `failOnEscape` (failure `"escape"` once climbing on an escape path above the apogee window). Failure records carry `body`. `flight.track` gets a point per flight second; `predictedPath` follows the vacuum conic.

**`TrajectoryView`**: `x3dom` is a classic global script, injected lazily by `x3domLoader.js` and torn down by `shutdownX3dom`. The scene is built once as markup (`trajectoryScene.js`) and updated with `setAttribute`; React never renders the X3D tags. Units are 1,000 km. A `scene` prop describes the planet (`EARTH_SCENE` in `trajectoryScene.js` by default, flight plane x–y; `MARS_SCENE` in `marsScene.js`): markup, `toScene`, camera buttons, landmarks, which apsis to mark ahead and the legend. The target orbit ghost hides once the goal is reached.

**Rocket drawing**: `RocketBody.jsx` draws the rocket only (used by `RocketDiagram` and `FlightView`); geometry helpers (`rocketTop`, `maxSrbFuel`, spacecraft heights) live in `rocketLayout.js`.

## Docking (`/m1-s6`, `/m1-s11`)

`M1S6A11.jsx` (`leg` "outbound": the Earth depot, Continue to `/m1-s7`; "return": the Mars depot, Continue to `/m1-s12`), `SplitPane` layout; local state like the flight panel (`useDocking` steps `stepDocking` per frame, warp up to 10x via `MissionClock`, captioned "Docking Time"). The RCS budget is the design's RCS Δv minus `rcsUsed` so far; the gauge shows it against the full tank.

- **Model** (`src/utils/dockingSim.js`, no React): frame with the depot port at the origin, x right, y up, z toward the spacecraft (distance to close). Starts 100 m out, a random 1–3 m off-axis in x and y and 1.5–5° out in roll/pitch/yaw (random signs; a new start on every Retry). RCS **pulses** add a fixed velocity (in the spacecraft's own axes) or turn rate (`TRANSLATION_STEP`, `ROTATION_STEP`, coarse/fine) and spend RCS Δv from the spacecraft design (`rcsDeltaV`). Contact at z = 0 docks if offset ≤ 0.1 m, speed < 0.2 m/s and every angle ≤ 1° (`DOCKING_TOLERANCE`); otherwise `result.reasons` says why. Drifting past `MAX_RANGE_M` also fails.
- **Left**: `FlightControls` (title "Docking controls") with `RcsControls` (translate/rotate pads; keys W/A/S/D/Q/E, arrows, Z/X; F toggles precision; held keys light their pad buttons via `heldKeys`), a precision `ViewSwitch` and `PhaseGoal` (its `failed` state shows the reasons and Retry); `DockingStats` below.
- **Right**: `DockingView`, a perspective wireframe from the spacecraft's port camera (depot body, solar panels, port collar, target cross recessed in the collar for parallax), boresight reticle and HUD (X/Y/Z, attitude and rates, range and closing rate; green within tolerance), with an RCS `FuelGauges`.

## Refueling (`/m1-s7`, `/m1-s12`)

`M1S7A12.jsx` (`leg` "outbound": Undock to `/m1-s8`; "return": titled "Refueling at Mars", Undock to `/m1-s13`), `RefuelPanel` layout (title, left/centre/right, status and action). The stages still attached after the flight (route state from M1S4; without it, only the top stage, empty) are filled from the depot, top stage first, over a fixed `TRANSFER_SECONDS` after `HOOKUP_SECONDS` (`src/utils/refueling.js`; depot holds `DEPOT_CAPACITY_T`). Left: the spacecraft's stage `FuelGauges` (`title`, per-gauge `detail`); centre: `RefuelDiagram` (the rocket on its side, nose in the depot's collar, tank fills and an animated flow line); right: the depot gauge. **Undock** appears when the transfer is done.

## Ejection burns (`/m1-s8`, `/m1-s13`)

`M1S8A13.jsx`, `SplitPane` layout. `leg` "outbound" (Trans-Mars injection, Continue to M1S9) or "return" (Trans-Earth injection from the Mars science orbit; Continue to M1S14 with `arrival: { vInf }`). Wording below says Earth/Mars for the outbound leg; the return swaps them. Left: `FlightControls` with `EjectionForm` (burn angle from Earth's orbital direction, + outward; burn Δv; a propellant meter, needed (`burnPropellant`) vs the active stage's tank; readouts; **Eject** at the bottom, greyed out with a reason when the burn exceeds the active stage's Δv or doesn't escape Earth) and a `PhaseGoal` (closest approach to Mars; Try again on a miss, Continue to M1S9 on an encounter, passing `flight` with the fuel the burn left and `arrival: { vInf }` from `arrivalSpeed`), then `CruiseStats` (trip, power, thermal and RCS readouts with meters). Right: `TransferView`, an X3DOM scene like `TrajectoryView` (reuses its loader and helpers; `transferScene.js`, units of 1 million km): Sun, both orbits, planets, the 44° phase marks before the burn, the planned path (amber), its closest approach and Mars's position then, and after Eject the flown path (cyan), animated at `DAYS_PER_SECOND`. RCS and battery `FuelGauges` float over it (`aside`).

- **Model** (`src/utils/marsTransfer.js`, no React): every function takes a leg, `TO_MARS` or `TO_EARTH` (`from`, `to`, `phaseAngle` the target leads by at the burn, `startAngle`, `retrograde` (burn angle 0° points against the departure planet's motion), `departure` orbit, `encounterDistance`); `planetAt`, `targetAt`, `escapeBurn`, `excessSpeed`, `transferPath(leg, burn, angle)`, `arrivalSpeed(leg, path)`. `TransferView`, `transferScene` (`sceneMarkup(leg)`), `EjectionForm` (`origin`, `retrograde`), `CruiseStats` (`target`) and `cruiseTimeline(leg, …)` take the leg too. Patched conics. The burn is prograde in the 300 km parking orbit (Oberth), giving v∞; the angle sets v∞'s direction relative to Earth's heliocentric velocity. Then Sun-only Verlet integration (6 h steps, `MAX_DAYS`), circular coplanar planets, Mars `phaseAngle` (44°) ahead at the burn. An encounter is a closest approach within `encounterDistance` (~the target's sphere of influence). A pure Hohmann burn (~3.6 km/s, 0°) misses by ~1 million km because 44° is short of the ideal 44.3°; ~3.65–3.7 km/s with a small angle hits. Return: from the 1,000 × 17,000 km Mars orbit's periapsis (410 m/s escapes), Earth trailing by 75° (`phaseAngle: -75`); ~1.13–1.2 km/s at 0° reaches Earth (encounter within 0.93 million km) after ~260 days. `stageDeltaV` uses vacuum Isp with all stages full.
- **Cruise systems** (`src/utils/cruiseSystems.js`, no React): at Eject, `cruiseTimeline` works out the coast hour by hour. Solar output falls with 1/r² and the battery covers any shortfall below `POWER_DEMAND_KW`; heat above the radiators' rating warms the cabin (fails at `CABIN_MAX_C`); RCS spends `RCS_SETTLE`, then `RCS_PER_DAY`. The first failure (`kind` "power" | "heat" | "rcs") stops the coast there, and M1S8A13 navigates to `/mission-failure` with `{ failure, retryState, retryPath }`. For these, `MissionFailure` retries the burn (`retryPath`, `/m1-s8` by default) or redesigns the spacecraft (`/m1-s1`); wording is in `missionFailure.js`.

## Mars orbit insertion (`/m1-s9`)

`M1S9.jsx`: the launch panel's interface (`FlightControls` with throttle, pitch and `PhaseGoal`; `FlightStats`; Attitude / Trajectory 3D with `FuelGauges`; `MissionClock` captioned "Since arrival") around Mars (`MARS` body, `MARS_SCENE`).

- **Model** (`src/utils/marsArrival.js`): the spacecraft starts `START_ALTITUDE_KM` (10,000 km) up on a hyperbola for the arrival v∞ (`DEFAULT_V_INF` without route state), periapsis `PERIAPSIS_ALTITUDE_KM` (1,000 km) on the flight frame's +y, which `MARS_SCENE` maps to Mars's north pole (flight plane = polar x–z plane).
- The approach coasts at a warp that takes ~10 real seconds, engines locked and pointed retrograde (`coastRetrograde`), until 60 s before perigee. Then the throttle unlocks (engines start off).
- **Goal**: engines off with perigee in `TARGET_PERIGEE_KM` (900–1,100) and apogee in `TARGET_APOGEE_KM` (16,000–18,000); ~1.15 km/s of braking at the default v∞. Once met, the goal card's Continue leads to `/m1-s10`.
- **Failure**: crash, fuel or escape → `/mission-failure` with `retryState`; `MissionFailure` retries `/m1-s9` or redesigns the rocket (`isMarsFailure`, `explainCaptureFailure` in `missionFailure.js`).

## Science experiments (`/m1-s10`)

`M1S10.jsx`: `ScienceBoard` (the "Science Experiments" header, intro, progress and a card grid) with an `ExperimentCard` per experiment, and a `StepNav` whose Continue is blocked until `REQUIRED_EXPERIMENTS` (2) are complete. Continue goes to the second docking (`/m1-s11`), passing M1S9's route state on.

- **Model** (`src/utils/scienceExperiments.js`, no React): `EXPERIMENTS` lists nine experiments (camera, spectrometer, magnetometer, neutrons, radar, thermal IR, radio occultation, moon imaging, gravity), each `{ id, title, instrument, description, params, defaults, run }`. `params` entries are `"range"` (`min`/`max`/`unit`, rendered with `RangeField`) or `"select"` (`options`, `SelectField`). `run(values)` is deterministic and returns `{ quality (0–100), findings: [{ label, value }], summary, hint }`. Altitudes refer to the M1S9 science orbit (1,000 × 17,000 km). Defaults give poor data on purpose; each has settings that reach 100.
- An experiment is **complete** once any run reaches `COMPLETE_QUALITY` (60) and stays complete. Each run takes `RUN_MS` ("Collecting data…"); results are kept with their settings, so a card dims its result as stale when the settings change.

## Earth reentry (`/m1-s14`)

`M1S14.jsx`, `SplitPane` layout (scenes drawn as blueprints like the rest: grid, white outlines, `.rd-*` line styles, cyan accents), from M1S13's Continue (route state `arrival.vInf`; `DEFAULT_V_INF` without it). Opens with the service module being jettisoned (`ReentryView` CSS animation; `SEPARATION_MS` in M1S14 must match it), then Start unlocks.

- **Left**: `FlightControls` (title "Reentry controls") with `ReentryForm` (entry angle below the horizon at 120 km, locked at Start; angle of attack, adjustable until the blackout; entry speed, L/D and windward heating readouts; reuses `EjectionForm`'s exported `Field`/`Readout` and CSS) and a `PhaseGoal` with corridor guidance.
- **Right**: `ReentryView` (SVG: Earth limb rising with altitude, capsule tilted by flight path and angle of attack, heat shield in three sections coloured cyan → red by temperature, shock wave and hot wake by heat flux) over `ReentryStats` (trajectory, deceleration vs `G_LIMIT`, shield section temperatures vs `SHIELD_LIMIT_C`). `MissionClock` ("Since entry interface"): the player's warp before the blackout, locked to the automatic warp during it.
- **Timeline**: Start flies the entry live in real time (about 30 s to the blackout), so the player can read the stats and adjust the angle of attack; the clock's warp (0 = paused, up to `MAX_WARP`, 5×) is theirs until the blackout. At the blackout (`inBlackout`: below 85 km, or the bottom of a shallower dip) the rest is computed at once (`finishEntry`) and `RadioBlackout` covers the screen (flickers, then "Radio Blackout" and an explanation; the clock stays on top) for `BLACKOUT_SECONDS` (15), with the clock warped to cover the rest of the entry. Then splashdown → `Splashdown` ("Mission success!", summary, link home), or burnup/skip → `/mission-failure` with `{ failure, retryState }` (`MissionFailure` retries `/m1-s14` or goes home).
- **Model** (`src/utils/reentry.js`, no React): 2D point mass, round Earth, exponential atmosphere, ballistic coefficient 350 kg/m². L/D = 0.016 × angle of attack; the guidance points lift up while descending and down while climbing (so lift widens the corridor). Sutton–Graves heat flux → radiative equilibrium temperature per section (`SHIELD_SECTIONS`; the windward shoulder takes `1 + 0.04 × AoA` of the flux). Outcomes: `burnup` (any section over `SHIELD_LIMIT_C`, 2,750 °C, cause "heat"; or over `G_LIMIT`, 15 g, cause "overload"), `skip` (climbs back above 125 km), `splashdown` (below 300 m/s). At ~3 km/s v∞ the corridor is about 5.75–6.25° with no angle of attack, widening to about 5.75–7° around 10–15°, and narrowing again at 25° as the windward shoulder overheats. Wording in `missionFailure.js` (`explainReentryFailure`).
