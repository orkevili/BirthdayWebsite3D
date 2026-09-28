import * as THREE from 'three';
import { animate, Ease, rand } from './anim.js';
import { heartXY } from './textures.js';

const SKY_R = 60;

/** Éjszakai égbolt: csillagkupola, hullócsillagok, kívánság → csillagkép */
export function createSky(scene, glowTex, sparks) {
  // ── Égbolt-kupola (a rózsaszín háttér fölé úszik be) ─────────
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_R, 48, 24),
    new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 horizon = vec3(0.45, 0.22, 0.46);
          vec3 mid = vec3(0.15, 0.09, 0.30);
          vec3 top = vec3(0.03, 0.03, 0.11);
          vec3 c = mix(horizon, mid, smoothstep(-0.05, 0.25, h));
          c = mix(c, top, smoothstep(0.25, 0.8, h));
          gl_FragColor = vec4(c, uOpacity);
        }`,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    }),
  );
  dome.renderOrder = -2;
  dome.visible = false;
  scene.add(dome);

  // ── Csillagok ────────────────────────────────────────────────
  const count = 1800;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection();
    v.y = Math.abs(v.y) * 1.1 - 0.1;
    v.normalize().multiplyScalar(SKY_R * 0.92);
    pos.set([v.x, v.y, v.z], i * 3);
    c.set(['#ffffff', '#ffffff', '#dfe8ff', '#ffe0f0', '#fff1c9'][i % 5]);
    col.set([c.r, c.g, c.b], i * 3);
    size[i] = Math.random() < 0.06 ? rand(0.9, 1.6) : rand(0.25, 0.7);
    phase[i] = Math.random() * 100;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: glowTex }, uTime: { value: 0 }, uOpacity: { value: 0 }, uScale: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uScale;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = 0.55 + 0.45 * sin(uTime * (1.0 + fract(aPhase) * 2.0) + aPhase);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.5, aSize * uScale * projectionMatrix[1][1] / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uOpacity;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(vColor * t.rgb * t.a * vAlpha * uOpacity, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -1.5;
  stars.frustumCulled = false;
  stars.visible = false;
  scene.add(stars);

  // ── Hullócsillagok ───────────────────────────────────────────
  const TRAIL = 28;
  const shooters = [];

  function launch(from, dir, speed = 16, life = 1.3, big = false) {
    const head = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: '#fff6fb', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    head.scale.setScalar(big ? 1.6 : 0.8);
    const trailPos = new Float32Array(TRAIL * 3);
    const trailCol = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) {
      trailPos.set([from.x, from.y, from.z], i * 3);
      const f = Math.pow(1 - i / TRAIL, 1.6);
      trailCol.set([f, f * 0.85, f * 0.95], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    line.frustumCulled = false;
    scene.add(head, line);
    shooters.push({
      head, line, trailPos, p: from.clone(), v: dir.clone().normalize().multiplyScalar(speed), age: 0, life, big,
    });
  }

  function updateShooters(dt) {
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.age += dt;
      const alive = s.age < s.life;
      if (alive) {
        s.p.addScaledVector(s.v, dt);
        sparks.emit({
          position: s.p, count: s.big ? 4 : 2, speed: 0.4, gravity: -0.4, size: s.big ? 0.22 : 0.14, life: 0.9,
          colors: ['#ffffff', '#ffe6a8', '#ffc2e0'],
        });
      }
      s.trailPos.copyWithin(3, 0, (TRAIL - 1) * 3);
      s.trailPos.set([s.p.x, s.p.y, s.p.z], 0);
      s.line.geometry.attributes.position.needsUpdate = true;
      s.head.position.copy(s.p);
      const fade = Math.min(1, s.age / 0.15) * (alive ? 1 - Math.max(0, (s.age - s.life + 0.3) / 0.3) : 0);
      s.head.material.opacity = fade;
      s.line.material.opacity = alive ? fade : Math.max(0, 1 - (s.age - s.life) / 0.4);
      if (s.age > s.life + 0.4) {
        scene.remove(s.head, s.line);
        s.head.material.dispose();
        s.line.geometry.dispose();
        s.line.material.dispose();
        shooters.splice(i, 1);
      }
    }
  }

  // ── Szív alakú csillagkép ────────────────────────────────────
  function buildConstellation(center, facing, width) {
    const group = new THREE.Group();
    group.position.copy(center);
    group.lookAt(facing);
    scene.add(group);

    const n = 18;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = heartXY((i / n) * Math.PI * 2);
      pts.push(new THREE.Vector3((x * width) / 32, (y * width) / 32 - width * 0.08, 0));
    }
    const linePts = [...pts, pts[0]];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    lineGeo.setDrawRange(0, 0);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
      color: '#ffd1ec', transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    group.add(line);

    const starSprites = pts.map((p, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: i % 3 ? '#ffffff' : '#ffc2e0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      s.position.copy(p);
      s.scale.setScalar(0.01);
      s.userData.base = i % 4 === 0 ? 1.4 : 0.95;
      group.add(s);
      return s;
    });
    return { group, line, lineGeo, starSprites, count: linePts.length };
  }

  let constellation = null;
  let ambient = false;
  let ambientTimer = 2;
  let time = 0;
  let anchor = new THREE.Vector3();

  return {
    get active() {
      return dome.visible;
    },

    async fadeIn(duration) {
      dome.visible = stars.visible = true;
      await animate(duration, (e) => {
        dome.material.uniforms.uOpacity.value = e;
        starMat.uniforms.uOpacity.value = e;
      }, Ease.inOutCubic);
    },

    setViewportHeight(h) {
      starMat.uniforms.uScale.value = h / 2;
    },

    /** Háttérben időnként átsuhanó hullócsillagok, `center` körül */
    startAmbient(center) {
      anchor.copy(center);
      ambient = true;
    },

    /** A kívánság felszáll, hullócsillag lesz belőle, majd kirajzolódik a szív csillagkép */
    async releaseWish(camera, center) {
      // Ragyogó "kívánságcsillag" születik a néző előtt, majd felszáll az égre
      const star = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: '#ffe6f4', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      const halo = new THREE.Sprite(star.material.clone());
      halo.material.color.set('#ff9fd0');
      const fwd = camera.getWorldDirection(new THREE.Vector3());
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const start = camera.position.clone().addScaledVector(fwd, 6).addScaledVector(up, -0.8);
      star.position.copy(start);
      halo.position.copy(start);
      star.scale.setScalar(0.01);
      halo.scale.setScalar(0.01);
      scene.add(halo, star);

      await animate(1.4, (e, t) => {
        const pulse = 1 + Math.sin(t * 18) * 0.08;
        star.scale.setScalar(Math.max(0.01, 1.1 * e * pulse));
        halo.scale.setScalar(Math.max(0.01, 2.6 * e));
        if (Math.random() < 0.6) {
          sparks.emit({ position: start, count: 2, speed: 1.2, gravity: 0.3, size: 0.14, life: 0.9, colors: ['#ffffff', '#ffd6ec', '#ffe6a8'] });
        }
      }, Ease.outBack);
      await animate(2.6, (e, t) => {
        const p = new THREE.Vector3().lerpVectors(start, center, e).addScaledVector(up, Math.sin(e * Math.PI) * 1.2);
        star.position.copy(p);
        halo.position.copy(p);
        const pulse = 1 + Math.sin(t * 30) * 0.1;
        star.scale.setScalar(1.1 * (1 - e * 0.5) * pulse);
        halo.scale.setScalar(2.6 * (1 - e * 0.6));
        sparks.emit({ position: p, count: 2, speed: 0.4, gravity: -0.3, size: 0.18, life: 1, colors: ['#ffffff', '#ffd6ec', '#ffe6a8'] });
      }, Ease.inOutCubic);
      scene.remove(star, halo);
      star.material.dispose();
      halo.material.dispose();

      sparks.emit({ position: center, count: 140, speed: 3, gravity: -0.6, size: 0.3, life: 1.6, colors: ['#ffffff', '#ffe6a8', '#ffc2e0'] });
      launch(center, new THREE.Vector3(1, 0.35, -0.25), 18, 1.8, true);
      await animate(1.0, () => {}, Ease.linear);

      // Csillagkép a kívánság helyén
      const width = Math.min(7, 2 * center.distanceTo(camera.position) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * 0.7);
      constellation = buildConstellation(center, camera.position, width);
      const { starSprites, lineGeo, count: total } = constellation;
      await animate(3.2, (e) => {
        const k = e * total;
        lineGeo.setDrawRange(0, Math.min(total, Math.floor(k) + 1));
        starSprites.forEach((s, i) => {
          const t = Math.min(1, Math.max(0, k - i));
          s.scale.setScalar(Math.max(0.01, s.userData.base * Ease.outBack(t)));
        });
      }, Ease.inOutCubic);
    },

    update(dt) {
      time += dt;
      starMat.uniforms.uTime.value = time;
      updateShooters(dt);
      if (ambient && (ambientTimer -= dt) <= 0) {
        ambientTimer = rand(2.5, 6);
        const from = anchor.clone().add(new THREE.Vector3(rand(-14, 2), rand(3, 7), rand(-14, -6)));
        launch(from, new THREE.Vector3(1, rand(-0.55, -0.3), rand(-0.1, 0.1)), rand(14, 20), rand(0.9, 1.4));
      }
      if (constellation) {
        constellation.starSprites.forEach((s, i) => {
          if (s.scale.x > 0.02) s.material.opacity = 0.75 + 0.25 * Math.sin(time * 2.5 + i * 1.7);
        });
      }
    },
  };
}
