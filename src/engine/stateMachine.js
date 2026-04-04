// ─── STATE MACHINE: archetype scoring + split-path ending resolution ──────────

import { SPLIT_ENDINGS } from './constants.js';

export function computeArchetype(stats) {
  const { optimalRate, catastrophicCount, disciplineScore, highRiskChoices, secondHalfOptimal, firstHalfOptimal, finalNetWorth, target } = stats;
  if (finalNetWorth >= target && optimalRate >= 0.7 && disciplineScore >= 70)
    return { title: "The Wealth Architect", desc: "Every decision was a system. Optimal choices, low bias, long-horizon thinking. You understand money as math, not emotion. This is the rarest outcome.", color: "#00ff88", grade: "S" };
  if (optimalRate >= 0.6 && catastrophicCount === 0)
    return { title: "The Steady Builder", desc: "Consistent, methodical, occasionally too cautious. You avoided catastrophe and built real wealth. The tortoise wins every time.", color: "#00aaff", grade: "A" };
  if (secondHalfOptimal > firstHalfOptimal && secondHalfOptimal >= 0.5)
    return { title: "The Pattern Recognizer", desc: "You made early mistakes but course-corrected. Your second half was dramatically better than your first. Growth mindset in action.", color: "#aa88ff", grade: "B" };
  if (highRiskChoices >= 3 && finalNetWorth > 0)
    return { title: "The Lucky Gambler", desc: "High risk, dramatic swings. You may have hit the target, but the process was unsustainable. One bad run erases everything. Systems beat luck.", color: "#ffaa00", grade: "C" };
  if (catastrophicCount >= 3)
    return { title: "The Cautionary Tale", desc: "Catastrophic choices compounded. Cognitive biases ran unchecked. The gap between where you started and where you ended is tuition — expensive tuition.", color: "#ff4444", grade: "D" };
  return { title: "The Avoider", desc: "Paralysis, status quo bias, and missed opportunities defined your run. In finance, inaction is a decision — and often the most expensive one.", color: "#ff6644", grade: "C-" };
}

export function resolveEnding(flags, netWorth, disciplineScore, history) {
  const totalR = history.length;
  const optimalRate = totalR > 0
    ? Math.round((history.filter(h => h.choice.quality === 'OPTIMAL').length / totalR) * 100)
    : 0;
  const gs = { flags, netWorth, disciplineScore };
  return SPLIT_ENDINGS.find(e => e.condition(gs, history, optimalRate))
    || SPLIT_ENDINGS[SPLIT_ENDINGS.length - 1];
}
