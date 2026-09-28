import * as THREE from 'three';
import { animate, Ease } from './anim.js';
import { polaroidBackTexture, polaroidTexture } from './textures.js';

const PW = 0.9;
const PH = PW * (612 / 512);

/** A finálé alatt a torta körül keringő polaroid képek; kattintásra előre jönnek. */
export function createGallery(cfg, images, camera) {
  const ring = new THREE.Group();
  ring.visible = false;
  const photos = cfg.photos.length ? cfg.photos : [{ caption: '' }];
  const count = photos.length;
  const radius = Math.max(2.8, (count * (PW + 0.35)) / (Math.PI * 2));
  const ringY = 1.1;

  const geo = new THREE.PlaneGeometry(PW, PH);
  const backMat = new THREE.MeshStandardMaterial({ map: polaroidBackTexture(), roughness: 0.8 });

  const items = photos.map((p, i) => {
    const tex = polaroidTexture(images[i], p.caption);
    const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.3,
    }));
    const back = new THREE.Mesh(geo, backMat);
    back.rotation.y = Math.PI;
    back.position.z = -0.002;
    const g = new THREE.Group();
    g.add(front, back);
    const a = (i / count) * Math.PI * 2;
    const home = {
      pos: new THREE.Vector3(Math.sin(a) * radius, ringY, Math.cos(a) * radius),
      rotY: a,
    };
    g.position.set(0, 0.8, 0);
    g.scale.setScalar(0.01);
    g.userData.item = { g, home, phase: Math.random() * 10, focused: false };
    ring.add(g);
    return g.userData.item;
  });

  let time = 0;
  let focused = null;
  let busy = false;
  const tmpQ = new THREE.Quaternion();

  return {
    ring,
    radius,
    hitTargets: items.map((it) => it.g.children[0]),
    get focused() {
      return focused;
    },

    async show() {
      ring.visible = true;
      await Promise.all(items.map((it, i) => animate(1.4, (e) => {
        it.g.position.lerpVectors(new THREE.Vector3(0, 0.8, 0), it.home.pos, e);
        it.g.rotation.y = it.home.rotY * e;
        it.g.scale.setScalar(Math.max(0.01, e));
      }, Ease.outBack, i * 0.12)));
    },

    update(dt) {
      time += dt;
      if (!focused) ring.rotation.y += dt * 0.12;
      for (const it of items) {
        if (it.focused || !ring.visible) continue;
        if (it.g.parent === ring && it.g.scale.x >= 0.999) {
          it.g.position.y = it.home.pos.y + Math.sin(time * 1.2 + it.phase) * 0.12;
          it.g.rotation.z = Math.sin(time * 0.9 + it.phase) * 0.06;
        }
      }
    },

    /** Kattintás kezelése: kép előrehozása / visszaküldése. true, ha elkapta. */
    async click(mesh) {
      if (busy) return true;
      if (focused) {
        busy = true;
        await this.unfocus();
        busy = false;
        return true;
      }
      const it = mesh?.parent?.userData.item;
      if (!it) return false;
      busy = true;
      await this.focus(it);
      busy = false;
      return true;
    },

    async focus(it) {
      focused = it;
      it.focused = true;
      const scene = ring.parent;
      scene.attach(it.g);
      const fromP = it.g.position.clone();
      const fromQ = it.g.quaternion.clone();
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const dist = Math.max((PH * 1.35) / (2 * t), (PW * 1.35) / (2 * t * camera.aspect));
      const toP = camera.position.clone().addScaledVector(dir, dist);
      const toQ = camera.quaternion.clone();
      await animate(0.9, (e) => {
        it.g.position.lerpVectors(fromP, toP, e);
        it.g.quaternion.slerpQuaternions(fromQ, toQ, e);
      }, Ease.inOutCubic);
    },

    async unfocus() {
      const it = focused;
      const fromP = it.g.position.clone();
      const fromQ = it.g.quaternion.clone();
      ring.updateMatrixWorld();
      const toP = ring.localToWorld(it.home.pos.clone());
      ring.getWorldQuaternion(tmpQ);
      const toQ = tmpQ.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.home.rotY, 0)));
      await animate(0.9, (e) => {
        it.g.position.lerpVectors(fromP, toP, e);
        it.g.quaternion.slerpQuaternions(fromQ, toQ, e);
      }, Ease.inOutCubic);
      ring.attach(it.g);
      it.g.position.copy(it.home.pos);
      it.g.rotation.set(0, it.home.rotY, 0);
      it.focused = false;
      focused = null;
    },
  };
}
