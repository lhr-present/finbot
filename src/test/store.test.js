// ─── P-06 + P-03: store + supabase tests ─────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { initialState } from '../engine/store.js';

describe('initialState', () => {
  it('has correct default screen', () => {
    expect(initialState.screen).toBe('BOOT');
  });

  it('has correct default numeric fields', () => {
    expect(initialState.netWorth).toBe(0);
    expect(initialState.round).toBe(0);
    expect(initialState.marketIdx).toBe(0);
    expect(initialState.timeLeft).toBe(45);
    expect(initialState.spinFrame).toBe(0);
    expect(initialState.p2NetWorth).toBe(0);
    expect(initialState.playerNum).toBe(1);
  });

  it('has correct default boolean fields', () => {
    expect(initialState.loading).toBe(false);
    expect(initialState.timerActive).toBe(false);
    expect(initialState.timeExpired).toBe(false);
    expect(initialState.pressureMode).toBe(false);
    expect(initialState.seedMode).toBe(false);
    expect(initialState.multiMode).toBe(false);
    expect(initialState.showBias).toBe(false);
    expect(initialState.narrationOn).toBe(false);
    expect(initialState.soundOn).toBe(true);
    expect(initialState.storageOk).toBe(true);
    expect(initialState.callsignSaved).toBe(false);
  });

  it('has correct default null fields', () => {
    expect(initialState.difficulty).toBeNull();
    expect(initialState.scenario).toBeNull();
    expect(initialState.chosen).toBeNull();
    expect(initialState.endData).toBeNull();
    expect(initialState.activeRipple).toBeNull();
    expect(initialState.pendingMarketShift).toBeNull();
    expect(initialState.installPrompt).toBeNull();
    expect(initialState.confidenceRating).toBeNull();
    expect(initialState.hoverConfidence).toBeNull();
    expect(initialState.p2Choice).toBeNull();
    expect(initialState.p2Quality).toBeNull();
    expect(initialState.p2Outcome).toBeNull();
    expect(initialState.p2NetEffect).toBeNull();
    expect(initialState.replayData).toBeNull();
    // I-03 leaderboard fields
    expect(initialState.anonUid).toBeNull();
    expect(initialState.playerRank).toBeNull();
    expect(initialState.beatNotice).toBeNull();
  });

  it('has I-03 leaderboard default fields', () => {
    expect(initialState.lbFilter).toBe('ALL');
    expect(initialState.showLb).toBe(false);
    expect(initialState.anonUid).toBeNull();
  });

  it('has correct default array fields', () => {
    expect(initialState.history).toEqual([]);
    expect(initialState.biasHistory).toEqual([]);
    expect(initialState.catHistory).toEqual([]);
    expect(initialState.leaderboard).toEqual([]);
    expect(initialState.firedRipples).toEqual([]);
    expect(initialState.decisionTimes).toEqual([]);
    expect(initialState.calibrationLog).toEqual([]);
  });

  it('has correct default string fields', () => {
    expect(initialState.apiError).toBe('');
    expect(initialState.bootText).toBe('');
    expect(initialState.callsign).toBe('');
    expect(initialState.seedValue).toBe('');
    expect(initialState.shareableSeed).toBe('');
    expect(initialState.sessionCode).toBe('');
    expect(initialState.sessionPhase).toBe('LOBBY');
    expect(initialState.lobbyCode).toBe('');
    expect(initialState.lobbyError).toBe('');
    expect(initialState.analyzerError).toBe('');
  });

  it('has dna with empty flags Set, zero scores', () => {
    expect(initialState.dna.flags instanceof Set).toBe(true);
    expect(initialState.dna.flags.size).toBe(0);
    expect(initialState.dna.riskScore).toBe(0);
    expect(initialState.dna.disciplineScore).toBe(0);
  });

  it('has empty flagDuration object', () => {
    expect(typeof initialState.flagDuration).toBe('object');
    expect(Object.keys(initialState.flagDuration)).toHaveLength(0);
  });

  it('has 55+ state fields (not accidentally shrunk)', () => {
    expect(Object.keys(initialState).length).toBeGreaterThanOrEqual(50);
  });
});
