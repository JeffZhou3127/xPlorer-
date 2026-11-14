# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

xPlorer+ is an early-stage React app (Vite template with the default demo content stripped out). It has a home view (`/`), a mission objective view (`/scenario1`) and a rocket designer (`/m1-s1`). `src/index.css` is empty and the README is blank.

## Rocket designer (`/m1-s1`)

`src/views/scenario1/M1S1.jsx` owns all state and lays the page out with `ThreePane`:

- **Left, `RocketForm`**: one `StageCard` per stage. Each card has fuel amount, fuel type (kerolox, methalox or hydrolox), engine cycle (gas generator, staged combustion or full flow), a gas-generator exhaust choice (open or closed, shown only for gas generator), engine count and nozzle expansion ratio.
- **Centre, `RocketDiagram`**: a white-stroke SVG blueprint. It has an ogive nose cone, a fairing around an Orion-like service module, and stage tanks whose height scales with fuel.
- **Right, `RocketStats`**: total Δv against `ORBIT_DELTA_V`, liftoff mass and payload. Each stage has an altitude slider (0–110 km) and shows Δv, Isp at that altitude, thrust-to-weight ratio and wet/dry mass.

Stage conventions:

- **Order**: `stages[0]` is the bottom stage (Stage 1). The panels list stages top-first using `toReversed()`.
- **Shape**: `{ id, fuel, propellant, cycle, gasGenerator, expansionRatio, engines, altitude }`.
- **Limits**: at most 3 stages.
- **Adding stages**: a new stage goes **underneath** the stack as the new booster.
- **Fuel ranges**: they depend on a stage's position counted from the top (`FUEL_RANGES`, via `rangesFor(count)`), so a lone stage gets the upper-stage range. Removing a stage re-clamps fuel.
- **Defaults**: they also depend on position from the top. The top stage gets a vacuum nozzle (ε 80) and 1 engine; lower stages get ε 16 and 2 or 7 engines. Stages above the booster default to 50 km per position.

`src/utils/rocketPhysics.js` holds the simplified performance model (no React). All tunable constants are at the top of the file.

- **Units**: masses in tonnes, pressures in pascals, altitudes in kilometres.
- **Isp**: comes from propellant c\*, chamber pressure (set by the engine cycle), turbopump efficiency (set by the cycle or gas-generator variant) and isentropic nozzle relations. It uses an exponential atmosphere and Summerfield flow separation.
- **Thrust**: every engine has a fixed throat area, so thrust = `engines × Pc × At × CF × efficiency`.
- **Thrust-to-weight**: measured at stage ignition.
- **Δv**: from the rocket equation, with mass accumulated from the top down on top of a 12 t payload.
- **Dry mass**: tank mass scaled by propellant density, plus 1 t per engine, plus 1 t per stage.
- **Accuracy**: Isp lands within a few percent of real engines (Merlin, Raptor, RL10).
- **Not modelled**: fuel type doesn't yet change tank height in the diagram.

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
- **Routing**: `react-router` v8 in declarative mode. Import from `react-router`, not the older `react-router-dom` package. `<BrowserRouter>` wraps the app in `src/index.jsx`. `src/App.jsx` holds only the `<Routes>` table (no shared nav). Each route's page component lives in `src/views/` (e.g. `src/views/Home.jsx` → `/`). Views for a scenario are grouped in a subfolder: `src/views/scenario1/Scenario1.jsx` → `/scenario1` (mission objective), `src/views/scenario1/M1S1.jsx` → `/m1-s1` (mission 1, step 1, reached via the objective's "Start Mission" button). The scenario `<Link>`s live in `Home.jsx`, so they appear only on the homepage. To add a view, create the component in `src/views/`, add a `<Route>` in `App.jsx`, and add a `<Link>` to it in `Home.jsx`.
- **Views vs. components**: files in `src/views/` are top-level page components (like `App.jsx`). They mostly import and assemble reusable components rather than holding UI details. Reusable components live in `src/components/`, one PascalCase folder per component, holding the component file and its CSS file side by side (e.g. `src/components/MissionObjective/MissionObjective.jsx` + `MissionObjective.css`). The component imports its own stylesheet. Plain non-UI logic (e.g. physics) lives in `src/utils/`.
- **Entry flow**: `index.html` loads `/src/index.jsx`, which mounts `<App />` into `#root` inside `StrictMode` and `BrowserRouter` and imports the global `index.css`. Put new top-level providers there.
- **Static assets**: files in `public/` are served from the site root. `src/assets/` holds images that are imported through Vite.
- **Code style**: the existing source uses arrow-function components, double quotes and semicolons.
