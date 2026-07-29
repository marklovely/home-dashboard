# My Day deployment

My Day reads Mark’s personal Apple Calendar through Apple’s **published ICS feed** (the subscribe URL). That URL must never appear in the frontend or git — it is stored only as the Worker secret `APPLE_CALENDAR_ICS_URL`.

## Apple Calendar: which link to use

On the Mac, open **Calendar → right‑click the calendar (e.g. “Mark”) → Sharing** (or calendar settings).

| Option | Use for My Day? |
|--------|------------------|
| **Shared with** (e.g. Donna) | No — that is iCloud sharing between people, not an ICS feed URL. |
| **Public Calendar** (checkbox) | **Yes** — tick this, then copy the **webcal://** or **https://** link Apple shows. |

Apple’s UI says “public” meaning “anyone with the link can subscribe read‑only.” There is no separate “private link” product. Security for the hub is: URL only in the Worker secret, calendar API requires owner PIN — not publishing the URL anywhere.

Use a **personal** calendar (e.g. **Mark**), not work calendars.

## Order of setup

1. **Merge and deploy** the Worker and Pages builds containing My Day (after PR review).
2. **Enable Public Calendar** on the chosen personal calendar and **copy the full subscribe URL** (often `webcal://…` — the Worker converts this to HTTPS).
3. **Set Worker secrets** (production):

```bash
cd worker
npx wrangler secret put APPLE_CALENDAR_ICS_URL
npx wrangler secret put OWNER_SESSION_SECRET
```

- `APPLE_CALENDAR_ICS_URL` — the full published subscribe URL from Apple (Public Calendar link).
- `OWNER_SESSION_SECRET` — random string used to sign short-lived owner bearer tokens (recommended). If omitted, the Worker falls back to `OWNER_PIN` for signing (less ideal).

4. **Confirm** `OWNER_PIN` is already set for owner unlock.
5. **Deploy Worker** again if secrets were added after the last deploy: `npm run deploy` in `worker/`.
6. **Pages:** ensure `VITE_API_BASE_URL` points at the Worker hostname (**Preview and Production**). PR preview URLs (`*.pages.dev`) fail My Day with “API not configured” if Preview env vars are empty.
7. **On the hub:** unlock **Owner access** with PIN once per session. My Day fetches calendar data only while a valid in-memory bearer token exists.

## Troubleshooting My Day

After owner PIN unlock, open DevTools → **Network** → **`calendar`**:

| HTTP status | Meaning |
|-------------|---------|
| **401** | No valid bearer token — use **Enter owner PIN** again. |
| **503** + `CALENDAR_NOT_CONFIGURED` | Secret missing on Worker — run `npx wrangler secret put APPLE_CALENDAR_ICS_URL`. |
| **503** + `CALENDAR_UPSTREAM` | Worker cannot download the Apple feed — wrong URL, revoked link, or Apple HTTP error (see `upstreamStatus` in JSON). |
| **200** | Backend OK — if UI still fails, hard-refresh the Pages preview. |

Test from a terminal (replace PIN):

```bash
TOKEN=$(curl -sS -X POST "https://<worker>/api/auth/owner" \
  -H "Content-Type: application/json" \
  -d '{"pin":"YOUR_PIN"}' | jq -r .token)

curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://<worker>/api/calendar"
```

The auth response **must** include `"token"` and `"expiresAt"`. If PIN succeeds but `token` is null, redeploy the Worker from the My Day branch.

Live logs: `cd worker && npx wrangler tail`

**Invalid URL in secret:** response code `CALENDAR_INVALID_URL` — re-copy the full Apple link (no extra quotes or spaces).

**Network from Worker (`upstreamStatus: 0`):** the Worker never got an HTTP response from Apple. On your Mac (same URL as in the secret, as HTTPS):

```bash
curl -I "https://…your-icloud-published-url…"
```

You should see `HTTP/2 200`. If curl fails, republish the calendar in Apple Calendar and update the secret. If curl succeeds but the Worker still fails, check `wrangler tail` for `networkReason` and `detail` on `calendar_upstream_network`.

## Revoking a exposed feed

If the ICS URL is ever leaked:

1. In Apple Calendar, **untick Public Calendar** on the old link (or leave it and rotate), then **tick Public Calendar** again to get a **new** subscribe URL if needed.
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
