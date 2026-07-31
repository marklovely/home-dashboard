# Changelog

## Unreleased

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
