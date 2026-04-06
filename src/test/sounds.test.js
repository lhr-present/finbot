// ─── sounds.js tests ─────────────────────────────────────────────────────────
// AudioContext is not available in Node — all tone() calls silently no-op.
// Tests verify: mute flag, API shape, no-throw under missing browser APIs.
import { describe, it, expect, beforeEach } from 'vitest';
import { sfx, setSoundMuted, isSoundMuted } from '../engine/sounds.js';

describe('setSoundMuted / isSoundMuted', () => {
  beforeEach(() => setSoundMuted(false));

  it('starts unmuted', () => {
    expect(isSoundMuted()).toBe(false);
  });

  it('setSoundMuted(true) mutes', () => {
    setSoundMuted(true);
    expect(isSoundMuted()).toBe(true);
  });

  it('setSoundMuted(false) unmutes', () => {
    setSoundMuted(true);
    setSoundMuted(false);
    expect(isSoundMuted()).toBe(false);
  });

  it('toggle round-trips correctly', () => {
    setSoundMuted(!isSoundMuted());
    expect(isSoundMuted()).toBe(true);
    setSoundMuted(!isSoundMuted());
    expect(isSoundMuted()).toBe(false);
  });
});

describe('sfx API shape', () => {
  it('exports an sfx object', () => {
    expect(typeof sfx).toBe('object');
    expect(sfx).not.toBeNull();
  });

  const expectedEvents = [
    'tick', 'click', 'good', 'bad', 'neutral',
    'ripple', 'marketShift', 'timerWarn', 'timerExpired',
    'win', 'lose', 'boot',
  ];

  expectedEvents.forEach(name => {
    it(`sfx.${name} is a function`, () => {
      expect(typeof sfx[name]).toBe('function');
    });
  });

  it('has 15 sound events (K-01: +gain, loss, join)', () => {
    expect(Object.keys(sfx)).toHaveLength(15);
  });
});

describe('sfx calls do not throw without AudioContext (Node env)', () => {
  beforeEach(() => setSoundMuted(false));

  // All sfx calls should silently no-op when window.AudioContext is unavailable
  [
    'tick', 'click', 'good', 'bad', 'neutral',
    'ripple', 'marketShift', 'timerWarn', 'timerExpired',
    'win', 'lose', 'boot', 'gain', 'loss', 'join',
  ].forEach(name => {
    it(`sfx.${name}() does not throw`, () => {
      expect(() => sfx[name]()).not.toThrow();
    });
  });
});

describe('sfx is silent when muted', () => {
  it('all sfx calls complete without throw when muted', () => {
    setSoundMuted(true);
    expect(() => {
      sfx.boot(); sfx.tick(); sfx.click();
      sfx.good(); sfx.bad(); sfx.neutral();
      sfx.ripple(); sfx.marketShift();
      sfx.timerWarn(); sfx.timerExpired();
      sfx.win(); sfx.lose();
      sfx.gain(); sfx.loss(); sfx.join();
    }).not.toThrow();
    setSoundMuted(false);
  });
});
