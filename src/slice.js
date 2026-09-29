import * as THREE from 'three';
import { animate, Ease, lerp } from './anim.js';
import { heartShape, makeCanvas, noteTexture, toTexture } from './textures.js';

const R = 0.85; // a szelet hossza (sugár)
const H = 0.72; // magasság
const ANGLE = Math.PI / 5;

export const NOTE_W = 1.6;

/** Tortaszelet tányéron + fölötte kinyíló üzenetkártya */
export function createSlice(cfg) {
  const root = new THREE.Group();
  root.visible = false;

  // ── Tányér ──────────────────────────────────────────────────
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.62, 0.05, 64),
    new THREE.MeshPhysicalMaterial({ color: '#fffafc', roughness: 0.2, clearcoat: 1 }),
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.018, 10, 80),
    new THREE.MeshStandardMaterial({ color: '#e8c07a', metalness: 1, roughness: 0.25 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.025;
  root.add(plate, rim);

  // ── A szelet (forog a tányéron) ─────────────────────────────
  const spinner = new THREE.Group();
  spinner.position.y = 0.03;
  root.add(spinner);

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.absarc(0, 0, R, -ANGLE / 2, ANGLE / 2, false);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2); // az extrudálás iránya (z) → függőleges (y)
  geo.translate(-R * 0.6, 0, 0);

  const layers = layerTexture();
  layers.repeat.set(1, 1 / H);
  layers.offset.set(0, -(1 - H) / H);
  const sideMat = new THREE.MeshStandardMaterial({ map: layers, roughness: 0.8 });
  const icingMat = new THREE.MeshPhysicalMaterial({ color: '#ff8fb8', roughness: 0.35, clearcoat: 0.6 });
  const wedge = new THREE.Mesh(geo, [icingMat, sideMat]);
  spinner.add(wedge);

  // Díszek a tetején: habrózsa + szív
  const tipX = R - R * 0.6 - 0.14;
  const rosette = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.07, 0.035, 64, 8, 2, 5),
    new THREE.MeshPhysicalMaterial({ color: '#fffaf7', roughness: 0.35, clearcoat: 0.5 }),
  );
  rosette.rotation.x = Math.PI / 2;
  rosette.position.set(tipX, H + 0.05, 0);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape(0.2), {
    depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3,
  });
  heartGeo.center();
  const heart = new THREE.Mesh(heartGeo, new THREE.MeshPhysicalMaterial({ color: '#e0305f', roughness: 0.2, clearcoat: 1 }));
  heart.position.set(tipX, H + 0.2, 0);
  heart.rotation.y = Math.PI / 2;
  spinner.add(rosette, heart);

  // ── Üzenetkártya ────────────────────────────────────────────
  const noteTex = noteTexture(cfg.slice);
  const aspect = noteTex.image.height / noteTex.image.width;
  const noteH = NOTE_W * aspect;
  const notePivot = new THREE.Group(); // az alsó élén "nyílik ki"
  notePivot.position.set(0, 1.2, 0.2);
  const note = new THREE.Mesh(
    new THREE.PlaneGeometry(NOTE_W, noteH),
    new THREE.MeshStandardMaterial({
      map: noteTex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, roughness: 0.85,
      emissive: '#ffffff', emissiveMap: noteTex, emissiveIntensity: 0.3,
    }),
  );
  note.position.y = noteH / 2;
  notePivot.add(note);
  notePivot.scale.setScalar(0.001);
  root.add(notePivot);

  let time = 0;
  let spinning = false;

  return {
    root,
    height: 1.2 + noteH,

    update(dt) {
      time += dt;
      if (!root.visible) return;
      if (spinning) spinner.rotation.y += dt * 0.6;
      notePivot.rotation.z = Math.sin(time * 0.9) * 0.02;
    },

    /** A tortából kiemelkedik és a néző elé úszik */
    async present(from, to) {
      root.visible = true;
      spinning = true;
      root.position.copy(from);
      root.scale.setScalar(0.15);
      spinner.rotation.y = -Math.PI;
      await animate(1.8, (e) => {
        root.position.lerpVectors(from, to, e);
        root.position.y += Math.sin(e * Math.PI) * 0.6;
        root.scale.setScalar(lerp(0.15, 1, e));
      }, Ease.inOutCubic);
      notePivot.rotation.x = -Math.PI / 2;
      await animate(1.1, (e) => {
        notePivot.scale.setScalar(Math.max(0.001, e));
        notePivot.rotation.x = lerp(-Math.PI / 2, 0, e);
      }, Ease.outBack);
    },

    /** Vissza a tortába */
    async dismiss(to) {
      await animate(0.6, (e) => {
        notePivot.scale.setScalar(Math.max(0.001, 1 - e));
        notePivot.rotation.x = lerp(0, -Math.PI / 2, e);
      }, Ease.inCubic);
      const from = root.position.clone();
      await animate(1.2, (e) => {
        root.position.lerpVectors(from, to, e);
        root.scale.setScalar(lerp(1, 0.1, e));
      }, Ease.inOutCubic);
      root.visible = false;
      spinning = false;
    },
  };
}

// Rétegek oldalnézetből – a vászon teteje a szelet alja
function layerTexture() {
  const [c, ctx] = makeCanvas(64, 512);
  const layers = [
    ['#f7d9b0', 0.2], ['#fffaf5', 0.06], ['#e0406f', 0.03],
    ['#ffb8cf', 0.2], ['#fffaf5', 0.06], ['#e0406f', 0.03],
    ['#f7d9b0', 0.34], ['#ff8fb8', 0.08],
  ];
  let y = 0;
  for (const [color, frac] of layers) {
    ctx.fillStyle = color;
    ctx.fillRect(0, y, 64, frac * 512 + 1);
    y += frac * 512;
  }
  // piskóta-lyukacsok
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = 'rgba(160,110,70,0.12)';
    ctx.beginPath();
    ctx.arc(Math.random() * 64, Math.random() * 512, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = toTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}
