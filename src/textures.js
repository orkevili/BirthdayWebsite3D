import * as THREE from 'three';

// Canvasra rajzolt textúrák: képeslap oldalai, polaroidok, láng, csillogás, minták.

export const palette = {
  rose: '#d63a7a',
  deepRose: '#a8235a',
  blush: '#ffd9e8',
  cream: '#fff8f5',
  gold: '#d9a441',
  lavender: '#b99ae6',
  ink: '#6b3a55',
};

const SCRIPT = '"Dancing Script", cursive';
const SANS = 'Quicksand, sans-serif';

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

export function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ── Formák ────────────────────────────────────────────────────

export function heartXY(t) {
  const x = 16 * Math.sin(t) ** 3;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [x, y + 2.5];
}

/** Szív alakzat 3D-hez; `size` ≈ szélesség */
export function heartShape(size = 1, segments = 80) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const [x, y] = heartXY((i / segments) * Math.PI * 2);
    pts.push(new THREE.Vector2((x * size) / 32, (y * size) / 32));
  }
  return new THREE.Shape(pts);
}

export function heartPath(ctx, cx, cy, size) {
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const [x, y] = heartXY((i / 60) * Math.PI * 2);
    const px = cx + (x * size) / 32;
    const py = cy - (y * size) / 32;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function fillHeart(ctx, cx, cy, size, color) {
  heartPath(ctx, cx, cy, size);
  ctx.fillStyle = color;
  ctx.fill();
}

function sparkle(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.28;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Kép "cover" illesztése egy téglalapba
function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function drawPlaceholder(ctx, x, y, w, h, label) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#ffd1e4');
  g.addColorStop(1, '#dcc8f7');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  fillHeart(ctx, x + w / 2, y + h * 0.44, Math.min(w, h) * 0.3, 'rgba(255,255,255,0.85)');
  ctx.fillStyle = 'rgba(107,58,85,0.7)';
  ctx.font = `600 ${Math.round(h * 0.06)}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label || 'ide jön egy kép', x + w / 2, y + h * 0.78);
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
    lines.push(null); // bekezdés-elválasztó
  }
  lines.pop();
  return lines;
}

// ── Háttér, csillogás, láng ───────────────────────────────────

export function backgroundTexture() {
  const [c, ctx] = makeCanvas(1024, 1024);
  const g = ctx.createRadialGradient(512, 600, 0, 512, 600, 760);
  g.addColorStop(0, '#ffe4f0');
  g.addColorStop(0.4, '#f8b9d4');
  g.addColorStop(0.75, '#c99ce0');
  g.addColorStop(1, '#8a70c4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  return toTexture(c);
}

export function glowTexture() {
  const [c, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

export function flameTexture() {
  const [c, ctx] = makeCanvas(128, 256);
  ctx.filter = 'blur(3px)';
  ctx.beginPath();
  ctx.moveTo(64, 12);
  ctx.bezierCurveTo(78, 70, 108, 130, 104, 180);
  ctx.bezierCurveTo(100, 226, 80, 244, 64, 244);
  ctx.bezierCurveTo(48, 244, 28, 226, 24, 180);
  ctx.bezierCurveTo(20, 130, 50, 70, 64, 12);
  const g = ctx.createRadialGradient(64, 196, 4, 64, 170, 170);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,250,210,1)');
  g.addColorStop(0.45, 'rgba(255,200,90,1)');
  g.addColorStop(0.75, 'rgba(255,120,40,0.85)');
  g.addColorStop(1, 'rgba(255,70,20,0)');
  ctx.fillStyle = g;
  ctx.fill();
  // kékes tő
  const b = ctx.createRadialGradient(64, 232, 0, 64, 232, 26);
  b.addColorStop(0, 'rgba(90,130,255,0.7)');
  b.addColorStop(1, 'rgba(90,130,255,0)');
  ctx.fillStyle = b;
  ctx.fillRect(30, 200, 68, 56);
  return toTexture(c);
}

export function giftPatternTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#ffb3cf';
  ctx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = col * 128 + (row % 2 ? 64 : 0);
      const y = row * 128;
      if ((row + col) % 2) {
        fillHeart(ctx, x, y, 44, 'rgba(255,255,255,0.9)');
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,240,248,0.95)';
        ctx.fill();
      }
    }
  }
  const tex = toTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  return tex;
}

// ── Képeslap ──────────────────────────────────────────────────

export const CARD_PX = [1024, 1408];

function paperBackground(ctx, w, h) {
  ctx.fillStyle = palette.cream;
  ctx.fillRect(0, 0, w, h);
  // finom papír-szemcse
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(200,150,170,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  ctx.strokeStyle = 'rgba(214,58,122,0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, 36, 36, w - 72, h - 72, 28);
  ctx.stroke();
}

export function cardCoverTexture(cfg) {
  const [w, h] = CARD_PX;
  const [c, ctx] = makeCanvas(w, h);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffc2da');
  g.addColorStop(1, '#ffe6f0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < h + 64; y += 64) {
    for (let x = 0; x < w + 64; x += 64) {
      ctx.beginPath();
      ctx.arc(x + ((y / 64) % 2 ? 32 : 0), y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
    }
  }

  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 7;
  roundRect(ctx, 40, 40, w - 80, h - 80, 36);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  roundRect(ctx, 60, 60, w - 120, h - 120, 26);
  ctx.stroke();

  // "22" medál
  ctx.save();
  ctx.shadowColor = 'rgba(168,35,90,0.3)';
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(w / 2, 250, 120, 0, Math.PI * 2);
  ctx.fillStyle = '#fffaf6';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = palette.gold;
  ctx.font = `700 130px ${SCRIPT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(cfg.age), w / 2, 258);

  // Fő panel
  ctx.save();
  ctx.shadowColor = 'rgba(168,35,90,0.25)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, 110, 430, w - 220, 600, 40);
  ctx.fillStyle = 'rgba(255,250,247,0.94)';
  ctx.fill();
  ctx.restore();

  const tg = ctx.createLinearGradient(0, 480, 0, 820);
  tg.addColorStop(0, '#e2488a');
  tg.addColorStop(1, '#a8235a');
  ctx.fillStyle = tg;
  ctx.font = `700 150px ${SCRIPT}`;
  ctx.fillText(cfg.coverTitle[0], w / 2, 570);
  ctx.font = `700 132px ${SCRIPT}`;
  ctx.fillText(cfg.coverTitle[1], w / 2, 730);

  // díszvonal szívvel
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(250, 840);
  ctx.lineTo(470, 840);
  ctx.moveTo(554, 840);
  ctx.lineTo(774, 840);
  ctx.stroke();
  fillHeart(ctx, w / 2, 840, 52, palette.rose);

  ctx.fillStyle = palette.ink;
  ctx.font = `600 64px ${SANS}`;
  ctx.fillText(cfg.name, w / 2, 940);

  // szórt díszek
  const deco = [
    [150, 170, 50], [880, 160, 38], [170, 1150, 44], [860, 1180, 58],
    [300, 1270, 30], [720, 1290, 34], [120, 1300, 26], [900, 320, 30],
  ];
  deco.forEach(([x, y, s], i) => fillHeart(ctx, x, y, s, i % 2 ? 'rgba(214,58,122,0.75)' : 'rgba(185,154,230,0.85)'));
  [[310, 150, 22], [720, 120, 18], [520, 1150, 26], [920, 1030, 20], [100, 700, 18], [930, 620, 22]].forEach(
    ([x, y, r]) => sparkle(ctx, x, y, r, palette.gold),
  );

  ctx.fillStyle = palette.deepRose;
  ctx.font = `600 44px ${SANS}`;
  ctx.fillText('nyisd ki', w / 2 - 20, 1200);
  fillHeart(ctx, w / 2 + 88, 1200, 34, palette.rose);

  return toTexture(c);
}

function drawPolaroidOn(ctx, img, cx, cy, pw, ph, rot, caption, tapeColor) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.shadowColor = 'rgba(80,30,60,0.28)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
  ctx.shadowColor = 'transparent';

  const m = pw * 0.06;
  const size = pw - m * 2;
  if (img) drawCover(ctx, img, -pw / 2 + m, -ph / 2 + m, size, size);
  else drawPlaceholder(ctx, -pw / 2 + m, -ph / 2 + m, size, size);

  if (caption) {
    ctx.fillStyle = palette.ink;
    ctx.font = `700 ${Math.round(pw * 0.1)}px ${SCRIPT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(caption, 0, -ph / 2 + m + size + (ph - size - m) / 2);
  }

  if (tapeColor) {
    ctx.rotate(-0.08);
    ctx.fillStyle = tapeColor;
    ctx.fillRect(-pw * 0.2, -ph / 2 - 26, pw * 0.4, 56);
  }
  ctx.restore();
}

export function cardPhotosTexture(cfg, images) {
  const [w, h] = CARD_PX;
  const [c, ctx] = makeCanvas(w, h);
  paperBackground(ctx, w, h);

  ctx.fillStyle = palette.rose;
  ctx.font = `700 96px ${SCRIPT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cfg.photosTitle, w / 2, 130);

  const items = cfg.photos.slice(0, 3).map((p, i) => ({ img: images[i], caption: p.caption }));
  if (items.length === 0) items.push({ img: null, caption: '' });

  const tapes = ['rgba(255,150,190,0.6)', 'rgba(190,160,240,0.6)', 'rgba(255,200,140,0.6)'];
  const layouts = {
    1: [[512, 760, -0.05, 700]],
    2: [[380, 540, -0.08, 500], [650, 1040, 0.07, 500]],
    3: [[340, 460, -0.1, 420], [690, 790, 0.08, 420], [360, 1120, -0.05, 420]],
  };
  layouts[items.length].forEach(([x, y, r, pw], i) => {
    drawPolaroidOn(ctx, items[i].img, x, y, pw, pw * 1.18, r, items[i].caption, tapes[i]);
  });

  fillHeart(ctx, 880, 250, 40, 'rgba(214,58,122,0.7)');
  fillHeart(ctx, 130, 1300, 46, 'rgba(185,154,230,0.8)');
  sparkle(ctx, 900, 1260, 24, palette.gold);
  return toTexture(c);
}

/**
 * Az üzenet-oldal, amely "kézzel" íródik ki: draw(p) a 0..1 haladásnak megfelelően rajzol,
 * és visszaadja a "toll" aktuális helyét pixelben (vagy null-t).
 */
export function createMessageWriter(cfg) {
  const [w, h] = CARD_PX;

  // Statikus háttér egyszer megrajzolva
  const [bg, bctx] = makeCanvas(w, h);
  paperBackground(bctx, w, h);
  fillHeart(bctx, 150, h - 180, 60, 'rgba(214,58,122,0.8)');
  fillHeart(bctx, 215, h - 230, 36, 'rgba(185,154,230,0.85)');
  sparkle(bctx, 880, 120, 26, palette.gold);
  sparkle(bctx, 140, 110, 18, palette.gold);

  const [c, ctx] = makeCanvas(w, h);
  const texture = toTexture(c);

  const titleFont = `700 104px ${SCRIPT}`;
  const sigFont = `700 76px ${SCRIPT}`;
  ctx.font = titleFont;
  const titleW = ctx.measureText(cfg.cardTitle).width;

  const sigLines = cfg.signature.split('\n');
  const sigTop = h - 150 - (sigLines.length - 1) * 80;
  const maxBottom = sigTop - 110;
  ctx.font = sigFont;
  const sigW = Math.max(...sigLines.map((l) => ctx.measureText(l).width));

  // Betűméret automatikus csökkentése, ha hosszú az üzenet
  let size = 46;
  let lines;
  let lh;
  for (; size >= 26; size -= 2) {
    ctx.font = `500 ${size}px ${SANS}`;
    lines = wrapText(ctx, cfg.message, w - 220);
    lh = size * 1.55;
    const height = lines.reduce((s, l) => s + (l === null ? lh * 0.5 : lh), 0);
    if (300 + height < maxBottom) break;
  }
  const bodyFont = `500 ${size}px ${SANS}`;
  const body = [];
  let y = 320;
  for (const line of lines) {
    if (line === null) {
      y += lh * 0.5;
      continue;
    }
    body.push({ text: line, y });
    y += lh;
  }
  const totalChars = body.reduce((n, l) => n + l.text.length, 0);
  const part = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));

  function draw(p) {
    ctx.drawImage(bg, 0, 0);
    let pen = null;

    // Cím: balról jobbra "kiíródik"
    const pt = part(p, 0, 0.15);
    if (pt > 0) {
      const x0 = w / 2 - titleW / 2 - 10;
      const cw = (titleW + 20) * pt;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, 60, cw, 200);
      ctx.clip();
      ctx.font = titleFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = palette.rose;
      ctx.fillText(cfg.cardTitle, w / 2, 210);
      ctx.restore();
      if (pt < 1) pen = { x: x0 + cw, y: 180 };
    }

    // Szöveg: betűről betűre
    let n = Math.floor(part(p, 0.15, 0.85) * totalChars);
    ctx.font = bodyFont;
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.ink;
    for (const line of body) {
      if (n <= 0) break;
      const shown = line.text.slice(0, n);
      ctx.fillText(shown, 110, line.y);
      if (n < line.text.length) pen = { x: 110 + ctx.measureText(shown).width, y: line.y - size * 0.35 };
      n -= line.text.length;
    }

    // Aláírás
    const ps = part(p, 0.85, 1);
    if (ps > 0) {
      const x0 = w - 120 - sigW - 10;
      const cw = (sigW + 20) * ps;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, sigTop - 90, cw, sigLines.length * 80 + 60);
      ctx.clip();
      ctx.font = sigFont;
      ctx.textAlign = 'right';
      ctx.fillStyle = palette.deepRose;
      sigLines.forEach((l, i) => ctx.fillText(l, w - 120, sigTop + i * 80));
      ctx.restore();
      if (ps < 1) pen = { x: x0 + cw, y: sigTop - 20 };
    }

    texture.needsUpdate = true;
    return pen;
  }

  draw(0);
  return { texture, draw, size: [w, h], chars: totalChars };
}

export function cardBackTexture() {
  const [w, h] = CARD_PX;
  const [c, ctx] = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffe6f0');
  g.addColorStop(1, '#ffc2da');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  fillHeart(ctx, w / 2, h / 2 - 40, 120, 'rgba(214,58,122,0.8)');
  ctx.fillStyle = palette.ink;
  ctx.font = `600 40px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('készült nagy-nagy szeretettel', w / 2, h / 2 + 90);
  return toTexture(c);
}

// ── Tortaszelet üzenetkártya ──────────────────────────────────

export function noteTexture({ title, message }) {
  const w = 1024;
  const [, mctx] = makeCanvas(8, 8);
  // Betűméret és magasság a szöveg hosszához igazítva
  let size = 50;
  let lines;
  for (; size >= 30; size -= 2) {
    mctx.font = `500 ${size}px ${SANS}`;
    lines = wrapText(mctx, message, w - 200);
    if (lines.length <= 9) break;
  }
  const lh = size * 1.5;
  const textH = lines.reduce((s, l) => s + (l === null ? lh * 0.5 : lh), 0);
  const h = Math.round(260 + textH + 90);
  const [c, ctx] = makeCanvas(w, h);

  ctx.save();
  ctx.shadowColor = 'rgba(120,40,80,0.25)';
  ctx.shadowBlur = 24;
  roundRect(ctx, 16, 16, w - 32, h - 32, 48);
  ctx.fillStyle = palette.cream;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(214,58,122,0.5)';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  roundRect(ctx, 40, 40, w - 80, h - 80, 34);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette.rose;
  ctx.font = `700 92px ${SCRIPT}`;
  ctx.fillText(title, w / 2, 160);
  fillHeart(ctx, w / 2, 205, 36, palette.rose);

  ctx.fillStyle = palette.ink;
  ctx.font = `500 ${size}px ${SANS}`;
  let y = 280 + size * 0.4;
  for (const line of lines) {
    if (line === null) {
      y += lh * 0.5;
      continue;
    }
    ctx.fillText(line, w / 2, y);
    y += lh;
  }

  fillHeart(ctx, 110, 110, 50, 'rgba(185,154,230,0.85)');
  fillHeart(ctx, w - 110, h - 110, 56, 'rgba(214,58,122,0.75)');
  sparkle(ctx, w - 120, 100, 24, palette.gold);
  sparkle(ctx, 120, h - 110, 20, palette.gold);
  return toTexture(c);
}

// ── Galéria polaroidok ────────────────────────────────────────

export function polaroidTexture(img, caption) {
  const [c, ctx] = makeCanvas(512, 612);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 612);
  if (img) drawCover(ctx, img, 24, 24, 464, 464);
  else drawPlaceholder(ctx, 24, 24, 464, 464);
  ctx.fillStyle = palette.ink;
  ctx.font = `700 48px ${SCRIPT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(caption || '', 256, 550);
  return toTexture(c);
}

export function polaroidBackTexture() {
  const [c, ctx] = makeCanvas(256, 306);
  ctx.fillStyle = '#fff6fa';
  ctx.fillRect(0, 0, 256, 306);
  fillHeart(ctx, 128, 150, 70, 'rgba(214,58,122,0.55)');
  return toTexture(c);
}
