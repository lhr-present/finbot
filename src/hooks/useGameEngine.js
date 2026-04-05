// ─── useGameEngine — game effects, refs, and handlers (state via Zustand) ──────
// State lives in src/engine/store.js. This hook wires effects + handlers and
// returns the same API surface as before — render layer is unchanged.

import { useEffect, useRef, useCallback } from "react";
import { useShallow } from "zustand/shallow";
import {
  DIFFICULTIES, MARKET_CONDITIONS, CATEGORIES, RIPPLE_TRIGGERS,
  QUALITY_META, FALLBACKS, SPIN_CHARS,
} from "../engine/constants.js";
import { SK, storeShared, readShared, deleteShared } from "../engine/multiplayer.js";
import { callClaude, parseScenarioJSON, buildPrompt } from "../engine/scenarios.js";
import { computeArchetype, resolveEnding } from "../engine/stateMachine.js";
import { sfx, setSoundMuted } from "../engine/sounds.js";
import { useGameStore, st, stf, get, initialState } from "../engine/store.js";
import { isSupabaseEnabled, postScore, fetchGlobalTop10, fetchTop10ByDifficulty } from "../engine/supabase.js";

// P-07: Plausible custom event helper (no-ops if analytics not loaded)
const plausible = (name, props) => {
  try { window.plausible?.(name, { props }); } catch {}
};

export function useGameEngine() {

  // ─── SUBSCRIBE TO STORE (useShallow prevents re-renders on unrelated changes) ─
  const {
    screen, difficulty, apiKey, netWorth, round, dna, scenario, chosen, loading,
    apiError, usedFallback, history, biasHistory, marketIdx, pendingMarketShift,
    marketShiftRevealIdx, catHistory, showBias, leaderboard, endData, bootText,
    callsign, callsignSaved, seedValue, seedMode, shareableSeed, copied,
    flagDuration, firedRipples, activeRipple, isRippleScenario, rippleProgress,
    pressureMode, timeLeft, timerActive, timeExpired, decisionTimes, lastChoiceForcedByTimer,
    pendingConfidence, confidenceRating, hoverConfidence, calibrationLog,
    narrationOn, soundOn, replayData, analyzerError, roundLogOpen, installPrompt,
    multiMode, sessionCode, playerNum, sessionPhase,
    p2NetWorth, p2Choice, p2Quality, p2Outcome, p2NetEffect,
    lobbyCode, lobbyError, storageOk, spinFrame,
  } = useGameStore(useShallow(s => s));

  // ─── REFS (must stay in React hook) ─────────────────────────────────────────
  const confirmChoiceRef      = useRef(null);
  const proceedFromRippleRef  = useRef(null);
  const handleMarketShiftRef  = useRef(null);
  const rippleInjectionRef    = useRef("");
  const rippleTimerRef        = useRef(null);
  const timerRef              = useRef(null);
  const pollRef               = useRef(null);

  const market = MARKET_CONDITIONS[marketIdx];

  // ─── SYNC SOUND MUTE FLAG ────────────────────────────────────────────────────
  useEffect(() => { setSoundMuted(!soundOn); }, [soundOn]);

  // ─── ON MOUNT: read URL seed param ─────────────────────────────────────────
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("seed");
      if (s) st({ seedValue: s, seedMode: true });
    } catch {}
  }, []);

  // ─── SPINNER ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => stf(s => ({ spinFrame: (s.spinFrame + 1) % 4 })), 250);
    return () => clearInterval(t);
  }, []);

  // ─── BOOT TYPEWRITER ────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "BOOT") return;
    const lines = [
      "FINBOT-9000 v4.0 INITIALIZING...",
      "Financial DNA engine........ONLINE",
      "Cognitive bias detection....ACTIVE",
      "Market simulation...........READY",
      "Leaderboard vault...........LOADED",
      "",
      "> SELECT DIFFICULTY TO BEGIN_",
    ];
    let i = 0, acc = "";
    const t = setInterval(() => {
      if (i >= lines.length) { clearInterval(t); return; }
      acc += (i > 0 ? "\n" : "") + lines[i++];
      st({ bootText: acc });
    }, 320);
    return () => clearInterval(t);
  }, [screen]);

  // ─── LOAD LEADERBOARD ───────────────────────────────────────────────────────
  useEffect(() => {
    // Always seed from localStorage first for instant display
    try { st({ leaderboard: JSON.parse(localStorage.getItem("finbot_lb") || "[]") }); } catch {}
    // Then upgrade with global Supabase data if available
    if (isSupabaseEnabled()) {
      fetchGlobalTop10().then(rows => { if (rows) st({ leaderboard: rows }); }).catch(() => {});
    }
  }, []);

  // ─── CHECK STORAGE AVAILABILITY ─────────────────────────────────────────────
  useEffect(() => {
    if (screen === "LOBBY") {
      try {
        localStorage.setItem("finbot_storage_test", "1");
        localStorage.removeItem("finbot_storage_test");
        st({ storageOk: true });
      } catch { st({ storageOk: false }); }
    }
  }, [screen]);

  // ─── FEATURE 4: LOBBY POLLING (P1 waiting for P2) ──────────────────────────
  useEffect(() => {
    if (screen !== "LOBBY" || sessionPhase !== "WAITING_P2" || !sessionCode) return;
    pollRef.current = setInterval(async () => {
      const sess = await readShared(SK.session(sessionCode));
      if (sess && sess.p2ready) {
        clearInterval(pollRef.current);
        st({ sessionPhase: "BOTH_READY" });
        setTimeout(() => st({ screen: "GAME" }), 3000);
      }
    }, 1500);
    return () => clearInterval(pollRef.current);
  }, [screen, sessionPhase, sessionCode]);

  // ─── B-05: P1 DISCONNECT FLAG ON UNLOAD ─────────────────────────────────────
  useEffect(() => {
    if (!multiMode || playerNum !== 1 || !sessionCode) return;
    const handler = () => storeShared(SK.disconnect(sessionCode), { at: Date.now() });
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [multiMode, playerNum, sessionCode]);

  // ─── FEATURE 2: RIPPLE SCREEN ANIMATION ─────────────────────────────────────
  useEffect(() => {
    if (screen !== "RIPPLE") return;
    st({ rippleProgress: 0 });
    let prog = 0;
    const step = 100 / 25;
    const interval = setInterval(() => {
      prog = Math.min(100, prog + step);
      st({ rippleProgress: prog });
    }, 100);

    rippleTimerRef.current = setTimeout(() => {
      clearInterval(interval);
      if (proceedFromRippleRef.current) proceedFromRippleRef.current();
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(rippleTimerRef.current);
    };
  }, [screen]);

  // ─── B-03: MARKET SHIFT TYPEWRITER ──────────────────────────────────────────
  useEffect(() => {
    if (screen !== "MARKET_SHIFT" || !pendingMarketShift) return;
    st({ marketShiftRevealIdx: 0 });
    const target = pendingMarketShift.to;
    let idx = 0;
    const t = setInterval(() => {
      idx++;
      st({ marketShiftRevealIdx: idx });
      if (idx >= target.length) clearInterval(t);
    }, 80);
    return () => clearInterval(t);
  }, [screen, pendingMarketShift?.to]);

  // ─── B-03: MARKET SHIFT AUTO-CONTINUE (3s after full reveal) ────────────────
  useEffect(() => {
    if (screen !== "MARKET_SHIFT" || !pendingMarketShift) return;
    if (marketShiftRevealIdx < pendingMarketShift.to.length) return;
    const t = setTimeout(() => {
      if (handleMarketShiftRef.current) handleMarketShiftRef.current();
    }, 3000);
    return () => clearTimeout(t);
  }, [screen, marketShiftRevealIdx, pendingMarketShift]);

  // ─── FEATURE 3: TIMER START/STOP ────────────────────────────────────────────
  useEffect(() => {
    if (screen === "GAME" && pressureMode && !chosen) {
      st({ timeLeft: 45, timeExpired: false, timerActive: true });
    } else {
      if (timerActive) {
        clearInterval(timerRef.current);
        st({ timerActive: false });
      }
    }
  }, [screen, pressureMode, chosen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── FEATURE 3: TIMER COUNTDOWN ─────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      stf(s => {
        const t = s.timeLeft;
        if (t === 10) sfx.timerWarn();
        if (t <= 1) {
          clearInterval(timerRef.current);
          return { timeLeft: 0, timerActive: false, timeExpired: true };
        }
        return { timeLeft: t - 1 };
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  // ─── FEATURE 3: AUTO-CONFIRM ON TIMER EXPIRY ────────────────────────────────
  useEffect(() => {
    if (!timeExpired || screen !== "GAME" || !scenario || chosen) return;
    const worstChoice = (scenario.choices || []).reduce((worst, c) => {
      const rank = QUALITY_META[c.quality]?.rank ?? 3;
      const worstRank = QUALITY_META[worst?.quality]?.rank ?? 3;
      return rank < worstRank ? c : worst;
    }, scenario.choices?.[0]);
    if (!worstChoice) return;
    stf(s => ({ decisionTimes: [...s.decisionTimes, { round: s.round, secondsLeft: 0 }] }));
    if (confirmChoiceRef.current) confirmChoiceRef.current(worstChoice, true);
  }, [timeExpired, screen, scenario, chosen, round]);

  // ─── OBSIDIAN WEBHOOK (fire-and-forget on END screen mount) ─────────────────
  useEffect(() => {
    if (screen !== "END" || !endData) return;
    const h = endData.history;
    const stats = endData.stats;
    const endingEff = resolveEnding([...dna.flags], stats.finalNetWorth, stats.disciplineScore, h);
    const calibRatedEff = calibrationLog.filter(c => c.confidence > 0);
    const highConfEff = calibRatedEff.filter(c => c.confidence >= 4);
    const calibScoreEff = highConfEff.length > 0
      ? Math.round(highConfEff.filter(c => c.wasGood).length / highConfEff.length * 100)
      : null;
    const overconfCountEff = highConfEff.filter(c => !c.wasGood).length;
    const payload = {
      date:             new Date().toISOString(),
      endingId:         endingEff.id,
      endingLabel:      endingEff.label || "Default Archetype",
      netWorth:         stats.finalNetWorth,
      optimalRate:      Math.round((h.filter(e => e.choice?.quality === "OPTIMAL").length / Math.max(h.length, 1)) * 100),
      calibrationScore: calibScoreEff,
      overconfCount:    overconfCountEff,
      blindSpotFired:   calibrationLog.length > 0 && overconfCountEff >= 3 && calibScoreEff !== null && calibScoreEff < 40,
      marketShiftsCount: 0,
      biasesHit:        [...new Set(h.map(e => e.choice?.biasWarning).filter(Boolean))],
      ripplesFired:     firedRipples || [],
      seed:             seedValue || null,
      pressureMode,
      disciplineScore:  stats.disciplineScore ?? dna.disciplineScore,
      difficulty:       difficulty?.label || null,
      totalRounds:      h.length,
      version:          "4.0",
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    fetch("http://localhost:7788/finbot-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => {}).finally(() => clearTimeout(timeout));
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── VOICE NARRATION ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    if (!narrationOn || !scenario) { speechSynthesis.cancel(); return; }
    const text = (scenario.title || "") + ". " + (scenario.context || "");
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.0;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return () => speechSynthesis.cancel();
  }, [narrationOn, scenario?.title]);

  // ─── PWA INSTALL PROMPT CAPTURE ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); st({ installPrompt: e }); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ─── FETCH SCENARIO ─────────────────────────────────────────────────────────
  const fetchScenario = useCallback(async () => {
    if (!difficulty) return;
    st({ loading: true, apiError: "", chosen: null });

    // Feature 4: P2 polls for scenario from P1
    if (multiMode && playerNum === 2) {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const dc = await readShared(SK.disconnect(sessionCode));
        if (dc) {
          clearInterval(pollRef.current);
          await deleteShared(SK.disconnect(sessionCode));
          st({ multiMode: false, loading: false, lobbyError: "P1 disconnected — continuing solo", screen: "GAME" });
          setTimeout(() => st({ lobbyError: "" }), 2500);
          return;
        }
        const roundData = await readShared(SK.round(sessionCode));
        if (roundData && roundData.scenario) {
          clearInterval(pollRef.current);
          stf(s => ({ catHistory: [...s.catHistory, roundData.scenario.category] }));
          st({ scenario: roundData.scenario, loading: false });
        }
      }, 1500);
      return;
    }

    // B-03: Check if market should shift (every 4 rounds)
    const newIdx = Math.floor((round - 1) / 4) % MARKET_CONDITIONS.length;
    if (newIdx !== marketIdx && !isRippleScenario) {
      const fromMarket = MARKET_CONDITIONS[marketIdx];
      const toMarket   = MARKET_CONDITIONS[newIdx];
      sfx.marketShift();
      st({ pendingMarketShift: { from: fromMarket.label, to: toMarket.label, newIdx }, marketShiftRevealIdx: 0, screen: "MARKET_SHIFT", loading: false });
      return;
    }

    const injection = rippleInjectionRef.current;
    rippleInjectionRef.current = "";

    let parsed = null;
    const activeKey = apiKey || (typeof import.meta !== "undefined" ? import.meta.env?.VITE_ANTHROPIC_API_KEY : "");
    try {
      if (activeKey?.startsWith("sk-ant")) {
        let prompt = buildPrompt(dna, difficulty, market, catHistory, round, seedValue);
        if (injection) prompt = injection + "\n\n" + prompt;
        const raw = await callClaude(activeKey, prompt);
        parsed = parseScenarioJSON(raw);
      }
    } catch (e) {
      const msg = e.name === "AbortError" ? "Request timed out (12s)" : e.message;
      st({ apiError: `${msg} — using fallback` });
      parsed = FALLBACKS.BEHAVIORAL;
    }

    if (!parsed) {
      const availCats = CATEGORIES.filter((c) => !catHistory.slice(-3).includes(c));
      const cat = availCats[round % availCats.length] || "INVESTING";
      parsed = FALLBACKS[cat] || FALLBACKS.INVESTING;
      st({ usedFallback: true });
    } else {
      st({ usedFallback: false });
    }

    stf(s => ({ catHistory: [...s.catHistory, parsed.category] }));
    st({ scenario: parsed });

    if (multiMode && playerNum === 1) {
      await storeShared(SK.round(sessionCode), { scenario: parsed, round });
    }

    st({ loading: false });
  }, [round, difficulty, apiKey, dna, marketIdx, market, catHistory, multiMode, playerNum, sessionCode, seedValue, isRippleScenario]);

  useEffect(() => {
    if (screen === "GAME" && !scenario && !loading && round > 0) fetchScenario();
  }, [screen, round, scenario, loading, fetchScenario]);

  // ─── START GAME ─────────────────────────────────────────────────────────────
  const startGame = (diff, key) => {
    sfx.boot();
    plausible('game_start', { difficulty: diff.label });
    st({
      difficulty: diff,
      apiKey: key,
      netWorth: diff.startNetWorth,
      dna: { flags: new Set(diff.startingFlags), riskScore: 0, disciplineScore: 0 },
      round: 1,
      history: [], biasHistory: [], catHistory: [],
      marketIdx: 0, pendingMarketShift: null, marketShiftRevealIdx: 0,
      scenario: null, chosen: null,
      flagDuration: {}, firedRipples: [], activeRipple: null, isRippleScenario: false,
      decisionTimes: [], lastChoiceForcedByTimer: false, timeLeft: 45, timerActive: false, timeExpired: false,
      calibrationLog: [], confidenceRating: null, pendingConfidence: false, hoverConfidence: null,
      multiMode: false, p2NetWorth: 0, p2Choice: null, p2Quality: null, p2Outcome: null, p2NetEffect: null,
      narrationOn: false,
      screen: "GAME",
    });
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  };

  // ─── PICK ────────────────────────────────────────────────────────────────────
  const pick = (choice) => {
    if (!chosen) {
      sfx.click();
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      st({ chosen: choice, pendingConfidence: true, confidenceRating: null, hoverConfidence: null });
    }
  };

  // ─── CONFIRM CHOICE ─────────────────────────────────────────────────────────
  const confirmChoice = (choiceObj = null, forcedByTimer = false, explicitConfidence = null) => {
    const s = get();
    const c = choiceObj || s.chosen;
    if (!c || !s.scenario || !s.difficulty) return;

    // Stop timer (B-07)
    if (s.timerActive) {
      clearInterval(timerRef.current);
      st({ timerActive: false });
    }

    if (s.pressureMode && !forcedByTimer) {
      stf(prev => ({ decisionTimes: [...prev.decisionTimes, { round: s.round, secondsLeft: s.timeLeft }] }));
    }
    st({ lastChoiceForcedByTimer: forcedByTimer });
    if (forcedByTimer) st({ chosen: c });

    // Sound + analytics
    if (forcedByTimer) sfx.timerExpired();
    else if (['OPTIMAL', 'GOOD'].includes(c.quality)) sfx.good();
    else if (c.quality === 'NEUTRAL') sfx.neutral();
    else sfx.bad();
    plausible('choice_made', { quality: c.quality, round: s.round, category: s.scenario.category });

    stf(prev => ({
      calibrationLog: [...prev.calibrationLog, {
        round: s.round,
        confidence: forcedByTimer ? 0 : (explicitConfidence !== null ? explicitConfidence : (s.confidenceRating || 0)),
        wasGood: ['OPTIMAL', 'GOOD'].includes(c.quality),
        quality: c.quality,
      }],
    }));
    st({ confidenceRating: null, pendingConfidence: false });

    const newWorth = Math.max(0, s.netWorth + c.netEffect);

    const newFlags = new Set([...s.dna.flags]);
    (c.flagsAdd || []).forEach(f => newFlags.add(f));
    (c.flagsRemove || []).forEach(f => newFlags.delete(f));
    const newDna = {
      flags: newFlags,
      riskScore: Math.min(100, s.dna.riskScore + (["CATASTROPHIC","POOR"].includes(c.quality) ? 15 : c.quality === "OPTIMAL" ? -5 : 0)),
      disciplineScore: Math.min(100, s.dna.disciplineScore + (["OPTIMAL","GOOD"].includes(c.quality) ? 10 : 0)),
    };

    if (c.biasWarning) stf(prev => ({ biasHistory: [...prev.biasHistory, { round: s.round, bias: c.biasWarning, quality: c.quality }] }));

    const entry = { round: s.round, category: s.scenario.category, title: s.scenario.title, choice: c, netEffect: c.netEffect, netWorthAfter: newWorth, market: s.market?.id || market.id };
    const newHistory = [...s.history, entry];

    st({ history: newHistory, netWorth: newWorth, dna: newDna });

    // B-04 fix: build flagDuration from scratch
    const newFlagDuration = {};
    for (const flag of newFlags) {
      newFlagDuration[flag] = (s.flagDuration[flag] || 0) + 1;
    }
    st({ flagDuration: newFlagDuration });

    const nextRound = s.round + 1;
    const gameOver = newWorth <= 0 || nextRound > s.difficulty.rounds || newWorth >= s.difficulty.target;

    if (!gameOver) {
      // Feature 2: check ripple triggers
      for (const [flag, trigger] of Object.entries(RIPPLE_TRIGGERS)) {
        if (
          newFlagDuration[flag] >= trigger.threshold &&
          !s.firedRipples.includes(flag) &&
          s.round >= 2
        ) {
          sfx.ripple();
          const newFiredRipples = [...s.firedRipples, flag];
          st({ firedRipples: newFiredRipples, activeRipple: { flag, ...trigger }, scenario: null, chosen: null, screen: "RIPPLE" });
          return;
        }
      }

      // Feature 4: multiplayer path
      if (s.multiMode) {
        const worthKey  = s.playerNum === 1 ? SK.p1Worth(s.sessionCode) : SK.p2Worth(s.sessionCode);
        const choiceKey = s.playerNum === 1 ? SK.p1Choice(s.sessionCode) : SK.p2Choice(s.sessionCode);
        storeShared(worthKey, newWorth);
        storeShared(choiceKey, { label: c.label, quality: c.quality, netEffect: c.netEffect, outcome: c.outcome });
        st({ screen: "WAITING_REVEAL" });

        let elapsed = 0;
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          elapsed += 1500;
          if (s.playerNum === 2) {
            const dc = await readShared(SK.disconnect(s.sessionCode));
            if (dc) {
              clearInterval(pollRef.current);
              await deleteShared(SK.disconnect(s.sessionCode));
              st({ multiMode: false, p2Choice: null, p2Quality: null, p2Outcome: null, p2NetEffect: null,
                lobbyError: "P1 disconnected — continuing solo" });
              setTimeout(() => st({ lobbyError: "" }), 2500);
              st({ round: nextRound, scenario: null, chosen: null, isRippleScenario: false, screen: "GAME" });
              return;
            }
          }
          const oppKey      = s.playerNum === 1 ? SK.p2Choice(s.sessionCode) : SK.p1Choice(s.sessionCode);
          const oppWorthKey = s.playerNum === 1 ? SK.p2Worth(s.sessionCode) : SK.p1Worth(s.sessionCode);
          const oppChoice   = await readShared(oppKey);
          const oppWorth    = await readShared(oppWorthKey);
          if (oppChoice) {
            clearInterval(pollRef.current);
            st({
              p2Choice: oppChoice.label, p2Quality: oppChoice.quality,
              p2Outcome: oppChoice.outcome, p2NetEffect: oppChoice.netEffect,
              p2NetWorth: oppWorth ?? 0,
              screen: "GAME",
            });
          } else if (elapsed >= 30000) {
            clearInterval(pollRef.current);
            st({ screen: "GAME" });
          }
        }, 1500);
        return;
      }

      st({ round: nextRound, scenario: null, chosen: null, isRippleScenario: false });
    } else {
      // GAME OVER
      const totalR     = newHistory.length;
      const optimalRate = totalR > 0 ? newHistory.filter(h => h.choice.quality === 'OPTIMAL').length / totalR : 0;
      const catastrophicCount = newHistory.filter(h => h.choice.quality === 'CATASTROPHIC').length;
      const highRiskChoices   = newHistory.filter(h => h.choice.quality === 'POOR' || h.choice.quality === 'CATASTROPHIC').length;
      const half = Math.floor(totalR / 2);
      const firstHalf  = newHistory.slice(0, half);
      const secondHalf = newHistory.slice(half);
      const firstHalfOptimal  = firstHalf.length  > 0 ? firstHalf.filter(h  => h.choice.quality === 'OPTIMAL').length / firstHalf.length  : 0;
      const secondHalfOptimal = secondHalf.length > 0 ? secondHalf.filter(h => h.choice.quality === 'OPTIMAL').length / secondHalf.length : 0;

      const finalStats = {
        finalNetWorth: newWorth,
        target: s.difficulty.target,
        optimalRate,
        optimal: newHistory.filter(h => h.choice.quality === 'OPTIMAL').length,
        catastrophicCount,
        disciplineScore: newDna.disciplineScore,
        highRiskChoices,
        firstHalfOptimal,
        secondHalfOptimal,
        totalRounds: totalR,
      };

      const arc = computeArchetype(finalStats);

      // Post to Supabase (fire-and-forget) + localStorage fallback
      if (isSupabaseEnabled()) {
        postScore({ netWorth: newWorth, archetype: arc.title, grade: arc.grade, difficulty: s.difficulty.label, optimalRate: finalStats.optimalRate })
          .then(() => fetchTop10ByDifficulty(s.difficulty.label))
          .then(rows => { if (rows) st({ leaderboard: rows }); })
          .catch(() => {});
      }
      try {
        const lb = JSON.parse(localStorage.getItem("finbot_lb") || "[]");
        lb.push({ netWorth: newWorth, archetype: arc.title, grade: arc.grade, diff: s.difficulty.label, date: new Date().toLocaleDateString() });
        lb.sort((a, b) => b.netWorth - a.netWorth);
        const top = lb.slice(0, 10);
        localStorage.setItem("finbot_lb", JSON.stringify(top));
        if (!isSupabaseEnabled()) st({ leaderboard: top });
      } catch {}

      st({
        endData: { stats: finalStats, archetype: arc, history: newHistory, finalNetWorth: newWorth, p2FinalNetWorth: s.p2NetWorth },
        shareableSeed: s.seedValue || Math.random().toString(36).substring(2, 8),
      });
      if (['S', 'A'].includes(arc.grade)) sfx.win();
      else sfx.lose();
      plausible('game_end', { grade: arc.grade, archetype: arc.title, difficulty: s.difficulty.label });
      st({ screen: "END" });
    }
  };

  // Set refs inline (fresh closure pattern)
  confirmChoiceRef.current = confirmChoice;

  handleMarketShiftRef.current = () => {
    const s = get();
    if (!s.pendingMarketShift) return;
    st({ marketIdx: s.pendingMarketShift.newIdx, pendingMarketShift: null, marketShiftRevealIdx: 0, screen: "GAME" });
  };

  proceedFromRippleRef.current = () => {
    clearTimeout(rippleTimerRef.current);
    const s = get();
    rippleInjectionRef.current = s.activeRipple ? s.activeRipple.promptInjection : "";
    st({ isRippleScenario: true, screen: "GAME" });
  };

  // ─── MULTIPLAYER: NEXT ROUND ─────────────────────────────────────────────────
  const nextMultiRound = () => {
    const s = get();
    st({ p2Choice: null, p2Quality: null, p2Outcome: null, p2NetEffect: null, chosen: null, scenario: null, isRippleScenario: false });

    for (const [flag, trigger] of Object.entries(RIPPLE_TRIGGERS)) {
      if (s.flagDuration[flag] >= trigger.threshold && !s.firedRipples.includes(flag) && s.round >= 2) {
        sfx.ripple();
        st({ firedRipples: [...s.firedRipples, flag], activeRipple: { flag, ...trigger }, screen: "RIPPLE" });
        return;
      }
    }

    stf(prev => ({ round: prev.round + 1 }));
  };

  // ─── SAVE CALLSIGN ──────────────────────────────────────────────────────────
  const saveCallsign = (data) => {
    const s = get();
    const tag = s.callsign.trim().toUpperCase().slice(0, 3) || "---";

    // Post updated score with callsign to Supabase
    if (isSupabaseEnabled()) {
      postScore({ callsign: tag, netWorth: data.stats.finalNetWorth, archetype: data.archetype.title,
        grade: data.archetype.grade, difficulty: s.difficulty?.label, optimalRate: data.stats.optimalRate })
        .then(() => fetchTop10ByDifficulty(s.difficulty?.label))
        .then(rows => { if (rows) st({ leaderboard: rows }); })
        .catch(() => {});
    }

    try {
      const lb = JSON.parse(localStorage.getItem("finbot_lb") || "[]");
      const filtered = lb.filter(e => e.callsign !== tag);
      filtered.push({
        callsign: tag, netWorth: data.stats.finalNetWorth, archetype: data.archetype.title,
        grade: data.archetype.grade, optimalRate: data.stats.optimalRate,
        diff: s.difficulty?.label, date: new Date().toLocaleDateString(),
      });
      filtered.sort((a, b) => b.netWorth - a.netWorth);
      const top = filtered.slice(0, 10);
      localStorage.setItem("finbot_lb", JSON.stringify(top));
      if (!isSupabaseEnabled()) st({ leaderboard: top });
    } catch {}

    const worstBias = Object.entries(
      s.biasHistory.reduce((acc, b) => { acc[b.bias] = (acc[b.bias] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    fetch("http://localhost:3001/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callsign: tag, netWorth: data.stats.finalNetWorth, archetype: data.archetype.title,
        grade: data.archetype.grade, optimalRate: data.stats.optimalRate,
        worstBias, totalRounds: data.stats.totalRounds, difficulty: s.difficulty?.label,
        date: new Date().toLocaleDateString(),
        notes: `DISCIPLINE:${data.stats.disciplineScore} CATASTROPHIC:${data.stats.catastrophicCount}`,
      }),
    }).catch(() => {});

    st({ callsignSaved: true });
  };

  const progress = difficulty ? Math.min(100, (netWorth / difficulty.target) * 100) : 0;

  const proceedFromRipple = () => {
    if (proceedFromRippleRef.current) proceedFromRippleRef.current();
  };

  const handleMarketShift = () => {
    if (handleMarketShiftRef.current) handleMarketShiftRef.current();
  };

  // ─── LOBBY: CREATE SESSION (P1) ─────────────────────────────────────────────
  const createSession = async () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    st({ sessionCode: code, playerNum: 1 });
    await storeShared(SK.session(code), { host: true, created: Date.now(), p2ready: false });
    st({ sessionPhase: "WAITING_P2" });
  };

  // ─── LOBBY: JOIN SESSION (P2) ────────────────────────────────────────────────
  const joinSession = async (code, currentDifficulty) => {
    const sess = await readShared(SK.session(code));
    if (!sess) { st({ lobbyError: "Session not found" }); return; }
    st({ sessionCode: code, playerNum: 2 });
    await storeShared(SK.session(code), { ...sess, p2ready: true });
    st({ sessionPhase: "BOTH_READY" });
    setTimeout(() => {
      const diff = currentDifficulty || DIFFICULTIES.BALANCED;
      st({
        difficulty: diff, netWorth: diff.startNetWorth,
        dna: { flags: new Set(diff.startingFlags), riskScore: 0, disciplineScore: 0 },
        round: 1, history: [], biasHistory: [], catHistory: [],
        marketIdx: 0, pendingMarketShift: null, marketShiftRevealIdx: 0,
        scenario: null, chosen: null, screen: "GAME",
      });
    }, 3000);
  };

  // ─── RESET GAME ─────────────────────────────────────────────────────────────
  const resetGame = () => {
    clearInterval(pollRef.current);
    const s = get();
    if (s.sessionCode) {
      deleteShared(SK.session(s.sessionCode));
      deleteShared(SK.round(s.sessionCode));
      deleteShared(SK.p1Choice(s.sessionCode));
      deleteShared(SK.p2Choice(s.sessionCode));
      deleteShared(SK.p1Worth(s.sessionCode));
      deleteShared(SK.p2Worth(s.sessionCode));
      deleteShared(SK.disconnect(s.sessionCode));
    }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    st({ ...initialState, apiKey: s.apiKey, soundOn: s.soundOn });
  };

  // ─── KEYBOARD SHORTCUTS ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Ignore when typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const s = get();

      // GAME screen shortcuts
      if (s.screen === 'GAME' && s.scenario && !s.loading) {
        const choices = s.scenario.choices || [];

        // A / 1  →  pick choice 0
        // B / 2  →  pick choice 1
        // C / 3  →  pick choice 2
        const idx = { a: 0, '1': 0, b: 1, '2': 1, c: 2, '3': 2 }[e.key.toLowerCase()];
        if (idx !== undefined && !s.chosen && choices[idx]) {
          e.preventDefault();
          pick(choices[idx]);
          return;
        }

        // Enter → confirm (when confidence meter showing, submit mid-rating or current)
        if (e.key === 'Enter' && s.chosen && s.pendingConfidence) {
          e.preventDefault();
          const rating = s.confidenceRating || 3;
          st({ confidenceRating: rating });
          confirmChoice(null, false, rating);
          return;
        }

        // Enter → next round confirm (when reveal is shown)
        if (e.key === 'Enter' && s.chosen && !s.pendingConfidence && !s.multiMode) {
          e.preventDefault();
          confirmChoice();
          return;
        }
      }

      // RIPPLE / MARKET_SHIFT — Space or Enter to proceed
      if ((e.key === ' ' || e.key === 'Enter') && s.screen === 'RIPPLE') {
        e.preventDefault();
        if (proceedFromRippleRef.current) proceedFromRippleRef.current();
        return;
      }
      if ((e.key === ' ' || e.key === 'Enter') && s.screen === 'MARKET_SHIFT') {
        e.preventDefault();
        if (handleMarketShiftRef.current) handleMarketShiftRef.current();
        return;
      }

      // M → toggle sound (anywhere)
      if (e.key.toLowerCase() === 'm' && s.screen !== 'BOOT') {
        e.preventDefault();
        st({ soundOn: !s.soundOn });
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── RETURN API (same surface as before) ────────────────────────────────────
  return {
    screen,         setScreen:         v  => st({ screen: v }),
    difficulty,     setDifficulty:     v  => st({ difficulty: v }),
    apiKey,         setApiKey:         v  => st({ apiKey: v }),
    netWorth,       setNetWorth:       v  => st({ netWorth: v }),
    round,
    dna,            setDna:            v  => st({ dna: v }),
    scenario,
    chosen,
    loading,
    apiError,
    usedFallback,
    history,
    biasHistory,
    marketIdx,      setMarketIdx:      v  => st({ marketIdx: v }),
    pendingMarketShift, setPendingMarketShift: v => st({ pendingMarketShift: v }),
    marketShiftRevealIdx,
    catHistory,
    showBias,       setShowBias:       v  => st({ showBias: v }),
    leaderboard,
    endData,
    bootText,
    callsign,       setCallsign:       v  => st({ callsign: v }),
    callsignSaved,
    seedValue,      setSeedValue:      v  => st({ seedValue: v }),
    seedMode,       setSeedMode:       v  => st({ seedMode: v }),
    shareableSeed,
    copied,         setCopied:         v  => st({ copied: v }),
    flagDuration,
    firedRipples,
    activeRipple,
    isRippleScenario,
    rippleProgress,
    pressureMode,   setPressureMode:   v  => st({ pressureMode: typeof v === 'function' ? v(get().pressureMode) : v }),
    timeLeft,
    timerActive,
    timeExpired,
    decisionTimes,
    lastChoiceForcedByTimer,
    pendingConfidence,
    confidenceRating, setConfidenceRating: v => st({ confidenceRating: v }),
    hoverConfidence,  setHoverConfidence:  v => st({ hoverConfidence: v }),
    calibrationLog,
    narrationOn,    setNarrationOn:    v  => st({ narrationOn: v }),
    soundOn,        setSoundOn:        v  => st({ soundOn: typeof v === 'function' ? v(get().soundOn) : v }),
    replayData,     setReplayData:     v  => st({ replayData: v }),
    analyzerError,  setAnalyzerError:  v  => st({ analyzerError: v }),
    roundLogOpen,   setRoundLogOpen:   v  => st({ roundLogOpen: v }),
    installPrompt,  setInstallPrompt:  v  => st({ installPrompt: v }),
    multiMode,      setMultiMode:      v  => st({ multiMode: v }),
    sessionCode,    setSessionCode:    v  => st({ sessionCode: v }),
    playerNum,      setPlayerNum:      v  => st({ playerNum: v }),
    sessionPhase,   setSessionPhase:   v  => st({ sessionPhase: v }),
    p2NetWorth,
    p2Choice,
    p2Quality,
    p2Outcome,
    p2NetEffect,
    lobbyCode,      setLobbyCode:      v  => st({ lobbyCode: v }),
    lobbyError,
    storageOk,
    spinFrame,
    // Computed
    market,
    progress,
    SPIN_CHARS,
    // Handlers
    startGame,
    pick,
    confirmChoice,
    nextMultiRound,
    saveCallsign,
    proceedFromRipple,
    handleMarketShift,
    resetGame,
    createSession,
    joinSession,
    // Re-exports for lobby inline handlers
    SK,
    storeShared,
    readShared,
    DIFFICULTIES,
  };
}
