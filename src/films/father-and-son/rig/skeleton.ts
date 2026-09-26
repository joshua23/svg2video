import { Vec, add, angleFromDown, down, ik, lerp, mul, sub, v, vlerp } from '../lib/math';

export type Hat = 'none' | 'douli' | 'cap' | 'hood';
export type Garment = 'jacket' | 'coat' | 'dress' | 'shirt' | 'padded';
export type Hair = 'short' | 'braids' | 'bun' | 'none';

/** Body proportions, in pixels. The figure's origin is the ground point beneath its hips. */
export interface Build {
  H: number;
  headR: number;
  neck: number;
  torso: number;
  thigh: number;
  shin: number;
  upper: number;
  fore: number;
  foot: number;
  footH: number;
  shoulderW: number;
  hipW: number;
  depth: number;
  legW: number;
  armW: number;
  hat: Hat;
  garment: Garment;
  hair: Hair;
  satchel?: boolean;
}

export type Kind = 'man' | 'woman' | 'boy' | 'teen' | 'elder';

type Ratios = Pick<Build, 'headR' | 'neck' | 'torso' | 'thigh' | 'shin' | 'upper' | 'fore' | 'foot' | 'footH' | 'shoulderW' | 'hipW' | 'depth' | 'legW' | 'armW'>;

const RATIOS: Record<Kind, Ratios> = {
  man: {
    headR: 0.063, neck: 0.03, torso: 0.3, thigh: 0.245, shin: 0.24, upper: 0.175, fore: 0.17,
    foot: 0.075, footH: 0.03, shoulderW: 0.25, hipW: 0.17, depth: 0.125, legW: 0.066, armW: 0.05,
  },
  woman: {
    headR: 0.066, neck: 0.032, torso: 0.29, thigh: 0.25, shin: 0.24, upper: 0.17, fore: 0.165,
    foot: 0.07, footH: 0.03, shoulderW: 0.22, hipW: 0.18, depth: 0.115, legW: 0.06, armW: 0.044,
  },
  teen: {
    headR: 0.068, neck: 0.03, torso: 0.29, thigh: 0.245, shin: 0.24, upper: 0.17, fore: 0.165,
    foot: 0.075, footH: 0.03, shoulderW: 0.23, hipW: 0.16, depth: 0.115, legW: 0.062, armW: 0.046,
  },
  boy: {
    headR: 0.085, neck: 0.024, torso: 0.285, thigh: 0.215, shin: 0.205, upper: 0.16, fore: 0.155,
    foot: 0.08, footH: 0.032, shoulderW: 0.26, hipW: 0.19, depth: 0.14, legW: 0.078, armW: 0.058,
  },
  elder: {
    headR: 0.064, neck: 0.03, torso: 0.3, thigh: 0.24, shin: 0.235, upper: 0.175, fore: 0.17,
    foot: 0.075, footH: 0.03, shoulderW: 0.24, hipW: 0.17, depth: 0.13, legW: 0.056, armW: 0.044,
  },
};

export const makeBuild = (kind: Kind, H: number, extra: Partial<Build> = {}): Build => {
  const r = RATIOS[kind];
  const scaled = Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x * H])) as Ratios;
  return {
    H,
    ...scaled,
    hat: 'none',
    garment: kind === 'woman' ? 'dress' : 'jacket',
    hair: kind === 'woman' ? 'braids' : 'short',
    ...extra,
  };
};

/** Blend two builds (used when the old man grows young again). */
export const blendBuild = (a: Build, b: Build, t: number): Build => {
  const out = { ...(t < 0.5 ? a : b) } as Build;
  (Object.keys(a) as (keyof Build)[]).forEach((k) => {
    const va = a[k];
    const vb = b[k];
    if (typeof va === 'number' && typeof vb === 'number') (out[k] as number) = lerp(va, vb, t);
  });
  return out;
};

export const legLen = (b: Build) => b.thigh + b.shin;
export const standHipY = (b: Build) => -(b.thigh + b.shin + b.footH) * 0.995;

/** Side-view pose in angles. Angles are measured from straight down, positive = forward (+x). */
export interface Pose {
  hip: Vec;
  lean: number;
  head: number;
  /** [shoulder, elbow bend] — far arm then near arm. */
  armF: [number, number];
  armN: [number, number];
  /** [hip, knee bend] — far leg then near leg. */
  legF: [number, number];
  legN: [number, number];
  footF?: number;
  footN?: number;
  /** Shortens the thighs, for legs pointing at the camera (sitting sideways). */
  thighScale?: number;
}

interface Limb {
  a: Vec;
  b: Vec;
  c: Vec;
  d?: Vec;
}

/** Joint positions; everything a renderer needs. Interpolating two Skels morphs between views. */
export interface Skel {
  hipA: Vec;
  hipB: Vec;
  shA: Vec;
  shB: Vec;
  hipC: Vec;
  neck: Vec;
  head: Vec;
  tilt: number;
  armF: Limb;
  armN: Limb;
  legF: Limb;
  legN: Limb;
}

const up = (a: number): Vec => ({ x: Math.sin(a), y: -Math.cos(a) });
const fwd = (a: number): Vec => ({ x: Math.cos(a), y: Math.sin(a) });

export const fk = (b: Build, p: Pose): Skel => {
  const hipC = p.hip;
  const shC = add(hipC, mul(up(p.lean), b.torso));
  const perp = fwd(p.lean);
  const neck = add(shC, mul(up(p.lean + p.head * 0.5), b.neck));
  const head = add(neck, mul(up(p.lean + p.head), b.headR * 0.95));
  const thigh = b.thigh * (p.thighScale ?? 1);

  const leg = (l: [number, number], foot = 0): Limb => {
    const knee = add(hipC, mul(down(l[0]), thigh));
    const ank = add(knee, mul(down(l[0] - l[1]), b.shin));
    const toe = add(ank, v(Math.cos(-foot) * b.foot, Math.sin(-foot) * b.foot));
    return { a: hipC, b: knee, c: ank, d: toe };
  };
  const arm = (a: [number, number]): Limb => {
    const el = add(shC, mul(down(a[0]), b.upper));
    const hand = add(el, mul(down(a[0] + a[1]), b.fore));
    return { a: shC, b: el, c: hand };
  };

  return {
    hipA: add(hipC, mul(perp, -b.depth * 0.5)),
    hipB: add(hipC, mul(perp, b.depth * 0.45)),
    shA: add(shC, mul(perp, -b.depth * 0.55)),
    shB: add(shC, mul(perp, b.depth * 0.5)),
    hipC,
    neck,
    head,
    tilt: p.lean + p.head,
    armF: arm(p.armF),
    armN: arm(p.armN),
    legF: leg(p.legF, p.footF),
    legN: leg(p.legN, p.footN),
  };
};

export const shoulderOf = (b: Build, p: Pose) => add(p.hip, mul(up(p.lean), b.torso));

/** Solve an arm so the hand lands on `target`; returns [shoulder, elbow] angles. */
export const armTo = (b: Build, p: Pose, target: Vec, bend: 1 | -1 = -1): [number, number] => {
  const sh = shoulderOf(b, p);
  const el = ik(sh, target, b.upper, b.fore, bend);
  const s = angleFromDown(sub(el, sh));
  const f = angleFromDown(sub(target, el));
  return [s, f - s];
};

/** Solve a leg so the ankle lands on `target`; returns [hip, knee] angles. */
export const legTo = (b: Build, hip: Vec, target: Vec, thighScale = 1): [number, number] => {
  const t = b.thigh * thighScale;
  const knee = ik(hip, target, t, b.shin, 1);
  const h = angleFromDown(sub(knee, hip));
  const s = angleFromDown(sub(target, knee));
  return [h, h - s];
};

export const blendPose = (a: Pose, b: Pose, t: number): Pose => ({
  hip: vlerp(a.hip, b.hip, t),
  lean: lerp(a.lean, b.lean, t),
  head: lerp(a.head, b.head, t),
  armF: [lerp(a.armF[0], b.armF[0], t), lerp(a.armF[1], b.armF[1], t)],
  armN: [lerp(a.armN[0], b.armN[0], t), lerp(a.armN[1], b.armN[1], t)],
  legF: [lerp(a.legF[0], b.legF[0], t), lerp(a.legF[1], b.legF[1], t)],
  legN: [lerp(a.legN[0], b.legN[0], t), lerp(a.legN[1], b.legN[1], t)],
  footF: lerp(a.footF ?? 0, b.footF ?? 0, t),
  footN: lerp(a.footN ?? 0, b.footN ?? 0, t),
  thighScale: lerp(a.thighScale ?? 1, b.thighScale ?? 1, t),
});

const lerpLimb = (a: Limb, b: Limb, t: number): Limb => ({
  a: vlerp(a.a, b.a, t),
  b: vlerp(a.b, b.b, t),
  c: vlerp(a.c, b.c, t),
  d: a.d && b.d ? vlerp(a.d, b.d, t) : undefined,
});

export const blendSkel = (a: Skel, b: Skel, t: number): Skel => ({
  hipA: vlerp(a.hipA, b.hipA, t),
  hipB: vlerp(a.hipB, b.hipB, t),
  shA: vlerp(a.shA, b.shA, t),
  shB: vlerp(a.shB, b.shB, t),
  hipC: vlerp(a.hipC, b.hipC, t),
  neck: vlerp(a.neck, b.neck, t),
  head: vlerp(a.head, b.head, t),
  tilt: lerp(a.tilt, b.tilt, t),
  armF: lerpLimb(a.armF, b.armF, t),
  armN: lerpLimb(a.armN, b.armN, t),
  legF: lerpLimb(a.legF, b.legF, t),
  legN: lerpLimb(a.legN, b.legN, t),
});

/**
 * Seen from behind (or in front): symmetrical, arms at the sides.
 * `sway` shifts weight, `headTurn` slides the head sideways a touch.
 */
export const backSkel = (b: Build, opts: { sway?: number; headTurn?: number; armsOut?: number; stoop?: number } = {}): Skel => {
  const { sway = 0, headTurn = 0, armsOut = 0, stoop = 0 } = opts;
  const hipY = standHipY(b) + Math.abs(sway) * b.H * 0.01;
  const hipC = v(sway * b.H * 0.02, hipY);
  const sh = v(hipC.x, hipY - b.torso * (1 - stoop * 0.12));
  const hw = b.hipW / 2;
  const sw = b.shoulderW / 2;
  const neck = v(sh.x + headTurn * b.headR * 0.2, sh.y - b.neck + stoop * b.headR * 0.8);
  const head = v(neck.x + headTurn * b.headR * 0.3, neck.y - b.headR * 0.95);
  const leg = (side: -1 | 1): Limb => {
    const hip = v(hipC.x + side * hw * 0.55, hipY);
    const ank = v(side * hw * 0.62, -b.footH);
    const knee = v(lerp(hip.x, ank.x, 0.5) + side * b.H * 0.004, lerp(hip.y, ank.y, 0.5));
    return { a: hip, b: knee, c: ank, d: v(ank.x + side * b.foot * 0.25, ank.y + b.footH * 0.3) };
  };
  const arm = (side: -1 | 1): Limb => {
    const s = v(sh.x + side * sw * 0.86, sh.y + b.H * 0.012);
    const out = armsOut * side;
    const el = add(s, mul(v(Math.sin(out * 0.4 + side * 0.08), Math.cos(out * 0.4)), b.upper));
    const hand = add(el, mul(v(Math.sin(out * 0.6 + side * 0.03), Math.cos(out * 0.6)), b.fore));
    return { a: s, b: el, c: hand };
  };
  return {
    hipA: v(hipC.x - hw, hipY),
    hipB: v(hipC.x + hw, hipY),
    shA: v(sh.x - sw, sh.y),
    shB: v(sh.x + sw, sh.y),
    hipC,
    neck,
    head,
    tilt: 0,
    armF: arm(-1),
    armN: arm(1),
    legF: leg(-1),
    legN: leg(1),
  };
};

/** Turning round: pass through a back view around the moment `flip` when facing changes sides. */
export const turning = (b: Build, pose: Pose, t: number, flip: number, w = 0.35): Skel | undefined => {
  const k = Math.max(0, Math.min(1, 1 - Math.abs(t - flip) / w));
  return k > 0 ? blendSkel(fk(b, pose), backSkel(b), k * k * (3 - 2 * k)) : undefined;
};
