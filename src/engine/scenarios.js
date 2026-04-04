// ─── SCENARIO ENGINE: API fetch, prompt building, JSON parsing ────────────────

import { CATEGORIES, BIAS_POOL, hashSeed } from './constants.js';

export async function callClaude(apiKey, systemPrompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1400,
        system: systemPrompt,
        messages: [{ role: "user", content: "Generate the scenario now. Output only valid JSON." }],
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return data.content[0].text;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseScenarioJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function buildPrompt(dna, difficulty, market, categoryHistory, round, seedValue = '') {
  const flags = [...dna.flags].join(", ") || "none";
  const recent = categoryHistory.slice(-3).join(", ") || "none";
  const available = CATEGORIES.filter((c) => !categoryHistory.slice(-3).includes(c)).join(", ");

  let seedBlock = "";
  if (seedValue) {
    const seedHash = hashSeed(seedValue, round);
    seedBlock = `
REPRODUCIBILITY CONTRACT — BINDING:
Seed: "${seedValue}" · Round hash: ${seedHash}

This game session was started with a reproducibility seed. The player is sharing this run with someone else who will play it with the same seed. If you deviate from the seeded category, urgency, or bias below, the two runs will diverge and the sharing feature breaks entirely.

You MUST use:
  category: ${CATEGORIES[seedHash % CATEGORIES.length]}
  urgency:  ${['LOW','MEDIUM','HIGH','CRITICAL'][seedHash % 4]}
  biasWarning: ${BIAS_POOL[seedHash % BIAS_POOL.length]}

These are not suggestions. Using any other value is a contract violation that breaks reproducibility for another human player waiting on the other side.
`;
  }

  return `You are FINBOT-9000, a financial simulation engine. Generate a financial decision scenario as strict JSON.

PLAYER DNA:
- Flags: ${flags}
- Risk score: ${dna.riskScore}/100
- Discipline score: ${dna.disciplineScore}/100
- Round: ${round}/${difficulty.rounds}
- Difficulty: ${difficulty.label} (${difficulty.riskFraming})
- Market: ${market.label} — ${market.desc}
${seedBlock}
RULES:
- Category: pick from [${available}], avoid recent [${recent}]
- All 3 choices must seem PLAUSIBLE before the reveal. No obvious "don't do this."
- OUTCOME VARIANCE RULE: CATASTROPHIC netEffect must be ≥ 2.5× worse (absolute) than NEUTRAL. OPTIMAL must be ≥ 1.8× better than NEUTRAL. No two choices may have netEffects within $3,000 of each other.
- NARRATIVE CONTINUITY: If round > 3, reference a specific past decision category in the scenario text using phrases like "after your earlier investment" or "given the debt you took on". Make it feel like one continuous financial life.
- LATE-GAME NARRATIVE: If round is 8 or higher, you MUST reference at least one past decision category from the player's recent history in the scenario text. Use phrases like "given your earlier investment position", "after the debt you took on in round 3", or "building on your real estate exposure". Rounds 1–7 may be standalone. Rounds 8–12 must feel like continuations of a single financial life, not isolated events.
- TEMPTATION RULE: The worst choice (POOR or CATASTROPHIC) must be the most emotionally appealing option on first read. It must directly exploit the dominantBias. A financially naive player should feel pulled toward it before thinking.
- Reference player flags naturally in context text if relevant
- Cognitive bias seed (pick one): FOMO, LOSS_AVERSION, ANCHORING, HYPERBOLIC_DISCOUNTING, STATUS_QUO_BIAS, HERD_MENTALITY, SUNK_COST, OVERCONFIDENCE, MENTAL_ACCOUNTING

OUTPUT: single JSON object, no markdown, no text outside JSON:
{
  "category": "CATEGORY",
  "title": "Short vivid title",
  "context": "2-3 sentence setup. Personal and specific.",
  "marketRelevance": "1 sentence linking market condition to scenario.",
  "lifeStage": "EARLY|MID|LATE",
  "dominantBias": "BIAS_ID",
  "choices": [
    {
      "id": "A",
      "label": "Choice label max 10 words",
      "rationale": "Why this seems reasonable pre-reveal (1-2 sentences)",
      "quality": "OPTIMAL|GOOD|NEUTRAL|POOR|CATASTROPHIC",
      "netEffect": 12000,
      "outcome": "What actually happens 6 months later (2-3 sentences)",
      "projection": "5-year trajectory — MUST include a specific dollar figure or percentage (e.g. 'This compounds to ~$84K by year 5 at 7% annual return' or 'You will have paid $18K in interest alone by 2031'). Generic phrases like 'your finances improve' are forbidden.",
      "biasWarning": "MUST be exactly one of these display-name strings — no ID-form, no underscores, no variations: 'FOMO' | 'Loss Aversion' | 'Anchoring' | 'Hyperbolic Discounting' | 'Status Quo Bias' | 'Herd Mentality' | 'Sunk Cost Fallacy' | 'Overconfidence' | 'Mental Accounting' | 'Recency Bias'. No other value is accepted.",
      "teachingMoment": "Core financial principle at play (1-2 sentences)",
      "flagsAdd": [],
      "flagsRemove": []
    },
    { "id": "B", ... },
    { "id": "C", ... }
  ]
}`;
}
