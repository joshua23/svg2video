import React from 'react';
import { C } from '../palette';
import { V2, add2, dir, mul2, rot2 } from '../math3d';

export type Mouth = 'smile' | 'grin' | 'o' | 'scream' | 'smug' | 'grit' | 'wobble';
export type Eyes = 'normal' | 'wide' | 'down' | 'squint' | 'wink' | 'up';

export interface Expr {
  mouth: Mouth;
  eyes: Eyes;
  brow: number; // -1 皱眉 .. 1 挑眉
  sweat?: number; // 0..1
}

/** 侧面骨骼姿势（厘米 / 度）。肢体角度为根坐标系中的绝对方向：0=向下，90=向前，180=向上 */
export interface ProfilePose {
  px: number;
  py: number;
  R: number;
  tl: number;
  hd: number;
  aN1: number;
  aN2: number;
  aF1: number;
  aF2: number;
  lN1: number;
  lN2: number;
  lF1: number;
  lF2: number;
  sa: number; // 手杖方向
  staff: number; // 1 = 右手（近侧）握杖，0 = 无
  hatLift: number;
  flutter: number;
  expr: Expr;
}

const TORSO = 45;
const UPPER_ARM = 27;
const FOREARM = 25;
const THIGH = 40;
const SHIN = 39;

export function skeleton(p: ProfilePose) {
  const pelvis: V2 = [0, 0];
  const neck = rot2([0, -TORSO], p.tl);
  const shoulder = rot2([0, -TORSO + 5], p.tl);
  const head = add2(neck, rot2([4, -18], p.tl + p.hd));
  const elbowN = add2(shoulder, mul2(dir(p.aN1), UPPER_ARM));
  const handN = add2(elbowN, mul2(dir(p.aN2), FOREARM));
  const elbowF = add2(shoulder, mul2(dir(p.aF1), UPPER_ARM));
  const handF = add2(elbowF, mul2(dir(p.aF2), FOREARM));
  const hipN: V2 = [2, 0];
  const hipF: V2 = [-2, -2];
  const kneeN = add2(hipN, mul2(dir(p.lN1), THIGH));
  const ankleN = add2(kneeN, mul2(dir(p.lN2), SHIN));
  const kneeF = add2(hipF, mul2(dir(p.lF1), THIGH));
  const ankleF = add2(kneeF, mul2(dir(p.lF2), SHIN));
  return { pelvis, neck, shoulder, head, elbowN, handN, elbowF, handF, hipN, hipF, kneeN, ankleN, kneeF, ankleF };
}

const f = (n: number) => n.toFixed(2);
const line = (a: V2, b: V2) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;

function Limb({ a, b, c, w1, w2, color, dark }: { a: V2; b: V2; c: V2; w1: number; w2: number; color: string; dark?: boolean }) {
  return (
    <g>
      <path d={line(a, b)} stroke={C.ink} strokeWidth={w1 + 3} strokeLinecap="round" />
      <path d={line(b, c)} stroke={C.ink} strokeWidth={w2 + 3} strokeLinecap="round" />
      <path d={line(a, b)} stroke={color} strokeWidth={w1} strokeLinecap="round" />
      <path d={line(b, c)} stroke={color} strokeWidth={w2} strokeLinecap="round" />
      {dark && (
        <>
          <path d={line(a, b)} stroke="#000" strokeOpacity={0.28} strokeWidth={w1} strokeLinecap="round" />
          <path d={line(b, c)} stroke="#000" strokeOpacity={0.28} strokeWidth={w2} strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function Boot({ knee, ankle, shinAngle, dark }: { knee: V2; ankle: V2; shinAngle: number; dark?: boolean }) {
  const mid = add2(knee, mul2([ankle[0] - knee[0], ankle[1] - knee[1]], 0.35));
  const toeDir = dir(shinAngle + 90);
  const heel = add2(ankle, mul2(toeDir, -6));
  const toe = add2(ankle, mul2(toeDir, 17));
  const toeUp = add2(toe, mul2(dir(shinAngle + 180), 5));
  const sole = add2(ankle, mul2(dir(shinAngle), 6));
  const d = `M${f(heel[0])} ${f(heel[1])}L${f(sole[0] - toeDir[0] * 5)} ${f(sole[1] - toeDir[1] * 5)}L${f(toe[0] + (sole[0] - ankle[0]))} ${f(toe[1] + (sole[1] - ankle[1]))}Q${f(toeUp[0] + toeDir[0] * 4)} ${f(toeUp[1] + toeDir[1] * 4)} ${f(toeUp[0])} ${f(toeUp[1])}L${f(ankle[0] + toeDir[0] * 4)} ${f(ankle[1] + toeDir[1] * 4)}Z`;
  return (
    <g>
      <path d={line(mid, ankle)} stroke={C.ink} strokeWidth={15} strokeLinecap="round" />
      <path d={d} fill={C.boot} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
      <path d={line(mid, ankle)} stroke={C.boot} strokeWidth={12} strokeLinecap="round" />
      <path d={line(add2(mid, [1.5, 1]), add2(ankle, [1.5, -2]))} stroke={dark ? C.boot : C.bootHi} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

export function Staff({ hand, angle }: { hand: V2; angle: number }) {
  const d = dir(angle);
  const back = add2(hand, mul2(d, -48));
  const tip = add2(hand, mul2(d, 124));
  const knob = add2(hand, mul2(d, 118));
  return (
    <g>
      <path d={line(back, tip)} stroke={C.ink} strokeWidth={7.5} strokeLinecap="round" />
      <path d={line(back, tip)} stroke={C.staff} strokeWidth={4.8} strokeLinecap="round" />
      <path d={line(add2(back, [0.8, -0.8]), add2(tip, [0.8, -0.8]))} stroke={C.woodLight} strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={knob[0]} cy={knob[1]} r={5.2} fill={C.staffDark} stroke={C.ink} strokeWidth={1.6} />
      {[0.2, 0.55].map((u) => {
        const k = add2(back, mul2(d, 172 * u));
        return <circle key={u} cx={k[0]} cy={k[1]} r={3.3} fill={C.staffDark} />;
      })}
    </g>
  );
}

export function Head({ expr, hatLift, t }: { expr: Expr; hatLift: number; t: number }) {
  // 头部局部坐标：中心 (0,0)，面朝 +x
  const browY = -8 - expr.brow * 2.2;
  const browTilt = expr.brow * 5;
  const eyeOpenY = expr.eyes === 'wide' ? 4.6 : expr.eyes === 'squint' ? 1.2 : 3.6;
  const pupil: V2 =
    expr.eyes === 'down' ? [1.2, 2.2] : expr.eyes === 'up' ? [1.4, -1.8] : expr.eyes === 'wide' ? [0.4, 0] : [1.6, 0.2];
  let mouth: React.ReactNode = null;
  switch (expr.mouth) {
    case 'smile':
      mouth = <path d="M4 8.2 Q8.5 11.5 11.5 8" fill="none" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" />;
      break;
    case 'smug':
      mouth = <path d="M4.5 9 Q8 10.8 12 7.2" fill="none" stroke={C.ink} strokeWidth={1.7} strokeLinecap="round" />;
      break;
    case 'grin':
      mouth = <path d="M3.5 7.5 L12 7 Q10.5 12.5 5 11.5 Z" fill="#fff" stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />;
      break;
    case 'grit':
      mouth = (
        <g>
          <path d="M4 7.5 L12 7.4 L11.4 11 L4.5 11 Z" fill="#fff" stroke={C.ink} strokeWidth={1.5} />
          <path d="M4.3 9.2 L11.7 9.2 M7 7.5 V11 M9.5 7.4 V11" stroke={C.ink} strokeWidth={0.7} />
        </g>
      );
      break;
    case 'o':
      mouth = <ellipse cx={8.5} cy={9.8} rx={2.6} ry={3.3} fill="#5a1414" stroke={C.ink} strokeWidth={1.4} />;
      break;
    case 'wobble': {
      const w = Math.sin(t * 40) * 1.2;
      mouth = <path d={`M4 9 Q6 ${7.5 + w} 8 9 T12 ${8.6 - w}`} fill="none" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" />;
      break;
    }
    case 'scream':
      mouth = (
        <g>
          <path d="M3 7 Q8 5.5 13 7 Q13 17 8 17.5 Q3.5 16 3 7Z" fill="#5a1414" stroke={C.ink} strokeWidth={1.5} />
          <path d="M5 14.5 Q8 12.5 11 14.5 Q9 16.8 6 16Z" fill="#d9636b" />
        </g>
      );
      break;
  }
  const eyesClosed = expr.eyes === 'wink';
  return (
    <g>
      {/* 后脑头发 */}
      <path d="M-12 -6 Q-15 2 -9 7 L-5 3 Z" fill={C.beard} />
      {/* 脸 */}
      <path d="M-10 -8 Q-12 6 -4 11 Q2 14 8 12 L10 6 Q12 -2 11 -8 Q4 -12 -10 -8Z" fill={C.skin} stroke={C.ink} strokeWidth={1.6} />
      {/* 耳朵 */}
      <ellipse cx={-4} cy={0} rx={2.6} ry={3.8} fill={C.skinShade} stroke={C.ink} strokeWidth={1.2} />
      {/* 腮红 */}
      <ellipse cx={4} cy={4.5} rx={3} ry={2} fill={C.cheek} opacity={0.55} />
      {/* 胡子（山羊胡，末端上翘） */}
      <path d="M-1 9 Q1 16 7 21.5 Q11.5 25.5 16.5 21.5 Q13.5 22.8 12 19.5 Q11 16 12.2 12.2 Q7 14.5 -1 9Z" fill={C.beard} stroke={C.ink} strokeWidth={1} />
      {mouth}
      {/* 上翘八字胡 */}
      <path d="M6 6.2 Q10 4.4 14.2 5.8 Q17 5.2 17.6 2.2 Q18.4 6.8 14 7.6 Q10 8 6 6.2Z" fill={C.beard} />
      <path d="M8 6 Q4.5 6.8 2.5 4.5 Q2 6.8 4.5 7.6 Z" fill={C.beard} />
      {/* 鹰钩鼻 */}
      <path d="M8.5 -4 Q15.5 -1 16.5 3.4 Q16.8 5.8 13.6 5.4 Q12 5 11 4" fill={C.skin} stroke={C.ink} strokeWidth={1.6} strokeLinejoin="round" />
      {/* 眼睛 */}
      {eyesClosed ? (
        <path d="M3.5 -2.5 Q6.5 0.5 9.5 -2.5" fill="none" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" />
      ) : (
        <g>
          <ellipse cx={6.5} cy={-2.5} rx={3.3} ry={eyeOpenY} fill="#fff" stroke={C.ink} strokeWidth={1.3} />
          <circle cx={6.5 + pupil[0]} cy={-2.5 + pupil[1]} r={expr.eyes === 'wide' ? 1.3 : 1.7} fill={C.ink} />
          {expr.eyes === 'squint' && <path d="M3 -4.2 L10 -3.6" stroke={C.ink} strokeWidth={1.6} />}
        </g>
      )}
      {/* 眉毛 */}
      <path
        d={`M2 ${browY + 1} Q6 ${browY - 2} 11 ${browY + 0.5}`}
        transform={`rotate(${browTilt} 6.5 ${browY})`}
        fill="none"
        stroke={C.beard}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      {/* 花帽（朵帕） */}
      <g transform={`translate(0 ${-hatLift}) rotate(${-hatLift * 1.4} 0 -10)`}>
        <path d="M-12.8 -7 L-12 -18.5 Q0 -21.5 12 -18.5 L12.2 -7.5 Q0 -9.5 -12.8 -7Z" fill={C.hat} stroke={C.ink} strokeWidth={1.3} />
        <path d="M-12.5 -7 Q0 -9.5 12 -7.5 L12 -10 Q0 -12 -12.4 -9.6Z" fill={C.hatTrim} />
        {/* 巴旦木纹样 */}
        <path d="M-7 -12 Q-9 -15.5 -5.8 -18 Q-4 -15.2 -5.2 -13.8 Q-4.6 -12 -7 -12Z" fill={C.hatMotif} />
        <path d="M2 -12 Q0 -15.5 3.3 -18.2 Q5.2 -15.4 4 -13.8 Q4.5 -12 2 -12Z" fill={C.hatMotif} />
        <circle cx={-1.5} cy={-17.3} r={1} fill={C.hatMotif} />
        <circle cx={8.5} cy={-15.5} r={1.1} fill={C.hatMotif} />
        <circle cx={-10} cy={-16} r={0.9} fill={C.hatMotif} />
      </g>
      {expr.sweat ? (
        <g opacity={expr.sweat}>
          <path d="M-8 -14 Q-10 -9 -8 -8 Q-6 -9 -8 -14Z" fill="#9fd6ff" stroke="#3c7fb0" strokeWidth={0.6} transform={`translate(0 ${(t * 30) % 6})`} />
          <path d="M13 -12 Q11 -7 13 -6 Q15 -7 13 -12Z" fill="#9fd6ff" stroke="#3c7fb0" strokeWidth={0.6} transform={`translate(0 ${((t + 0.1) * 30) % 6})`} />
        </g>
      ) : null}
    </g>
  );
}

/** 返回两层：back（在毛驴身后的远侧肢体）和 front（身体、头、近侧肢体） */
export function afantiProfileLayers(p: ProfilePose, t: number, uid: string) {
  const s = skeleton(p);
  const flutter = p.flutter;
  const fl = Math.sin(t * 31) * 4 * flutter + Math.sin(t * 17) * 3 * flutter;
  // 长袍下摆
  const waistB = rot2([-13, 1], p.tl * 0.3);
  const waistF = rot2([13, 1], p.tl * 0.3);
  const kneeMid = add2(mul2(add2(s.kneeN, s.kneeF), 0.5), [0, 3]);
  const hemFront = add2(s.kneeN, mul2(dir(p.lN2), 6));
  const backHem = add2([-10 - 18 * flutter, 36 - 14 * flutter], [fl * 0.6 - 4 * flutter, fl]);
  const backHem2 = add2(mul2(add2(kneeMid, backHem), 0.5), [-6 * flutter, 6 + fl * 0.5]);
  const skirt = `M${f(waistB[0])} ${f(waistB[1])}L${f(waistF[0])} ${f(waistF[1])}Q${f(hemFront[0] + 6)} ${f((waistF[1] + hemFront[1]) / 2)} ${f(hemFront[0] + 2)} ${f(hemFront[1] + 2)}L${f(kneeMid[0])} ${f(kneeMid[1] + 6)}Q${f(backHem2[0])} ${f(backHem2[1])} ${f(backHem[0])} ${f(backHem[1])}Q${f(waistB[0] - 10)} ${f(waistB[1] + 20)} ${f(waistB[0])} ${f(waistB[1])}Z`;

  const torsoD = 'M-14 2 L14 2 Q19 -16 14 -34 Q12 -42 7 -44 L-9 -45 Q-16 -38 -16 -22 Q-16 -8 -14 2Z';
  const sashD = 'M-14 -1 L14 -1 L14.5 -9 L-14.5 -9Z';
  const sashTail = `M-13 -6 Q${-24 - 8 * flutter} ${-2 + fl * 0.4} ${-30 - 10 * flutter} ${4 + fl * 0.7} L${-27 - 10 * flutter} ${8 + fl * 0.7} Q${-21 - 6 * flutter} ${3 + fl * 0.3} -12 -2Z`;

  const back = (
    <g>
      <Limb a={s.hipF} b={s.kneeF} c={s.ankleF} w1={13} w2={11} color={C.trousers} dark />
      <Boot knee={s.kneeF} ankle={s.ankleF} shinAngle={p.lF2} dark />
      <Limb a={s.shoulder} b={s.elbowF} c={s.handF} w1={11} w2={10} color={C.sleeve} dark />
      <circle cx={s.handF[0]} cy={s.handF[1]} r={4.8} fill={C.skinShade} stroke={C.ink} strokeWidth={1.4} />
    </g>
  );

  const front = (
    <g>
      <path d={skirt} fill={`url(#${uid}-robe)`} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
      <path d={skirt} fill="#000" opacity={0.12} />
      <g transform={`rotate(${p.tl})`}>
        <path d={torsoD} fill={`url(#${uid}-robe)`} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M6 -43 Q12 -28 10 -6 L14 2 Q19 -16 14 -34 Q12 -42 7 -44Z" fill="#000" opacity={0.12} />
        {/* 恰袢衣襟 */}
        <path d="M7 -43 Q9 -26 12 -2" fill="none" stroke={C.gold} strokeWidth={2.2} />
        <path d={sashTail} fill={C.sash} stroke={C.ink} strokeWidth={1.2} />
        <path d={sashD} fill={C.sash} stroke={C.ink} strokeWidth={1.4} />
        <path d="M-14 -5 L14 -5" stroke={C.gold} strokeWidth={1} />
      </g>
      <Limb a={s.hipN} b={s.kneeN} c={s.ankleN} w1={13.5} w2={11.5} color={C.trousers} />
      <Boot knee={s.kneeN} ankle={s.ankleN} shinAngle={p.lN2} />
      <path d={`M${f(hemFront[0] - 8)} ${f(hemFront[1] - 10)}L${f(hemFront[0] + 5)} ${f(hemFront[1] + 1)}`} stroke="none" />
      <g transform={`translate(${f(s.head[0])} ${f(s.head[1])}) rotate(${p.tl + p.hd})`}>
        <path d="M-6 6 L-5 20 L6 20 L6 8Z" fill={C.skinShade} />
        <g transform="scale(1.42)">
          <Head expr={p.expr} hatLift={p.hatLift} t={t} />
        </g>
      </g>
      {p.staff > 0 && <Staff hand={s.handN} angle={p.sa} />}
      <Limb a={s.shoulder} b={s.elbowN} c={s.handN} w1={11.5} w2={10.5} color={C.sleeve} />
      <path d={line(s.elbowN, add2(s.elbowN, mul2(dir(p.aN2), FOREARM * 0.75)))} stroke={C.robeB} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <circle cx={s.handN[0]} cy={s.handN[1]} r={5} fill={C.skin} stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
  return { back, front, skeleton: s };
}

export function RobeDefs({ uid }: { uid: string }) {
  return (
    <pattern id={`${uid}-robe`} patternUnits="userSpaceOnUse" width={13} height={20}>
      <rect width={13} height={20} fill={C.robeA} />
      <rect x={4.5} width={1.6} height={20} fill={C.robeB} />
      <rect x={6.1} width={4} height={20} fill={C.robeC} />
      <rect x={10.1} width={1} height={20} fill={C.robeD} />
      <rect x={11.1} width={0.8} height={20} fill={C.robeB} />
    </pattern>
  );
}
