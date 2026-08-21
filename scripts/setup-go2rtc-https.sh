#!/usr/bin/env bash
# Generate LAN-trusted TLS certs for go2rtc (mkcert binary — no Homebrew).
#
# Usage (on the Mac running go2rtc):
#   export LAN_IP=192.168.4.138   # optional; auto-detected from en0/en1
#   bash setup-go2rtc-https.sh
#
# Then add tls_listen / tls_cert / tls_key to ~/go2rtc/go2rtc.yaml (see scripts/go2rtc.example.yaml),
# restart go2rtc, and open https://<LAN_IP>:8443 on the wall tablet.
#
# Trust the mkcert root CA on the wall tablet (once) — see docs/cameras-go2rtc.md.
set -euo pipefail

GO2RTC_DIR="${GO2RTC_DIR:-$HOME/go2rtc}"
CERT_DIR="$GO2RTC_DIR/certs"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) MKCERT_FOR=darwin/amd64 ;;
  arm64) MKCERT_FOR=darwin/arm64 ;;
  *)
    echo "Unsupported arch: $ARCH" >&2
    exit 1
    ;;
esac

LAN_IP="${LAN_IP:-}"
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
fi
if [[ -z "$LAN_IP" ]]; then
  LAN_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [[ -z "$LAN_IP" ]]; then
  echo "Could not detect LAN IP. Export LAN_IP=192.168.x.x and re-run." >&2
  exit 1
fi

mkdir -p "$CERT_DIR"
MKCERT_BIN="$GO2RTC_DIR/mkcert"

if [[ ! -x "$MKCERT_BIN" ]]; then
  echo "==> Downloading mkcert for $MKCERT_FOR"
  # dl.filippo.io serves the raw binary (not a zip).
  curl -fsSL -o "$MKCERT_BIN" "https://dl.filippo.io/mkcert/latest?for=${MKCERT_FOR}"
  chmod +x "$MKCERT_BIN"
  if ! "$MKCERT_BIN" -help >/dev/null 2>&1; then
    echo "mkcert download failed or binary not executable — check $MKCERT_BIN" >&2
    exit 1
  fi
fi

echo "==> Installing mkcert local CA (Mac browsers trust this automatically)"
"$MKCERT_BIN" -install

echo "==> Generating cert for $LAN_IP localhost 127.0.0.1"
"$MKCERT_BIN" -cert-file "$CERT_DIR/cert.pem" -key-file "$CERT_DIR/key.pem" \
  "$LAN_IP" localhost 127.0.0.1

CAROOT="$("$MKCERT_BIN" -CAROOT)"

cat <<EOF

Done.

Certs:
  $CERT_DIR/cert.pem
  $CERT_DIR/key.pem

Add to ~/go2rtc/go2rtc.yaml under api::

  tls_listen: ":8443"
  tls_cert: "$CERT_DIR/cert.pem"
  tls_key: "$CERT_DIR/key.pem"

Restart go2rtc, then test:
  https://${LAN_IP}:8443

Hub Settings → Cameras gateway URL:
  https://${LAN_IP}:8443

Trust mkcert on the wall tablet (once):
  File: ${CAROOT}/rootCA.pem

  Android: copy to tablet → Settings → Security → Install certificate → CA certificate
  iPad: AirDrop → install profile → Certificate Trust Settings → enable trust

  See docs/cameras-go2rtc.md for OEM-specific paths.

EOF
