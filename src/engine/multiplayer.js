// ─── MULTIPLAYER: localStorage keys + shared storage helpers ─────────────────

export const SK = {
  session:    (code) => `finbot_session_${code}`,
  round:      (code) => `finbot_round_${code}`,
  p1Choice:   (code) => `finbot_p1choice_${code}`,
  p2Choice:   (code) => `finbot_p2choice_${code}`,
  p1Worth:    (code) => `finbot_p1worth_${code}`,
  p2Worth:    (code) => `finbot_p2worth_${code}`,
  disconnect: (code) => `finbot_dc_${code}`,   // B-05: P1 disconnect flag
};

export async function storeShared(key, value) {
  try {
    if (window.storage) {
      await window.storage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
}

export async function readShared(key) {
  try {
    if (window.storage) {
      const val = await window.storage.getItem(key);
      return val ? JSON.parse(val) : null;
    } else {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    }
  } catch { return null; }
}

export async function deleteShared(key) {
  try {
    if (window.storage) {
      await window.storage.removeItem(key);
    } else {
      localStorage.removeItem(key);
    }
  } catch {}
}
