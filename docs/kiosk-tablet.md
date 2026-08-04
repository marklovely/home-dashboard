# Kiosk tablet (Fully Kiosk)

The wall tablet runs **Fully Kiosk Browser** in fullscreen. The dashboard is a PWA — there is no separate in-app “kiosk mode” on the Lovely Home site itself.

Production URL: **`https://dashboard.lovely-home.co.uk`**

---

## Safe setup order (read before enabling Kiosk Mode)

Configure Fully **before** locking the device. If Kiosk Mode is enabled with no Remote Admin and a forgotten exit gesture, recovery requires Safe Mode or a factory reset.

1. Install Fully Kiosk Browser and open **Settings** (swipe from the left edge, or use the menu).
2. **Enable Remote Administration** (PLUS):
   - **Remote Admin from Local Network** → ON
   - Set a strong **Remote Admin password**
   - Note the tablet IP (router client list, or Fully **Device info**)
3. From a Mac/PC on the same Wi‑Fi, confirm: `http://<tablet-ip>:2323` opens and accepts the password.
4. Set **Start URL** to `https://dashboard.lovely-home.co.uk`.
5. Apply the [settings checklist](#fully-kiosk-settings-checklist) below (especially cookie and Web Automation).
6. Set **Kiosk Exit Gesture** and **Kiosk Mode PIN** — write both down.
7. **Only then** enable **Kiosk Mode**.
8. Test exit gesture and Remote Admin **Unlock Kiosk** once while you still have access.

### Credentials to store offline

| Item | Used for |
|------|----------|
| Tablet Wi‑Fi IP | Remote Admin `http://<ip>:2323` |
| Remote Admin password | Unlock kiosk, change settings from Mac |
| Kiosk Mode PIN | Exit kiosk on the tablet |
| Kiosk exit gesture | 5 taps / swipe from left / etc. |

Optional: **Fully Cloud** at [fully-kiosk.com/cloud](https://www.fully-kiosk.com/cloud) for remote management when not on the local network.

---

## Fully Kiosk settings checklist

### Required for Lovely Home

| Setting | Location | Value |
|---------|----------|--------|
| **Start URL** | Web content | `https://dashboard.lovely-home.co.uk` |
| **Remote Admin from Local Network** | Remote Administration | ON + password |
| **Enable JavaScript** | Web content | ON |
| **Enable Third Party Cookies** | Web content | ON (first-party cookies still work if OFF) |
| **Kiosk Exit Gesture** | Kiosk Mode | Your choice (e.g. **Fast 5 taps**) — document it |
| **Kiosk Mode PIN** | Kiosk Mode | Set and record (default is often `1234` if empty) |
| **Kiosk Mode Exit by Remote Admin only** | Kiosk Mode | **OFF** unless you always use Remote Admin to exit |

### Cookie and login — keep OFF

These cause **Cloudflare Access OTP on every refresh** if combined with auto-reload:

| Setting | Value |
|---------|--------|
| **Web Automation** (PLUS) | OFF, or **no steps that clear cookies/cache** |
| **Delete Cookies on Auto Reload** | OFF |
| **Delete Webstorage on Auto Reload** | OFF |
| **Delete Cache on Auto Reload** | OFF (optional; cache alone usually OK) |

If **Auto Reload on Screen On** is ON, **Delete Cookies on Auto Reload** must stay OFF.

There is **no** single setting named “clear cookies on restart” — Fully uses the **Auto Reload** + **Delete … on Auto Reload** options above.

### Cloudflare Access (Zero Trust)

Set **Session duration** to **30 days** on **every** Access application that protects production:

- `dashboard.lovely-home.co.uk`
- Pages hostname (if used)
- Worker API application

Global session duration in Zero Trust should match. Changing duration applies to **new** logins after the change.

---

## House Sitter Mode vs Cloudflare Access

Two separate sessions apply:

| Layer | Cookie | Typical lifetime |
|-------|--------|----------------|
| **Cloudflare Access** | `CF_Authorization` | Zero Trust **Session duration** (e.g. 30 days) |
| **House Sitter Mode** | `lovely_home_device_session` | ~30 days (renews via keepalive) |

If the tablet asks for an **email login code**, that is **Cloudflare Access** — not the hub owner PIN and not House Sitter Mode. After OTP, sitter mode should resume automatically on app **2.1.0+** without re-enabling in Settings.

The app pings `/api/device-session` every 6 hours (and when the screen wakes) to renew the sitter cookie.

### Log out / log in (Access)

There is no logout button in the dashboard. To force a fresh Access session:

- `https://dashboard.lovely-home.co.uk/cdn-cgi/access/logout`
- Or `https://<team>.cloudflareaccess.com/cdn-cgi/access/logout`

Then open the dashboard again and complete OTP once.

---

## Remote Admin (local management)

When **Remote Admin from Local Network** is enabled:

- URL: **`http://<tablet-ip>:2323`**
- Password: the **Remote Admin password** (not the Kiosk PIN)

Useful actions:

| Action | Where |
|--------|--------|
| **Unlock Kiosk** | Remote Admin UI (when kiosk locked on tablet) |
| **Load URL** | Open logout URL or dashboard |
| **Edit settings** | Most Fully options (Kiosk on/off still needs device interaction unless provisioned) |
| **REST unlock** | `http://<tablet-ip>:2323/?cmd=unlockKiosk&password=<RemoteAdminPassword>` |

If `:2323` does not connect, Remote Admin was never enabled or the tablet is on a different network/VLAN.

Find the tablet IP from the **home router** → connected devices, if the tablet UI is locked.

---

## Inspecting cookies (troubleshooting OTP loops)

Fully has no built-in cookie viewer. Use **Chrome DevTools** from a Mac:

1. On tablet: **Settings → Web Content → Enable Webview Contents Debugging** → ON.
2. Connect tablet by USB (USB debugging enabled if prompted).
3. On Mac: Chrome → `chrome://inspect/#devices` → **inspect** the Fully WebView for `dashboard.lovely-home.co.uk`.
4. **Application → Cookies** → expect:
   - `CF_Authorization` — Access session
   - `lovely_home_device_session` — House Sitter Mode (when enabled)

After login, expiry should be weeks ahead, not “Session” or a few hours. If cookies vanish after **screen wake**, check **Web Automation** and **Delete Cookies on Auto Reload**.

---

## Kiosk exit gestures (on the tablet)

Depending on Fully settings, one of these opens the **Kiosk PIN** dialog:

| Gesture | Notes |
|---------|--------|
| **Swipe from left** | Default; on Android 10+ **hold briefly** on the left edge before swiping |
| **Fast 5 taps** | Anywhere on screen (Fully in foreground) |
| **Fast 7 taps** | Used in **Single App Mode** — 5 taps will not work |
| **Double-tap top-left, then double-tap bottom-right** | Within 3 seconds |
| **Long-press Back** | If the device has a back button or remote |

Default Kiosk PIN is often **`1234`** unless changed.

If **Kiosk Mode Exit by Remote Admin only** is ON, on-tablet gestures are disabled — use Remote Admin **Unlock Kiosk**.

---

## Recovery checklist (locked out of Fully)

Use when the exit gesture fails and you cannot reach settings.

### 1. Remote Admin (if it was enabled earlier)

`http://<tablet-ip>:2323` → **Unlock Kiosk** or `/?cmd=unlockKiosk&password=...`

If `:2323` refuses connection, Remote Admin was not enabled — skip to step 2.

### 2. Try all exit gestures

Swipe-from-left (with hold), **7 fast taps**, corner double-taps, PIN **`1234`**.

### 3. Android Safe Mode (normal reboot is not enough)

A normal reboot returns straight into Fully because it is the **Home app**.

1. Power off completely.
2. Power on; as the logo appears, hold **Volume Down** (some devices use Volume Up — check your model).
3. Confirm **Safe mode** badge on screen.
4. **Settings → Apps → Fully Kiosk Browser → Uninstall**  
   Or **Settings → Apps → Default apps → Home app** → normal **Launcher**.
5. Reboot normally.

### 4. Factory reset (last resort)

Recovery mode: power off, then **Power + Volume Up** (varies by device) → **Wipe data/factory reset**.

You will reinstall Fully from scratch; use the [safe setup order](#safe-setup-order-read-before-enabling-kiosk-mode) above.

---

## Without Fully Kiosk (fallback)

If Fully is uninstalled or broken:

1. Open **Chrome** on the tablet.
2. Go to `https://dashboard.lovely-home.co.uk`.
3. Complete Cloudflare OTP once.
4. Optional: Chrome menu → **Install app** / **Add to Home screen**.
5. Re-enable **House Sitter Mode** in dashboard Settings if needed.

You lose fullscreen lockdown and Fully-specific power/screen policies until Fully is reinstalled safely.

---

## PDF user guides

Appliance manuals open **inside the same page** (PDF.js canvas rendering). Fully Kiosk cannot reliably open PDFs in a new tab or window, so the app does **not** offer “Open in new tab” on sitter devices.

If a manual fails to load:

1. Check the tablet is online and Cloudflare Access is signed in.
2. Tap **Try again** on the manual viewer.
3. Confirm the Worker deploy includes the appliance-manuals API.

---

## Light routines / controls

Controls call `POST /api/button/VBxx` on the Worker. Failures are usually:

- **401 / 403** — complete Cloudflare sign-in, then tap the control again.
- **502 / 503** — Virtual Buttons or Worker briefly unavailable; the app retries once automatically.
- **Rate limit** — wait a few seconds between taps (duplicate cooldown ~2s, max ~10/min).

Ensure sitter-allowed button IDs in `controlPermissions.js` match what you expect (IDs 1–6, 8–10 for sitters; 7 is owner-only).

---

## Related docs

- [Cloudflare Access setup](./cloudflare-access-setup-guide.md) — session duration, applications for Pages, Worker, and custom domain
- [Cloudflare Pages configuration](./cloudflare-pages-configuration.md) — same-origin `/api` proxy
