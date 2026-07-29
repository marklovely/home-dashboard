# Cloudflare Access — dashboard security lockdown

Lovely Home Hub uses **Cloudflare Access** as the outer authentication boundary. The Worker validates the Access JWT on every sensitive API request and assigns **Lovely Home roles** server-side. The browser UI mode (owner vs house sitter) is **not** authorization.

## Security model

```
Cloudflare identity (email allow-list)
        ↓
Cf-Access-Jwt-Assertion validated by Worker
        ↓
Lovely Home role
        ├── owner      (email in OWNER_EMAILS)
        └── house-sitter (any other allowed Access identity)
```

**Owner PIN** (in-app unlock) only switches what the **already authenticated** tablet shows. It does **not** replace Access. Owner-only APIs (calendar, owner PIN endpoint) require an **owner** Access identity regardless of PIN.

## Manual Cloudflare configuration

Perform these steps in the Cloudflare Zero Trust dashboard. This repository does **not** change your Cloudflare account automatically.

### 1. Create Access applications

Create **separate** self-hosted (or SaaS) Access applications for each public entry point. Do **not** use **Include: Everyone**.

| Hostname | Purpose |
|----------|---------|
| `dashboard.lovely-home.co.uk` | Production Pages (custom domain) |
| `home-dashboard-a11.pages.dev` | Production Pages default hostname |
| Pages preview deployments | Add each preview hostname or a documented wildcard policy |
| Worker production hostname | Worker API |
| Worker preview URLs | Worker preview deployments |

**Policy (owners):**

- **Action:** Allow  
- **Include:** Emails — list each owner address  
- **Authentication:** One-time PIN and/or IdP as you prefer  

**Policy (house sitters):**

- **Action:** Allow  
- **Include:** Emails — **exact address per sitter**  
- Do **not** use unrestricted “Login method = One-time PIN” without an email allow-list  

Revoking access = remove the email from the policy.

### 2. Application audience (AUD)

Set Worker secret `CF_ACCESS_AUD` to the Access application audience for requests hitting the Worker.

### 3. Team domain

Set `CF_ACCESS_TEAM_DOMAIN` to your Zero Trust team subdomain (before `.cloudflareaccess.com`).

### 4. Owner emails

Set `OWNER_EMAILS` to a comma-separated list of owner addresses.

### 5. Preview deployments

Protect preview hostnames with Access or disable public previews. No alternate unprotected URL may reach the same API.

### 6. CORS

Tighten `ALLOWED_ORIGINS` for production. CORS is **not** authentication.

## Worker configuration

See `worker/.dev.vars.example` for local development (`CF_ACCESS_JWT_TEST_SECRET`, `VITE_DEV_ACCESS_JWT`).

## API summary

| Endpoint | Access JWT | Role |
|----------|------------|------|
| `GET /api/health` | No | — |
| `GET /api/session` | Yes | Any |
| `GET /api/private-config` | Yes | Any |
| `GET /api/weather` | Yes | Any |
| `POST /api/auth/owner` | Yes | Owner email + PIN |
| `GET /api/calendar` | Yes | Owner |
| `POST /api/button/:code` | Yes | See `CONTROL_PERMISSIONS` in Worker |

Sitters may trigger **VB01**, **VB02**, and **VB09** only.
