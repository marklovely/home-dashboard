# Architecture

## Overview

Home Hub is a tablet-first PWA built with Vite. The UI is organised in three layers:

1. **App Shell** — layout, system status, routing, and navigation
2. **Applications** — user-facing destinations (Controls, House Guide, …)
3. **Widgets** — reusable UI blocks used *inside* applications

```
App Shell
│
├── Home (launcher)
├── Controls App
│     └── Alexa Widget
├── House Guide App
│     └── House Guide Widget
├── Scooter App (placeholder)
├── Weather App (placeholder)
├── Bins App (placeholder)
├── Plex App (placeholder)
├── Calendar App (placeholder)
└── Settings App (placeholder)
```

An **App** represents a user task (“Control the house”, “Read the guide”). A **Widget** is a reusable component with no knowledge of other apps. This keeps the home screen from becoming a dumping ground for every feature.

## App Shell

Location: `src/shell/`

The shell owns:

- Header (greeting, clock, status strip on Home)
- Navigation (Home button + app title when inside an app)
- Viewport (`#app-viewport`) where the active app mounts
- Client-side routing (`src/shell/router.js`, hash routes `#/controls`, …)

`src/js/app.js` bootstraps the shell, status services (weather, battery, network), and loads app/widget registrations. **Apps do not import each other.**

## Applications

Location: `src/apps/<Name>/`

Each app folder contains:

- `<Name>App.js` — `mount(viewport, shellContext)` and app metadata
- `index.js` — `registerApp()` side effect

`src/apps/index.js` loads every app via `import.meta.glob('./*/index.js', { eager: true })`.

| App | Role |
|-----|------|
| Home | Default launcher (`renderHomeScreen`); not registered in the app registry |
| Controls | Mounts the **Alexa** widget (Virtual Buttons) |
| House Guide | Mounts the **House Guide** widget (Markdown + search) |
| Others | “Coming Soon” placeholders |

Apps declare `profiles: ['owner', 'housesitter']` (or subsets). `getAppsForProfile()` drives the Home launcher cards.

## Widgets

Location: `src/widgets/<Name>/`

Widgets register through `src/widgets/index.js` (same glob pattern as apps). The **Controls** and **House Guide** apps call `getWidgetById()` and mount the widget into their viewport.

Widget contract: `src/types/widget.js`, `defineWidget()`.

Network access uses `src/api/` — widgets and apps do not call `fetch()` directly.

## Profiles

`src/services/profileService.js` — active profile defaults to **owner**. Home launcher and future app visibility are profile-filtered.

## House Guide content

Markdown lives in `src/content/houseguide/*.md` with metadata in `pages.js`. See previous House Guide docs for adding pages.

## Adding a new application

1. Create `src/apps/MyApp/MyAppApp.js` and `index.js` with `registerApp()`.
2. Add the app id to `APP_DISPLAY_ORDER` in `src/services/appRegistry.js`.
3. Optionally add a widget under `src/widgets/` if the app composes reusable UI.

No changes to `app.js` are required when using the glob barrel.

## Adding a new widget

1. Create `src/widgets/MyWidget/` with `index.js` that calls `registerWidget()`.
2. Mount it from the app that owns the user task.

## Routing

- Default route: **Home** (no hash)
- Apps: `#/<app-id>` (e.g. `#/house-guide`)
- `navigate()` updates history without a full page reload; the shell swaps the viewport content with a short CSS transition.
