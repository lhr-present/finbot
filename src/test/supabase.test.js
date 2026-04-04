// ─── P-06: Supabase module tests (no network — tests interface only) ──────────
import { describe, it, expect } from 'vitest';

// Import the no-network portions only — client is null when env vars missing
import { isSupabaseEnabled, postScore, fetchGlobalTop10, fetchTop10ByDifficulty } from '../engine/supabase.js';

describe('isSupabaseEnabled', () => {
  it('returns false when env vars are not set (test environment)', () => {
    // In Vitest (node env), import.meta.env has no Supabase vars → client is null
    expect(isSupabaseEnabled()).toBe(false);
  });

  it('is a function', () => {
    expect(typeof isSupabaseEnabled).toBe('function');
  });
});

describe('postScore (no Supabase configured)', () => {
  it('returns { ok: false, error } when Supabase not configured', async () => {
    const result = await postScore({ callsign: 'TST', netWorth: 100000, archetype: 'The Test', grade: 'A', difficulty: 'BALANCED', optimalRate: 0.7 });
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe('string');
  });
});

describe('fetchGlobalTop10 (no Supabase configured)', () => {
  it('returns null when Supabase not configured', async () => {
    const result = await fetchGlobalTop10();
    expect(result).toBeNull();
  });
});

describe('fetchTop10ByDifficulty (no Supabase configured)', () => {
  it('returns null when Supabase not configured', async () => {
    const result = await fetchTop10ByDifficulty('BALANCED');
    expect(result).toBeNull();
  });
});
