#!/bin/bash
set -e
# itch.io deploy via butler
# One-time setup: butler login
# Set ITCH_USER to your itch.io username
ITCH_USER="${ITCH_USER:-hlnxs1}"
GAME_SLUG="finbot-9000"
CHANNEL="html5"

echo "=== DEPLOYING TO ITCH.IO ==="
cd ~/projects/finbot
npm run build
butler push dist/ "${ITCH_USER}/${GAME_SLUG}:${CHANNEL}"
echo "=== DEPLOYED: https://${ITCH_USER}.itch.io/${GAME_SLUG} ==="
