# Cameras (go2rtc) — owner-only live view

Lovely Home Hub does **not** integrate with Apple HomeKit or Nest APIs directly. The **Cameras** app shows live RTSP feeds through a **[go2rtc](https://github.com/AlexxIT/go2rtc)** gateway you run on your home network (Mac, NAS, Pi).

- **Owner profile only** — the app never appears for house sitters.
- **Generic** — any RTSP source works (Starling Hub, Frigate, NVR, IP cam).
- **Per-hub config** — stored in `site_profile.cameras` (Settings → Cameras).

## Architecture

```text
Camera / bridge (RTSP)  →  go2rtc (LAN)  →  WebRTC in browser  →  Cameras app
```

Example: Nest cams via **Starling Hub** RTSP (`rtsp://192.168.x.x:554/…`) → go2rtc on your Mac → wall tablet dashboard.

## 1. Run go2rtc on your home network

Copy `scripts/go2rtc.example.yaml` and edit stream URLs for your home.

**Do not use Homebrew** unless it already works on that machine. The go2rtc project ships a **single binary** — best for an old Mac Mini with a broken `/usr/local` / Homebrew install.

### Check the host first

On the always-on Mac:

```bash
sw_vers          # macOS version
uname -m         # x86_64 = Intel, arm64 = Apple Silicon
```

Official **latest** go2rtc Mac builds require **macOS 12 (Monterey) or newer** (Go 1.25+). If you see:

```text
dyld: Symbol not found: _SecTrustCopyCertificateChain
  ... built for Mac OS X 12.0
```

your Mac is too old for the current release. Options:

1. **Run go2rtc on another LAN host** (recommended) — Raspberry Pi 4, NAS, or a newer Mac/PC that stays on 24/7.
2. **Try an older go2rtc release** (may work on macOS 11 Big Sur): [v1.9.4](https://github.com/AlexxIT/go2rtc/releases/tag/v1.9.4) or [v1.8.0](https://github.com/AlexxIT/go2rtc/releases/tag/v1.8.0) — download `go2rtc_mac_amd64.zip`, same steps as below.
3. **Upgrade the Mac Mini** to Monterey+ if Apple still supports that model.

Check version: `sw_vers` and `uname -m`.

### Option A — direct binary (recommended)

```bash
mkdir -p ~/go2rtc
cd ~/go2rtc

# Intel Mac:
curl -L -o go2rtc.zip https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_mac_amd64.zip

# Apple Silicon Mac — use this instead:
# curl -L -o go2rtc.zip https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_mac_arm64.zip

unzip -o go2rtc.zip
chmod +x go2rtc

# Copy config from this repo (or paste scripts/go2rtc.example.yaml)
cp /path/to/home-dashboard/scripts/go2rtc.example.yaml ./go2rtc.yaml

./go2rtc -config go2rtc.yaml
```

Open `http://<mac-ip>:1984` on another device on the same Wi‑Fi and confirm **front_door** plays.

Keep it running after logout (launchd plist in `~/Library/LaunchAgents/` with `RunAtLoad` + `KeepAlive`).

### Option B — Docker (newer Mac only)

```bash
docker run -d --name go2rtc \
  --restart unless-stopped \
  -p 1984:1984 -p 8555:8555/udp \
  -v "$PWD/go2rtc.yaml:/config/go2rtc.yaml" \
  alexxit/go2rtc
```

### Option C — Homebrew (optional)

Only if Homebrew is already healthy: `brew install go2rtc` (may not exist on old Homebrew taps — prefer Option A).

Example `go2rtc.yaml` (Starling Hub at `192.168.4.59`) — use **scalar** stream URLs (not `- list` form) if streams fail to load:

```yaml
streams:
  front_door: rtsp://192.168.4.59:554/EPNKEE
  dining_room: rtsp://192.168.4.59:554/QDQKPT
  kitchen: rtsp://192.168.4.59:554/NCVCKE
  living_room: rtsp://192.168.4.59:554/DBVBLP

api:
  listen: ":1984"
  origin: "*"

webrtc:
  listen: ":8555"
```

Avoid saving an empty **Config** tab in the go2rtc web UI before streams are defined — it can write `streams: null` and wipe your file.

Test in VLC first: `rtsp://192.168.4.59:554/EPNKEE`

Then open go2rtc UI: `http://<mac-ip>:1984` and confirm each stream plays.

## 2. HTTPS gateway (required for production dashboard)

The hub loads over **HTTPS** (`https://dashboard.lovely-home.co.uk`). Browsers block **HTTP** iframes/WebRTC from HTTPS pages (mixed content). The wall tablet must use **`https://<mac-ip>:8443`**, not `http://…:1984`.

go2rtc **1.9.4+** can terminate TLS natively — no nginx required on the Mac Mini.

### Step A — generate LAN certificates (no Homebrew)

On the Mac running go2rtc (set your reserved IP if auto-detect fails):

```bash
export LAN_IP=192.168.4.138
bash /path/to/home-dashboard/scripts/setup-go2rtc-https.sh
```

This downloads **mkcert**, creates `~/go2rtc/certs/cert.pem` + `key.pem` for your LAN IP.

### Step B — enable TLS in go2rtc.yaml

Add under `api:` (paths from the script output):

```yaml
api:
  listen: ":1984"
  tls_listen: ":8443"
  tls_cert: "/Users/Mark/go2rtc/certs/cert.pem"
  tls_key: "/Users/Mark/go2rtc/certs/key.pem"
  origin: "*"
```

Restart go2rtc. Test **`https://192.168.4.138:8443`** in Safari on the Mac, then on the wall tablet.

Keep **`http://…:1984`** for local debugging on the Mac if you want; the hub/tablet should use the **HTTPS** URL only.

### Step C — trust mkcert on the wall tablet (once)

The script prints the path to `rootCA.pem`. The tablet must trust this CA or the browser will block the go2rtc iframe.

**Android (Chrome on wall tablet)**

1. Copy `rootCA.pem` to the tablet (Google Drive, email, USB, or `adb push`).
2. **Settings → Security & privacy** (wording varies by OEM) → **Encryption & credentials** → **Install a certificate** → **CA certificate**.
3. Confirm the warning, pick `rootCA.pem`, install.
4. Re-open Chrome and test `https://192.168.4.138:8443`.

**iPad / iPhone (Safari)**

1. AirDrop or email `rootCA.pem` to the device.
2. **Settings → General → VPN & Device Management** → install profile.
3. **Settings → General → About → Certificate Trust Settings** → enable full trust for the mkcert root.

Without this step, the Cameras app tiles stay blank on an HTTPS dashboard even when go2rtc works on your Mac.

### Optional — basic auth

If TLS is enabled on LAN, consider protecting the go2rtc API:

```yaml
api:
  username: "owner"
  password: "choose-a-strong-password"
  local_auth: true
```

Lovely Home embeds `stream.html` in an iframe; if you enable auth, you may need to allow unauthenticated stream paths or use stream URLs with credentials — start without auth on a trusted LAN, firewall port 8443 to your subnet only.

### Alternatives

| Approach | When |
|----------|------|
| **go2rtc `tls_listen`** (above) | Old Mac Mini, no Homebrew — **recommended** |
| **Tailscale HTTPS** | Tablet and Mac on same tailnet |
| **nginx reverse proxy** | If you already run nginx with real certs |
| **HTTP only** | Local Vite dev (`localhost:5173`) — not for production tablet |

### Keep go2rtc running

See `scripts/go2rtc.launchd.plist.example` — copy to `~/Library/LaunchAgents/`, edit paths, `launchctl load …`.

## 3. Configure the hub

**Settings → Cameras** (owner mode):

1. Enable **Show Cameras app**
2. **Gateway URL** — `https://192.168.4.138:8443` (HTTPS LAN URL from step 2 above)
3. Add streams — **src** must match go2rtc.yaml keys (`front_door`, not the RTSP path)
4. Mark **Front door** as **Primary** for the home tile

Cameras off during the day (Nest privacy) is normal — tiles may stay blank until the cam powers up.

## Security

- Keep go2rtc on **LAN only** or behind TLS + network ACLs.
- Do not expose go2rtc `:1984` to the public internet without auth.
- Sitters never see the Cameras app; RTSP URLs stay in go2rtc config, not in the PWA.

## Related

- [cloudflare-access.md](./cloudflare-access.md) — owner vs sitter roles
- [architecture.md](./architecture.md) — app profiles
