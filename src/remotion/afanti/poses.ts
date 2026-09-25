import { Expr, ProfilePose } from './rig/afantiProfile';
import { FrontPose } from './rig/front';
import { BRAYS, T, clamp, keyed, lerp, smooth } from './plan';
import { POMMEL, SADDLE } from './rig/donkeyProfile';
import { dir } from './math3d';

type PF = (t: number) => ProfilePose;
type FF = (t: number) => FrontPose;

const E = (mouth: Expr['mouth'], eyes: Expr['eyes'], brow = 0, sweat = 0): Expr => ({ mouth, eyes, brow, sweat });

const RIDE: ProfilePose = {
  px: 0, py: -4, R: 0, tl: 6, hd: 0,
  aN1: 60, aN2: 95, aF1: 40, aF2: 100,
  lN1: 30, lN2: -4, lF1: 26, lF2: -8,
  sa: 100, staff: 1, hatLift: 0, flutter: 0.6,
  expr: E('grin', 'normal', 0.3),
};
const P = (o: Partial<ProfilePose>): ProfilePose => ({ ...RIDE, ...o });

/** 围绕鞍桥的钟摆：手抓鞍桥，身体沿 φ 方向伸出（φ 与肢体角度同一约定） */
function pendulum(phi: number, o: Partial<ProfilePose>): ProfilePose {
  const d = dir(phi);
  const reach = 90;
  return P({
    px: POMMEL[0] - SADDLE[0] + d[0] * reach,
    py: POMMEL[1] - SADDLE[1] + d[1] * reach,
    R: -phi,
    tl: 0,
    aN1: 178, aN2: 182, aF1: 176, aF2: 184,
    ...o,
  });
}

const flail = (t: number, k = 1) => Math.sin(t * 19) * 32 * k;

const PROFILE_KEYS: [number, PF][] = [
  [0.0, () => P({ px: -8, py: 38, R: 0, tl: 16, hd: -8, aN1: 62, aN2: 150, aF1: 70, aF2: 158, lN1: 105, lN2: -5, lF1: -55, lF2: -95, sa: 150, flutter: 0.3, expr: E('o', 'wide', 0.8) })],
  [0.26, (t) => P({ px: -92, py: 10, R: 90, tl: 0, hd: -28, aN1: 172, aN2: 178, aF1: 176, aF2: 181, lN1: 8 + flail(t), lN2: -20 + flail(t + 0.08), lF1: 8 - flail(t), lF2: -20 - flail(t + 0.08), sa: 8, flutter: 1, hatLift: 6, expr: E('scream', 'wide', 1) })],
  [0.8, (t) => P({ px: -90, py: 2, R: 84, tl: 0, hd: -20, aN1: 172, aN2: 178, aF1: 176, aF2: 181, lN1: 20 + flail(t), lN2: -10 + flail(t + 0.08), lF1: 20 - flail(t), lF2: -10 - flail(t + 0.08), sa: 8, flutter: 1, hatLift: 5, expr: E('scream', 'wide', 1) })],
  [1.02, () => P({ px: -34, py: -64, R: 38, tl: 10, hd: 10, aN1: 130, aN2: 150, aF1: 140, aF2: 160, lN1: 115, lN2: 10, lF1: 100, lF2: -5, sa: 60, flutter: 0.8, hatLift: 10, expr: E('o', 'wide', 0.6) })],
  [1.2, () => P({ px: 0, py: -2, R: -6, tl: -10, hd: -6, aN1: 140, aN2: 160, aF1: 150, aF2: 175, sa: 150, hatLift: 14, expr: E('o', 'wide', 0.8) })],
  [1.36, () => P({ tl: 12, hd: -6, aN1: 88, aN2: 92, aF1: -150, aF2: -170, sa: 97, flutter: 0.8, hatLift: 0, expr: E('grin', 'normal', 0.9) })],
  [2.0, () => P({ tl: 12, hd: -6, aN1: 88, aN2: 92, aF1: -150, aF2: -170, sa: 97, flutter: 0.8, expr: E('grin', 'normal', 0.9) })],
  // 跳石
  [4.0, () => P({ tl: -4, aN1: 62, aN2: 118, aF1: 55, aF2: 115, sa: 150, expr: E('o', 'wide', 0.6) })],
  [4.2, () => P({ tl: 16, hd: 6, aN1: 70, aN2: 110, aF1: 60, aF2: 105, sa: 140, expr: E('grit', 'wide', -0.4) })],
  [4.44, (t) => P({ px: -6, py: -56, R: -10, tl: -12, hd: -12, aN1: 165 + flail(t, 0.4), aN2: 188, aF1: -168, aF2: -158, lN1: 62, lN2: 22, lF1: -42, lF2: -62, sa: 170, flutter: 1, hatLift: 12, expr: E('scream', 'wide', 1) })],
  [4.76, () => P({ px: 0, py: -80, R: 0, tl: 0, aN1: 108, aN2: 96, aF1: -108, aF2: -98, lN1: 6, lN2: 0, lF1: -4, lF2: -2, sa: 92, flutter: 0.8, hatLift: 4, expr: E('o', 'wide', 0.8) })],
  [4.98, (t) => P({ px: 0, py: -80, R: 9 * Math.sin(t * 9), tl: -4 * Math.sin(t * 9 + 0.6), hd: -6 * Math.sin(t * 9), aN1: 98 + 16 * Math.sin(t * 9 + 1), aN2: 84, aF1: -96 + 16 * Math.sin(t * 9 + 1), aF2: -80, lN1: 8, lN2: -3, lF1: -6, lF2: -2, sa: 90 + 12 * Math.sin(t * 9 + 1.3), flutter: 0.7, expr: E('wobble', 'wide', 0.7) })],
  [5.8, (t) => P({ px: 0, py: -80, R: 9 * Math.sin(t * 9), tl: -4 * Math.sin(t * 9 + 0.6), aN1: 98, aN2: 84, aF1: -96, aF2: -80, lN1: 8, lN2: -3, lF1: -6, lF2: -2, sa: 92, flutter: 0.7, expr: E('wobble', 'wide', 0.7) })],
  // 绊倒：翻过脖子，抓住鞍桥荡来荡去
  [5.94, () => pendulum(168, { lN1: 20, lN2: 30, lF1: 5, lF2: 20, sa: 150, hatLift: 8, flutter: 1, expr: E('scream', 'wide', 1) })],
  [6.18, (t) => pendulum(74, { lN1: 60 + flail(t, 0.5), lN2: 10, lF1: 40 - flail(t, 0.5), lF2: -10, sa: 30, hatLift: 10, flutter: 1, expr: E('scream', 'wide', 1) })],
  [6.42, (t) => pendulum(128, { lN1: -30 + flail(t, 0.4), lN2: -60, lF1: -10, lF2: -40, sa: 170, hatLift: 4, flutter: 1, expr: E('o', 'wide', 0.8) })],
  [6.68, (t) => pendulum(80, { lN1: 50 + flail(t, 0.5), lN2: 0, lF1: 30, lF2: -20, sa: 40, flutter: 1, expr: E('grit', 'wide', -0.2) })],
  // 急转：马戏团侧挂（一手抓鞍，一手举杖）
  [7.0, (t) => pendulum(-58 + 8 * Math.sin(t * 8), { aF1: 176, aF2: 184, aN1: 250, aN2: 262, lN1: -32 + 10 * Math.sin(t * 13), lN2: -45, lF1: -20 - 10 * Math.sin(t * 13), lF2: -30, sa: 205, flutter: 1, hatLift: 3, expr: E('grin', 'wide', 1) })],
  [7.9, (t) => pendulum(-48 + 8 * Math.sin(t * 8), { aF1: 176, aF2: 184, aN1: 250, aN2: 262, lN1: -32, lN2: -45, lF1: -20, lF2: -30, sa: 205, flutter: 1, expr: E('grin', 'wide', 1) })],
  // 英雄恢复
  [8.18, () => P({ px: -20, py: -40, R: -24, tl: 8, aN1: 150, aN2: 170, aF1: 140, aF2: 160, lN1: 80, lN2: 20, lF1: 60, lF2: 0, sa: 140, flutter: 1, expr: E('o', 'wide', 0.5) })],
  [8.45, () => P({ tl: -4, hd: -9, aN1: 84, aN2: 88, aF1: -42, aF2: 62, sa: 92, flutter: 1, expr: E('smug', 'squint', 0.9) })],
  [11.0, () => P({ tl: -4, hd: -9, aN1: 84, aN2: 88, aF1: -42, aF2: 62, sa: 92, flutter: 1, expr: E('smug', 'squint', 0.9) })],
];

function blendPose(a: ProfilePose, b: ProfilePose, u: number): ProfilePose {
  const o = { ...a } as ProfilePose;
  const keys: (keyof ProfilePose)[] = ['px', 'py', 'R', 'tl', 'hd', 'aN1', 'aN2', 'aF1', 'aF2', 'lN1', 'lN2', 'lF1', 'lF2', 'sa', 'staff', 'hatLift', 'flutter'];
  for (const k of keys) (o[k] as number) = lerp(a[k] as number, b[k] as number, u);
  o.expr = u < 0.5 ? a.expr : b.expr;
  if (a.expr.sweat || b.expr.sweat) o.expr = { ...o.expr, sweat: lerp(a.expr.sweat ?? 0, b.expr.sweat ?? 0, u) };
  return o;
}

export function afantiProfilePose(t: number): ProfilePose {
  const K = PROFILE_KEYS;
  if (t <= K[0][0]) return K[0][1](t);
  for (let i = 0; i < K.length - 1; i++) {
    const [t0, f0] = K[i];
    const [t1, f1] = K[i + 1];
    if (t <= t1) {
      const u = smooth((t - t0) / (t1 - t0));
      return blendPose(f0(t), f1(t), u);
    }
  }
  return K[K.length - 1][1](t);
}

// ------------------------------------------------------------------ 叶板上的阿凡提

export interface HugPose extends ProfilePose {
  squash: number;
}

export function afantiHugPose(t: number): HugPose {
  const u = t - T.impact;
  const squash = 1 - 0.3 * Math.exp(-u * 16) * (u > 0 ? 1 : 0);
  // 双手举过头顶抓住叶板（远侧手是锚点，永远不松）
  const base = P({
    px: 0, py: 0, R: 0, tl: -4, hd: -4,
    aN1: 192, aN2: 176, aF1: 186, aF2: 176,
    lN1: 78, lN2: -6, lF1: 70, lF2: -12,
    sa: 0, staff: 0, flutter: 0.4,
    expr: E('grit', 'squint', -0.6),
  });
  if (t < T.impact + 0.5) return { ...base, expr: E('grit', 'squint', -0.8), hatLift: 6 * Math.exp(-u * 6), squash };
  if (t < T.lookDown) {
    // 顽固地保持自信：翘起二郎腿，腾出一只手扶一扶花帽，眨眨眼
    const relax = smooth((t - 11.5) / 0.4);
    const k = smooth((t - 12.15) / 0.22) * (1 - smooth((t - 12.85) / 0.22));
    return {
      ...base,
      aN1: lerp(192, 150, k),
      aN2: lerp(176, 215, k),
      hd: -8,
      lN1: lerp(78, 38, relax),
      lN2: lerp(-6, -35, relax),
      lF1: lerp(70, 8, relax),
      lF2: lerp(-12, -4, relax),
      hatLift: 2.5 * k,
      expr: t > 12.35 && t < 12.8 ? E('smug', 'wink', 1) : E('smug', 'normal', 0.9),
      squash,
    };
  }
  const look = smooth((t - T.lookDown) / 0.18);
  const panic = smooth((t - T.panic) / 0.1);
  const kick = (ph: number) => Math.sin(t * 24 + ph);
  return {
    ...base,
    hd: lerp(-8, 30, look),
    tl: lerp(-4, 6 * Math.sin(t * 12), panic),
    lN1: lerp(38, 30 + 60 * kick(0), panic),
    lN2: lerp(-35, -20 + 50 * kick(1.2), panic),
    lF1: lerp(8, 30 + 60 * kick(Math.PI), panic),
    lF2: lerp(-4, -20 + 50 * kick(Math.PI + 1.2), panic),
    hatLift: panic * (4 + 3 * Math.abs(kick(0.5))),
    flutter: 0.8,
    expr: t < T.panic ? E('o', 'down', 0.4) : E('scream', 'down', 1, 1),
    squash: 1,
  };
}

// ------------------------------------------------------------------ 正面姿势

const FRONT_BASE: FrontPose = {
  px: 0, py: -8, roll: 0, hd: 0,
  armL: [22, 12], armR: [40, 90], legL: [36, 8], legR: [36, 8],
  staff: 'toCam', staffAng: 0, flutter: 0.8, hatLift: 0,
  expr: E('grin', 'normal', 0.8),
};
const FP = (o: Partial<FrontPose>): FrontPose => ({ ...FRONT_BASE, ...o });

const FRONT_KEYS: [number, FF][] = [
  [2.0, () => FP({ expr: E('grin', 'normal', 0.9), armR: [120, 160] })],
  [2.12, () => FP({ roll: 20, px: 10, expr: E('o', 'wide', 0.8), armR: [140, 170] })],
  [2.3, (t) => FP({ roll: 78, px: 40, py: -2, hd: -18, armL: [150 + flail(t, 0.6), 170], armR: [100, 150], legL: [-150, -95], legR: [70 + flail(t, 0.8), 40], staff: 'angle', staffAng: 170, hatLift: 6, flutter: 1, expr: E('scream', 'wide', 1) })],
  [2.48, (t) => FP({ roll: 0, px: 0, py: -40, hd: 0, armL: [150, 170], armR: [150, 170], legL: [80 + flail(t, 0.5), 60], legR: [80 - flail(t, 0.5), 60], staff: 'angle', staffAng: 150, hatLift: 12, flutter: 1, expr: E('scream', 'wide', 1) })],
  [2.68, (t) => FP({ roll: -80, px: -40, py: -2, hd: 18, armL: [110, 150], armR: [150 + flail(t, 0.6), 170], legL: [70 + flail(t, 0.8), 40], legR: [-150, -95], staff: 'angle', staffAng: -60, hatLift: 6, flutter: 1, expr: E('scream', 'wide', 1) })],
  [3.1, (t) => FP({ roll: -70 + 10 * Math.sin(t * 16), px: -38, py: -6 + 4 * Math.sin(t * 16), hd: 14, armL: [110, 150], armR: [150 + flail(t, 0.5), 170], legL: [60 + flail(t, 0.9), 30], legR: [-150, -95], staff: 'angle', staffAng: -70, hatLift: 4, flutter: 1, expr: E('o', 'wide', 1) })],
  [3.45, (t) => FP({ roll: -84 + 6 * Math.sin(t * 16), px: -40, py: -2, hd: 18, armL: [110, 150], armR: [150 + flail(t, 0.5), 170], legL: [60 + flail(t, 0.9), 30], legR: [-150, -95], staff: 'angle', staffAng: -80, hatLift: 4, flutter: 1, expr: E('scream', 'wide', 1) })],
  [3.75, () => FP({ roll: -28, px: -12, py: -12, hd: 6, armL: [70, 120], armR: [100, 170], legL: [40, 10], legR: [-60, -20], staff: 'angle', staffAng: 160, flutter: 1, expr: E('grit', 'wide', -0.3) })],
  [3.96, () => FP({ roll: 0, armL: [40, 100], armR: [40, 100], staff: 'angle', staffAng: 170, expr: E('o', 'wide', 0.5) })],
  // 英雄正面
  [9.4, () => FP({ hd: -6, armL: [22, 12], armR: [48, -38], staff: 'toCam', flutter: 1, expr: E('smug', 'squint', 0.9) })],
  [10.4, () => FP({ hd: -6, armL: [22, 12], armR: [48, -38], staff: 'toCam', flutter: 1, expr: E('smug', 'squint', 0.9) })],
];

function blendFront(a: FrontPose, b: FrontPose, u: number): FrontPose {
  const pair = (x: [number, number], y: [number, number]): [number, number] => [lerp(x[0], y[0], u), lerp(x[1], y[1], u)];
  return {
    px: lerp(a.px, b.px, u),
    py: lerp(a.py, b.py, u),
    roll: lerp(a.roll, b.roll, u),
    hd: lerp(a.hd, b.hd, u),
    armL: pair(a.armL, b.armL),
    armR: pair(a.armR, b.armR),
    legL: pair(a.legL, b.legL),
    legR: pair(a.legR, b.legR),
    staff: u < 0.5 ? a.staff : b.staff,
    staffAng: lerp(a.staffAng, b.staffAng, u),
    flutter: lerp(a.flutter, b.flutter, u),
    hatLift: lerp(a.hatLift, b.hatLift, u),
    expr: u < 0.5 ? a.expr : b.expr,
  };
}

export function afantiFrontPose(t: number): FrontPose {
  const K = FRONT_KEYS;
  if (t <= K[0][0]) return K[0][1](t);
  for (let i = 0; i < K.length - 1; i++) {
    const [t0, f0] = K[i];
    const [t1, f1] = K[i + 1];
    if (t <= t1) return blendFront(f0(t), f1(t), smooth((t - t0) / (t1 - t0)));
  }
  return K[K.length - 1][1](t);
}

// ------------------------------------------------------------------ 毛驴表情

export function donkeyExtras(t: number) {
  let mouthOpen = 0;
  for (const b of BRAYS) {
    if (t >= b.t && t <= b.t + b.len) {
      const u = (t - b.t) / b.len;
      mouthOpen = Math.max(mouthOpen, Math.abs(Math.sin(u * Math.PI * 3)) * Math.sin(u * Math.PI));
    }
  }
  const earFlop = keyed(t, [[0, 0.8], [0.6, 0.2], [2, -0.2], [5.8, 0.9], [6.6, 0.3], [8.2, -0.9], [10.7, -0.9], [11.2, 0.1], [12, 0.5]]);
  const eye: 'normal' | 'wide' | 'calm' = t > 11.3 ? 'calm' : (t > 5.8 && t < 6.4) || t < 0.5 ? 'wide' : 'normal';
  return { earFlop: clamp(earFlop, -1, 1), mouthOpen, eye, t };
}
