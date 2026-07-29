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
└── Settings App (configuration)
```

An **App** represents a user task (“Control the house”, “Read the guide”). A **Widget** is a reusable component with no knowledge of other apps. The product identity is **Home Hub** (Lovely Home Hub in chrome copy)—a coherent platform, not a single-purpose dashboard.

## Navigation philosophy

- **Always know where you are:** persistent chrome shows a **Home** button and the current destination title.
- **One tap home:** Home returns to the launcher without reload.
- **Focus by destination:** each app owns the full viewport; unrelated widgets are not stacked on one scrollable page.
- **Calm transitions:** the viewport fades/slides slightly when routes change (CSS only, no framework router).

## App Shell

Location: `src/shell/`

The shell owns:

- Persistent chrome (Home button, destination title, clock)
- Home-only welcome line (greeting + date) and status strip
- Viewport (`#app-viewport`) where the active app mounts
- Client-side routing (`src/shell/router.js`, hash routes `#/controls`, …)
- Profile change reactions (rebuild Home launcher immediately)

## Application metadata

Apps are declared with `defineApp()` (`src/components/App/defineApp.js`) and registered in `src/services/appRegistry.js`.

Each app exports metadata rather than hardcoding Home cards:

| Field | Purpose |
|-------|---------|
| `id`, `title`, `iconId` | Identity and Lucide icon (`src/components/icons/renderIcon.js`) |
| `description` | Accessibility / future search |
| `capabilities` | Tags for future search, voice, automation, AI (not all used yet) |
| `profiles` | Who can see the app on Home |
| `accent` | Card theming |
| `summary(context)` | Optional live card data on Home |
| `mount(viewport, context)` | Full-screen app UI |

Example capabilities: Controls → `lighting`, `heating`, `scenes`; House Guide → `search`, `offline`, `markdown`.

## Application summaries

Optional `summary(shellContext)` returns `{ title, subtitle? }`. Home cards render this as **live information** (e.g. routine count, weather snapshot, “Coming Soon”). Summaries are async-capable; the launcher fills cards after mount.

Weather summaries read `src/services/homeWeatherSnapshot.js`, updated when the status strip weather service loads.

## Settings application

`src/apps/Settings/SettingsApp.js` is the first real configuration app:

- **Profile** — owner / house sitter; updates `profileService` and refreshes Home without reload
- **Theme** — dark (active), light/auto disabled for now (`themeService`)
- **About** — version (`__APP_VERSION__`), build time (`__BUILD_TIME__` from Vite), current profile

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
| Settings | Profile, theme (dark), about |
| Others | Focused placeholders with summaries where useful |

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
