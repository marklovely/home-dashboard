# Changelog

## Unreleased

### Settings and display

- **Themes** — dark, light, and auto (system); persisted in `localStorage`
- **Clock** — 12-hour or 24-hour format
- **Home screen zoom** — smaller / default / larger / extra large; persisted across refresh (CSS `zoom` on home screen)
- **Weather location** (owners) — UK postcode or place lookup; optional per-tablet override vs Worker default coordinates
- **Settings cleanup** — removed redundant Owner/Housesitter profile picker; device sitter mode is the single guest control
- **House sitter Settings** — fourth bottom-nav tab with appearance controls (theme, clock, home zoom) and about

### Documentation

- Architecture and Worker README updated for settings, display preferences, and weather geocode endpoint

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
