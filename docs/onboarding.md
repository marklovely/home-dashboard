# Onboarding and hub setup (Milestone B)

First-time setup wizard, in-app home details, and factory reset for a fresh hub instance.

## What it covers

| Area | UI | Storage |
|------|-----|---------|
| Hub name & use case | Setup wizard / Settings → Home details | D1 `site_profile` |
| Primary & secondary contacts | Setup wizard / Settings → Home details | Names in `site_profile`; phone/email in `hub_secrets` |
| Wi-Fi, address, lockbox, owner PIN | Setup wizard / Settings → Home details | D1 `hub_secrets` |
| House Guide starter | Setup wizard step 4 | D1 guide tables via import |
| Factory reset | Settings → Backup & restore | Clears D1 guide, secrets, profile, house settings |

**Worker CLI secrets** (`wrangler secret put PRIVATE_*`, `OWNER_PIN`) still work and are used as fallbacks when a value is not stored in D1. Values saved in the app are stored in D1 and take precedence.

Existing hubs with a seeded guide but no `site_profile` row are treated as already onboarded (no forced wizard).

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/site/profile` | Site profile + `guideSeeded` flag (owner device mode) |
| PATCH | `/api/site/profile` | Update profile fields |
| GET | `/api/site/secrets/status` | Which secret keys are configured (no values) |
| PATCH | `/api/site/secrets` | Save secret values to D1 |
| POST | `/api/site/reset` | Factory reset — body `{ "confirm": "RESET" }` |

## Setup wizard

Owner-only app **`hub-setup`**. Opens automatically when `onboardingComplete` is false (typically after factory reset or a fresh test D1).

Steps:

1. Hub name and guest use case
2. Primary and secondary contacts
3. Wi-Fi, address, lockbox, owner PIN
4. Optional starter House Guide import

Re-open from **Settings → Home details → Open setup wizard**.

## Factory reset

**Settings → Backup & restore → Factory reset hub**

Clears:

- House Guide CMS tables
- `hub_secrets`
- `site_profile` (back to defaults)
- `house_settings` (including sitter-secrets toggle)

Does **not** remove Wrangler CLI secrets or R2 uploaded photos. Download a backup first if needed.

After reset, the setup wizard opens so you can configure the hub again.

## Migration

Apply on prod and test:

```bash
cd worker
npm run d1:migrate:prod
npm run d1:migrate:test
npm run deploy
```

Migration: `0005_hub_setup.sql` (`hub_secrets`, `site_profile`).

The setup wizard requires a working connection to the hub server. If the server has not been updated yet, or the tablet is offline, the wizard shows a **Try again** screen instead of saving locally.

## Wi-Fi and secrets in the House Guide

Wizard and Settings save Wi-Fi, address, lockbox, and contacts to **D1 `hub_secrets`** on the Worker for that environment (test or production). They do **not** appear as plain text inside guide topics you edit — topics use **protected blocks** that pull values at runtime from `/api/private-config`.

To show Wi-Fi to sitters:

1. Enter Wi-Fi network name and password in the setup wizard (step 3) or **Settings → Home details**.
2. In **Settings → House Sitter Mode**, turn on **Show home access details to sitters** (*Sitter is here*).
3. Ensure the guide topic includes protected Wi-Fi blocks (the **starter guide** import includes these; in Guide Editor add blocks of type *Private info* for network name and password, or import the bundled guide).
4. Enable **House Sitter Mode** on the tablet when handing it to guests.

**Owner testing:** In owner device mode you can preview protected values without the *Sitter is here* toggle. In sitter device mode the toggle must be on.

**Test vs production:** The TEST banner is UI-only. API calls follow the Pages project and Worker binding for that URL. If test UI hits the production Worker, you will see production Wi-Fi and secrets. Use the dedicated test Pages project and `lovely-home-hub-api-test` Worker for isolated trials — see [cloudflare-test-environment.md](./cloudflare-test-environment.md).

## Backup files

Site backup JSON and D1 SQL dumps are gitignored. See `.gitignore` (`*-backup.json`, `worker/*-backup.sql`).

## Related

- [site-backup.md](./site-backup.md) — export/import before reset
- [cloudflare-test-environment.md](./cloudflare-test-environment.md) — test stack for trying setup safely
