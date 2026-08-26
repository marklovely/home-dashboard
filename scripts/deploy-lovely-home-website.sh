#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v wrangler >/dev/null 2>&1; then
  WRANGLER=(wrangler)
else
  WRANGLER=(npx wrangler)
fi

"${WRANGLER[@]}" pages deploy ./website --project-name lovely-home --branch main --commit-dirty=true

echo
echo "Home:     https://lovely-home.co.uk/"
echo "Gallery:  https://lovely-home.co.uk/app.html"
echo "Support:  https://lovely-home.co.uk/support.html"
echo "Privacy:  https://lovely-home.co.uk/privacy.html"
echo
echo "If the custom domain is not attached yet, add lovely-home.co.uk in Cloudflare Pages → lovely-home → Custom domains."
