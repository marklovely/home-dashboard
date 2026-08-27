# Customer hub playbook

How to provision a real household hub, run owner onboarding, verify the sitter experience, and hand off a wall tablet.

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
4. **Access** — household owner emails go on each site’s `owner_emails`; sitter emails optional per site. Global `owner_emails` in tfvars still merge into every hub.

Run `terraform apply` once after adding the customer zone variables so DNS records for new customer sites can be created in the right zone.

---

## Practice run (sandbox)

Before your first real customer, dry-run the flow on **`sandbox.lovely-home.co.uk`**:

1. Sign in via Cloudflare Access as an owner test email.
2. **Settings → Backup & restore → Factory reset hub** (type `RESET`).
3. Complete the **setup wizard** end-to-end: hub name, contacts, pet, Wi‑Fi, bins, starter guide import.
4. **Settings → House Sitter Mode** — enable and refresh; confirm guest home, guide, pet care, emergency.
5. Run infrastructure check:
   ```bash
   node scripts/verify-hub-health.mjs https://sandbox.lovely-home.co.uk
   ```
6. Note friction (missing copy, slow steps, guide gaps) and fix before onboarding a real home.

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

On first visit after a fresh hub:

| Step | Action |
| --- | --- |
| Setup wizard | Hub name, use case, contacts, pet (if any), Wi‑Fi, address, lockbox, owner PIN |
| Bins | Council collection dates (optional but powers home reminders) |
| Starter guide | Import template matching use case; edit in Guide Editor |
| Appliance manuals | Upload PDFs in owner app — linked from House Guide |
| House Sitter Mode | Settings → enable before leaving; persists across reboot |

**Owner explore:** Owners can switch **Viewing as → Guest** in the header to preview the sitter tablet without locking the hub.

---

## Sitter acceptance test

Before handing over the wall tablet, complete this checklist on **Guest / House Sitter Mode**:

- [ ] Home screen shows correct pet name and essentials (no stale demo copy)
- [ ] **House Guide** — categories load on first open; search finds Wi‑Fi / kitchen topics
- [ ] **Pet care** — sections open and in-topic links work
- [ ] **Emergency** — owner phone, vet, fuse box, water stop tap cards open
- [ ] **Bins** — next collection visible
- [ ] **Weather** — forecast loads
- [ ] **Settings** — theme / screensaver; tablet guide matches this home
- [ ] Protected guest details (Wi‑Fi, lockbox) visible when sitter secrets disclosed

Toggle sitter secrets in owner Settings if boxes still say “not available yet”.

---

## Wall tablet handoff (Fully Kiosk)

See **[kiosk-tablet.md](./kiosk-tablet.md)** — use the customer hub URL everywhere the doc says `YOUR_HUB_URL` (e.g. `https://smith.lovely-hub.com`).

Summary:

1. Configure Fully **before** enabling kiosk lock
2. Enable Remote Admin + password
3. Set **Start URL** to the customer hub
4. Cloudflare Access session duration **30 days** on Pages + Worker apps for that hostname
5. Enable **House Sitter Mode** on the hub before mounting the tablet
6. Document kiosk PIN, exit gesture, and tablet IP offline

---

## Ongoing operations

| Task | Command / location |
| --- | --- |
| Deploy hub frontend | `bash scripts/deploy-cloudflare-pages-site.sh {site-id}` |
| Deploy hub Worker | `npm run deploy --prefix worker -- --env {site-id}` |
| Health check | `node scripts/verify-hub-health.mjs https://{site-id}.lovely-hub.com` |
| Owner backup | Settings → Backup & restore → Download backup |
| Deprovision site | Platform admin → delete site → wait for deprovision workflow |

Customer hubs are **not** reseeded nightly (demo only).

---

## Related docs

- [Platform provisioning](./platform-provision.md) — CI and Terraform flow
- [Onboarding wizard](./onboarding.md) — setup steps and API
- [Cloudflare Access setup](./cloudflare-access-setup-guide.md) — session duration for tablets
- [Demo hub](./demo-hub.md) — public trial (`demo.lovely-home.co.uk`), separate from customer stacks
