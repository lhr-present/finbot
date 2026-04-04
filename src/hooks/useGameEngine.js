// ─── useGameEngine — wires all game state, effects, and handlers ──────────────

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DIFFICULTIES, MARKET_CONDITIONS, CATEGORIES, RIPPLE_TRIGGERS,
  QUALITY_META, FALLBACKS, SPIN_CHARS,
} from "../engine/constants.js";
import { SK, storeShared, readShared, deleteShared } from "../engine/multiplayer.js";
import { callClaude, parseScenarioJSON, buildPrompt } from "../engine/scenarios.js";
import { computeArchetype, resolveEnding } from "../engine/stateMachine.js";
import { sfx, setSoundMuted, isSoundMuted } from "../engine/sounds.js";

// P-07: Plausible custom event helper (no-ops if analytics not loaded)
const plausible = (name, props) => {
  try { window.plausible?.(name, { props }); } catch {}
};

export function useGameEngine() {
  // ─── CORE GAME STATE ────────────────────────────────────────────────────────
  const [screen, setScreen]             = useState("BOOT");
  const [difficulty, setDifficulty]     = useState(null);
  const [apiKey, setApiKey]             = useState(
    typeof import.meta !== "undefined" ? (import.meta.env?.VITE_ANTHROPIC_API_KEY || "") : ""
  );
  const [netWorth, setNetWorth]         = useState(0);
  const [round, setRound]               = useState(0);
  const [dna, setDna]                   = useState({ flags: new Set(), riskScore: 0, disciplineScore: 0 });
  const [scenario, setScenario]         = useState(null);
  const [chosen, setChosen]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [apiError, setApiError]         = useState("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [history, setHistory]           = useState([]);
  const [biasHistory, setBiasHistory]   = useState([]);
  const [marketIdx, setMarketIdx]       = useState(0);
  const [pendingMarketShift, setPendingMarketShift] = useState(null);
  const [marketShiftRevealIdx, setMarketShiftRevealIdx] = useState(0);
  const handleMarketShiftRef            = useRef(null);
  const [catHistory, setCatHistory]     = useState([]);
  const [showBias, setShowBias]         = useState(false);
  const [leaderboard, setLeaderboard]   = useState([]);
  const [endData, setEndData]           = useState(null);
  const [bootText, setBootText]         = useState("");
  const [callsign, setCallsign]         = useState("");
  const [callsignSaved, setCallsignSaved] = useState(false);

  // Feature 1: Seed Mode
  const [seedValue, setSeedValue]       = useState("");
  const [seedMode, setSeedMode]         = useState(false);
  const [copied, setCopied]             = useState(false);

  // Feature 2: Ripple Events
  const [flagDuration, setFlagDuration] = useState({});
  const [firedRipples, setFiredRipples] = useState([]);
  const [activeRipple, setActiveRipple] = useState(null);
  const [isRippleScenario, setIsRippleScenario] = useState(false);
  const [rippleProgress, setRippleProgress] = useState(0);
  const rippleInjectionRef              = useRef("");
  const rippleTimerRef                  = useRef(null);

  // Feature 3: Time Pressure
  const [pressureMode, setPressureMode] = useState(false);
  const [timeLeft, setTimeLeft]         = useState(45);
  const [timerActive, setTimerActive]   = useState(false);
  const [timeExpired, setTimeExpired]   = useState(false);
  const [decisionTimes, setDecisionTimes] = useState([]);
  const [lastChoiceForcedByTimer, setLastChoiceForcedByTimer] = useState(false);
  const timerRef                        = useRef(null);

  // Confidence Meter
  const [pendingConfidence, setPendingConfidence] = useState(false);
  const [confidenceRating, setConfidenceRating]   = useState(null);
  const [hoverConfidence, setHoverConfidence]     = useState(null);
  const [calibrationLog, setCalibrationLog]       = useState([]);

  // Voice Narration
  const [narrationOn, setNarrationOn]   = useState(false);

  // Sound FX
  const [soundOn, setSoundOn]           = useState(true);

  // Replay Analyzer
  const [replayData, setReplayData]     = useState(null);
  const [analyzerError, setAnalyzerError] = useState("");
  const [roundLogOpen, setRoundLogOpen] = useState(false);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState(null);

  // Feature 4: Multiplayer
  const [multiMode, setMultiMode]       = useState(false);
  const [sessionCode, setSessionCode]   = useState("");
  const [playerNum, setPlayerNum]       = useState(1);
  const [sessionPhase, setSessionPhase] = useState("LOBBY");
  const [p2NetWorth, setP2NetWorth]     = useState(0);
  const [p2Choice, setP2Choice]         = useState(null);
  const [p2Quality, setP2Quality]       = useState(null);
  const [p2Outcome, setP2Outcome]       = useState(null);
  const [p2NetEffect, setP2NetEffect]   = useState(null);
  const [lobbyCode, setLobbyCode]       = useState("");
  const [lobbyError, setLobbyError]     = useState("");
  const [storageOk, setStorageOk]       = useState(true);
  const [spinFrame, setSpinFrame]       = useState(0);
  const pollRef                         = useRef(null);

  // Ref for fresh closures
  const confirmChoiceRef                = useRef(null);
  const proceedFromRippleRef            = useRef(null);

  const market = MARKET_CONDITIONS[marketIdx];

  // ─── SYNC SOUND MUTE FLAG ────────────────────────────────────────────────────
  useEffect(() => { setSoundMuted(!soundOn); }, [soundOn]);

  // ─── ON MOUNT: read URL seed param ─────────────────────────────────────────
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("seed");
      if (s) { setSeedValue(s); setSeedMode(true); }
    } catch {}
  }, []);

  // ─── SPINNER ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setSpinFrame((f) => (f + 1) % 4), 250);
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
      setBootText(acc);
    }, 320);
    return () => clearInterval(t);
  }, [screen]);

  // ─── LOAD LEADERBOARD ───────────────────────────────────────────────────────
  useEffect(() => {
    try { setLeaderboard(JSON.parse(localStorage.getItem("finbot_lb") || "[]")); } catch {}
  }, []);

  // ─── CHECK STORAGE AVAILABILITY ─────────────────────────────────────────────
  useEffect(() => {
    if (screen === "LOBBY") {
      try {
        localStorage.setItem("finbot_storage_test", "1");
        localStorage.removeItem("finbot_storage_test");
        setStorageOk(true);
      } catch { setStorageOk(false); }
    }
  }, [screen]);

  // ─── FEATURE 4: LOBBY POLLING (P1 waiting for P2) ──────────────────────────
  useEffect(() => {
    if (screen !== "LOBBY" || sessionPhase !== "WAITING_P2" || !sessionCode) return;
    pollRef.current = setInterval(async () => {
      const sess = await readShared(SK.session(sessionCode));
      if (sess && sess.p2ready) {
        clearInterval(pollRef.current);
        setSessionPhase("BOTH_READY");
        setTimeout(() => {
          setScreen("GAME");
        }, 3000);
      }
    }, 1500);
    return () => clearInterval(pollRef.current);
  }, [screen, sessionPhase, sessionCode]);

  // ─── B-05: P1 DISCONNECT FLAG ON UNLOAD ─────────────────────────────────────
  useEffect(() => {
    if (!multiMode || playerNum !== 1 || !sessionCode) return;
    const handler = () => {
      storeShared(SK.disconnect(sessionCode), { at: Date.now() });
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [multiMode, playerNum, sessionCode]);

  // ─── FEATURE 2: RIPPLE SCREEN ANIMATION ─────────────────────────────────────
  useEffect(() => {
    if (screen !== "RIPPLE") return;
    setRippleProgress(0);
    let prog = 0;
    const step = 100 / 25;
    const interval = setInterval(() => {
      prog = Math.min(100, prog + step);
      setRippleProgress(prog);
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
    setMarketShiftRevealIdx(0);
    const target = pendingMarketShift.to;
    let idx = 0;
    const t = setInterval(() => {
      idx++;
      setMarketShiftRevealIdx(idx);
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
      setTimeLeft(45);
      setTimeExpired(false);
      setTimerActive(true);
    } else {
      if (timerActive) {
        clearInterval(timerRef.current);
        setTimerActive(false);
      }
    }
  }, [screen, pressureMode, chosen]);

  // ─── FEATURE 3: TIMER COUNTDOWN ─────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === 10) sfx.timerWarn();
        if (t <= 1) {
          if (timerActive) {
            clearInterval(timerRef.current);
            setTimerActive(false);
          }
          setTimeExpired(true);
          return 0;
        }
        return t - 1;
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
    setDecisionTimes((dt) => [...dt, { round, secondsLeft: 0 }]);
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
      pressureMode:     pressureMode,
      disciplineScore:  stats.disciplineScore ?? dna.disciplineScore,
      difficulty:       difficulty?.label || null,
      totalRounds:      h.length,
      version:          "3.7",
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
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ─── FETCH SCENARIO ─────────────────────────────────────────────────────────
  const fetchScenario = useCallback(async () => {
    if (!difficulty) return;
    setLoading(true);
    setApiError("");
    setChosen(null);

    // Feature 4: P2 polls for scenario from P1
    if (multiMode && playerNum === 2) {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const dc = await readShared(SK.disconnect(sessionCode));
        if (dc) {
          clearInterval(pollRef.current);
          await deleteShared(SK.disconnect(sessionCode));
          setMultiMode(false);
          setLoading(false);
          setLobbyError("P1 disconnected — continuing solo");
          setTimeout(() => setLobbyError(""), 2500);
          setScreen("GAME");
          return;
        }
        const roundData = await readShared(SK.round(sessionCode));
        if (roundData && roundData.scenario) {
          clearInterval(pollRef.current);
          setScenario(roundData.scenario);
          setCatHistory((p) => [...p, roundData.scenario.category]);
          setLoading(false);
        }
      }, 1500);
      return;
    }

    // B-03: Check if market should shift (every 4 rounds)
    const newIdx = Math.floor((round - 1) / 4) % MARKET_CONDITIONS.length;
    if (newIdx !== marketIdx && !isRippleScenario) {
      const fromMarket = MARKET_CONDITIONS[marketIdx];
      const toMarket = MARKET_CONDITIONS[newIdx];
      sfx.marketShift();
      setPendingMarketShift({ from: fromMarket.label, to: toMarket.label, newIdx });
      setMarketShiftRevealIdx(0);
      setScreen("MARKET_SHIFT");
      setLoading(false);
      return;
    }

    const injection = rippleInjectionRef.current;
    rippleInjectionRef.current = "";

    let parsed = null;
    const activeKey = apiKey || (typeof import.meta !== "undefined" ? import.meta.env?.VITE_ANTHROPIC_API_KEY : "");
    try {
      if (activeKey?.startsWith("sk-ant")) {
        let prompt = buildPrompt(dna, difficulty, market, catHistory, round, seedValue);
        if (injection) {
          prompt = injection + "\n\n" + prompt;
        }
        const raw = await callClaude(activeKey, prompt);
        parsed = parseScenarioJSON(raw);
      }
    } catch (e) {
      const msg = e.name === "AbortError" ? "Request timed out (12s)" : e.message;
      setApiError(`${msg} — using fallback`);
      parsed = FALLBACKS.BEHAVIORAL;
    }

    if (!parsed) {
      setUsedFallback(true);
      const availCats = CATEGORIES.filter((c) => !catHistory.slice(-3).includes(c));
      const cat = availCats[round % availCats.length] || "INVESTING";
      parsed = FALLBACKS[cat] || FALLBACKS.INVESTING;
    } else {
      setUsedFallback(false);
    }

    setScenario(parsed);
    setCatHistory((p) => [...p, parsed.category]);

    if (multiMode && playerNum === 1) {
      await storeShared(SK.round(sessionCode), { scenario: parsed, round });
    }

    setLoading(false);
  }, [round, difficulty, apiKey, dna, marketIdx, market, catHistory, multiMode, playerNum, sessionCode, seedValue, isRippleScenario]);

  useEffect(() => {
    if (screen === "GAME" && !scenario && !loading && round > 0) fetchScenario();
  }, [screen, round, scenario, loading, fetchScenario]);

  // ─── START GAME ─────────────────────────────────────────────────────────────
  const startGame = (diff, key) => {
    sfx.boot();
    plausible('game_start', { difficulty: diff.label });
    setDifficulty(diff);
    setApiKey(key);
    setNetWorth(diff.startNetWorth);
    setDna({ flags: new Set(diff.startingFlags), riskScore: 0, disciplineScore: 0 });
    setRound(1);
    setHistory([]); setBiasHistory([]); setCatHistory([]);
    setMarketIdx(0); setPendingMarketShift(null); setMarketShiftRevealIdx(0);
    setScenario(null); setChosen(null);
    setFlagDuration({}); setFiredRipples([]); setActiveRipple(null); setIsRippleScenario(false);
    setDecisionTimes([]); setLastChoiceForcedByTimer(false); setTimeLeft(45); setTimerActive(false); setTimeExpired(false);
    setCalibrationLog([]); setConfidenceRating(null); setPendingConfidence(false); setHoverConfidence(null);
    setMultiMode(false); setP2NetWorth(0); setP2Choice(null); setP2Quality(null); setP2Outcome(null); setP2NetEffect(null);
    setNarrationOn(false);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setScreen("GAME");
  };

  const pick = (choice) => {
    if (!chosen) {
      sfx.click();
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      setChosen(choice);
      setPendingConfidence(true);
      setConfidenceRating(null);
      setHoverConfidence(null);
    }
  };

  // ─── CONFIRM CHOICE ─────────────────────────────────────────────────────────
  const confirmChoice = (choiceObj = null, forcedByTimer = false, explicitConfidence = null) => {
    const c = choiceObj || chosen;
    if (!c || !scenario || !difficulty) return;

    // Stop timer (B-07: guard against double-clear)
    if (timerActive) {
      clearInterval(timerRef.current);
      setTimerActive(false);
    }

    if (pressureMode && !forcedByTimer) {
      setDecisionTimes((dt) => [...dt, { round, secondsLeft: timeLeft }]);
    }
    setLastChoiceForcedByTimer(forcedByTimer);
    if (forcedByTimer) setChosen(c);

    // Sound + analytics: outcome quality
    if (forcedByTimer) sfx.timerExpired();
    else if (['OPTIMAL', 'GOOD'].includes(c.quality)) sfx.good();
    else if (c.quality === 'NEUTRAL') sfx.neutral();
    else sfx.bad();
    plausible('choice_made', { quality: c.quality, round, category: scenario.category });

    setCalibrationLog(prev => [...prev, {
      round,
      confidence: forcedByTimer ? 0 : (explicitConfidence !== null ? explicitConfidence : (confidenceRating || 0)),
      wasGood: ['OPTIMAL', 'GOOD'].includes(c.quality),
      quality: c.quality,
    }]);
    setConfidenceRating(null);
    setPendingConfidence(false);

    const newWorth = Math.max(0, netWorth + c.netEffect);

    const newFlags = new Set([...dna.flags]);
    (c.flagsAdd || []).forEach((f) => newFlags.add(f));
    (c.flagsRemove || []).forEach((f) => newFlags.delete(f));
    const newDna = {
      flags: newFlags,
      riskScore: Math.min(100, dna.riskScore + (["CATASTROPHIC","POOR"].includes(c.quality) ? 15 : c.quality === "OPTIMAL" ? -5 : 0)),
      disciplineScore: Math.min(100, dna.disciplineScore + (["OPTIMAL","GOOD"].includes(c.quality) ? 10 : 0)),
    };

    if (c.biasWarning) setBiasHistory((p) => [...p, { round, bias: c.biasWarning, quality: c.quality }]);

    const entry = { round, category: scenario.category, title: scenario.title, choice: c, netEffect: c.netEffect, netWorthAfter: newWorth, market: market.id };
    const newHistory = [...history, entry];
    setHistory(newHistory);
    setNetWorth(newWorth);
    setDna(newDna);

    // B-04 fix: build flagDuration from scratch
    const newFlagDuration = {};
    for (const flag of newFlags) {
      newFlagDuration[flag] = (flagDuration[flag] || 0) + 1;
    }
    setFlagDuration(newFlagDuration);

    const nextRound = round + 1;
    const gameOver = newWorth <= 0 || nextRound > difficulty.rounds || newWorth >= difficulty.target;

    if (!gameOver) {
      // Feature 2: check ripple triggers
      for (const [flag, trigger] of Object.entries(RIPPLE_TRIGGERS)) {
        if (
          newFlagDuration[flag] >= trigger.threshold &&
          !firedRipples.includes(flag) &&
          round >= 2
        ) {
          const newFiredRipples = [...firedRipples, flag];
          sfx.ripple();
          setFiredRipples(newFiredRipples);
          setActiveRipple({ flag, ...trigger });
          setScenario(null);
          setChosen(null);
          setScreen("RIPPLE");
          return;
        }
      }

      // Feature 4: multiplayer path
      if (multiMode) {
        const worthKey = playerNum === 1 ? SK.p1Worth(sessionCode) : SK.p2Worth(sessionCode);
        const choiceKey = playerNum === 1 ? SK.p1Choice(sessionCode) : SK.p2Choice(sessionCode);
        storeShared(worthKey, newWorth);
        storeShared(choiceKey, { label: c.label, quality: c.quality, netEffect: c.netEffect, outcome: c.outcome });
        setScreen("WAITING_REVEAL");

        let elapsed = 0;
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          elapsed += 1500;
          if (playerNum === 2) {
            const dc = await readShared(SK.disconnect(sessionCode));
            if (dc) {
              clearInterval(pollRef.current);
              await deleteShared(SK.disconnect(sessionCode));
              setMultiMode(false);
              setP2Choice(null); setP2Quality(null); setP2Outcome(null); setP2NetEffect(null);
              setLobbyError("P1 disconnected — continuing solo");
              setTimeout(() => setLobbyError(""), 2500);
              setRound(nextRound);
              setScenario(null);
              setChosen(null);
              setIsRippleScenario(false);
              setScreen("GAME");
              return;
            }
          }
          const oppKey = playerNum === 1 ? SK.p2Choice(sessionCode) : SK.p1Choice(sessionCode);
          const oppWorthKey = playerNum === 1 ? SK.p2Worth(sessionCode) : SK.p1Worth(sessionCode);
          const oppChoice = await readShared(oppKey);
          const oppWorth = await readShared(oppWorthKey);
          if (oppChoice) {
            clearInterval(pollRef.current);
            setP2Choice(oppChoice.label);
            setP2Quality(oppChoice.quality);
            setP2Outcome(oppChoice.outcome);
            setP2NetEffect(oppChoice.netEffect);
            if (oppWorth !== null) setP2NetWorth(oppWorth);
            await deleteShared(SK.p1Choice(sessionCode));
            await deleteShared(SK.p2Choice(sessionCode));
            setScreen("GAME");
          } else if (elapsed >= 30000) {
            clearInterval(pollRef.current);
            setMultiMode(false);
            setRound(nextRound);
            setScenario(null);
            setChosen(null);
            setIsRippleScenario(false);
            setScreen("GAME");
          }
        }, 1500);
        return;
      }

      setRound(nextRound);
      setScenario(null);
      setChosen(null);
      setIsRippleScenario(false);
    } else {
      // Game over
      const optimal = newHistory.filter((h) => h.choice.quality === "OPTIMAL").length;
      const catastrophic = newHistory.filter((h) => h.choice.quality === "CATASTROPHIC").length;
      const highRisk = newHistory.filter((h) => ["FOMO","HERD_MENTALITY"].includes(h.choice.biasWarning) || h.choice.quality === "CATASTROPHIC").length;
      const half = Math.floor(newHistory.length / 2);
      const firstHalf = newHistory.slice(0, half).filter((h) => h.choice.quality === "OPTIMAL").length / Math.max(1, half);
      const secondHalf = newHistory.slice(half).filter((h) => h.choice.quality === "OPTIMAL").length / Math.max(1, newHistory.length - half);
      const finalStats = {
        optimalRate: optimal / Math.max(1, newHistory.length),
        catastrophicCount: catastrophic,
        disciplineScore: newDna.disciplineScore,
        highRiskChoices: highRisk,
        firstHalfOptimal: firstHalf,
        secondHalfOptimal: secondHalf,
        totalRounds: newHistory.length,
        optimal,
        finalNetWorth: newWorth,
        target: difficulty.target,
      };
      const arc = computeArchetype(finalStats);

      try {
        const lb = JSON.parse(localStorage.getItem("finbot_lb") || "[]");
        lb.push({ netWorth: newWorth, archetype: arc.title, grade: arc.grade, diff: difficulty.label, date: new Date().toLocaleDateString() });
        lb.sort((a, b) => b.netWorth - a.netWorth);
        const top = lb.slice(0, 10);
        localStorage.setItem("finbot_lb", JSON.stringify(top));
        setLeaderboard(top);
      } catch {}

      setEndData({ stats: finalStats, archetype: arc, history: newHistory, finalNetWorth: newWorth, p2FinalNetWorth: p2NetWorth });
      if (['S', 'A'].includes(arc.grade)) sfx.win();
      else sfx.lose();
      plausible('game_end', { grade: arc.grade, archetype: arc.title, difficulty: difficulty.label });
      setScreen("END");
    }
  };

  // Set refs inline (fresh closure pattern)
  confirmChoiceRef.current = confirmChoice;

  handleMarketShiftRef.current = () => {
    if (!pendingMarketShift) return;
    setMarketIdx(pendingMarketShift.newIdx);
    setPendingMarketShift(null);
    setMarketShiftRevealIdx(0);
    setScreen("GAME");
  };

  proceedFromRippleRef.current = () => {
    clearTimeout(rippleTimerRef.current);
    rippleInjectionRef.current = activeRipple ? activeRipple.promptInjection : "";
    setIsRippleScenario(true);
    setScreen("GAME");
  };

  // ─── MULTIPLAYER: NEXT ROUND ─────────────────────────────────────────────────
  const nextMultiRound = () => {
    setP2Choice(null); setP2Quality(null); setP2Outcome(null); setP2NetEffect(null);
    setChosen(null); setScenario(null); setIsRippleScenario(false);

    for (const [flag, trigger] of Object.entries(RIPPLE_TRIGGERS)) {
      if (
        flagDuration[flag] >= trigger.threshold &&
        !firedRipples.includes(flag) &&
        round >= 2
      ) {
        const newFiredRipples = [...firedRipples, flag];
        setFiredRipples(newFiredRipples);
        setActiveRipple({ flag, ...trigger });
        setScreen("RIPPLE");
        return;
      }
    }

    setRound((r) => r + 1);
  };

  const saveCallsign = (data) => {
    const tag = callsign.trim().toUpperCase().slice(0, 3) || "---";
    try {
      const lb = JSON.parse(localStorage.getItem("finbot_lb") || "[]");
      const filtered = lb.filter((e) => e.callsign !== tag);
      filtered.push({
        callsign: tag,
        netWorth: data.stats.finalNetWorth,
        archetype: data.archetype.title,
        grade: data.archetype.grade,
        optimalRate: data.stats.optimalRate,
        diff: difficulty?.label,
        date: new Date().toLocaleDateString(),
      });
      filtered.sort((a, b) => b.netWorth - a.netWorth);
      const top = filtered.slice(0, 10);
      localStorage.setItem("finbot_lb", JSON.stringify(top));
      setLeaderboard(top);
    } catch {}

    const worstBias = Object.entries(
      biasHistory.reduce((acc, b) => { acc[b.bias] = (acc[b.bias] || 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    fetch("http://localhost:3001/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callsign: tag,
        netWorth: data.stats.finalNetWorth,
        archetype: data.archetype.title,
        grade: data.archetype.grade,
        optimalRate: data.stats.optimalRate,
        worstBias,
        totalRounds: data.stats.totalRounds,
        difficulty: difficulty?.label,
        date: new Date().toLocaleDateString(),
        notes: `DISCIPLINE:${data.stats.disciplineScore} CATASTROPHIC:${data.stats.catastrophicCount}`,
      }),
    }).catch(() => {});

    setCallsignSaved(true);
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
    setSessionCode(code);
    setPlayerNum(1);
    await storeShared(SK.session(code), { host: true, created: Date.now(), p2ready: false });
    setSessionPhase("WAITING_P2");
  };

  // ─── LOBBY: JOIN SESSION (P2) ────────────────────────────────────────────────
  const joinSession = async (lobbyCode, currentDifficulty) => {
    const sess = await readShared(SK.session(lobbyCode));
    if (!sess) { setLobbyError("Session not found"); return; }
    setSessionCode(lobbyCode);
    setPlayerNum(2);
    await storeShared(SK.session(lobbyCode), { ...sess, p2ready: true });
    setSessionPhase("BOTH_READY");
    setTimeout(() => {
      const diff = currentDifficulty || DIFFICULTIES.BALANCED;
      setDifficulty(diff);
      setNetWorth(diff.startNetWorth);
      setDna({ flags: new Set(diff.startingFlags), riskScore: 0, disciplineScore: 0 });
      setRound(1);
      setHistory([]); setBiasHistory([]); setCatHistory([]);
      setMarketIdx(0); setPendingMarketShift(null); setMarketShiftRevealIdx(0);
      setScenario(null); setChosen(null);
      setScreen("GAME");
    }, 3000);
  };

  const resetGame = () => {
    clearInterval(pollRef.current);
    if (sessionCode) {
      deleteShared(SK.session(sessionCode));
      deleteShared(SK.round(sessionCode));
      deleteShared(SK.p1Choice(sessionCode));
      deleteShared(SK.p2Choice(sessionCode));
      deleteShared(SK.p1Worth(sessionCode));
      deleteShared(SK.p2Worth(sessionCode));
      deleteShared(SK.disconnect(sessionCode));
    }
    setScreen("BOOT"); setBootText(""); setDifficulty(null);
    setEndData(null); setCallsign(""); setCallsignSaved(false);
    setSeedValue(""); setSeedMode(false); setCopied(false);
    setPendingMarketShift(null); setMarketShiftRevealIdx(0);
    setFlagDuration({}); setFiredRipples([]); setActiveRipple(null); setIsRippleScenario(false);
    setDecisionTimes([]); setLastChoiceForcedByTimer(false); setTimeLeft(45); setTimerActive(false); setTimeExpired(false);
    setCalibrationLog([]); setConfidenceRating(null); setPendingConfidence(false); setHoverConfidence(null);
    setNarrationOn(false);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setMultiMode(false); setSessionCode(""); setPlayerNum(1); setSessionPhase("LOBBY");
    setP2NetWorth(0); setP2Choice(null); setP2Quality(null); setP2Outcome(null); setP2NetEffect(null);
    setLobbyCode(""); setLobbyError("");
  };

  return {
    // State
    screen, setScreen,
    difficulty, setDifficulty,
    apiKey, setApiKey,
    netWorth, setNetWorth,
    round,
    dna, setDna,
    scenario,
    chosen,
    loading,
    apiError,
    usedFallback,
    history,
    biasHistory,
    marketIdx, setMarketIdx,
    pendingMarketShift, setPendingMarketShift,
    marketShiftRevealIdx,
    catHistory,
    showBias, setShowBias,
    leaderboard,
    endData,
    bootText,
    callsign, setCallsign,
    callsignSaved,
    seedValue, setSeedValue,
    seedMode, setSeedMode,
    copied, setCopied,
    flagDuration,
    firedRipples,
    activeRipple,
    isRippleScenario,
    rippleProgress,
    pressureMode, setPressureMode,
    timeLeft,
    timerActive,
    timeExpired,
    decisionTimes,
    lastChoiceForcedByTimer,
    pendingConfidence,
    confidenceRating, setConfidenceRating,
    hoverConfidence, setHoverConfidence,
    calibrationLog,
    narrationOn, setNarrationOn,
    soundOn, setSoundOn,
    replayData, setReplayData,
    analyzerError, setAnalyzerError,
    roundLogOpen, setRoundLogOpen,
    installPrompt,
    multiMode, setMultiMode,
    sessionCode, setSessionCode,
    playerNum, setPlayerNum,
    sessionPhase, setSessionPhase,
    p2NetWorth,
    p2Choice,
    p2Quality,
    p2Outcome,
    p2NetEffect,
    lobbyCode, setLobbyCode,
    lobbyError,
    storageOk,
    spinFrame,
    // Computed
    market,
    progress,
    SPIN_CHARS,
    // Functions
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
    // Re-export for lobby inline handlers
    SK,
    storeShared,
    readShared,
    DIFFICULTIES,
  };
}
