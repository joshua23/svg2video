export type Vec = { x: number; y: number };

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (a === b ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a)));

export const easeInOut = (t: number) => {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const smooth = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

/** Progress of `t` through the window [a, b], eased. */
export const win = (t: number, a: number, b: number, ease: (x: number) => number = smooth) => ease(invLerp(a, b, t));

export type Key = [time: number, value: number];

/**
 * Piecewise keyframe track. Between keys values are eased (smoothstep by default),
 * so a figure that holds still between two identical keys never drifts.
 */
export const track = (t: number, keys: Key[], ease: (x: number) => number = smooth): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return lerp(v0, v1, ease(invLerp(t0, t1, t)));
    }
  }
  return keys[keys.length - 1][1];
};

/** Linear keyframe track — for positions that must move at constant speed. */
export const linTrack = (t: number, keys: Key[]) => track(t, keys, (x) => x);

export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec) => Math.hypot(a.x, a.y);
export const vlerp = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** Unit vector for an angle measured from straight down, positive toward +x. */
export const down = (a: number): Vec => ({ x: Math.sin(a), y: Math.cos(a) });
/** Angle of a vector measured from straight down, positive toward +x. */
export const angleFromDown = (d: Vec) => Math.atan2(d.x, d.y);

/**
 * Two-bone IK. Returns the middle joint for a chain root → joint → end of lengths l1, l2.
 * `bend` = +1 places the joint on the +x side of the root→target line (knees), -1 the other way (elbows).
 */
export const ik = (root: Vec, target: Vec, l1: number, l2: number, bend: 1 | -1): Vec => {
  const d = sub(target, root);
  const dist = clamp(len(d), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const a = Math.acos(clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1));
  const base = Math.atan2(d.y, d.x);
  // In SVG space (y down) a negative rotation turns the joint toward +x for a downward-pointing chain.
  const ang = base - bend * a;
  return { x: root.x + Math.cos(ang) * l1, y: root.y + Math.sin(ang) * l1 };
};

// ---------- deterministic randomness ----------

export const rng = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hash = (i: number, seed: number) => {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Smooth 1D value noise in [-1, 1]. */
export const noise = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
};

// ---------- colour ----------

const parseHex = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

export const mix = (a: string, b: string, t: number) => {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const c = ca.map((x, i) => Math.round(lerp(x, cb[i], clamp(t))));
  return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
};

export const f1 = (n: number) => Math.round(n * 10) / 10;
export const pt = (p: Vec) => `${f1(p.x)} ${f1(p.y)}`;
