// Tiny synthesized sound effects (no audio files needed).
let ctx = null;
let enabled = true;
export function setSound(on) { enabled = on; }
export function initAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, type = 'square', vol = 0.12, slide = 0, delay = 0) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.15, freq = 800, delay = 0) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

export const sfx = {
  swing: () => noise(0.12, 0.12, 2500),
  hit: () => { tone(180, 0.1, 'square', 0.1, -80); noise(0.08, 0.1, 1200); },
  shoot: () => tone(600, 0.12, 'triangle', 0.1, -300),
  hurt: () => tone(220, 0.2, 'sawtooth', 0.12, -120),
  jump: () => tone(300, 0.1, 'sine', 0.06, 200),
  heart: () => { tone(660, 0.1, 'sine', 0.1); tone(990, 0.15, 'sine', 0.1, 0, 0.08); },
  ability: () => { tone(200, 0.35, 'sawtooth', 0.08, 500); noise(0.3, 0.08, 3000); },
  death: () => { tone(400, 0.6, 'square', 0.1, -350); },
  mobDie: () => { tone(300, 0.2, 'square', 0.08, -200); noise(0.15, 0.08, 900); },
  boom: () => noise(0.5, 0.25, 400),
  roar: () => { tone(90, 0.9, 'sawtooth', 0.15, -40); noise(0.9, 0.15, 500); },
  card: (rarityIndex) => {
    const notes = [523, 659, 784, 1047, 1319, 1568];
    const n = 2 + rarityIndex;
    for (let i = 0; i < n; i++) tone(notes[i % notes.length], 0.18, 'triangle', 0.1, 0, i * 0.08);
  },
  victory: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, 0, i * 0.15)); },
  click: () => tone(800, 0.05, 'square', 0.05),
};
