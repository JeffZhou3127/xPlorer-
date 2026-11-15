# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

xPlorer+ is an early-stage React app (Vite template with the default demo content stripped out). It has a home view (`/`), a mission objective view (`/scenario1`), a spacecraft designer (`/m1-s1`), a rocket designer (`/m1-s2`) a launch confirmation (`/m1-s3`) and a flight panel (`/m1-s4`). `src/index.css` is empty and the README is blank.

## Spacecraft designer (`/m1-s1`)

`src/views/scenario1/M1S1.jsx` reads and writes the spacecraft `design` in the Redux store (`{ solarPanels, batteries, radiators, rcsFuel }`; each system is always fitted and holds a size key `small`/`medium`/`large` (all start `small`), RCS fuel is in kg) and lays the page out with `ThreePane`. It shows only the command pod and the service module (the payload), not the rocket.

- **Left, `SpacecraftForm`**: an RCS card (fuel slider), then a `SystemCard` (size select only) for each of solar panels, batteries and radiators. There are no add/remove buttons: the player's job is to pick the best size, trading capacity against mass (and cost).
- **Centre, `SpacecraftDiagram`**: same blueprint style (reuses the `.rd-*` classes from `RocketDiagram.css`). It shows a docking tunnel, a conical pod with a heat shield, the service module, RCS thruster quads, solar wings and radiator panels whose length scales with their rating, and hidden (dashed) RCS tanks and a battery stack that grow with fuel and capacity.
- **Right, `SpacecraftStats`**: mass, Earth solar power and RCS Δv; requirement meters (red until met) for power at Mars, battery backup, heat rejection and RCS Δv; cost against budget; a per-part mass/cost list. Like the rocket screen, Continue depends **only on the budget** (`BUDGET` in `M1S1.jsx`, $32M placeholder) and goes to `/m1-s2`; Back goes to `/scenario1`.
- **Model**: `src/utils/spacecraftPhysics.js` (`computeSpacecraftStats`), all placeholder numbers at the top. Solar output at Mars is ×1/1.524²; battery target is power demand × `BATTERY_BACKUP_HOURS`; heat load is power demand plus crew heat; RCS Δv uses the rocket equation with hydrazine Isp 220 s. Its `totalMass` (via `selectSpacecraftMass`) is the rocket designer's payload, so heavier systems cost rocket Δv.

Shared stats pieces: `Meter` (red with `alert`), `Stat` and `Info` are exported from `RocketStats.jsx`; `format`/`money` live in `src/utils/format.js`; `overBudgetReason(cost, budget)` in `format.js` gives the Continue tooltip text; `RangeField`/`SelectField` are exported from `StageCard.jsx`.

**Step navigation (`StepNav`, `src/components/StepNav/`)**: every `m#-s#` view renders one `StepNav` next to its layout (not inside a pane). It is `position: fixed` above the page (z-index 100, below the `InfoTip` bubbles at 1000), with the neutral "← Back" in the bottom-left and the accented "Continue →" in the bottom-right, each inset 205px from the screen edge (`--sn-inset`, 1rem under 700px wide) to stay clear of the deployed site's branding badge in the corner. Each button shows only when its handler (`onBack` / `onContinue`) is passed; a `blockedReason` makes Continue `aria-disabled` with a hover/focus tooltip. `ThreePane` side panes have 6rem bottom padding so their content can scroll clear of it. `M1S3` has no `StepNav`: its Back and Continue buttons are inside the `LaunchAlert` box; `M1S4` has no `StepNav`, since the designs are final after launch.

## Rocket designer (`/m1-s2`)

`src/views/scenario1/M1S2.jsx` reads the rocket design (`stages`, `srbs`) and the spacecraft mass from the Redux store and lays the page out with `ThreePane`:

- **Left, `RocketForm`**: one `StageCard` per stage. Fields in order: fuel type (kerolox, methalox or hydrolox), fuel amount, engine cycle (gas generator, staged combustion or full flow), gas-generator exhaust (open or closed, shown only for gas generator), nozzle expansion ratio (5–100) and engine count.
- **Centre, `RocketDiagram`**: a white-stroke SVG blueprint that updates live. It has an ogive nose cone, a fairing around an Orion-like service module, bell-shaped nozzles, and stage tanks whose height reflects propellant volume (fuel mass ÷ propellant density), so hydrolox stages are much taller.
- **Right, `RocketStats`**:
  - Totals: total Δv, liftoff mass, liftoff thrust-to-weight and payload (the spacecraft mass from step 1).
  - Meters:
    - Low Earth orbit (`ORBIT_DELTA_V`), followed by an italic note that it is a minimum estimate and a note that the spacecraft refuels at an orbital station before going to Mars, so reaching orbit is the only Δv goal (there is no Mars Δv meter).
    - Cost against budget, which turns red when over.
  - Each stage has an altitude slider (0–110 km) and shows Δv, Isp at that altitude, full-throttle burn time, wet/dry mass and cost.
- **Back / Continue**: the shared `StepNav`. Continue depends **only on the budget** (`BUDGET` in `M1S2.jsx`, $60M placeholder; the Δv meters are guidance only) and goes to `/m1-s3`; Back goes to `/m1-s1`.
- **"?" tooltips**: `InfoTip` (`src/components/InfoTip/`) is a small help button whose bubble is portalled to `document.body`, because the side panes scroll and would clip it. The explanatory text lives in `src/utils/glossary.js` (`GLOSSARY[key] = { term, text }`) and is referenced by key.

- **SRBs**: an optional pair of solid rocket boosters, held as `srbs` in the rocket slice (`null` or `{ fuel }`, the combined propellant). The "+ Add SRBs" button shows only with at least `MIN_STAGES_FOR_SRBS` (2) stages, and removing a stage below that clears them. `SrbCard` has only a fuel input. The diagram draws one booster on each side of Stage 1, with height following propellant volume (`SRB_DENSITY`). The boosters may be no taller than the stages below the top stage, so the fuel maximum is `maxSrbFuel(stages)` from `components/RocketDiagram/rocketLayout.js` (diagram geometry shared with `RocketDiagram`); `M1S2` caps the stored fuel to it at render time. In the physics they are a separate first phase that lifts the whole fuelled stack and is then dropped (fixed average Isp, burn time and casing fraction), adding to Δv, liftoff mass and cost. `RocketStats` shows an SRBs section.
- **Stats**: the only thrust-to-weight is the liftoff one in the totals (Stage 1 sea-level thrust plus SRB thrust over the whole rocket's weight). Each stage shows a full-throttle burn time (`stageBurnTime`).

Stage conventions:

- **Order**: `stages[0]` is the bottom stage (Stage 1). The panels list stages top-first using `toReversed()`.
- **Shape**: `{ id, fuel, propellant, cycle, gasGenerator, expansionRatio, engines, altitude }`.
- **Limits**: at most 3 stages. Engine count limits depend on position from the bottom (`ENGINE_RANGES`): 1–9 for the booster, 1–5 for the second stage, 1–3 for the third.
- **Adding stages**: a new stage goes **underneath** the stack as the new booster.
- **Fuel ranges**: they depend on a stage's position counted from the top (`FUEL_RANGES`, via `rangesFor(count)`), so a lone stage gets the upper-stage range. Removing a stage re-clamps fuel.
- **Defaults**: they also depend on position from the top. The top stage gets a vacuum nozzle (ε 80) and 1 engine; lower stages get ε 16 and 2 or 7 engines. Stages above the booster default to 50 km per position.

`src/utils/rocketPhysics.js` holds the simplified performance model (no React). All tunable constants are at the top of the file.

- **Units**: masses in tonnes, pressures in pascals, altitudes in kilometres.
- **Isp**: comes from propellant c\*, chamber pressure (set by the engine cycle), turbopump efficiency (set by the cycle or gas-generator variant) and isentropic nozzle relations. It uses an exponential atmosphere and Summerfield flow separation.
- **Thrust**: every engine has a fixed throat area, so thrust = `engines × Pc × At × CF × efficiency`.
- **Thrust-to-weight**: measured at stage ignition.
- **Δv**: from the rocket equation, with mass accumulated from the top down on top of the payload mass passed to `computeRocketStats(stages, srbs, payloadMass)`.
- **Dry mass**: tank mass scaled by propellant density, plus 1 t per engine, plus 1 t per stage.
- **Orbit targets**: `ORBIT_DELTA_V` is the circular orbital velocity √(GM/r) at `ORBIT_ALTITUDE_KM` (300 km), about 7,730 m/s. It leaves out gravity and drag losses. The trip on to Mars is fuelled by an orbital refueling station, so the rocket isn't measured against it.
- **Cost** (`stageCost`, in $M; every figure is a placeholder):
  - Engines: each costs a per-cycle price (`ENGINE_CYCLES[].engineCost`), multiplied by the gas-generator `costFactor` (closed is pricier) and by 1% extra per unit of expansion ratio.
  - Tanks: cost per m³ of propellant, scaled by the propellant's `tankCostFactor` (hydrolox is highest).
  - Propellant: priced per tonne.
  - Fixed hardware: $2M per stage.
  - `computeRocketStats` returns `totalCost` and a `cost` for each stage.
- **Accuracy**: Isp lands within a few percent of real engines (Merlin, Raptor, RL10).

## Flight panel (`/m1-s4`)

`src/views/scenario1/M1S4.jsx` lays the page out with `SplitPane` (two equal columns; stacks under 800px; bottom padding clears the clock). There is no `StepNav`.

- **Countdown**: the flight starts at T−10 (`COUNTDOWN`). The controls work immediately, but nothing turns, burns or lights until T−0. `MissionClock` is fixed at the bottom centre of the screen (T−MM:SS, then T+MM:SS), with a time-warp stepper under the time (◀ #x ▶, in whole steps from 0 — shown as "Paused" — to `MAX_TIME_WARP` = 5×; each arrow greys out at its limit). `useFlight` steps the simulation by the warp × the frame time, so the countdown, turning, fuel burn and staging animation all speed up together. At 0 it skips the step entirely, so the flight and its views freeze. The controls can still be changed while paused, and take effect on resume.
- **Left, `FlightControls`** (heading, countdown status, cards side by side):
  - `ThrottleControl`: vertical 0–100% slider (default 100%) with a "Shut down / Restart engines" button below it. While shut down the slider is hidden (replaced by "Engines shut down") and the effective throttle is 0; restarting brings back the previous setting. During the countdown (`canShutDown={launched}`) the shut-down button is disabled; only the throttle and pitch rate can be set. Both act only on the active stage's liquid engines; SRBs always burn at full thrust.
  - `PitchControl`: a pitch-**rate** slider from −`MAX_PITCH_RATE` to +`MAX_PITCH_RATE` (5°/s; left is negative), centre = 0, with the fill drawn from the centre, plus a "Hold attitude" button. The slider is the rate of turn, not the angle.
  - `PhaseGoal` is stacked under `PitchControl` in a `.flight-controls__column`. It is a generic, presentational goal card: "Phase goal n of 2", the goal, a progress bar toward a `target` window (`{ min, max }`, shaded on the bar; the fill turns red past it) and a note. It turns amber → green when `reached`, and can show an `action` button. M1S4's `goalCard()` builds its props for each phase.
- **Mission phases** (`missionPhase()` in `M1S4.jsx`; nothing ever shuts the engines down automatically):
  1. **ascent**: goal "Raise the apogee to 290–310 km" (`TARGET_APOGEE_KM` = `ORBIT_WINDOW_KM`, `ORBIT_ALTITUDE_KM` ± 10 km, in `rocketPhysics.js`). Checked live during render with `inRange`: the card is green and shows **Next goal** only while the apogee is inside the window, so overshooting turns it back to amber (the note then says to burn retrograde).
  2. **coast**: Next goal sets `coastStarted`, shuts the engines down and resets the user's warp to 1x. While `flight.coastEndTime` is null:
     - `useFlight` runs at `coastWarp`, set when Next goal is pressed by `coastWarpFor()`: the time to the coast's end (`timeToApogee` − `COAST_LEAD`) ÷ `COAST_SECONDS` (10), rounded, at least 1x, so the coast takes about 10 real seconds;
     - `MissionClock` is `locked`;
     - `ThrottleControl` is `locked` (restart disabled).

     The sim sets `coastEndTime` once `timeToApogee(flight)` ≤ `COAST_LEAD` (60 s).
  3. **circularize**: back at 1x with the engines restartable. The goal is "Circularise the orbit at 300 km", met when the sim sets `flight.orbitGoalTime`: no thrust at all with the perigee inside `TARGET_PERIGEE_KM` (also `ORBIT_WINDOW_KM`, 290–310 km). This one stays met once set.

  The sim records the coast end and orbit times (`stepFlight` controls `targetPerigee` as `{ min, max }` in m, `coastLead`, `coastStarted`), so the phase is derived during render and the coast ends precisely at any warp. `timeToApogee` uses Kepler's equation (vacuum): 0 at or past apogee, null on escape.
- **Mission failure**: the sim sets `flight.failure` (`failureRecord`: `{ kind, goal (2 from Next goal on), time, altitude, apogee, perigee, speed?, twr?, throttle? }`), and `stepFlight` stops advancing after that. It fails when:
  - **twr**: at T−0 the thrust-to-weight ratio (`launchTwr`: first stage at the set throttle plus SRBs, against the full weight) is below 1;
  - **crash**: the rocket touches the ground at any speed after `liftedOff` (it has left the ground at all);
  - **fuel**: the last stage is empty, no SRBs are left, the orbit goal isn't met and the perigee is outside the window, so neither goal can still be reached. A rocket too heavy to lift off fails this way once its fuel is gone.

  M1S4 then navigates to `/mission-failure` with `{ failure, targets }` as router state. The `MissionFailure` view uses:
  - `explainFailure` / `failureSummary` (`src/utils/missionFailure.js`) for the wording: reason, detail, a tip and summary rows, depending on kind and goal;
  - the `FailureReport` panel: "Mission Failed!" header, red version of the `LaunchAlert` layout, with **Retry launch** (`/m1-s4`) and **Redesign rocket** (`/m1-s2`).

  Visiting the URL without state shows a generic message. `formatMissionTime` (`utils/format.js`) is shared with `MissionClock`.
- **`FlightStats`** sits in the left pane under the controls, separated by a top border. It is compact, in two groups, each a grid of equal columns (`auto-fill`, min 8.5rem, so four across on a typical screen):
  - **Trajectory:** altitude (highlighted), velocity, horizontal, vertical, apogee, perigee, drag.
  - **Vehicle:** pitch, pitch rate, throttle ("Off" while shut down), active stage.

  It reuses `Stat`, with glossary tooltips for the trajectory terms, and fits on screen down to about 1366×768.
- **Right pane** starts with a `ViewSwitch` (Attitude / Trajectory 3D) choosing between `FlightView` and `TrajectoryView`. Whichever is shown fills the rest of the pane (`flex: 1`, min 20rem), with `FuelGauges` beside it: vertical bars for the active stage and, while attached, the SRBs, red under 15%.
- **`TrajectoryView`** (3D, modelled on NASA's mission-viz X3DOM demos): the `x3dom` package is a classic script defining a global, so `x3domLoader.js` injects it with a `<script>` tag (Vite `?url` import, its own lazy chunk) the first time the tab opens, then calls `x3dom.reload()`. On unmount, `shutdownX3dom` removes the canvas.
  - The scene is built once as markup (`trajectoryScene.js`: `sceneMarkup`, `lineSet`, `cameraAt`), then updated each render with `setAttribute`, which X3DOM watches. React never renders the X3D tags.
  - Scene units are 1,000 km. The flight plane is the equator (x–y), with the pad at (0, R, 0).
  - It shows a dark Earth with a 15° graticule, the Kármán line, the target orbit as a dashed half-transparent ghost ring at `ORBIT_ALTITUDE_KM` (hidden via `showTarget={flight.orbitGoalTime === null}` once goal 2 is reached; legend entry too), the flown path (`flight.track`) and the predicted coast path (`predictedPath`, redrawn every 150 ms) with its high point. Markers are scaled by camera distance (`MARKER_SIZES`) so they stay the same size on screen.
  - Camera buttons: Launch site, Rocket (a snapshot beside the rocket, not following it) and Whole Earth. Drag orbits and scroll zooms (Examine mode).
- **`FlightView`** draws the remaining rocket (via `RocketBody`) rotated by the pitch angle about the midpoint of the rocket plus plume room. It sits inside a fixed attitude ring:
  - labelled ticks every 15°, with the 45° ones emphasised;
  - minor ticks at 7.5°;
  - upright labels;
  - a nose marker that turns with the rocket.
- **Exhaust**: `RocketBody` takes `throttle` (0–1, bottom stage) and `srbsFiring`. Each nozzle gets a plume (`Flame`) whose length and width scale with throttle (`flameLength`; SRBs fixed `SRB_FLAME_LENGTH`; `FLAME_ROOM` is the longest), coloured by propellant, flickering through two nested CSS scale animations (off under `prefers-reduced-motion`; frozen while paused via `FlightView paused` → `.flight-view--paused`, set when the warp is 0 outside the coast).
- **Simulation**: `src/utils/flightSim.js` (`initialFlight`, `stepFlight`, no React) holds time, pitch, active `stageIndex`, fuel fractions per stage and `srbFuel` (`null` once dropped). The active stage drains at `throttle / stageBurnTime(stage)` per second; SRBs at `1 / SRB_BURN_TIME` and drop when empty. When the active stage runs dry it separates (taking any SRBs) and the next stage takes over; the top stage stays on when empty. Each separation is recorded as `flight.separation` (`{ time, stageIndex, stage, srbs }`).
- **Trajectory physics** (also `flightSim.js`): 2D flight around a round, non-rotating Earth, with the origin at Earth's centre and the pad at `(0, EARTH_RADIUS)`. The state carries `x, y, vx, vy` (m, m/s) and the current `drag` (N). `stepFlight` splits each frame into `SUBSTEP` (0.02 s) semi-implicit Euler steps. Forces:
  - thrust along the rocket's axis, with pitch measured from the *local* vertical: `stageThrust` at the current altitude × throttle, plus `srbThrust`;
  - inverse-square gravity;
  - drag ½ρv²·Cd·A: density follows `ambientPressure`, Cd rises through the transonic range, and A comes from fixed stage and SRB diameters.

  Mass is the payload (`selectSpacecraftMass`) plus the remaining stages and boosters with their fuel left. Touching the ground zeroes the velocity, so the rocket sits on the pad until thrust beats weight. `flightReadouts` derives altitude, speed, horizontal/vertical speed and the Kepler apogee/perigee (vacuum, engines off); apogee is `null` on escape, and perigee is `null` while the path hits the ground.
- **Staging animation**: for `STAGING_DURATION` (3 flight-seconds) after a separation, `FlightView` draws the spent part as `Debris` in the pre-separation frame: a stage (`RocketBody parts="bottom"`, with any SRBs) falls back along the rocket's axis and tumbles; SRBs alone (`parts="srbs"` + `srbDrift`) peel off outward. Both fade out. The remaining rocket is shifted so its nose stays put, and the view (pivot and ring) eases from the old rocket's fit to the new one's, so nothing jumps when the animation ends.
- **Track and prediction**: `stepFlight` appends `{ x, y }` to `flight.track` once per flight second from T−0. `predictedPath(flight)` follows the vacuum Kepler conic forward until it hits the ground, completes one orbit, or passes 10 Earth radii. A vertical flight gives a straight line along the radius.
- **Loop**: the `useFlight` hook in `M1S4.jsx` steps it every `requestAnimationFrame` (frame step capped at 0.1 s), reading controls through a ref. Flight state is local, not in Redux.

**Rocket drawing**: `components/RocketDiagram/RocketBody.jsx` draws just the rocket (stages, spacecraft, SRBs) around `CENTER_X` with the nozzles on `GROUND_Y`; `RocketDiagram` adds the grid, centreline and ground line around it. `rocketTop(stages, srbs)` and the spacecraft heights live in `rocketLayout.js`.

## Commands

- `npm install`: install dependencies
- `npm run dev`: start the Vite dev server with HMR
- `npm run build`: production build to `dist/`
- `npm run preview`: serve the production build locally
- `npm run lint`: lint with oxlint (config in `.oxlintrc.json`)

No test framework is set up yet.

## Stack and structure

- **Vite 8 + React 19**, plain JavaScript/JSX (ES modules, no TypeScript; `@types/react` is present only for editor support).
- **Linting** uses oxlint rather than ESLint. `.oxlintrc.json` turns on the `react` and `oxc` plugins, treats `react/rules-of-hooks` as an error and `react/only-export-components` as a warning (keep component files exporting only components so Fast Refresh works).
- **Routing**: `react-router` v8 in declarative mode. Import from `react-router`, not the older `react-router-dom` package. `<BrowserRouter>` wraps the app in `src/index.jsx`. `src/App.jsx` holds only the `<Routes>` table (no shared nav). Each route's page component lives in `src/views/` (e.g. `src/views/Home.jsx` → `/`). Views for a scenario are grouped in a subfolder: `src/views/scenario1/Scenario1.jsx` → `/scenario1` (mission objective), `src/views/scenario1/M1S1.jsx` → `/m1-s1` (mission 1, step 1: spacecraft designer, reached via the objective's "Start Mission" button), `M1S2.jsx` → `/m1-s2` (step 2: rocket designer), `M1S3.jsx` → `/m1-s3` (step 3: a centred `LaunchAlert`, "Ready to Launch?", warning that the designs cannot be changed after continuing), `M1S4.jsx` → `/m1-s4` (step 4: flight panel), `MissionFailure.jsx` → `/mission-failure` (reached only from the flight panel; see below). Each step's Continue button leads to the next. The scenario `<Link>`s live in `Home.jsx`, so they appear only on the homepage. To add a view, create the component in `src/views/`, add a `<Route>` in `App.jsx`, and add a `<Link>` to it in `Home.jsx`.
- **Views vs. components**: files in `src/views/` are top-level page components (like `App.jsx`). They mostly import and assemble reusable components rather than holding UI details. Reusable components live in `src/components/`, one PascalCase folder per component, holding the component file and its CSS file side by side (e.g. `src/components/MissionObjective/MissionObjective.jsx` + `MissionObjective.css`). The component imports its own stylesheet. Plain non-UI logic (e.g. physics) lives in `src/utils/`.
- **Entry flow**: `index.html` loads `/src/index.jsx`, which mounts `<App />` into `#root` inside `StrictMode`, the Redux `Provider` and `BrowserRouter` and imports the global `index.css`. Put new top-level providers there.
- **Static assets**: files in `public/` are served from the site root. `src/assets/` holds images that are imported through Vite.
- **Code style**: the existing source uses arrow-function components, double quotes and semicolons.
- **State**: Redux Toolkit + `react-redux`. `src/store/store.js` combines `spacecraftSlice.js` (the spacecraft design; `updateDesign(patch)`) and `rocketSlice.js` (`{ stages, srbs, nextStageId }` with `addStage`, `removeStage`, `updateStage({ id, patch })`, `addSrbs`, `removeSrbs`, `updateSrbs`). The rocket's design rules (`FUEL_RANGES`, `ENGINE_RANGES`, `rangesFor`, stage defaults, SRB limits) live in `rocketSlice.js`. The store sits above the router, so designs survive moving between steps (but not a page reload). Views read state with `useSelector` and dispatch actions; components stay presentational and receive props.
