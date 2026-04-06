// ─── FINBOT-9000 SUPABASE LEADERBOARD ────────────────────────────────────────
// Requires env vars: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
// Falls back to localStorage when Supabase is not configured.
// Supabase SDK is lazy-loaded — zero bundle impact when unconfigured.
//
// ─── SQL SCHEMA (run once in Supabase SQL editor) ─────────────────────────────
//
//   create table if not exists runs (
//     id               uuid primary key default gen_random_uuid(),
//     user_id          uuid references auth.users,
//     player_name      text,
//     score            int  not null default 0,
//     net_worth        bigint not null,
//     difficulty       text not null,
//     archetype        text not null,
//     grade            text not null,
//     rounds           int,
//     streak           int,
//     calibration_grade text,
//     bias_dna         jsonb,
//     created_at       timestamptz default now()
//   );
//
//   alter table runs enable row level security;
//   create policy "public read"  on runs for select using (true);
//   create policy "anon insert"  on runs for insert with check (auth.uid() = user_id);
//   create policy "anon update"  on runs for update using (auth.uid() = user_id);
//
//   -- Indexes
//   create index on runs (score desc);
//   create index on runs (net_worth desc);
//   create index on runs (created_at desc);
//   create index on runs (difficulty, score desc);
//
//   -- Enable Realtime on runs table:
//   alter publication supabase_realtime add table runs;
//
// ─── RATE-LIMIT FUNCTION (optional, run in SQL editor for server-side guard) ──
//
//   create or replace function check_run_rate_limit()
//   returns trigger language plpgsql security definer as $$
//   begin
//     if exists (
//       select 1 from runs
//       where user_id = new.user_id
//         and created_at > now() - interval '60 seconds'
//     ) then
//       raise exception 'rate_limit';
//     end if;
//     return new;
//   end;
//   $$;
//   create trigger enforce_run_rate_limit
//     before insert on runs
//     for each row execute function check_run_rate_limit();

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL  || "";
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";
const RATE_LIMIT_KEY = 'finbot_last_submit';

export const isSupabaseEnabled = () => !!(SUPABASE_URL && SUPABASE_KEY);

// Lazy singleton
let _clientPromise = null;
async function getClient() {
  if (!isSupabaseEnabled()) return null;
  if (!_clientPromise) {
    _clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    );
  }
  return _clientPromise;
}

// ─── SCORE FORMULA ────────────────────────────────────────────────────────────
// Normalised growth × quality bonus — comparable across difficulties.
// e.g. 4× growth + 70% optimal = 400 * 1.70 = 680
export function computeScore(netWorth, startNetWorth, optimalRate = 0) {
  const growth = netWorth / Math.max(startNetWorth, 1);
  return Math.round(growth * 100 * (1 + optimalRate));
}

// ─── ANONYMOUS AUTH ──────────────────────────────────────────────────────────
/** Returns the anon user's UUID, creating a session on first call. */
export async function ensureAnonSession() {
  const client = await getClient();
  if (!client) return null;
  try {
    const { data: { session } } = await client.auth.getSession();
    if (session?.user?.id) return session.user.id;
    const { data, error } = await client.auth.signInAnonymously();
    if (error) return null;
    return data.user?.id || null;
  } catch { return null; }
}

// ─── SUBMIT RUN ──────────────────────────────────────────────────────────────
/**
 * @param {{ uid, playerName, score, netWorth, startNetWorth, difficulty,
 *           archetype, grade, rounds, streak, calibrationGrade, biasDna,
 *           optimalRate }} run
 */
export async function submitRun(run) {
  // Client-side rate limit
  try {
    const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10);
    if (Date.now() - last < 60_000) return { ok: false, error: 'rate_limited' };
    localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
  } catch {}

  const client = await getClient();
  if (!client) return { ok: false, error: 'not_configured' };

  const { data, error } = await client.from('runs').insert({
    user_id:           run.uid || null,
    player_name:       run.playerName || null,
    score:             run.score,
    net_worth:         run.netWorth,
    difficulty:        run.difficulty,
    archetype:         run.archetype,
    grade:             run.grade,
    rounds:            run.rounds || null,
    streak:            run.streak || null,
    calibration_grade: run.calibrationGrade || null,
    bias_dna:          run.biasDna || null,
  }).select('id').single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

// ─── FETCH LEADERBOARD ───────────────────────────────────────────────────────
/**
 * @param {'ALL'|'DAILY'|string} filter  — 'ALL', 'DAILY', or a difficulty label
 * @param {number} limit
 */
export async function fetchLeaderboard(filter = 'ALL', limit = 25) {
  const client = await getClient();
  if (!client) return null;

  let query = client.from('runs')
    .select('id, user_id, player_name, score, net_worth, difficulty, archetype, grade, rounds, streak, calibration_grade, created_at')
    .order('score', { ascending: false })
    .limit(limit);

  if (filter === 'DAILY') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  } else if (filter !== 'ALL') {
    query = query.eq('difficulty', filter);
  }

  const { data, error } = await query;
  if (error || !data) return null;
  return data.map((r, i) => ({
    rank:      i + 1,
    uid:       r.user_id,
    name:      r.player_name || '---',
    score:     r.score,
    netWorth:  r.net_worth,
    archetype: r.archetype,
    grade:     r.grade,
    diff:      r.difficulty,
    rounds:    r.rounds,
    streak:    r.streak,
    calibGrade: r.calibration_grade,
    date:      new Date(r.created_at).toLocaleDateString(),
    id:        r.id,
  }));
}

// ─── REALTIME SUBSCRIPTION ───────────────────────────────────────────────────
/**
 * Subscribe to new run inserts. Calls onBeat({ name, score, archetype }) when
 * someone posts a score higher than currentScore from a different user.
 * Returns the channel so caller can unsubscribe via channel.unsubscribe().
 */
export async function subscribeRuns(uid, currentScore, onBeat) {
  const client = await getClient();
  if (!client) return null;

  const channel = client
    .channel('runs-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'runs' }, payload => {
      const row = payload.new;
      if (row.user_id !== uid && row.score > currentScore) {
        onBeat({ name: row.player_name || '---', score: row.score, archetype: row.archetype });
      }
    })
    .subscribe();

  return channel;
}

// ─── LEGACY COMPAT (used by saveCallsign path) ───────────────────────────────
export async function postScore({ callsign, netWorth, archetype, grade, difficulty, optimalRate }) {
  return submitRun({
    playerName: callsign, netWorth, archetype, grade, difficulty,
    score: computeScore(netWorth, 1, optimalRate ?? 0),
  });
}
export async function fetchGlobalTop10() { return fetchLeaderboard('ALL', 10); }
export async function fetchTop10ByDifficulty(diff) { return fetchLeaderboard(diff, 10); }
