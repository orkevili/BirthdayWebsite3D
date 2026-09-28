import * as THREE from 'three';
import { animate, Ease, lerp } from './anim.js';
import { cardBackTexture, cardCoverTexture, cardMessageTexture, cardPhotosTexture } from './textures.js';

export const CARD_W = 2;
export const CARD_H = 2.75;

function pageMaterial(map) {
  // Kis emisszió, hogy a papír mindig világos és jól olvasható maradjon
  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.85,
    emissive: '#ffffff',
    emissiveMap: map,
    emissiveIntensity: 0.3,
  });
}

/**
 * Összehajtott képeslap. A borító a bal élén csuklózva nyílik a néző felé.
 * Zárva:  borító elöl, mögötte az üzenet-oldal.
 * Nyitva: bal oldalon a fotós oldal (a borító belseje), jobb oldalon az üzenet.
 */
export function createCard(cfg, images) {
  const root = new THREE.Group(); // lebegés / pozíció
  const sway = new THREE.Group();
  const inner = new THREE.Group(); // zárt állapotban balra tolva, hogy középen legyen
  root.add(sway);
  sway.add(inner);
  inner.position.x = -CARD_W / 2;

  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);

  const message = new THREE.Mesh(geo, pageMaterial(cardMessageTexture(cfg)));
  message.position.x = CARD_W / 2;
  const back = new THREE.Mesh(geo, pageMaterial(cardBackTexture()));
  back.position.set(CARD_W / 2, 0, -0.004);
  back.rotation.y = Math.PI;
  inner.add(message, back);

  const cover = new THREE.Group();
  const coverFront = new THREE.Mesh(geo, pageMaterial(cardCoverTexture(cfg)));
  coverFront.position.set(CARD_W / 2, 0, 0.012);
  const coverInside = new THREE.Mesh(geo, pageMaterial(cardPhotosTexture(cfg, images)));
  coverInside.position.set(CARD_W / 2, 0, 0.008);
  coverInside.rotation.y = Math.PI;
  cover.add(coverFront, coverInside);
  inner.add(cover);

  root.visible = false;

  let time = 0;
  let floating = false;
  let hover = 0;
  let isOpen = false;

  return {
    root,
    hitTargets: [message, back, coverFront, coverInside],
    /** Nyitott állapotban: -1 = bal (fotós) oldal, 1 = jobb (üzenet) oldal */
    pageSide(mesh) {
      if (mesh === coverInside) return -1;
      if (mesh === message) return 1;
      return 0;
    },
    get isOpen() {
      return isOpen;
    },
    set hovered(v) {
      hover = v ? 1 : 0;
    },

    update(dt) {
      time += dt;
      if (!floating) return;
      sway.position.y = Math.sin(time * 1.1) * 0.06;
      sway.rotation.y = Math.sin(time * 0.7) * 0.07;
      sway.rotation.x = Math.sin(time * 0.9) * 0.04;
      const target = isOpen ? 1 : 1 + hover * 0.04;
      sway.scale.setScalar(lerp(sway.scale.x, target, 1 - Math.exp(-dt * 8)));
    },

    /** Kiemelkedik az ajándékdobozból és a kamera felé fordul */
    async rise(to) {
      root.visible = true;
      root.position.set(0, -0.6, 0);
      root.scale.setScalar(0.3);
      await animate(2.0, (e) => {
        root.position.set(lerp(0, to.x, e), lerp(-0.6, to.y, e), lerp(0, to.z, e));
        root.scale.setScalar(lerp(0.3, 1, e));
        root.rotation.y = lerp(-Math.PI * 2, 0, e);
      }, Ease.outCubic);
      floating = true;
    },

    async open() {
      if (isOpen) return;
      isOpen = true;
      await animate(1.6, (e) => {
        cover.rotation.y = -Math.PI * e;
        cover.position.z = Math.sin(e * Math.PI) * 0.05;
        inner.position.x = lerp(-CARD_W / 2, 0, e);
      }, Ease.inOutCubic);
    },

    async flyAway() {
      floating = false;
      const p = root.position.clone();
      await animate(1.2, (e) => {
        root.position.set(p.x + e * 1.5, p.y + e * 5, p.z - e * 2);
        root.rotation.z = -e * 0.8;
        root.rotation.y = e * 1.2;
        root.scale.setScalar(1 - e * 0.6);
      }, Ease.inCubic);
      root.visible = false;
    },
  };
}
