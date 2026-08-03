# Kiosk tablet (Fully Kiosk)

The wall tablet runs **Fully Kiosk Browser** in fullscreen. The dashboard is a PWA — there is no separate in-app “kiosk mode”.

## PDF user guides

Appliance manuals open **inside the same page** (PDF.js canvas rendering). Fully Kiosk cannot reliably open PDFs in a new tab or window, so the app does **not** offer “Open in new tab” on sitter devices.

If a manual fails to load:

1. Check the tablet is online and Cloudflare Access is signed in.
2. Tap **Try again** on the manual viewer.
3. Confirm the Worker deploy includes the appliance-manuals API.

## House Sitter Mode vs Cloudflare Access

Two separate sessions apply:

| Layer | Cookie / session | Typical lifetime |
|-------|------------------|------------------|
| **Cloudflare Access** | `CF_Authorization` | Set in Zero Trust → Application → **Session Duration** |
| **House Sitter Mode** | `lovely_home_device_session` | 30 days (renews automatically) |

If the tablet asks you to **sign in** after a day or two, that is almost always **Cloudflare Access** expiring — not House Sitter Mode being lost. After you complete the email OTP, sitter mode should resume without re-enabling it in Settings.

**Recommendation:** Set Access **Session Duration** to **30 days** on both the Pages and Worker applications (see [cloudflare-access-setup-guide.md](./cloudflare-access-setup-guide.md)).

The app pings `/api/device-session` every 6 hours (and when the screen wakes) to renew the sitter cookie and restore mode after Access re-auth.

## Light routines / controls

Controls call `POST /api/button/VBxx` on the Worker. Failures are usually:

- **401 / 403** — complete Cloudflare sign-in, then tap the control again.
- **502 / 503** — Virtual Buttons or Worker briefly unavailable; the app retries once automatically.
- **Rate limit** — wait a few seconds between taps (duplicate cooldown ~2s, max ~10/min).

Ensure sitter-allowed button IDs in `controlPermissions.js` match what you expect (IDs 1–6, 8–10 for sitters; 7 is owner-only).

## Fully Kiosk settings (checklist)

- Keep **Clear cache / cookies on restart** disabled if you want long-lived sitter sessions.
- Allow JavaScript and local storage for the dashboard origin.
- Use **Start URL** pointing at the production dashboard URL.
- Disable pop-ups / new windows (the app no longer depends on them for PDFs).
