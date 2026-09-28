import * as THREE from 'three';
import { animate, Ease, lerp } from './anim.js';
import { giftPatternTexture } from './textures.js';

const S = 1.6; // doboz élhossza
const T = 0.05; // falvastagság
const RIBBON_W = 0.28;

export function createGift(glowTex) {
  const root = new THREE.Group();
  const body = new THREE.Group(); // ezt rázzuk / nyomjuk össze
  root.add(body);

  const boxMat = new THREE.MeshPhysicalMaterial({
    map: giftPatternTexture(),
    roughness: 0.55,
    sheen: 0.6,
    sheenColor: new THREE.Color('#ffffff'),
    clearcoat: 0.25,
  });
  const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: '#ff4f93',
    roughness: 0.3,
    metalness: 0.05,
    sheen: 1,
    sheenColor: new THREE.Color('#ffd1e3'),
    sheenRoughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
  });

  // Alj
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(S, T, S), boxMat);
  bottom.position.y = -S / 2 + T / 2;
  body.add(bottom);

  // Falak – mindegyik az alsó élén csuklózva, hogy "szétnyílhasson"
  const hinges = [];
  const wallGeo = new THREE.BoxGeometry(S, S, T);
  const bandGeo = new THREE.BoxGeometry(RIBBON_W, S + 0.01, T + 0.02);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const side = new THREE.Group();
    side.rotation.y = a;
    side.position.set(Math.sin(a) * (S / 2), -S / 2, Math.cos(a) * (S / 2));
    const hinge = new THREE.Group();
    side.add(hinge);
    const wall = new THREE.Mesh(wallGeo, boxMat);
    wall.position.set(0, S / 2, -T / 2);
    const band = new THREE.Mesh(bandGeo, ribbonMat);
    band.position.copy(wall.position);
    hinge.add(wall, band);
    body.add(side);
    hinges.push(hinge);
  }

  // Tető masnival
  const lid = new THREE.Group();
  lid.position.y = S / 2;
  const lidBox = new THREE.Mesh(new THREE.BoxGeometry(S + 0.1, 0.32, S + 0.1), boxMat);
  lidBox.position.y = 0.1;
  const lidBandA = new THREE.Mesh(new THREE.BoxGeometry(RIBBON_W, 0.34, S + 0.12), ribbonMat);
  const lidBandB = new THREE.Mesh(new THREE.BoxGeometry(S + 0.12, 0.34, RIBBON_W), ribbonMat);
  lidBandA.position.y = lidBandB.position.y = 0.1;
  lid.add(lidBox, lidBandA, lidBandB, createBow(ribbonMat));
  body.add(lid);

  // Lágy árnyék alatta
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 3),
    new THREE.MeshBasicMaterial({ map: glowTex, color: '#a0406e', transparent: true, opacity: 0.35, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.7;

  const group = new THREE.Group();
  group.add(root, shadow);

  const hitTargets = [];
  root.traverse((o) => o.isMesh && hitTargets.push(o));

  let floating = true;
  let hover = 0;
  let time = 0;

  return {
    group,
    hitTargets,
    set hovered(v) {
      hover = v ? 1 : 0;
    },

    update(dt) {
      time += dt;
      if (floating) {
        root.position.y = Math.sin(time * 1.3) * 0.15;
        root.rotation.y += dt * 0.55;
        root.rotation.x = Math.sin(time * 0.7) * 0.1;
        root.rotation.z = Math.cos(time * 0.9) * 0.06;
        const target = 1 + hover * 0.07;
        root.scale.setScalar(lerp(root.scale.x, target, 1 - Math.exp(-dt * 8)));
      }
      const s = 1 - root.position.y * 0.25;
      shadow.scale.setScalar(s);
      shadow.material.opacity = 0.35 * s * (group.userData.fade ?? 1);
    },

    /** Megrázzuk, lerepül a teteje, szétnyílnak a falak. `onPop` a tető lerepülésekor fut. */
    async open(onPop) {
      floating = false;
      const startY = root.rotation.y;
      const targetY = Math.round((startY - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4;
      const startX = root.rotation.x;
      const startZ = root.rotation.z;
      const startScale = root.scale.x;

      await animate(1.0, (e, t) => {
        root.rotation.y = lerp(startY, targetY, e);
        root.rotation.x = lerp(startX, 0, e);
        root.rotation.z = lerp(startZ, 0, e);
        root.scale.setScalar(lerp(startScale, 1, e));
        body.rotation.z = Math.sin(t * 42) * 0.09 * t;
        body.rotation.x = Math.sin(t * 31) * 0.05 * t;
      });
      body.rotation.set(0, 0, 0);

      await animate(0.18, (e) => body.scale.set(1 + 0.1 * e, 1 - 0.14 * e, 1 + 0.1 * e), Ease.outCubic);
      animate(0.5, (e) => body.scale.set(1.1 - 0.1 * e, 0.86 + 0.14 * e, 1.1 - 0.1 * e), Ease.outBack);

      onPop?.();
      const lidY = lid.position.y;
      animate(1.3, (e) => {
        lid.position.y = lidY + e * 6;
        lid.position.x = e * 2.2;
        lid.position.z = -e * 1.5;
        lid.rotation.x = -e * 2.2;
        lid.rotation.z = -e * 1.4;
      }, Ease.outCubic).then(() => (lid.visible = false));

      await animate(1.0, (e) => hinges.forEach((h) => (h.rotation.x = (Math.PI / 2) * e)), Ease.outBounce, 0.25);
    },

    async vanish() {
      const y0 = root.position.y;
      await animate(1.0, (e) => {
        root.position.y = y0 - e * 1.2;
        root.scale.setScalar(1 - e);
        group.userData.fade = 1 - e;
      }, Ease.inCubic);
      group.visible = false;
    },
  };
}

function createBow(mat) {
  const bow = new THREE.Group();
  bow.position.y = 0.3;
  const loopGeo = new THREE.TorusGeometry(0.26, 0.075, 16, 48);
  for (let i = 0; i < 4; i++) {
    const holder = new THREE.Group();
    holder.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;
    const loop = new THREE.Mesh(loopGeo, mat);
    loop.scale.set(1, 0.62, 0.9);
    loop.position.set(0.26, 0.14, 0);
    loop.rotation.z = 0.5;
    holder.add(loop);
    bow.add(holder);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), mat);
  knot.scale.set(1, 0.8, 1);
  knot.position.y = 0.06;
  bow.add(knot);
  return bow;
}
