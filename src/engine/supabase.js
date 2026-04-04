// ─── FINBOT-9000 SUPABASE LEADERBOARD ────────────────────────────────────────
// Requires env vars: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
// Falls back to localStorage if Supabase is not configured.
// Uses dynamic import so the ~200KB SDK is NOT bundled when unconfigured.
//
// Schema (run once in Supabase SQL editor):
//
//   create table if not exists leaderboard (
//     id          bigserial primary key,
//     callsign    text,
//     net_worth   bigint    not null,
//     archetype   text      not null,
//     grade       text      not null,
//     difficulty  text      not null,
//     optimal_rate real,
//     played_at   timestamptz default now()
//   );
//
//   alter table leaderboard enable row level security;
//   create policy "public read"   on leaderboard for select using (true);
//   create policy "public insert" on leaderboard for insert with check (true);
//   create index on leaderboard (net_worth desc);

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL  || "";
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseEnabled = () => !!(SUPABASE_URL && SUPABASE_KEY);

// Lazy singleton — SDK loaded only when credentials are present
let _clientPromise = null;
async function getClient() {
  if (!isSupabaseEnabled()) return null;
  if (!_clientPromise) {
    _clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY)
    );
  }
  return _clientPromise;
}

// ─── POST A SCORE ─────────────────────────────────────────────────────────────
export async function postScore({ callsign, netWorth, archetype, grade, difficulty, optimalRate }) {
  const client = await getClient();
  if (!client) return { ok: false, error: "Supabase not configured" };
  const { error } = await client.from('leaderboard').insert({
    callsign:     callsign || null,
    net_worth:    netWorth,
    archetype,
    grade,
    difficulty,
    optimal_rate: optimalRate ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── FETCH GLOBAL TOP-10 ─────────────────────────────────────────────────────
export async function fetchGlobalTop10() {
  const client = await getClient();
  if (!client) return null;
  const { data, error } = await client
    .from('leaderboard')
    .select('callsign, net_worth, archetype, grade, difficulty, optimal_rate, played_at')
    .order('net_worth', { ascending: false })
    .limit(10);
  if (error || !data) return null;
  return data.map(r => ({
    callsign:    r.callsign || "---",
    netWorth:    r.net_worth,
    archetype:   r.archetype,
    grade:       r.grade,
    diff:        r.difficulty,
    optimalRate: r.optimal_rate,
    date:        new Date(r.played_at).toLocaleDateString(),
    global:      true,
  }));
}

// ─── FETCH DIFFICULTY-FILTERED TOP-10 ────────────────────────────────────────
export async function fetchTop10ByDifficulty(difficulty) {
  const client = await getClient();
  if (!client) return null;
  const { data, error } = await client
    .from('leaderboard')
    .select('callsign, net_worth, archetype, grade, difficulty, optimal_rate, played_at')
    .eq('difficulty', difficulty)
    .order('net_worth', { ascending: false })
    .limit(10);
  if (error || !data) return null;
  return data.map(r => ({
    callsign:    r.callsign || "---",
    netWorth:    r.net_worth,
    archetype:   r.archetype,
    grade:       r.grade,
    diff:        r.difficulty,
    optimalRate: r.optimal_rate,
    date:        new Date(r.played_at).toLocaleDateString(),
    global:      true,
  }));
}
