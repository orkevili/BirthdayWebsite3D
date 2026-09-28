// Szintetizált hangok (zenedoboz-szerű), külső hangfájl nélkül.

let ctx = null;
let master = null;
let muted = false;
let music = null;
let musicGain = null;
let musicPlaying = false;
const MUSIC_VOL = 0.9;

/** Betölti a saját zenét (még nem játssza le) */
export function prepareMusic(src) {
  if (!src) return;
  const el = new Audio();
  el.preload = 'auto';
  el.loop = true;
  el.src = src;
  music = { el, ok: true, node: null };
  el.addEventListener('error', () => (music.ok = false));
}

export function initAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);

    // Egyszerű visszhang a "zenedoboz" térérzethez
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.27;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2800;
    master.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();

  // A zenét a hangerő-szabályzás (és iOS) miatt WebAudio-n keresztül vezetjük,
  // és egy felhasználói kattintás alatt "feloldjuk" a későbbi lejátszáshoz.
  if (music?.ok && !music.node) {
    music.node = ctx.createMediaElementSource(music.el);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    music.node.connect(musicGain).connect(ctx.destination);
    music.el.play().then(() => {
      if (!musicPlaying) music.el.pause();
    }).catch(() => {});
  }
}

/** Elindítja a saját zenét lágy felhangosítással; false, ha nem sikerült */
export async function playMusic(startAt = 0, fade = 2.5) {
  if (!ctx || !music?.ok || !music.node) return false;
  musicPlaying = true;
  try {
    music.el.currentTime = startAt;
    await music.el.play();
  } catch {
    musicPlaying = false;
    return false;
  }
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(0, t);
  musicGain.gain.linearRampToValueAtTime(muted ? 0 : MUSIC_VOL, t + fade);
  return true;
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.05);
  if (musicGain && musicPlaying) musicGain.gain.setTargetAtTime(muted ? 0 : MUSIC_VOL, ctx.currentTime, 0.05);
}

export const isMuted = () => muted;

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function bell(freq, time, vol = 0.22, dur = 1.6) {
  const partials = [[1, 1], [2, 0.35], [3, 0.12], [4.2, 0.05]];
  for (const [mult, amp] of partials) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol * amp, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur / mult);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }
}

export function playChime() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  [84, 88, 91, 96, 100].forEach((n, i) => bell(midi(n), t + i * 0.07, 0.14, 1.2));
}

export function playWhoosh() {
  if (!ctx) return;
  const len = ctx.sampleRate * 0.9;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  const t = ctx.currentTime;
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(1800, t + 0.3);
  filter.frequency.exponentialRampToValueAtTime(300, t + 0.9);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.35, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
}

// Happy Birthday (közkincs) – [MIDI hangmagasság, ütem]
const MELODY = [
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
  [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
  [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3],
];
// Egyszerű basszus a sorok elejére
const BASS = [[null, 1], [48, 3], [43, 3], [43, 3], [48, 3], [48, 3], [41, 3], [48, 3], [43, 2], [48, 3]];

export function playHappyBirthday() {
  if (!ctx) return 0;
  const beat = 0.42;
  const start = ctx.currentTime + 0.1;
  let t = start;
  for (const [note, len] of MELODY) {
    bell(midi(note + 12), t, 0.2, 1.8);
    t += len * beat;
  }
  let b = start;
  for (const [note, len] of BASS) {
    if (note) bell(midi(note + 12), b, 0.1, 2.2);
    b += len * beat;
  }
  return t - start;
}
