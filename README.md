# FINBOT-9000

> Post-Terminal Financial Decision Vault

A financial decision simulator that teaches cognitive bias awareness through AI-generated scenarios. Each playthrough builds a Financial DNA profile, reacts to market regime shifts, and ends with a scored archetype and calibration report.

---

## Quick start

```bash
cp .env.example .env
# Add your Anthropic API key to .env
npm install
npm run dev        # http://localhost:3000
```

Without an API key the game runs in **OFFLINE MODE** using 12 built-in fallback scenarios (one per category).

---

## Features

| Feature | Description |
|---------|-------------|
| **Financial DNA** | Flags accumulate across rounds and alter future scenarios |
| **Cognitive bias detection** | 10 biases tracked per choice; bias panel in HUD |
| **Ripple Events** | 4 flag-threshold triggers interrupt normal gameplay |
| **Market Shifts** | Regime changes every 4 rounds (BULL / BEAR / INFLATION / RECOVERY) |
| **Time Pressure** | Optional 45 s countdown; worst choice forced on expiry |
| **Confidence Meter** | 5-pip calibration scoring — how well does your confidence predict quality? |
| **Seed Mode** | Reproducible runs via `?seed=XXXX` URL param — share identical playthroughs |
| **2-Player Sync** | Real-time head-to-head via shared localStorage session codes |
| **Voice Narration** | Web Speech API reads scenario text |
| **Replay Analyzer** | Load any exported JSON to view net worth curve, confidence scatter, bias bars |
| **PWA** | Installable, offline-capable (12 fallback scenarios cached by service worker) |
| **Sound FX** | Programmatic Web Audio synthesis — no audio files shipped |
| **Keyboard shortcuts** | `A/B/C` or `1/2/3` to pick · `Enter` to confirm · `M` to mute |

---

## Difficulty modes

| Mode | Start | Target | Rounds |
|------|-------|--------|--------|
| CONSERVATIVE | $8,000 | $200,000 | 15 |
| BALANCED | $12,500 | $500,000 | 12 |
| AGGRESSIVE | $25,000 | $1,000,000 | 10 |

---

## Architecture

```
src/
  finbot-v3.jsx           Render layer only (~730 lines)
  hooks/
    useGameEngine.js      React effects + handlers (reads Zustand store)
  engine/
    store.js              Zustand store — 55 state fields
    constants.js          Pure data: difficulties, categories, biases, endings, fallbacks
    scenarios.js          Claude API client, prompt builder, JSON parser
    stateMachine.js       computeArchetype(), resolveEnding()
    multiplayer.js        localStorage session storage helpers
    sounds.js             Web Audio synthesiser — 12 sfx events
    supabase.js           Global leaderboard (lazy dynamic import)
  test/
    constants.test.js     29 tests
    scenarios.test.js     13 tests
    stateMachine.test.js  10 tests
    endings.test.js       16 tests
    store.test.js          9 tests
    supabase.test.js       5 tests
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_ANTHROPIC_API_KEY` | No | Claude API key. Without it, game uses offline scenarios. |
| `VITE_SUPABASE_URL` | No | Enables global leaderboard. See schema in `src/engine/supabase.js`. |
| `VITE_SUPABASE_ANON_KEY` | No | Required with `VITE_SUPABASE_URL`. |

---

## Scripts

```bash
npm run dev          # Dev server on :3000
npm run build        # Production build → dist/
npm test             # Run 82-test suite (Vitest)
npm run test:watch   # Watch mode
npm run test:ui      # Vitest UI
npm run preview      # Preview production build
```

---

## Deploy (Vercel)

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com) — Vite auto-detected
3. Set env vars in Vercel dashboard:
   - `VITE_ANTHROPIC_API_KEY`
   - `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (optional)
4. Activate Plausible: uncomment the script tag in `index.html`, set `data-domain`

---

## Supabase leaderboard setup

Run once in Supabase SQL editor (schema is also in `src/engine/supabase.js`):

```sql
create table if not exists leaderboard (
  id           bigserial primary key,
  callsign     text,
  net_worth    bigint    not null,
  archetype    text      not null,
  grade        text      not null,
  difficulty   text      not null,
  optimal_rate real,
  played_at    timestamptz default now()
);

alter table leaderboard enable row level security;
create policy "public read"   on leaderboard for select using (true);
create policy "public insert" on leaderboard for insert with check (true);
create index on leaderboard (net_worth desc);
```

---

## Obsidian session logging (optional)

Start the webhook server before playing:

```bash
python3 obsidian_webhook.py &
# or via PM2:
pm2 start ecosystem.config.cjs
```

Each completed game POSTs a JSON payload to `localhost:7788/finbot-result` and appends a row to `~/FINBOT-9000.md`.

---

## License

MIT
