// ─── REINFORCEMENT LOOP ───────────────────────────────────────────────────────
// Achievements, streak, daily challenge, personal bests.
// All persistence is via localStorage — no server required.

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

export const ACHIEVEMENTS = [
  {
    id:    'FIRST_RUN',
    icon:  '◈',
    label: 'FIRST CONTACT',
    desc:  'Complete your first simulation',
    check: () => true,
  },
  {
    id:    'CLEAN_SLATE',
    icon:  '◆',
    label: 'CLEAN SLATE',
    desc:  'Finish a run with zero CATASTROPHIC choices (5+ rounds)',
    check: ({ stats }) => stats.catastrophicCount === 0 && stats.totalRounds >= 5,
  },
  {
    id:    'APEX',
    icon:  '▲',
    label: 'APEX PROTOCOL',
    desc:  'Achieve an S grade',
    check: ({ archGrade }) => archGrade === 'S',
  },
  {
    id:    'SPEED_DAEMON',
    icon:  '⏱',
    label: 'SPEED DAEMON',
    desc:  'Complete a full run in Time Pressure mode',
    check: ({ pressureMode, stats }) => pressureMode && stats.totalRounds >= 5,
  },
  {
    id:    'COMPOUNDER',
    icon:  '∞',
    label: 'THE COMPOUNDER',
    desc:  'Unlock the Patient Compounder ending',
    check: ({ endingId }) => endingId === 'PATIENT_COMPOUNDER',
  },
  {
    id:    'ARCHITECT',
    icon:  '⬡',
    label: 'WEALTH ARCHITECT',
    desc:  'Unlock the Wealth Architect ending',
    check: ({ endingId }) => endingId === 'WEALTH_ARCHITECT',
  },
  {
    id:    'BIAS_MAGNET',
    icon:  '⚠',
    label: 'BIAS MAGNET',
    desc:  'Trigger 5+ cognitive biases in a single run',
    check: ({ history }) => history.filter(r => r.choice?.biasWarning).length >= 5,
  },
  {
    id:    'PERFECT_RUN',
    icon:  '●',
    label: 'PERFECT PROTOCOL',
    desc:  'All choices OPTIMAL in a single run (5+ rounds)',
    check: ({ history }) =>
      history.length >= 5 && history.every(r => r.choice?.quality === 'OPTIMAL'),
  },
];

/**
 * Returns IDs of achievements newly unlocked this run.
 * @param {string[]} alreadyUnlocked  — IDs already in localStorage
 * @param {{ stats, archGrade, history, endingId, pressureMode }} context
 */
export function checkNewAchievements(alreadyUnlocked, context) {
  return ACHIEVEMENTS
    .filter(a => !alreadyUnlocked.includes(a.id) && a.check(context))
    .map(a => a.id);
}

// ─── DAILY CHALLENGE ──────────────────────────────────────────────────────────

/** "YYYY-MM-DD" for today in local time */
export function getDailyKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Short alphanumeric seed derived from today's date — same for all players */
export function getDailySeed() {
  const d = new Date();
  const n = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return n.toString(36); // e.g., "dh8p01"
}

/** Whether today's daily challenge has been completed */
export function isDailyDone() {
  try {
    return !!localStorage.getItem(`finbot_daily_${getDailyKey()}`);
  } catch { return false; }
}

/** Record today's daily challenge as complete */
export function markDailyDone(grade, netWorth) {
  try {
    localStorage.setItem(`finbot_daily_${getDailyKey()}`, JSON.stringify({ grade, netWorth, at: Date.now() }));
  } catch {}
}

// ─── STREAK ───────────────────────────────────────────────────────────────────

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Load current streak count from localStorage */
export function loadStreak() {
  try {
    const raw = localStorage.getItem('finbot_streak');
    if (!raw) return 0;
    const { count, lastDate } = JSON.parse(raw);
    const today = getDailyKey();
    // Already played today or yesterday → streak still alive
    if (lastDate === today || lastDate === getYesterday()) return count;
    return 0; // Streak broken
  } catch { return 0; }
}

/** Increment streak (idempotent for same day) — returns new count */
export function incrementStreak() {
  try {
    const raw = localStorage.getItem('finbot_streak');
    const today = getDailyKey();
    const data = raw ? JSON.parse(raw) : {};
    if (data.lastDate === today) return data.count; // already counted today
    const newCount = data.lastDate === getYesterday() ? data.count + 1 : 1;
    localStorage.setItem('finbot_streak', JSON.stringify({ count: newCount, lastDate: today }));
    return newCount;
  } catch { return 0; }
}

// ─── PERSONAL BESTS ───────────────────────────────────────────────────────────

const PB_KEY = 'finbot_personal_bests';

export function loadPersonalBests() {
  try { return JSON.parse(localStorage.getItem(PB_KEY) || '{}'); }
  catch { return {}; }
}

/**
 * Update personal best for a difficulty if this run beats it.
 * Returns the full updated personalBests object.
 */
export function updatePersonalBest(personalBests, difficultyLabel, netWorth, grade) {
  const prev = personalBests[difficultyLabel];
  if (!prev || netWorth > prev.netWorth) {
    const updated = { ...personalBests, [difficultyLabel]: { netWorth, grade } };
    try { localStorage.setItem(PB_KEY, JSON.stringify(updated)); } catch {}
    return updated;
  }
  return personalBests;
}

// ─── PROFILE PERSISTENCE ─────────────────────────────────────────────────────

const ACH_KEY = 'finbot_achievements';

export function loadAchievements() {
  try { return JSON.parse(localStorage.getItem(ACH_KEY) || '[]'); }
  catch { return []; }
}

export function saveAchievements(ids) {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(ids)); } catch {}
}
