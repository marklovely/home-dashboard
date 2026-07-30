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
├── Weather App (forecast via Worker)
├── Bins App (static council calendars)
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

Example capabilities: Controls → `lighting`, `heating`, `scenes`; House Guide → `search`, `offline`, `quick-actions`, `home-info`.

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
| House Guide | Mounts the **House Guide** widget (interactive home topics, search, quick actions) |
| Settings | Profile, theme (dark), about |
| Weather | Forecast and insights via Worker (`GET /api/weather`) |
| Bin Collection | Static Calendar 17 + Round G2 schedules, offline |
| My Day | Owner-only personal agenda via Worker ICS feed |
| Others | Focused placeholders with summaries where useful |

Apps declare `profiles: ['owner', 'housesitter']` (or subsets). `getAppsForProfile()` drives the Home launcher cards.

## Widgets

Location: `src/widgets/<Name>/`

Widgets register through `src/widgets/index.js` (same glob pattern as apps). The **Controls** and **House Guide** apps call `getWidgetById()` and mount the widget into their viewport.

Widget contract: `src/types/widget.js`, `defineWidget()`.

Network access uses `src/api/` — widgets and apps do not call `fetch()` directly.

## Profiles

`src/services/profileService.js` — active profile defaults to **owner**. Home launcher and future app visibility are profile-filtered.

## Deployment mode and user mode

Two independent concepts live under `src/auth/`:

| Concept | When set | Purpose |
|---------|----------|---------|
| **Deployment mode** | Build time (`VITE_DEPLOYMENT_MODE`) | What the build *allows* |
| **User mode** | Runtime (in-memory) | What the UI *shows* now |

### Deployment mode

`src/auth/deploymentMode.js` — `home` (default) or `house-sitter`.

- **`home`** — Full hub tablet. Defaults to **owner** user mode. Owner and house sitter user modes can be switched without rebuilding (Settings profile and hidden owner gesture).
- **`house-sitter`** — Dedicated guest deployment. Always **house sitter** user mode. Owner mode cannot be entered; hidden gesture does nothing.

### User mode

`src/auth/userMode.js` — `owner` or `house-sitter`. Drives `src/modes/modeConfig.js` (branding, launcher apps, bottom nav, simplified controls).

`getVisibleApps()` in `src/services/appVisibility.js` remains the single entry point for Home cards and allowed routes.

### Owner authentication (home deployment)

Hidden access for **house sitter → owner** (clears the sitter lock cookie):

- **My Day:** tap **Enter owner PIN** in the app, or
- **Long-press** the “Lovely Home” title block for **five seconds** (when the tablet is in house sitter mode).

```
Long press → PIN pad (`src/components/OwnerAccess/ownerPinDialog.js`)
        → ownerAuthProvider.authenticate(pin) (`src/auth/OwnerAuthProvider.js`)
        → POST `/api/auth/owner` on the Cloudflare Worker (clears sitter cookie)
        → owner user mode + owner profile
```

**Never use `VITE_OWNER_PIN`.** Vite env vars are compiled into the browser bundle. The owner PIN must exist only as the Worker secret **`OWNER_PIN`** (`npx wrangler secret put OWNER_PIN` in the Worker project).

| Response | Meaning |
|----------|---------|
| HTTP 200 `{ ok: true, authenticated: true, mode: "owner" }` | Sitter lock cleared; owner mode |
| HTTP 401 | Wrong PIN (generic message in UI) |
| HTTP 429 | Rate limited (Durable Object tracks failures per client IP) |
| HTTP 503 | Worker secret not configured |

**Rate limiting:** `OwnerAuthLimiter` SQLite-backed Durable Object (`OWNER_AUTH_LIMITER` binding) stores failed attempts per client key. More than five failures within ten minutes returns HTTP 429 until the window expires or a successful login clears the counter. The Worker migration uses `new_sqlite_classes` (required on the Workers free plan).

**Inactivity lock:** **`OWNER_INACTIVITY_TIMEOUT_MS`** (five minutes) in `src/auth/ownerInactivity.js` auto-locks via `lockToHouseSitterMode()` — same path as **Return to House Sitter Mode** in Settings. This issues a sitter cookie on the server.

**Cloudflare configuration**

| Surface | Variables |
|---------|-----------|
| **Pages** (frontend) | `VITE_DEPLOYMENT_MODE=home`, `VITE_API_BASE_URL=https://<worker-hostname>` |
| **Worker** (secrets) | `OWNER_PIN` — not Pages, not git, not wrangler `[vars]` |

House sitter **experience** (guest UI) is unchanged; owner **experience** is unchanged when user mode is owner.

The **Emergency** app (`src/apps/Emergency/`) surfaces call cards and deep-links into House Guide topics without duplicating catalog content.

## House Guide

The House Guide is an interactive companion for living in the home—not a document viewer. The UI never exposes storage format, page counts, or other implementation details.

### Layering

```
House Guide Widget (presentation)
        ↓
Guide Service (`src/services/guideService.js`)
        ↓
Content Provider (adapter)
        ↓
Structured JSON today · Markdown/PDF/API later
```

### Structured content model (v2)

```
House Guide
    ↓
Categories (Arrival, Kitchen, …)
    ↓
Topics (Hot Water Machine, Heating, …)
    ↓
Blocks (text, steps, tip, warning, heroImage, gallery, …)
    ↓
Actions (Alexa, panel, navigate)
    ↓
Media (images under src/content/houseguide/media/)
```

- **Guide Service** — facade: `listGuideCategories`, `getGuideCategory`, `getGuideTopic`, `searchGuideTopics`, `getGuideHomeSummary`.
- **Content Provider** — `jsonGuideProvider.js` reads `guide-catalog.json` (version 2). Legacy `.md` files are not rendered; use `npm run guide:extract` after adding `source/house-guide.pdf`.
- **Blocks** — composable content types in `src/types/guideContent.js`. Hero and gallery blocks resolve images via `guideMedia.js` when files exist in `media/`.

### Protected house-specific values

Public guide copy lives in `guide-catalog.json`. Values that must not ship in public source control use **`protected` blocks** with dot-path keys resolved from `private-content.local.json` (gitignored). Copy `private-content.example.json` to `private-content.local.json` on a trusted device.

When keys are missing, the UI shows safe placeholders (for example Wi-Fi details once secure house-sitter access is enabled) — never `undefined`, empty buttons, or broken QR codes.

Production: Cloudflare Access and the Worker `GET /api/private-config` path (see [cloudflare-access.md](./cloudflare-access.md)) serve protected values at runtime, not from the static Pages bundle.

### Content pipeline (PDF not served in-app)

`source/house-guide.pdf` → `npm run guide:extract` → normalise into **guide-catalog.json** + contextual **media/** files → application.

### Navigation

Users browse **areas of the home** (categories), then **topics** (appliances, systems), then block-based detail pages—not document sections or page numbers.

### Quick actions

Topic-level `actions` in JSON; executed by `guideActions.js` (Alexa virtual buttons, detail panels, cross-topic navigation).

### Search

Concept search across categories and topics with aliases (e.g. `kettle` / `tea` → Hot Water Machine; `Netflix` → TV & Entertainment).

### Presentation

- **Landing** — category cards for house areas.
- **Category** — topic list within that area.
- **Topic** — blocks + optional Quick Actions.
- **Home card** — meaningful summary strings, not document counts.

Legacy Markdown under `src/content/houseguide/*.md` remains optional source material until extraction fills the catalog.

## Intelligent weather

Weather is **Worker-only**. The dashboard never calls Open-Meteo (or any other provider) from the browser.

```
Weather app + status strip + home card
        │
        ▼
GET /api/weather (Cloudflare Worker)
        │
        ├── 15-minute in-memory cache (`worker/src/weather/weatherCache.js`)
        ├── Provider abstraction (`WeatherProvider` / `OpenMeteoProvider`)
        ├── Mapping to stable JSON (`mapOpenMeteo.js`)
        └── Rule-based weather insights (`adviceEngine.js`) — informative tone (may/might/could/consider); not safety directives (those belong in House Guide)
        │
        ▼
Open-Meteo forecast + air-quality APIs
```

**Home location** is configured on the Worker (`HOME_LATITUDE`, `HOME_LONGITUDE` in `worker/wrangler.toml` `[vars]`). The frontend sends no coordinates.

**Frontend:** `src/services/weatherService.js` refreshes every **15 minutes** and on startup; `src/apps/Weather/WeatherApp.js` renders current conditions, hourly/daily forecasts, and insights; Lucide icons via `src/weather/renderWeatherIcon.js`.

**Offline / upstream failure:** If Open-Meteo is unreachable, the Worker serves the last cached payload when available; the UI shows age labels (`Updated N minutes ago`) and a graceful unavailable state when no data exists.

## Bin collection

Household and garden waste dates come from **static data**, not runtime council fetches. PDFs are transcribed once into `src/data/binCollections/`.

### Data files

| File | Role |
|------|------|
| `householdCollections.js` | Calendar **17** — `{ date, type: 'rubbish' \| 'recycling', bankHolidayChange }` |
| `gardenWasteCollections.js` | Round **G2** — `{ date }` only |
| `collectionTypes.js` | Display names, bin descriptions, icons, garden-waste allowed/not lists |

Metadata on each schedule includes `validFrom`, `validUntil`, `source`, and calendar/round id. After `validUntil`, the UI shows that a newer calendar is needed and does not extrapolate dates.

### Service

`src/services/binCollectionService.js` merges household and garden events, compares **local calendar dates** only (`parseLocalDate`, `startOfLocalDay`), and exposes:

- `getNextCollection`, `getUpcomingCollections`, `getNextHouseholdCollection`, `getNextGardenWasteCollection`
- `getDaysUntil` — Today / Tomorrow / In N days
- `getBinCollectionHomeSummary` — Home card copy (owner vs house sitter via options)

Future schedules could swap the data import for a Worker or council API; apps should consume the service API only.

### Bank-holiday exceptions

Calendar 17 lists non-Friday collections with `bankHolidayChange: true` (e.g. Tue 30 Dec 2025, Tue 6 Jan 2026, Mon 12 Jan 2026, Sat 17 Jan 2026). These are stored as printed — not normalised back to Friday.

### Maintenance

See [bin-collection-maintenance.md](./bin-collection-maintenance.md) for the exact files to edit when a new PDF arrives.

UI layout and screenshot maintenance: [bin-collection-ui.md](./bin-collection-ui.md).

## Device mode (House Sitter vs Owner)

Two independent security layers protect the wall tablet:

| Layer | Question | Mechanism |
|-------|----------|-----------|
| **Cloudflare Access** | Who may reach the site? | Mark and Donna’s approved emails + emailed OTP |
| **Device mode** | What may this tablet show and call? | Signed HTTP-only cookie issued by the Worker |

Cloudflare Access stays enabled for the whole site. A valid Access session is required for every visit. **Owner Mode is the default** once Access succeeds.

### Signed device session cookie

- **Name:** `lovely_home_device_session`
- **Attributes:** `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`
- **Signing:** HMAC-SHA256 over a base64url JSON payload using Worker secret `OWNER_SESSION_SECRET`
- **Authority:** The Worker validates the cookie on every protected route. React state, `localStorage`, and `sessionStorage` are never authoritative.
- **Default:** Missing cookie → **Owner Mode** (no cookie is issued automatically)
- **Sitter lock:** Only a deliberate, valid **sitter** cookie restricts the tablet to House Sitter Mode
- **Invalid/expired/tampered sitter cookie:** Cleared and treated as Owner Mode

**Durations:**

- House Sitter Mode — ~30 days (renewed on use when past half TTL)
- Owner Mode — no device cookie required (Access + owner identity only)

Session JSON responses use `Cache-Control: no-store` and never expose cookie bytes or signing material.

### API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/device-session` | Current mode (owner unless valid sitter cookie) |
| POST | `/api/device-mode` | `{ "mode": "sitter" }` — Access owner only; issues sitter cookie |
| POST | `/api/auth/owner` | PIN clears sitter lock → Owner Mode |
| POST | `/api/auth/lock` | Issues persistent sitter cookie (same as Enable House Sitter Mode) |

Owner-only routes (`/api/calendar`, `/api/private-config`, …) require **Cloudflare Access owner identity** and **no active sitter cookie**. House-sitter-safe controls still require Access; effective control role follows device mode (sitter mode limits buttons even if Access identity is an owner).

The Pages API proxy forwards the browser `Cookie` header and returns Worker `Set-Cookie` headers so device sessions work same-origin.

### Sitter handover (before leaving)

1. Confirm the tablet is authenticated through Cloudflare Access.
2. In Settings, choose **Enable House Sitter Mode** and confirm.
3. Refresh the browser — the dashboard should remain in House Sitter Mode.
4. Confirm House Controls work.
5. Confirm My Day and other owner-only apps are absent.

### Return home

1. Use the hidden owner gesture.
2. Enter the owner PIN (clears the sitter cookie).
3. Confirm Owner Mode loads.
4. Reauthenticate through Cloudflare Access if its session has expired.

### Required Worker secrets

- `OWNER_PIN` — compared server-side only (never in frontend bundle)
- `OWNER_SESSION_SECRET` — device session signing
- `OWNER_EMAILS` — comma-separated owner emails for Access role mapping

## My Day (owner-only calendar)

**My Day** is a read-only personal agenda for the wall dashboard — not a full calendar replacement. It shows today, tomorrow, and the next six days from Mark’s **private Apple published ICS feed**.

```
My Day app + Home card (owner only)
        │
        ▼
GET /api/calendar  (Cloudflare Access owner + no sitter cookie)
        │
        ├── No sitter device cookie required for owner APIs
        ├── 5-minute normalized cache (`worker/src/calendar/calendarCache.js`)
        ├── Provider abstraction (`CalendarProvider` / `AppleIcsProvider`)
        ├── ICS parse + recurrence expansion (`ical.js`, Apple VTIMEZONE from feed)
        └── Europe/London date grouping and data minimisation
        │
        ▼
Apple private ICS URL (Worker secret `APPLE_CALENDAR_ICS_URL` only)
```

- **House Sitter Mode:** My Day is not registered, not routed, and **no calendar HTTP requests** are made.
- **Authorization:** `/api/calendar` requires Cloudflare Access owner identity and **no active sitter cookie**.
- **Stale fallback:** If Apple is unreachable, the Worker serves the last cached normalized payload with `stale: true`.
- **Read-only:** No create/edit/delete; no month grid.

Deployment: [my-day-deployment.md](./my-day-deployment.md).

## Cloudflare Worker API

Virtual Buttons and private house values are served through a Cloudflare Worker — see [cloudflare-worker.md](./cloudflare-worker.md). The PWA uses `VITE_API_BASE_URL`; the Virtual Buttons access code never ships to the browser.

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
