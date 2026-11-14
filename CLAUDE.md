# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

xPlorer+ is a freshly scaffolded React app (Vite template with the default demo content stripped out). `src/App.jsx` currently renders `null`, `src/index.css` is empty, and the README is blank, so there is no application logic yet. `react-router` is installed but not yet wired up.

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
- **Routing**: `react-router` v8. Import from `react-router`, not the older `react-router-dom` package.
- **Entry flow**: `index.html` loads `/src/index.jsx`, which mounts `<App />` into `#root` inside `StrictMode` and imports the global `index.css`. Put new top-level providers and the router here or in `App.jsx`.
- **Static assets**: files in `public/` are served from the site root. `src/assets/` holds images that are imported through Vite.
- **Code style**: the existing source uses arrow-function components, double quotes and no semicolons.
