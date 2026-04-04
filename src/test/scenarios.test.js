// ─── P-02: scenarios tests ────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { parseScenarioJSON, buildPrompt } from '../engine/scenarios.js';
import { CATEGORIES } from '../engine/constants.js';

describe('parseScenarioJSON', () => {
  it('parses a valid JSON object from text', () => {
    const text = 'Some prefix {"key": "value"} suffix';
    expect(parseScenarioJSON(text)).toEqual({ key: 'value' });
  });

  it('parses JSON with nested objects and arrays', () => {
    const obj = { category: 'INVESTING', choices: [{ id: 'A', netEffect: 10000 }] };
    const text = `Here: ${JSON.stringify(obj)}`;
    expect(parseScenarioJSON(text)).toEqual(obj);
  });

  it('returns null when no JSON object present', () => {
    expect(parseScenarioJSON('no json here')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseScenarioJSON('{bad: json}')).toBeNull();
  });

  it('handles bare JSON (no surrounding text)', () => {
    const obj = { a: 1 };
    expect(parseScenarioJSON(JSON.stringify(obj))).toEqual(obj);
  });
});

describe('buildPrompt', () => {
  const mockDna = { flags: new Set(['HAS_DEBT']), riskScore: 55, disciplineScore: 60 };
  const mockDifficulty = { label: 'BALANCED', rounds: 12, riskFraming: 'balanced' };
  const mockMarket = { label: 'BULL MARKET', desc: 'Optimism high.' };

  it('returns a non-empty string', () => {
    const prompt = buildPrompt(mockDna, mockDifficulty, mockMarket, [], 1);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('includes player flags in prompt', () => {
    const prompt = buildPrompt(mockDna, mockDifficulty, mockMarket, [], 1);
    expect(prompt).toContain('HAS_DEBT');
  });

  it('includes round number and total rounds', () => {
    const prompt = buildPrompt(mockDna, mockDifficulty, mockMarket, [], 5);
    expect(prompt).toContain('5/12');
  });

  it('excludes recent categories from available list', () => {
    const recent = ['INVESTING', 'DEBT', 'HOUSING'];
    const prompt = buildPrompt(mockDna, mockDifficulty, mockMarket, recent, 4);
    // Recent categories should appear in the "avoid" section
    expect(prompt).toContain('INVESTING');
    expect(prompt).toContain('DEBT');
    // Available should not include these 3
    const availableLine = prompt.match(/Category: pick from \[([^\]]+)\]/)?.[1] || '';
    expect(availableLine).not.toContain('INVESTING');
    expect(availableLine).not.toContain('DEBT');
  });

  it('includes seed block when seedValue provided', () => {
    const prompt = buildPrompt(mockDna, mockDifficulty, mockMarket, [], 1, 'myseed');
    expect(prompt).toContain('REPRODUCIBILITY CONTRACT');
    expect(prompt).toContain('myseed');
  });

  it('no seed block when seedValue is empty', () => {
    const prompt = buildPrompt(mockDna, mockDifficulty, mockMarket, [], 1, '');
    expect(prompt).not.toContain('REPRODUCIBILITY CONTRACT');
  });

  it('prompt contains all required JSON field names', () => {
    const prompt = buildPrompt(mockDna, mockDifficulty, mockMarket, [], 1);
    ['category', 'title', 'context', 'choices', 'netEffect', 'biasWarning', 'teachingMoment'].forEach(field => {
      expect(prompt).toContain(`"${field}"`);
    });
  });

  it('empty flags set renders as "none"', () => {
    const dnaNoFlags = { flags: new Set(), riskScore: 50, disciplineScore: 50 };
    const prompt = buildPrompt(dnaNoFlags, mockDifficulty, mockMarket, [], 1);
    expect(prompt).toContain('Flags: none');
  });
});
