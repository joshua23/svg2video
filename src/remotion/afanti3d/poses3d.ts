/**
 * 把 2D 版的姿势数据（侧面骨骼角度 / 正面骨骼角度）转换成 3D 骨骼。
 * 动作设计完全沿用 2D 版，3D 相机从任何角度都能看到同一个动作。
 */
import type { ProfilePose } from '../afanti/rig/afantiProfile';
import type { FrontPose } from '../afanti/rig/front';
import { afantiFrontPose, afantiHugPose, afantiProfilePose } from '../afanti/poses';
import { T } from '../afanti/plan';
import { Pose3, T3, dir3 } from './rig3d';

const DEG = Math.PI / 180;
const nrm = (v: T3): T3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export function fromProfile(p: ProfilePose): Pose3 {
  const spread = p.spread ?? 0.42;
  return {
    pos: [p.px / 100, -p.py / 100, 0],
    pitch: -p.R * DEG,
    roll: 0,
    tl: p.tl,
    hd: p.hd,
    headRoll: 0,
    armN: { a1: p.aN1, a2: p.aN2, b1: 0.14, b2: 0.05 },
    armF: { a1: p.aF1, a2: p.aF2, b1: 0.14, b2: 0.05 },
    legN: { a1: p.lN1, a2: p.lN2, b1: spread, b2: spread * 0.25 },
    legF: { a1: p.lF1, a2: p.lF2, b1: spread, b2: spread * 0.25 },
    staff: p.staff > 0.5 ? dir3(p.sa, 0, 1) : null,
    expr: p.expr,
    hatLift: p.hatLift / 100,
    flutter: p.flutter,
  };
}

/** 正面骨骼：角度在画面平面内（0=下，正=向外），他的右侧（画面左）= +z */
export function fromFront(f: FrontPose): Pose3 {
  const arm = (a: number, side: number): T3 => nrm([0.18, -Math.cos(a * DEG), side * Math.sin(a * DEG)]);
  const leg = (a: number, side: number, fwd: number): T3 => nrm([Math.sin(fwd * DEG), -Math.cos(a * DEG) * Math.cos(fwd * DEG), side * Math.sin(a * DEG)]);
  let staff: T3 | null = null;
  if (f.staff === 'toCam') staff = nrm([1, 0.12, 0]);
  else if (f.staff === 'angle') staff = nrm([0.2, -Math.cos(f.staffAng * DEG), -Math.sin(f.staffAng * DEG)]);
  return {
    pos: [0, -f.py / 100 - 0.04, -f.px / 100],
    pitch: 0,
    roll: -f.roll * DEG,
    tl: 0,
    hd: 0,
    headRoll: -f.hd * DEG,
    armN: { a1: 0, a2: 0, b1: 0, b2: 0, d1: arm(f.armL[0], 1), d2: arm(f.armL[1], 1) },
    armF: { a1: 0, a2: 0, b1: 0, b2: 0, d1: arm(f.armR[0], -1), d2: arm(f.armR[1], -1) },
    legN: { a1: 0, a2: 0, b1: 0, b2: 0, d1: leg(f.legL[0], 1, 28), d2: leg(f.legL[1], 1, -5) },
    legF: { a1: 0, a2: 0, b1: 0, b2: 0, d1: leg(f.legR[0], -1, 28), d2: leg(f.legR[1], -1, -5) },
    staff,
    expr: f.expr,
    hatLift: f.hatLift / 100,
    flutter: f.flutter,
  };
}

/** 骑在驴上时（撞击前）的姿势 */
export function riderPose3(t: number): Pose3 {
  if (t >= 2.0 && t < 3.96) return fromFront(afantiFrontPose(t));
  return fromProfile(afantiProfilePose(t));
}

/** 撞击后吊在叶板下的姿势 */
export function hangPose3(t: number) {
  const p = afantiHugPose(t);
  const pose = fromProfile(p);
  // 双臂向两侧张开，不挡住脸
  pose.armN = { ...pose.armN, b1: 0.38, b2: 0.1 };
  pose.armF = { ...pose.armF, b1: 0.38, b2: 0.1 };
  return { pose, squash: p.squash, t: Math.max(t, T.impact) };
}
