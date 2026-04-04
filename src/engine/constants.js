// ─── FINBOT-9000 CONSTANTS ────────────────────────────────────────────────────

export const DIFFICULTIES = {
  CONSERVATIVE: {
    label: "CONSERVATIVE",
    desc: "Defensive investor. Slow and steady.",
    startNetWorth: 8000,
    target: 200000,
    rounds: 15,
    riskFraming: "defensive, risk-averse, capital preservation focused",
    color: "#00aaff",
    startingFlags: ["HAS_EMERGENCY_FUND"],
  },
  BALANCED: {
    label: "BALANCED",
    desc: "Standard investor. Growth with guardrails.",
    startNetWorth: 12500,
    target: 500000,
    rounds: 12,
    riskFraming: "balanced, moderate growth, diversification mindset",
    color: "#00ff88",
    startingFlags: [],
  },
  AGGRESSIVE: {
    label: "AGGRESSIVE",
    desc: "High-risk, high-reward. YOLO with data.",
    startNetWorth: 25000,
    target: 1000000,
    rounds: 10,
    riskFraming: "aggressive, high-growth, high-volatility, asymmetric bets",
    color: "#ff4444",
    startingFlags: ["HIGH_RISK"],
  },
};

export const MARKET_CONDITIONS = [
  { id: "BULL",      label: "BULL MARKET",     desc: "Optimism high. Assets appreciate. Easy to overextend.",          color: "#00ff88", multiplier: 1.3 },
  { id: "BEAR",      label: "BEAR MARKET",     desc: "Correction in progress. Capital preservation is alpha.",         color: "#ff4444", multiplier: 0.7 },
  { id: "INFLATION", label: "HIGH INFLATION",  desc: "Purchasing power erodes. Real returns and hard assets matter.",  color: "#ffaa00", multiplier: 0.9 },
  { id: "RECOVERY",  label: "RECOVERY PHASE",  desc: "Smart money re-entering. Asymmetric opportunity window open.",  color: "#aa88ff", multiplier: 1.1 },
];

export const MARKET_SHIFT_META = {
  BULL:        { consequence: "Rising assets create overconfidence risk. The biggest allocation mistakes happen at peak optimism.",                       promptNote: "Inflated returns environment. Include temptation scenarios around overextension and FOMO." },
  BEAR:        { consequence: "Capital preservation becomes alpha. Panic-sellers lock in losses that patient holders recover in full.",                    promptNote: "Contraction phase. Maximize divergence between panic-sell and hold decisions." },
  INFLATION:   { consequence: "Real returns are eroding. Cash and fixed income lose purchasing power daily. Hard assets and equities hedge inflation.",    promptNote: "Purchasing power regime. Emphasize real vs nominal returns. Hard assets outperform." },
  RECOVERY:    { consequence: "Asymmetric opportunity window is open. Early re-entry here compounds into the next cycle's biggest gains.",                 promptNote: "Smart money re-entering. Feature asymmetric risk/reward and counter-cyclical moves." },
  STAGFLATION: { consequence: "High inflation meets stagnant growth. Both bonds and cash underperform. Asset selection is critical and unforgiving.",       promptNote: "Worst of both worlds. No easy safe haven. Complex allocation decisions required." },
  BOOM:        { consequence: "Late-cycle euphoria. Credit is loose, employment high. Historically, this phase precedes the sharpest corrections.",        promptNote: "Peak cycle conditions. Overleveraging temptation and asset bubble dynamics." },
};

export const CATEGORIES = [
  "INVESTING", "DEBT", "INCOME", "HOUSING", "TAX_STRATEGY",
  "INSURANCE", "CAREER", "EMERGENCY", "LIFESTYLE", "BEHAVIORAL",
  "INHERITANCE", "MACRO_EVENT",
];

export const BIAS_POOL = [
  "FOMO", "Loss Aversion", "Anchoring", "Hyperbolic Discounting",
  "Status Quo Bias", "Herd Mentality", "Sunk Cost Fallacy",
  "Overconfidence", "Mental Accounting", "Recency Bias",
];

export const COGNITIVE_BIASES = [
  { id: "FOMO",                  label: "FOMO",                   desc: "Fear Of Missing Out drove the choice" },
  { id: "LOSS_AVERSION",         label: "Loss Aversion",          desc: "Fear of loss outweighed potential gain" },
  { id: "ANCHORING",             label: "Anchoring",              desc: "A reference price distorted judgment" },
  { id: "HYPERBOLIC_DISCOUNTING",label: "Hyperbolic Discounting", desc: "Small reward now vs large reward later" },
  { id: "STATUS_QUO_BIAS",       label: "Status Quo Bias",        desc: "Inaction felt safer than acting" },
  { id: "HERD_MENTALITY",        label: "Herd Mentality",         desc: "Following the crowd instead of the math" },
  { id: "SUNK_COST",             label: "Sunk Cost Fallacy",      desc: "Past losses influenced a forward decision" },
  { id: "OVERCONFIDENCE",        label: "Overconfidence",         desc: "Recent wins inflated risk tolerance" },
  { id: "MENTAL_ACCOUNTING",     label: "Mental Accounting",      desc: "Treated money differently based on its source" },
];

export const RIPPLE_TRIGGERS = {
  HAS_DEBT: {
    threshold: 3,
    category: "DEBT_RECKONING",
    interruptLabel: "DEBT RECKONING",
    interruptColor: "#ff3d5a",
    promptInjection: `This is a mandatory DEBT RECKONING scenario.
The player has been carrying active debt for 3+ consecutive rounds.
The debt is now compounding and affecting other life areas.
Rules for this scenario:
- Make it feel urgent and personal, not abstract
- One choice must be the OPTIMAL path: aggressive payoff, sacrifice lifestyle, eliminate the drag permanently
- One choice must be the CATASTROPHIC trap: refinancing into worse terms, taking more debt to "invest", paying minimums forever
- The NEUTRAL choice: standard minimum payment, kicking the can
- netEffect spread must be large — at least $40,000 between best and worst
- biasWarning must be "Sunk Cost Fallacy" or "Hyperbolic Discounting"
- teachingMoment must explain compound interest on debt vs investments`,
  },
  HAS_INVESTMENTS: {
    threshold: 3,
    category: "MARKET_OPPORTUNITY",
    interruptLabel: "MARKET OPPORTUNITY",
    interruptColor: "#00e5ff",
    promptInjection: `This is a mandatory MARKET OPPORTUNITY scenario.
The player has been invested for 3+ consecutive rounds.
A significant market event now creates a fork in their investment path.
Rules:
- The scenario should feel like a real inflection point
- One choice: rebalance intelligently (OPTIMAL) — tax-loss harvest, shift allocation, add to position strategically
- One choice: panic response (POOR/CATASTROPHIC) — sell everything, move to cash, lock in losses due to fear
- One choice: do nothing (NEUTRAL) — miss the window but preserve
- biasWarning must be "Loss Aversion" or "Recency Bias"
- teachingMoment must address the cost of emotional investing`,
  },
  HIGH_RISK: {
    threshold: 2,
    category: "RISK_CONSEQUENCE",
    interruptLabel: "RISK CONSEQUENCE",
    interruptColor: "#ff8c42",
    promptInjection: `This is a mandatory RISK CONSEQUENCE scenario.
The player has been operating at HIGH_RISK for 2+ consecutive rounds.
Something has gone wrong. A high-risk position has had a negative event.
Rules:
- This is partly a consequence scenario (some damage is already done) but the player can still make choices to limit further damage
- Frame it as: "Your high-risk position in X has triggered a margin call / lost 40% / requires immediate action"
- One choice: disciplined damage control (OPTIMAL) — cut losses, stop the bleeding, don't double down
- One choice: averaging down / doubling the bet (CATASTROPHIC)
- One choice: wait and hope (POOR)
- biasWarning: "Overconfidence" or "Gambler's Fallacy"
- teachingMoment: explain position sizing and risk-adjusted returns`,
  },
  HAS_EMERGENCY_FUND: {
    threshold: 4,
    category: "OPPORTUNITY_UNLOCK",
    interruptLabel: "STABILITY DIVIDEND",
    interruptColor: "#00ff88",
    promptInjection: `This is a mandatory OPPORTUNITY UNLOCK scenario.
The player has maintained an emergency fund for 4+ consecutive rounds.
Their financial stability has created an opportunity unavailable to players without a safety net.
Rules:
- Frame it as a reward for discipline — they qualify for something others can't access (lower loan rate, can take career risk, etc.)
- All three choices should be positive but vary in ambition:
  OPTIMAL = leverage the stability for maximum long-term gain
  GOOD = modest, safe use of the stability advantage
  NEUTRAL = ignore the opportunity, stay status quo
- No CATASTROPHIC choice in this scenario — it's a reward round
- biasWarning: "Status Quo Bias" (they might not seize the opportunity)
- teachingMoment: the compounding value of financial security as an enabler of opportunity

HARD CONSTRAINT: This is a reward scenario for financial discipline. The three choices MUST use quality ratings of OPTIMAL, GOOD, and NEUTRAL only. POOR and CATASTROPHIC are strictly forbidden in this scenario. If you include either, you have violated the scenario contract. The lowest quality allowed is NEUTRAL — a player who ignores the opportunity entirely. No punishments, no traps. Only varying degrees of seizing a legitimate advantage.`,
  },
};

export const QUALITY_META = {
  OPTIMAL:      { color: "#00ff88", rank: 5 },
  GOOD:         { color: "#66ffaa", rank: 4 },
  NEUTRAL:      { color: "#aaaaaa", rank: 3 },
  POOR:         { color: "#ff8844", rank: 2 },
  CATASTROPHIC: { color: "#ff2222", rank: 1 },
};

export const BIAS_EXPLANATIONS = {
  'FOMO':                   'Creates certainty about opportunity where none exists. The more others act, the more certain you felt.',
  'Loss Aversion':          'Fear of loss felt more urgent than the upside. You acted to avoid pain, not to optimize.',
  'Anchoring':              'An initial number dominated your thinking. The anchor was irrelevant to the actual decision.',
  'Hyperbolic Discounting': 'Immediate reward overwhelmed long-term math. You discounted the future too steeply.',
  'Status Quo Bias':        'Doing nothing felt safe. Inaction is a choice with compounding costs.',
  'Herd Mentality':         'You trusted consensus over analysis. Crowds are often right until they are catastrophically wrong.',
  'Sunk Cost Fallacy':      'Past costs influenced a forward decision. Sunk costs are irretrievable — they should be invisible.',
  'Overconfidence':         'Your track record created false precision. Confidence and accuracy are independent variables.',
  'Mental Accounting':      'Money was categorized in a way that distorted its real value. All dollars are equal.',
  'Recency Bias':           'Recent events dominated your prior. The last outcome does not predict the next.',
};

export const SPLIT_ENDINGS = [
  {
    id: 'WEALTH_ARCHITECT',
    label: 'The Wealth Architect',
    icon: '🏛️',
    accentColor: '#c9a84c',
    borderColor: '#c9a84c33',
    condition: (gs, history, optimalRate) =>
      gs.flags.includes('OWNS_PROPERTY') &&
      gs.flags.includes('HAS_INVESTMENTS') &&
      optimalRate >= 70,
    headline: 'ARCHITECTURE COMPLETE',
    subline: 'Property. Capital. Discipline. The three pillars held.',
    body: "You didn't get lucky. You built a system and trusted it across 12 rounds of pressure, temptation, and market chaos. The combination of real assets and invested capital — maintained through volatility — is how generational wealth actually accumulates. You understood something most people never do: optimal decisions don't feel exciting. They feel boring, obvious, and correct. That's the whole point.",
    principle: "Wealth is the result of consistently choosing the second-best feeling option. The exciting choice is almost always a trap.",
    cta: 'REBUILD FROM SCRATCH',
  },
  {
    id: 'CAUTIONARY_TALE',
    label: 'The Cautionary Tale',
    icon: '⚠️',
    accentColor: '#ff2244',
    borderColor: '#ff224433',
    condition: (gs, history, optimalRate) =>
      gs.flags.includes('HAS_DEBT') &&
      history.filter(h => h.choice.quality === 'CATASTROPHIC').length >= 3,
    headline: 'THE DEBT KEPT COMPOUNDING',
    subline: 'Three catastrophic decisions. The math was always against you.',
    body: "Debt doesn't forgive bad timing. Every CATASTROPHIC choice you made didn't just cost you money in that round — it altered the entire trajectory. Compound interest is the most powerful force in finance. When it works for you, it builds empires. When it works against you, it buries futures. You experienced the second version. The good news: this is a simulation. The lesson is free. In real life, this costs years.",
    principle: "The asymmetry of debt: it compounds in your sleep whether you think about it or not. The only winning move is to make it temporary.",
    cta: 'FACE IT AGAIN',
  },
  {
    id: 'LUCKY_GAMBLER',
    label: 'The Lucky Gambler',
    icon: '🎲',
    accentColor: '#ff8c42',
    borderColor: '#ff8c4233',
    condition: (gs, history, optimalRate) =>
      gs.flags.includes('HIGH_RISK') &&
      gs.netWorth >= 400000,
    headline: 'YOU SURVIVED YOUR OWN RISK APPETITE',
    subline: 'High variance. High stakes. It worked — this time.',
    body: "You took positions most advisors would call reckless, and the market rewarded you. But look carefully at your decision log. Your net worth is high because of a few large wins, not because of consistent judgment. The same temperament that got you here will eventually produce a round where the tail risk lands on you instead of the other player. The question isn't whether you can survive volatility. It's whether you know the difference between skill and a favorable outcome.",
    principle: "Survivorship bias is invisible from the inside. The gambler who wins big and the one who loses everything made the same type of bet.",
    cta: 'TEST YOUR SYSTEM',
  },
  {
    id: 'PATIENT_COMPOUNDER',
    label: 'The Patient Compounder',
    icon: '⏳',
    accentColor: '#00e5ff',
    borderColor: '#00e5ff33',
    condition: (gs, history, optimalRate) =>
      gs.flags.includes('HAS_EMERGENCY_FUND') &&
      gs.disciplineScore >= 8,
    headline: 'DISCIPLINE OVER TIME',
    subline: 'Boring choices. Compounding results.',
    body: "You maintained your foundation when others were chasing returns or panicking out of positions. The emergency fund wasn't a safety net you never used — it was the psychological platform that let you make rational decisions in every other category. High discipline score means you didn't let emotion override the math. Over 30 real years, this approach quietly produces more wealth than almost any other strategy. Not because it's clever. Because it compounds uninterrupted.",
    principle: "The emergency fund is not defensive — it is offensive. It removes the conditions under which bad decisions feel necessary.",
    cta: 'GO AGAIN',
  },
  {
    id: 'DEFAULT',
    label: null,
    icon: null,
    accentColor: null,
    borderColor: null,
    condition: () => true,
    headline: null,
    subline: null,
    body: null,
    principle: null,
    cta: 'RUN AGAIN',
  },
];

export const FALLBACKS = {
  INVESTING: {
    category: "INVESTING", title: "The Index Fund Moment", lifeStage: "MID",
    dominantBias: "FOMO",
    context: "You have $8,000 in a savings account at 1.2% APY. Your coworker just made 40% on a biotech stock, and a financial advisor friend mentions index funds average 10% annually over 50 years. Everyone seems to have an opinion.",
    marketRelevance: "Consistent compounding rewards patience over speculation in any market phase.",
    choices: [
      { id: "A", label: "Move $7,000 into S&P 500 index fund", rationale: "Diversified, low-cost, proven track record.", quality: "OPTIMAL", netEffect: 9800, outcome: "Your index fund grows steadily. In 5 years you outperform 80% of active traders.", projection: "At 10% CAGR this $7K becomes ~$53K in 20 years.", biasWarning: null, teachingMoment: "Index funds beat 85% of active funds over 15-year horizons due to lower fees and compounding.", flagsAdd: ["HAS_INVESTMENTS"], flagsRemove: [] },
      { id: "B", label: "Split evenly: index fund + savings", rationale: "Balance between growth and security.", quality: "GOOD", netEffect: 3200, outcome: "Modest growth. You sleep fine but leave significant compounding on the table.", projection: "The savings half loses real value to inflation over a decade.", biasWarning: "STATUS_QUO_BIAS", teachingMoment: "Diversification is good — but over-weighting low-yield assets in growth years is expensive.", flagsAdd: ["HAS_INVESTMENTS"], flagsRemove: [] },
      { id: "C", label: "Buy the biotech stock tip", rationale: "40% return sounds incredible. FOMO is real.", quality: "CATASTROPHIC", netEffect: -4200, outcome: "Biotech crashes 60% after failed FDA trial. You lose $4,200.", projection: "Single-stock speculation without research is indistinguishable from gambling.", biasWarning: "FOMO", teachingMoment: "A friend's win is survivorship bias. You didn't hear about their 5 losses.", flagsAdd: ["HIGH_RISK"], flagsRemove: [] },
    ],
  },
  DEBT: {
    category: "DEBT", title: "The Credit Card Trap", lifeStage: "EARLY",
    dominantBias: "HYPERBOLIC_DISCOUNTING",
    context: "You're carrying $9,000 across two credit cards at 22% APR. You just received a $6,000 work bonus. A 0% balance-transfer card is available. A new product launch has you tempted to invest the bonus instead.",
    marketRelevance: "Guaranteed 22% return by eliminating debt outperforms most investments risk-adjusted.",
    choices: [
      { id: "A", label: "Pay off high-APR card, transfer rest", rationale: "Eliminate the highest guaranteed loss first.", quality: "OPTIMAL", netEffect: 7800, outcome: "You eliminate $6K of 22% debt immediately. Transfer rest to 0% card. Debt-free in 8 months.", projection: "You'll recapture ~$2,000/year that was going to interest.", biasWarning: null, teachingMoment: "Paying 22% APR debt is a guaranteed 22% return — no investment reliably beats that risk-free.", flagsAdd: [], flagsRemove: ["HAS_DEBT"] },
      { id: "B", label: "Pay minimum, invest the bonus", rationale: "Investments might return more than the interest costs.", quality: "POOR", netEffect: -2400, outcome: "Investments return 8% but you pay 22% in interest. Net negative. Debt balloons.", projection: "In 3 years the debt grows 73% and eats your investment gains.", biasWarning: "HYPERBOLIC_DISCOUNTING", teachingMoment: "Borrowing at 22% to invest at 10% is a mathematically losing arbitrage.", flagsAdd: ["HAS_DEBT"], flagsRemove: [] },
      { id: "C", label: "Spend the bonus on a vacation and gadgets", rationale: "You worked hard. You deserve it.", quality: "CATASTROPHIC", netEffect: -5800, outcome: "Bonus gone. Debt remains. Now you're making minimum payments for 4 more years.", projection: "This vacation will cost $14,000 in total interest payments.", biasWarning: "MENTAL_ACCOUNTING", teachingMoment: "Mental accounting — treating a bonus as 'extra' money — is a billion-dollar bias industry exploits.", flagsAdd: ["HAS_DEBT"], flagsRemove: [] },
    ],
  },
  INCOME: {
    category: "INCOME", title: "The Counter-Offer",  lifeStage: "MID",
    dominantBias: "LOSS_AVERSION",
    context: "You received a job offer for 35% more salary. Your current employer counter-offers with 15%. You've been here 7 years. The new role is in a growing sector but requires relocation.",
    marketRelevance: "In a strong labor market, the highest salary gains come from switching employers, not loyalty premiums.",
    choices: [
      { id: "A", label: "Take the external offer", rationale: "35% raise, growing sector, new network.", quality: "OPTIMAL", netEffect: 22000, outcome: "First-year adjustment period, then your salary compounds at the new baseline. You build new skills.", projection: "Over 5 years you earn $80K more than if you had stayed.", biasWarning: null, teachingMoment: "Average raises for staying: 3%. For switching: 15-20%. Loyalty is not compensated in modern labor markets.", flagsAdd: [], flagsRemove: [] },
      { id: "B", label: "Accept the counter-offer (15%)", rationale: "Stability, familiarity, no relocation risk.", quality: "NEUTRAL", netEffect: 5500, outcome: "Modest raise. But your employer now knows you're a flight risk. Promotions slow down.", projection: "You'll be searching again in 18 months from a weaker position.", biasWarning: "LOSS_AVERSION", teachingMoment: "Counter-offers address the symptom (money) not the cause (stagnation). 70% of counter-offer acceptors leave within 2 years.", flagsAdd: [], flagsRemove: [] },
      { id: "C", label: "Stay, negotiate nothing, maintain peace", rationale: "Negotiations feel uncomfortable. Maybe later.", quality: "POOR", netEffect: -1200, outcome: "You stay at the same salary. Inflation erodes your purchasing power by 5% this year alone.", projection: "Real income declines. You become the institutional memory no one promotes.", biasWarning: "STATUS_QUO_BIAS", teachingMoment: "Every year you don't negotiate, you compound a lower baseline. The cost of discomfort is measured in decades.", flagsAdd: [], flagsRemove: [] },
    ],
  },
  HOUSING: {
    category: "HOUSING", title: "The Buy vs. Rent Decision", lifeStage: "MID",
    dominantBias: "HERD_MENTALITY",
    context: "You're renting at $1,800/mo. You could buy a $320,000 home with a 10% down payment at a 6.8% mortgage rate. Your parents and friends say 'renting is throwing money away.' You're planning to stay in the city for at least 5 years.",
    marketRelevance: "High interest rates increase the true cost of ownership — the rent-vs-buy calculus changes significantly at 6%+.",
    choices: [
      { id: "A", label: "Rent, invest the down payment instead", rationale: "High rates make owning expensive. Invested capital compounds.", quality: "OPTIMAL", netEffect: 14200, outcome: "You invest the $32K down payment in index funds. At 7% it grows to $44K in 5 years. You avoid $18K in mortgage interest.", projection: "Flexibility preserved. If rates drop, you buy from a stronger position.", biasWarning: null, teachingMoment: "Price-to-rent ratio > 20 typically favors renting. At 6.8% mortgage rates, break-even is 7+ years away.", flagsAdd: [], flagsRemove: [] },
      { id: "B", label: "Buy the house (10% down)", rationale: "Build equity. Stop 'throwing away' rent money.", quality: "NEUTRAL", netEffect: 4800, outcome: "You own. But 78% of your first-year payments go to interest, not equity. True cost: $3,100/mo.", projection: "At 5 years you've built $40K equity but paid $110K in interest. Marginal vs. renting.", biasWarning: "HERD_MENTALITY", teachingMoment: "In year 1 of a 30-year mortgage at 6.8%, only $400/mo reduces principal. Equity builds slowly.", flagsAdd: ["OWNS_PROPERTY"], flagsRemove: [] },
      { id: "C", label: "Buy with 3% down, stretch the budget", rationale: "Get into the market before prices rise more.", quality: "CATASTROPHIC", netEffect: -9600, outcome: "PMI, high payments, no emergency buffer. One job disruption away from foreclosure.", projection: "Undercapitalized homeownership is the #1 driver of financial wipeouts in the middle class.", biasWarning: "FOMO", teachingMoment: "PMI, HOA, repairs: homeownership costs 2-3% of home value per year beyond the mortgage.", flagsAdd: ["OWNS_PROPERTY", "HAS_DEBT"], flagsRemove: [] },
    ],
  },
  TAX_STRATEGY: {
    category: "TAX_STRATEGY", title: "The Year-End Tax Window", lifeStage: "MID",
    dominantBias: "STATUS_QUO_BIAS",
    context: "It's December. You have $12,000 in capital gains this year and are in the 24% tax bracket. Your 401(k) is at the employer match limit. You can still max your Roth IRA ($7,000) or open an HSA if eligible. Your broker recommends tax-loss harvesting.",
    marketRelevance: "Year-end tax optimization is highest leverage when capital gains and income converge in a bull market.",
    choices: [
      { id: "A", label: "Max Roth IRA + harvest tax losses", rationale: "Roth grows tax-free. Harvested losses offset gains.", quality: "OPTIMAL", netEffect: 8400, outcome: "You shelter $7K in tax-free growth and offset $3K in gains with losses. Net tax savings: $2,400.", projection: "Roth compounding over 30 years is worth 40-60% more than taxable accounts.", biasWarning: null, teachingMoment: "Tax-advantaged accounts are the highest guaranteed return in your portfolio — the 'tax alpha' compounds silently.", flagsAdd: ["HAS_INVESTMENTS"], flagsRemove: [] },
      { id: "B", label: "Only contribute to Roth IRA", rationale: "Simple. Tax-free growth is good.", quality: "GOOD", netEffect: 4200, outcome: "Good move but you leave $2,400 in avoidable taxes on the table.", projection: "Missed loss harvesting is a cumulative, invisible drag.", biasWarning: null, teachingMoment: "Tax-loss harvesting recovers real money at no investment cost — most people never do it.", flagsAdd: ["HAS_INVESTMENTS"], flagsRemove: [] },
      { id: "C", label: "Do nothing. Handle it at tax time.", rationale: "Taxes are complicated. Maybe next year.", quality: "POOR", netEffect: -2880, outcome: "You pay full capital gains tax. $2,880 leaves your account in April that a Roth would have sheltered.", projection: "Repeated annually, this 'do nothing' approach costs $50K+ over a career.", biasWarning: "STATUS_QUO_BIAS", teachingMoment: "The tax code rewards action before December 31. Procrastination has a precise dollar cost.", flagsAdd: [], flagsRemove: [] },
    ],
  },
  INSURANCE: {
    category: "INSURANCE", title: "The Coverage Gap", lifeStage: "MID",
    dominantBias: "OVERCONFIDENCE",
    context: "You're 34, healthy, and your employer offers health insurance at $280/mo. You could waive it and bank the premium in a high-yield savings account. You haven't used healthcare in 3 years. A friend skips coverage and seems fine.",
    marketRelevance: "Medical debt is the #1 cause of personal bankruptcy in the US, regardless of market conditions.",
    choices: [
      { id: "A", label: "Keep employer insurance, add HSA contribution", rationale: "Coverage + tax-advantaged medical savings.", quality: "OPTIMAL", netEffect: 3600, outcome: "You stay covered and build an HSA that triples as investment account, emergency fund, and retirement medical account.", projection: "HSA funds invested grow tax-free. At 65 they're penalty-free for any purpose.", biasWarning: null, teachingMoment: "HSA is the only triple-tax-advantaged account: deduction on contribution, growth tax-free, withdrawal tax-free for medical.", flagsAdd: [], flagsRemove: [] },
      { id: "B", label: "Keep insurance, no HSA", rationale: "Coverage is enough. Keep it simple.", quality: "NEUTRAL", netEffect: 0, outcome: "You're protected but miss the HSA arbitrage. Acceptable but suboptimal.", projection: "Without HSA, future medical costs hit after-tax dollars.", biasWarning: null, teachingMoment: "If eligible, HSA beats 401K in tax efficiency for healthcare costs. Most people never open one.", flagsAdd: [], flagsRemove: [] },
      { id: "C", label: "Waive insurance, self-insure with savings", rationale: "You're healthy. Bank the premium.", quality: "CATASTROPHIC", netEffect: -28000, outcome: "Appendix rupture 4 months later. Uninsured ER bill: $34,000. Your savings cover $6K. Remainder goes to debt.", projection: "One medical event erases years of savings. The expected value of being uninsured is catastrophically negative.", biasWarning: "OVERCONFIDENCE", teachingMoment: "Insurance isn't for the likely. It's for the catastrophic. Overconfidence in health is a known cognitive bias.", flagsAdd: ["HAS_DEBT"], flagsRemove: [] },
    ],
  },
  CAREER: {
    category: "CAREER", title: "The Side Project Fork", lifeStage: "MID",
    dominantBias: "SUNK_COST",
    context: "You've spent 18 months building a side project that earned $800 total. Your day job pays well. A mentor suggests pivoting the project to B2B SaaS. A competitor just raised $2M doing something similar. You've invested $14,000 in tools and courses.",
    marketRelevance: "SaaS multiples are compressed — product-market fit matters more than ever in the current funding environment.",
    choices: [
      { id: "A", label: "Pivot to B2B SaaS, validate in 90 days", rationale: "Small businesses pay recurring revenue. Mentor has pattern recognition.", quality: "OPTIMAL", netEffect: 11000, outcome: "First B2B customer signs in month 2 at $400/mo. Proof of concept validated. Momentum shifts.", projection: "If 10 customers in 12 months: $4,800 ARR with path to $50K.", biasWarning: null, teachingMoment: "B2B customers pay reliably and refer others. One contract is worth 100 B2C signups.", flagsAdd: [], flagsRemove: [] },
      { id: "B", label: "Continue current approach, work harder", rationale: "You've invested 18 months. Must be close.", quality: "POOR", netEffect: -3200, outcome: "Another 6 months pass. Revenue: $400 more. You've now put in 24 months chasing a dead-end positioning.", projection: "The competitor that raised $2M moves to own your market.", biasWarning: "SUNK_COST", teachingMoment: "The Sunk Cost Fallacy: the 18 months already spent are gone regardless. Only future ROI matters.", flagsAdd: [], flagsRemove: [] },
      { id: "C", label: "Shut it down and get a second job instead", rationale: "More guaranteed income is safer.", quality: "NEUTRAL", netEffect: 4800, outcome: "Second job adds income. But you lose the optionality of entrepreneurship. Skills atrophy.", projection: "Trading time for money is linear. Product revenue can be asymmetric.", biasWarning: "LOSS_AVERSION", teachingMoment: "The opportunity cost of certainty is asymmetric upside. Linear income has a ceiling.", flagsAdd: [], flagsRemove: [] },
    ],
  },
  EMERGENCY: {
    category: "EMERGENCY", title: "The Emergency Fund Test", lifeStage: "EARLY",
    dominantBias: "STATUS_QUO_BIAS",
    context: "Your car needs a $3,400 repair. You have $1,200 in savings and $8,000 in investments. The mechanic says you could use the old part for another 6 months at $600 now, or fix it right for $3,400. You could also take out a personal loan at 18% APR.",
    marketRelevance: "Forced asset liquidation at market lows is the mechanism that turns temporary setbacks into permanent losses.",
    choices: [
      { id: "A", label: "Fix properly, liquidate small investment portion", rationale: "Solve it completely, avoid compounding risk.", quality: "OPTIMAL", netEffect: -1800, outcome: "You liquidate $2,200 in investments (small tax event), fix the car. Problem solved. Resume investing next month.", projection: "This cost is fixed. The alternative — breaking down and losing your job — costs infinitely more.", biasWarning: null, teachingMoment: "An emergency fund exists to prevent asset liquidation at bad times. Rebuild it immediately after using it.", flagsAdd: [], flagsRemove: [] },
      { id: "B", label: "Take the $600 patch, buy time", rationale: "Delay the full cost, keep money invested.", quality: "NEUTRAL", netEffect: -2400, outcome: "The patch holds for 3 months, then fails. You pay $600 + $3,400 = $4,000 total instead of $3,400.", projection: "Deferring necessary costs almost always increases total cost.", biasWarning: "HYPERBOLIC_DISCOUNTING", teachingMoment: "Kicking necessary costs forward is hyperbolic discounting — small relief now, larger pain later.", flagsAdd: [], flagsRemove: [] },
      { id: "C", label: "Take the 18% APR personal loan", rationale: "Keep investments intact, use debt to bridge.", quality: "POOR", netEffect: -4200, outcome: "You borrow $3,400 at 18%. Over 18 months the total repayment is $4,400. Cost of 'keeping investments' is negative.", projection: "Borrowing at 18% while invested at 7% is -11% guaranteed arbitrage.", biasWarning: "MENTAL_ACCOUNTING", teachingMoment: "Protecting investments by taking 18% debt is a mental accounting error. Net portfolio position is worse.", flagsAdd: ["HAS_DEBT"], flagsRemove: [] },
    ],
  },
  LIFESTYLE: {
    category: "LIFESTYLE", title: "The Lifestyle Inflation Trap", lifeStage: "MID",
    dominantBias: "HERD_MENTALITY",
    context: "You got a $18,000/year raise. Your friends are upgrading cars, apartments, vacations. You're driving a paid-off car and living below your means. Social pressure to 'enjoy the money' is significant. Your current savings rate is 22%.",
    marketRelevance: "Lifestyle inflation is the primary mechanism that prevents middle-income earners from ever reaching financial independence.",
    choices: [
      { id: "A", label: "Save 80% of the raise, spend 20% on life", rationale: "Raise savings rate from 22% to 35%. Small lifestyle bump.", quality: "OPTIMAL", netEffect: 14400, outcome: "You redirect $14,400/year to investments. Savings rate climbs to 35%. Compound growth accelerates significantly.", projection: "At 35% savings rate, financial independence is 15 years away vs 30+ at 10%.", biasWarning: null, teachingMoment: "The savings rate is the single most powerful variable in the financial independence equation — more than returns.", flagsAdd: ["HAS_INVESTMENTS"], flagsRemove: [] },
      { id: "B", label: "Split the raise: half saved, half spent", rationale: "Balance enjoyment and saving. Compromise.", quality: "GOOD", netEffect: 7200, outcome: "Good execution. Savings rate rises to 28%. You enjoy some upgrade without full inflation.", projection: "Progress toward FI but slower. Still ahead of average.", biasWarning: null, teachingMoment: "Any increase in savings rate outperforms the base case. Perfect is the enemy of good here.", flagsAdd: [], flagsRemove: [] },
      { id: "C", label: "Upgrade apartment and lease a new car", rationale: "You earned it. Live a little. YOLO.", quality: "CATASTROPHIC", netEffect: -6400, outcome: "Monthly fixed costs rise $1,600. The raise is fully consumed. Your savings rate drops to 8%.", projection: "You've traded a compounding asset (savings) for depreciating liabilities. This choice costs $200K+ in future wealth.", biasWarning: "HERD_MENTALITY", teachingMoment: "Lifestyle inflation is permanent. Income is temporary. The gap between them, invested, is financial independence.", flagsAdd: [], flagsRemove: [] },
    ],
  },
  BEHAVIORAL: {
    category: "BEHAVIORAL", title: "The Panic Sell Moment", lifeStage: "MID",
    dominantBias: "LOSS_AVERSION",
    context: "The market just dropped 22% in 6 weeks. Your $85,000 portfolio is now worth $66,300. Financial news is catastrophic. Your neighbor sold everything and went to cash. You're physically anxious when you open your brokerage app.",
    marketRelevance: "Bear markets are where wealth is transferred from the impatient to the patient. Staying the course is the core skill.",
    choices: [
      { id: "A", label: "Do nothing. Continue automatic contributions.", rationale: "Dollar-cost averaging into a down market is mechanically optimal.", quality: "OPTIMAL", netEffect: 18700, outcome: "Market recovers 18 months later. Your continued contributions bought cheap shares. Portfolio reaches $112,000.", projection: "Every major market drop in history has been followed by recovery. Every single one.", biasWarning: null, teachingMoment: "Time in market > timing the market. The days you're tempted to exit are the days your long-term returns are built.", flagsAdd: [], flagsRemove: [] },
      { id: "B", label: "Pause contributions, hold what you have", rationale: "Don't sell, but reduce exposure until stable.", quality: "NEUTRAL", netEffect: 2400, outcome: "You hold. Market recovers. But pausing contributions means you miss the cheapest buying window.", projection: "Missing the 10 best days per decade costs you 54% of returns historically.", biasWarning: "LOSS_AVERSION", teachingMoment: "The best market days cluster with the worst. If you exit during volatility, you miss both.", flagsAdd: [], flagsRemove: [] },
      { id: "C", label: "Sell everything, move to cash, wait for bottom", rationale: "Protect what's left. Re-enter when it's clear.", quality: "CATASTROPHIC", netEffect: -22400, outcome: "You lock in the 22% loss. The market turns 3 weeks later. You re-enter 30% higher, missing the entire recovery.", projection: "The average investor underperforms by 4.3% annually due to panic exits. Over 30 years: catastrophic.", biasWarning: "LOSS_AVERSION", teachingMoment: "No one rings a bell at the bottom. Investors who time the exit also miss the re-entry.", flagsAdd: [], flagsRemove: [] },
    ],
  },
  INHERITANCE: {
    category: "INHERITANCE", title: "The Windfall Decision", lifeStage: "MID",
    dominantBias: "MENTAL_ACCOUNTING",
    context: "You inherit $45,000 from a distant relative. You have $12,000 in student loan debt at 5.5%. Your emergency fund is 1 month of expenses. You've always wanted to travel to Southeast Asia. This feels like 'found money.'",
    marketRelevance: "Windfalls are high-leverage moments — the right decision here compounds; the wrong one is permanent.",
    choices: [
      { id: "A", label: "Fund emergency reserve, pay debt, invest rest", rationale: "Systematic deployment: risk first, debt second, growth third.", quality: "OPTIMAL", netEffect: 32000, outcome: "3-month emergency fund ($9K). Pay off $12K loan. Invest $24K. Net worth jump of $33K. No drag liabilities.", projection: "The $24K invested at 8% becomes $112K in 20 years. Plus you save $3,300 in future interest.", biasWarning: null, teachingMoment: "The sequence for windfalls: eliminate catastrophic risk first, then guaranteed losses (debt), then compound.", flagsAdd: ["HAS_EMERGENCY_FUND", "HAS_INVESTMENTS"], flagsRemove: ["HAS_DEBT"] },
      { id: "B", label: "Invest all of it immediately", rationale: "Let the market work. Debt is manageable.", quality: "GOOD", netEffect: 18000, outcome: "Good move on the investment. But no emergency fund means any shock forces liquidation. Student debt drags.", projection: "Fragile position — one emergency away from selling at a bad time.", biasWarning: null, teachingMoment: "Investing without an emergency fund is building a structure without a foundation.", flagsAdd: ["HAS_INVESTMENTS"], flagsRemove: [] },
      { id: "C", label: "Take the dream trip, invest the rest", rationale: "This is 'found money' — it's different from earned money.", quality: "POOR", netEffect: -8200, outcome: "Incredible 6-week trip. $14,000 spent. Remaining $31K invested. But the framing cost you $14K.", projection: "That $14K at 8% would be $65K in 20 years. The trip cost $65K in future wealth.", biasWarning: "MENTAL_ACCOUNTING", teachingMoment: "Mental accounting: 'found money' feels like free money. But a dollar inherited and a dollar earned are identical in compound terms.", flagsAdd: [], flagsRemove: [] },
    ],
  },
  MACRO_EVENT: {
    category: "MACRO_EVENT", title: "The Recession Signal", lifeStage: "MID",
    dominantBias: "HERD_MENTALITY",
    context: "Yield curve just inverted. Layoffs are rising. Your tech sector job feels stable but peers are nervous. You have 4 months of emergency fund, 60/40 stock-bond portfolio, and $22,000 in a money market account. Financial media is apocalyptic.",
    marketRelevance: "Recessions create the conditions for the next decade's wealth creation. The question is positioning, not panicking.",
    choices: [
      { id: "A", label: "Hold portfolio, extend emergency fund to 9 months", rationale: "Defensive positioning without selling productive assets.", quality: "OPTIMAL", netEffect: 9600, outcome: "Recession comes, you weather 7 months of volatility. Job survives. Portfolio dips 18% then recovers. You buy more near bottom.", projection: "Extended runway + undisturbed compounding is the highest-value recession strategy.", biasWarning: null, teachingMoment: "Recessions end. The people who emerge wealthiest extended cash runway and held equities, not those who went to cash.", flagsAdd: ["HAS_EMERGENCY_FUND"], flagsRemove: [] },
      { id: "B", label: "Shift to 40/60 bonds, wait for clarity", rationale: "Reduce equity exposure until things stabilize.", quality: "NEUTRAL", netEffect: 1800, outcome: "You miss 30% of the recovery while repositioning back to equities. You're safe but leave gains behind.", projection: "Tactical allocation shifts cost the average investor 1.5% annually in timing drag.", biasWarning: "LOSS_AVERSION", teachingMoment: "Shifting to bonds in a recession locks in lower returns and adds a second timing decision: when to shift back.", flagsAdd: [], flagsRemove: [] },
      { id: "C", label: "Sell equities, go 100% cash", rationale: "Cash is king in a recession. Protect everything.", quality: "CATASTROPHIC", netEffect: -18000, outcome: "You exit near the bottom. Recession lasts 9 months. Market recovers fully in 14 months. You re-enter 40% higher.", projection: "Full liquidation during recessions is the defining mistake of most retail investor careers.", biasWarning: "HERD_MENTALITY", teachingMoment: "The herd exits at the bottom and re-enters at the top. Systematically. Every cycle.", flagsAdd: [], flagsRemove: ["HAS_INVESTMENTS"] },
    ],
  },
};

export const OFFLINE_SCENARIOS = [
  { category:"HOUSING",     title:"Rent vs Buy Decision",          context:"Your lease is up. Buying costs 20% more monthly but builds equity.",        choices:[{label:"Buy now",quality:"GOOD",netEffect:200,outcome:"Equity builds steadily over 5 years."},{label:"Renew lease",quality:"NEUTRAL",netEffect:0,outcome:"Flexibility preserved, no equity gained."},{label:"Buy bigger place",quality:"BAD",netEffect:-300,outcome:"Overextended budget strains monthly cash flow."}], biasWarning:"FOMO" },
  { category:"INVESTING",   title:"Market Dip Opportunity",        context:"Stocks dropped 15%. Cash is available.",                                      choices:[{label:"Buy the dip",quality:"GOOD",netEffect:400,outcome:"Disciplined buying at discount pays off."},{label:"Wait for lower",quality:"NEUTRAL",netEffect:0,outcome:"Market recovers before you act."},{label:"Sell existing holdings",quality:"BAD",netEffect:-500,outcome:"Panic-sell locks in losses."}], biasWarning:"LOSS_AVERSION" },
  { category:"CAREER",      title:"Job Offer Evaluation",          context:"Competing offer is 20% higher pay but less stable company.",                  choices:[{label:"Take the offer",quality:"NEUTRAL",netEffect:200,outcome:"Higher pay but layoffs hit within 18 months."},{label:"Stay and negotiate",quality:"GOOD",netEffect:150,outcome:"Counter-offer accepted. Stability preserved."},{label:"Decline both",quality:"BAD",netEffect:-100,outcome:"Missed income window and goodwill."}], biasWarning:"ANCHORING" },
  { category:"DEBT",        title:"Bonus Allocation",              context:"$5k bonus arrives. Student loan at 7% and credit card at 22% outstanding.",   choices:[{label:"Kill the credit card",quality:"OPTIMAL",netEffect:600,outcome:"High-interest eliminated. Monthly freed cash compounds."},{label:"Split evenly",quality:"NEUTRAL",netEffect:100,outcome:"Neither debt eliminated quickly."},{label:"Lifestyle upgrade",quality:"BAD",netEffect:-200,outcome:"Debt burden continues, interest erodes bonus value."}], biasWarning:"PRESENT_BIAS" },
  { category:"EMERGENCY",   title:"Fund Raid Temptation",          context:"Emergency fund sits at 4 months. A vacation deal expires tomorrow.",         choices:[{label:"Keep fund intact",quality:"OPTIMAL",netEffect:0,outcome:"Fund available when transmission fails next month."},{label:"Use half, replenish later",quality:"BAD",netEffect:-150,outcome:"Replenishment never happens. Car repair hits hard."},{label:"Use it all",quality:"CATASTROPHIC",netEffect:-500,outcome:"Zero buffer. Job loss follows. Debt spiral begins."}], biasWarning:"PRESENT_BIAS" },
  { category:"INSURANCE",   title:"Policy Lapse Notice",           context:"Auto-renewal failed. Coverage lapses in 48 hours.",                          choices:[{label:"Renew immediately",quality:"OPTIMAL",netEffect:-80,outcome:"Continuous coverage. Minor fender-bender covered fully."},{label:"Shop for better rate first",quality:"NEUTRAL",netEffect:-80,outcome:"Found same rate. Two-day gap creates small risk."},{label:"Go without for a month",quality:"CATASTROPHIC",netEffect:-2000,outcome:"Uninsured accident during lapse. Out of pocket entirely."}], biasWarning:null },
  { category:"TAXES",       title:"Estimated Tax Deadline",        context:"Q3 estimated taxes due. Funds tight this month.",                             choices:[{label:"Pay full amount",quality:"OPTIMAL",netEffect:-300,outcome:"No penalty. Clean record maintained."},{label:"Pay half now",quality:"BAD",netEffect:-350,outcome:"Underpayment penalty added to Q4 bill."},{label:"Skip, pay in April",quality:"CATASTROPHIC",netEffect:-500,outcome:"Penalty + interest compound over two quarters."}], biasWarning:"OPTIMISM_BIAS" },
  { category:"RETIREMENT",  title:"401k Contribution Rate",        context:"New job allows up to 15% contribution. Employer matches 4%.",                 choices:[{label:"Contribute 10% (max match+)",quality:"OPTIMAL",netEffect:300,outcome:"Compound growth and full match captured."},{label:"Contribute 4% (match only)",quality:"NEUTRAL",netEffect:100,outcome:"Full match captured but growth potential left behind."},{label:"Contribute 0% for now",quality:"BAD",netEffect:-200,outcome:"Match forfeited. Time in market lost permanently."}], biasWarning:"PRESENT_BIAS" },
  { category:"SIDE_HUSTLE", title:"Client Acquisition Cost",       context:"$800 ad spend could bring $3k in new contracts.",                             choices:[{label:"Run the campaign",quality:"GOOD",netEffect:2200,outcome:"3 new clients convert. ROI 275%."},{label:"Organic only",quality:"NEUTRAL",netEffect:400,outcome:"Slower growth. One referral comes through."},{label:"Double the budget",quality:"BAD",netEffect:-200,outcome:"Oversaturated channel. Returns diminish sharply."}], biasWarning:"OVERCONFIDENCE" },
  { category:"FAMILY",      title:"Financial Gift Request",        context:"Sibling needs $2k loan. No formal repayment plan.",                          choices:[{label:"Decline with explanation",quality:"GOOD",netEffect:0,outcome:"Relationship tension but finances protected."},{label:"Gift not loan — $500",quality:"NEUTRAL",netEffect:-500,outcome:"Clear expectation, affordable amount."},{label:"Lend the full $2k",quality:"BAD",netEffect:-2000,outcome:"Loan never repaid. Resentment compounds."}], biasWarning:"SUNK_COST" },
  { category:"LIFESTYLE",   title:"Subscription Audit",           context:"Monthly subscriptions total $340. Half unused in 90 days.",                   choices:[{label:"Cancel all unused",quality:"OPTIMAL",netEffect:170,outcome:"$170/mo recovered. Redirected to index fund."},{label:"Cancel a few",quality:"NEUTRAL",netEffect:60,outcome:"Partial savings. Drift resumes in 3 months."},{label:"Keep all — might use them",quality:"BAD",netEffect:-340,outcome:"$4k/year on services with no value delivery."}], biasWarning:"SUNK_COST" },
  { category:"WINDFALL",    title:"Inheritance Decision",          context:"$25k inheritance arrives unexpectedly.",                                      choices:[{label:"Emergency fund + index fund split",quality:"OPTIMAL",netEffect:2500,outcome:"Foundation built. Market participation begins."},{label:"Pay off one debt entirely",quality:"GOOD",netEffect:1800,outcome:"Monthly cash flow freed. Psychological win."},{label:"Luxury purchase first",quality:"BAD",netEffect:-500,outcome:"$8k spent on depreciating goods. Remainder scattered."}], biasWarning:"WINDFALL_EFFECT" },
];

// ─── UTILITIES ────────────────────────────────────────────────────────────────

export const fmt = (n) => {
  if (n === undefined || n === null) return "$0";
  const abs = Math.abs(n);
  const prefix = n < 0 ? "-$" : "$";
  return prefix + abs.toLocaleString();
};

export const qualityColor = {
  OPTIMAL: "#00ff88", GOOD: "#66ffaa", NEUTRAL: "#aaaaaa",
  POOR: "#ff8844", CATASTROPHIC: "#ff2222",
};

export function hashSeed(seed, round) {
  const str = `${seed}:${round}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
}

export const SPIN_CHARS = ['⠋', '⠙', '⠸', '⠴'];

// ─── STYLES ───────────────────────────────────────────────────────────────────

export const css = {
  root: { background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Courier New', monospace", color: "#e0e0e0", position: "relative", overflow: "hidden" },
  scan: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)", pointerEvents: "none", zIndex: 1 },
  wrap: { maxWidth: 920, margin: "0 auto", padding: "24px 20px", position: "relative", zIndex: 2 },
  btn: (color = "#00ff88") => ({ background: color + "18", border: `1px solid ${color}`, color, padding: "11px 36px", cursor: "pointer", fontFamily: "monospace", fontSize: 13, letterSpacing: 3, boxShadow: `0 0 16px ${color}33`, transition: "all 0.2s" }),
  tag: (color = "#444") => ({ background: "#111", border: `1px solid ${color}`, color, padding: "2px 8px", fontSize: 10, letterSpacing: 1 }),
  card: (selected, revealed, color) => ({
    background: selected ? "#0a1a0a" : "#0d0d0d",
    border: `1px solid ${selected ? color : revealed ? "#1e1e1e" : "#2a2a2a"}`,
    padding: 16, cursor: revealed ? "default" : "pointer",
    opacity: revealed && !selected ? 0.55 : 1,
    transition: "all 0.3s",
    boxShadow: selected ? `0 0 18px ${color}33` : "none",
  }),
};
