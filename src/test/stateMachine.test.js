// ─── P-02: stateMachine tests ────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { computeArchetype } from '../engine/stateMachine.js';

const base = {
  optimalRate: 0,
  catastrophicCount: 0,
  disciplineScore: 50,
  highRiskChoices: 0,
  secondHalfOptimal: 0,
  firstHalfOptimal: 0,
  finalNetWorth: 100000,
  target: 500000,
};

describe('computeArchetype', () => {
  it('S grade: Wealth Architect — hits target + ≥70% optimal + discipline≥70', () => {
    const arch = computeArchetype({ ...base, optimalRate: 0.75, disciplineScore: 75, finalNetWorth: 500001, target: 500000 });
    expect(arch.grade).toBe('S');
    expect(arch.title).toBe('The Wealth Architect');
  });

  it('A grade: Steady Builder — 60%+ optimal, zero catastrophic', () => {
    const arch = computeArchetype({ ...base, optimalRate: 0.65, catastrophicCount: 0 });
    expect(arch.grade).toBe('A');
    expect(arch.title).toBe('The Steady Builder');
  });

  it('B grade: Pattern Recognizer — second half better than first, ≥50%', () => {
    const arch = computeArchetype({
      ...base, optimalRate: 0.4, catastrophicCount: 0,
      secondHalfOptimal: 0.6, firstHalfOptimal: 0.2,
    });
    expect(arch.grade).toBe('B');
    expect(arch.title).toBe('The Pattern Recognizer');
  });

  it('C grade: Lucky Gambler — ≥3 high-risk choices, net worth > 0', () => {
    const arch = computeArchetype({ ...base, optimalRate: 0.3, highRiskChoices: 4, finalNetWorth: 50000 });
    expect(arch.grade).toBe('C');
    expect(arch.title).toBe('The Lucky Gambler');
  });

  it('D grade: Cautionary Tale — ≥3 catastrophic choices', () => {
    const arch = computeArchetype({ ...base, optimalRate: 0.2, catastrophicCount: 3 });
    expect(arch.grade).toBe('D');
    expect(arch.title).toBe('The Cautionary Tale');
  });

  it('C- grade: Avoider — default fallthrough', () => {
    const arch = computeArchetype({ ...base, optimalRate: 0.1, catastrophicCount: 1, highRiskChoices: 1 });
    expect(arch.grade).toBe('C-');
    expect(arch.title).toBe('The Avoider');
  });

  it('S grade requires ALL conditions — misses on disciplineScore', () => {
    const arch = computeArchetype({ ...base, optimalRate: 0.75, disciplineScore: 65, finalNetWorth: 500001, target: 500000 });
    expect(arch.grade).not.toBe('S');
  });

  it('S grade requires ALL conditions — misses on optimalRate', () => {
    const arch = computeArchetype({ ...base, optimalRate: 0.65, disciplineScore: 75, finalNetWorth: 500001, target: 500000 });
    expect(arch.grade).not.toBe('S');
  });

  it('A grade blocked by any catastrophic choice', () => {
    const arch = computeArchetype({ ...base, optimalRate: 0.65, catastrophicCount: 1 });
    expect(arch.grade).not.toBe('A');
  });

  it('returns object with title, desc, color, grade', () => {
    const arch = computeArchetype(base);
    expect(arch).toHaveProperty('title');
    expect(arch).toHaveProperty('desc');
    expect(arch).toHaveProperty('color');
    expect(arch).toHaveProperty('grade');
  });
});
