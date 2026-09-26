import React from 'react';
import timeline from '../timeline.json';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { BIKE_M, FRIEND_A, FRIEND_B, GRANDSON, SON, WIFE } from '../cast';
import { Cam } from '../lib/camera';
import { LOOKS } from '../lib/look';
import { Vec, lerp, mix, noise, track, v, win } from '../lib/math';
import { CREST } from '../lib/stage';
import { Actor } from '../rig/Actor';
import { Bicycle, bikeGeom, crankFor } from '../rig/Bicycle';
import { phase, travel } from '../rig/moves';
import { SHUFFLE, gait, gaitPhase, kneel, reach, stand, withStoop } from '../rig/poses';
import { astride, perch, pushing, ride, sideSaddle } from '../rig/riding';
import { Build, Pose, backSkel, blendPose, blendSkel, fk, standHipY } from '../rig/skeleton';
import { Card } from '../scenery/Card';
import { DikeSet, SPOT, WILLOW_X } from '../scenery/DikeSet';
import { Leaves } from '../scenery/Weather';

const GROUND = CREST + 2;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, t: frame / fps };
};

const local = (p: Vec, ox: number, f: 1 | -1): Vec => v((p.x - ox) * f, p.y - GROUND);
const world = (p: Vec, ox: number, f: 1 | -1): Vec => v(ox + p.x * f, p.y + GROUND);

/** A bicycle that arrives, waits and leaves again. */
const bikeRun = (t: number, arrive: [number, number], leave: [number, number], x0: number, xStop: number, x1: number, ramp = 2) => {
  const a = travel(t, arrive[0], arrive[1], x0, xStop, ramp);
  const l = travel(t, leave[0], leave[1], xStop, x1, ramp);
  const leaving = t >= leave[0];
  return { x: leaving ? l.x : a.x, dist: a.dist + (leaving ? l.dist : 0), stopped: t >= arrive[1] - 0.3 && t < leave[0] + 0.3, moving: leaving ? l.moving : a.moving };
};

/**
 * Lifting a child between the crossbar (u = 0) and the ground at `gx` (u = 1).
 * Returns the child's actor state for that moment.
 */
const carried = (b: Build, bikeX: number, m: number, gx: number, u: number, gFacing: 1 | -1) => {
  const g = bikeGeom(m, 0);
  const pp = perch(b, g, 0);
  const from = world(pp.hip, bikeX, 1);
  const to = v(gx, GROUND + standHipY(b));
  const hipW = v(lerp(from.x, to.x, u), lerp(from.y, to.y, u) - Math.sin(Math.PI * u) * b.H * 0.35);
  const facing: 1 | -1 = u < 0.5 ? 1 : gFacing;
  const ox = lerp(bikeX, gx, u);
  const dangle = stand(b, { legN: [0.25, 0.3], legF: [0.05, 0.2], armN: [0.5, 0.4], armF: [0.4, 0.4] });
  const p = blendPose(pp, dangle, Math.sin(Math.PI * u));
  const q = u < 0.5 ? p : blendPose(p, stand(b), (u - 0.5) * 2);
  q.hip = local(hipW, ox, facing);
  return { b, pose: q, x: ox, facing };
};

// ---------------------------------------------------------------- 立夏 youth

export const YOUTH_SEC = timeline.scenes.youth;

export const Youth: React.FC = () => {
  const { t } = useT();
  const look = LOOKS.youth;
  const m = BIKE_M * 0.97;
  const stopX = WILLOW_X - 118;
  const me = bikeRun(t, [0, 8], [14.2, 22], SPOT - 1100, stopX, SPOT + 1100, 2.2);
  const fa = bikeRun(t, [0.4, 10], [15, 22.4], SPOT - 900, SPOT + 470, SPOT + 1500, 2.5);
  const fb = bikeRun(t, [0, 10.5], [15.6, 22.6], SPOT - 780, SPOT + 610, SPOT + 1650, 2.5);
  const riders = [
    { b: SON.teen, r: me, weave: 0 },
    { b: FRIEND_A, r: fa, weave: 1 },
    { b: FRIEND_B, r: fb, weave: 2 },
  ];
  const cam: Cam = {
    x: track(t, [
      [0, SPOT - 700],
      [8, SPOT - 40],
      [14, SPOT + 60],
      [22, SPOT + 700],
    ]),
    y: 580,
    zoom: track(t, [
      [0, 1.35],
      [9, 1.7],
      [14, 1.7],
      [20, 1.3],
    ]),
  };
  const crest = (ink: string) => (
    <>
      {riders.map(({ b, r, weave }, i) => {
        const g = bikeGeom(m, crankFor(r.dist, m));
        const stopped = i === 0 ? phase(t, 7.4, 8.3) - phase(t, 13.8, 14.4) : phase(t, 9 + i * 0.4, 10 + i * 0.5) - phase(t, 14.8 + i * 0.4, 15.4 + i * 0.4);
        let p = blendPose(ride(b, g, { lean: 0.2 }), astride(b, g, { head: i === 0 ? 0.08 : -0.05 }), stopped);
        // the friends look back and ring their bells; one waves
        if (i === 1 && t > 11 && t < 14.8) p = { ...p, armN: [lerp(p.armN[0], -2.6, phase(t, 11.2, 11.6) - phase(t, 13.6, 14.2)) + Math.sin(t * 9) * 0.25, 0.3] };
        const tilt = Math.sin(t * 1.3 + weave * 2) * 1.2 * (1 - stopped);
        return (
          <g key={i}>
            <Bicycle x={r.x} y={GROUND} m={m} color={ink} dist={r.dist} tilt={tilt} facing={1} />
            <Actor a={{ b, pose: p, x: r.x, facing: 1 }} y={GROUND} ink={ink} t={t} />
          </g>
        );
      })}
    </>
  );
  return (
    <DikeSet
      look={look}
      t={t}
     
      cam={cam}
      wind={0.3}
      leaf={0.9}
      willow={0.2}
      crest={crest}
      front={<Card t={t} text="立夏" color={look.ink} halo={look.skyLow} />}
    />
  );
};

// ---------------------------------------------------------------- 小暑 courtship

export const COURTSHIP_SEC = timeline.scenes.courtship;

export const Courtship: React.FC = () => {
  const { t } = useT();
  const look = LOOKS.courtship;
  const Y = SON.young;
  const Wf = WIFE;
  const m = BIKE_M;
  const stopX = WILLOW_X - 150;
  const bk = bikeRun(t, [0, 9], [20.2, 25.5], SPOT - 1000, stopX, SPOT + 700, 2.6);
  const g = bikeGeom(m, crankFor(bk.dist, m));
  // him: ride → astride → off beside the bike → stand looking out → back on
  const off = phase(t, 10.6, 11.6) - phase(t, 18.8, 19.8);
  const himX = lerp(bk.x, stopX + 58, off);
  const onBike = blendPose(ride(Y, g, { lean: 0.16 }), astride(Y, g), phase(t, 8.2, 9.2) - phase(t, 19.8, 20.6));
  const him = blendPose(onBike, stand(Y), off);
  // her: side-saddle → hop down → stand beside him → hop back up
  const down = phase(t, 9.6, 10.6) - phase(t, 19.2, 20.2);
  const herGx = stopX + 92;
  const rackW = world(sideSaddle(Wf, g).hip, bk.x, 1);
  const herStand = v(herGx, GROUND + standHipY(Wf));
  const hipW = v(lerp(rackW.x, herStand.x, down), lerp(rackW.y, herStand.y, down) - Math.sin(Math.PI * down) * 10);
  const herOx = lerp(bk.x, herGx, down);
  const waist = local(v(bk.x + g.saddle.x + 10, GROUND + g.saddle.y - Y.H * 0.12), bk.x, 1);
  const her = blendPose(sideSaddle(Wf, g, Math.sin(t * 2) * 0.5, waist), stand(Wf), down);
  her.hip = local(hipW, herOx, 1);
  // both turn to face the river; she leans her head on his shoulder
  const back = phase(t, 12, 13) - phase(t, 17.8, 18.8);
  const lean = phase(t, 13.6, 15) - phase(t, 17, 17.8);
  const himSkel = blendSkel(fk(Y, him), backSkel(Y, { sway: 0.1 }), back);
  const herBack = backSkel(Wf, { sway: -0.5 * lean, headTurn: -1.6 * lean });
  const herSkel = blendSkel(fk(Wf, her), herBack, back);
  const crest = (ink: string) => (
    <>
      <Bicycle x={bk.x} y={GROUND} m={m} color={ink} dist={bk.dist} parked={off > 0.5} />
      <Actor a={{ b: Y, skel: himSkel, x: himX, facing: 1 }} y={GROUND} ink={ink} t={t} />
      <Actor a={{ b: Wf, skel: herSkel, x: herOx - lean * 12, facing: 1 }} y={GROUND} ink={ink} t={t} />
    </>
  );
  const cam: Cam = {
    x: track(t, [
      [0, SPOT - 600],
      [9, SPOT - 60],
      [19, SPOT - 30],
      [25, SPOT + 400],
    ]),
    y: track(t, [
      [0, 560],
      [12, 600],
      [19, 600],
      [25, 560],
    ]),
    zoom: track(t, [
      [0, 1.4],
      [10, 1.9],
      [14, 2.4],
      [18, 2.4],
      [23, 1.5],
    ]),
  };
  return (
    <DikeSet look={look} t={t} cam={cam} wind={0.22} leaf={1} willow={0.38} crest={crest} front={<Card t={t} text="小暑" color={look.ink} halo={look.skyLow} />} />
  );
};

// ---------------------------------------------------------------- 寒露 fatherhood

export const FATHERHOOD_SEC = timeline.scenes.fatherhood;

export const Fatherhood: React.FC = () => {
  const { t } = useT();
  const look = LOOKS.fatherhood;
  const D = SON.grown;
  const K = GRANDSON;
  const m = BIKE_M;
  const stopX = WILLOW_X - 170;
  const bk = bikeRun(t, [0, 9], [20.6, 26.5], SPOT - 1000, stopX, SPOT + 700, 2.6);
  const g = bikeGeom(m, crankFor(bk.dist, m));
  const kidX = stopX + 104;
  const dadStand = stopX + 18;
  // the boy: crossbar → ground → crossbar
  const lift = phase(t, 10.4, 11.8);
  const back = phase(t, 18.2, 19.6);
  const u = lift * (1 - back);
  let kid = t < 10.4 || t > 19.6 ? { b: K, pose: perch(K, g, Math.sin(t * 2.4) * 0.8), x: bk.x, facing: 1 as 1 | -1 } : carried(K, bk.x, m, kidX, u, 1);
  // crouch together; the father points out over the river
  const crouch = phase(t, 12.4, 13.4) - phase(t, 17.2, 18);
  const point = phase(t, 13.4, 14.2) - phase(t, 16.6, 17.2);
  const off = phase(t, 9.2, 10.2) - phase(t, 19.8, 20.6);
  const riding = blendPose(ride(D, g, { lean: 0.18 }), astride(D, g), phase(t, 8.2, 9.2) - phase(t, 20.2, 20.8));
  let dad: Pose = blendPose(riding, stand(D), off);
  const dx = lerp(bk.x, dadStand, off);
  if (t > 10 && t < 12.2) {
    const ks = fk(kid.b, kid.pose);
    const chest = local(world(v(ks.hipC.x, (ks.hipC.y + ks.neck.y) / 2), kid.x, kid.facing), dx, 1);
    dad = blendPose(dad, reach(D, { ...dad, lean: 0.12 }, v(chest.x + 4, chest.y), v(chest.x - 2, chest.y + 3)), phase(t, 10, 10.5) * (1 - phase(t, 11.8, 12.2)));
  }
  if (t > 17.8 && t < 20) {
    const ks = fk(kid.b, kid.pose);
    const chest = local(world(v(ks.hipC.x, (ks.hipC.y + ks.neck.y) / 2), kid.x, kid.facing), dx, 1);
    dad = blendPose(dad, reach(D, { ...dad, lean: 0.12 }, v(chest.x + 4, chest.y), v(chest.x - 2, chest.y + 3)), phase(t, 17.8, 18.2) * (1 - phase(t, 19.6, 20)));
  }
  if (crouch > 0) {
    const k = kneel(D, crouch, { head: -0.1 });
    const pt = reach(D, k, v(D.H * 0.62, -D.H * 0.78));
    dad = blendPose(blendPose(dad, k, crouch), pt, point);
    const arm = kid.pose ? kid.pose : stand(K);
    kid = { ...kid, pose: { ...arm, head: lerp(arm.head, -0.25, point), armF: [lerp(arm.armF[0], 0.3, crouch), 0.3] } };
  }
  const crest = (ink: string) => (
    <>
      <Bicycle x={bk.x} y={GROUND} m={m} color={ink} dist={bk.dist} parked={off > 0.5} />
      <Actor a={{ b: D, pose: dad, x: dx, facing: 1 }} y={GROUND} ink={ink} t={t} />
      <Actor a={kid} y={GROUND} ink={ink} t={t} />
    </>
  );
  const cam: Cam = {
    x: track(t, [
      [0, SPOT - 620],
      [9, SPOT - 90],
      [20, SPOT - 60],
      [26, SPOT + 400],
    ]),
    y: track(t, [
      [0, 560],
      [12, 600],
      [20, 600],
      [26, 560],
    ]),
    zoom: track(t, [
      [0, 1.3],
      [10, 1.9],
      [14, 2.2],
      [18, 2.2],
      [24, 1.4],
    ]),
  };
  return (
    <DikeSet look={look} t={t} cam={cam} wind={0.35} leaf={0.8} willow={0.6} crest={crest} front={<Card t={t} text="寒露" color={look.ink} halo={look.skyLow} />} />
  );
};

// ---------------------------------------------------------------- 霜降 old age

export const OLD_AGE_SEC = timeline.scenes.oldAge;

export const OldAge: React.FC = () => {
  const { t } = useT();
  const look = LOOKS.oldAge;
  const O = SON.old;
  const m = BIKE_M;
  const restX = WILLOW_X - 62;
  // pushing the bicycle into the wind
  const a = travel(t, 0, 10, SPOT - 720, SPOT - 330, 1.2);
  const b2 = travel(t, 14.6, 19, SPOT - 330, restX, 1.2);
  const bx = t < 14.6 ? a.x : b2.x;
  const dist = a.dist + (t >= 14.6 ? b2.dist : 0);
  const g = bikeGeom(m, crankFor(dist, m));
  const walking = t < 14.6 ? a : b2;
  const offset = -24;
  const w = withStoop(gait(O, gaitPhase(O, dist, SHUFFLE), SHUFFLE, walking.amount), 0.8);
  let pose = pushing(O, g, w, offset);
  let px = bx + offset;
  // a gust knocks the bicycle over; he bends, rights it
  const fall = win(t, 10, 10.7, (x) => x * x);
  const rise = phase(t, 12.4, 14.2);
  const down = fall * (1 - rise);
  const bend = phase(t, 10.9, 11.8) - phase(t, 13.8, 14.6);
  if (bend > 0) {
    const k = kneel(O, bend * 0.8, { head: 0.3 });
    const grab = reach(O, withStoop(k, 1), v(40 - down * 10, -O.H * lerp(0.62, 0.2, down)));
    pose = blendPose(pose, grab, bend);
  }
  // leans it on the willow, then stands with a hand on the trunk
  const parked = t > 19;
  const rest = phase(t, 19, 20.4);
  if (t > 19) {
    px = lerp(bx + offset, WILLOW_X - 48, rest);
    const s = withStoop(stand(O, { head: 0.05 }), 0.7);
    const touch = reach(O, s, v(WILLOW_X - 20 - px, -O.H * 0.62));
    pose = blendPose(pose, touch, rest);
  }
  const back = phase(t, 23, 24.2) - phase(t, 28.4, 29.4);
  const skel = blendSkel(fk(O, pose), backSkel(O, { stoop: 0.8, armsOut: 0.1 }), back);
  const gust = 0.9 + 0.5 * Math.max(0, noise(t * 0.5, 7)) + (t > 9.6 && t < 11 ? 0.8 : 0);
  const crest = (ink: string, shadow: boolean) => (
    <>
      <g transform={`translate(0 ${GROUND}) scale(1 ${(1 - down * 0.82).toFixed(3)}) translate(0 ${-GROUND})`}>
        <Bicycle x={parked ? restX : bx} y={GROUND} m={m} color={shadow ? ink : mix(ink, look.skyLow, 0.3)} dist={dist} parked={parked} tilt={parked ? -4 * rest : 0} />
      </g>
      <Actor a={{ b: O, skel, x: px, facing: 1 }} y={GROUND} ink={ink} t={t} />
    </>
  );
  const cam: Cam = {
    x: track(t, [
      [0, SPOT - 520],
      [10, SPOT - 300],
      [19, SPOT - 60],
      [30, SPOT - 20],
    ]),
    y: 590,
    zoom: track(t, [
      [0, 1.6],
      [10, 1.9],
      [19, 1.8],
      [26, 2.1],
      [30, 1.6],
    ]),
  };
  return (
    <DikeSet
      look={look}
      t={t}
     
      cam={cam}
      wind={-gust}
      leaf={0.25}
      willow={0.85}
      oldWillow={0}
      waterLevel={0.8}
      mud="#9a8a6c"
      crest={crest}
      front={
        <>
          <Leaves t={t} color={look.ink} amount={1.2} wind={-1.3} seed={4} />
          <Card t={t} text="霜降" color={look.ink} halo={look.skyLow} />
        </>
      }
    />
  );
};
