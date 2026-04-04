# Changelog

All notable changes to FINBOT-9000 are documented here.

---

## [4.0.0] — 2026-04-05

### Architecture
- **P-01** Monolith split: `finbot-v3.jsx` (2,638 lines) refactored into render-only layer
- `src/engine/constants.js` — all pure data, utilities, styles
- `src/engine/scenarios.js` — Claude API client, prompt builder, JSON parser
- `src/engine/stateMachine.js` — archetype scorer, split-path ending resolver
- `src/engine/multiplayer.js` — localStorage-based session storage helpers
- `src/engine/store.js` — Zustand single store (55 fields, replaces all useState)
- `src/engine/sounds.js` — Web Audio API synthesiser, 12 sfx events, zero files
- `src/engine/supabase.js` — Supabase leaderboard (lazy dynamic import, localStorage fallback)
- `src/hooks/useGameEngine.js` — effects + handlers only, reads Zustand store via useShallow

### Features
- **P-03** Zustand state management — `resetGame()` is now a single `setState(initialState)` call; Zustand devtools in DEV mode
- **P-04** Web Audio sound engine — boot blip, card hover tick, choice click, outcome good/neutral/bad, ripple klaxon, market shift chime, timer warn at 10 s, timer expired, win/lose fanfare; ♪ toggle in HUD
- **P-05** framer-motion micro-animations — screen fade-up transitions, net worth counter flash on change, choice card stagger + hover scale, confidence pip pop-in stagger, RIPPLE/MARKET_SHIFT card slide-in
- **P-06** Supabase global leaderboard — `postScore`, `fetchGlobalTop10`, `fetchTop10ByDifficulty`; SDK lazy-loaded only when env vars present
- **P-07** Plausible analytics — `game_start`, `choice_made`, `game_end` events; script tag in `index.html` (commented until domain set)
- **Keyboard shortcuts** — `A/1` `B/2` `C/3` pick choices, `Enter` confirm, `Enter/Space` proceed through RIPPLE/MARKET_SHIFT, `M` toggle sound
- **useShallow** — Zustand subscription prevents re-renders on unrelated state changes

### Infrastructure
- **P-02** Vitest 2 test suite — 82 tests across 6 files
- **P-10** GitHub Actions CI — runs tests + build + bundle size guard (< 500 KB)
- **P-10** `vercel.json` — SPA rewrites, cache headers, Vite framework detection
- **P-10** Real PWA icons — terminal-themed 192 × 512 PNGs (Python Pillow)
- `.gitignore`, `.env.example`, `LICENSE`, `CHANGELOG.md`
- Bundle: 392 KB main / 195 KB Supabase chunk (lazy)

### Bug fixes
- Confidence meter stale-closure: pip click now passes rating directly to `confirmChoice(null, false, n)`
- Timer double-clear guard on `confirmChoice` (B-07)
- `flagDuration` built from scratch on each round (B-04)
- P1 disconnect detection via `beforeunload` + polling (B-05)

---

## [3.9.0]

- `biasWarning` normalisation — 10 display-name-only values; prompt enforces exact allowed list
- B-04 fix: `flagDuration` spread bug removed
- B-05: P1 `beforeunload` writes disconnect key; P2 polls every tick; timeout 60 s → 30 s

## [3.8.0]

- Obsidian Webhook: POST `localhost:7788/finbot-result` on END screen mount (fire-and-forget)
- `obsidian_webhook.py` — stdlib HTTP server, appends row to `~/FINBOT-9000.md`
- PM2 config (`ecosystem.config.cjs`) for webhook process
- B-07 fix: three `clearInterval` call sites guarded with `if (timerActive)`

## [3.7.0]

- Scenario Export: downloads `finbot-export-{callsign}-{date}.json` via Blob
- Calibration Blind Spot Report: fires when `calibScore < 40%` AND `overconfCount >= 3`

## [3.6.0]

- MARKET_SHIFT interrupt: typewriter reveal + rAF countdown bar + consequence text
- `MARKET_SHIFT_META` — 6 entries (BULL/BEAR/INFLATION/RECOVERY/STAGFLATION/BOOM)
- Ripple collision guard: market shift deferred when `isRippleScenario === true`

## [3.5.0]

- Confidence Meter: 5-pip selector post-choice; `calibrationLog` tracks confidence vs outcome
- Calibration scoring on END screen (avg confidence, calibration %, overconfident count)
- B-08 fix: `PATIENT_COMPOUNDER` threshold corrected

## [3.4.0]

- AbortController 12 s timeout on Claude API calls (B-01 fix)
- Split-path endings: 5 variants (WEALTH_ARCHITECT / CAUTIONARY_TALE / LUCKY_GAMBLER / PATIENT_COMPOUNDER / DEFAULT)
- Prompt tuning: CATASTROPHIC ≥ 2× NEUTRAL spread; biasWarning normalisation pass 1

## [3.3.0]

- Seed Mode: `?seed=XXXX` URL param → deterministic category/bias sequence
- Ripple Events: 4 triggers (HAS_DEBT × 3, HAS_INVESTMENTS × 3, HIGH_RISK × 2, HAS_EMERGENCY_FUND × 4)
- Time Pressure: 45 s countdown; worst choice forced on expiry; decision speed analysis on END
- 2-Player Sync: 4-char session codes, LOBBY screen, HEAD TO HEAD panel

## [3.1.0]

- Initial public feature set: Financial DNA, 3 difficulty modes, market regime shifts every 4 rounds
- localStorage leaderboard (top 10), bias panel, split-path endings, OFFLINE_SCENARIOS (12)
- Voice Narration (Web Speech API), Mobile PWA (`vite-plugin-pwa`), Replay Analyzer
