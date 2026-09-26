import React from 'react';
import timeline from '../timeline.json';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { BIKE_M, FATHER, SON } from '../cast';
import { Cam, useCam } from '../lib/camera';
import { LOOKS, blendLook } from '../lib/look';
import { Vec, clamp, invLerp, lerp, mix, track, v } from '../lib/math';
import { CREST, atDepth, farSlopeElev } from '../lib/stage';
import { Actor, ActorState, skelOf } from '../rig/Actor';
import { Bicycle, bikeGeom, crankFor } from '../rig/Bicycle';
import { Boat, Ripples, boatPoints } from '../rig/Boat';
import { phase, travel } from '../rig/moves';
import { WALK, gait, gaitPhase, kneel, reach, scull, stand } from '../rig/poses';
import { perch, ride } from '../rig/riding';
import { Build, Pose, backSkel, blendPose, blendSkel, fk, standHipY, turning } from '../rig/skeleton';
import { DikeSet, OLD_WILLOW, SPOT, WILLOW_X } from '../scenery/DikeSet';

export const PARTING_SEC = timeline.scenes.parting;

const GROUND = CREST + 2;
const T_STOP = 13.5;
const BIKE_X = SPOT - 70;
const SON_X = SPOT;
const BOAT = { x: SPOT + 520, z: 1.3 };

/** Local (figure-space) coordinates of a world point, for an actor at `ox` facing `f`. */
const local = (p: Vec, ox: number, f: 1 | -1): Vec => v((p.x - ox) * f, p.y - GROUND);
const world = (p: Vec, ox: number, f: 1 | -1): Vec => v(ox + p.x * f, p.y + GROUND);

const bikeAt = (t: number) => {
  const mv = travel(t, 0, T_STOP, -900, BIKE_X, 3);
  const push = travel(t, 70, 84, BIKE_X, BIKE_X + 760, 1.5);
  const x = t < 70 ? mv.x : push.x;
  const dist = t < 70 ? mv.dist : mv.dist + push.dist;
  return { x, dist, parked: t > 17 && t < 69.5, push };
};

type Where = 'crest' | 'far';
interface Placed extends ActorState {
  where: Where;
}

const walkPose = (b: Build, dist: number, amount: number) => gait(b, gaitPhase(b, dist, WALK), WALK, amount);


/** Where the father kneels to say goodbye, and where the willow switch changes hands. */
const GX = SON_X + 46;
const MEET = v(SON_X + 24, GROUND - SON.small.H * 0.5);

/** The father's kneeling body (no arms) — both actors lean on it, so it must not depend on the boy. */
const fatherKneel = (t: number): Pose => {
  const d = phase(t, 34, 35) - phase(t, 40, 41.2);
  const hug = phase(t, 36.3, 37.2) - phase(t, 39.6, 40.4);
  const p = kneel(FATHER, d, { head: 0.08 });
  return { ...p, lean: lerp(p.lean, 0.32, hug), head: lerp(p.head, 0.25, hug) };
};

const father = (t: number, bikeX: number, son: Placed): Placed => {
  const F = FATHER;
  const g = bikeGeom(BIKE_M, crankFor(bikeAt(t).dist, BIKE_M));
  const standAt = (x: number, o: Partial<Pose> = {}) => stand(F, { hip: v(x, standHipY(F)), ...o });

  if (t < 15) {
    const u = phase(t, 13.4, 14.8);
    const riding = ride(F, g, { lean: 0.17 });
    const p = blendPose(riding, standAt(8, { armN: riding.armN, armF: riding.armF }), u);
    return { b: F, pose: p, x: bikeX, facing: 1, where: 'crest' };
  }
  if (t < 17.2) {
    // Lift the boy down from the crossbar, hands following his chest.
    const s = skelOf(son);
    const chest = world(v(0, (s.hipC.y + s.neck.y) / 2), son.x, son.facing);
    const base = standAt(0, { lean: 0.12 });
    const lx = bikeX + 8;
    const hands = local(chest, lx, 1);
    const riding = ride(F, g, { lean: 0.17 });
    const from = standAt(0, { armN: riding.armN, armF: riding.armF });
    const p = blendPose(from, reach(F, base, v(hands.x + 4, hands.y), v(hands.x - 2, hands.y + 3)), phase(t, 15, 15.5));
    const rest = standAt(0);
    return { b: F, pose: blendPose(p, rest, phase(t, 16.5, 17.2)), x: lx, facing: 1, where: 'crest' };
  }
  const x0 = bikeX + 8;
  const kx = SON_X - 44;
  if (t < 18.2) {
    const mv = travel(t, 17.2, 18.2, x0, kx, 0.4);
    return { b: F, pose: walkPose(F, mv.dist, mv.amount), x: mv.x, facing: 1, where: 'crest' };
  }
  if (t < 23.6) {
    // Kneels, hands on the boy's shoulders.
    const d = phase(t, 18.2, 19.2) - phase(t, 22.3, 23.4);
    const base = kneel(F, d, { head: 0.05 });
    const s = skelOf(son);
    const shN = local(world(s.shB, son.x, son.facing), kx, 1);
    const shF = local(world(s.shA, son.x, son.facing), kx, 1);
    const p = reach(F, base, v(shN.x + 2, shN.y + 4), v(shF.x + 6, shF.y + 3));
    return { b: F, pose: blendPose(standAt(0), p, clamp(d * 1.4)), x: kx, facing: 1, where: 'crest' };
  }
  const wx = OLD_WILLOW.x - 60;
  if (t < 28) {
    // Over the crest and down toward the old willow on the water's edge.
    const mv = travel(t, 23.6, 28, kx, wx, 0.8);
    const z = lerp(1, 1.18, clamp(invLerp(0.3, 1, mv.u)));
    return { b: F, pose: walkPose(F, mv.dist, mv.amount), x: mv.x, z, elev: farSlopeElev(z), facing: 1, where: z > 1.02 ? 'far' : 'crest' };
  }
  if (t < 30) {
    // Reach up into the willow and break off a switch — 折柳.
    const up = phase(t, 28.1, 28.9) - phase(t, 29.2, 29.9);
    const reaching = reach(F, standAt(0, { head: -0.35 * up }), v(F.H * 0.28, -F.H * lerp(0.55, 1.18, up)));
    const p = blendPose(standAt(0), reaching, phase(t, 28, 28.4) * (1 - phase(t, 29.6, 30)));
    return { b: F, pose: p, skel: turning(F, p, t, 30), x: wx, z: 1.18, elev: farSlopeElev(1.18), facing: 1, where: 'far', twig: t > 29.2 ? 'near' : undefined, twigAngle: 1.6 };
  }
  const gx = GX;
  if (t < 34) {
    const mv = travel(t, 30, 34, wx, gx, 0.8);
    const z = lerp(1.18, 1, clamp(invLerp(0, 0.7, mv.u)));
    const p = walkPose(F, mv.dist, mv.amount);
    const held = blendPose(p, { ...p, armN: [0.55, 0.5] }, phase(t, 30, 30.6));
    return { b: F, pose: held, skel: turning(F, held, t, 30), x: mv.x, z, elev: farSlopeElev(z), facing: -1, where: z > 1.02 ? 'far' : 'crest', twig: 'near', twigAngle: 0.5 };
  }
  if (t < 42.4) {
    let p = fatherKneel(t);
    const s = skelOf(son);
    const twig: Placed['twig'] = t < 36 ? 'near' : undefined;
    const target = local(MEET, gx, -1);
    const offered = reach(F, p, v(target.x + 4, target.y - 2));
    if (t < 36.3) {
      // Offer the switch.
      const offer = phase(t, 34.8, 35.7);
      p = blendPose({ ...p, armN: [0.55, 0.5] }, offered, offer);
    } else if (t < 40.4) {
      // The embrace: both arms round the boy's back.
      const hug = phase(t, 36.3, 37.2);
      const release = phase(t, 39.6, 40.4);
      const back = local(world(s.shA, son.x, son.facing), gx, -1);
      const hugged = reach(F, p, v(back.x + 4, back.y + 8), v(back.x + 8, back.y + 14));
      p = blendPose(blendPose(offered, hugged, hug), p, release);
    } else {
      // A hand on the boy's head.
      const pat = phase(t, 40.8, 41.3) - phase(t, 41.8, 42.3);
      const head = local(world(s.head, son.x, son.facing), gx, -1);
      p = blendPose(p, reach(F, p, v(head.x, head.y - SON.small.headR * 0.9)), pat);
    }
    return { b: F, pose: p, skel: turning(F, p, t, 42.4), x: gx, facing: -1, where: 'crest', twig, twigAngle: 0.1 };
  }
  const bx = BOAT.x - 40;
  if (t < 46.5) {
    const mv = travel(t, 42.4, 46.5, gx, bx, 0.9);
    const z = lerp(1, 1.24, clamp(invLerp(0.2, 1, mv.u)));
    const wp = walkPose(F, mv.dist, mv.amount);
    return { b: F, pose: wp, skel: turning(F, wp, t, 42.4), x: mv.x, z, elev: farSlopeElev(z), facing: 1, where: z > 1.02 ? 'far' : 'crest' };
  }
  // Aboard: drawn with the boat.
  return { b: F, pose: standAt(0), x: bx, z: 1.24, facing: 1, where: 'far', hidden: true };
};

const son = (t: number, bikeX: number): Placed => {
  const S = SON.small;
  const g = bikeGeom(BIKE_M, crankFor(bikeAt(t).dist, BIKE_M));
  const idle = (o: Partial<Pose> = {}) => stand(S, { head: -0.05, ...o });
  if (t < 15) {
    return { b: S, pose: perch(S, g, Math.sin(t * 2.6) * (t < 13 ? 1 : 0.3)), x: bikeX, facing: 1, where: 'crest' };
  }
  if (t < 16.6) {
    const u = phase(t, 15, 16.6);
    const pp = perch(S, g, 0);
    const from = world(pp.hip, bikeX, 1);
    const to = v(SON_X, GROUND + standHipY(S));
    const hipW = v(lerp(from.x, to.x, u), lerp(from.y, to.y, u) - Math.sin(Math.PI * u) * S.H * 0.35);
    const facing: 1 | -1 = u < 0.5 ? 1 : -1;
    const ox = lerp(bikeX, SON_X, u);
    const dangle = idle({ legN: [0.25, 0.3], legF: [0.05, 0.2], armN: [0.5, 0.4], armF: [0.4, 0.4] });
    const p = blendPose(pp, dangle, u);
    p.hip = local(hipW, ox, facing);
    return { b: S, pose: blendPose(p, idle(), phase(t, 16.2, 16.6)), x: ox, facing, where: 'crest' };
  }
  const look = (up: number) => idle({ head: -0.3 * up, lean: -0.05 * up });
  if (t < 24.3) {
    const up = phase(t, 18.6, 19.4) - phase(t, 22.6, 23.4);
    return { b: S, pose: look(up), x: SON_X, facing: -1, where: 'crest' };
  }
  if (t < 32) {
    // Watches his father go down to the water's edge.
    const back = phase(t, 25, 26) - phase(t, 30.8, 31.8);
    const side = fk(S, idle({ head: 0.05 }));
    return { b: S, skel: blendSkel(side, backSkel(S, { sway: Math.sin(t * 0.8) * 0.3 }), back), x: SON_X, facing: 1, where: 'crest' };
  }
  if (t < 40.8) {
    let p = idle();
    const fs = fk(FATHER, fatherKneel(t));
    let twig: Placed['twig'] = t >= 36 ? 'near' : undefined;
    let x = SON_X;
    if (t < 36.3) {
      const hand = local(MEET, SON_X, 1);
      p = blendPose(p, reach(S, p, v(hand.x - 4, hand.y + 3)), phase(t, 35, 35.8));
    } else {
      const hug = phase(t, 36.3, 37.1) - phase(t, 39.6, 40.4);
      x = lerp(SON_X, SON_X + 12, hug);
      const neck = local(world(fs.neck, GX, -1), x, 1);
      const hugged = reach(S, { ...p, lean: 0.12, head: 0.2 }, v(neck.x + 6, neck.y + 2), v(neck.x + 10, neck.y));
      p = blendPose(idle(), hugged, hug);
      twig = 'near';
    }
    return { b: S, pose: p, x, facing: 1, where: 'crest', twig, twigAngle: 1.3 };
  }
  if (t < 61) {
    // Watches the boat go. Seen from behind, the willow switch hanging from one hand.
    const back = phase(t, 43, 44.2);
    const up = phase(t, 41, 41.6) - phase(t, 42.4, 43);
    const side = fk(S, look(up));
    return {
      b: S,
      skel: blendSkel(side, backSkel(S, { sway: Math.sin(t * 0.5) * 0.4, headTurn: Math.sin(t * 0.3) * 0.3 }), back),
      x: SON_X,
      facing: 1,
      where: 'crest',
      twig: 'near',
      twigAngle: lerp(1.3, 1.45, back),
    };
  }
  if (t < 66) {
    const turn = 1 - phase(t, 61, 61.8);
    const d = phase(t, 62, 63) - phase(t, 64.2, 65.2);
    const kneeling = kneel(S, d, { head: 0.35 });
    const planting = reach(S, kneeling, v(WILLOW_X - SON_X, -S.H * 0.05));
    const p = blendPose(kneeling, planting, phase(t, 62.6, 63.2) * (1 - phase(t, 63.8, 64.4)));
    const side = fk(S, t < 64.2 ? p : blendPose(p, idle({ head: 0.3 }), phase(t, 64.2, 65.2)));
    return { b: S, skel: blendSkel(side, backSkel(S), turn), x: SON_X, facing: 1, where: 'crest', twig: t < 63.3 ? 'near' : undefined, twigAngle: 1.5 };
  }
  // Walks to the big bicycle and pushes it home, arms raised to reach the bars.
  const bk = bikeAt(t);
  if (t < 69.5) {
    const mv = travel(t, 66, 69, SON_X, BIKE_X + 26, 0.6);
    const wp = walkPose(S, mv.dist, mv.amount);
    return { b: S, pose: wp, skel: turning(S, wp, t, 69.5), x: mv.x, facing: -1, where: 'crest' };
  }
  const x = bk.x + 26;
  const gg = bikeGeom(BIKE_M, 0);
  const dist = bk.push.dist;
  const p = gait(S, gaitPhase(S, dist, WALK), WALK, bk.push.amount);
  const grip = v(gg.grip.x - 26, gg.grip.y);
  const pushing = blendPose(p, reach(S, { ...p, lean: 0.12 }, grip, v(grip.x + 3, grip.y - 1)), phase(t, 69.6, 70.3));
  return { b: S, pose: pushing, skel: turning(S, pushing, t, 69.5), x, facing: 1, where: 'crest' };
};

const camAt = (t: number, bikeX: number): Cam => {
  const follow = Math.min(SPOT, bikeX + 260);
  const x = track(t, [
    [0, follow],
    [12, follow],
    [24, SPOT + 10],
    [30, SPOT + 90],
    [34, SPOT + 40],
    [41, SPOT + 40],
    [47, SPOT + 120],
    [58, SPOT + 200],
    [61, SPOT + 30],
    [66, SPOT + 10],
    [84, SPOT + 260],
  ]);
  const zoom = track(t, [
    [0, 1],
    [11, 1.05],
    [16, 1.7],
    [19, 2.9],
    [23, 2.8],
    [27, 1.35],
    [31, 1.45],
    [35, 2.9],
    [40, 3.2],
    [43, 1.5],
    [50, 1.1],
    [59, 1.0],
    [62, 1.55],
    [66, 1.5],
    [76, 1.0],
  ]);
  const y = track(t, [
    [0, 560],
    [16, 600],
    [40, 590],
    [50, 560],
    [60, 555],
    [63, 610],
    [70, 590],
    [80, 560],
  ]);
  return { x: t < 12 ? lerp(follow, x, 0) : x, y, zoom };
};

const BoatWithFather: React.FC<{ t: number; ink: string }> = ({ t, ink }) => {
  const cam = useCam();
  const go = clamp(invLerp(48, 66, t));
  const z = BOAT.z * Math.pow(10 / BOAT.z, Math.pow(go, 1.25));
  const x = lerp(BOAT.x, 3900, Math.pow(go, 1.1));
  const at = atDepth(cam, x, z, -1.1);
  const board = phase(t, 46.5, 48);
  const sway = Math.sin(t * 2.4);
  const oar = t > 48 ? Math.sin(t * 2.4 + 0.6) : 0;
  const bp = boatPoints(BOAT_M, oar);
  const F = FATHER;
  const deck = v(bp.deck.x, bp.deck.y);
  const onDeck = scull(F, t * 0.38, v(bp.handle.x - deck.x, bp.handle.y - deck.y));
  const pose = blendPose(stand(F, { head: -0.1 }), onDeck, phase(t, 47.5, 48.6));
  const fade = 1 - clamp(invLerp(6, 10, z));
  const stepIn = lerp(-BOAT_M * 0.6, 0, board);
  const rot = sway * 0.8 * (t > 48 ? 1 : board);
  return (
    <g opacity={fade}>
      {/* reflection */}
      <g transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) scale(${at.scale.toFixed(4)} ${(-at.scale * 0.8).toFixed(4)})`} opacity={0.18}>
        <Boat x={0} y={0} m={BOAT_M} color={ink} oarSwing={oar} rot={rot} />
      </g>
      <g transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) scale(${at.scale.toFixed(4)})`}>
        {t > 46.5 && <Actor a={{ b: F, pose, x: deck.x + stepIn, facing: 1 }} y={deck.y} ink={ink} t={t} />}
        <Boat x={0} y={0} m={BOAT_M} color={ink} oarSwing={oar} rot={rot} />
        {t > 48 && <Ripples at={v(BOAT_M * -0.2, BOAT_M * 0.18)} w={BOAT_M * 5.2} t={t} color={ink} opacity={0.35} />}
      </g>
    </g>
  );
};

const BOAT_M = 70;

export const Parting: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bike = bikeAt(t);
  const S = son(t, bike.x);
  const F = father(t, bike.x, S);
  const cam = camAt(t, bike.x);
  const look = blendLook(LOOKS.parting, LOOKS.dusk, clamp(invLerp(52, 82, t)));
  const willow = t > 63.3 ? 0 : undefined;
  const wind = 0.28 + 0.1 * Math.sin(t * 0.3);

  const farActor = (a: Placed, ink: string) => {
    if (a.where !== 'far' || a.z === undefined) return null;
    const at = atDepth(cam, a.x, a.z, a.elev ?? 0);
    return <Actor a={a} x={at.x} y={at.y} scale={at.scale} ink={ink} t={t} />;
  };

  const crest = (ink: string, shadow: boolean) => (
    <>
      <Bicycle x={bike.x} y={GROUND} m={BIKE_M} color={shadow || t < 66 ? ink : mix(ink, look.skyLow, 0.3 * phase(t, 66, 69))} dist={bike.dist} parked={bike.parked} />
      {F.where === 'crest' && <Actor a={F} y={GROUND} ink={ink} t={t} />}
      {S.where === 'crest' && <Actor a={S} y={GROUND} ink={ink} t={t} />}
    </>
  );

  return (
    <DikeSet
      look={look}
      t={t}
     
      cam={cam}
      wind={wind}
      leaf={0.75}
      willow={willow}
      far={
        <>
          <BoatWithFather t={t} ink={look.ink} />
          {farActor(F, look.ink)}
        </>
      }
      crest={crest}
    />
  );
};
