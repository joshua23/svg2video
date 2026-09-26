import { v, add } from '../lib/math';
import { BikeGeom } from './Bicycle';
import { Build, Pose, armTo, legTo } from './skeleton';

/** Rider on the saddle, feet on the pedals, hands on the grips. */
export const ride = (b: Build, g: BikeGeom, o: { lean?: number; head?: number; stand?: number; handsOff?: boolean } = {}): Pose => {
  const lean = o.lean ?? 0.2;
  const hip = add(g.saddle, v(0, -(o.stand ?? 0) * b.H * 0.08));
  const pose: Pose = {
    hip,
    lean,
    head: o.head ?? -0.12,
    armF: [0.4, 0.5],
    armN: [0.4, 0.5],
    legN: legTo(b, hip, add(g.pedalN, v(-b.foot * 0.35, -b.footH * 0.9))),
    legF: legTo(b, hip, add(g.pedalF, v(-b.foot * 0.35, -b.footH * 0.9))),
    footN: 0.1,
    footF: 0.1,
  };
  if (!o.handsOff) {
    pose.armN = armTo(b, pose, g.grip, -1);
    pose.armF = armTo(b, pose, add(g.grip, v(g.m * 0.03, -g.m * 0.01)), -1);
  }
  return pose;
};

/** A small child perched on the top tube in front of the rider, holding the stem. */
export const perch = (b: Build, g: BikeGeom, swing = 0): Pose => {
  const hip = add(g.bar, v(0, -b.H * 0.05));
  const pose: Pose = {
    hip,
    lean: 0.06,
    head: 0.02,
    armF: [0.6, 0.4],
    armN: [0.6, 0.4],
    legN: [0.35 + swing * 0.2, 0.75 - swing * 0.2],
    legF: [0.25 - swing * 0.2, 0.7 + swing * 0.2],
  };
  pose.armN = armTo(b, pose, g.stem, -1);
  pose.armF = armTo(b, pose, add(g.stem, v(g.m * 0.02, 0)), -1);
  return pose;
};

/** Riding side-saddle on the rear rack, legs dangling toward the camera. */
export const sideSaddle = (b: Build, g: BikeGeom, swing = 0, riderWaist?: { x: number; y: number }): Pose => {
  const hip = add(g.rack, v(0, -b.H * 0.03));
  const pose: Pose = {
    hip,
    lean: 0.02,
    head: 0.05,
    armF: [0.5, 0.9],
    armN: [0.2, 1.4],
    legN: [0.9 + swing * 0.12, 1.25 + swing * 0.1],
    legF: [0.8 - swing * 0.12, 1.2 - swing * 0.1],
    thighScale: 0.55,
  };
  if (riderWaist) pose.armF = armTo(b, pose, riderWaist, -1);
  return pose;
};

/** Stopped, still on the saddle, near foot down on the road. */
export const astride = (b: Build, g: BikeGeom, o: { lean?: number; head?: number } = {}): Pose => {
  const hip = add(g.saddle, v(b.H * 0.05, b.H * 0.03));
  const pose: Pose = {
    hip,
    lean: o.lean ?? 0.08,
    head: o.head ?? 0,
    armF: [0.4, 0.5],
    armN: [0.4, 0.5],
    legN: legTo(b, hip, v(g.bb.x + b.H * 0.06, -b.footH)),
    legF: legTo(b, hip, add(g.pedalF, v(-b.foot * 0.35, -b.footH * 0.9))),
    footF: 0.1,
  };
  pose.armN = armTo(b, pose, g.grip, -1);
  pose.armF = armTo(b, pose, add(g.grip, v(g.m * 0.03, -g.m * 0.01)), -1);
  return pose;
};

/** Walking beside the bicycle, hands on the grips; `offset` = figure origin relative to the bike. */
export const pushing = (b: Build, g: BikeGeom, walk: Pose, offset: number): Pose => {
  const p = { ...walk, lean: walk.lean + 0.06 };
  p.armN = armTo(b, p, v(g.grip.x - offset, g.grip.y), -1);
  p.armF = armTo(b, p, v(g.grip.x - offset + g.m * 0.03, g.grip.y - g.m * 0.01), -1);
  return p;
};

/**
 * 掏裆 — how a child rides an adult's bike: one leg through the frame, body hanging
 * below the top tube, arms stretched up to the bars.
 */
export const taodang = (b: Build, g: BikeGeom): Pose => {
  const hip = v(g.bb.x - g.m * 0.08, -(b.thigh + b.shin) * 0.9 - b.footH - g.m * 0.1);
  const pose: Pose = {
    hip,
    lean: 0.22,
    head: -0.1,
    armF: [0.8, 0.3],
    armN: [0.8, 0.3],
    legN: legTo(b, hip, add(g.pedalN, v(-b.foot * 0.3, -b.footH * 0.9))),
    legF: legTo(b, hip, add(g.pedalF, v(-b.foot * 0.3, -b.footH * 0.9))),
    footN: 0.1,
    footF: 0.1,
  };
  pose.armN = armTo(b, pose, g.grip, -1);
  pose.armF = armTo(b, pose, add(g.grip, v(g.m * 0.03, -g.m * 0.01)), -1);
  return pose;
};
