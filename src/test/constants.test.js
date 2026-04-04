// ─── P-02: constants tests ────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import {
  DIFFICULTIES, CATEGORIES, BIAS_POOL, QUALITY_META,
  BIAS_EXPLANATIONS, COGNITIVE_BIASES, RIPPLE_TRIGGERS,
  hashSeed, fmt, qualityColor,
} from '../engine/constants.js';
// qualityColor is a plain object { OPTIMAL: '#...', ... }

describe('DIFFICULTIES', () => {
  it('has exactly 3 modes', () => {
    expect(Object.keys(DIFFICULTIES)).toHaveLength(3);
  });

  it('CONSERVATIVE starts at 8000 targeting 200000 over 15 rounds', () => {
    const d = DIFFICULTIES.CONSERVATIVE;
    expect(d.startNetWorth).toBe(8000);
    expect(d.target).toBe(200000);
    expect(d.rounds).toBe(15);
  });

  it('BALANCED starts at 12500 targeting 500000 over 12 rounds', () => {
    const d = DIFFICULTIES.BALANCED;
    expect(d.startNetWorth).toBe(12500);
    expect(d.target).toBe(500000);
    expect(d.rounds).toBe(12);
  });

  it('AGGRESSIVE starts at 25000 targeting 1000000 over 10 rounds', () => {
    const d = DIFFICULTIES.AGGRESSIVE;
    expect(d.startNetWorth).toBe(25000);
    expect(d.target).toBe(1000000);
    expect(d.rounds).toBe(10);
  });

  it('each difficulty has required fields', () => {
    Object.values(DIFFICULTIES).forEach(d => {
      expect(d).toHaveProperty('label');
      expect(d).toHaveProperty('startNetWorth');
      expect(d).toHaveProperty('target');
      expect(d).toHaveProperty('rounds');
      expect(d).toHaveProperty('startingFlags');
    });
  });
});

describe('CATEGORIES', () => {
  it('has 12 categories', () => {
    expect(CATEGORIES).toHaveLength(12);
  });

  it('contains expected core categories', () => {
    ['INVESTING', 'DEBT', 'HOUSING', 'INCOME', 'CAREER'].forEach(c => {
      expect(CATEGORIES).toContain(c);
    });
  });

  it('all entries are non-empty strings', () => {
    CATEGORIES.forEach(c => {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    });
  });
});

describe('BIAS_POOL', () => {
  it('has 10 bias entries', () => {
    expect(BIAS_POOL).toHaveLength(10);
  });

  it('contains all display-name biases (no underscores)', () => {
    BIAS_POOL.forEach(b => {
      expect(b).not.toContain('_');
    });
  });
});

describe('QUALITY_META', () => {
  it('has 5 quality levels', () => {
    expect(Object.keys(QUALITY_META)).toHaveLength(5);
  });

  it('rank ordering is OPTIMAL > GOOD > NEUTRAL > POOR > CATASTROPHIC', () => {
    const { OPTIMAL, GOOD, NEUTRAL, POOR, CATASTROPHIC } = QUALITY_META;
    expect(OPTIMAL.rank).toBeGreaterThan(GOOD.rank);
    expect(GOOD.rank).toBeGreaterThan(NEUTRAL.rank);
    expect(NEUTRAL.rank).toBeGreaterThan(POOR.rank);
    expect(POOR.rank).toBeGreaterThan(CATASTROPHIC.rank);
  });
});

describe('BIAS_EXPLANATIONS', () => {
  it('covers all BIAS_POOL entries', () => {
    BIAS_POOL.forEach(b => {
      expect(BIAS_EXPLANATIONS).toHaveProperty(b);
      expect(typeof BIAS_EXPLANATIONS[b]).toBe('string');
    });
  });
});

describe('COGNITIVE_BIASES', () => {
  it('each entry has id, label, desc', () => {
    COGNITIVE_BIASES.forEach(b => {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('label');
      expect(b).toHaveProperty('desc');
    });
  });
});

describe('RIPPLE_TRIGGERS', () => {
  it('has 4 triggers', () => {
    expect(Object.keys(RIPPLE_TRIGGERS)).toHaveLength(4);
  });

  it('HAS_DEBT fires at threshold 3', () => {
    expect(RIPPLE_TRIGGERS.HAS_DEBT.threshold).toBe(3);
  });

  it('HAS_EMERGENCY_FUND fires at threshold 4', () => {
    expect(RIPPLE_TRIGGERS.HAS_EMERGENCY_FUND.threshold).toBe(4);
  });

  it('each trigger has threshold, category, interruptLabel, interruptColor, promptInjection', () => {
    Object.values(RIPPLE_TRIGGERS).forEach(t => {
      ['threshold', 'category', 'interruptLabel', 'interruptColor', 'promptInjection'].forEach(field => {
        expect(t).toHaveProperty(field);
      });
    });
  });
});

describe('hashSeed', () => {
  it('returns a non-negative integer', () => {
    const h = hashSeed('test', 1);
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
  });

  it('same seed + round produces same hash (deterministic)', () => {
    expect(hashSeed('myseed', 3)).toBe(hashSeed('myseed', 3));
  });

  it('different round produces different hash', () => {
    expect(hashSeed('myseed', 1)).not.toBe(hashSeed('myseed', 2));
  });

  it('different seed produces different hash', () => {
    expect(hashSeed('seedA', 1)).not.toBe(hashSeed('seedB', 1));
  });
});

describe('fmt', () => {
  it('formats positive numbers with $ and commas', () => {
    expect(fmt(12500)).toBe('$12,500');
  });

  it('formats negative numbers with -$ prefix', () => {
    expect(fmt(-5000)).toBe('-$5,000');
  });

  it('formats zero', () => {
    expect(fmt(0)).toBe('$0');
  });

  it('formats large numbers', () => {
    expect(fmt(1000000)).toBe('$1,000,000');
  });
});

describe('qualityColor', () => {
  it('has a color string for each quality level', () => {
    ['OPTIMAL', 'GOOD', 'NEUTRAL', 'POOR', 'CATASTROPHIC'].forEach(q => {
      const color = qualityColor[q];
      expect(typeof color).toBe('string');
      expect(color.startsWith('#')).toBe(true);
    });
  });

  it('OPTIMAL is #00ff88', () => {
    expect(qualityColor['OPTIMAL']).toBe('#00ff88');
  });

  it('CATASTROPHIC is #ff2222', () => {
    expect(qualityColor['CATASTROPHIC']).toBe('#ff2222');
  });
});
