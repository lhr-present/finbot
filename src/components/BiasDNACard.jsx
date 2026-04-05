// ─── BIAS DNA CARD ────────────────────────────────────────────────────────────
// Shareable visual card: radar chart + investor archetype + grade + net delta.
// html2canvas is lazy-loaded only when user clicks Share.

import { useRef, useState, memo } from "react";
import { motion } from "framer-motion";
import { BIAS_AXES, buildDNAProfile } from "../engine/biasDNA.js";

// ─── RADAR CHART (pure SVG, no external lib) ──────────────────────────────────

const CX = 150, CY = 150, R = 108;
const N  = BIAS_AXES.length; // 10
const STEP = (Math.PI * 2) / N;
const START_ANGLE = -Math.PI / 2; // top

function axisPoint(i, radius) {
  const a = START_ANGLE + i * STEP;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

function polygonPoints(vector, radius = R) {
  return vector
    .map((v, i) => {
      const { x, y } = axisPoint(i, radius * Math.max(v, 0.04));
      return `${x},${y}`;
    })
    .join(" ");
}

function RadarChart({ vector }) {
  const grids = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox="0 0 300 300" width="300" height="300" style={{ display: "block" }}>
      {/* Grid circles */}
      {grids.map(g => (
        <circle
          key={g}
          cx={CX} cy={CY} r={R * g}
          fill="none"
          stroke={g === 1 ? "#1a1a1a" : "#111"}
          strokeWidth={g === 1 ? 1 : 0.5}
        />
      ))}

      {/* Axis lines */}
      {BIAS_AXES.map((axis, i) => {
        const outer = axisPoint(i, R);
        return (
          <line
            key={axis.id}
            x1={CX} y1={CY}
            x2={outer.x} y2={outer.y}
            stroke="#1c1c1c" strokeWidth={0.75}
          />
        );
      })}

      {/* Filled polygon */}
      <polygon
        points={polygonPoints(vector)}
        fill="rgba(0,255,136,0.08)"
        stroke="#00ff88"
        strokeWidth={1.5}
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 6px #00ff8866)" }}
      />

      {/* Data point dots */}
      {vector.map((v, i) => {
        if (v === 0) return null;
        const { x, y } = axisPoint(i, R * Math.max(v, 0.04));
        return (
          <circle key={i} cx={x} cy={y} r={3} fill={BIAS_AXES[i].color}
            style={{ filter: `drop-shadow(0 0 4px ${BIAS_AXES[i].color})` }} />
        );
      })}

      {/* Axis labels */}
      {BIAS_AXES.map((axis, i) => {
        const labelR = R * 1.26;
        const { x, y } = axisPoint(i, labelR);
        const anchor = x < CX - 4 ? "end" : x > CX + 4 ? "start" : "middle";
        return (
          <text
            key={axis.id}
            x={x} y={y + 4}
            textAnchor={anchor}
            fontSize="8.5"
            fontFamily="monospace"
            fill={vector[i] > 0.5 ? axis.color : "#333"}
            letterSpacing="0.5"
          >
            {axis.short}
          </text>
        );
      })}
    </svg>
  );
}

// ─── SHARE LOGIC ─────────────────────────────────────────────────────────────

async function captureAndShare(cardRef, archetypeName, grade) {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(cardRef.current, {
    backgroundColor: "#000000",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const dataUrl = canvas.toDataURL("image/png");
  const text    = `My FINBOT-9000 investor DNA: "${archetypeName}" [Grade ${grade}] — What's your Bias DNA? finbot-alpha.vercel.app`;

  // Try native share sheet first
  if (navigator.share && navigator.canShare) {
    try {
      canvas.toBlob(async blob => {
        const file = new File([blob], "finbot-bias-dna.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text });
          return;
        }
        // Fallback: share text only
        await navigator.share({ text, url: "https://finbot-alpha.vercel.app" });
      }, "image/png");
      return { ok: true };
    } catch {}
  }

  // Fallback: download PNG + copy text to clipboard
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "finbot-bias-dna.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  try { await navigator.clipboard.writeText(text); } catch {}
  return { ok: true, downloaded: true };
}

// ─── CARD COMPONENT ──────────────────────────────────────────────────────────

function fmt(n) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function BiasDNACard({ biasHistory, archGrade, finalNetWorth, startNetWorth, difficulty }) {
  const cardRef  = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | capturing | done | downloaded

  const { vector, dnaArchetype, netDelta, topBiases } = buildDNAProfile(
    biasHistory, archGrade, finalNetWorth, startNetWorth
  );

  const deltaPos  = netDelta >= 0;
  const deltaColor = deltaPos ? "#00ff88" : "#ff4444";

  async function handleShare() {
    setStatus("capturing");
    try {
      const result = await captureAndShare(cardRef, dnaArchetype.name, archGrade);
      setStatus(result.downloaded ? "downloaded" : "done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("idle");
    }
  }

  const gradeColor = { S: "#00ff88", A: "#00aaff", B: "#aa88ff", C: "#ffaa00", D: "#ff4444" };
  const gc = gradeColor[archGrade?.[0]] || "#aaa";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      style={{ maxWidth: 620, margin: "0 auto 40px", textAlign: "left" }}
    >
      {/* Section header */}
      <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 14 }}>
        // BIAS DNA PROFILE
      </div>

      {/* Shareable card — this div is what html2canvas screenshots */}
      <div
        ref={cardRef}
        style={{
          background: "linear-gradient(135deg, #000 0%, #0a0a0a 60%, #050d05 100%)",
          border: "1px solid #1a1a1a",
          borderRadius: 4,
          padding: "28px 28px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle corner glow */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, #00ff8822, transparent)",
          pointerEvents: "none",
        }} />

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: 5, marginBottom: 4 }}>FINBOT-9000 · INVESTOR DNA</div>
            <div style={{ fontSize: 22, color: "#fff", letterSpacing: 1, fontFamily: "monospace", lineHeight: 1.1 }}>
              {dnaArchetype.name}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: 3, marginBottom: 2 }}>GRADE</div>
            <div style={{ fontSize: 28, color: gc, textShadow: `0 0 18px ${gc}`, fontFamily: "monospace" }}>
              {archGrade || "—"}
            </div>
          </div>
        </div>

        {/* Body: radar chart + stats side by side */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Radar */}
          <div style={{ flexShrink: 0 }}>
            <RadarChart vector={vector} />
          </div>

          {/* Right column */}
          <div style={{ flex: 1, minWidth: 160, paddingTop: 8 }}>
            {/* Archetype description */}
            <div style={{ fontSize: 10, color: "#444", lineHeight: 1.7, marginBottom: 18 }}>
              {dnaArchetype.desc}
            </div>

            {/* Net worth delta */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: 3, marginBottom: 4 }}>NET WORTH DELTA</div>
              <div style={{ fontSize: 22, color: deltaColor, fontFamily: "monospace" }}>
                {deltaPos ? "+" : ""}{fmt(netDelta)}
              </div>
              <div style={{ fontSize: 9, color: "#333", letterSpacing: 1 }}>
                {fmt(startNetWorth)} → {fmt(finalNetWorth)}
              </div>
            </div>

            {/* Top biases */}
            {topBiases.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: "#333", letterSpacing: 3, marginBottom: 8 }}>DOMINANT BIASES</div>
                {topBiases.map(b => (
                  <div key={b.id} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 8, color: b.color, letterSpacing: 1 }}>{b.id}</span>
                      <span style={{ fontSize: 8, color: "#333" }}>{Math.round(b.value * 100)}%</span>
                    </div>
                    <div style={{ height: 2, background: "#111", borderRadius: 1 }}>
                      <div style={{
                        height: "100%", width: `${b.value * 100}%`,
                        background: b.color,
                        boxShadow: `0 0 4px ${b.color}88`,
                        borderRadius: 1,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Difficulty badge */}
            {difficulty && (
              <div style={{ marginTop: 16, fontSize: 8, color: "#222", letterSpacing: 3 }}>
                {difficulty} · finbot-alpha.vercel.app
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share button — outside card div so it doesn't appear in screenshot */}
      <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleShare}
          disabled={status === "capturing"}
          style={{
            background: "none",
            border: "1px solid #1a1a1a",
            color: status === "done" ? "#00ff88" : status === "downloaded" ? "#ffaa00" : "#444",
            fontFamily: "monospace",
            fontSize: 10,
            letterSpacing: 3,
            padding: "8px 24px",
            cursor: status === "capturing" ? "wait" : "pointer",
            transition: "color 0.2s, border-color 0.2s",
          }}
          onMouseEnter={e => { if (status === "idle") { e.target.style.color = "#fff"; e.target.style.borderColor = "#333"; } }}
          onMouseLeave={e => { if (status === "idle") { e.target.style.color = "#444"; e.target.style.borderColor = "#1a1a1a"; } }}
        >
          {status === "capturing"  ? "GENERATING..."
          : status === "done"      ? "SHARED ✓"
          : status === "downloaded"? "SAVED + TEXT COPIED ✓"
          : "SHARE YOUR DNA ▶"}
        </button>
      </div>
    </motion.div>
  );
}

export default memo(BiasDNACard);
