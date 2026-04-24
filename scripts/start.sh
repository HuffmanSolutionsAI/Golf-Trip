#!/usr/bin/env bash
# Start the N&P Invitational app on the mac mini.
# - Loads env from .env.local
# - Runs the production Next build on port 3000
# - Listens on 127.0.0.1 only; Cloudflare Tunnel reaches it over loopback.

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local not found. Copy .env.example and fill in TRIP_PASSCODE + SESSION_SECRET."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env.local
set +a

mkdir -p data

if [[ ! -d .next ]]; then
  echo "No build found — running pnpm build first…"
  pnpm build
fi

echo "Starting Next.js on http://127.0.0.1:3000"
exec node_modules/.bin/next start -H 127.0.0.1 -p 3000
