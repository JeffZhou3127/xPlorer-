# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

xPlorer+ is an early-stage React app. Routes: home (`/`), mission objective (`/scenario1`), spacecraft designer (`/m1-s1`), rocket designer (`/m1-s2`), launch confirmation (`/m1-s3`), flight panel (`/m1-s4`), orbit reached (`/m1-s5`, from goal 2's Continue; sets up docking), docking (`/m1-s6`, see below), refueling (`/m1-s7`, placeholder, from the docked Continue) and mission failure (`/mission-failure`, reached only from the flight panel). Each step's Continue leads to the next.

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint`: oxlint (`.oxlintrc.json`)
- No test framework yet.

## Stack and structure

- **Vite 8 + React 19**, plain JS/JSX (no TypeScript). Arrow-function components, double quotes, semicolons.
- **Linting**: oxlint with `react` and `oxc` plugins; `react/rules-of-hooks` is an error, `react/only-export-components` a warning (component files export only components, for Fast Refresh).
- **Routing**: `react-router` v8, declarative. Import from `react-router`, not `react-router-dom`. `src/App.jsx` holds only `<Routes>`. Pages live in `src/views/` (scenario views in `src/views/scenario1/`, e.g. `M1S2.jsx` → `/m1-s2`). Scenario `<Link>`s live in `Home.jsx`. To add a view: create it, add a `<Route>` in `App.jsx`, and a `<Link>` in `Home.jsx`.
- **Views vs. components**: views assemble components. Each component lives in its own PascalCase folder in `src/components/` with its CSS file, which it imports. Non-UI logic (physics, wording) lives in `src/utils/`.
- **Entry**: `src/index.jsx` mounts `<App />` inside `StrictMode`, the Redux `Provider` and `BrowserRouter`. Put new top-level providers there.
- **State**: Redux Toolkit. `spacecraftSlice.js` (`updateDesign(patch)`) and `rocketSlice.js` (`{ stages, srbs, nextStageId }`; `addStage`, `removeStage`, `updateStage({ id, patch })`, `addSrbs`, `removeSrbs`, `updateSrbs`). Rocket design rules (`FUEL_RANGES`, `ENGINE_RANGES`, `rangesFor`, defaults, SRB limits) are in `rocketSlice.js`. Designs survive navigation but not a reload. Views use `useSelector`/dispatch; components are presentational.

## Shared pieces

- `Meter` (red with `alert`), `Stat`, `Info` from `RocketStats.jsx`; `RangeField`/`SelectField` from `StageCard.jsx`.
- `src/utils/format.js`: `format`, `money`, `overBudgetReason(cost, budget)`, `formatMissionTime`.
- `InfoTip`: "?" help button whose bubble is portalled to `document.body` (side panes scroll and would clip it). Text lives in `src/utils/glossary.js` (`GLOSSARY[key] = { term, text }`).
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

`M1S4.jsx`, `SplitPane` layout. Flight state is local (not Redux): the `useFlight` hook steps `stepFlight` every `requestAnimationFrame` (frame step capped at 0.1 s, times the warp), reading controls through a ref.

- **Clock**: starts at T−10; nothing moves until T−0, but controls work immediately. `MissionClock` (bottom centre) has a warp stepper 0 (paused) to `MAX_TIME_WARP` (5×); at 0 the step is skipped entirely.
- **Left**: `FlightControls` with `ThrottleControl` (0–100%, shut down/restart; liquid engines only, SRBs always full), `PitchControl` (pitch **rate**, ±5°/s, plus "Hold attitude") and `PhaseGoal`; `FlightStats` below.
- **`PhaseGoal`**: presentational goal card with one bar per `meters` entry (`{ label, value, valueText, target: { min, max } }`), a note, and green + optional `action` button when `reached`. No width transition on the fill (it changes every frame). `goalCard()` in `M1S4` builds its props.
- **Right**: `ViewSwitch` between `FlightView` (rocket attitude with plumes and staging animation) and `TrajectoryView` (3D), each with `FuelGauges`.

**Mission phases** (`missionPhase()`; nothing shuts the engines down automatically):

1. **ascent**: bring the apogee into `TARGET_APOGEE_KM` (290–310 km). Checked live: **Next goal** shows only while in range.
2. **coast**: Next goal shuts the engines down, resets warp to 1x and runs at `coastWarp` (`coastWarpFor()`, ~10 real seconds). Clock and throttle are locked until the sim sets `coastEndTime` (`timeToApogee` ≤ `COAST_LEAD`, 60 s).
3. **circularize**: met when the sim sets `orbitGoalTime`: no thrust with both the perigee and the apogee inside 290–310 km (`targetPerigee`, `targetApogee`). Stays met; its card then shows **Continue** to `/m1-s5` (`M1S5`, an `OrbitReport` panel).

**Failure** (`flight.failure`, after which `stepFlight` stops): `twr` (launch TWR < 1 at T−0), `crash` (touches ground after lifting off), `fuel` (everything empty and the orbit isn't in the window). M1S4 navigates to `/mission-failure` with `{ failure, targets }`; wording comes from `src/utils/missionFailure.js` (`explainFailure`, `failureSummary`), shown in `FailureReport`.

**Simulation** (`src/utils/flightSim.js`, no React):

- 2D flight around a round, non-rotating Earth; origin at Earth's centre, pad at `(0, EARTH_RADIUS)`. Semi-implicit Euler in `SUBSTEP` (0.02 s) steps. Forces: thrust along the axis (pitch from *local* vertical), inverse-square gravity, drag ½ρv²CdA.
- Active stage drains at `throttle / stageBurnTime(stage)`; empty stages separate (taking SRBs), recorded in `flight.separation`. The top stage stays on when empty.
- Touching the ground zeroes velocity (the rocket sits on the pad until thrust beats weight).
- `flightReadouts`: altitude, speeds and Kepler apogee/perigee (`null` apogee = escape, `null` perigee = path hits ground). `timeToApogee` uses Kepler's equation. `flight.track` gets a point per flight second; `predictedPath` follows the vacuum conic.

**`TrajectoryView`**: `x3dom` is a classic global script, injected lazily by `x3domLoader.js` and torn down by `shutdownX3dom`. The scene is built once as markup (`trajectoryScene.js`) and updated with `setAttribute`; React never renders the X3D tags. Units are 1,000 km, flight plane is x–y. The target orbit ring hides once goal 2 is reached.

**Rocket drawing**: `RocketBody.jsx` draws the rocket only (used by `RocketDiagram` and `FlightView`); geometry helpers (`rocketTop`, `maxSrbFuel`, spacecraft heights) live in `rocketLayout.js`.

## Docking (`/m1-s6`)

`M1S6.jsx`, `SplitPane` layout; local state like the flight panel (`useDocking` steps `stepDocking` per frame, warp up to 10x via `MissionClock`). Once docked, the goal card shows Continue to `/m1-s7`.

- **Model** (`src/utils/dockingSim.js`, no React): frame with the depot port at the origin, x right, y up, z toward the spacecraft (distance to close). Starts 100 m out, slightly off-axis and a few degrees out in roll/pitch/yaw. RCS **pulses** add a fixed velocity (in the spacecraft's own axes) or turn rate (`TRANSLATION_STEP`, `ROTATION_STEP`, coarse/fine) and spend RCS Δv from the spacecraft design (`rcsDeltaV`). Contact at z = 0 docks if offset ≤ 0.1 m, speed < 0.2 m/s and every angle ≤ 1° (`DOCKING_TOLERANCE`); otherwise `result.reasons` says why. Drifting past `MAX_RANGE_M` also fails.
- **Left**: `FlightControls` (title "Docking controls") with `RcsControls` (translate/rotate pads; keys W/A/S/D/Q/E, arrows, Z/X; F toggles precision), a precision `ViewSwitch` and `PhaseGoal` (its `failed` state shows the reasons and Retry); `DockingStats` below.
- **Right**: `DockingView`, a perspective wireframe from the spacecraft's port camera (depot body, solar panels, port collar, target cross recessed in the collar for parallax), boresight reticle and HUD (X/Y/Z, attitude and rates, range and closing rate; green within tolerance), with an RCS `FuelGauges`.
