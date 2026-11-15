# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

xPlorer+ is an early-stage React app (Vite template with the default demo content stripped out). It has a home view (`/`), a mission objective view (`/scenario1`), a spacecraft designer (`/m1-s1`), a rocket designer (`/m1-s2`) and a placeholder step 3 (`/m1-s3`). `src/index.css` is empty and the README is blank.

## Spacecraft designer (`/m1-s1`)

`src/views/scenario1/M1S1.jsx` reads and writes the spacecraft `design` in the Redux store (`{ solarPanels, batteries, radiators, rcsFuel }`; each system is always fitted and holds a size key `small`/`medium`/`large` (all start `small`), RCS fuel is in kg) and lays the page out with `ThreePane`. It shows only the command pod and the service module (the payload), not the rocket.

- **Left, `SpacecraftForm`**: an RCS card (fuel slider), then a `SystemCard` (size select only) for each of solar panels, batteries and radiators. There are no add/remove buttons: the player's job is to pick the best size, trading capacity against mass (and cost).
- **Centre, `SpacecraftDiagram`**: same blueprint style (reuses the `.rd-*` classes from `RocketDiagram.css`). It shows a docking tunnel, a conical pod with a heat shield, the service module, RCS thruster quads, solar wings and radiator panels whose length scales with their rating, and hidden (dashed) RCS tanks and a battery stack that grow with fuel and capacity.
- **Right, `SpacecraftStats`**: mass, Earth solar power and RCS Δv; requirement meters (red until met) for power at Mars, battery backup, heat rejection and RCS Δv; cost against budget; a per-part mass/cost list. Like the rocket screen, Continue depends **only on the budget** (`BUDGET` in `M1S1.jsx`, $32M placeholder) and goes to `/m1-s2`; Back goes to `/scenario1`.
- **Model**: `src/utils/spacecraftPhysics.js` (`computeSpacecraftStats`), all placeholder numbers at the top. Solar output at Mars is ×1/1.524²; battery target is power demand × `BATTERY_BACKUP_HOURS`; heat load is power demand plus crew heat; RCS Δv uses the rocket equation with hydrazine Isp 220 s. Its `totalMass` (via `selectSpacecraftMass`) is the rocket designer's payload, so heavier systems cost rocket Δv.

Shared stats pieces: `Meter` (red with `alert`), `Stat` and `Info` are exported from `RocketStats.jsx`; `format`/`money` live in `src/utils/format.js`; `overBudgetReason(cost, budget)` in `format.js` gives the Continue tooltip text; `RangeField`/`SelectField` are exported from `StageCard.jsx`.

**Step navigation (`StepNav`, `src/components/StepNav/`)**: every `m#-s#` view renders one `StepNav` next to its layout (not inside a pane). It is `position: fixed` above the page (z-index 100, below the `InfoTip` bubbles at 1000), with the neutral "← Back" in the bottom-left and the accented "Continue →" in the bottom-right, each inset 205px from the screen edge (`--sn-inset`, 1rem under 700px wide) to stay clear of the deployed site's branding badge in the corner. Each button shows only when its handler (`onBack` / `onContinue`) is passed; a `blockedReason` makes Continue `aria-disabled` with a hover/focus tooltip. `ThreePane` side panes have 6rem bottom padding so their content can scroll clear of it. `M1S3` (placeholder) shows only Back.

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
- **Routing**: `react-router` v8 in declarative mode. Import from `react-router`, not the older `react-router-dom` package. `<BrowserRouter>` wraps the app in `src/index.jsx`. `src/App.jsx` holds only the `<Routes>` table (no shared nav). Each route's page component lives in `src/views/` (e.g. `src/views/Home.jsx` → `/`). Views for a scenario are grouped in a subfolder: `src/views/scenario1/Scenario1.jsx` → `/scenario1` (mission objective), `src/views/scenario1/M1S1.jsx` → `/m1-s1` (mission 1, step 1: spacecraft designer, reached via the objective's "Start Mission" button), `M1S2.jsx` → `/m1-s2` (step 2: rocket designer), `M1S3.jsx` → `/m1-s3` (step 3, placeholder). Each step's Continue button leads to the next. The scenario `<Link>`s live in `Home.jsx`, so they appear only on the homepage. To add a view, create the component in `src/views/`, add a `<Route>` in `App.jsx`, and add a `<Link>` to it in `Home.jsx`.
- **Views vs. components**: files in `src/views/` are top-level page components (like `App.jsx`). They mostly import and assemble reusable components rather than holding UI details. Reusable components live in `src/components/`, one PascalCase folder per component, holding the component file and its CSS file side by side (e.g. `src/components/MissionObjective/MissionObjective.jsx` + `MissionObjective.css`). The component imports its own stylesheet. Plain non-UI logic (e.g. physics) lives in `src/utils/`.
- **Entry flow**: `index.html` loads `/src/index.jsx`, which mounts `<App />` into `#root` inside `StrictMode`, the Redux `Provider` and `BrowserRouter` and imports the global `index.css`. Put new top-level providers there.
- **Static assets**: files in `public/` are served from the site root. `src/assets/` holds images that are imported through Vite.
- **Code style**: the existing source uses arrow-function components, double quotes and semicolons.
- **State**: Redux Toolkit + `react-redux`. `src/store/store.js` combines `spacecraftSlice.js` (the spacecraft design; `updateDesign(patch)`) and `rocketSlice.js` (`{ stages, srbs, nextStageId }` with `addStage`, `removeStage`, `updateStage({ id, patch })`, `addSrbs`, `removeSrbs`, `updateSrbs`). The rocket's design rules (`FUEL_RANGES`, `ENGINE_RANGES`, `rangesFor`, stage defaults, SRB limits) live in `rocketSlice.js`. The store sits above the router, so designs survive moving between steps (but not a page reload). Views read state with `useSelector` and dispatch actions; components stay presentational and receive props.
