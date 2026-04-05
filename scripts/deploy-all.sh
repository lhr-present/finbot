#!/bin/bash
set -e
echo "=== FULL DEPLOYMENT ==="
cd ~/projects/finbot

# Tests must pass first
npm test
npx eslint src/ --max-warnings 20

# Build once
npm run build

# Check bundle
MAIN_KB=$(du -k dist/assets/index-*.js | awk '{sum+=$1} END{print sum}')
TOTAL_KB=$(du -k dist/assets/*.js dist/assets/chunks/*.js 2>/dev/null | awk '{sum+=$1} END{print sum}')
echo "Bundle: main ${MAIN_KB}KB | total JS ${TOTAL_KB}KB"
[ "$MAIN_KB" -le 500 ] || { echo "ERROR: main bundle over 500KB"; exit 1; }

# Deploy to Vercel (primary)
echo "[1/2] Vercel..."
vercel --prod

# Deploy to itch.io (if butler is logged in)
if command -v butler &> /dev/null; then
  echo "[2/2] itch.io..."
  ITCH_USER="${ITCH_USER:-hlnxs1}"
  butler push dist/ "${ITCH_USER}/finbot-9000:html5"
else
  echo "[2/2] butler not found — skipping itch.io"
fi

# Git tag
VERSION=$(node -p "require('./package.json').version")
git tag -a "v${VERSION}-$(date +%Y%m%d)" -m "Release ${VERSION}" 2>/dev/null || true

echo "=== ALL PLATFORMS DEPLOYED ==="
