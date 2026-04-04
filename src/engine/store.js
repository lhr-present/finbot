// ─── FINBOT-9000 ZUSTAND STORE ────────────────────────────────────────────────
// Single source of truth for all game state.
// Refs, effects, and handlers stay in useGameEngine (they require React context).

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const initialState = {
  // Core
  screen:               "BOOT",
  difficulty:           null,
  apiKey:               (typeof import.meta !== "undefined" ? (import.meta.env?.VITE_ANTHROPIC_API_KEY || "") : ""),
  netWorth:             0,
  round:                0,
  dna:                  { flags: new Set(), riskScore: 0, disciplineScore: 0 },
  scenario:             null,
  chosen:               null,
  loading:              false,
  apiError:             "",
  usedFallback:         false,
  history:              [],
  biasHistory:          [],
  marketIdx:            0,
  pendingMarketShift:   null,
  marketShiftRevealIdx: 0,
  catHistory:           [],
  showBias:             false,
  leaderboard:          [],
  endData:              null,
  bootText:             "",
  callsign:             "",
  callsignSaved:        false,
  // Seed
  seedValue:            "",
  seedMode:             false,
  shareableSeed:        "",
  copied:               false,
  // Ripple Events
  flagDuration:         {},
  firedRipples:         [],
  activeRipple:         null,
  isRippleScenario:     false,
  rippleProgress:       0,
  // Time Pressure
  pressureMode:         false,
  timeLeft:             45,
  timerActive:          false,
  timeExpired:          false,
  decisionTimes:        [],
  lastChoiceForcedByTimer: false,
  // Confidence Meter
  pendingConfidence:    false,
  confidenceRating:     null,
  hoverConfidence:      null,
  calibrationLog:       [],
  // Features
  narrationOn:          false,
  soundOn:              true,
  replayData:           null,
  analyzerError:        "",
  roundLogOpen:         false,
  installPrompt:        null,
  // Multiplayer
  multiMode:            false,
  sessionCode:          "",
  playerNum:            1,
  sessionPhase:         "LOBBY",
  p2NetWorth:           0,
  p2Choice:             null,
  p2Quality:            null,
  p2Outcome:            null,
  p2NetEffect:          null,
  lobbyCode:            "",
  lobbyError:           "",
  storageOk:            true,
  spinFrame:            0,
};

export const useGameStore = create(
  devtools(
    () => ({ ...initialState }),
    { name: 'FINBOT-9000', enabled: import.meta.env?.DEV ?? false }
  )
);

// Static setState shorthand — works anywhere, no stale closure risk
export const st  = (partial) => useGameStore.setState(partial);
export const stf = (fn)      => useGameStore.setState(fn);
export const get = ()        => useGameStore.getState();
