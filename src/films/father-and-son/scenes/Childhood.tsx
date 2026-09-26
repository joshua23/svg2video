import React from 'react';
import timeline from '../timeline.json';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { BIKE_M, SON } from '../cast';
import { Cam } from '../lib/camera';
import { LOOKS } from '../lib/look';
import { Vec, clamp, lerp, noise, v } from '../lib/math';
import { CREST } from '../lib/stage';
import { Actor, ActorState, skelOf } from '../rig/Actor';
import { Bicycle, bikeGeom, crankFor } from '../rig/Bicycle';
import { phase, travel } from '../rig/moves';
import { Kite, Umbrella } from '../rig/Props';
import { RUN, WALK, GaitOpts, gait, gaitPhase, kneel, reach, stand } from '../rig/poses';
import { taodang } from '../rig/riding';
import { Build, Pose, backSkel, blendPose, blendSkel, fk } from '../rig/skeleton';
import { Card } from '../scenery/Card';
import { DikeSet, SPOT, WILLOW_X } from '../scenery/DikeSet';
import { Geese, Leaves, Rain, Snow } from '../scenery/Weather';

const GROUND = CREST + 2;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, t: frame / fps };
};

interface Visit {
  b: Build;
  g: GaitOpts;
  x0: number;
  xStop: number;
  x1: number;
  arrive: [number, number];
  look: [number, number];
  leave: [number, number];
  /** Extra pose tweak while standing (e.g. head up). */
  idle?: Partial<Pose>;
}

/**
 * The boy's visit: arrive on foot, stop beside the sapling, turn to face the river,
 * turn back, go on. Returns the actor and how far he is turned away (0..1).
 */
const visit = (t: number, s: Visit): { a: ActorState; back: number } => {
  const { b, g } = s;
  const inn = travel(t, s.arrive[0], s.arrive[1], s.x0, s.xStop, 1.2);
  const out = travel(t, s.leave[0], s.leave[1], s.xStop, s.x1, 1.2);
  const leaving = t >= s.leave[0];
  const mv = leaving ? out : inn;
  const dist = leaving ? inn.dist + out.dist : inn.dist;
  const walk = gait(b, gaitPhase(b, dist, g), g, mv.amount);
  const idle = stand(b, s.idle);
  const pose = blendPose(idle, walk, mv.amount);
  const back = phase(t, s.look[0], s.look[0] + 0.9) - phase(t, s.look[1], s.look[1] + 0.9);
  const skel = blendSkel(fk(b, pose), backSkel(b, { sway: Math.sin(t * 0.7) * 0.3 }), back);
  return { a: { b, skel, x: mv.x, facing: 1 }, back };
};

const closeCam = (t: number, dur: number, zoom = 1.75, y = 585): Cam => ({
  x: lerp(SPOT - 60, SPOT + 40, t / dur),
  y,
  zoom: lerp(zoom, zoom * 1.06, t / dur),
});

// ---------------------------------------------------------------- 清明 spring rain

export const SPRING_SEC = timeline.scenes.spring;

export const Spring: React.FC = () => {
  const { t } = useT();
  const B = SON.child;
  const { a, back } = visit(t, {
    b: B,
    g: { ...WALK, armSwing: 0.2 },
    x0: SPOT - 560,
    xStop: WILLOW_X - 38,
    x1: SPOT + 420,
    arrive: [0, 5],
    look: [5.2, 9.4],
    leave: [10.4, 13.6],
    idle: { head: 0.05 },
  });
  const look = LOOKS.spring;
  const sk = skelOf(a);
  // umbrella held in the near hand, lifted above the head
  const hold = (p: Pose) => reach(B, p, v(B.H * 0.12, -B.H * 0.78));
  const handSide = fk(B, hold(stand(B)));
  const hand: Vec = back > 0.5 ? v(B.shoulderW * 0.35, -B.H * 0.8) : handSide.armN.c;
  const actor: ActorState = { ...a, skel: { ...sk, armN: back > 0.5 ? { a: sk.armN.a, b: v(sk.armN.a.x + 4, sk.armN.a.y - 6), c: hand } : { ...handSide.armN, a: sk.armN.a } } };
  const crest = (ink: string) => (
    <g>
      <Actor a={actor} y={GROUND} ink={ink} t={t} />
      <g transform={`translate(${actor.x.toFixed(1)} ${GROUND})`}>
        <Umbrella hand={hand} size={B.H * 0.95} color={ink} tilt={back > 0.5 ? 0.05 : -0.12} />
      </g>
    </g>
  );
  return (
    <DikeSet
      look={look}
      t={t}
     
      cam={closeCam(t, SPRING_SEC, 1.8)}
      wind={0.12}
      leaf={0.45}
      willow={0.022}
      crest={crest}
      front={
        <>
          <Rain t={t} color={look.ink} amount={0.9} />
          <Card t={t} text="清明" color={look.ink} halo={look.skyLow} />
        </>
      }
    />
  );
};

// ---------------------------------------------------------------- 夏至 summer kite

export const SUMMER_SEC = timeline.scenes.summer;

export const Summer: React.FC = () => {
  const { t } = useT();
  const B = SON.child;
  const { a, back } = visit(t, {
    b: B,
    g: RUN,
    x0: SPOT - 900,
    xStop: WILLOW_X - 40,
    x1: SPOT + 700,
    arrive: [0, 5],
    look: [5.6, 8.8],
    leave: [9.8, 12.5],
    idle: { head: -0.25 },
  });
  const look = LOOKS.summer;
  const sk = skelOf(a);
  // near arm raised, holding the kite line
  const raised = reach(B, stand(B), v(B.H * 0.2, -B.H * 0.95));
  const armSide = fk(B, raised).armN;
  const hand = back > 0.5 ? v(B.shoulderW * 0.5, -B.H * 0.95) : armSide.c;
  const actor: ActorState = { ...a, skel: { ...sk, armN: back > 0.5 ? { a: sk.armN.a, b: v(sk.armN.a.x + 6, sk.armN.a.y - 10), c: hand } : { ...armSide, a: sk.armN.a } } };
  const handW = v(actor.x + hand.x, GROUND + hand.y);
  // the kite rides the wind behind and above him
  const kite = v(handW.x - 260 + noise(t * 0.5, 2) * 40 + (a.x - (SPOT - 900)) * 0.12, CREST - 470 + noise(t * 0.7, 9) * 35);
  const sag = v((handW.x + kite.x) / 2 + 30, (handW.y + kite.y) / 2 + 60);
  const crest = (ink: string, shadow: boolean) => (
    <g>
      <Actor a={actor} y={GROUND} ink={ink} t={t} />
      {!shadow && <path d={`M${handW.x.toFixed(1)} ${handW.y.toFixed(1)}Q${sag.x.toFixed(1)} ${sag.y.toFixed(1)} ${kite.x.toFixed(1)} ${kite.y.toFixed(1)}`} stroke={ink} strokeWidth={0.8} fill="none" opacity={0.7} />}
      {!shadow && <Kite x={kite.x} y={kite.y} s={70} color={ink} rot={noise(t * 0.9, 4) * 14} />}
    </g>
  );
  return (
    <DikeSet
      look={look}
      t={t}
     
      cam={{ x: lerp(SPOT - 120, SPOT + 20, t / SUMMER_SEC), y: 520, zoom: 1.45 }}
      wind={0.35}
      leaf={1}
      willow={0.04}
      crest={crest}
      front={<Card t={t} text="夏至" color={look.ink} halo={look.skyLow} />}
    />
  );
};

// ---------------------------------------------------------------- 秋分 autumn geese

export const AUTUMN_SEC = timeline.scenes.autumn;

export const Autumn: React.FC = () => {
  const { t } = useT();
  const B = SON.child;
  const look = LOOKS.autumn;
  const stopX = WILLOW_X - 150;
  const inn = travel(t, 0, 5, SPOT - 1100, stopX, 1.6);
  const out = travel(t, 9.4, 12.5, stopX, SPOT + 700, 1.6);
  const leaving = t >= 9.4;
  const bx = leaving ? out.x : inn.x;
  const dist = inn.dist + (leaving ? out.dist : 0);
  const g = bikeGeom(BIKE_M, crankFor(dist, BIKE_M));
  const riding = taodang(B, g);
  // hop off beside the bike and watch the geese
  const off = phase(t, 5, 5.7) - phase(t, 8.8, 9.4);
  const watch = stand(B, { hip: v(B.H * 0.45, stand(B).hip.y), head: -0.45, lean: -0.06 });
  const p = blendPose(riding, watch, off);
  const wobble = Math.sin(t * 5) * 1.2 * (1 - off);
  const crest = (ink: string) => (
    <g>
      <Bicycle x={bx} y={GROUND} m={BIKE_M} color={ink} dist={dist} tilt={wobble} parked={off > 0.5} />
      <Actor a={{ b: B, pose: p, x: bx, facing: 1 }} y={GROUND} ink={ink} t={t} />
    </g>
  );
  return (
    <DikeSet
      look={look}
      t={t}
     
      cam={{ x: lerp(SPOT - 200, SPOT - 40, t / AUTUMN_SEC), y: 540, zoom: 1.55 }}
      wind={0.7}
      leaf={0.55}
      willow={0.055}
      crest={crest}
      front={
        <>
          <Geese t={t} x={lerp(2150, -300, clamp((t - 3.5) / 8))} y={250 + t * 4} size={11} color={look.ink} n={11} />
          <Leaves t={t} color={look.ink} amount={0.7} />
          <Card t={t} text="秋分" color={look.ink} halo={look.skyLow} />
        </>
      }
    />
  );
};

// ---------------------------------------------------------------- 大雪 winter snow

export const WINTER_SEC = timeline.scenes.winter;

export const Winter: React.FC = () => {
  const { t } = useT();
  const B = SON.winter;
  const look = LOOKS.winter;
  const stopX = WILLOW_X - 36;
  const inn = travel(t, 0, 5, SPOT - 520, stopX, 1.3);
  const out = travel(t, 10.6, 13.6, stopX, SPOT + 380, 1.3);
  const leaving = t >= 10.6;
  const mv = leaving ? out : inn;
  const dist = inn.dist + (leaving ? out.dist : 0);
  const trudge: GaitOpts = { ...WALK, stride: 0.5, lean: 0.14, armSwing: 0.18, elbow: 0.5 };
  const walk = gait(B, gaitPhase(B, dist, trudge), trudge, mv.amount);
  // crouch and brush the snow off the sapling, then stand and look out
  const crouch = phase(t, 5.2, 6) - phase(t, 7.6, 8.3);
  const brush = Math.sin(t * 9) * 0.5 + 0.5;
  const k = kneel(B, crouch, { head: 0.35 });
  const brushing = reach(B, k, v(38 + brush * 8, -B.H * 0.28));
  const still = blendPose(stand(B, { head: 0.05 }), brushing, crouch);
  const pose = mv.amount > 0.01 ? blendPose(still, walk, mv.amount) : still;
  const back = phase(t, 8.4, 9.2) - phase(t, 10, 10.6);
  const skel = blendSkel(fk(B, pose), backSkel(B, { armsOut: 0.2 }), back);
  const shake = crouch > 0.5 ? Math.max(0, Math.sin(t * 9)) * 0.3 : 0;
  const crest = (ink: string) => <Actor a={{ b: B, skel, x: mv.x, facing: 1 }} y={GROUND} ink={ink} t={t} />;
  return (
    <DikeSet
      look={look}
      t={t}
     
      cam={closeCam(t, WINTER_SEC, 1.9, 590)}
      wind={0.15 + shake}
      leaf={0}
      willow={0.055}
      snow={1}
      crest={crest}
      front={
        <>
          <Snow t={t} color="#fbfbf7" amount={1} />
          <Card t={t} text="大雪" color={look.ink} halo={look.skyLow} />
        </>
      }
    />
  );
};
