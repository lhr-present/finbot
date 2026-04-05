// ─── BIAS DNA SYSTEM ─────────────────────────────────────────────────────────
// Computes a 10-dimensional bias vector from game history and maps it to
// a named investor archetype for the shareable DNA card.

export const BIAS_AXES = [
  { id: "FOMO",                   short: "FOMO",    color: "#ff6644" },
  { id: "Loss Aversion",          short: "LOSS",    color: "#ff4444" },
  { id: "Anchoring",              short: "ANCHOR",  color: "#ffaa00" },
  { id: "Hyperbolic Discounting", short: "HYPER",   color: "#ffdd44" },
  { id: "Status Quo Bias",        short: "STATUS",  color: "#44aaff" },
  { id: "Herd Mentality",         short: "HERD",    color: "#aa88ff" },
  { id: "Sunk Cost Fallacy",      short: "SUNK",    color: "#ff88aa" },
  { id: "Overconfidence",         short: "OVER",    color: "#00e5ff" },
  { id: "Mental Accounting",      short: "MENTAL",  color: "#66ffaa" },
  { id: "Recency Bias",           short: "RECENCY", color: "#aaffdd" },
];

// Pair archetypes — keyed "bias1+bias2" (try both orderings)
const PAIR_ARCHETYPES = {
  "FOMO+Overconfidence":                 { name: "The Euphoric Speculator",    desc: "Chases momentum, fueled by conviction. A powerful combo until the reversal hits." },
  "FOMO+Herd Mentality":                 { name: "The Trend Chaser",           desc: "Where the crowd goes, you follow. Fast gains — and faster losses when the tide turns." },
  "FOMO+Hyperbolic Discounting":         { name: "The Impulse Trader",         desc: "Now over later, every time. The future is always discounted a little too steeply." },
  "FOMO+Loss Aversion":                  { name: "The Anxious Opportunist",    desc: "Desperately wants upside but can't let go of downside. A tug-of-war that exhausts returns." },
  "FOMO+Recency Bias":                   { name: "The Momentum Addict",        desc: "Recent trends feel permanent. Entry always happens near the peak of the very trend observed." },
  "Loss Aversion+Status Quo Bias":       { name: "The Paralyzed Defender",     desc: "Inaction dressed as prudence. Status quo feels safe until inflation quietly erodes it." },
  "Loss Aversion+Anchoring":             { name: "The Price Prisoner",         desc: "Entry prices are permanent fixtures in your mind. Exits delayed, losses deepened." },
  "Loss Aversion+Mental Accounting":     { name: "The Silent Accountant",      desc: "Treats gains and losses from different accounts differently — but money is fungible." },
  "Loss Aversion+Sunk Cost Fallacy":     { name: "The Committed Holdout",      desc: "Won't sell because selling admits the mistake. Capital stays trapped in declining assets." },
  "Anchoring+Overconfidence":            { name: "The Anchored Optimist",      desc: "Convinced the reference point is fair value. Markets disagree more often than expected." },
  "Anchoring+Sunk Cost Fallacy":         { name: "The Sunk Believer",          desc: "Past prices and past commitments justify present decisions. History is not destiny." },
  "Status Quo Bias+Mental Accounting":   { name: "The Static Allocator",       desc: "Portfolios are set and forgotten. Mental compartments resist rebalancing signals." },
  "Herd Mentality+Overconfidence":       { name: "The Confident Conformist",   desc: "Follows consensus while believing the decision was independent. The riskiest blind spot." },
  "Overconfidence+Hyperbolic Discounting": { name: "The Leveraged Dreamer",    desc: "Convinced of the outcome and impatient for it. Leverage and urgency compound dangerously." },
  "Mental Accounting+Recency Bias":      { name: "The Windfall Gambler",       desc: "Recent gains feel different from earned money — and both get risked more aggressively." },
  "Sunk Cost Fallacy+Recency Bias":      { name: "The Nostalgic Trader",       desc: "Holds what used to work, chases what worked recently. Both anchors pull in opposite directions." },
};

// Single-bias fallbacks
const SINGLE_ARCHETYPES = {
  "FOMO":                   { name: "The Fear-Driven Trader",      desc: "Driven by what you might miss rather than what you have. FOMO is the most expensive emotion in finance." },
  "Loss Aversion":          { name: "The Loss-Averse Contrarian",  desc: "Losses hit twice as hard as gains feel good. This asymmetry keeps you defensive in bull markets and paralyzed in bear ones." },
  "Anchoring":              { name: "The Reference Point Investor", desc: "The first number you see becomes your compass. Markets move on; you stay anchored to where you entered." },
  "Hyperbolic Discounting": { name: "The Present-Biased Allocator", desc: "Today's dollar always outweighs tomorrow's ten. Long-horizon compounding can't compete with short-horizon impatience." },
  "Status Quo Bias":        { name: "The Inertia Investor",         desc: "Default settings feel like decisions. In finance, inaction is a decision — often the most expensive one." },
  "Herd Mentality":         { name: "The Crowd Follower",           desc: "Safety in numbers until the entire crowd is wrong. Consensus is always priced in by the time it forms." },
  "Sunk Cost Fallacy":      { name: "The Past Protector",           desc: "Yesterday's losses change today's math. They shouldn't — but holding on costs more than cutting losses." },
  "Overconfidence":         { name: "The Overconfident Analyst",    desc: "Knowledge is high, humility is low. The market charges a premium for certainty that doesn't exist." },
  "Mental Accounting":      { name: "The Mental Accountant",        desc: "House money, inheritance money, salary — all treated differently. But a dollar is a dollar." },
  "Recency Bias":           { name: "The Trend Extrapolator",       desc: "Recent history feels like the future. Markets are mean-reverting; intuition is recency-dependent." },
};

const DEFAULT_ARCHETYPE = {
  name: "The Adaptive Strategist",
  desc: "No single bias dominated your decision-making. Either exceptional discipline or not enough data to profile you — play again to find out which.",
};

/**
 * Returns a 10-element array of values [0,1] — one per BIAS_AXES entry.
 * Normalised so the most-triggered bias = 1.0.
 */
export function computeBiasVector(biasHistory) {
  const counts = {};
  biasHistory.forEach(b => { counts[b.bias] = (counts[b.bias] || 0) + 1; });
  const max = Math.max(...Object.values(counts), 1);
  return BIAS_AXES.map(axis => (counts[axis.id] || 0) / max);
}

/** Returns { name, desc } for the investor archetype derived from the bias vector */
export function computeDNAArchetype(biasVector) {
  const indexed = biasVector
    .map((v, i) => ({ v, id: BIAS_AXES[i].id }))
    .sort((a, b) => b.v - a.v);

  const [top1, top2] = indexed;
  if (!top1 || top1.v === 0) return DEFAULT_ARCHETYPE;

  // Try pair lookup if second bias is significant (>30% of max)
  if (top2 && top2.v >= 0.3) {
    const k1 = `${top1.id}+${top2.id}`;
    const k2 = `${top2.id}+${top1.id}`;
    if (PAIR_ARCHETYPES[k1]) return PAIR_ARCHETYPES[k1];
    if (PAIR_ARCHETYPES[k2]) return PAIR_ARCHETYPES[k2];
  }

  return SINGLE_ARCHETYPES[top1.id] || DEFAULT_ARCHETYPE;
}

/**
 * Full DNA profile — everything needed to render the card.
 */
export function buildDNAProfile(biasHistory, archGrade, finalNetWorth, startNetWorth) {
  const vector      = computeBiasVector(biasHistory);
  const dnaArchetype = computeDNAArchetype(vector);
  const netDelta    = finalNetWorth - startNetWorth;
  const topBiases   = BIAS_AXES
    .map((axis, i) => ({ ...axis, value: vector[i] }))
    .filter(b => b.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return { vector, dnaArchetype, netDelta, topBiases, archGrade };
}
