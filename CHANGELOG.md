# Changelog

## Unreleased

### Signup

- Hub addresses must be DNS-safe (letters, numbers, hyphens). Underscores like `kitchen_home` no longer start a trial that can never deploy.
- Signup success page stops on a recorded setup failure and no longer shows a QR after 30 minutes if the hub never answered
- Success page heading switches to “Success — your hub is now ready” (or a setup-failed heading) instead of staying on “we’re building your hub”

### Marketing site

- Scheduled sitter stays: guide 7 days before, home-access details on sit dates, login removed after checkout

## 2.3.0

Public trial signup, household emails, and hub backups on cancel.

### Signup and billing

- Payment-gated public signup on lovely-home.co.uk (hub is registered only after Stripe confirms the trial)
- Customer lifecycle email via Resend (trial started, trial ending, payment failed, cancelled)
- Stripe twin events no longer open two registry PRs for the same hub

### Marketing site

- URL-first setup copy (wall tablet optional); VAT not charged
- Trial success page waits until the hub SPA is live before showing the QR and Open link

### Platform

- Pre-deprovision JSON archive to platform R2; teardown stops if the backup cannot run
- Customer owner emails stay out of the public git registry

### Releases

- GitHub Releases are created from CHANGELOG.md when a `vX.Y.Z` tag is pushed
- Marketing site footer and hub chrome show the same package version

## 2.2.0

Minor release: bin collection reminders for sitters, Settings sidebar layout, and preview/provision reliability.

### Bin collection reminders

- **Configurable alert window** — remind sitters on the home screen before each collection (Settings → Bin reminders)
- **Rich alert banners** — show which bins, put-out time (6am), and collection point on owner and sitter home screens
- **Highlighted bins card** — sitter home card draws attention when a collection is due soon
- **Collection location in Settings** — edit where bins are collected and council URL without opening the full wizard

### Settings

- **Chrome-style sidebar** — one category at a time (Appearance, House sitter mode, Home details, Bin reminders, Weather, Backup, Help, About)
- **Prefilled home details** — hub name, contacts, address, Wi‑Fi name, and bin settings load from saved profile and hub secrets
- **“Already saved” hints** — password, PIN, and lockbox fields indicate when values exist without revealing them
- **Legacy address support** — structured address fields populated from older single-line home address secrets

### Preview and provisioning

- **Pages preview Access** — fix invalid redirect URL when signing in to `*.pages.dev` preview deployments
- **Preview enable script** — `enable-hub-pages-previews.mjs` copies env vars and supports production site id
- **Hub tfvars guard** — prevent stale local `hub.tfvars` from targeting the wrong site during provision
- **Wrangler sync hardening** — D1 id sync, env var deduplication, and auto-load provision env from tfvars

### Platform (operators)

- **Per-site sitter Access emails** — configure sitter login emails from Settings and platform wizard
- **Platform admin and Terraform** — site wizard, sandbox/test import tooling, automated hub provision workflows
- **Terraform validate on PRs** — hub environment modules validated in CI

## 2.1.0

Minor release: onboarding wizard, vanilla test environment, kiosk reliability, and appearance fixes for launch readiness.

### Onboarding and hub setup

- **Hub setup wizard** — step-by-step first-run flow for property name, guest type (Airbnb, house sitter, both, or owner-only), contacts, Wi‑Fi, address, owner PIN, and starter guide import
- **Bin collections in wizard** — manual collection dates, collection location, and council recycling URL; integrated with the Bins app via site profile
- **Calendar in wizard** — Apple ICS subscribe URL saved to D1 (`hub_secrets.calendar_ics_url`) without Wrangler CLI for end users
- **Field tooltips and in-app help** — contextual help on setup fields and a searchable step-by-step hub setup guide
- **Purpose-specific starter guides** — separate templates for Airbnb, house sitter, both, and owner-only homes (no bundled personal content)
- **Factory reset** — Settings → wipe hub profile, secrets, and guide content for a clean restart
- **In-app secrets** — owners configure Wi‑Fi, contacts, lockbox, and calendar from Settings without editing Worker env vars
- **Guest-aware copy** — bin setup and welcome text adapt to Airbnb vs sitter vs both vs owner
- **Wizard scroll fixes** — each step scrolls to top on advance; improved field validation and lockbox masking

### Test environment and data isolation

- **Isolated test stack** — separate Cloudflare Pages, Worker, and D1 for `test.lovely-home.co.uk` with a visible TEST banner
- **Vanilla test defaults** — empty Virtual Button config, demo bin schedule, no personal calendar on My Day
- **No production data leakage** — test hubs use a neutral House Guide fallback; bundled Rose Cottage content cannot be copied to test
- **Emergency app** — contact and utility cards built from site profile and guide content, not hardcoded owner names or vet details
- **Scooter app hidden on test** — pet-specific app only appears when configured for that hub
- **Production guide blocked on test** — if prod guide fingerprints are detected in test D1, content is rejected with a reset prompt
- **Test Worker secret isolation** — test Worker does not fall back to production `PRIVATE_*` env vars for contacts or Wi‑Fi

### Kiosk tablet reliability (Fully Kiosk / Android)

- **PDF manuals in-page** — appliance PDFs render with PDF.js canvas scrolling (no new tab — required for Fully Kiosk)
- **Session keepalive** — pings `/api/device-session` every 6 hours and on screen wake to renew House Sitter Mode
- **Access re-auth banner** — clear prompt when Cloudflare Access expires; sitter mode resumes after sign-in without re-enabling in Settings
- **Control retries** — virtual button calls retry once on 502/503/504 with clearer 401 errors
- **Light theme on tablet** — theme-aware nav, overlays, toasts, and screensaver; `theme-color` meta updates dynamically
- **Home screen size on tablet** — reliable radio selection (`.is-selected` fallback for WebViews without `:has()`); zoom with transform fallback for scaling
- **Kiosk documentation** — checklist for Fully Kiosk settings and 30-day Access session duration

### Guide Editor

- **TipTap WYSIWYG** — replaces Markdown toolbar with rich text editing, formatting toolbar, and link support
- **Emoji picker** — full emoji palette for topic content
- **Modernised editor styling** — cleaner WYSIWYG layout and restyled action buttons
- **Simplified topic keywords** — easier search term entry

### Site backup and restore

- **Download site backup** — JSON export of House Guide and site settings from Settings (owners)
- **Restore from backup** — import guide content to the current hub with confirmation dialog
- **Guide Editor export fallback** — graceful handling when export API is not yet deployed

### My Day and calendar

- **My Day setup guide** — in-app guidance when calendar is not configured (especially on test)
- **Calendar blocked on test hub** — personal calendar never fetched on `test.lovely-home.co.uk`
- **Calendar via hub secrets** — ICS URL stored in D1 and read by Worker at runtime
- **Dynamic owner greeting** — My Day salutation uses primary contact name from profile, not a hardcoded default

### Platform and stability

- **Device session bootstrap** — no startup hang when session API is slow
- **Hub setup during sitter mode** — owners can finish onboarding without leaving sitter device mode
- **Production safety** — setup wizard does not hijack production when API is unavailable; leaves onboarded hubs alone
- **localStorage fallback** — setup progress persists locally when hub API routes are not deployed yet
- **CI and deploy fixes** — Worker dependencies installed in Pages workflow; Europe/London timezone in calendar tests

### Documentation

- Cloudflare test environment, onboarding, kiosk tablet, and bin collection docs updated
- Architecture notes for appearance settings, test isolation, and hub environment detection

## 2.0.0

Major release: cloud House Guide CMS, appliance manuals, sitter secrets, and integrated help.

### House Guide CMS

- **Guide Editor** — edit, draft, and publish House Guide topics from the hub (D1 + R2)
- **Cloud content** — sitters receive published topics from the Worker API; bundled JSON remains the seed/fallback
- **Media library** — upload images to R2 and attach to topics
- **Places, contacts, quick actions** — structured blocks with topic visibility and audience (owner vs sitter)
- **Drag-and-drop topic reorder** and styled confirm dialogs

### Appliance manuals

- **Private PDF storage** (R2) with metadata in D1
- Owners manage manuals in the **Appliance Manuals** app; sitters browse from House Guide
- Manual links on relevant guide topics

### Sitter access and secrets

- **Sitter is here** toggle (Settings) — share Wi‑Fi, address, contacts, and lockbox with sitters via `/api/private-config`
- **`PRIVATE_LOCKBOX_CODE`** Worker secret for lockbox access
- D1 **`house_settings`** migration for the sharing toggle

### Wi‑Fi and House Guide UX

- **Scan-to-join Wi‑Fi QR codes** on Connecting and QR Code topics
- **Primary contact (Mark)** — phone and email on QR and troubleshooting topics when sharing is enabled
- Fix topic navigation bouncing back to explore on deep links
- Hide stale cloud CMS placeholder copy when live credentials are available

### Emergency app (tablet)

- All cards open **in-page detail overlays** — no navigation to House Guide
- Mark and Donna contacts shown as phone/email panels (no `tel:` links on tablet)

### Help guides

- Shared searchable overlay: **Owner guide**, **Tablet guide**, and **Writing guide** (Guide Editor)
- Entry points on owner home, sitter home, and Settings → Help

### Settings and display

- **Themes** — dark, light, and auto (system); persisted in `localStorage`
- **Clock** — 12-hour or 24-hour format
- **Home screen zoom** — smaller / default / larger / extra large
- **Weather location** (owners) — UK postcode or place lookup; optional per-tablet override
- **House sitter Settings** — fourth bottom-nav tab with appearance controls and about
- Idle **screensaver** with drifting clock (Fully Kiosk)

### Platform and navigation

- Guide **deep links** (`#house-guide/...`), profile switcher, offline guide cache
- Improved Alexa control button feedback; expanded sitter control permissions

### Documentation

- House Guide CMS, appliance manuals, architecture, and Worker docs updated for D1 migrations and secrets

## 1.1.0

### Device mode and Cloudflare Access (production)

- Default to **Owner Mode** after Cloudflare Access; House Sitter Mode only with a deliberate sitter cookie
- Server-authoritative device session (`GET /api/device-session`, `POST /api/device-mode`, PIN clears sitter lock)
- Same-origin `/api/*` via Cloudflare Pages Functions proxy with Access middleware and `HUB_API` service binding
- `/api/access-probe` diagnostic endpoint and hardened JWT / cookie forwarding

### Controls

- **Master Bedroom Lights On/Off** (Virtual Buttons 8 and 10) for owners and sitters
- Grouped Controls UI with bordered sections: Scenes, Downstairs, Master bedroom, Garage, Heating
- Removed Heat to 9°C shortcut (button 8 repurposed); House Guide heating actions updated

### Other

- Settings: Enable / Return to House Sitter Mode
- Bootstrap loading gate while device session resolves
- Architecture and Cloudflare Pages configuration docs updated

## 1.0.0

- Eight configurable Virtual Buttons
- Responsive wall-panel layout
- Live clock, greeting and date
- Weather via Open-Meteo
- Battery and network indicators
- PWA manifest and offline app shell
- Haptic feedback and toast confirmations
- Vitest unit tests, ESLint, Prettier and GitHub Actions CI
