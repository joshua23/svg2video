import React from 'react';
import { C } from '../palette';
import { V2, add2, dir, mul2 } from '../math3d';
import { DonkeyState, LEG_OFFSETS } from '../plan';

const f = (n: number) => n.toFixed(2);
const line = (a: V2, b: V2) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;

export const BODY_Y = -76; // 身体中心离地高度（厘米）
/** 马鞍上阿凡提骨盆的位置（身体坐标系） */
export const SADDLE: V2 = [-3, -33];
export const POMMEL: V2 = [13, -37];

interface LegAngles {
  up: number;
  low: number;
}

function legAngles(d: DonkeyState, leg: number): LegAngles {
  const front = leg >= 2;
  let ps = d.phase - LEG_OFFSETS[leg];
  ps -= Math.floor(ps);
  let up: number;
  let low: number;
  const moving = Math.min(1, d.v / 1.5);
  if (ps < 0.4) {
    const u = ps / 0.4;
    up = 30 - 60 * u;
    low = up + (front ? 0 : -6) - 8 * Math.sin(Math.PI * u);
  } else {
    const u = (ps - 0.4) / 0.6;
    const s = u * u * (3 - 2 * u);
    up = -30 + 60 * s;
    low = up - (front ? 95 : 70) * Math.sin(Math.PI * Math.min(1, u * 1.15));
  }
  if (!front) {
    up += 12;
    low -= 4;
  }
  up *= moving;
  low = low * moving + (front ? 0 : -8) * (1 - moving);
  // 跳跃：前腿收起，后腿后伸
  if (d.airborne > 0) {
    const a = d.airborne;
    const tuck = front ? { up: 62, low: -55 } : { up: -48, low: -78 };
    up = up * (1 - a) + tuck.up * a;
    low = low * (1 - a) + tuck.low * a;
  }
  // 绊倒：前腿打弯跪下
  if (d.trip > 0 && front) {
    up = up * (1 - d.trip) + (leg === 2 ? -20 : 10) * d.trip;
    low = low * (1 - d.trip) + (leg === 2 ? -95 : -60) * d.trip;
  }
  if (d.crouch > 0) {
    up += (front ? -10 : 18) * d.crouch;
    low += (front ? 25 : -30) * d.crouch;
  }
  return { up, low };
}

const HIPS: V2[] = [
  [-40, 6], // HL (远)
  [-37, 8], // HR (近)
  [33, 8], // FL (远)
  [36, 10], // FR (近)
];

function Leg({ hip, a, far, front }: { hip: V2; a: LegAngles; far: boolean; front: boolean }) {
  const U = front ? 31 : 33;
  const L = front ? 34 : 34;
  const knee = add2(hip, mul2(dir(a.up), U));
  const ankle = add2(knee, mul2(dir(a.low), L));
  const hoofDir = dir(a.low);
  const hoofEnd = add2(ankle, mul2(hoofDir, 7));
  const col = far ? C.donkeyDark : C.donkey;
  return (
    <g>
      <path d={line(hip, knee)} stroke={C.ink} strokeWidth={front ? 16 : 19} strokeLinecap="round" />
      <path d={line(knee, ankle)} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
      <path d={line(hip, knee)} stroke={col} strokeWidth={front ? 13 : 16} strokeLinecap="round" />
      <path d={line(knee, ankle)} stroke={col} strokeWidth={7.5} strokeLinecap="round" />
      <path d={line(add2(knee, mul2(dir(a.low), 18)), ankle)} stroke={far ? C.donkeyDeep : C.donkeyDark} strokeWidth={6} strokeLinecap="round" />
      <path d={line(ankle, hoofEnd)} stroke={C.hoof} strokeWidth={10} strokeLinecap="butt" />
    </g>
  );
}

export interface DonkeyExtras {
  earFlop: number; // -1 向后贴 .. 1 竖起
  mouthOpen: number; // 0..1 驴叫
  eye: 'normal' | 'wide' | 'calm';
  t: number;
}

/** 侧面小毛驴（厘米，原点=身体中心，面朝 +x）。middle 在身体与近侧腿之间插入（用于阿凡提的远侧肢体等） */
export function DonkeyProfileBody({
  d,
  ex,
  back,
  middle,
  front,
}: {
  d: DonkeyState;
  ex: DonkeyExtras;
  back?: React.ReactNode;
  middle?: React.ReactNode;
  front?: React.ReactNode;
}) {
  const legs = [0, 1, 2, 3].map((i) => legAngles(d, i));
  const t = ex.t;
  // 脖子与头
  const neckBase: V2 = [34, -12];
  const neckAng = 138 - 42 * d.duck - 18 * d.trip + Math.sin(d.phase * Math.PI * 2) * 4;
  const neckEnd = add2(neckBase, mul2(dir(neckAng), 36));
  const headRot = -12 + 40 * d.duck + 20 * d.trip + Math.sin(d.phase * Math.PI * 2 + 1) * 3;
  const tailSwing = Math.sin(t * 9) * 12 + d.v * 2;
  const earA = 18 - ex.earFlop * 22 + Math.sin(t * 13) * 5;
  const earB = 30 - ex.earFlop * 20 + Math.sin(t * 13 + 0.8) * 6;
  const eyeR = ex.eye === 'wide' ? 4.4 : 3.6;
  const mo = ex.mouthOpen;

  return (
    <g>
      {back}
      {/* 远侧腿 */}
      <Leg hip={HIPS[0]} a={legs[0]} far front={false} />
      <Leg hip={HIPS[2]} a={legs[2]} far front />
      {/* 尾巴 */}
      <g transform={`rotate(${tailSwing} -54 -10)`}>
        <path d="M-54 -10 Q-66 4 -64 30" fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
        <path d="M-54 -10 Q-66 4 -64 30" fill="none" stroke={C.donkeyDark} strokeWidth={3} strokeLinecap="round" />
        <path d="M-64 26 Q-70 38 -63 46 Q-58 38 -61 26Z" fill={C.mane} />
      </g>
      {middle}
      {/* 脖子 */}
      <path
        d={`M${f(neckBase[0] - 16)} ${f(neckBase[1] - 12)}L${f(neckEnd[0] - 7)} ${f(neckEnd[1] - 6)}L${f(neckEnd[0] + 9)} ${f(neckEnd[1] + 5)}L${f(neckBase[0] + 14)} ${f(neckBase[1] + 12)}Z`}
        fill={C.donkey}
        stroke={C.ink}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* 鬃毛 */}
      {(() => {
        const a: V2 = [neckBase[0] - 16, neckBase[1] - 12];
        const b: V2 = [neckEnd[0] - 7, neckEnd[1] - 6];
        const n = dir(neckAng + 90);
        const pts: string[] = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          const base = add2(a, mul2([b[0] - a[0], b[1] - a[1]], u));
          const h = (i % 2 === 0 ? 7 : 4.5) + Math.sin(t * 20 + i) * 1.2;
          const p = add2(base, mul2(n, h));
          pts.push(`${f(p[0])} ${f(p[1])}`);
        }
        const d = `M${f(a[0])} ${f(a[1])}L${pts.join('L')}L${f(b[0])} ${f(b[1])}Z`;
        return <path d={d} fill={C.mane} stroke={C.ink} strokeWidth={1} strokeLinejoin="round" />;
      })()}
      {/* 身体 */}
      <path
        d="M-56 -6 Q-60 -22 -44 -25 Q-10 -30 26 -25 Q44 -22 47 -4 Q49 14 36 18 Q0 25 -40 18 Q-58 12 -56 -6Z"
        fill={C.donkey}
        stroke={C.ink}
        strokeWidth={2.2}
      />
      <path d="M-44 14 Q0 26 36 16 Q20 22 0 22 Q-24 22 -44 14Z" fill={C.donkeyLight} opacity={0.9} />
      <path d="M-50 -18 Q-10 -27 30 -21" fill="none" stroke={C.donkeyDeep} strokeWidth={3} opacity={0.6} />
      {/* 鞍毯 */}
      <path d="M-24 -26 L20 -27 Q23 -8 22 8 L-26 8 Q-27 -10 -24 -26Z" fill={C.blanket} stroke={C.ink} strokeWidth={1.8} />
      <path d="M-22 -2 L20 -2 L20.5 5 L-23.5 5Z" fill={C.gold} />
      <path d="M-20 1.5 L18 1.5" stroke={C.blanketDark} strokeWidth={1.4} strokeDasharray="3 2" />
      <path d="M-8 -20 L-2 -12 L-8 -4 L-14 -12Z" fill={C.gold} stroke={C.blanketDark} strokeWidth={0.8} />
      <path d="M6 -20 L12 -12 L6 -4 L0 -12Z" fill={C.gold} stroke={C.blanketDark} strokeWidth={0.8} />
      {[-22, -12, -2, 8, 18].map((x) => (
        <path key={x} d={`M${x} 8 L${x - 1.5 + Math.sin(t * 25 + x) * 1.5} 15`} stroke={C.gold} strokeWidth={2.4} strokeLinecap="round" />
      ))}
      {/* 马鞍 */}
      <path d="M-20 -27 Q-2 -24 16 -28 L18 -36 Q14 -40 11 -33 Q-2 -30 -15 -33 Q-19 -38 -22 -34Z" fill={C.saddle} stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-14 -30 Q0 -27 12 -30" fill="none" stroke={C.saddleHi} strokeWidth={1.6} />
      {/* 颈圈与铜铃 */}
      <path d={`M${f(neckBase[0] - 6)} ${f(neckBase[1] - 14)}L${f(neckBase[0] + 12)} ${f(neckBase[1] + 4)}`} stroke={C.blanket} strokeWidth={5} strokeLinecap="round" />
      <g transform={`translate(${f(neckBase[0] + 12)} ${f(neckBase[1] + 7)}) rotate(${Math.sin(t * 22) * 22 - d.pitch * 0.8})`}>
        <path d="M0 0 L0 4" stroke={C.ink} strokeWidth={1.5} />
        <path d="M-5 13 Q-5 3 0 3 Q5 3 5 13Z" fill={C.brass} stroke={C.ink} strokeWidth={1.3} />
        <circle cx={0} cy={13.5} r={1.8} fill={C.ink} />
        <path d="M-2.5 6 Q-2 5 -1 5" stroke="#fff6c8" strokeWidth={1.1} fill="none" />
      </g>
      {/* 头 */}
      <g transform={`translate(${f(neckEnd[0])} ${f(neckEnd[1])}) rotate(${f(headRot)})`}>
        {/* 远耳 */}
        <g transform={`rotate(${-earB} -4 -6)`}>
          <path d="M-7 -6 Q-12 -30 -6 -40 Q0 -30 -1 -6Z" fill={C.donkeyDark} stroke={C.ink} strokeWidth={1.6} />
        </g>
        <path
          d="M-10 -6 Q-8 -12 2 -11 L28 2 Q36 6 35 14 Q33 21 24 21 L10 20 Q-6 16 -10 -6Z"
          fill={C.donkey}
          stroke={C.ink}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path d={`M21 5 Q35 5 35 14 Q33 ${21 + mo * 4} 24 ${21 + mo * 2} L16 ${19 + mo * 2} Q14 10 21 5Z`} fill={C.donkeyLight} />
        {mo > 0.05 && <path d={`M22 17 Q30 ${18 + mo * 9} 34 16`} fill="#5a1d1d" stroke={C.ink} strokeWidth={1.2} />}
        <ellipse cx={31} cy={10} rx={1.8} ry={2.6} fill={C.ink} transform="rotate(-20 31 10)" />
        <path d="M24 17 Q29 19 33.5 17" fill="none" stroke={C.ink} strokeWidth={1.2} />
        {/* 笼头 */}
        <path d="M4 -8 L8 18 M6 4 L28 3" stroke={C.blanket} strokeWidth={2.4} fill="none" />
        <circle cx={7} cy={4} r={1.8} fill={C.brass} />
        {/* 眼睛 */}
        <ellipse cx={8} cy={-2} rx={eyeR * 0.9} ry={eyeR} fill="#fff" stroke={C.ink} strokeWidth={1.3} />
        <circle cx={9} cy={-1.5} r={2} fill={C.ink} />
        {ex.eye === 'calm' && <path d="M4 -4.5 Q8 -6.5 12 -4.2 L12 -2 Q8 -3 4 -2Z" fill={C.donkey} stroke={C.ink} strokeWidth={0.9} />}
        {/* 额毛 */}
        <path d="M-2 -11 Q2 -18 6 -11 Q7 -16 10 -9" fill={C.mane} />
        {/* 近耳 */}
        <g transform={`rotate(${-earA} -2 -8)`}>
          <path d="M-5 -8 Q-9 -34 -1 -44 Q6 -33 3 -8Z" fill={C.donkey} stroke={C.ink} strokeWidth={1.8} />
          <path d="M-3 -12 Q-5 -30 -1 -38 Q2 -30 1 -12Z" fill={C.earIn} />
          <path d="M-3.5 -38 Q-1 -46 1.5 -38Z" fill={C.mane} />
        </g>
      </g>
      {/* 肩部十字纹 */}
      <path d="M28 -22 Q30 -8 29 2" stroke={C.donkeyDeep} strokeWidth={2.2} fill="none" opacity={0.5} />
      {/* 近侧腿 */}
      <Leg hip={HIPS[1]} a={legs[1]} far={false} front={false} />
      <Leg hip={HIPS[3]} a={legs[3]} far={false} front />
      {/* 马镫 */}
      <path d="M0 -26 L0 12" stroke={C.saddle} strokeWidth={2.6} />
      <path d="M-5 12 L5 12 L3 17 L-3 17Z" fill="#8c8c8c" stroke={C.ink} strokeWidth={1.2} />
      {front}
    </g>
  );
}

/** 当前身体中心相对地面的偏移（厘米）：步态颠簸 + 跳跃 + 下蹲 */
export function bodyBob(d: DonkeyState) {
  const bob = d.airborne > 0 ? 0 : -Math.abs(Math.sin(d.phase * Math.PI * 2)) * 4 * Math.min(1, d.v / 2);
  return bob + d.crouch * 9 + d.trip * 10;
}
