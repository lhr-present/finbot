#!/usr/bin/env bash
# FINBOT-9000 · Ubuntu Install & Launch Script
# Requirements: Node 20+, npm, Firefox
# Usage: bash install.sh

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}┌─────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│  FINBOT-9000 v3.2 · Install & Launch   │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────┘${NC}"
echo ""

# ─── Check Node ──────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js not found. Install Node 20+ first:${NC}"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}✗ Node $NODE_VER found. Need Node 18+. Please upgrade.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node $(node -v) detected${NC}"

# ─── npm install ─────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --silent
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ─── .env setup ──────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo -e "${YELLOW}┌─ API KEY SETUP ─────────────────────────────────────────┐${NC}"
  echo -e "${YELLOW}│ Enter your Anthropic API key (sk-ant-...)               │${NC}"
  echo -e "${YELLOW}│ Press ENTER to skip → runs in OFFLINE MODE (12 scenarios)│${NC}"
  echo -e "${YELLOW}└─────────────────────────────────────────────────────────┘${NC}"
  read -rp "  API key: " API_KEY
  if [ -n "$API_KEY" ]; then
    sed -i "s|sk-ant-api03-your-key-here|${API_KEY}|g" .env
    echo -e "${GREEN}✓ API key saved to .env${NC}"
  else
    echo -e "${YELLOW}⚠ No key entered — OFFLINE MODE active${NC}"
  fi
fi

# ─── Obsidian sync (optional background process) ─────────────────────────────
echo ""
echo -e "${YELLOW}┌─ OBSIDIAN SYNC ─────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│ Start the Obsidian sync server? (appends game results   │${NC}"
echo -e "${YELLOW}│ to your vault after each run)                           │${NC}"
echo -e "${YELLOW}└─────────────────────────────────────────────────────────┘${NC}"
read -rp "  Vault path (ENTER to skip): " VAULT_PATH

if [ -n "$VAULT_PATH" ]; then
  # Update .env with vault path
  sed -i "s|/home/hlnx4/Obsidian/FINBOT-9000.md|${VAULT_PATH}|g" .env
  echo -e "${GREEN}✓ Starting Obsidian sync server on :3001...${NC}"
  OBSIDIAN_VAULT_FILE="$VAULT_PATH" node obsidian-sync.js "$VAULT_PATH" &
  SYNC_PID=$!
  echo -e "${GREEN}✓ Sync server PID: $SYNC_PID${NC}"
  echo "  Stop with: kill $SYNC_PID"
  sleep 0.5
else
  echo -e "${YELLOW}⚠ Obsidian sync skipped${NC}"
fi

# ─── Launch ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─ LAUNCHING ─────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│  Game:  http://localhost:3000                           │${NC}"
echo -e "${CYAN}│  Stop:  Ctrl+C                                         │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

# Open Firefox after a short delay (Vite takes ~1s to boot)
(sleep 2 && firefox http://localhost:3000 2>/dev/null) &

npm run dev
