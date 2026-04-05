// FINBOT-9000 v4.0 — Post-Terminal Financial Decision Vault
// v3.1: B-01/03/04 fixes, difficulty, leaderboard, bias panel, split-path endings
// v3.2: ⚠ OFFLINE MODE tag, 3-letter callsign, narrative continuity prompt, temptation rule,
//        import.meta.env API key, Obsidian sync POST, install.sh
// v3.3: Seed Mode, Ripple Events, Time Pressure, 2-Player Sync
// v3.4: B-01 AbortController fix, prompt tuning, 5 split-path endings
// v3.5: Confidence Meter + calibration scoring, B-08 PATIENT_COMPOUNDER fix
// v3.6: B-03 Market Shift interrupt card — typewriter reveal, consequence text, rAF countdown, ripple collision handling
// v3.7: Scenario Export (Blob JSON download), Calibration Blind Spot Report (calibScore < 40% + overconfCount >= 3)
// v3.8: Obsidian Webhook (POST localhost:7788/finbot-result, fire-and-forget), B-07 timer double-clear guard
// v3.9: B-04 flagDuration spread fix, B-05 P1 disconnect detection, prompt biasWarning normalization
// v4.0: Voice Narration (Web Speech API), Mobile PWA (vite-plugin-pwa + OFFLINE_SCENARIOS), Replay Analyzer
// P-01: Architecture split — render layer only. Engine in src/engine/, hook in src/hooks/
// Run: cd ~/projects/finbot && npm run dev

import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameEngine } from "./hooks/useGameEngine.js";
import { sfx } from "./engine/sounds.js";
import {
  DIFFICULTIES, MARKET_CONDITIONS, COGNITIVE_BIASES, QUALITY_META,
  BIAS_EXPLANATIONS, RIPPLE_TRIGGERS, MARKET_SHIFT_META,
  fmt, qualityColor, css, SPIN_CHARS,
} from "./engine/constants.js";
import { resolveEnding } from "./engine/stateMachine.js";
import { ACHIEVEMENTS } from "./engine/reinforcement.js";
import confetti from "canvas-confetti";

// ─── ANIMATION PRESETS ────────────────────────────────────────────────────────
const fadeUp   = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25 } };
const fadeIn   = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };
const slideIn  = { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, transition: { duration: 0.3, ease: "easeOut" } };

// ─── B-03: MARKET SHIFT COUNTDOWN BAR ────────────────────────────────────────

const MarketShiftCountdownBar = memo(function MarketShiftCountdownBar({ duration = 3000, color = "#00ff88" }) {
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const [pct, setPct] = useState(0);
  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startRef.current;
      const p = Math.min(100, (elapsed / duration) * 100);
      setPct(p);
      if (p < 100) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration]);
  return (
    <div style={{ height: 3, background: "#1a1a1a", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}`, transition: "none" }} />
    </div>
  );
});

// ─── FEATURE 3: TIMER BAR COMPONENT ──────────────────────────────────────────

const TimerBar = memo(function TimerBar({ timeLeft, total = 45 }) {
  const pct = (timeLeft / total) * 100;
  const color = timeLeft > 20 ? "#00ff88" : timeLeft > 10 ? "#ffaa00" : "#ff2222";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 4 }}>
        <span style={{ color, letterSpacing: 2 }}>⏱ TIME PRESSURE</span>
        <span style={{ color, fontWeight: "bold" }}>{timeLeft}s</span>
      </div>
      <div style={{ height: 4, background: "#1a1a1a", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 1s linear", boxShadow: `0 0 6px ${color}` }} />
      </div>
    </div>
  );
});

// ─── MAIN COMPONENT (render layer only) ──────────────────────────────────────

export default function FINBOT9000() {
  const {
    screen, setScreen,
    difficulty, setDifficulty,
    apiKey, setApiKey,
    netWorth,
    round,
    dna,
    scenario,
    chosen,
    loading,
    apiError,
    usedFallback,
    history,
    biasHistory,
    pendingMarketShift,
    marketShiftRevealIdx,
    showBias, setShowBias,
    leaderboard,
    endData,
    bootText,
    callsign, setCallsign,
    callsignSaved,
    seedValue, setSeedValue,
    seedMode, setSeedMode,
    shareableSeed,
    copied, setCopied,
    firedRipples,
    activeRipple,
    isRippleScenario,
    rippleProgress,
    pressureMode, setPressureMode,
    timeLeft,
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
    installPrompt, setInstallPrompt,
    multiMode, setMultiMode,
    sessionCode, setSessionCode,
    playerNum,
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
    market,
    progress,
    achievements,
    newAchievements,
    streak,
    personalBests,
    dailyDone,
    getDailySeed,
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
  } = useGameEngine();

  // ─── Confetti burst when achievements unlock ──────────────────────────────
  useEffect(() => {
    if (screen !== "END" || newAchievements.length === 0) return;
    const burst = (angle, origin) => confetti({
      particleCount: 40,
      angle,
      spread: 55,
      origin,
      colors: ["#00ff88", "#00e5ff", "#ffaa00", "#aa88ff"],
      scalar: 0.9,
      gravity: 1.2,
    });
    burst(60,  { x: 0, y: 0.65 });
    burst(120, { x: 1, y: 0.65 });
  }, [screen, newAchievements.length]);

  // ─── BOOT ───────────────────────────────────────────────────────────────────
  if (screen === "BOOT") return (
    <div style={css.root}>
      <div style={css.scan} />
      <motion.div style={css.wrap} {...fadeUp}>
        <div style={{ textAlign: "center", paddingTop: 50 }}>
          <div style={{ fontSize: 30, color: "#00ff88", letterSpacing: 10, textShadow: "0 0 24px #00ff88", marginBottom: 6 }}>FINBOT-9000</div>
          <div style={{ fontSize: 10, color: "#333", letterSpacing: 5, marginBottom: 36 }}>POST-TERMINAL FINANCIAL DECISION VAULT · v4.0</div>
          <pre style={{ fontSize: 12, color: "#00cc66", textAlign: "left", display: "inline-block", minHeight: 130, marginBottom: 36 }}>{bootText}</pre>

          {bootText.includes("SELECT") && (<>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: 3, marginBottom: 20 }}>// DIFFICULTY MODE</div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 30 }}>
              {Object.values(DIFFICULTIES).map((d) => (
                <button key={d.label} onClick={() => setDifficulty(d)} style={{
                  background: difficulty?.label === d.label ? d.color + "18" : "#111",
                  border: `1px solid ${difficulty?.label === d.label ? d.color : "#2a2a2a"}`,
                  color: d.color, padding: "16px 22px", cursor: "pointer",
                  fontFamily: "monospace", fontSize: 13, minWidth: 190,
                  boxShadow: difficulty?.label === d.label ? `0 0 14px ${d.color}44` : "none",
                  transition: "all 0.2s",
                }}>
                  <div style={{ fontWeight: "bold", letterSpacing: 2 }}>{d.label}</div>
                  <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>{d.desc}</div>
                  <div style={{ fontSize: 10, marginTop: 8, color: "#888" }}>
                    {fmt(d.startNetWorth)} → {fmt(d.target)} · {d.rounds} rounds
                  </div>
                </button>
              ))}
            </div>

            {difficulty && (<>
              {/* Feature 3: Pressure Mode Toggle */}
              <div style={{ maxWidth: 440, margin: "0 auto 20px", background: "#0d0d0d", border: `1px solid ${pressureMode ? "#ffaa00" : "#1a1a1a"}`, padding: "14px 18px", textAlign: "left", cursor: "pointer" }}
                onClick={() => setPressureMode((p) => !p)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, color: pressureMode ? "#ffaa00" : "#555", letterSpacing: 2 }}>⏱ TIME PRESSURE MODE</div>
                    <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>45s per decision · worst choice forced on expiry</div>
                  </div>
                  <div style={{ fontSize: 16, color: pressureMode ? "#ffaa00" : "#333" }}>{pressureMode ? "ON" : "OFF"}</div>
                </div>
              </div>

              {/* Feature 1: Seed Input */}
              <div style={{ maxWidth: 440, margin: "0 auto 20px", textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 6 }}>// SCENARIO SEED (optional — share runs with others)</div>
                <input
                  type="text"
                  placeholder="leave blank for random..."
                  value={seedValue}
                  onChange={(e) => { setSeedValue(e.target.value); setSeedMode(e.target.value.length > 0); }}
                  style={{ background: "#111", border: `1px solid ${seedMode ? "#aa88ff" : "#2a2a2a"}`, color: "#aa88ff", padding: "7px 12px", fontFamily: "monospace", fontSize: 12, width: "100%", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginBottom: 8 }}>
                // ANTHROPIC API KEY — leave blank for demo mode (12 curated scenarios)
              </div>
              <input type="password" placeholder="sk-ant-api03-..." value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ background: "#111", border: "1px solid #2a2a2a", color: "#00ff88", padding: "8px 14px", fontFamily: "monospace", fontSize: 12, width: 340, outline: "none", marginBottom: 6 }}
              />
              <div style={{ fontSize: 10, color: "#333", marginBottom: 28 }}>With key: Claude generates unique AI scenarios each round</div>

              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => startGame(difficulty, apiKey)} style={css.btn(difficulty.color)}>
                  BOOT SYSTEM ▶
                </button>
                <button onClick={() => {
                  const seed = getDailySeed();
                  setSeedValue(seed); setSeedMode(true);
                  startGame(difficulty, apiKey);
                }} style={{ ...css.btn(dailyDone ? "#333" : "#ffaa00"), position: "relative" }}
                  title={dailyDone ? "Today's challenge completed" : "Same seed for all players today"}>
                  {dailyDone ? "DAILY ✓" : "DAILY ▶"}
                </button>
                <button onClick={() => { setMultiMode(true); setScreen("LOBBY"); }} style={css.btn("#00e5ff")}>
                  MULTIPLAYER ▶
                </button>
                <button onClick={() => setScreen("ANALYZER")} style={css.btn("#888")}>
                  ANALYZE REPLAY ▶
                </button>
              </div>

              {installPrompt && (
                <div style={{ marginTop: 24, maxWidth: 440, margin: "24px auto 0", background: "#0d0d0d", border: "1px solid #00ff8844", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#00ff88", letterSpacing: 2 }}>INSTALL APP</div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>Add to home screen for offline play</div>
                  </div>
                  <button onClick={() => { installPrompt.prompt(); installPrompt.userChoice.then(() => setInstallPrompt(null)); }}
                    style={{ background: "#00ff8820", border: "1px solid #00ff88", color: "#00ff88", padding: "6px 14px", cursor: "pointer", fontFamily: "monospace", fontSize: 11 }}>
                    INSTALL
                  </button>
                </div>
              )}
            </>)}

            {/* ── Reinforcement loop panel ── */}
            {(streak > 0 || achievements.length > 0 || Object.keys(personalBests).length > 0) && (
              <div style={{ marginTop: 44, maxWidth: 560, margin: "44px auto 0", textAlign: "left" }}>

                {/* Streak + achievement count row */}
                <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
                  {streak > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, color: streak >= 7 ? "#ffaa00" : "#555" }}>▶</span>
                      <span style={{ fontSize: 11, color: streak >= 7 ? "#ffaa00" : "#888", letterSpacing: 2 }}>
                        {streak} DAY STREAK
                      </span>
                    </div>
                  )}
                  {achievements.length > 0 && (
                    <span style={{ fontSize: 10, color: "#333", letterSpacing: 2 }}>
                      ACHIEVEMENTS [{achievements.length}/{ACHIEVEMENTS.length}]
                    </span>
                  )}
                </div>

                {/* Achievement shelf */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                  {ACHIEVEMENTS.map(a => {
                    const unlocked = achievements.includes(a.id);
                    return (
                      <div key={a.id} title={`${a.label}: ${a.desc}`} style={{
                        width: 42, height: 42, background: unlocked ? "#0d1a0d" : "#0a0a0a",
                        border: `1px solid ${unlocked ? "#00ff8844" : "#1a1a1a"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, cursor: "help",
                        color: unlocked ? "#00ff88" : "#1e1e1e",
                        transition: "all 0.2s",
                      }}>
                        {a.icon}
                      </div>
                    );
                  })}
                </div>

                {/* Personal Bests */}
                {Object.keys(personalBests).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#222", letterSpacing: 3, marginBottom: 8 }}>// PERSONAL BESTS</div>
                    {Object.entries(personalBests).map(([diff, pb]) => (
                      <div key={diff} style={{ display: "flex", gap: 10, fontSize: 10, padding: "3px 0", alignItems: "center" }}>
                        <span style={{ color: "#333", minWidth: 120, letterSpacing: 1 }}>{diff}</span>
                        <div style={{ flex: 1, height: 3, background: "#111" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, (pb.netWorth / 1000000) * 100)}%`, background: "#00ff8844" }} />
                        </div>
                        <span style={{ color: "#00ff88", minWidth: 80, textAlign: "right" }}>{fmt(pb.netWorth)}</span>
                        <span style={{ color: "#444", minWidth: 28 }}>[{pb.grade}]</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {leaderboard.length > 0 && (
              <div style={{ marginTop: 44, maxWidth: 560, margin: "44px auto 0", textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 12 }}>// ALL-TIME LEADERBOARD</div>
                {leaderboard.slice(0, 6).map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, fontSize: 11, borderBottom: "1px solid #111", padding: "5px 0", alignItems: "center" }}>
                    <span style={{ color: i === 0 ? "#ffaa00" : "#333", minWidth: 24 }}>#{i + 1}</span>
                    <span style={{ color: "#777", flex: 1 }}>{e.archetype}</span>
                    <span style={{ color: "#666", fontSize: 10 }}>[{e.grade}]</span>
                    <span style={{ color: "#00ff88" }}>{fmt(e.netWorth)}</span>
                    <span style={{ color: "#333" }}>{e.diff}</span>
                  </div>
                ))}
              </div>
            )}
          </>)}
        </div>
      </motion.div>
    </div>
  );

  // ─── LOBBY ──────────────────────────────────────────────────────────────────
  if (screen === "LOBBY") return (
    <div style={css.root}>
      <div style={css.scan} />
      <div style={css.wrap}>
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: 5, marginBottom: 16 }}>⚡ MULTIPLAYER LOBBY</div>

          {!storageOk && (
            <div style={{ background: "#1a0000", border: "1px solid #ff4444", padding: 20, maxWidth: 480, margin: "0 auto 24px" }}>
              <div style={{ color: "#ff4444", fontSize: 12, marginBottom: 12 }}>Storage unavailable — multiplayer requires localStorage</div>
              <button onClick={() => { setMultiMode(false); setScreen("BOOT"); }} style={css.btn("#ff4444")}>BACK TO SOLO</button>
            </div>
          )}

          {storageOk && (<>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 640, margin: "0 auto 30px" }}>
              {/* Player 1 panel */}
              <div style={{ background: "#0d0d0d", border: "1px solid #00e5ff33", padding: 20, textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: 3, marginBottom: 14 }}>PLAYER 1 — HOST</div>
                {sessionPhase === "LOBBY" && (
                  <button onClick={createSession} style={css.btn("#00e5ff")}>GENERATE CODE</button>
                )}
                {sessionPhase === "WAITING_P2" && (
                  <div>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 8 }}>Share this code with Player 2:</div>
                    <div style={{ fontSize: 36, color: "#00e5ff", letterSpacing: 8, textShadow: "0 0 20px #00e5ff", marginBottom: 12 }}>{sessionCode}</div>
                    <div style={{ fontSize: 11, color: "#444" }}>{SPIN_CHARS[spinFrame]} Waiting for P2 to join...</div>
                  </div>
                )}
                {sessionPhase === "BOTH_READY" && (
                  <div style={{ color: "#00ff88" }}>P2 joined! Starting in 3s...</div>
                )}
              </div>

              {/* Player 2 panel */}
              <div style={{ background: "#0d0d0d", border: "1px solid #aa88ff33", padding: 20, textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#aa88ff", letterSpacing: 3, marginBottom: 14 }}>PLAYER 2 — JOIN</div>
                <input
                  type="text"
                  placeholder="XXXX"
                  maxLength={4}
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                  style={{ background: "#111", border: "1px solid #aa88ff", color: "#aa88ff", padding: "8px 12px", fontFamily: "monospace", fontSize: 18, width: 80, outline: "none", letterSpacing: 4, textAlign: "center", marginRight: 10 }}
                />
                <button onClick={() => joinSession(lobbyCode, difficulty)} style={{ ...css.btn("#aa88ff"), padding: "8px 16px", fontSize: 11 }}>JOIN</button>
                {lobbyError && <div style={{ color: "#ff4444", fontSize: 10, marginTop: 8 }}>{lobbyError}</div>}
              </div>
            </div>

            <button onClick={() => { setMultiMode(false); setScreen("BOOT"); }} style={{ background: "none", border: "none", color: "#444", fontFamily: "monospace", fontSize: 11, cursor: "pointer", letterSpacing: 2 }}>
              ← BACK TO SOLO
            </button>
          </>)}
        </div>
      </div>
    </div>
  );

  // ─── RIPPLE SCREEN ──────────────────────────────────────────────────────────
  if (screen === "RIPPLE" && activeRipple) return (
    <div style={css.root}>
      <div style={css.scan} />
      <motion.div style={css.wrap} {...fadeUp}>
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <motion.div {...fadeIn} style={{ fontSize: 10, color: activeRipple.interruptColor, letterSpacing: 5, marginBottom: 16, animation: "pulse 1s infinite" }}>
            ⚡ RIPPLE EVENT
          </motion.div>
          <motion.div {...slideIn} style={{
            border: `2px solid ${activeRipple.interruptColor}`,
            boxShadow: `0 0 40px ${activeRipple.interruptColor}44, inset 0 0 20px ${activeRipple.interruptColor}11`,
            padding: "40px 30px", maxWidth: 560, margin: "0 auto 30px",
            animation: "pulseBorder 1s ease-in-out infinite",
          }}>
            <div style={{ fontSize: 22, color: activeRipple.interruptColor, letterSpacing: 4, marginBottom: 10 }}>
              {activeRipple.interruptLabel}
            </div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8, marginBottom: 20 }}>
              Your pattern of <span style={{ color: activeRipple.interruptColor }}>{activeRipple.flag.replace(/_/g, " ")}</span> has triggered a cascade effect. The decisions you made earlier in this simulation are now creating real consequences.
            </div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 24 }}>
              A special scenario has been prepared that directly confronts this pattern.
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ height: 4, background: "#1a1a1a", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${rippleProgress}%`, background: activeRipple.interruptColor, transition: "width 0.1s linear" }} />
              </div>
              <div style={{ fontSize: 9, color: "#333", marginTop: 4, textAlign: "right" }}>auto-proceeding...</div>
            </div>

            <button onClick={proceedFromRipple} style={css.btn(activeRipple.interruptColor)}>
              FACE IT NOW →
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );

  // ─── WAITING REVEAL (must render BEFORE GAME screen) ────────────────────────
  if (screen === "WAITING_REVEAL") return (
    <div style={css.root}>
      <div style={css.scan} />
      <div style={css.wrap}>
        {/* Read-only scenario display */}
        {scenario && (
          <div style={{ marginBottom: 20, opacity: 0.7 }}>
            <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 8 }}>// ROUND {round} SCENARIO (LOCKED IN)</div>
            <div style={{ fontSize: 17, color: "#999", marginBottom: 8 }}>{scenario.title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
              {(scenario.choices || []).map((c) => (
                <div key={c.id} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", padding: 12 }}>
                  <div style={{ fontSize: 9, color: "#333", marginBottom: 4, letterSpacing: 2 }}>OPTION {c.id}</div>
                  <div style={{ fontSize: 12, color: chosen?.id === c.id ? "#00ff88" : "#555" }}>{c.label}</div>
                  {chosen?.id === c.id && <div style={{ fontSize: 9, color: "#00ff88", marginTop: 4 }}>✓ YOUR CHOICE</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 28, color: "#00e5ff", marginBottom: 16 }}>{SPIN_CHARS[spinFrame]}</div>
          <div style={{ fontSize: 14, color: "#555", letterSpacing: 3, marginBottom: 8 }}>WAITING FOR OPPONENT</div>
          <div style={{ fontSize: 11, color: "#333" }}>Both choices lock in before outcomes are revealed</div>
        </div>
      </div>
    </div>
  );

  // ─── B-03: MARKET SHIFT INTERRUPT SCREEN ────────────────────────────────────
  if (screen === "MARKET_SHIFT" && pendingMarketShift) {
    const newMarket = MARKET_CONDITIONS[pendingMarketShift.newIdx];
    const meta = MARKET_SHIFT_META[newMarket.id] || {};
    const displayText = pendingMarketShift.to.slice(0, marketShiftRevealIdx);
    const isFullyRevealed = marketShiftRevealIdx >= pendingMarketShift.to.length;
    return (
      <div style={css.root}>
        <div style={css.scan} />
        <motion.div style={css.wrap} {...fadeUp}>
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 5, marginBottom: 28 }}>⚡ MACRO REGIME SHIFT</div>
            <motion.div {...slideIn} style={{
              border: `2px solid ${newMarket.color}`,
              boxShadow: `0 0 40px ${newMarket.color}33, inset 0 0 20px ${newMarket.color}08`,
              padding: "40px 30px", maxWidth: 560, margin: "0 auto 30px",
            }}>
              {/* Old regime — struck through */}
              <div style={{ fontSize: 12, color: "#2a2a2a", letterSpacing: 4, marginBottom: 16, textDecoration: "line-through" }}>
                {pendingMarketShift.from}
              </div>

              {/* New regime — typewriter */}
              <div style={{ fontSize: 30, color: newMarket.color, letterSpacing: 5, textShadow: `0 0 24px ${newMarket.color}`, marginBottom: 20, minHeight: 44 }}>
                {displayText}
                <span style={{ opacity: isFullyRevealed ? 0 : 1 }}>_</span>
              </div>

              {/* Consequence text — appears after full reveal */}
              <div style={{ fontSize: 12, color: isFullyRevealed ? "#888" : "transparent", lineHeight: 1.8, marginBottom: 20, maxWidth: 400, margin: "0 auto 20px", transition: "color 0.5s" }}>
                {meta.consequence}
              </div>

              {/* Outcome multiplier */}
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginBottom: 24 }}>
                OUTCOME MULTIPLIER: {newMarket.multiplier > 1 ? "+" : ""}{((newMarket.multiplier - 1) * 100).toFixed(0)}%
              </div>

              {/* Countdown bar — starts after typewriter completes */}
              {isFullyRevealed && (
                <MarketShiftCountdownBar
                  key={`ms-bar-${pendingMarketShift.to}`}
                  duration={3000}
                  color={newMarket.color}
                />
              )}

              <button onClick={handleMarketShift} style={css.btn(newMarket.color)}>
                ACKNOWLEDGED →
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── GAME ───────────────────────────────────────────────────────────────────
  if (screen === "GAME") return (
    <div style={css.root}>
      <div style={css.scan} />
      <div style={css.wrap}>

        {/* HUD */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a1a1a", paddingBottom: 12, marginBottom: 18 }}>
          <div>
            <span style={{ color: "#00ff88", fontSize: 14, letterSpacing: 2 }}>FINBOT</span>
            <span style={{ color: "#222", marginLeft: 8, fontSize: 11 }}>v4.0</span>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 11 }}>
            {multiMode ? (
              <>
                <span style={{ color: "#00e5ff", fontSize: 11 }}>YOU</span>
                <span style={{ color: "#444" }}>R<span style={{ color: "#888" }}>{round}</span>/{difficulty?.rounds}</span>
                {seedMode && <span style={{ background: "#1a0a2a", border: "1px solid #aa88ff", color: "#aa88ff", padding: "1px 6px", fontSize: 9, letterSpacing: 1 }}>SEED</span>}
                <span style={{ color: "#aa88ff", fontSize: 11 }}>OPPONENT</span>
                <span style={{ color: "#333", fontSize: 9 }}>{sessionCode}</span>
              </>
            ) : (
              <>
                <span style={{ color: "#444" }}>R<span style={{ color: "#888" }}>{round}</span>/{difficulty?.rounds}</span>
                {seedMode && <span style={{ background: "#1a0a2a", border: "1px solid #aa88ff", color: "#aa88ff", padding: "1px 6px", fontSize: 9, letterSpacing: 1 }}>SEED</span>}
                <span style={{ color: "#444" }}>MKT <span style={{ color: market.color }}>{market.id}</span></span>
                <span style={{ color: "#444" }}>DISC <span style={{ color: "#00aaff" }}>{dna.disciplineScore}</span></span>
              </>
            )}
            <button onClick={() => setShowBias(!showBias)} style={{ background: "none", border: "1px solid #222", color: showBias ? "#ffaa00" : "#555", padding: "2px 8px", cursor: "pointer", fontFamily: "monospace", fontSize: 10 }}>
              BIAS [{biasHistory.length}]
            </button>
            <button onClick={() => setSoundOn(s => !s)} style={{ background: "none", border: "none", color: soundOn ? "#00aaff" : "#333", cursor: "pointer", fontFamily: "monospace", fontSize: 10, padding: "0 4px", letterSpacing: 1 }} title={soundOn ? "Sound ON" : "Sound OFF"}>
              {soundOn ? "♪" : "♪̶"}
            </button>
          </div>
        </div>

        {/* Net Worth Bar */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            {multiMode ? (
              <>
                <span style={{ color: "#00e5ff" }}>YOU {fmt(netWorth)}</span>
                <span style={{ color: "#00ff88", fontSize: 20, textShadow: "0 0 10px #00ff88" }}>{fmt(netWorth)}</span>
                <span style={{ color: "#aa88ff" }}>OPP {fmt(p2NetWorth)}</span>
              </>
            ) : (
              <>
                <span style={{ color: "#777" }}>NET WORTH</span>
                <motion.span key={netWorth} initial={{ opacity: 0, scale: 1.15, color: "#ffffff" }} animate={{ opacity: 1, scale: 1, color: "#00ff88" }} transition={{ duration: 0.4 }} style={{ fontSize: 20, textShadow: "0 0 10px #00ff88", display: "inline-block" }}>{fmt(netWorth)}</motion.span>
                <span style={{ color: "#444" }}>TARGET {fmt(difficulty?.target)}</span>
              </>
            )}
          </div>
          <div style={{ height: 4, background: "#1a1a1a" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#00ff88", transition: "width 0.8s", boxShadow: "0 0 8px #00ff88" }} />
          </div>
        </div>

        {/* DNA Flags */}
        {dna.flags.size > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {[...dna.flags].map((f) => (
              <span key={f} style={css.tag("#004466")}>{f}</span>
            ))}
          </div>
        )}

        {/* Bias Panel */}
        {showBias && biasHistory.length > 0 && (
          <div style={{ background: "#0d0d0d", border: "1px solid #2a1800", padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 3, marginBottom: 10 }}>// COGNITIVE BIAS LOG</div>
            {biasHistory.map((b, i) => {
              const bi = COGNITIVE_BIASES.find((x) => x.id === b.bias);
              return (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 11, borderBottom: "1px solid #111", padding: "4px 0" }}>
                  <span style={{ color: "#444", minWidth: 24 }}>R{b.round}</span>
                  <span style={{ color: "#ffaa00", minWidth: 160 }}>{bi?.label || b.bias}</span>
                  <span style={{ color: qualityColor[b.quality] }}>{b.quality}</span>
                  <span style={{ color: "#333" }}>{bi?.desc}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#00ff8855" }}>GENERATING SCENARIO...</div>
            <div style={{ fontSize: 10, color: "#333", marginTop: 8 }}>DNA · Market Conditions · Bias Injection</div>
          </div>
        )}
        {apiError && <div style={{ color: "#ff4444", fontSize: 10, marginBottom: 10 }}>⚠ {apiError}</div>}

        {/* Scenario */}
        {!loading && scenario && (
          <motion.div key={scenario.title} {...fadeUp}>
            {/* Feature 3: Timer Bar */}
            {pressureMode && !chosen && (
              <TimerBar timeLeft={timeLeft} total={45} />
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={css.tag("#333")}>{scenario.category}</span>
                <span style={css.tag("#1a1a1a")}>{scenario.lifeStage}</span>
                <span style={{ color: market.color, fontSize: 10 }}>{market.label}</span>
                {typeof speechSynthesis !== "undefined" && (
                  <button onClick={() => setNarrationOn(n => !n)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "monospace", fontSize: 10, color: narrationOn ? "#00ff88" : "#333", padding: "0 4px", letterSpacing: 1 }}>
                    🔊 {narrationOn ? "ON" : "OFF"}
                  </button>
                )}
                {isRippleScenario && activeRipple && (
                  <span style={{ background: "#1a0a00", border: `1px solid ${activeRipple.interruptColor}`, color: activeRipple.interruptColor, padding: "2px 8px", fontSize: 9, letterSpacing: 2 }}>
                    ⚡ RIPPLE EVENT
                  </span>
                )}
                {usedFallback && (
                  <span style={{ background: "#1a1200", border: "1px solid #aa7700", color: "#ffcc00", padding: "2px 8px", fontSize: 9, letterSpacing: 2 }}>
                    ⚠ OFFLINE MODE
                  </span>
                )}
              </div>
              <div style={{ fontSize: 19, color: "#e0e0e0", marginBottom: 10, letterSpacing: 0.5 }}>{scenario.title}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8, marginBottom: 8 }}>{scenario.context}</div>
              <div style={{ fontSize: 11, color: market.color, opacity: 0.65 }}>▸ {scenario.marketRelevance}</div>
            </div>

            {/* Choice Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12, marginBottom: 22 }}>
              {(scenario.choices || []).map((c, idx) => {
                const sel = chosen?.id === c.id;
                const rev = !!chosen && !pendingConfidence;
                const qc = qualityColor[c.quality] || "#aaa";
                const showReveal = rev && (multiMode ? !!p2Choice : true);
                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.07 }}
                    whileHover={!chosen ? { scale: 1.02, transition: { duration: 0.1 } } : {}}
                    onMouseEnter={() => { if (!chosen) sfx.tick(); }}
                    onClick={() => pick(c)} style={css.card(sel, rev, qc)}>
                    <div style={{ fontSize: 9, color: "#444", marginBottom: 6, letterSpacing: 2 }}>OPTION {c.id}</div>
                    <div style={{ fontSize: 13, color: "#ddd", marginBottom: 8, lineHeight: 1.5 }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>{c.rationale}</div>

                    {/* Feature 3: Timer forced warning */}
                    {sel && lastChoiceForcedByTimer && (
                      <div style={{ fontSize: 10, color: "#ff2222", background: "#1a0000", border: "1px solid #ff2222", padding: "4px 8px", marginTop: 8 }}>
                        ⏱ TIME EXPIRED — WORST CHOICE FORCED
                      </div>
                    )}

                    {showReveal && (
                      <div style={{ borderTop: "1px solid #222", paddingTop: 12, marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: qc, letterSpacing: 2, marginBottom: 6 }}>
                          {c.quality} · {c.netEffect >= 0 ? "+" : ""}{fmt(c.netEffect)}
                        </div>
                        <div style={{ fontSize: 11, color: "#888", lineHeight: 1.65, marginBottom: 8 }}>{c.outcome}</div>
                        <div style={{ fontSize: 10, color: "#555", fontStyle: "italic", marginBottom: 8 }}>⟶ {c.projection}</div>
                        {c.biasWarning && (
                          <div style={{ fontSize: 10, color: "#ffaa00", background: "#120f00", padding: "3px 7px", marginBottom: 8, display: "inline-block" }}>
                            ⚠ {COGNITIVE_BIASES.find((b) => b.id === c.biasWarning)?.label || c.biasWarning}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: "#444", lineHeight: 1.6 }}>{c.teachingMoment}</div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Feature 4: Head to Head panel (post-reveal in multiplayer) */}
            {multiMode && p2Choice && chosen && (
              <div style={{ background: "#0d0d0d", border: "1px solid #00e5ff33", padding: 16, marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: 3, marginBottom: 12 }}>// HEAD TO HEAD</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 9, color: "#00e5ff", letterSpacing: 2, marginBottom: 4 }}>YOU</div>
                    <div style={{ fontSize: 16, color: "#00ff88" }}>{fmt(netWorth)}</div>
                    <div style={{ fontSize: 10, color: qualityColor[chosen.quality] || "#aaa", marginTop: 4 }}>{chosen.quality}</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{chosen.label}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, color: "#333" }}>VS</div>
                    {chosen.quality === p2Quality ? (
                      <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>ALIGNED</div>
                    ) : (
                      <div style={{ fontSize: 9, color: "#ffaa00", marginTop: 4 }}>DIVERGED</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "#aa88ff", letterSpacing: 2, marginBottom: 4 }}>OPPONENT</div>
                    <div style={{ fontSize: 16, color: "#aa88ff" }}>{fmt(p2NetWorth)}</div>
                    <div style={{ fontSize: 10, color: qualityColor[p2Quality] || "#aaa", marginTop: 4 }}>{p2Quality}</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{p2Choice}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Confidence Meter — shown after choice, before outcomes */}
            {chosen && pendingConfidence && (
              <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 20, marginTop: 4, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#333", letterSpacing: 4, marginBottom: 14 }}>
                  HOW CONFIDENT ARE YOU IN THIS CHOICE?
                </div>
                <div style={{ display: "flex", gap: 18, justifyContent: "center", marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map((n, idx) => (
                    <motion.span key={n}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15, delay: idx * 0.05 }}
                      whileHover={{ scale: 1.3, transition: { duration: 0.08 } }}
                      onClick={() => { setConfidenceRating(n); setHoverConfidence(null); confirmChoice(null, false, n); }}
                      onMouseEnter={() => setHoverConfidence(n)}
                      onMouseLeave={() => setHoverConfidence(null)}
                      style={{
                        fontFamily: "monospace", fontSize: 24, cursor: "pointer", userSelect: "none",
                        color: n <= (hoverConfidence || 0) ? "#00ff88" : "#222",
                        transition: "color 0.1s",
                        display: "inline-block",
                      }}>
                      {n <= (hoverConfidence || 0) ? "●" : "○"}
                    </motion.span>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: "#1a1a1a", letterSpacing: 3, minHeight: 14 }}>
                  {hoverConfidence === 5 ? "CERTAIN" : hoverConfidence === 4 ? "CONFIDENT" : hoverConfidence === 3 ? "FAIRLY SURE" : hoverConfidence === 2 ? "LEANING" : hoverConfidence === 1 ? "GUESSING" : ""}
                </div>
              </div>
            )}

            {/* Confirm / Next buttons */}
            {chosen && !pendingConfidence && !multiMode && (
              <div style={{ textAlign: "center" }}>
                <button onClick={() => confirmChoice()} style={css.btn("#00ff88")}>
                  {(round >= (difficulty?.rounds || 12) || netWorth + chosen.netEffect >= (difficulty?.target || 0) || netWorth + chosen.netEffect <= 0)
                    ? "FINAL RECKONING ▶"
                    : `CONFIRM → ROUND ${round + 1} ▶`}
                </button>
              </div>
            )}
            {chosen && !pendingConfidence && multiMode && !p2Choice && (
              <div style={{ textAlign: "center", color: "#555", fontSize: 11, letterSpacing: 2 }}>
                {SPIN_CHARS[spinFrame]} Waiting for opponent...
              </div>
            )}
            {chosen && !pendingConfidence && multiMode && p2Choice && (
              <div style={{ textAlign: "center" }}>
                <button onClick={nextMultiRound} style={css.btn("#00e5ff")}>NEXT ROUND ▶</button>
              </div>
            )}
          </motion.div>
        )}

        {/* Round Strip */}
        {history.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 30, paddingTop: 16, borderTop: "1px solid #111" }}>
            {history.map((h, i) => (
              <div key={i} title={`R${h.round}: ${h.title} · ${h.choice.quality} · ${fmt(h.netEffect)}`}
                style={{ width: 22, height: 7, background: qualityColor[h.choice.quality] || "#333", opacity: 0.7, cursor: "help" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── ANALYZER SCREEN ─────────────────────────────────────────────────────────
  if (screen === "ANALYZER") {
    const handleReplayLoad = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed && (parsed.history || Array.isArray(parsed))) {
            setReplayData(parsed.history ? parsed : { history: parsed });
            setAnalyzerError(null);
          } else {
            setAnalyzerError("Unrecognised format. Load a FINBOT export JSON file.");
          }
        } catch {
          setAnalyzerError("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    };

    const rd = replayData;
    const rh = rd?.history || [];

    const nwPoints = (() => {
      if (rh.length < 2) return "";
      const vals = rh.map((r) => r.netWorthAfter ?? r.netWorth ?? 0);
      const min = Math.min(...vals); const max = Math.max(...vals);
      const range = max - min || 1;
      return vals.map((v, i) => {
        const x = Math.round(10 + (i / (vals.length - 1)) * 420);
        const y = Math.round(75 - ((v - min) / range) * 65);
        return `${x},${y}`;
      }).join(" ");
    })();

    const confDots = rh.filter((r) => r.confidence != null).map((r, i) => {
      const qColor = r.quality === "OPTIMAL" ? "#00ff88" : r.quality === "GOOD" ? "#66ff99" : r.quality === "NEUTRAL" ? "#ffaa00" : "#ff4455";
      const x = Math.round(10 + (i / Math.max(rh.length - 1, 1)) * 420);
      const y = Math.round(10 + (1 - r.confidence / 4) * 60);
      return { x, y, color: qColor, round: i + 1, conf: r.confidence, q: r.quality };
    });

    const bFreq = {};
    rh.forEach((r) => { if (r.biasWarning) bFreq[r.biasWarning] = (bFreq[r.biasWarning] || 0) + 1; });
    const bSorted = Object.entries(bFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const bMax = bSorted[0]?.[1] || 1;

    const optCount = rh.filter((r) => r.quality === "OPTIMAL" || r.quality === "GOOD").length;
    const catCount = {};
    rh.forEach((r) => { if (r.category) catCount[r.category] = (catCount[r.category] || 0) + 1; });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return (
      <div style={css.root}>
        <div style={css.scan} />
        <div style={css.wrap}>
          <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 13, color: "#00ff88", letterSpacing: 4 }}>REPLAY ANALYZER</div>
              <button onClick={() => { setReplayData(null); setAnalyzerError(null); setScreen("BOOT"); }} style={{ background: "none", border: "1px solid #222", color: "#444", padding: "4px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: 11 }}>← BACK</button>
            </div>

            {!rd && (
              <div style={{ border: "1px dashed #222", padding: 40, textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, marginBottom: 16 }}>LOAD EXPORT FILE</div>
                <div style={{ fontSize: 10, color: "#333", marginBottom: 20 }}>Drag or click — select a finbot-export-*.json file</div>
                <label style={{ background: "#111", border: "1px solid #2a2a2a", color: "#00ff88", padding: "8px 20px", cursor: "pointer", fontFamily: "monospace", fontSize: 12, letterSpacing: 2 }}>
                  LOAD FILE
                  <input type="file" accept=".json" onChange={handleReplayLoad} style={{ display: "none" }} />
                </label>
                {analyzerError && <div style={{ fontSize: 11, color: "#ff4455", marginTop: 16 }}>{analyzerError}</div>}
              </div>
            )}

            {rd && rh.length > 0 && (<>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 8 }}>// NET WORTH CURVE</div>
                <svg width="100%" viewBox="0 0 440 90" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", display: "block" }}>
                  <polyline points={nwPoints} fill="none" stroke="#00ff88" strokeWidth="1.5" />
                  {(rh.map((r) => r.netWorthAfter ?? r.netWorth ?? 0)).map((v, i) => {
                    const vals = rh.map((r2) => r2.netWorthAfter ?? r2.netWorth ?? 0);
                    const min = Math.min(...vals); const range = Math.max(...vals) - min || 1;
                    const x = Math.round(10 + (i / (vals.length - 1)) * 420);
                    const y = Math.round(75 - ((v - min) / range) * 65);
                    return <circle key={i} cx={x} cy={y} r="3" fill="#00ff88" />;
                  })}
                </svg>
              </div>

              {confDots.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 8 }}>// CONFIDENCE vs QUALITY SCATTER</div>
                  <svg width="100%" viewBox="0 0 440 90" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", display: "block" }}>
                    {["CERTAIN (4)","CONFIDENT (3)","FAIRLY SURE (2)","LEANING (1)","GUESSING (0)"].map((label, i) => (
                      <text key={i} x="4" y={14 + i * 16} fontSize="7" fill="#222" fontFamily="monospace">{label}</text>
                    ))}
                    {confDots.map((d, i) => (
                      <circle key={i} cx={d.x} cy={d.y} r="4" fill={d.color} opacity="0.85">
                        <title>R{d.round} conf:{d.conf} {d.q}</title>
                      </circle>
                    ))}
                  </svg>
                  <div style={{ fontSize: 9, color: "#333", marginTop: 4 }}>■ OPTIMAL/GOOD = green · NEUTRAL = amber · BAD/CATASTROPHIC = red</div>
                </div>
              )}

              {bSorted.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 10 }}>// BIAS FREQUENCY</div>
                  {bSorted.map(([bias, count]) => (
                    <div key={bias} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: "#555", minWidth: 130, letterSpacing: 1 }}>{bias}</div>
                      <div style={{ flex: 1, background: "#111", height: 8 }}>
                        <div style={{ width: `${(count / bMax) * 100}%`, background: "#ff6644", height: "100%" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#444", minWidth: 20, textAlign: "right" }}>{count}×</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
                {[
                  ["ROUNDS", rh.length],
                  ["GOOD+ CHOICES", `${optCount} / ${rh.length}`],
                  ["TOP CATEGORY", topCat],
                  ["OPTIMAL RATE", `${rh.length ? Math.round((rh.filter(r => r.quality === "OPTIMAL").length / rh.length) * 100) : 0}%`],
                  ["AVG CONFIDENCE", confDots.length ? (confDots.reduce((s, d) => s + d.conf, 0) / confDots.length).toFixed(1) : "—"],
                  ["BIAS FLAGS", Object.keys(bFreq).length],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "10px 14px" }}>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, color: "#00ff88", fontWeight: "bold" }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 28 }}>
                <button onClick={() => setRoundLogOpen(o => !o)}
                  style={{ background: "none", border: "1px solid #1a1a1a", color: roundLogOpen ? "#00ff88" : "#333", padding: "6px 16px", cursor: "pointer", fontFamily: "monospace", fontSize: 10, letterSpacing: 2, width: "100%", textAlign: "left" }}>
                  {roundLogOpen ? "▼" : "►"} ROUND LOG ({rh.length} rounds)
                </button>
                {roundLogOpen && (
                  <div style={{ border: "1px solid #1a1a1a", borderTop: "none", maxHeight: 300, overflowY: "auto" }}>
                    {rh.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, fontSize: 10, padding: "6px 12px", borderBottom: "1px solid #111", alignItems: "center" }}>
                        <span style={{ color: "#333", minWidth: 24 }}>R{i + 1}</span>
                        <span style={{ color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title || r.category || "—"}</span>
                        <span style={{ color: r.quality === "OPTIMAL" ? "#00ff88" : r.quality === "GOOD" ? "#66ff99" : r.quality === "NEUTRAL" ? "#ffaa00" : "#ff4455", minWidth: 90, textAlign: "right" }}>{r.quality || "—"}</span>
                        <span style={{ color: "#444", minWidth: 64, textAlign: "right" }}>{r.netWorthAfter != null ? fmt(r.netWorthAfter) : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => { setReplayData(null); setAnalyzerError(null); }} style={{ ...css.btn("#333"), fontSize: 11 }}>
                LOAD ANOTHER FILE
              </button>
            </>)}
          </div>
        </div>
      </div>
    );
  }

  // ─── END SCREEN ──────────────────────────────────────────────────────────────
  if (screen === "END" && endData) {
    const { stats, archetype, history: h } = endData;
    const won = stats.finalNetWorth >= stats.target;
    const bust = stats.finalNetWorth <= 0;
    const biasCounts = {};
    biasHistory.forEach((b) => { biasCounts[b.bias] = (biasCounts[b.bias] || 0) + 1; });
    const sortedBiases = Object.entries(biasCounts).sort((a, b) => b[1] - a[1]);

    const avgSeconds = decisionTimes.length > 0
      ? Math.round(decisionTimes.reduce((s, d) => s + d.secondsLeft, 0) / decisionTimes.length)
      : null;
    const forcedCount = decisionTimes.filter((d) => d.secondsLeft === 0).length;
    const speedLabel = avgSeconds === null ? null : avgSeconds >= 20 ? "DELIBERATE" : avgSeconds >= 5 ? "REACTIVE" : "PANIC ZONE";

    const matchResult = multiMode
      ? stats.finalNetWorth > p2NetWorth ? "VICTORY" : stats.finalNetWorth === p2NetWorth ? "DRAW" : "DEFEAT"
      : null;


    const ending = resolveEnding([...dna.flags], stats.finalNetWorth, stats.disciplineScore, h);
    const isDefault = ending.id === 'DEFAULT';

    const calibRated = calibrationLog.filter(c => c.confidence > 0);
    const avgConf = calibRated.length > 0
      ? (calibRated.reduce((s, c) => s + c.confidence, 0) / calibRated.length).toFixed(1)
      : null;
    const highConf = calibRated.filter(c => c.confidence >= 4);
    const calibScore = highConf.length > 0
      ? Math.round(highConf.filter(c => c.wasGood).length / highConf.length * 100)
      : null;
    const overconfCount = highConf.filter(c => !c.wasGood).length;

    const replayPayload = {
      version: "3.7",
      exportedAt: new Date().toISOString(),
      seed: seedValue || null,
      difficulty: difficulty?.label || null,
      pressureMode: pressureMode,
      rounds: h.map((entry, i) => ({
        round:           entry.round,
        category:        entry.category || null,
        marketCondition: entry.market || null,
        title:           entry.title || null,
        chosenLabel:     entry.choice?.label || null,
        quality:         entry.choice?.quality || null,
        netEffect:       entry.netEffect ?? 0,
        netWorthAfter:   entry.netWorthAfter ?? null,
        confidence:      calibrationLog[i]?.confidence ?? null,
        wasGood:         calibrationLog[i]?.wasGood ?? null,
        biasWarning:     entry.choice?.biasWarning || null,
        rippleFired:     null,
      })),
      finalStats: {
        netWorth:        stats.finalNetWorth,
        optimalRate:     Math.round((h.filter(e => e.choice?.quality === 'OPTIMAL').length / Math.max(h.length, 1)) * 100),
        calibrationScore: calibScore,
        disciplineScore: stats.disciplineScore ?? dna.disciplineScore,
        riskScore:       dna.riskScore,
        endingId:        ending.id,
        ripplesFired:    firedRipples || [],
        biasesHit:       [...new Set(h.map(e => e.choice?.biasWarning).filter(Boolean))],
        totalRounds:     h.length,
      },
    };

    function handleExportReplay() {
      const json = JSON.stringify(replayPayload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      const seed = seedValue ? seedValue : 'unseeded';
      a.href     = url;
      a.download = `finbot_replay_${seed}_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return (
      <div style={css.root}>
        <div style={css.scan} />
        <div style={css.wrap}>
          <div style={{ textAlign: "center", paddingTop: 40 }}>

            {multiMode && matchResult && (
              <div style={{ marginBottom: 24, padding: "16px 0" }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 5, marginBottom: 8 }}>MATCH RESULT</div>
                <div style={{ fontSize: 36, color: matchResult === "VICTORY" ? "#00ff88" : matchResult === "DRAW" ? "#ffaa00" : "#ff4444", letterSpacing: 6, textShadow: `0 0 28px ${matchResult === "VICTORY" ? "#00ff88" : matchResult === "DRAW" ? "#ffaa00" : "#ff4444"}` }}>
                  {matchResult}
                </div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 8 }}>
                  You: {fmt(stats.finalNetWorth)} · Opponent: {fmt(p2NetWorth)}
                </div>
              </div>
            )}

            {!isDefault ? (
              <>
                <div style={{ background: '#000', border: `1px solid ${ending.borderColor}`, borderRadius: 4, padding: '24px 26px', marginBottom: 16, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
                    <div style={{ fontSize: 32, flexShrink: 0 }}>{ending.icon}</div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: 6, color: ending.accentColor, marginBottom: 6 }}>{ending.headline}</div>
                      <div style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: 1 }}>{ending.label}</div>
                      <div style={{ fontSize: 11, color: '#444', marginTop: 6, fontStyle: 'italic' }}>{ending.subline}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#3a3a3a', lineHeight: 1.8, borderTop: `1px solid ${ending.borderColor}`, paddingTop: 16, marginBottom: 16 }}>
                    {ending.body}
                  </div>
                  <div style={{ background: `${ending.accentColor}08`, border: `1px solid ${ending.accentColor}22`, borderRadius: 3, padding: '12px 16px' }}>
                    <div style={{ fontSize: 9, color: ending.accentColor, letterSpacing: 3, marginBottom: 6 }}>THE PRINCIPLE</div>
                    <div style={{ fontSize: 11, color: '#555', lineHeight: 1.7, fontStyle: 'italic' }}>"{ending.principle}"</div>
                  </div>
                </div>
                <div style={{ fontSize: 26, color: '#00ff88', marginBottom: 6 }}>{fmt(stats.finalNetWorth)}</div>
                <div style={{ fontSize: 11, color: '#444', marginBottom: 30 }}>
                  Started {fmt(difficulty?.startNetWorth)} · Target {fmt(stats.target)} · {stats.totalRounds} rounds · {difficulty?.label}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, color: '#444', letterSpacing: 5, marginBottom: 10 }}>
                  {won ? 'TARGET ACHIEVED' : bust ? 'LIQUIDATED' : 'SIMULATION COMPLETE'}
                </div>
                <div style={{ fontSize: 13, color: archetype.color, letterSpacing: 4, marginBottom: 8 }}>GRADE {archetype.grade}</div>
                <div style={{ fontSize: 32, color: archetype.color, textShadow: `0 0 28px ${archetype.color}`, marginBottom: 10, letterSpacing: 2 }}>
                  {archetype.title}
                </div>
                <div style={{ fontSize: 26, color: '#00ff88', marginBottom: 6 }}>{fmt(stats.finalNetWorth)}</div>
                <div style={{ fontSize: 11, color: '#444', marginBottom: 30 }}>
                  Started {fmt(difficulty?.startNetWorth)} · Target {fmt(stats.target)} · {stats.totalRounds} rounds · {difficulty?.label}
                </div>
                <div style={{ fontSize: 13, color: '#777', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.9 }}>{archetype.desc}</div>
              </>
            )}

            {/* Achievement unlocks */}
            {newAchievements.length > 0 && (
              <div style={{ maxWidth: 620, margin: "0 auto 32px" }}>
                <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 4, marginBottom: 14 }}>
                  ⬡ ACHIEVEMENT{newAchievements.length > 1 ? "S" : ""} UNLOCKED
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                  {newAchievements.map(id => {
                    const a = ACHIEVEMENTS.find(x => x.id === id);
                    if (!a) return null;
                    return (
                      <motion.div key={id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        style={{ background: "#0d1a0d", border: "1px solid #00ff8866", padding: "14px 20px", textAlign: "center", minWidth: 140 }}>
                        <div style={{ fontSize: 28, color: "#00ff88", marginBottom: 6 }}>{a.icon}</div>
                        <div style={{ fontSize: 10, color: "#00ff88", letterSpacing: 2, marginBottom: 4 }}>{a.label}</div>
                        <div style={{ fontSize: 9, color: "#444", lineHeight: 1.5 }}>{a.desc}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Streak + personal best update */}
            {streak > 0 && (
              <div style={{ maxWidth: 620, margin: "0 auto 24px", display: "flex", gap: 20, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 11, color: streak >= 7 ? "#ffaa00" : "#444", letterSpacing: 2 }}>
                  ▶ {streak} DAY STREAK
                </div>
                {personalBests[difficulty?.label] && (
                  <div style={{ fontSize: 10, color: "#333", letterSpacing: 1 }}>
                    BEST: <span style={{ color: "#00ff88" }}>{fmt(personalBests[difficulty?.label].netWorth)}</span>
                    {" "}[{personalBests[difficulty?.label].grade}]
                  </div>
                )}
              </div>
            )}

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 620, margin: "0 auto 40px", textAlign: "left" }}>
              {[
                { l: "OPTIMAL RATE", v: `${Math.round(stats.optimalRate * 100)}%`, c: "#00ff88" },
                { l: "DISCIPLINE", v: `${stats.disciplineScore}/100`, c: "#00aaff" },
                { l: "CATASTROPHIC", v: stats.catastrophicCount, c: "#ff4444" },
                { l: "OPTIMAL CHOICES", v: stats.optimal, c: "#66ffaa" },
                { l: "BIASES TRIGGERED", v: biasHistory.length, c: "#ffaa00" },
                { l: "TOTAL ROUNDS", v: stats.totalRounds, c: "#aaa" },
              ].map((s) => (
                <div key={s.l} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 14px" }}>
                  <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontSize: 24, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Confidence Calibration Section */}
            {calibrationLog.length > 0 && (
              <div style={{ maxWidth: 620, margin: "0 auto 36px", textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 14 }}>// CONFIDENCE CALIBRATION</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                  {[
                    { l: "AVG CONFIDENCE", v: avgConf ? `${avgConf}/5` : "—", c: parseFloat(avgConf) >= 4 ? "#ffaa00" : "#aaa" },
                    { l: "CALIBRATION SCORE", v: calibScore !== null ? `${calibScore}%` : "—", c: calibScore >= 70 ? "#00ff88" : calibScore >= 40 ? "#ffaa00" : "#ff4444" },
                    { l: "OVERCONFIDENT", v: overconfCount, c: overconfCount > 0 ? "#ff4444" : "#00ff88" },
                  ].map((s) => (
                    <div key={s.l} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 14px" }}>
                      <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>{s.l}</div>
                      <div style={{ fontSize: 22, color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                  {calibrationLog.map((c, i) => {
                    const col = c.confidence === 0 ? "#333"
                      : c.confidence >= 4 && c.wasGood ? "#00ff88"
                      : c.confidence >= 4 && !c.wasGood ? "#ff4444"
                      : !c.wasGood ? "#333" : "#ffaa00";
                    return (
                      <div key={i} title={`R${c.round}: ${c.confidence}/5 confidence · ${c.quality}`}
                        style={{ width: 32, height: 32, background: col + "22", border: `1px solid ${col}66`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, color: col, fontFamily: "monospace", fontWeight: 900, cursor: "help" }}>
                        {c.confidence || "?"}
                      </div>
                    );
                  })}
                </div>
                {overconfCount > 0 && (
                  <div style={{ fontSize: 9, color: "#2a2a2a", lineHeight: 1.7 }}>
                    {overconfCount} round(s) where high confidence met a POOR or CATASTROPHIC outcome. High confidence in the wrong direction is more dangerous than uncertainty — the bias was completely invisible to you.
                  </div>
                )}
                {calibScore === 100 && highConf.length >= 3 && (
                  <div style={{ fontSize: 9, color: "#00ff88", letterSpacing: 2, marginTop: 8 }}>
                    PERFECT CALIBRATION — every high-confidence choice was correct.
                  </div>
                )}
              </div>
            )}

            {/* Feature B: Calibration Blind Spot Report */}
            {calibrationLog.length > 0 && overconfCount >= 3 && calibScore !== null && calibScore < 40 && (() => {
              const redRounds = calibrationLog.filter(c => c.confidence >= 4 && !c.wasGood);
              const redRoundsEnriched = redRounds.map(c => ({
                ...c,
                biasWarning: c.biasWarning || h.find(e => e.round === c.round)?.choice?.biasWarning || null,
              }));
              return (
                <div style={{ maxWidth: 620, margin: "0 auto 36px", textAlign: "left" }}>
                  <div style={{ fontSize: 10, color: "#ff4444", letterSpacing: 3, marginBottom: 14 }}>
                    // BLIND SPOT REPORT
                  </div>
                  <div style={{ fontSize: 10, color: "#2a2a2a", lineHeight: 1.7, marginBottom: 16 }}>
                    {overconfCount} rounds where high confidence met a poor outcome.
                    These are not bad luck — they are the signature of a systematic bias
                    operating below your awareness. Each one is listed below.
                  </div>
                  {redRoundsEnriched.map((c, i) => {
                    const explanation = c.biasWarning ? BIAS_EXPLANATIONS[c.biasWarning] : null;
                    return (
                      <div key={i} style={{
                        background: "#000",
                        border: "1px solid #ff444422",
                        borderLeft: "2px solid #ff4444",
                        padding: "12px 16px",
                        marginBottom: 8,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: explanation ? 6 : 0 }}>
                          <span style={{ fontSize: 10, color: "#ff4444", letterSpacing: 2 }}>
                            ROUND {c.round} · {c.confidence}/5 CONFIDENCE · {c.quality}
                          </span>
                          {c.biasWarning && (
                            <span style={{ fontSize: 9, color: "#333", letterSpacing: 1 }}>
                              {c.biasWarning}
                            </span>
                          )}
                        </div>
                        {explanation && (
                          <div style={{ fontSize: 10, color: "#2a2a2a", lineHeight: 1.6, fontStyle: "italic" }}>
                            {explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 9, color: "#1a1a1a", marginTop: 12, lineHeight: 1.7 }}>
                    High confidence in the wrong direction is more expensive than honest
                    uncertainty. Uncertainty asks questions. Overconfidence forecloses them.
                  </div>
                </div>
              );
            })()}

            {/* Feature 3: Decision Speed Analysis */}
            {pressureMode && decisionTimes.length > 0 && (
              <div style={{ maxWidth: 620, margin: "0 auto 36px", textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 12 }}>// DECISION SPEED ANALYSIS</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
                  <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>AVG SECONDS LEFT</div>
                    <div style={{ fontSize: 22, color: avgSeconds >= 20 ? "#00ff88" : avgSeconds >= 5 ? "#ffaa00" : "#ff2222" }}>{avgSeconds}s</div>
                  </div>
                  <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>FORCED CHOICES</div>
                    <div style={{ fontSize: 22, color: forcedCount > 0 ? "#ff2222" : "#00ff88" }}>{forcedCount}</div>
                  </div>
                  <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>SPEED PROFILE</div>
                    <div style={{ fontSize: 14, color: avgSeconds >= 20 ? "#00ff88" : avgSeconds >= 5 ? "#ffaa00" : "#ff2222" }}>{speedLabel}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {decisionTimes.map((dt, i) => {
                    const spColor = dt.secondsLeft === 0 ? "#ff2222" : dt.secondsLeft >= 20 ? "#00ff88" : dt.secondsLeft >= 5 ? "#ffaa00" : "#ff8844";
                    return (
                      <div key={i} title={`R${dt.round}: ${dt.secondsLeft}s left`}
                        style={{ width: 22, height: 22, background: spColor + "44", border: `1px solid ${spColor}`, fontSize: 8, color: spColor, display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }}>
                        {dt.secondsLeft}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Feature 2: Ripple Events */}
            {firedRipples.length > 0 && (
              <div style={{ maxWidth: 620, margin: "0 auto 36px", textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 12 }}>// RIPPLE EVENTS TRIGGERED</div>
                {firedRipples.map((flag) => {
                  const t = RIPPLE_TRIGGERS[flag];
                  if (!t) return null;
                  return (
                    <div key={flag} style={{ display: "flex", gap: 10, alignItems: "center", borderBottom: "1px solid #111", padding: "8px 0" }}>
                      <span style={{ color: t.interruptColor, fontSize: 14 }}>⚡</span>
                      <span style={{ color: t.interruptColor, fontSize: 11, minWidth: 200 }}>{t.interruptLabel}</span>
                      <span style={{ color: "#333", fontSize: 10 }}>{flag.replace(/_/g, " ")}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bias Autopsy */}
            {sortedBiases.length > 0 && (
              <div style={{ maxWidth: 620, margin: "0 auto 36px", textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 12 }}>// COGNITIVE BIAS AUTOPSY</div>
                {sortedBiases.map(([id, count]) => {
                  const bi = COGNITIVE_BIASES.find((b) => b.id === id);
                  return (
                    <div key={id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, borderBottom: "1px solid #111", padding: "7px 0" }}>
                      <span style={{ color: "#ffaa00", minWidth: 160 }}>{bi?.label || id}</span>
                      <span style={{ color: "#444", minWidth: 30 }}>{count}×</span>
                      <div style={{ height: 5, flex: 1, background: "#1a1a1a" }}>
                        <div style={{ height: "100%", width: `${(count / biasHistory.length) * 100}%`, background: "#ffaa0088" }} />
                      </div>
                      <span style={{ color: "#333", fontSize: 10, minWidth: 60 }}>{bi?.desc?.split(" ").slice(0, 4).join(" ")}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Decision Log */}
            <div style={{ maxWidth: 720, margin: "0 auto 40px", textAlign: "left" }}>
              <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 12 }}>// FULL DECISION LOG</div>
              {!isDefault && (
                <div style={{ fontSize: 9, color: '#282828', letterSpacing: 2, marginBottom: 12, fontStyle: 'italic' }}>
                  {ending.id === 'WEALTH_ARCHITECT' && 'Your OWNS_PROPERTY + HAS_INVESTMENTS combo sealed this ending.'}
                  {ending.id === 'CAUTIONARY_TALE' && `${h.filter(e => e.choice.quality === 'CATASTROPHIC').length} CATASTROPHIC choices + active HAS_DEBT triggered this ending.`}
                  {ending.id === 'LUCKY_GAMBLER' && 'HIGH_RISK flag active at game end + net worth ≥ $400K triggered this ending.'}
                  {ending.id === 'PATIENT_COMPOUNDER' && `HAS_EMERGENCY_FUND active + discipline score ${stats.disciplineScore} triggered this ending.`}
                </div>
              )}
              {h.map((entry, i) => (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 11, borderBottom: "1px solid #0f0f0f", padding: "5px 0" }}>
                  <span style={{ color: "#333", minWidth: 24 }}>R{entry.round}</span>
                  <span style={{ color: "#444", minWidth: 110 }}>{entry.category}</span>
                  <span style={{ color: "#777", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</span>
                  <span style={{ color: qualityColor[entry.choice.quality], minWidth: 90 }}>{entry.choice.quality}</span>
                  <span style={{ color: entry.netEffect >= 0 ? "#00ff88" : "#ff4444", minWidth: 90, textAlign: "right" }}>
                    {entry.netEffect >= 0 ? "+" : ""}{fmt(entry.netEffect)}
                  </span>
                </div>
              ))}
            </div>

            {/* Feature 1: Share button */}
            <div style={{ maxWidth: 620, margin: "0 auto 24px", textAlign: "center" }}>
              <button onClick={() => {
                const url = window.location.origin + window.location.pathname + "?seed=" + shareableSeed;
                navigator.clipboard.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }).catch(() => {});
              }} style={{ ...css.btn("#aa88ff"), fontSize: 11 }}>
                {copied ? "LINK COPIED ✓" : `SHARE RUN ▶ (seed: ${shareableSeed})`}
              </button>
              <button onClick={handleExportReplay} style={{
                background: "transparent", border: "1px solid #282828", color: "#555",
                padding: "9px 28px", fontSize: 10, letterSpacing: 4, cursor: "pointer",
                fontFamily: "monospace", display: "block", margin: "8px auto 0",
              }}>
                &gt; EXPORT REPLAY
              </button>
            </div>

            {/* Callsign + Leaderboard */}
            <div style={{ maxWidth: 620, margin: "0 auto 40px" }}>
              {!callsignSaved ? (
                <div style={{ textAlign: "left", background: "#0d0d0d", border: "1px solid #00e5ff33", padding: 20 }}>
                  <div style={{ fontSize: 10, color: "#00e5ff", letterSpacing: 3, marginBottom: 12 }}>// ENTER CALLSIGN TO LOG YOUR RUN</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ color: "#00e5ff", fontSize: 16 }}>▶</span>
                    <input
                      maxLength={3}
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                      placeholder="___"
                      style={{ background: "none", border: "none", borderBottom: "1px solid #00e5ff", color: "#00e5ff", fontFamily: "monospace", fontSize: 22, width: 60, outline: "none", letterSpacing: 6, textAlign: "center" }}
                    />
                    <button onClick={() => saveCallsign(endData)} style={{ ...css.btn("#00e5ff"), padding: "6px 20px", fontSize: 11 }}>
                      SUBMIT ▶
                    </button>
                    <button onClick={() => saveCallsign({ ...endData })} style={{ background: "none", border: "none", color: "#444", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}>
                      skip
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: "#333", marginTop: 8 }}>3 letters max · uppercase · persists across sessions</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 12, textAlign: "left" }}>// LEADERBOARD</div>
                  {leaderboard.slice(0, 8).map((e, i) => {
                    const isYou = e.callsign === callsign.trim().toUpperCase().slice(0, 3);
                    return (
                      <div key={i} style={{ display: "flex", gap: 10, fontSize: 11, borderBottom: "1px solid #0f0f0f", padding: "5px 0", border: isYou ? "1px solid #00e5ff44" : "none", background: isYou ? "#00e5ff08" : "none", paddingLeft: isYou ? 6 : 0 }}>
                        <span style={{ color: i === 0 ? "#ffaa00" : "#333", minWidth: 24 }}>#{i + 1}</span>
                        <span style={{ color: "#00e5ff", minWidth: 36 }}>{e.callsign || "---"}</span>
                        <span style={{ color: "#777", flex: 1 }}>{e.archetype}</span>
                        <span style={{ color: "#555", fontSize: 10 }}>[{e.grade}]</span>
                        <span style={{ color: "#00ff88" }}>{fmt(e.netWorth)}</span>
                        <span style={{ color: "#333" }}>{e.diff}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <button onClick={resetGame} style={css.btn("#00ff88")}>
              {ending.cta || 'RUN AGAIN'} ▶
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
