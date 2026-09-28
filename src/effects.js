import * as THREE from 'three';
import { pick, rand } from './anim.js';
import { heartShape } from './textures.js';

export const PASTELS = ['#ff8fbf', '#ffc2dc', '#c9a7ff', '#ffe08a', '#9fe3ff', '#ffffff', '#ffb3a7'];

// ── Csillogó részecskék (kitörések, tűzijáték) ─────────────────
export class Sparks {
  constructor(scene, glowTex, max = 2000) {
    this.max = max;
    this.items = [];
    this.free = [];
    for (let i = max - 1; i >= 0; i--) this.free.push(i);

    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;

    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTex }, uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
        uniform float uScale;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vColor = aColor; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale * projectionMatrix[1][1] / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(vColor * t.rgb * vAlpha * t.a, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  setViewportHeight(h) {
    this.material.uniforms.uScale.value = h / 2;
  }

  emit({ position, count = 60, speed = 3, colors = PASTELS, size = 0.18, life = 1.4, gravity = -2, up = 0, spread = 1 }) {
    const c = new THREE.Color();
    for (let n = 0; n < count && this.free.length; n++) {
      const i = this.free.pop();
      const dir = new THREE.Vector3().randomDirection();
      dir.y = dir.y * spread + up;
      const v = dir.multiplyScalar(speed * rand(0.4, 1));
      c.set(pick(colors));
      this.items.push({
        i, p: position.clone(), v, age: 0, life: life * rand(0.6, 1.2),
        size: size * rand(0.6, 1.4), color: c.clone(), gravity, twinkle: Math.random() * 10,
      });
    }
  }

  update(dt) {
    const items = this.items;
    for (let k = items.length - 1; k >= 0; k--) {
      const it = items[k];
      it.age += dt;
      const i = it.i;
      if (it.age >= it.life) {
        this.alpha[i] = 0;
        this.free.push(i);
        items[k] = items[items.length - 1];
        items.pop();
        continue;
      }
      it.v.y += it.gravity * dt;
      it.v.multiplyScalar(1 - dt * 1.2);
      it.p.addScaledVector(it.v, dt);
      const t = it.age / it.life;
      this.pos.set([it.p.x, it.p.y, it.p.z], i * 3);
      this.col.set([it.color.r, it.color.g, it.color.b], i * 3);
      this.size[i] = it.size * (1 - t * 0.5);
      this.alpha[i] = (1 - t) * (0.7 + 0.3 * Math.sin(it.age * 25 + it.twinkle));
    }
    for (const name of ['position', 'aColor', 'aSize', 'aAlpha']) this.geo.attributes[name].needsUpdate = true;
  }
}

// ── Lebegő fényfoltok a háttérben (GPU-n animálva) ─────────────
export function createBokeh(scene, glowTex, count = 260) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    pos.set([rand(-16, 16), rand(-9, 11), rand(-18, 3)], i * 3);
    c.set(pick(['#ffffff', '#ffd6e8', '#ffe9a8', '#e3d0ff']));
    col.set([c.r, c.g, c.b], i * 3);
    size[i] = rand(0.05, 0.35);
    phase[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: glowTex }, uTime: { value: 0 }, uScale: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aSize; attribute float aPhase;
      uniform float uTime; uniform float uScale;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.15 + aSize * 0.4) + 9.0, 20.0) - 9.0;
        p.x += sin(uTime * 0.3 + aPhase) * 0.4;
        vColor = aColor;
        vAlpha = 0.35 + 0.35 * sin(uTime * 1.5 + aPhase);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uScale * projectionMatrix[1][1] / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(vColor * t.rgb * t.a * vAlpha, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.renderOrder = -1;
  scene.add(points);
  return {
    material,
    update(dt) {
      material.uniforms.uTime.value += dt;
    },
  };
}

// ── Lassan felszálló szívek a háttérben ────────────────────────
export function createFloatingHearts(scene, count = 34) {
  const geo = new THREE.ExtrudeGeometry(heartShape(0.5), {
    depth: 0.08, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4,
  });
  geo.center();
  const mesh = new THREE.InstancedMesh(
    geo,
    new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 1, sheen: 0.5 }),
    count,
  );
  const color = new THREE.Color();
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      p: new THREE.Vector3(rand(-12, 12), rand(-8, 9), rand(-14, -4)),
      speed: rand(0.2, 0.5),
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.8, 0.8),
      s: rand(0.5, 1.3),
      phase: Math.random() * 10,
    });
    mesh.setColorAt(i, color.set(pick(['#ff8fbf', '#ffc2dc', '#d4b8ff', '#ffb3c8', '#ffffff'])));
  }
  scene.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sv = new THREE.Vector3();
  let time = 0;
  return {
    update(dt) {
      time += dt;
      items.forEach((it, i) => {
        it.p.y += it.speed * dt;
        if (it.p.y > 10) it.p.y = -9;
        it.rot += it.spin * dt;
        q.setFromEuler(e.set(Math.sin(time + it.phase) * 0.3, it.rot, Math.sin(time * 0.7 + it.phase) * 0.25));
        const x = it.p.x + Math.sin(time * 0.5 + it.phase) * 0.5;
        m.compose(sv.set(x, it.p.y, it.p.z), q, new THREE.Vector3(it.s, it.s, it.s));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// ── Konfetti ───────────────────────────────────────────────────
export class Confetti {
  constructor(scene, count = 500) {
    this.count = count;
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.07, 0.12),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 }),
      count,
    );
    this.mesh.frustumCulled = false;
    const color = new THREE.Color();
    const colors = ['#ff5c9a', '#ffc2dc', '#c9a7ff', '#ffd36b', '#8fd9ff', '#ffffff', '#ff9e7a'];
    this.items = [];
    for (let i = 0; i < count; i++) {
      this.mesh.setColorAt(i, color.set(pick(colors)));
      this.items.push({ p: new THREE.Vector3(0, -100, 0), v: new THREE.Vector3(), r: new THREE.Euler(), spin: new THREE.Vector3(), active: false, phase: Math.random() * 10 });
    }
    this.rain = false;
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.one = new THREE.Vector3(1, 1, 1);
    scene.add(this.mesh);
    this.update(0);
  }

  burst(origin, n = 350) {
    let k = 0;
    for (const it of this.items) {
      if (k >= n) break;
      if (it.active) continue;
      it.active = true;
      it.p.copy(origin);
      const a = Math.random() * Math.PI * 2;
      const out = rand(1, 4.5);
      it.v.set(Math.cos(a) * out, rand(5, 10), Math.sin(a) * out);
      it.spin.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
      k++;
    }
  }

  respawnTop(it) {
    it.active = true;
    it.p.set(rand(-8, 8), rand(6, 9), rand(-5, 3));
    it.v.set(rand(-0.3, 0.3), rand(-1.2, -0.6), rand(-0.3, 0.3));
    it.spin.set(rand(-5, 5), rand(-5, 5), rand(-5, 5));
  }

  update(dt) {
    const { m, q, one } = this;
    this.items.forEach((it, i) => {
      if (it.active) {
        it.v.y -= 7 * dt;
        it.v.multiplyScalar(1 - Math.min(1, dt * 2.2));
        it.p.addScaledVector(it.v, dt);
        it.p.x += Math.sin(it.phase + it.p.y * 2) * dt * 0.4;
        it.r.x += it.spin.x * dt;
        it.r.y += it.spin.y * dt;
        it.r.z += it.spin.z * dt;
        if (it.p.y < -6) {
          if (this.rain && Math.random() < 0.6) this.respawnTop(it);
          else {
            it.active = false;
            it.p.y = -100;
          }
        }
      } else if (this.rain && Math.random() < dt * 0.15) {
        this.respawnTop(it);
      }
      q.setFromEuler(it.r);
      m.compose(it.p, q, one);
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ── Lufik ──────────────────────────────────────────────────────
export class Balloons {
  constructor(scene, count = 16) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    const sphereGeo = new THREE.SphereGeometry(0.42, 40, 28);
    sphereGeo.scale(1, 1.18, 1);
    const heartGeo = new THREE.ExtrudeGeometry(heartShape(0.95), {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.1, bevelSegments: 8, curveSegments: 12,
    });
    heartGeo.center();
    const knotGeo = new THREE.ConeGeometry(0.06, 0.1, 12);
    const colors = ['#ff7eb3', '#ffc2dc', '#c9a7ff', '#ffe08a', '#ffffff', '#ff9ec7', '#b7e4ff'];

    this.items = [];
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshPhysicalMaterial({
        color: colors[i % colors.length], roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4,
      });
      const isHeart = i % 3 === 0;
      const ball = new THREE.Mesh(isHeart ? heartGeo : sphereGeo, mat);
      const knot = new THREE.Mesh(knotGeo, mat);
      knot.position.y = isHeart ? -0.5 : -0.52;
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        pts.push(new THREE.Vector3(Math.sin(t * 6) * 0.05, -0.56 - t * 1.4, 0));
      }
      const string = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }),
      );
      g.add(ball, knot, string);
      const front = Math.random() < 0.3;
      const x = front ? pick([-1, 1]) * rand(3, 6) : rand(-6.5, 6.5);
      this.items.push({
        g, x, z: front ? rand(1, 2.5) : rand(-5, -1.8),
        y: rand(-12, -4), speed: rand(0.5, 0.9), phase: Math.random() * 10, s: rand(0.8, 1.15),
      });
      g.scale.setScalar(this.items[i].s);
      this.group.add(g);
    }
    this.time = 0;
  }

  start() {
    this.group.visible = true;
  }

  update(dt) {
    if (!this.group.visible) return;
    this.time += dt;
    for (const it of this.items) {
      it.y += it.speed * dt;
      if (it.y > 10) it.y = rand(-9, -6);
      it.g.position.set(it.x + Math.sin(this.time * 0.6 + it.phase) * 0.35, it.y, it.z);
      it.g.rotation.z = Math.sin(this.time * 0.8 + it.phase) * 0.12;
      it.g.rotation.y = Math.sin(this.time * 0.4 + it.phase) * 0.5;
    }
  }
}

// ── Füst a kialudt gyertyák fölött ─────────────────────────────
export class Smoke {
  constructor(scene, glowTex) {
    this.scene = scene;
    this.tex = glowTex;
    this.emitters = [];
    this.puffs = [];
  }

  emit(position, duration) {
    this.emitters.push({ p: position.clone(), left: duration, acc: 0 });
  }

  update(dt) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const em = this.emitters[i];
      em.left -= dt;
      em.acc += dt;
      while (em.acc > 0.06) {
        em.acc -= 0.06;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.tex, color: '#c9c0c8', transparent: true, opacity: 0, depthWrite: false,
        }));
        s.position.copy(em.p);
        this.scene.add(s);
        this.puffs.push({ s, age: 0, life: rand(1.6, 2.4), drift: rand(-0.15, 0.15), phase: Math.random() * 6, strength: Math.max(0.2, em.left / 2.5) });
      }
      if (em.left <= 0) this.emitters.splice(i, 1);
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        this.scene.remove(p.s);
        p.s.material.dispose();
        this.puffs.splice(i, 1);
        continue;
      }
      p.s.position.y += dt * 0.45;
      p.s.position.x += (p.drift + Math.sin(p.age * 3 + p.phase) * 0.12) * dt;
      p.s.scale.setScalar(0.1 + t * 0.55);
      p.s.material.opacity = Math.sin(t * Math.PI) * 0.45 * p.strength;
    }
  }
}
