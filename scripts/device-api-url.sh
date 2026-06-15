#!/bin/bash
# Print LAN IP for manual testing. Dev app auto-detects IP from Expo — no .env write needed.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IP=""
for iface in en0 en1; do
  IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  [ -n "$IP" ] && break
done
if [ -z "$IP" ]; then
  echo "Could not detect LAN IP."
  exit 1
fi
URL="http://${IP}:8000"
echo "Backend should listen on: $URL"
echo "Expo app auto-detects this in dev — you do NOT need to edit frontend/.env."
if [ "${1:-}" = "--write" ]; then
  printf '%s\n' "# EXPO_PUBLIC_API_URL=$URL" > "$ROOT/frontend/.env"
  echo "Wrote minimal $ROOT/frontend/.env (auto-detect enabled)"
fi
