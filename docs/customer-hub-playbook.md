# Customer hub playbook

How to provision a real household hub, run owner onboarding, verify the sitter experience, and hand off a wall tablet or remote sitter access.

## Domain plan

| Purpose | Domain | Examples |
| --- | --- | --- |
| Marketing & brand | [lovely-home.co.uk](https://lovely-home.co.uk) (`.com` later if you migrate) | Product site, contact, “Try demo” |
| Platform ops | `lovely-home.co.uk` | `platform.lovely-home.co.uk`, `demo.lovely-home.co.uk`, `sandbox.lovely-home.co.uk` |
| **Customer hubs** | **`lovely-hub.com`** | `smith.lovely-hub.com`, `rose-cottage.lovely-hub.com` |

Each paying household gets:

- **Site id** — short slug (`smith`, `rose-cottage`) used in Worker/Pages project names and Terraform
- **Hostname** — `{site-id}.lovely-hub.com`
- **Isolated stack** — own D1, R2, Worker, Pages project, Cloudflare Access policies

The demo hub stays on `demo.lovely-home.co.uk` with username/password auth — do not use it as a customer template.

---

## One-time platform setup (lovely-hub.com)

Before the first customer hub:

1. **Register `lovely-hub.com`** and add the zone to Cloudflare (full DNS).
2. **Terraform** — add to `terraform/environments/hub.tfvars` (never commit secrets):
   ```hcl
   customer_cloudflare_zone_id = "YOUR_LOVELY_HUB_COM_ZONE_ID"
   customer_zone_name          = "lovely-hub.com"
   ```
3. **CI secrets** — set `CUSTOMER_CLOUDFLARE_ZONE_ID` (and optionally `CUSTOMER_ZONE_NAME`) for `generate-hub-tfvars.mjs` in GitHub Actions.
4. **API token** — extend `CLOUDFLARE_API_TOKEN` (GitHub secret) with **Zone → DNS → Edit** on **`lovely-hub.com`**, not only `lovely-home.co.uk`. Without this, Terraform creates D1/Pages/Access then fails on the `smith` DNS record with `403 Forbidden`.
5. **Access** — household owner emails go on each site’s `owner_emails`; sitter emails optional per site. Global `owner_emails` in tfvars still merge into every hub.

Run `terraform apply` once after adding the customer zone variables so DNS records for new customer sites can be created in the right zone.

---

## Practice run (sandbox)

Before your first real customer, dry-run the full owner flow on **`sandbox.lovely-home.co.uk`**.

### A. Reset and set up (choose one path)

1. Sign in via Cloudflare Access as an owner test email.
2. **Settings → Backup & restore → Download full site backup** (optional but recommended — you will reuse this file).
3. **Settings → Backup & restore → Factory reset hub** (type `RESET`). The setup wizard opens automatically.

Then either:

| Path | When to use |
| --- | --- |
| **Restore from backup** | You have a backup JSON from this hub or another environment. On wizard **step 1**, use **Restore from backup file** — decrypt, confirm, wait for restore. You land on Home with setup marked complete. |
| **Step through wizard** | Fresh content or first-time walkthrough. Complete all steps: hub name, contacts, pet, Wi‑Fi, bins, calendar (optional), starter guide import. |

**After restore:** uploaded House Guide **photo files are not in the backup** — re-upload any missing images in Guide Editor → Photo library. Appliance manual PDFs are also not embedded; re-upload in the Appliance Manuals app if needed.

### B. Sitter access (tablet and/or remote)

See [Tablet vs remote sitter](#tablet-vs-remote-sitter) below. On sandbox, at minimum:

1. **Settings → House Sitter Mode → Scheduled stays** — add a test stay (email + dates) or use permanent sitter login emails if you prefer.
2. Turn on **Show home access details to sitters** (*Sitter is here*) when a sitter is actually staying.
3. For wall-tablet testing: **Enable House Sitter Mode** on the device, refresh, and walk through the [sitter acceptance checklist](#sitter-acceptance-test).

### C. Verify and sign off

1. Run infrastructure check:
   ```bash
   node scripts/verify-hub-health.mjs https://sandbox.lovely-home.co.uk
   ```
2. **Settings → Backup & restore → Download full site backup** again — confirm export works after your changes.
3. Note friction (copy, slow steps, guide gaps) and fix before onboarding a real home.

---

## Create a customer hub

### 1. Choose site id and hostname

- **Site id:** lowercase, starts with a letter, max 32 chars (`smith`, `rose-cottage`).
- **Hostname:** `{site-id}.lovely-hub.com` (default when using customer zone).

### 2. Add to platform registry

**Platform admin UI** (recommended) or CLI:

```bash
node scripts/platform-site-manage.mjs create \
  --site-id smith \
  --hostname smith.lovely-hub.com \
  --zone-name lovely-hub.com \
  --owner-emails 'owner@example.com' \
  --vanilla false
```

Use `--dry-run` first to preview file changes.

Open a PR, merge to `main`. **platform-site-provision** runs automatically for new registry entries.

### 3. Wait for provision CI

Watch GitHub Actions **Platform site provision** on `main`. It:

- Applies Terraform (Pages, Worker bindings, Access, DNS in `lovely-hub.com`)
- Syncs Wrangler env, D1 migrate, Worker deploy
- Attaches HUB_API to Pages and redeploys

Fix red CI before continuing.

### 4. Verify infrastructure

```bash
node scripts/verify-hub-health.mjs https://smith.lovely-hub.com
```

Expect: hub URL responds, Cloudflare Access gate active (or `/api/health` OK if using a service token), runtime config reachable after sign-in.

Without `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`, a **302 to Cloudflare Access** on `/api/health` is normal — open the hub in a browser and sign in as an owner to confirm the dashboard loads.

### 5. Set Worker secrets (if not fully automated)

```bash
node scripts/set-worker-secrets-from-terraform.mjs smith
```

Confirm owner emails, hub proxy secret, and any household-specific secrets.

### 6. Deploy Pages (if provision did not)

```bash
bash scripts/deploy-cloudflare-pages-site.sh smith
```

---

## Owner onboarding (first login)

Send the household owners:

1. Hub URL: `https://{site-id}.lovely-hub.com`
2. They sign in with **Cloudflare Access** (email OTP) using an address on the site’s owner allow-list.

On first visit after a fresh hub (or factory reset):

| Step | Action |
| --- | --- |
| Setup wizard | **Option A:** Step 1 → **Restore from backup file** to skip the wizard. **Option B:** Step through hub name, use case, contacts, pet (if any), Wi‑Fi, address, lockbox, owner PIN, bins, calendar, starter guide. |
| Guide polish | Edit topics in Guide Editor; upload photos in Photo library; publish changes. |
| Appliance manuals | Upload PDFs in owner app — linked from House Guide. |
| Sitter access | Configure [scheduled stays](#tablet-vs-remote-sitter) and/or permanent sitter emails; use *Sitter is here* during active sits. |
| Wall tablet | Enable **House Sitter Mode** on the tablet before handoff — persists across reboot until owner unlock. |

**Owner explore:** Owners can switch **Viewing as → Guest** in the header to preview the sitter home screen without locking the hub in House Sitter Mode.

**Moving from another hub:** Download a **full site backup** on the old hub, factory-reset or use a fresh customer site, then restore on wizard step 1 or via **Settings → Backup & restore → Restore from backup file**.

---

## Tablet vs remote sitter

Most households use one or both patterns:

| | **Wall tablet (Fully Kiosk)** | **Remote sitter (own phone/laptop)** |
| --- | --- | --- |
| **Who** | Guest on a mounted iPad/Android in the home | Trusted sitter or short-let guest elsewhere |
| **Sign-in** | Usually no personal login — tablet stays in **House Sitter Mode** | **Cloudflare Access** email OTP (must be on sitter allow-list) |
| **How to allow login** | Not required for the tablet itself; optional owner Access on the same device for unlock | **Scheduled stays** (recommended for date-bound visits) or **permanent sitter login emails** in Settings |
| **Home access details** (Wi‑Fi, lockbox, address) | Turn on **Show home access details to sitters** (*Sitter is here*) while they are staying | Same toggle — scheduled stays also auto-disclose on sit dates |
| **Locking** | **Enable House Sitter Mode** hides owner apps and persists after refresh/reboot | N/A — sitter uses their browser; owner mode is never locked on their device |

### Scheduled stays (recommended for Airbnb / visiting sitters)

**Settings → House Sitter Mode → Scheduled stays**

- Add sitter email(s), start/end dates, and an optional label.
- Cloudflare Access sitter login opens **7 days before** the sit by default; home access details appear on sit dates; access is removed **1 day after** the sit ends (Worker cron applies the schedule).
- Edit, extend, or cancel stays from the same panel.

Use **permanent sitter login emails** only for a long-term sitter who should always be able to sign in — not for one-off visits.

### *Sitter is here* toggle

**Settings → House Sitter Mode → Show home access details to sitters**

- Controls whether Wi‑Fi, address, contacts, and lockbox appear in House Guide protected blocks for sitter device mode.
- Turn **on** when someone is physically staying; turn **off** when they leave.
- Works together with scheduled stays (dates can auto-toggle disclosure).

---

## Sitter acceptance test

Complete this before handing over a wall tablet **or** before telling a remote sitter to sign in.

### On the tablet (House Sitter Mode enabled)

- [ ] Home screen shows correct pet name and essentials (no stale demo copy)
- [ ] **House Guide** — categories load on first open; search finds Wi‑Fi / kitchen topics
- [ ] **Pet care** — sections open and in-topic links work
- [ ] **Emergency** — owner phone, vet, fuse box, water stop tap cards open
- [ ] **Bins** — next collection visible
- [ ] **Weather** — forecast loads
- [ ] **Settings** — theme / screensaver; tablet guide matches this home
- [ ] Protected guest details (Wi‑Fi, lockbox) visible when *Sitter is here* is on

### Remote sitter (optional second pass)

- [ ] Sitter email receives Access OTP and can open the hub URL
- [ ] Guest home screen matches what you saw on the tablet preview
- [ ] Protected blocks show Wi‑Fi / lockbox during an active scheduled stay (or with *Sitter is here* on)
- [ ] Owner apps (Guide Editor, Settings utilities) are **not** available in sitter device mode

If protected blocks say “not available yet”, turn on **Sitter is here** or confirm the scheduled stay is active.

---

## Wall tablet handoff (Fully Kiosk)

See **[kiosk-tablet.md](./kiosk-tablet.md)** — use the customer hub URL everywhere the doc says `YOUR_HUB_URL` (e.g. `https://smith.lovely-hub.com`).

Summary:

1. Configure Fully **before** enabling kiosk lock
2. Enable Remote Admin + password
3. Set **Start URL** to the customer hub
4. Cloudflare Access session duration **30 days** on Pages + Worker apps for that hostname (owners unlocking the tablet may need Access on that device)
5. On the hub: schedule any remote sitter stays first, then **Enable House Sitter Mode** before mounting the tablet
6. Document kiosk PIN, exit gesture, and tablet IP offline

Remote sitters do **not** need the tablet — send them the hub URL and confirm their email is on a scheduled stay or permanent sitter list.

---

## Ongoing operations

| Task | Command / location |
| --- | --- |
| Deploy hub frontend | `bash scripts/deploy-cloudflare-pages-site.sh {site-id}` |
| Deploy hub Worker | `npm run deploy --prefix worker -- --env {site-id}` |
| Health check | `node scripts/verify-hub-health.mjs https://{site-id}.lovely-hub.com` |
| Owner backup | Settings → Backup & restore → Download full site backup |
| Restore / migrate | Settings → Backup & restore → Restore from backup file, or wizard step 1 after reset |
| Schedule sitter visit | Settings → House Sitter Mode → Scheduled stays |
| Factory reset | Settings → Backup & restore → Factory reset hub (download backup first) |
| Deprovision site | Platform admin → delete site → wait for deprovision workflow |

Customer hubs are **not** reseeded nightly (demo only).

---

## Related docs

- [Platform provisioning](./platform-provision.md) — CI and Terraform flow
- [Onboarding wizard](./onboarding.md) — setup steps, factory reset, restore on step 1
- [Site backup](./site-backup.md) — export/import format and limits
- [Cloudflare Access setup](./cloudflare-access-setup-guide.md) — session duration for tablets
- [Kiosk tablet](./kiosk-tablet.md) — Fully Kiosk configuration
- [Demo hub](./demo-hub.md) — public trial (`demo.lovely-home.co.uk`), separate from customer stacks
