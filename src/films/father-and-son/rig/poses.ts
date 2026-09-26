import { TAU, Vec, add, clamp, easeInOut, lerp, v } from '../lib/math';
import { Build, Pose, armTo, legLen, legTo, standHipY } from './skeleton';

export const stand = (b: Build, o: Partial<Pose> = {}): Pose => ({
  hip: v(0, standHipY(b)),
  lean: 0.03,
  head: 0,
  armF: [-0.06, 0.12],
  armN: [0.05, 0.14],
  legF: [-0.04, 0.02],
  legN: [0.05, 0.03],
  ...o,
});

export interface GaitOpts {
  stride: number; // fraction of leg length
  duty: number; // fraction of the cycle a foot is planted
  lift: number; // swing-foot lift, fraction of leg length
  lean: number;
  bob: number; // fraction of height
  armSwing: number;
  elbow: number;
  crouch: number; // lowers the hips, fraction of leg length
  head: number;
}

export const WALK: GaitOpts = { stride: 0.62, duty: 0.6, lift: 0.1, lean: 0.06, bob: 0.012, armSwing: 0.38, elbow: 0.25, crouch: 0.04, head: 0.02 };
export const RUN: GaitOpts = { stride: 1.15, duty: 0.36, lift: 0.4, lean: 0.24, bob: 0.03, armSwing: 0.85, elbow: 1.35, crouch: 0.1, head: 0.05 };
export const SHUFFLE: GaitOpts = { stride: 0.34, duty: 0.66, lift: 0.05, lean: 0.34, bob: 0.006, armSwing: 0.12, elbow: 0.5, crouch: 0.09, head: 0.1 };
export const TODDLE: GaitOpts = { stride: 0.7, duty: 0.55, lift: 0.14, lean: 0.05, bob: 0.02, armSwing: 0.5, elbow: 0.3, crouch: 0.05, head: 0.0 };

/** Cycle phase from distance travelled — keeps planted feet from sliding. */
export const gaitPhase = (b: Build, dist: number, g: GaitOpts) => (dist * g.duty) / (g.stride * legLen(b));

const footTarget = (b: Build, q: number, g: GaitOpts): Vec => {
  const L = legLen(b);
  const S = g.stride * L;
  const f = ((q % 1) + 1) % 1;
  if (f < g.duty) {
    const s = f / g.duty;
    return v(lerp(S / 2, -S / 2, s), -b.footH);
  }
  const s = (f - g.duty) / (1 - g.duty);
  return v(lerp(-S / 2, S / 2, easeInOut(s)), -b.footH - g.lift * L * Math.sin(Math.PI * s));
};

/** Walk / run / shuffle — procedural foot placement with two-bone IK. */
export const gait = (b: Build, phase: number, g: GaitOpts = WALK, amount = 1): Pose => {
  const L = legLen(b);
  const p = phase;
  // Hips dip when both feet are spread (p = 0, 0.5) and rise mid-stride.
  const bob = g.bob * b.H * Math.cos(2 * TAU * p);
  const hipY = standHipY(b) + g.crouch * L + bob;
  const hip = v(0, lerp(standHipY(b), hipY, amount));
  const idle = stand(b);
  const nearT = footTarget(b, p, g);
  const farT = footTarget(b, p + 0.5, g);
  const legN = legTo(b, hip, v(nearT.x * amount, lerp(-b.footH, nearT.y, amount)));
  const legF = legTo(b, hip, v(farT.x * amount, lerp(-b.footH, farT.y, amount)));
  const swing = Math.cos(TAU * p) * g.armSwing * amount;
  const pose: Pose = {
    hip,
    lean: lerp(idle.lean, g.lean, amount),
    head: g.head,
    armN: [-swing, g.elbow + Math.max(0, -swing) * 0.3],
    armF: [swing, g.elbow + Math.max(0, swing) * 0.3],
    legN,
    legF,
    footN: 0,
    footF: 0,
  };
  return pose;
};

/** Crouch / kneel on the near knee — for hugs and planting the willow twig. */
export const kneel = (b: Build, depth = 1, o: Partial<Pose> = {}): Pose => {
  const d = clamp(depth);
  const hipY = lerp(standHipY(b), -(b.shin * 0.95 + b.footH), d);
  const hip = v(lerp(0, -b.thigh * 0.15, d), hipY);
  const legN = legTo(b, hip, v(lerp(0.05 * b.H, b.thigh * 0.62, d), -b.footH));
  const knee = v(lerp(-0.02 * b.H, -b.thigh * 0.1, d), lerp(-b.footH - b.shin, -b.legW * 0.5, d));
  const legF = legTo(b, hip, v(knee.x - b.shin * d * 0.95, lerp(-b.footH, -b.legW * 0.5, d)));
  return {
    hip,
    lean: lerp(0.04, 0.18, d),
    head: 0.05,
    armF: [0.1, 0.3],
    armN: [0.2, 0.3],
    legN,
    legF,
    footN: 0,
    footF: lerp(0, -1.2, d),
    ...o,
  };
};

/** Arms reaching to world-local targets (hands), keeping the rest of the pose. */
export const reach = (b: Build, p: Pose, handN?: Vec, handF?: Vec, bend: 1 | -1 = -1): Pose => ({
  ...p,
  armN: handN ? armTo(b, p, handN, bend) : p.armN,
  armF: handF ? armTo(b, p, handF, bend) : p.armF,
});

/** Sculling the yuloh at the stern: rock forward and back, hands on the moving handle. */
export const scull = (b: Build, phase: number, handle: Vec): Pose => {
  const s = Math.sin(TAU * phase);
  const hip = v(-b.H * 0.02 * s, standHipY(b) + b.H * 0.02);
  const pose: Pose = {
    hip,
    lean: 0.1 + 0.12 * s,
    head: -0.05,
    armF: [0, 0],
    armN: [0, 0],
    legN: legTo(b, hip, v(b.H * 0.12, -b.footH)),
    legF: legTo(b, hip, v(-b.H * 0.12, -b.footH)),
  };
  return reach(b, pose, handle, add(handle, v(-b.H * 0.02, b.H * 0.01)));
};

/** Lying curled on one side, knees drawn up. */
export const curled = (b: Build, breathe = 0): Pose => ({
  hip: v(0, -b.depth * 0.5),
  lean: -1.5 + breathe * 0.02,
  head: 0.25,
  armF: [-2.3, 1.2],
  armN: [-2.0, 1.4],
  legF: [2.1, 2.2],
  legN: [2.3, 2.4],
  footF: 0.3,
  footN: 0.3,
});

/** Old man's stoop blended into any pose. */
export const withStoop = (p: Pose, s: number): Pose => ({ ...p, lean: p.lean + s * 0.32, head: p.head - s * 0.1 });
