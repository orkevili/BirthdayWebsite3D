// Apró, Promise-alapú animációs rendszer, a render-ciklus idejével hajtva.

export const Ease = {
  linear: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

const active = new Set();
let now = 0;

export function tick(dt) {
  now += dt;
  for (const a of [...active]) {
    if (now < a.start) continue;
    const t = Math.min(1, (now - a.start) / a.duration);
    a.update(a.ease(t), t);
    if (t >= 1) {
      active.delete(a);
      a.resolve();
    }
  }
}

/** update(e, t): e = easelt érték, t = nyers 0..1 */
export function animate(duration, update, ease = Ease.inOutCubic, delay = 0) {
  return new Promise((resolve) => {
    active.add({ start: now + delay, duration: Math.max(duration, 1e-4), update, ease, resolve });
  });
}

export const wait = (seconds) => animate(seconds, () => {}, Ease.linear);

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
