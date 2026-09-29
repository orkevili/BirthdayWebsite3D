import * as THREE from 'three';
import { animate, Ease, clamp, lerp, pick, rand } from './anim.js';
import { flameTexture, heartShape } from './textures.js';

const PLATE_R = 1.8;
const BOTTOM = { r: 1.35, h: 0.85 };
const TOP = { r: 0.95, h: 0.65 };
const TOP_Y = BOTTOM.h + TOP.h; // a felső szint teteje

const SPRINKLE_COLORS = ['#ff5c9a', '#ffffff', '#c7a3ff', '#ffd36b', '#7fd8ff', '#ff9ec7'];

export function createCake(glowTex, smoke) {
  const root = new THREE.Group();
  const cake = new THREE.Group();
  root.add(cake);

  const standMat = new THREE.MeshPhysicalMaterial({ color: '#fffafc', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#e8c07a', metalness: 1, roughness: 0.25 });
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: '#fff6fb', roughness: 0.15, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, sheen: 0.5,
  });

  // ── Tortaállvány ────────────────────────────────────────────
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(PLATE_R, PLATE_R - 0.1, 0.1, 96), standMat);
  plate.position.y = -0.05;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(PLATE_R, 0.03, 12, 128), goldMat);
  rim.rotation.x = Math.PI / 2;
  const stem = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.9, -1.3), new THREE.Vector2(0.92, -1.24), new THREE.Vector2(0.3, -1.12),
      new THREE.Vector2(0.14, -0.8), new THREE.Vector2(0.12, -0.45), new THREE.Vector2(0.2, -0.2),
      new THREE.Vector2(0.55, -0.1), new THREE.Vector2(0, -0.1),
    ], 64),
    standMat,
  );
  const baseRim = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.025, 12, 96), goldMat);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = -1.25;
  root.add(plate, rim, stem, baseRim);

  // ── Szintek ─────────────────────────────────────────────────
  const pinkMat = new THREE.MeshPhysicalMaterial({ color: '#ffb0cb', roughness: 0.65, sheen: 1, sheenColor: new THREE.Color('#ffe0ec') });
  const creamMat = new THREE.MeshPhysicalMaterial({ color: '#fff3ef', roughness: 0.6, sheen: 1, sheenColor: new THREE.Color('#ffffff') });
  const creamIcing = new THREE.MeshPhysicalMaterial({ color: '#fffaf7', roughness: 0.3, clearcoat: 0.6 });
  const pinkIcing = new THREE.MeshPhysicalMaterial({ color: '#ff7fb0', roughness: 0.3, clearcoat: 0.6 });

  addTier(cake, BOTTOM.r, 0, BOTTOM.h, pinkMat, creamIcing, pearlMat);
  addTier(cake, TOP.r, BOTTOM.h, TOP.h, creamMat, pinkIcing, pearlMat);

  addSprinkles(cake, 0.1, TOP.r - 0.1, TOP_Y + 0.03, 160);
  addSprinkles(cake, TOP.r + 0.12, BOTTOM.r - 0.12, BOTTOM.h + 0.03, 150);

  // Szívecskék az alsó szint oldalán
  const heartGeo = new THREE.ExtrudeGeometry(heartShape(0.22), {
    depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3,
  });
  heartGeo.center();
  const heartMat = new THREE.MeshPhysicalMaterial({ color: '#e0407a', roughness: 0.25, clearcoat: 1 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const h = new THREE.Mesh(heartGeo, heartMat);
    h.position.set(Math.sin(a) * (BOTTOM.r + 0.02), BOTTOM.h * 0.42, Math.cos(a) * (BOTTOM.r + 0.02));
    h.rotation.y = a;
    cake.add(h);
  }

  // ── "22" gyertyák lánggal ───────────────────────────────────
  const flameTex = flameTexture();
  const candles = [];
  [-0.25, 0.25].forEach((x, i) => {
    const candle = createNumberTwo();
    candle.mesh.position.set(x, TOP_Y - 0.02, 0.05);
    candle.mesh.rotation.y = -x * 0.3;
    cake.add(candle.mesh);

    candle.mesh.updateMatrix();
    const wickTip = candle.wickTop.clone().applyMatrix4(candle.mesh.matrix);

    const flameRoot = new THREE.Group();
    flameRoot.position.copy(wickTip);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flame.center.set(0.5, 0.06);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: '#ffb35c', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.position.y = 0.1;
    glow.scale.setScalar(0.9);
    const light = new THREE.PointLight('#ffae5c', 1.2, 4, 2);
    light.position.y = 0.15;
    flameRoot.add(glow, flame, light);
    cake.add(flameRoot);

    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(wickTip).add(new THREE.Vector3(0, -0.15, 0));
    hit.userData.candleIndex = i;
    cake.add(hit);

    candles.push({ flameRoot, flame, glow, light, hit, candleMesh: candle.mesh, lit: true, level: 1, phase: Math.random() * 10 });
  });

  root.visible = false;
  const bodyTargets = [];
  root.traverse((o) => o.isMesh && bodyTargets.push(o));

  let time = 0;
  let wind = 0;

  return {
    root,
    hitTargets: candles.flatMap((c) => [c.hit, c.candleMesh]),
    bodyTargets,
    get allOut() {
      return candles.every((c) => !c.lit);
    },
    setWind(v) {
      wind = clamp(v);
    },

    update(dt) {
      time += dt;
      for (const c of candles) {
        const n = Math.sin(time * 13 + c.phase) * 0.5 + Math.sin(time * 23.7 + c.phase * 2) * 0.3 + Math.sin(time * 7.3) * 0.2;
        const w = c.lit ? wind : 0;
        const s = c.level * (1 - w * 0.45);
        c.flame.scale.set(0.13 * s * (1 + n * 0.05), 0.3 * s * (1 + n * 0.12), 1);
        c.flameRoot.rotation.z = -w * 0.9 + Math.sin(time * 3 + c.phase) * 0.04;
        c.glow.material.opacity = 0.55 * c.level * (0.9 + n * 0.1);
        c.light.intensity = 1.2 * c.level * (0.85 + n * 0.15);
      }
    },

    async rise() {
      root.visible = true;
      await animate(2.2, (e) => {
        root.position.y = lerp(-7, 0, e);
        root.rotation.y = lerp(-Math.PI * 1.5, 0, e);
      }, Ease.outBack);
    },

    /** Egy gyertya elfújása; true, ha most aludt ki */
    blow(i) {
      const c = candles[i];
      if (!c.lit) return false;
      c.lit = false;
      const lean = c.flameRoot.rotation.z;
      animate(0.4, (e) => {
        c.level = 1 - e;
        c.flameRoot.rotation.z = lerp(lean, -1.1, e);
      }, Ease.outCubic).then(() => {
        c.flameRoot.visible = false;
        const p = c.flameRoot.position.clone();
        cake.localToWorld(p);
        smoke.emit(p, 2.5);
      });
      return true;
    },

    blowAll() {
      candles.forEach((_, i) => this.blow(i));
    },

    /** A felső szint közepe világkoordinátában (konfetti-kilövéshez) */
    topCenter() {
      return cake.localToWorld(new THREE.Vector3(0, TOP_Y + 0.5, 0));
    },
  };
}

function addTier(parent, r, y, h, bodyMat, icingMat, pearlMat) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 96), bodyMat);
  body.position.y = y + h / 2;
  parent.add(body);

  // Máz a tetején + lecsorgások
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.05, 96), icingMat);
  cap.position.y = y + h + 0.005;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.045, 12, 128), icingMat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = y + h - 0.01;
  parent.add(cap, lip);

  const dripCount = Math.round(r * 30);
  const drips = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.045, 1, 4, 10), icingMat, dripCount);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < dripCount; i++) {
    const a = (i / dripCount) * Math.PI * 2 + rand(-0.04, 0.04);
    const len = rand(0.06, h * 0.45);
    m.compose(
      new THREE.Vector3(Math.sin(a) * (r + 0.005), y + h - len / 2, Math.cos(a) * (r + 0.005)),
      q,
      new THREE.Vector3(1, len, 1),
    );
    drips.setMatrixAt(i, m);
  }
  parent.add(drips);

  // Gyöngysor az alján
  const pearlCount = Math.round(r * 44);
  const pearls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 14, 10), pearlMat, pearlCount);
  for (let i = 0; i < pearlCount; i++) {
    const a = (i / pearlCount) * Math.PI * 2;
    m.compose(new THREE.Vector3(Math.sin(a) * (r + 0.02), y + 0.05, Math.cos(a) * (r + 0.02)), q, new THREE.Vector3(1, 1, 1));
    pearls.setMatrixAt(i, m);
  }
  parent.add(pearls);
}

function addSprinkles(parent, rMin, rMax, y, count) {
  const mesh = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.012, 0.045, 3, 6),
    new THREE.MeshStandardMaterial({ roughness: 0.4 }),
    count,
  );
  const m = new THREE.Matrix4();
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(rand(rMin * rMin, rMax * rMax));
    q.setFromEuler(e.set(Math.PI / 2, 0, Math.random() * Math.PI));
    m.compose(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r), q, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, color.set(pick(SPRINKLE_COLORS)));
  }
  parent.add(mesh);
}

/** Kihúzott "2"-es számgyertya; visszaadja a mesh-t és a kanóc helyét */
function createNumberTwo() {
  const s = 0.6; // magasság
  const C = [0.35 * s, 0.68 * s];
  const R = 0.32 * s;
  const r = 0.12 * s;
  const d2r = Math.PI / 180;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.72 * s, 0);
  shape.lineTo(0.72 * s, 0.2 * s);
  shape.lineTo(0.34 * s, 0.2 * s);
  shape.lineTo(C[0] + R * Math.cos(-30 * d2r), C[1] + R * Math.sin(-30 * d2r));
  shape.absarc(C[0], C[1], R, -30 * d2r, 165 * d2r, false);
  shape.lineTo(C[0] + r * Math.cos(165 * d2r), C[1] + r * Math.sin(165 * d2r));
  shape.absarc(C[0], C[1], r, 165 * d2r, -35 * d2r, true);
  shape.lineTo(0, 0.2 * s);
  shape.closePath();

  const depth = 0.1;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments: 32, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 4,
  });
  geo.computeBoundingBox();
  const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2;
  geo.translate(-cx, 0.018, -depth / 2);

  const face = new THREE.MeshPhysicalMaterial({
    color: '#ff86b9', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ffe4f0'),
  });
  const side = new THREE.MeshStandardMaterial({ color: '#f1c67a', metalness: 0.9, roughness: 0.3 });
  const mesh = new THREE.Mesh(geo, [face, side]);

  const topY = C[1] + R + 0.018 * 2;
  const wick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.01, 0.07, 8),
    new THREE.MeshStandardMaterial({ color: '#2b2023', roughness: 0.9 }),
  );
  wick.position.set(C[0] - cx, topY + 0.03, 0);
  mesh.add(wick);

  return { mesh, wickTop: new THREE.Vector3(C[0] - cx, topY + 0.065, 0) };
}
