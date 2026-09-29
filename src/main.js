import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import { config } from './config.js';
import { animate, Ease, lerp, rand, tick, wait } from './anim.js';
import { backgroundTexture, glowTexture } from './textures.js';
import { createGift } from './gift.js';
import { CARD_H, CARD_W, createCard } from './card.js';
import { createCake } from './cake.js';
import { createGallery } from './gallery.js';
import { Balloons, Confetti, PASTELS, Smoke, Sparks, createBokeh, createFloatingHearts } from './effects.js';
import {
  initAudio, isMuted, musicBeat, playChime, playHappyBirthday, playMusic, playWhoosh, prepareMusic, setMuted,
  startBackgroundMusic, stopBackgroundMusic,
} from './audio.js';
import { NOTE_W, createSlice } from './slice.js';
import { createSky } from './sky.js';
import { startMic } from './mic.js';

// ── Renderer, jelenet, fények ──────────────────────────────────
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = backgroundTexture();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

const hemi = new THREE.HemisphereLight('#fff0f6', '#d9b8ff', 1.3);
const key = new THREE.DirectionalLight('#fff4ea', 2.2);
key.position.set(3, 5, 4);
const rim = new THREE.DirectionalLight('#ffc2e0', 1.6);
rim.position.set(-4, 2, -3);
// Az ütemre felvillanó rózsaszín fény a fináléban
const beatLight = new THREE.AmbientLight('#ffc4e6', 0);
scene.add(hemi, key, rim, beatLight);

const glowTex = glowTexture();
const sparks = new Sparks(scene, glowTex);
const bokeh = createBokeh(scene, glowTex);
const hearts = createFloatingHearts(scene);
const confetti = new Confetti(scene);
const balloons = new Balloons(scene);
const smoke = new Smoke(scene, glowTex);
const sky = createSky(scene, glowTex, sparks);
prepareMusic(config.music);

// ── Kamera: "keretezés" – adott méretű területet mindig kitölt ─
const view = { center: new THREE.Vector3(0, 0, 0), w: 3.6, h: 3.6, dir: new THREE.Vector3(0, 0.15, 1).normalize() };
const pointer = new THREE.Vector2();
const parallax = new THREE.Vector2();

function viewDistance(w, h) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return Math.max(h / (2 * t), w / (2 * t * camera.aspect)) * 1.1;
}

function frameTo(target, duration = 1.8) {
  const from = { center: view.center.clone(), w: view.w, h: view.h, dir: view.dir.clone() };
  const dir = target.dir.clone().normalize();
  return animate(duration, (e) => {
    view.center.lerpVectors(from.center, target.center, e);
    view.w = lerp(from.w, target.w, e);
    view.h = lerp(from.h, target.h, e);
    view.dir.lerpVectors(from.dir, dir, e).normalize();
  }, Ease.inOutCubic);
}

const FRAMES = {
  gift: { center: new THREE.Vector3(0, 0.1, 0), w: 3.6, h: 3.8, dir: new THREE.Vector3(0, 0.2, 1) },
  cardClosed: { center: new THREE.Vector3(0, 0.2, 0.6), w: CARD_W + 0.4, h: CARD_H + 0.5, dir: new THREE.Vector3(0, 0.05, 1) },
  cardOpen: { center: new THREE.Vector3(0, 0.2, 0.6), w: CARD_W * 2 + 0.4, h: CARD_H + 0.5, dir: new THREE.Vector3(0, 0.05, 1) },
  cake: { center: new THREE.Vector3(0, 0.55, 0), w: 3.9, h: 4.1, dir: new THREE.Vector3(0, 0.45, 1) },
  finale: { center: new THREE.Vector3(0, 0.9, 0), w: 7.4, h: 5.8, dir: new THREE.Vector3(0, 0.3, 1) },
  // felnézünk az égre: a kamera a torta mögül felfelé néz
  sky: { center: new THREE.Vector3(0, 10, -8), w: 8, h: 12.7, dir: new THREE.Vector3(0, -6.5, 17) },
};

function updateCamera(dt) {
  parallax.lerp(pointer, 1 - Math.exp(-dt * 3));
  const dist = viewDistance(view.w, view.h);
  const right = new THREE.Vector3().crossVectors(view.dir, THREE.Object3D.DEFAULT_UP).normalize().negate();
  camera.position.copy(view.center).addScaledVector(view.dir, dist)
    .addScaledVector(right, parallax.x * dist * 0.05)
    .addScaledVector(THREE.Object3D.DEFAULT_UP, parallax.y * dist * 0.035);
  camera.lookAt(view.center);
}

// ── UI ─────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const hintEl = $('hint');
const buttonsEl = $('buttons');

function setHint(text) {
  hintEl.classList.add('hidden');
  clearTimeout(setHint.timer);
  if (!text) return;
  setHint.timer = setTimeout(() => {
    hintEl.textContent = text;
    hintEl.classList.remove('hidden');
  }, 350);
}

function setButtons(buttons) {
  buttonsEl.replaceChildren(...buttons.map(({ label, onClick, secondary }) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (secondary) b.classList.add('secondary');
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onClick(b);
    });
    return b;
  }));
}

$('sound').addEventListener('click', () => {
  setMuted(!isMuted());
  $('sound').textContent = isMuted() ? '🔇' : '🔊';
});

// ── Betöltés ───────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadFonts() {
  const sample = 'Boldog Szülinapot! őűáéíóú ŐŰ 22';
  await Promise.all([
    document.fonts.load('700 100px "Dancing Script"', sample),
    document.fonts.load('500 40px Quicksand', sample),
    document.fonts.load('600 40px Quicksand', sample),
  ]).catch(() => {});
}

// ── Állapotgép ─────────────────────────────────────────────────
let state = 'loading';
let gift;
let card;
let cake;
let gallery;
let slice;
let mic = null;
let hoverTargets = [];

async function init() {
  const [images] = await Promise.all([Promise.all(config.photos.map((p) => loadImage(p.src))), loadFonts()]);

  gift = createGift(glowTex);
  card = createCard(config, images);
  cake = createCake(glowTex, smoke);
  gallery = createGallery(config, images, camera);
  slice = createSlice(config);
  scene.add(gift.group, card.root, cake.root, gallery.ring, slice.root);
  FRAMES.slice = {
    center: SLICE_POS.clone().add(new THREE.Vector3(0, slice.height / 2, 0)),
    w: NOTE_W + 0.2, h: slice.height + 0.4, dir: new THREE.Vector3(0, 0.2, 1),
  };

  Object.assign(view, { center: FRAMES.gift.center.clone(), w: FRAMES.gift.w, h: FRAMES.gift.h, dir: FRAMES.gift.dir.clone().normalize() });
  resize();
  renderer.compile(scene, camera);

  $('loader').classList.add('done');
  if (config.unlock?.date) showGate();
  else startGift();
}

// ── Dátumos zár a legelején ────────────────────────────────────
function showGate() {
  state = 'gate';
  $('gate-title').textContent = `Szia ${config.name}! 💕`;
  $('gate-question').textContent = config.unlock.question;
  $('gate').classList.remove('hidden');
}

let gateTries = 0;
$('gate').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (state !== 'gate') return;
  initAudio();
  const digits = (v) => String(v ?? '').replace(/\D/g, '');
  const answer = digits($('gate-date').value);
  if (answer && answer === digits(config.unlock.date)) {
    state = 'busy';
    $('gate-lock').textContent = '🔓';
    $('gate-msg').textContent = 'Eltaláltad! ✨';
    $('gate').classList.add('unlocked');
    playChime();
    startBackgroundMusic();
    sparks.emit({ position: new THREE.Vector3(0, 0.3, 0), count: 160, speed: 4, up: 0.4, gravity: -2, size: 0.2 });
    await wait(1.2);
    $('gate').classList.add('hidden');
    await wait(0.6);
    startGift();
  } else {
    gateTries++;
    const panel = $('gate-card');
    panel.classList.remove('shake');
    void panel.offsetWidth; // az animáció újraindításához
    panel.classList.add('shake');
    $('gate-msg').textContent = gateTries >= 2 && config.unlock.hint ? config.unlock.hint : 'Hmm, nem ez az… próbáld újra! 💭';
  }
});

function startGift() {
  state = 'gift';
  hoverTargets = gift.hitTargets;
  setHint('Egy meglepetés vár rád… Koppints az ajándékra! 🎁');
}

async function openGift() {
  state = 'busy';
  hoverTargets = [];
  gift.hovered = false;
  initAudio();
  startBackgroundMusic();
  setHint('');

  await gift.open(() => {
    playChime();
    sparks.emit({ position: new THREE.Vector3(0, 0.9, 0), count: 220, speed: 5, up: 0.6, gravity: -3, size: 0.22, life: 1.8 });
  });

  const rise = card.rise(FRAMES.cardClosed.center);
  frameTo(FRAMES.cardClosed, 2.0);
  gift.vanish();
  await rise;

  state = 'card';
  hoverTargets = card.hitTargets;
  setHint('Nyisd ki a képeslapot! 💌');
}

async function openCard() {
  state = 'busy';
  hoverTargets = [];
  card.hovered = false;
  setHint('');
  frameTo(FRAMES.cardOpen, 1.6);
  sparks.emit({ position: new THREE.Vector3(0, 0.2, 0.8), count: 90, speed: 3, colors: ['#ffd36b', '#ffffff', '#ff8fbf'], gravity: -1, size: 0.15 });
  await card.open();
  state = 'cardOpen';
  hoverTargets = card.hitTargets;
  setHint(camera.aspect < 1 ? 'Koppints egy oldalra a nagyításhoz 🔍' : '');
  // Az üzenet "kézzel" íródik ki, a toll nyomában aranyló szikrákkal
  await card.writeMessage((pos) => sparks.emit({
    position: pos, count: 1, speed: 0.25, gravity: -0.4, size: 0.05, life: 0.7, colors: ['#ffd36b', '#ffffff', '#ff8fbf'],
  }));
  if (state === 'cardOpen') setButtons([{ label: 'Tovább a tortához 🎂', onClick: goToCake }]);
}

// Nyitott képeslapon egy oldalra koppintva ránagyítunk (főleg telefonon hasznos)
let cardZoom = 0;
function toggleCardZoom(side) {
  cardZoom = cardZoom || !side ? 0 : side;
  const f = FRAMES.cardOpen;
  frameTo(cardZoom
    ? { center: f.center.clone().add(new THREE.Vector3((cardZoom * CARD_W) / 2, 0, 0)), w: CARD_W + 0.15, h: CARD_H + 0.2, dir: f.dir }
    : f, 0.9);
}

async function goToCake() {
  if (state !== 'cardOpen') return;
  state = 'busy';
  hoverTargets = [];
  setButtons([]);
  setHint('');
  if (cardZoom) toggleCardZoom(0);
  await card.flyAway();

  const rise = cake.rise();
  frameTo(FRAMES.cake, 2.2);
  await wait(1.6);
  sparks.emit({ position: new THREE.Vector3(0, 1.2, 0), count: 160, speed: 4, up: 0.4, gravity: -2, size: 0.2 });
  await rise;

  state = 'cake';
  hoverTargets = cake.hitTargets;
  setHint('Kívánj valamit, aztán fújd el a gyertyákat! 🕯️  (koppints rájuk)');
  setButtons([{ label: '🎤 Elfújom a mikrofonnal', onClick: startMicBlow, secondary: true }]);
}

async function startMicBlow(btn) {
  btn.disabled = true;
  try {
    mic = await startMic();
    setHint('Most fújj bele a mikrofonba! 🌬️');
    setButtons([]);
  } catch {
    btn.disabled = false;
    setHint('Nem érem el a mikrofont… koppints a gyertyákra! 🕯️');
  }
}

function blowCandle(i) {
  if (cake.blow(i)) playWhoosh();
  if (cake.allOut) finale();
}

async function finale() {
  if (state === 'busy' || state === 'finale') return;
  state = 'busy';
  hoverTargets = [];
  mic?.stop();
  mic = null;
  cake.setWind(0);
  setButtons([]);
  setHint('');
  stopBackgroundMusic(1.2);

  await wait(0.8);
  document.body.classList.add('dim');
  await wait(1.6);
  document.body.classList.remove('dim');

  const top = cake.topCenter();
  confetti.burst(top, 420);
  confetti.rain = true;
  sparks.emit({ position: top, count: 260, speed: 6, up: 0.8, gravity: -3, size: 0.25, life: 2 });
  balloons.start();
  playMusic(config.musicStart).then((ok) => ok || playHappyBirthday());
  frameTo(FRAMES.finale, 2.6);
  gallery.show();
  fireworks = true;

  await wait(1.0);
  $('finale-title').textContent = config.finalTitle;
  $('finale-msg').textContent = config.finalMessage;
  $('finale').classList.add('show');

  await wait(1.5);
  state = 'finale';
  hoverTargets = [...gallery.hitTargets, ...cake.bodyTargets];
  setHint('Koppints a tortára – rejt valamit neked! 🍰');
}

// ── Tortaszelet üzenettel ──────────────────────────────────────
const SLICE_POS = new THREE.Vector3(0, 0.55, 2.4);

async function openSlice() {
  state = 'busy';
  hoverTargets = [];
  setHint('');
  setButtons([]);
  $('finale').classList.remove('show');
  gallery.collapse();
  const from = cake.topCenter();
  sparks.emit({ position: from, count: 120, speed: 3, up: 0.5, gravity: -2, size: 0.18 });
  playChime();
  frameTo(FRAMES.slice, 2.2);
  await slice.present(from, SLICE_POS);
  state = 'slice';
  setHint('Koppints bárhová a folytatáshoz 💕');
}

async function closeSlice() {
  state = 'busy';
  setHint('');
  frameTo(FRAMES.finale, 2.2);
  await slice.dismiss(cake.topCenter());
  $('finale').classList.add('show');
  await gallery.expand();
  state = 'finale';
  hoverTargets = [...gallery.hitTargets, ...cake.bodyTargets];
  setHint(config.photos.length ? 'Koppints egy képre, hogy közelebb hozd! 📸' : '');
  setButtons([{ label: '🌙 Nézz fel az égre', onClick: goToSky }]);
}

async function goToSky() {
  if (state !== 'finale') return;
  state = 'busy';
  hoverTargets = [];
  setButtons([]);
  setHint('');
  if (gallery.focused) await gallery.click(null);
  $('finale').classList.remove('show');
  confetti.rain = false;
  fireworks = false;

  const lights = [hemi, key, rim].map((l) => [l, l.intensity]);
  animate(3.5, (e) => lights.forEach(([l, i0]) => (l.intensity = i0 * (1 - e * 0.55))));
  frameTo(FRAMES.sky, 4);
  await sky.fadeIn(3.5);
  sky.startAmbient(FRAMES.sky.center);

  await wait(1.2);
  state = 'sky';
  $('wish').classList.remove('hidden');
}

async function sendWish() {
  if (state !== 'sky') return;
  state = 'busy';
  $('wish').classList.add('hidden');
  await wait(0.5);
  await sky.releaseWish(camera, FRAMES.sky.center);

  $('finale-title').textContent = config.wishTitle;
  $('finale-msg').textContent = config.wishMessage;
  $('finale').classList.add('show');
  state = 'end';
}

$('wish').addEventListener('submit', (ev) => {
  ev.preventDefault();
  sendWish();
});

// ── Interakció ─────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function pick(ev, targets) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObjects(targets, false)[0]?.object ?? null;
}

window.addEventListener('pointermove', (ev) => {
  pointer.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
  if (ev.pointerType !== 'mouse') return;
  const hit = hoverTargets.length ? pick(ev, hoverTargets) : null;
  canvas.style.cursor = hit ? 'pointer' : '';
  if (state === 'gift') gift.hovered = !!hit;
  if (state === 'card') card.hovered = !!hit;
});

canvas.addEventListener('click', (ev) => {
  if (state === 'gift' && pick(ev, gift.hitTargets)) openGift();
  else if (state === 'card' && pick(ev, card.hitTargets)) openCard();
  else if (state === 'cardOpen') {
    const hit = pick(ev, card.hitTargets);
    if (hit || cardZoom) toggleCardZoom(hit ? card.pageSide(hit) : 0);
  }
  else if (state === 'cake') {
    const hit = pick(ev, cake.hitTargets);
    if (!hit) return;
    let i = hit.userData.candleIndex;
    if (i === undefined) i = hit.position.x < 0 ? 0 : 1;
    blowCandle(i);
  } else if (state === 'finale') {
    const hit = pick(ev, gallery.hitTargets);
    if (hit || gallery.focused) gallery.click(hit);
    else if (pick(ev, cake.bodyTargets)) openSlice();
  } else if (state === 'slice') {
    closeSlice();
  }
});

// ── Méretezés és render-ciklus ─────────────────────────────────
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const px = h * renderer.getPixelRatio();
  sparks.setViewportHeight(px);
  bokeh.material.uniforms.uScale.value = px / 2;
  sky.setViewportHeight(px);
}
window.addEventListener('resize', resize);
resize();

let fireworks = false;
let fireworkTimer = 0;
let beatPulse = 0;

function launchFirework(strength) {
  sparks.emit({
    position: new THREE.Vector3(rand(-5, 5), rand(3, 5.5), rand(-6, -3)),
    count: Math.round(90 * strength), speed: 3 * Math.sqrt(strength), gravity: -1.2, size: 0.2, life: 1.6,
    colors: [PASTELS[Math.floor(Math.random() * PASTELS.length)], '#ffffff'],
  });
}

function onBeat(soft) {
  launchFirework(soft ? 0.6 : 1);
  if (soft) return;
  beatPulse = 1;
  const title = $('finale');
  title.classList.remove('beat');
  void title.offsetWidth;
  title.classList.add('beat');
}
const timer = new THREE.Timer();
// Fejlesztéshez: ?slow → lassú (szoftveres) renderelésnél se lassuljanak le az animációk
const MAX_DT = import.meta.env.DEV && new URLSearchParams(location.search).has('slow') ? 0.3 : 0.05;

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), MAX_DT);
  tick(dt);

  if (mic && state === 'cake') {
    const { wind, blown } = mic.update(dt);
    cake.setWind(wind);
    if (blown) {
      playWhoosh();
      cake.blowAll();
      finale();
    }
  }

  if (fireworks) {
    // A saját zene ütemére; ha nincs elemezhető zene, időzítve
    const b = musicBeat(dt);
    if (b) {
      if (b.beat) onBeat(b.soft);
    } else if ((fireworkTimer -= dt) <= 0) {
      fireworkTimer = rand(0.7, 1.6);
      launchFirework(1);
    }
  }
  beatPulse = Math.max(0, beatPulse - dt * 3.5);
  beatLight.intensity = beatPulse * 1.6;
  if (cake) cake.root.scale.setScalar(1 + beatPulse * 0.025);

  gift?.update(dt);
  card?.update(dt);
  cake?.update(dt);
  gallery?.update(dt);
  slice?.update(dt);
  sparks.update(dt);
  bokeh.update(dt);
  hearts.update(dt);
  confetti.update(dt);
  balloons.update(dt);
  smoke.update(dt);
  sky.update(dt);

  updateCamera(dt);
  renderer.render(scene, camera);
});

init();
