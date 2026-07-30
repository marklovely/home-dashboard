# Changelog

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
