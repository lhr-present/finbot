#!/bin/bash
set -e
echo "=== DEPLOYING TO VERCEL ==="
cd ~/projects/finbot
npm run build
vercel --prod
echo "=== DEPLOYED TO VERCEL ==="
