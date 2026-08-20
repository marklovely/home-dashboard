# Site backup and restore (Milestone C)

Export and import **House Guide content**, **site profile** (home details, bins, pets), **hub secrets** (Wi‑Fi, PIN, lockbox, calendar), and **sitter settings** stored in D1.

**Not included:** uploaded photo binaries (R2), appliance manual PDFs, or Cloudflare Worker platform secrets (`HUB_PROXY_SECRET`, Access AUD).

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/site/backup` | Full site backup JSON (default) |
| GET | `/api/site/backup?scope=guide` | Guide + sitter flags only |
| POST | `/api/site/restore` | Restore from backup JSON |
| GET | `/api/house-guide/export` | Guide-only export (import-compatible catalog) |
| POST | `/api/house-guide/import` | Import `{ "catalog": GuideCatalog }` (existing) |

All routes require Cloudflare Access **owner** identity and **owner** device mode (no active sitter lock).

## Backup scopes

| Scope | Includes |
|-------|----------|
| **full** (default) | Guide, site profile, hub secrets, sitter settings |
| **guide** | Guide + sitter settings only |

Restore applies whatever is present in the file — full backups restore everything; older guide-only files still work.

## Backup file format (`formatVersion: 1`)

```json
{
  "formatVersion": 1,
  "backupScope": "full",
  "exportedAt": "2026-07-31T20:00:00.000Z",
  "siteSettings": {
    "sitterSecretsDisclosed": false,
    "sitterAccessEmails": ["sitter@example.com"]
  },
  "siteProfile": {
    "onboardingComplete": true,
    "hubName": "Rose Cottage",
    "primaryContact": { "name": "", "phone": "", "email": "" }
  },
  "hubSecrets": {
    "wifi_password": "…",
    "owner_pin": "1234"
  },
  "guide": {
    "seeded": true,
    "catalog": { "version": 2, "homeSummaryTitle": "…", "categories": [], "media": {} },
    "uploadedMedia": [{ "id": "photo-id", "alt": "Kitchen" }]
  }
}
```

Guide-only exports omit `siteProfile` and `hubSecrets` and set `"backupScope": "guide"`.

**Security:** Full backups contain PINs and Wi‑Fi passwords. Downloads are **encrypted in your browser** with a password you choose; restore prompts for that password. Lovely Home never sees or stores the password. Older plain JSON backups still restore.

### Encryption envelope

Encrypted files remain JSON with `"encrypted": true`, AES-GCM ciphertext, and PBKDF2-SHA256 key derivation (310k iterations). The inner payload matches the backup format below once decrypted.

### Uploaded photos

CMS images stored in **R2** are listed in `uploadedMedia` but **binary files are not embedded**. After restore, re-upload those images in **Guide Editor → Photo library**. Bundled assets referenced by `media.*.file` round-trip without re-upload.

### Draft state

Export uses current **draft** block content when a topic has unpublished edits. Import publishes everything (same as **Copy current guide to cloud**).

## UI

- **Settings → Backup & restore**
  - **Download full site backup** — encrypted JSON with guide, home details, secrets, sitter settings
  - **Download guide only** — encrypted House Guide content only
  - **Restore from backup file** — decrypts password-protected files (plain JSON still accepted)
- **Guide Editor → Export JSON / Import JSON** — encrypted guide-only workflow

## Copy production hub to dev/test

1. On **production** (owner): Settings → **Download full site backup**.
2. On **dev/test**: Settings → **Restore from backup file**.
3. Confirm — target hub D1 is overwritten. Re-upload photos listed in `uploadedMedia` if needed.

## CLI and ops backup

### Site JSON via curl (while logged into Access in browser)

Copy `Cf-Access-Jwt-Assertion` from DevTools on a `/api/` request, then:

```bash
curl -sS -H "Cf-Access-Jwt-Assertion: $JWT" \
  "https://test.lovely-home.co.uk/api/site/backup" \
  -o lovely-home-hub-backup.json
```

Guide only:

```bash
curl -sS -H "Cf-Access-Jwt-Assertion: $JWT" \
  "https://test.lovely-home.co.uk/api/site/backup?scope=guide" \
  -o lovely-home-guide-backup.json
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
