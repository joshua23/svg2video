export type V3 = [number, number, number];
export type V2 = [number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const mix3 = (a: V3, b: V3, u: number): V3 => [
  a[0] + (b[0] - a[0]) * u,
  a[1] + (b[1] - a[1]) * u,
  a[2] + (b[2] - a[2]) * u,
];

export const W = 1920;
export const H = 1080;
export const NEAR = 0.05;

export interface Camera {
  pos: V3;
  fwd: V3;
  right: V3;
  up: V3;
  f: number; // 焦距（像素）
  roll: number; // deg
}

export function makeCamera(pos: V3, target: V3, vfovDeg: number, roll = 0): Camera {
  const fwd = norm(sub(target, pos));
  let right = cross(fwd, [0, 0, 1]);
  if (len(right) < 1e-6) right = [1, 0, 0];
  right = norm(right);
  const up = cross(right, fwd);
  const f = H / 2 / Math.tan((vfovDeg * Math.PI) / 360);
  return { pos, fwd, right, up, f, roll };
}

/** 相机坐标：[x 右, y 上, z 深度] */
export function toCam(c: Camera, p: V3): V3 {
  const d = sub(p, c.pos);
  return [dot(d, c.right), dot(d, c.up), dot(d, c.fwd)];
}
export function camToScreen(c: Camera, q: V3): V2 {
  return [W / 2 + (c.f * q[0]) / q[2], H / 2 - (c.f * q[1]) / q[2]];
}
export function project(c: Camera, p: V3): { s: V2; z: number } | null {
  const q = toCam(c, p);
  if (q[2] < NEAR) return null;
  return { s: camToScreen(c, q), z: q[2] };
}

/** 多边形近平面裁剪后投影；返回屏幕点和平均深度 */
export function projectPoly(c: Camera, pts: V3[]): { s: V2[]; z: number } | null {
  const q = pts.map((p) => toCam(c, p));
  const out: V3[] = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[i];
    const b = q[(i + 1) % q.length];
    const ain = a[2] >= NEAR;
    const bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const u = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, NEAR]);
    }
  }
  if (out.length < 3) return null;
  let z = 0;
  for (const p of q) z += p[2];
  return { s: out.map((p) => camToScreen(c, p)), z: z / q.length };
}

export const pts2d = (s: V2[]) => s.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
export const pathD = (s: V2[], close = true) =>
  'M' + s.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L') + (close ? 'Z' : '');

export function convexHull(points: V2[]): V2[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const crossZ = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: V2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** 确定性随机数 */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

/** 平滑噪声（用于手持抖动） */
export function noise1(t: number, seed = 0) {
  return (
    Math.sin(t * 1.7 + seed) * 0.5 +
    Math.sin(t * 3.1 + seed * 2.3) * 0.3 +
    Math.sin(t * 7.3 + seed * 4.1) * 0.2
  );
}

export const deg = (r: number) => (r * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

/** 2D: 以 SVG 方向（y 向下）旋转，正角度 = 顺时针 */
export function rot2(p: V2, aDeg: number): V2 {
  const a = rad(aDeg);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}
export const add2 = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
export const sub2 = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
export const mul2 = (a: V2, s: number): V2 => [a[0] * s, a[1] * s];
/** 肢体方向：a=0 向下，a=90 向前（+x），a=180 向上 */
export const dir = (aDeg: number): V2 => [Math.sin(rad(aDeg)), Math.cos(rad(aDeg))];
