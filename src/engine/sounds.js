// ─── FINBOT-9000 SOUND ENGINE (Web Audio API — no files, no deps) ─────────────
// All sounds are programmatically synthesised. Respects a global mute flag.
// Usage: import { sfx } from './sounds.js'; sfx.click();

let _ctx = null;
let _muted = false;

function ctx() {
  if (_muted) return null;
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function setSoundMuted(val) { _muted = val; }
export function isSoundMuted()     { return _muted; }

// ─── PRIMITIVE BUILDERS ──────────────────────────────────────────────────────

function tone(frequency, duration, type = 'square', gain = 0.18, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(env);
  env.connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

function noise(duration, gain = 0.08, delay = 0) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  const env = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;
  src.buffer = buf;
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(filter);
  filter.connect(env);
  env.connect(c.destination);
  src.start(t);
  src.stop(t + duration);
}

// ─── NAMED SOUND EVENTS ─────────────────────────────────────────────────────

export const sfx = {
  // UI tick — card hover
  tick() {
    tone(880, 0.04, 'square', 0.06);
  },

  // Confirm click — choice selected
  click() {
    tone(660, 0.06, 'square', 0.12);
    tone(880, 0.08, 'square', 0.10, 0.04);
  },

  // Outcome reveal — OPTIMAL or GOOD
  good() {
    tone(523, 0.09, 'triangle', 0.14);
    tone(659, 0.09, 'triangle', 0.14, 0.09);
    tone(784, 0.12, 'triangle', 0.16, 0.18);
  },

  // Outcome reveal — POOR or CATASTROPHIC
  bad() {
    tone(220, 0.12, 'sawtooth', 0.16);
    tone(180, 0.14, 'sawtooth', 0.14, 0.10);
    noise(0.18, 0.10, 0.20);
  },

  // NEUTRAL outcome
  neutral() {
    tone(440, 0.10, 'triangle', 0.10);
    tone(440, 0.08, 'triangle', 0.08, 0.12);
  },

  // Ripple event klaxon
  ripple() {
    tone(880, 0.08, 'sawtooth', 0.18);
    tone(660, 0.08, 'sawtooth', 0.16, 0.10);
    tone(880, 0.08, 'sawtooth', 0.18, 0.20);
    tone(440, 0.16, 'sawtooth', 0.14, 0.30);
  },

  // Market shift chime
  marketShift() {
    tone(440, 0.10, 'sine', 0.14);
    tone(554, 0.10, 'sine', 0.14, 0.12);
    tone(659, 0.10, 'sine', 0.14, 0.24);
    tone(880, 0.20, 'sine', 0.18, 0.36);
  },

  // Timer warning — fires when timeLeft <= 10
  timerWarn() {
    tone(1047, 0.06, 'square', 0.12);
    tone(1047, 0.06, 'square', 0.12, 0.14);
  },

  // Timer expired — worst choice forced
  timerExpired() {
    noise(0.08, 0.16);
    tone(220, 0.30, 'sawtooth', 0.18, 0.06);
  },

  // Game over — win (S/A)
  win() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, 0.12, 'triangle', 0.15, i * 0.10));
  },

  // Game over — loss (D/C-)
  lose() {
    const notes = [440, 370, 311, 261];
    notes.forEach((f, i) => tone(f, 0.16, 'sawtooth', 0.14, i * 0.12));
  },

  // Boot sequence — 3 ascending blips
  boot() {
    tone(220, 0.06, 'square', 0.10);
    tone(330, 0.06, 'square', 0.10, 0.10);
    tone(440, 0.08, 'square', 0.12, 0.20);
  },
};
