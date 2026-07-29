# Architecture

## Overview

Home Dashboard is a static PWA built with Vite. The UI is composed of **widgets** that mount into a shared grid, backed by a small **API layer** for network calls and a **profile** system that controls which widgets appear for `owner` and `housesitter` users.

## Widget self-registration

Widgets live under `src/widgets/<Name>/`. Each widget folder contains:

- `<Name>Widget.js` — widget definition (`id`, `profiles`, `mount()`)
- `index.js` — calls `registerWidget()` as a side effect

The application imports a single barrel entry:

```js
import '../widgets/index.js';
```

`src/widgets/index.js` uses Vite’s `import.meta.glob('./*/index.js', { eager: true })` so every widget folder self-registers. **Adding or removing a widget never requires editing `app.js`** — create or delete a folder under `src/widgets/` with an `index.js` that registers the widget.

At runtime, `app.js` loads widgets for the active profile via `getWidgetsForProfile(getActiveProfileId())` and mounts them with `WidgetGrid`.

### Widget contract

See `src/types/widget.js` and `defineWidget()` in `src/components/Widget/defineWidget.js`. A widget returns a `DocumentFragment` or `HTMLElement` from `mount(context)`.

Full-width widgets (e.g. House Guide) use the `.widget-panel` class so they span all columns in the dashboard grid.

## API layer

Components and widgets do not call `fetch()` directly. HTTP access goes through `src/api/client.js` and domain modules (`virtualButtons.js`, `weather.js`).

## Profiles

`src/services/profileService.js` tracks the active profile (default: **owner**). Widgets declare which profiles may see them. Profile switching UI is not implemented yet.

## Markdown content system (House Guide)

House Guide content is **not** embedded in React/Vanilla components. Editable copy lives in:

```text
src/content/houseguide/
  pages.js          # page metadata (slug, titles, icons, accents)
  *.md              # one Markdown file per guide page
  index.js          # loads Markdown via import.meta.glob
```

The widget loads the catalog with `loadHouseGuideCatalog()`, renders articles with `marked`, and keeps presentation in CSS (`.guide-markdown`).

### Adding a guide page

1. Add a Markdown file, e.g. `src/content/houseguide/garden.md`.
2. Add an entry to `HOUSE_GUIDE_PAGES` in `src/content/houseguide/pages.js` (slug must match the filename without `.md`).
3. Reload the app — no widget code changes required unless you need new behaviour.

Use real information from your TrustedHousesitters (or owner) guide. If content is not ready, use a short placeholder: **“Content coming soon.”** Do not invent appliance or safety instructions.

## House Guide architecture

- **Tiles view** — category grid with search; large touch targets reuse dashboard button styling.
- **Article view** — back control, page title, rendered Markdown.
- **Search** — client-side filter over page titles and Markdown bodies (`src/widgets/HouseGuide/search.js`); matching tiles are highlighted instantly with no server.

## Future: searchable documentation

The current search is in-widget instant filtering. The same catalog (`pages.js` + Markdown glob) can later power:

- Deep links (`#house-guide/kitchen`)
- Full-text indexing (build-time or service worker cache)
- Profile-specific page lists (hide owner-only sections from housesitter)

The content layer is intentionally separate so guides can grow without restructuring the widget shell.
