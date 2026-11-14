# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

xPlorer+ is an early-stage React app (Vite template with the default demo content stripped out). So far it has a home view (`/`) linking to one placeholder view (`/scenario1`). `src/index.css` is empty and the README is blank.

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
- **Routing**: `react-router` v8 in declarative mode. Import from `react-router`, not the older `react-router-dom` package. `<BrowserRouter>` wraps the app in `src/index.jsx`. `src/App.jsx` holds only the `<Routes>` table (no shared nav). Each route's page component lives in `src/views/` (e.g. `src/views/Home.jsx` → `/`, `src/views/Scenario1.jsx` → `/scenario1`). The scenario `<Link>`s live in `Home.jsx`, so they appear only on the homepage. To add a view, create the component in `src/views/`, add a `<Route>` in `App.jsx`, and add a `<Link>` to it in `Home.jsx`.
- **Views vs. components**: files in `src/views/` are top-level page components (like `App.jsx`). They mostly import and assemble reusable components rather than holding UI details. Reusable components live in `src/components/`, one PascalCase folder per component, holding the component file and its CSS file side by side (e.g. `src/components/MissionObjective/MissionObjective.jsx` + `MissionObjective.css`). The component imports its own stylesheet.
- **Entry flow**: `index.html` loads `/src/index.jsx`, which mounts `<App />` into `#root` inside `StrictMode` and `BrowserRouter` and imports the global `index.css`. Put new top-level providers there.
- **Static assets**: files in `public/` are served from the site root. `src/assets/` holds images that are imported through Vite.
- **Code style**: the existing source uses arrow-function components, double quotes and no semicolons.
