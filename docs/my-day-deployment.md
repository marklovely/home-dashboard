# My Day deployment

My Day reads Mark’s personal Apple Calendar through a **private published ICS feed**. The feed URL must never appear in the frontend or git.

## Order of setup

1. **Merge and deploy** the Worker and Pages builds containing My Day (after PR review).
2. **Create or confirm** a private published calendar in Apple Calendar (personal appointments only — not work calendars).
3. **Copy the private ICS URL** from Apple (often starts with `webcal://` — the Worker accepts this and fetches via HTTPS).
4. **Set Worker secrets** (production):

```bash
cd worker
npx wrangler secret put APPLE_CALENDAR_ICS_URL
npx wrangler secret put OWNER_SESSION_SECRET
```

- `APPLE_CALENDAR_ICS_URL` — the full private ICS URL from Apple.
- `OWNER_SESSION_SECRET` — random string used to sign short-lived owner bearer tokens (recommended). If omitted, the Worker falls back to `OWNER_PIN` for signing (less ideal).

5. **Confirm** `OWNER_PIN` is already set for owner unlock.
6. **Deploy Worker** again if secrets were added after the last deploy: `npm run deploy` in `worker/`.
7. **Pages:** ensure `VITE_API_BASE_URL` points at the Worker hostname (**Preview and Production**). PR preview URLs (`*.pages.dev`) fail My Day with “API not configured” if Preview env vars are empty.
8. **On the hub:** unlock **Owner access** with PIN once per session. My Day fetches calendar data only while a valid in-memory bearer token exists.

## Revoking a exposed feed

If the ICS URL is ever leaked:

1. In Apple Calendar, **stop publishing** the old link and **create a new** private published URL.
2. Run `npx wrangler secret put APPLE_CALENDAR_ICS_URL` with the new URL.
3. Redeploy the Worker (optional but recommended).

## House sitter safety

House Sitter Mode does not register the My Day app, does not call `/api/calendar`, and clears calendar state when switching modes.

## Local development

Add to `worker/.dev.vars` (gitignored):

```
OWNER_PIN=1234
OWNER_SESSION_SECRET=local-dev-signing-secret
APPLE_CALENDAR_ICS_URL=https://example.invalid/calendar.ics
```

Use a real ICS URL only on your machine; never commit it.

Do **not** add `VITE_*` calendar variables on Pages.
