// ─── reinforcement.js tests ───────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ACHIEVEMENTS,
  checkNewAchievements,
  getDailyKey,
  getDailySeed,
  isDailyDone,
  markDailyDone,
  loadStreak,
  incrementStreak,
  loadPersonalBests,
  updatePersonalBest,
  loadAchievements,
  saveAchievements,
} from '../engine/reinforcement.js';

// ─── localStorage mock ────────────────────────────────────────────────────────
let store = {};
beforeEach(() => {
  store = {};
  globalThis.window = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } } };
  globalThis.localStorage = globalThis.window.localStorage;
});
afterEach(() => { delete globalThis.window; delete globalThis.localStorage; });

// ─── ACHIEVEMENTS array ───────────────────────────────────────────────────────
describe('ACHIEVEMENTS', () => {
  it('exports 8 achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(8);
  });

  it('each achievement has id, icon, label, desc, check', () => {
    ACHIEVEMENTS.forEach(a => {
      expect(typeof a.id).toBe('string');
      expect(typeof a.icon).toBe('string');
      expect(typeof a.label).toBe('string');
      expect(typeof a.desc).toBe('string');
      expect(typeof a.check).toBe('function');
    });
  });

  it('all IDs are unique', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── checkNewAchievements ─────────────────────────────────────────────────────
describe('checkNewAchievements', () => {
  const baseStats = { catastrophicCount: 0, totalRounds: 6 };
  const history6Optimal = Array(6).fill(null).map((_, i) => ({ round: i+1, choice: { quality: 'OPTIMAL', biasWarning: null } }));

  it('unlocks FIRST_RUN on any completed run', () => {
    const newIds = checkNewAchievements([], { stats: baseStats, archGrade: 'B', history: [], endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).toContain('FIRST_RUN');
  });

  it('does not re-unlock already-unlocked achievements', () => {
    const newIds = checkNewAchievements(['FIRST_RUN'], { stats: baseStats, archGrade: 'B', history: [], endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).not.toContain('FIRST_RUN');
  });

  it('unlocks CLEAN_SLATE when no catastrophic and 5+ rounds', () => {
    const newIds = checkNewAchievements([], { stats: { catastrophicCount: 0, totalRounds: 6 }, archGrade: 'B', history: [], endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).toContain('CLEAN_SLATE');
  });

  it('does NOT unlock CLEAN_SLATE when catastrophicCount > 0', () => {
    const newIds = checkNewAchievements([], { stats: { catastrophicCount: 1, totalRounds: 6 }, archGrade: 'B', history: [], endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).not.toContain('CLEAN_SLATE');
  });

  it('does NOT unlock CLEAN_SLATE when totalRounds < 5', () => {
    const newIds = checkNewAchievements([], { stats: { catastrophicCount: 0, totalRounds: 3 }, archGrade: 'B', history: [], endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).not.toContain('CLEAN_SLATE');
  });

  it('unlocks APEX when grade is S', () => {
    const newIds = checkNewAchievements([], { stats: baseStats, archGrade: 'S', history: [], endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).toContain('APEX');
  });

  it('unlocks SPEED_DAEMON in pressure mode with 5+ rounds', () => {
    const newIds = checkNewAchievements([], { stats: { ...baseStats, totalRounds: 6 }, archGrade: 'B', history: [], endingId: 'DEFAULT', pressureMode: true });
    expect(newIds).toContain('SPEED_DAEMON');
  });

  it('does NOT unlock SPEED_DAEMON without pressure mode', () => {
    const newIds = checkNewAchievements([], { stats: baseStats, archGrade: 'B', history: [], endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).not.toContain('SPEED_DAEMON');
  });

  it('unlocks COMPOUNDER for PATIENT_COMPOUNDER ending', () => {
    const newIds = checkNewAchievements([], { stats: baseStats, archGrade: 'B', history: [], endingId: 'PATIENT_COMPOUNDER', pressureMode: false });
    expect(newIds).toContain('COMPOUNDER');
  });

  it('unlocks ARCHITECT for WEALTH_ARCHITECT ending', () => {
    const newIds = checkNewAchievements([], { stats: baseStats, archGrade: 'B', history: [], endingId: 'WEALTH_ARCHITECT', pressureMode: false });
    expect(newIds).toContain('ARCHITECT');
  });

  it('unlocks BIAS_MAGNET when 5+ rounds have bias warnings', () => {
    const biasHistory = Array(5).fill(null).map((_, i) => ({ round: i+1, choice: { quality: 'POOR', biasWarning: 'FOMO' } }));
    const newIds = checkNewAchievements([], { stats: baseStats, archGrade: 'B', history: biasHistory, endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).toContain('BIAS_MAGNET');
  });

  it('unlocks PERFECT_RUN when all 6 choices OPTIMAL', () => {
    const newIds = checkNewAchievements([], { stats: baseStats, archGrade: 'S', history: history6Optimal, endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).toContain('PERFECT_RUN');
  });

  it('does NOT unlock PERFECT_RUN if any non-OPTIMAL choice', () => {
    const mixed = [...history6Optimal.slice(0, 5), { round: 6, choice: { quality: 'POOR', biasWarning: null } }];
    const newIds = checkNewAchievements([], { stats: baseStats, archGrade: 'B', history: mixed, endingId: 'DEFAULT', pressureMode: false });
    expect(newIds).not.toContain('PERFECT_RUN');
  });

  it('can unlock multiple achievements at once', () => {
    const newIds = checkNewAchievements([], { stats: { catastrophicCount: 0, totalRounds: 6 }, archGrade: 'S', history: history6Optimal, endingId: 'DEFAULT', pressureMode: true });
    expect(newIds.length).toBeGreaterThanOrEqual(4); // FIRST_RUN, CLEAN_SLATE, APEX, SPEED_DAEMON, PERFECT_RUN
  });
});

// ─── Daily challenge ──────────────────────────────────────────────────────────
describe('getDailyKey / getDailySeed', () => {
  it('getDailyKey returns YYYY-MM-DD format', () => {
    expect(getDailyKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getDailySeed returns a non-empty string', () => {
    const seed = getDailySeed();
    expect(typeof seed).toBe('string');
    expect(seed.length).toBeGreaterThan(0);
  });

  it('getDailySeed is deterministic within the same day', () => {
    expect(getDailySeed()).toBe(getDailySeed());
  });
});

describe('isDailyDone / markDailyDone', () => {
  it('starts as not done', () => {
    expect(isDailyDone()).toBe(false);
  });

  it('marks done and confirms', () => {
    markDailyDone('A', 300000);
    expect(isDailyDone()).toBe(true);
  });
});

// ─── Streak ───────────────────────────────────────────────────────────────────
describe('loadStreak / incrementStreak', () => {
  it('loadStreak returns 0 when no data', () => {
    expect(loadStreak()).toBe(0);
  });

  it('incrementStreak starts streak at 1', () => {
    const count = incrementStreak();
    expect(count).toBe(1);
  });

  it('incrementStreak is idempotent on same day', () => {
    incrementStreak();
    const count = incrementStreak();
    expect(count).toBe(1);
  });

  it('loadStreak returns 1 after first increment', () => {
    incrementStreak();
    expect(loadStreak()).toBe(1);
  });
});

// ─── Personal Bests ───────────────────────────────────────────────────────────
describe('loadPersonalBests / updatePersonalBest', () => {
  it('loadPersonalBests returns empty object when no data', () => {
    expect(loadPersonalBests()).toEqual({});
  });

  it('updatePersonalBest sets new entry when none exists', () => {
    const updated = updatePersonalBest({}, 'BALANCED', 300000, 'A');
    expect(updated.BALANCED.netWorth).toBe(300000);
    expect(updated.BALANCED.grade).toBe('A');
  });

  it('updatePersonalBest replaces when new run beats old', () => {
    const first = updatePersonalBest({}, 'BALANCED', 300000, 'A');
    const second = updatePersonalBest(first, 'BALANCED', 500000, 'S');
    expect(second.BALANCED.netWorth).toBe(500000);
    expect(second.BALANCED.grade).toBe('S');
  });

  it('updatePersonalBest does NOT replace when new run is worse', () => {
    const first = updatePersonalBest({}, 'BALANCED', 500000, 'S');
    const second = updatePersonalBest(first, 'BALANCED', 200000, 'C');
    expect(second.BALANCED.netWorth).toBe(500000);
    expect(second.BALANCED.grade).toBe('S');
  });

  it('persists to localStorage', () => {
    updatePersonalBest({}, 'AGGRESSIVE', 900000, 'S');
    const loaded = loadPersonalBests();
    expect(loaded.AGGRESSIVE.netWorth).toBe(900000);
  });
});

// ─── Achievement persistence ──────────────────────────────────────────────────
describe('loadAchievements / saveAchievements', () => {
  it('loadAchievements returns empty array when no data', () => {
    expect(loadAchievements()).toEqual([]);
  });

  it('saveAchievements persists and loadAchievements reads back', () => {
    saveAchievements(['FIRST_RUN', 'APEX']);
    expect(loadAchievements()).toEqual(['FIRST_RUN', 'APEX']);
  });
});
