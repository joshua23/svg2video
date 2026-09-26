import React from 'react';
import timeline from '../timeline.json';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { BIKE_M, FATHER, SON, sonAt } from '../cast';
import { Cam } from '../lib/camera';
import { LOOKS, Look, blendLook } from '../lib/look';
import { clamp, invLerp, lerp, mix, smooth, track, v, win } from '../lib/math';
import { CREST, atDepth, farSlopeElev } from '../lib/stage';
import { Actor, ActorState } from '../rig/Actor';
import { Bicycle, bikeGeom, crankFor } from '../rig/Bicycle';
import { phase, travel } from '../rig/moves';
import { GaitOpts, RUN, SHUFFLE, WALK, curled, gait, gaitPhase, kneel, reach, stand, withStoop } from '../rig/poses';
import { pushing } from '../rig/riding';
import { Pose, backSkel, blendPose, blendSkel, fk, standHipY, turning } from '../rig/skeleton';
import { Card } from '../scenery/Card';
import { DikeSet, SPOT, WILLOW_X } from '../scenery/DikeSet';
import { MG, MarshSet, OLD_BOAT } from '../scenery/MarshSet';
import { ReedField } from '../scenery/Reeds';
import { Fluff, Geese } from '../scenery/Weather';

const GROUND = CREST + 2;

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, t: frame / fps };
};

const PARKED_BIKE_X = WILLOW_X - 62;

// ---------------------------------------------------------------- 大寒 the river dries

export const DROUGHT_SEC = timeline.scenes.drought;

const LAPSE: { look: Look; leaf: number; snow: number }[] = [
  { look: LOOKS.oldAge, leaf: 0.25, snow: 0 },
  { look: LOOKS.winter, leaf: 0, snow: 1 },
  { look: LOOKS.spring, leaf: 0.5, snow: 0 },
  { look: LOOKS.summer, leaf: 1, snow: 0 },
  { look: LOOKS.autumn, leaf: 0.55, snow: 0 },
  { look: LOOKS.winter, leaf: 0, snow: 1 },
  { look: LOOKS.drought, leaf: 0.2, snow: 0 },
];

/** Seasons racing past while the river silts up and the reeds rise. */
const lapse = (t: number) => {
  const f = clamp(t / 10) * (LAPSE.length - 1);
  const i = Math.min(LAPSE.length - 2, Math.floor(f));
  const u = smooth(f - i);
  const a = LAPSE[i];
  const b = LAPSE[i + 1];
  return { look: blendLook(a.look, b.look, u), leaf: lerp(a.leaf, b.leaf, u), snow: lerp(a.snow, b.snow, u) };
};

const DroughtDike: React.FC<{ t: number }> = ({ t }) => {
  const lp = lapse(t);
  const look = t < 10 ? lp.look : LOOKS.drought;
  const water = 0.8 * (1 - win(t, 0.5, 9.5));
  const grow = win(t, 1.5, 9.5);
  const O = SON.old;
  // pushing the bicycle one last time, to the willow
  const a = travel(t, 10.5, 17, SPOT - 720, PARKED_BIKE_X, 1.4);
  const g = bikeGeom(BIKE_M, crankFor(a.dist, BIKE_M));
  const offset = -24;
  const walk = withStoop(gait(O, gaitPhase(O, a.dist, SHUFFLE), SHUFFLE, a.amount), 0.85);
  let pose: Pose = pushing(O, g, walk, offset);
  let x = a.x + offset;
  const parked = t > 17.2;
  const rest = phase(t, 17.2, 18.4);
  if (parked) {
    x = lerp(a.x + offset, WILLOW_X - 48, rest);
    const s = withStoop(stand(O, { head: 0.05 }), 0.8);
    const touching = reach(O, s, v(WILLOW_X - 20 - x, -O.H * 0.6));
    pose = blendPose(blendPose(pose, s, rest), touching, rest * (1 - phase(t, 19.4, 20)));
  }
  const back = phase(t, 20, 21) - phase(t, 22.4, 23);
  // then over the crest and down into the reeds
  const go = travel(t, 23, 27.5, WILLOW_X - 48, WILLOW_X + 150, 1);
  const z = lerp(1, 1.9, clamp(invLerp(0.25, 1, go.u)));
  if (t > 23) {
    x = go.x;
    pose = withStoop(gait(O, gaitPhase(O, go.dist, SHUFFLE), SHUFFLE, go.amount), 0.8);
  }
  const skel = blendSkel(fk(O, pose), backSkel(O, { stoop: 0.8 }), back);
  const man: ActorState = { b: O, skel, x, facing: 1 };
  const onCrest = z <= 1.02;
  const cam: Cam =
    t < 10
      ? { x: SPOT + 60, y: 560, zoom: 1.05 }
      : {
          x: track(t, [
            [10, SPOT - 420],
            [17, SPOT - 60],
            [22, SPOT - 30],
            [27, SPOT + 120],
          ]),
          y: track(t, [
            [10, 590],
            [22, 600],
            [27, 570],
          ]),
          zoom: track(t, [
            [10, 1.6],
            [18, 1.9],
            [22, 1.8],
            [27, 1.35],
          ]),
        };
  const at = atDepth(cam, x, z, Math.max(-1.1, farSlopeElev(z)));
  const plume = '#efe6cf';
  return (
    <DikeSet
      look={look}
      t={t}
      cam={cam}
      wind={0.3}
      leaf={t < 10 ? lp.leaf : 0.2}
      snow={t < 10 ? lp.snow : 0}
      willow={lerp(0.85, 1, win(t, 0, 10))}
      oldWillow={0}
      waterLevel={water}
      mud={LOOKS.drought.waterNear}
      far={
        <>
          <ReedField t={t} wind={0.3} color={look.hillNear} plume={plume} grow={grow} zNear={onCrest ? 1 : z} zFar={20} />
          {!onCrest && <Actor a={man} x={at.x} y={at.y} scale={at.scale} ink={look.ink} t={t} />}
          {!onCrest && <ReedField t={t} wind={0.3} color={look.hillNear} plume={plume} grow={grow} zNear={1} zFar={z - 0.001} />}
        </>
      }
      crest={(ink, shadow) => (
        <>
          {t > 10 && <Bicycle x={parked ? PARKED_BIKE_X : a.x} y={GROUND} m={BIKE_M} color={shadow ? ink : mix(ink, look.skyLow, 0.3)} dist={a.dist} parked={parked} tilt={parked ? -4 * rest : 0} />}
          {t > 10 && onCrest && <Actor a={man} y={GROUND} ink={ink} t={t} />}
        </>
      )}
      front={<Card t={t} text="大寒" color={look.ink} halo={look.skyLow} t0={10.6} t1={15.5} />}
    />
  );
};

/** Among the reeds he finds the sampan, climbs in and lies down to rest. */
const DroughtMarsh: React.FC<{ t: number }> = ({ t }) => {
  const look = LOOKS.drought;
  const O = SON.old;
  const walk = travel(t, 27.5, 32.5, -260, 430, 1.2);
  const near = travel(t, 33.6, 35.4, 430, 560, 0.6);
  const x = t < 33.6 ? walk.x : near.x;
  const dist = walk.dist + (t >= 33.6 ? near.dist : 0);
  const amount = t < 33.6 ? walk.amount : near.amount;
  let pose: Pose = withStoop(gait(O, gaitPhase(O, dist, SHUFFLE), SHUFFLE, amount), 0.85);
  // stops, lifts his head: there it is
  pose = { ...pose, head: pose.head - 0.35 * (phase(t, 32.4, 33) - phase(t, 33.4, 33.8)) };
  const touch = phase(t, 35.4, 36.2) - phase(t, 37, 37.4);
  pose = blendPose(pose, reach(O, pose, v(60, -O.H * 0.45)), touch);
  // climbs in over the stern, kneels, lies down
  const climb = phase(t, 37.4, 38.6);
  const lie = phase(t, 38.8, 40.4);
  const inside = climb > 0.5;
  const bx = lerp(x, OLD_BOAT.x - 70, climb);
  const by = MG - Math.sin(Math.PI * climb) * 22 - climb * 2;
  const k = kneel(O, 1, { head: 0.3 });
  const p2 = climb > 0 ? blendPose(blendPose(pose, withStoop(k, 0.6), climb), curled(O), lie) : pose;
  const man: ActorState = { b: O, pose: p2, x: bx, facing: 1 };
  const cam: Cam = {
    x: track(t, [
      [27.5, 260],
      [33, 520],
      [41, 640],
    ]),
    y: track(t, [
      [27.5, 640],
      [41, 690],
    ]),
    zoom: track(t, [
      [27.5, 1.5],
      [34, 1.8],
      [41, 2.3],
    ]),
  };
  return (
    <MarshSet
      look={look}
      t={t}
      cam={cam}
      wind={0.34 + 0.12 * Math.sin(t * 0.6)}
      front={<Fluff t={t} color="#fbf4e2" amount={0.6} wind={1.1} seed={7} />}
      inBoat={inside ? (ink) => <Actor a={man} y={by} ink={ink} t={t} /> : undefined}
      actors={!inside ? (ink) => <Actor a={man} y={by} ink={ink} t={t} /> : undefined}
    />
  );
};

export const Drought: React.FC = () => {
  const { t } = useT();
  // a brief dip to paper covers the cut from the dike down into the reeds
  const dip = win(t, 26.8, 27.5) * (1 - win(t, 27.5, 28.4));
  return (
    <AbsoluteFill>
      {t < 27.5 ? <DroughtDike t={t} /> : <DroughtMarsh t={t} />}
      {dip > 0 && <AbsoluteFill style={{ backgroundColor: '#efe3c8', opacity: dip }} />}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 立春 reunion

export const REUNION_SEC = timeline.scenes.reunion;

const RUN_T0 = 10.4;
const ARRIVE = 21.4;

const blendGait = (a: GaitOpts, b: GaitOpts, t: number): GaitOpts => {
  const out = { ...a };
  (Object.keys(a) as (keyof GaitOpts)[]).forEach((k) => {
    out[k] = lerp(a[k], b[k], t);
  });
  return out;
};

/** Age runs backwards as he goes: 0 = the old man, 1 = the small boy. */
const ageAt = (t: number) => win(t, 11.5, 19.5);
const gaitAt = (age: number) => (age < 0.35 ? blendGait(SHUFFLE, WALK, age / 0.35) : blendGait(WALK, RUN, clamp((age - 0.35) / 0.4)));
const speedAt = (t: number) =>
  t < RUN_T0 ? 0 : (48 * smooth((t - RUN_T0) / 1.2) + 187 * smooth(invLerp(RUN_T0, 19.5, t))) * (1 - win(t, ARRIVE - 0.9, ARRIVE, (x) => x));

/** Integrate position and gait phase so strides stay planted while he changes size and pace. */
const runner = (t: number) => {
  let x = 860;
  let ph = 0;
  const dt = 1 / 48;
  for (let s = RUN_T0; s < t; s += dt) {
    const sp = speedAt(s);
    const age = ageAt(s);
    const b = sonAt(age);
    const g = gaitAt(age);
    x += sp * dt;
    ph += (sp * dt * g.duty) / (g.stride * (b.thigh + b.shin));
  }
  return { x, ph, speed: speedAt(t) };
};

/** The father waits exactly where the run ends. */
const FATHER_X = runner(ARRIVE + 0.5).x + 56;

/** After the embrace: lifted to his chest, up onto his shoulders, and away together into the light. */
const LIFT = [23.2, 24.8] as const;
const SHOULDER = [24.8, 26.4] as const;
const TURN = 25.6;
const WALK_OFF = [26.4, 39] as const;

const fatherX = (t: number) => travel(t, WALK_OFF[0], WALK_OFF[1], FATHER_X, FATHER_X + 900, 1.4);

/** The father's body (arms still free) — both actors lean on it. */
const fatherBody = (t: number): { pose: Pose; x: number; facing: 1 | -1 } => {
  const F = FATHER;
  if (t < SHOULDER[0]) return { pose: fatherPose(t), x: FATHER_X, facing: -1 };
  const mv = fatherX(t);
  const carry: GaitOpts = { ...WALK, stride: 0.55, lean: 0.03, armSwing: 0 };
  const walk = gait(F, gaitPhase(F, mv.dist, carry), carry, mv.amount);
  const standing = stand(F, { head: -0.05 });
  return { pose: blendPose(standing, walk, mv.amount), x: mv.x, facing: t < TURN ? -1 : 1 };
};

const toWorld = (p: { x: number; y: number }, ox: number, f: 1 | -1) => v(ox + p.x * f, MG + p.y);
const toLocal = (p: { x: number; y: number }, ox: number, f: 1 | -1) => v((p.x - ox) * f, p.y - MG);

export const Reunion: React.FC = () => {
  const { t } = useT();
  const look = blendLook(LOOKS.drought, LOOKS.reunion, win(t, 2, 20));
  const age = ageAt(t);
  const B = sonAt(age);
  const O = SON.old;
  const boatX = OLD_BOAT.x - 70;
  const body = fatherBody(t);
  const fs = fk(FATHER, body.pose);
  let him: ActorState;
  let inside = true;
  let y = MG - 2;
  if (t < 10.4) {
    // wakes, sits up, stands and steps out over the bow
    const sit = phase(t, 4.6, 6.4);
    const up = phase(t, 6.8, 8.2);
    const breathe = Math.sin(t * 1.3);
    const base = blendPose(curled(O, breathe), withStoop(kneel(O, 1, { head: 0.1 }), 0.6), sit);
    const p = blendPose(base, withStoop(stand(O), 0.8), up);
    const step = travel(t, 8.3, 10.4, boatX, 860, 0.5);
    const hop = Math.sin(Math.PI * clamp(invLerp(8.3, 10.2, t))) * 18;
    const w = withStoop(gait(O, gaitPhase(O, step.dist, SHUFFLE), SHUFFLE, step.amount), 0.8);
    him = { b: O, pose: t < 8.3 ? p : blendPose(p, w, step.amount), x: step.x, facing: 1 };
    y = MG - 2 - hop;
    inside = step.x < 800;
  } else if (t < SHOULDER[0]) {
    inside = false;
    const r = runner(t);
    const g = gaitAt(age);
    const amount = clamp(r.speed / 60);
    const stoop = 0.8 * (1 - clamp(age / 0.3));
    const run = withStoop(gait(B, r.ph, g, amount), stoop);
    let p: Pose = blendPose(stand(B), run, amount);
    let x = r.x;
    if (t > ARRIVE - 0.4) {
      // into his father's arms
      const neck = v(FATHER_X - fs.neck.x - x, fs.neck.y);
      const hug = phase(t, ARRIVE - 0.4, ARRIVE + 0.4);
      p = blendPose(p, reach(B, { ...stand(B), lean: 0.15, head: 0.25 }, v(neck.x + 6, neck.y + 4), v(neck.x + 10, neck.y)), hug);
      // lifted up against his chest
      const lift = phase(t, LIFT[0], LIFT[1]);
      const chest = v(FATHER_X - 26, MG - FATHER.H * 0.52);
      x = lerp(x, chest.x - 4, lift);
      const held = blendPose(p, { ...stand(B, { legN: [0.6, 0.9], legF: [0.35, 0.8] }), lean: 0.25, head: 0.35, armN: p.armN, armF: p.armF }, lift);
      held.hip = v(0, lerp(standHipY(B), chest.y - MG + 4, lift));
      p = held;
    }
    him = { b: B, pose: p, x, facing: 1 };
  } else {
    // up onto his father's shoulders (骑在肩上), then riding high as they walk away
    inside = false;
    const u = phase(t, SHOULDER[0], SHOULDER[1]);
    const chest = v(FATHER_X - 30, MG - FATHER.H * 0.52 + 4);
    const neckW = toWorld(fs.neck, body.x, body.facing);
    // straddling the neck behind his father's head, legs draped down the front
    const seat = v(neckW.x - body.facing * FATHER.headR * 0.75, neckW.y + FATHER.H * 0.005);
    const hipW = v(lerp(chest.x, seat.x, u), lerp(chest.y, seat.y, u) - Math.sin(Math.PI * u) * FATHER.H * 0.25);
    const heldPose: Pose = { ...stand(B, { legN: [0.6, 0.9], legF: [0.35, 0.8] }), lean: 0.25, head: 0.35 };
    const riding: Pose = { ...stand(B), lean: 0.05, head: -0.08, legN: [1.5, 1.42], legF: [1.4, 1.28] };
    let p = blendPose(heldPose, riding, u);
    p.hip = v(0, hipW.y - MG);
    // hands on his father's head; then both arms flung up, flying; then back
    const headW = toWorld(fs.head, body.x, body.facing);
    const onHead = reach(B, p, toLocal(v(headW.x + 4, headW.y - FATHER.headR * 0.4), hipW.x, 1), toLocal(v(headW.x + 8, headW.y - FATHER.headR * 0.2), hipW.x, 1));
    const fly = phase(t, 27.6, 28.4) * (1 - phase(t, 31, 31.8));
    const flying: Pose = { ...p, armN: [2.55 + Math.sin(t * 3) * 0.12, 0.25], armF: [2.35 - Math.sin(t * 3) * 0.12, 0.3], head: -0.25 };
    p = blendPose(blendPose(p, onHead, phase(t, 25.8, 26.6)), flying, fly);
    him = { b: t > TURN ? { ...B, hat: 'douli' } : B, pose: p, x: hipW.x, facing: 1 };
    y = MG;
  }
  // the father's hands: round the boy while lifting, then holding his shins
  let fp = body.pose;
  if (t >= SHOULDER[0]) {
    const bs = fk(him.b, him.pose!);
    const hipW = toWorld(bs.hipC, him.x, 1);
    const kneeW = toWorld(bs.legN.b, him.x, 1);
    const kneeF = toWorld(bs.legF.b, him.x, 1);
    const lifting = reach(FATHER, fp, toLocal(v(hipW.x + 6, hipW.y + 6), body.x, body.facing), toLocal(v(hipW.x - 4, hipW.y + 10), body.x, body.facing));
    const holding = reach(FATHER, fp, toLocal(v(kneeW.x + 4, kneeW.y + 10), body.x, body.facing), toLocal(v(kneeF.x + 2, kneeF.y + 12), body.x, body.facing));
    fp = blendPose(lifting, holding, phase(t, 26, 26.6));
  }
  const fatherAlpha = win(t, 11.5, 15);
  // as he swings the boy up he passes him his bamboo hat
  const dadBuild = t > TURN ? { ...FATHER, hat: 'none' as const } : FATHER;
  const dad: ActorState = { b: dadBuild, pose: fp, skel: turning(FATHER, fp, t, TURN, 0.45), x: body.x, facing: body.facing };
  const r = runner(t);
  const follow = lerp(820 + (r.x - 860), r.x + 260, win(t, RUN_T0, 14));
  const settle = lerp(Math.min(follow, FATHER_X - 60), FATHER_X - 70, win(t, 17, ARRIVE));
  const camX = t < RUN_T0 ? track(t, [[0, 600], [9, 700], [RUN_T0, 820]]) : lerp(settle, body.x + 60, win(t, 26, 33));
  const cam: Cam = {
    x: camX,
    y: track(t, [
      [0, 690],
      [10, 660],
      [21, 650],
      [26, 610],
      [38, 600],
    ]),
    zoom: track(t, [
      [0, 2.3],
      [4.5, 2.5],
      [8, 1.8],
      [12, 1.5],
      [19, 1.7],
      [23, 2.9],
      [26, 2.5],
      [38, 1.45],
    ]),
  };
  const bloom = win(t, 29, 37.6);
  const wind = 0.38 + 0.14 * Math.sin(t * 0.6);
  const figure = (ink: string) => <Actor a={him} y={y} ink={ink} t={t} />;
  return (
    <MarshSet
      look={look}
      t={t}
      cam={cam}
      wind={wind}
      bloom={bloom}
      front={
        <>
          <Fluff t={t} color="#fbf4e2" amount={0.9} wind={1.2} />
          <Card t={t} text="立春" color={look.ink} halo={look.skyLow} t0={1} t1={6.5} />
        </>
      }
      inBoat={inside ? figure : undefined}
      actors={(ink) => (
        <>
          <g opacity={fatherAlpha}>
            <Actor a={dad} y={MG} ink={ink} t={t} />
          </g>
          {!inside && figure(ink)}
        </>
      )}
    />
  );
};

/** The father waits, kneels with open arms, catches the boy and lifts him. */
function fatherPose(t: number): Pose {
  const F = FATHER;
  const d = phase(t, 19.6, 20.8) - phase(t, LIFT[0], LIFT[1]);
  let p = kneel(F, d, { head: 0.1 });
  const open = phase(t, 19.8, 20.8) * (1 - phase(t, ARRIVE - 0.2, ARRIVE + 0.4));
  p = blendPose(p, reach(F, p, v(F.H * 0.42, -F.H * 0.42), v(F.H * 0.38, -F.H * 0.5)), open);
  const hold = phase(t, ARRIVE - 0.2, ARRIVE + 0.4);
  const around = reach(F, { ...p, lean: p.lean + 0.1, head: 0.2 }, v(F.H * 0.2, -F.H * 0.5), v(F.H * 0.24, -F.H * 0.58));
  p = blendPose(p, around, hold);
  return p;
}

// ---------------------------------------------------------------- epilogue

export const EPILOGUE_SEC = timeline.scenes.epilogue;

/** Pull back from the bicycle under the willow to the whole dike, catkins on the wind. */
export const Epilogue: React.FC = () => {
  const { t } = useT();
  const look = blendLook(LOOKS.drought, LOOKS.reunion, 0.45);
  const u = win(t, 0.5, 13.5);
  const cam: Cam = { x: lerp(PARKED_BIKE_X + 40, SPOT + 40, u), y: lerp(610, 565, u), zoom: lerp(2.7, 1.05, u) };
  const wind = 0.4 + 0.18 * Math.sin(t * 0.8) + 0.1 * Math.sin(t * 2.1);
  return (
    <DikeSet
      look={look}
      t={t}
      cam={cam}
      wind={wind}
      leaf={0.55}
      willow={1}
      oldWillow={0}
      waterLevel={0}
      mud={LOOKS.drought.waterNear}
      far={<ReedField t={t} wind={wind} color={look.hillNear} plume="#f3ead3" grow={1} zNear={1} zFar={20} />}
      crest={(ink) => <Bicycle x={PARKED_BIKE_X} y={GROUND} m={BIKE_M} color={ink} parked tilt={-4} />}
      front={
        <>
          <Geese t={t} x={lerp(2200, -400, clamp((t - 1.5) / 11))} y={230 - t * 3} size={10} color={look.ink} n={9} />
          <Fluff t={t} color="#fbf4e2" amount={1} wind={1.4} seed={5} />
        </>
      }
    />
  );
};
