# Site backup and restore (Milestone C)

Export and import **House Guide content** and **site settings** stored in D1. Worker secrets (Wi-Fi, PINs, contacts, lockbox) are **not** included — migrate those separately with `wrangler secret put`.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/site/backup` | Full site backup JSON (owner, owner device mode) |
| POST | `/api/site/restore` | Restore from backup JSON (replaces guide + settings) |
| GET | `/api/house-guide/export` | Guide-only export (import-compatible catalog) |
| POST | `/api/house-guide/import` | Import `{ "catalog": GuideCatalog }` (existing) |

All routes require Cloudflare Access **owner** identity and **owner** device mode (no active sitter lock).

## Backup file format (`formatVersion: 1`)

```json
{
  "formatVersion": 1,
  "exportedAt": "2026-07-31T20:00:00.000Z",
  "siteSettings": {
    "sitterSecretsDisclosed": false
  },
  "guide": {
    "seeded": true,
    "catalog": { "version": 2, "homeSummaryTitle": "…", "categories": [], "media": {} },
    "uploadedMedia": [{ "id": "photo-id", "alt": "Kitchen" }]
  }
}
```

Guide-only exports from **Guide Editor → Export JSON** wrap the catalog the same way on restore.

### What is included

| Included in backup | Notes |
|--------------------|--------|
| House Guide (categories, topics, text, draft content) | Imported as published |
| `uploadedMedia` list | Photo IDs and alt text only — not R2 files |
| Sitter secrets disclosed flag | Whether home details are shown to sitters |
| Sitter login emails | When exported via `/api/site/backup` |

### What is not included

| Not included | Where it lives |
|--------------|----------------|
| Hub name, contacts, address, bin schedule, pets | **Site profile** (D1) — use Settings → Home details, or complete setup wizard |
| `onboardingComplete` | Site profile — restore now marks setup complete when guide content is restored |
| Wi‑Fi, owner PIN, lockbox, calendar URL | **Worker secrets** — Settings → Home details, or `wrangler secret put` |
| Uploaded photo files | **R2** — re-upload in Guide Editor → Photo library |
| Appliance manual PDFs | Separate D1/R2 stack |

After restore, open **Settings → Home details** to re-enter secrets and profile fields that are not in the JSON file.

CMS images stored in **R2** are listed in `uploadedMedia` but **binary files are not embedded**. After restore, re-upload those images in **Guide Editor → Photo library**. Bundled assets referenced by `media.*.file` round-trip without re-upload.

### Draft state

Export uses current **draft** block content when a topic has unpublished edits. Import publishes everything (same as **Copy current guide to cloud**).

## UI

- **Settings → Backup & restore** — download / restore full site backup
- **Guide Editor → Export JSON / Import JSON** — guide-only workflow

## Copy production guide to test

1. On **production** (owner): Settings → **Download site backup** (or Guide Editor → Export JSON).
2. On **test** (`test.lovely-home.co.uk`): Settings → **Restore from backup file** (or Guide Editor → Import JSON).
3. Confirm — only **test D1** is overwritten.

## CLI and ops backup

### Site JSON via curl (while logged into Access in browser)

Copy `Cf-Access-Jwt-Assertion` from DevTools on a `/api/` request, then:

```bash
curl -sS -H "Cf-Access-Jwt-Assertion: $JWT" \
  "https://test.lovely-home.co.uk/api/site/backup" \
  -o lovely-home-hub-backup.json
```

Restore:

```bash
curl -sS -X POST -H "Cf-Access-Jwt-Assertion: $JWT" \
  -H "Content-Type: application/json" \
  --data-binary @lovely-home-hub-backup.json \
  "https://test.lovely-home.co.uk/api/site/restore"
```

### D1 SQL snapshot (operators)

```bash
cd worker
npx wrangler d1 export lovely-home-appliance-manuals --remote --output=prod-guide.sql
npx wrangler d1 export lovely-home-appliance-manuals-test --remote --env test --output=test-guide.sql
```

SQL dumps include all D1 tables (guide + appliance manuals metadata). Prefer JSON backup for selective guide/settings restore.

### Secrets manifest (names only)

Document Worker secrets per environment; never commit values:

- `OWNER_PIN`, `PRIVATE_*`, `HUB_PROXY_SECRET`, `CF_ACCESS_AUD`, `CF_ACCESS_TEAM_DOMAIN`, `OWNER_EMAILS`, …

See [cloudflare-test-environment.md](./cloudflare-test-environment.md) for test stack secrets.

## Test environment banner

Set on the **test Pages** project build:

```bash
VITE_HUB_ENVIRONMENT=test
```

Also auto-detected on `test.lovely-home.co.uk`. Shows a sticky **TEST ENVIRONMENT** banner.

## Related

- [house-guide-cms.md](./house-guide-cms.md) — CMS API reference
- [cloudflare-test-environment.md](./cloudflare-test-environment.md) — isolated test stack
