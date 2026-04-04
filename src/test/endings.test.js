// ─── resolveEnding + SPLIT_ENDINGS tests ─────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { resolveEnding } from '../engine/stateMachine.js';
import { SPLIT_ENDINGS } from '../engine/constants.js';

// ─── SPLIT_ENDINGS structure ─────────────────────────────────────────────────

describe('SPLIT_ENDINGS', () => {
  it('has 5 endings', () => {
    expect(SPLIT_ENDINGS).toHaveLength(5);
  });

  it('last ending is DEFAULT (always-true catch-all)', () => {
    const last = SPLIT_ENDINGS[SPLIT_ENDINGS.length - 1];
    expect(last.id).toBe('DEFAULT');
    expect(last.condition()).toBe(true);
  });

  it('each ending has required fields', () => {
    SPLIT_ENDINGS.forEach(e => {
      expect(e).toHaveProperty('id');
      expect(e).toHaveProperty('condition');
      expect(typeof e.condition).toBe('function');
      expect(e).toHaveProperty('cta');
    });
  });

  it('WEALTH_ARCHITECT requires OWNS_PROPERTY + HAS_INVESTMENTS + optimalRate≥70', () => {
    const e = SPLIT_ENDINGS.find(x => x.id === 'WEALTH_ARCHITECT');
    const gs = { flags: ['OWNS_PROPERTY', 'HAS_INVESTMENTS'], netWorth: 500000, disciplineScore: 80 };
    expect(e.condition(gs, [], 80)).toBe(true);
    // Fails without OWNS_PROPERTY
    expect(e.condition({ ...gs, flags: ['HAS_INVESTMENTS'] }, [], 80)).toBe(false);
    // Fails without HAS_INVESTMENTS
    expect(e.condition({ ...gs, flags: ['OWNS_PROPERTY'] }, [], 80)).toBe(false);
    // Fails if optimalRate < 70
    expect(e.condition(gs, [], 65)).toBe(false);
  });

  it('CAUTIONARY_TALE requires HAS_DEBT + ≥3 CATASTROPHIC choices', () => {
    const e = SPLIT_ENDINGS.find(x => x.id === 'CAUTIONARY_TALE');
    const history = [
      { choice: { quality: 'CATASTROPHIC' } },
      { choice: { quality: 'CATASTROPHIC' } },
      { choice: { quality: 'CATASTROPHIC' } },
    ];
    const gs = { flags: ['HAS_DEBT'], netWorth: 0, disciplineScore: 10 };
    expect(e.condition(gs, history, 10)).toBe(true);
    // Fails without HAS_DEBT
    expect(e.condition({ ...gs, flags: [] }, history, 10)).toBe(false);
    // Fails with only 2 catastrophic
    expect(e.condition(gs, history.slice(0, 2), 10)).toBe(false);
  });

  it('LUCKY_GAMBLER requires HIGH_RISK + netWorth≥400000', () => {
    const e = SPLIT_ENDINGS.find(x => x.id === 'LUCKY_GAMBLER');
    const gs = { flags: ['HIGH_RISK'], netWorth: 450000, disciplineScore: 30 };
    expect(e.condition(gs, [], 40)).toBe(true);
    // Fails without HIGH_RISK
    expect(e.condition({ ...gs, flags: [] }, [], 40)).toBe(false);
    // Fails if netWorth < 400000
    expect(e.condition({ ...gs, netWorth: 399999 }, [], 40)).toBe(false);
  });

  it('PATIENT_COMPOUNDER requires HAS_EMERGENCY_FUND + disciplineScore≥8', () => {
    const e = SPLIT_ENDINGS.find(x => x.id === 'PATIENT_COMPOUNDER');
    const gs = { flags: ['HAS_EMERGENCY_FUND'], netWorth: 200000, disciplineScore: 50 };
    expect(e.condition(gs, [], 50)).toBe(true);
    // Fails without HAS_EMERGENCY_FUND
    expect(e.condition({ ...gs, flags: [] }, [], 50)).toBe(false);
    // Fails if disciplineScore < 8
    expect(e.condition({ ...gs, disciplineScore: 7 }, [], 50)).toBe(false);
  });
});

// ─── resolveEnding ────────────────────────────────────────────────────────────

describe('resolveEnding', () => {
  it('returns DEFAULT when no conditions match', () => {
    const result = resolveEnding([], 100000, 30, []);
    expect(result.id).toBe('DEFAULT');
  });

  it('returns WEALTH_ARCHITECT for property + investments + high optimal rate', () => {
    const flags = ['OWNS_PROPERTY', 'HAS_INVESTMENTS'];
    const history = Array(10).fill({ choice: { quality: 'OPTIMAL' } });
    const result = resolveEnding(flags, 600000, 80, history);
    expect(result.id).toBe('WEALTH_ARCHITECT');
  });

  it('returns CAUTIONARY_TALE for debt + 3 catastrophic choices', () => {
    const flags = ['HAS_DEBT'];
    const history = [
      { choice: { quality: 'CATASTROPHIC' } },
      { choice: { quality: 'CATASTROPHIC' } },
      { choice: { quality: 'CATASTROPHIC' } },
      { choice: { quality: 'NEUTRAL' } },
    ];
    const result = resolveEnding(flags, 0, 10, history);
    expect(result.id).toBe('CAUTIONARY_TALE');
  });

  it('returns LUCKY_GAMBLER for high-risk flag with high net worth', () => {
    const flags = ['HIGH_RISK'];
    const history = Array(5).fill({ choice: { quality: 'POOR' } });
    const result = resolveEnding(flags, 420000, 20, history);
    expect(result.id).toBe('LUCKY_GAMBLER');
  });

  it('returns PATIENT_COMPOUNDER for emergency fund + discipline', () => {
    const flags = ['HAS_EMERGENCY_FUND'];
    const history = Array(6).fill({ choice: { quality: 'GOOD' } });
    const result = resolveEnding(flags, 180000, 60, history);
    expect(result.id).toBe('PATIENT_COMPOUNDER');
  });

  it('always returns an ending (never undefined)', () => {
    // Empty everything
    const result = resolveEnding([], 0, 0, []);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it('WEALTH_ARCHITECT fires only when optimalRate >= 70% (7/10 OPTIMAL)', () => {
    const flags = ['OWNS_PROPERTY', 'HAS_INVESTMENTS'];
    // 6/10 OPTIMAL = 60% — should NOT get WEALTH_ARCHITECT
    const history60 = [
      ...Array(6).fill({ choice: { quality: 'OPTIMAL' } }),
      ...Array(4).fill({ choice: { quality: 'POOR' } }),
    ];
    const r60 = resolveEnding(flags, 500000, 70, history60);
    expect(r60.id).not.toBe('WEALTH_ARCHITECT');

    // 7/10 OPTIMAL = 70% — should get WEALTH_ARCHITECT
    const history70 = [
      ...Array(7).fill({ choice: { quality: 'OPTIMAL' } }),
      ...Array(3).fill({ choice: { quality: 'POOR' } }),
    ];
    const r70 = resolveEnding(flags, 500000, 70, history70);
    expect(r70.id).toBe('WEALTH_ARCHITECT');
  });

  it('first matching condition wins (order matters)', () => {
    // Set up flags that could match WEALTH_ARCHITECT but also PATIENT_COMPOUNDER
    const flags = ['OWNS_PROPERTY', 'HAS_INVESTMENTS', 'HAS_EMERGENCY_FUND'];
    const history = Array(8).fill({ choice: { quality: 'OPTIMAL' } });
    const result = resolveEnding(flags, 500000, 80, history);
    // WEALTH_ARCHITECT comes first in the array
    expect(result.id).toBe('WEALTH_ARCHITECT');
  });

  it('DEFAULT has a non-null CTA', () => {
    const ending = resolveEnding([], 0, 0, []);
    expect(typeof ending.cta).toBe('string');
    expect(ending.cta.length).toBeGreaterThan(0);
  });
});
