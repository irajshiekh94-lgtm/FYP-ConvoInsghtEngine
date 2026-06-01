#!/bin/bash
# Print and optionally write EXPO_PUBLIC_API_URL for physical-device testing.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IP=""
for iface in en0 en1; do
  IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  [ -n "$IP" ] && break
done
if [ -z "$IP" ]; then
  echo "Could not detect LAN IP. Set EXPO_PUBLIC_API_URL manually in frontend/.env"
  exit 1
fi
URL="http://${IP}:8000"
echo "API URL for physical device: $URL"
if [ "${1:-}" = "--write" ]; then
  printf '%s\n' "EXPO_PUBLIC_API_URL=$URL" > "$ROOT/frontend/.env"
  echo "Wrote $ROOT/frontend/.env"
fi
