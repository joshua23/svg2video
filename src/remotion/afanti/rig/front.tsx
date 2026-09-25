import React from 'react';
import { C } from '../palette';
import { V2, add2, mul2 } from '../math3d';
import { DonkeyState, LEG_OFFSETS } from '../plan';
import { Expr } from './afantiProfile';

const f = (n: number) => n.toFixed(2);
const line = (a: V2, b: V2) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
/** 正面平面内的方向：a=0 向下，a>0 向画面右 */
const fdir = (aDeg: number): V2 => [Math.sin((aDeg * Math.PI) / 180), Math.cos((aDeg * Math.PI) / 180)];

export const FRONT_SADDLE_Y = -104;

// ------------------------------------------------------------------ donkey front

export function DonkeyFront({ d, t, turn, children }: { d: DonkeyState; t: number; turn: number; children?: React.ReactNode }) {
  const lift = (leg: number) => {
    let ps = d.phase - LEG_OFFSETS[leg];
    ps -= Math.floor(ps);
    return ps < 0.4 ? 0 : Math.sin(((ps - 0.4) / 0.6) * Math.PI);
  };
  const bob = -Math.abs(Math.sin(d.phase * Math.PI * 2)) * 4;
  const headX = turn * 16;
  const headY = -98 + d.duck * 30 + bob * 0.5;
  const earWag = Math.sin(t * 12) * 6;
  const legF = (x: number, leg: number) => {
    const l = lift(leg);
    const top: V2 = [x, -62];
    const knee: V2 = [x + (x > 0 ? 2 : -2), -34 - l * 8];
    const hoof: V2 = [x + (x > 0 ? 1 : -1), -2 - l * 26];
    return (
      <g key={leg}>
        <path d={line(top, knee) + line(knee, hoof).replace('M', 'L')} stroke={C.ink} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={line(top, knee) + line(knee, hoof).replace('M', 'L')} stroke={C.donkey} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={line(add2(knee, [0, 8]), hoof)} stroke={C.donkeyDark} strokeWidth={6} />
        <rect x={hoof[0] - 6} y={hoof[1] - 2} width={12} height={8} rx={2} fill={C.hoof} />
      </g>
    );
  };
  const legH = (x: number, leg: number) => {
    const l = lift(leg);
    return (
      <g key={leg} opacity={0.95}>
        <path d={line([x, -66], [x, -10 - l * 18])} stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
        <path d={line([x, -66], [x, -10 - l * 18])} stroke={C.donkeyDark} strokeWidth={8.5} strokeLinecap="round" />
        <rect x={x - 5} y={-12 - l * 18} width={10} height={6} rx={2} fill={C.hoof} />
      </g>
    );
  };
  return (
    <g transform={`translate(0 ${f(bob)})`}>
      {legH(-15, 0)}
      {legH(15, 1)}
      {/* 臀部（后方） */}
      <ellipse cx={0} cy={-84} rx={27} ry={22} fill={C.donkeyDark} stroke={C.ink} strokeWidth={2} />
      {/* 鞍毯两侧 */}
      <path d="M-27 -104 L-34 -64 L-20 -62 L-18 -100Z" fill={C.blanket} stroke={C.ink} strokeWidth={1.6} />
      <path d="M27 -104 L34 -64 L20 -62 L18 -100Z" fill={C.blanket} stroke={C.ink} strokeWidth={1.6} />
      <path d="M-33 -70 L-20 -68 M33 -70 L20 -68" stroke={C.gold} strokeWidth={4} />
      {/* 胸 */}
      <ellipse cx={0} cy={-76} rx={23} ry={26} fill={C.donkey} stroke={C.ink} strokeWidth={2.2} />
      <ellipse cx={0} cy={-64} rx={14} ry={10} fill={C.donkeyLight} opacity={0.6} />
      {legF(-10, 2)}
      {legF(10, 3)}
      {/* 背上的马鞍 */}
      <path d="M-20 -102 Q0 -110 20 -102 L18 -96 Q0 -100 -18 -96Z" fill={C.saddle} stroke={C.ink} strokeWidth={1.6} />
      {children}
      {/* 脖子 */}
      <path d={`M-11 -84 L${f(headX * 0.5 - 10)} ${f(headY + 14)} L${f(headX * 0.5 + 10)} ${f(headY + 14)} L11 -84Z`} fill={C.donkey} stroke={C.ink} strokeWidth={2} />
      {/* 颈圈与铃 */}
      <path d={`M${f(-12 + headX * 0.2)} -88 Q${f(headX * 0.2)} -80 ${f(12 + headX * 0.2)} -88`} fill="none" stroke={C.blanket} strokeWidth={5} />
      <g transform={`translate(${f(headX * 0.2)} -82) rotate(${Math.sin(t * 22) * 25})`}>
        <path d="M-5 11 Q-5 1 0 1 Q5 1 5 11Z" fill={C.brass} stroke={C.ink} strokeWidth={1.2} />
      </g>
      {/* 头 */}
      <g transform={`translate(${f(headX)} ${f(headY)}) rotate(${turn * 8})`}>
        <g transform={`rotate(${-44 - earWag} -7 -18)`}>
          <path d="M-6 -18 Q-20 -46 -12 -60 Q-2 -46 -2 -18Z" fill={C.donkey} stroke={C.ink} strokeWidth={1.8} />
          <path d="M-6 -22 Q-15 -44 -11 -54 Q-5 -44 -4 -22Z" fill={C.earIn} />
          <path d="M-14.5 -55 Q-12 -63 -9.5 -55Z" fill={C.mane} />
        </g>
        <g transform={`rotate(${44 + earWag} 7 -18)`}>
          <path d="M6 -18 Q20 -46 12 -60 Q2 -46 2 -18Z" fill={C.donkey} stroke={C.ink} strokeWidth={1.8} />
          <path d="M6 -22 Q15 -44 11 -54 Q5 -44 4 -22Z" fill={C.earIn} />
          <path d="M14.5 -55 Q12 -63 9.5 -55Z" fill={C.mane} />
        </g>
        <path d="M-14 -12 Q-15 -24 0 -25 Q15 -24 14 -12 L12 14 Q12 28 0 28 Q-12 28 -12 14Z" fill={C.donkey} stroke={C.ink} strokeWidth={2} />
        <path d="M-11 12 Q-12 27 0 27 Q12 27 11 12 Q0 6 -11 12Z" fill={C.donkeyLight} />
        <ellipse cx={-4.5} cy={17} rx={2.2} ry={3.2} fill={C.ink} />
        <ellipse cx={4.5} cy={17} rx={2.2} ry={3.2} fill={C.ink} />
        <path d="M-5 23.5 Q0 25.5 5 23.5" stroke={C.ink} strokeWidth={1.2} fill="none" />
        <circle cx={-11} cy={-8} r={4.2} fill="#fff" stroke={C.ink} strokeWidth={1.2} />
        <circle cx={11} cy={-8} r={4.2} fill="#fff" stroke={C.ink} strokeWidth={1.2} />
        <circle cx={-10.5 + turn * 1.5} cy={-7.5} r={2.1} fill={C.ink} />
        <circle cx={10.5 + turn * 1.5} cy={-7.5} r={2.1} fill={C.ink} />
        <path d="M-6 -24 Q-3 -32 0 -24 Q3 -32 6 -24" fill={C.mane} />
        <path d="M-13 0 L13 0 M-12 -14 L-12 12 M12 -14 L12 12" stroke={C.blanket} strokeWidth={2.2} />
      </g>
    </g>
  );
}

// ------------------------------------------------------------------ Afanti front

export interface FrontPose {
  px: number;
  py: number;
  roll: number;
  hd: number;
  armL: [number, number];
  armR: [number, number];
  legL: [number, number];
  legR: [number, number];
  staff: 'toCam' | 'angle' | 'none';
  staffAng: number;
  flutter: number;
  hatLift: number;
  expr: Expr;
}

function FrontHead({ expr, t, hatLift }: { expr: Expr; t: number; hatLift: number }) {
  const eyeRy = expr.eyes === 'wide' ? 4.6 : expr.eyes === 'squint' ? 1.4 : 3.6;
  const pupilY = expr.eyes === 'down' ? 1.8 : expr.eyes === 'up' ? -1.8 : 0;
  const brow = expr.brow;
  let mouth: React.ReactNode;
  switch (expr.mouth) {
    case 'scream':
      mouth = <path d="M-5 5 Q0 3.5 5 5 Q5 15 0 15.5 Q-5 15 -5 5Z" fill="#5a1414" stroke={C.ink} strokeWidth={1.3} />;
      break;
    case 'o':
      mouth = <ellipse cx={0} cy={8} rx={2.8} ry={3.4} fill="#5a1414" stroke={C.ink} strokeWidth={1.2} />;
      break;
    case 'grin':
    case 'grit':
      mouth = (
        <g>
          <path d="M-6 5.5 Q0 7 6 5.5 Q5 11 0 11.5 Q-5 11 -6 5.5Z" fill="#fff" stroke={C.ink} strokeWidth={1.3} />
          {expr.mouth === 'grit' && <path d="M-5.5 8 H5.5 M-2 6.3 V11 M2 6.3 V11" stroke={C.ink} strokeWidth={0.7} />}
        </g>
      );
      break;
    case 'wobble':
      mouth = <path d={`M-5 8 Q-2 ${6 + Math.sin(t * 40)} 0 8 T5 8`} fill="none" stroke={C.ink} strokeWidth={1.4} />;
      break;
    case 'smug':
      mouth = <path d="M-5 7.5 Q1 10 5.5 5.5" fill="none" stroke={C.ink} strokeWidth={1.5} strokeLinecap="round" />;
      break;
    default:
      mouth = <path d="M-5 7 Q0 10.5 5 7" fill="none" stroke={C.ink} strokeWidth={1.5} strokeLinecap="round" />;
  }
  return (
    <g>
      <ellipse cx={-12} cy={0} rx={2.8} ry={4} fill={C.skinShade} stroke={C.ink} strokeWidth={1.1} />
      <ellipse cx={12} cy={0} rx={2.8} ry={4} fill={C.skinShade} stroke={C.ink} strokeWidth={1.1} />
      <path d="M-11 -8 Q-12 8 -5 13 Q0 15 5 13 Q12 8 11 -8 Q0 -12 -11 -8Z" fill={C.skin} stroke={C.ink} strokeWidth={1.5} />
      <ellipse cx={-6.5} cy={4} rx={2.6} ry={1.7} fill={C.cheek} opacity={0.5} />
      <ellipse cx={6.5} cy={4} rx={2.6} ry={1.7} fill={C.cheek} opacity={0.5} />
      <path d="M-3.5 10.5 Q0 13 3.5 10.5 Q3 18 1.5 22 Q4 24 5 22 Q3 26 0 25.5 Q-3 24 -3.5 10.5Z" fill={C.beard} />
      {mouth}
      <path d="M0 4 Q-5 2.5 -8.5 4.5 Q-11 4 -11.5 1 Q-12 6 -7 6.6 Q-3 6.8 0 5Z" fill={C.beard} />
      <path d="M0 4 Q5 2.5 8.5 4.5 Q11 4 11.5 1 Q12 6 7 6.6 Q3 6.8 0 5Z" fill={C.beard} />
      <path d="M-1.5 -4 Q-3 2 -3.2 3.6 Q0 4.8 3.2 3.6 Q3 2 1.5 -4" fill={C.skinShade} stroke={C.ink} strokeWidth={1.1} />
      {expr.eyes === 'wink' ? (
        <path d="M-7.5 -3 Q-5 -0.5 -2.5 -3" fill="none" stroke={C.ink} strokeWidth={1.4} />
      ) : (
        <g>
          <ellipse cx={-5} cy={-3} rx={3} ry={eyeRy} fill="#fff" stroke={C.ink} strokeWidth={1.1} />
          <circle cx={-5} cy={-3 + pupilY} r={1.6} fill={C.ink} />
        </g>
      )}
      <ellipse cx={5} cy={-3} rx={3} ry={eyeRy} fill="#fff" stroke={C.ink} strokeWidth={1.1} />
      <circle cx={5} cy={-3 + pupilY} r={1.6} fill={C.ink} />
      <path d={`M-9 ${-8.5 - brow * 2} Q-5 ${-10.5 - brow * 2.5} -1.5 ${-8 + brow * 0.5}`} stroke={C.beard} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d={`M9 ${-8.5 - brow * 2} Q5 ${-10.5 - brow * 2.5} 1.5 ${-8 + brow * 0.5}`} stroke={C.beard} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <g transform={`translate(0 ${-hatLift})`}>
        <path d="M-12.5 -7 L-11.8 -19 Q0 -21.5 11.8 -19 L12.5 -7 Q0 -9.5 -12.5 -7Z" fill={C.hat} stroke={C.ink} strokeWidth={1.2} />
        <path d="M-12.5 -7 Q0 -9.5 12.5 -7 L12.4 -9.6 Q0 -12 -12.4 -9.6Z" fill={C.hatTrim} />
        <path d="M-6 -12 Q-8 -15.5 -5 -18 Q-3.3 -15.2 -4.4 -13.8 Q-3.8 -12 -6 -12Z" fill={C.hatMotif} />
        <path d="M4 -12 Q2 -15.5 5 -18 Q6.8 -15.2 5.7 -13.8 Q6.3 -12 4 -12Z" fill={C.hatMotif} />
        <circle cx={-0.5} cy={-16} r={1} fill={C.hatMotif} />
        <circle cx={-10} cy={-14} r={0.9} fill={C.hatMotif} />
        <circle cx={10} cy={-14} r={0.9} fill={C.hatMotif} />
      </g>
    </g>
  );
}

function FLimb({ a, b, c, w1, w2, color }: { a: V2; b: V2; c: V2; w1: number; w2: number; color: string }) {
  const d = `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(c[0])} ${f(c[1])}`;
  return (
    <g>
      <path d={d} stroke={C.ink} strokeWidth={Math.max(w1, w2) + 3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={line(a, b)} stroke={color} strokeWidth={w1} strokeLinecap="round" />
      <path d={line(b, c)} stroke={color} strokeWidth={w2} strokeLinecap="round" />
    </g>
  );
}

export function AfantiFront({ p, t, uid }: { p: FrontPose; t: number; uid: string }) {
  const fl = Math.sin(t * 29) * 3 * p.flutter;
  const shL: V2 = [-18, -40];
  const shR: V2 = [18, -40];
  const elL = add2(shL, mul2(fdir(-p.armL[0]), 25));
  const hdL = add2(elL, mul2(fdir(-p.armL[1]), 23));
  const elR = add2(shR, mul2(fdir(p.armR[0]), 25));
  const hdR = add2(elR, mul2(fdir(p.armR[1]), 23));
  const hipL: V2 = [-8, 0];
  const hipR: V2 = [8, 0];
  const knL = add2(hipL, mul2(fdir(-p.legL[0]), 38));
  const anL = add2(knL, mul2(fdir(-p.legL[1]), 36));
  const knR = add2(hipR, mul2(fdir(p.legR[0]), 38));
  const anR = add2(knR, mul2(fdir(p.legR[1]), 36));
  // 手杖（右手 = 画面左手）
  let staff: React.ReactNode = null;
  if (p.staff === 'toCam') {
    const tip: V2 = add2(hdL, [10, 16]);
    const back: V2 = add2(hdL, [-9, -22]);
    staff = (
      <g>
        <path d={line(back, tip)} stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
        <path d={line(back, tip)} stroke={C.staff} strokeWidth={8.5} strokeLinecap="round" />
        <circle cx={tip[0]} cy={tip[1]} r={10} fill={C.staffDark} stroke={C.ink} strokeWidth={2} />
        <circle cx={tip[0] - 2.5} cy={tip[1] - 2.5} r={3} fill={C.woodLight} opacity={0.6} />
      </g>
    );
  } else if (p.staff === 'angle') {
    const dd = fdir(p.staffAng);
    const a = add2(hdL, mul2(dd, -45));
    const b = add2(hdL, mul2(dd, 120));
    staff = (
      <g>
        <path d={line(a, b)} stroke={C.ink} strokeWidth={7.5} strokeLinecap="round" />
        <path d={line(a, b)} stroke={C.staff} strokeWidth={4.8} strokeLinecap="round" />
        <circle cx={b[0]} cy={b[1]} r={5} fill={C.staffDark} stroke={C.ink} strokeWidth={1.5} />
      </g>
    );
  }
  const boot = (kn: V2, an: V2) => (
    <g>
      <path d={line(add2(kn, mul2([an[0] - kn[0], an[1] - kn[1]], 0.35)), an)} stroke={C.ink} strokeWidth={15} strokeLinecap="round" />
      <path d={line(add2(kn, mul2([an[0] - kn[0], an[1] - kn[1]], 0.35)), an)} stroke={C.boot} strokeWidth={12} strokeLinecap="round" />
      <ellipse cx={an[0]} cy={an[1] + 3} rx={7.5} ry={6} fill={C.boot} stroke={C.ink} strokeWidth={1.6} />
    </g>
  );
  return (
    <g transform={`translate(${f(p.px)} ${f(p.py)}) rotate(${f(p.roll)})`}>
      {/* 腿 */}
      <FLimb a={hipL} b={knL} c={anL} w1={13} w2={11} color={C.trousers} />
      <FLimb a={hipR} b={knR} c={anR} w1={13} w2={11} color={C.trousers} />
      {boot(knL, anL)}
      {boot(knR, anR)}
      {/* 长袍下摆 */}
      <path d={`M-16 -4 L${f(-22 - 6 * p.flutter)} ${f(26 + fl)} Q-12 ${f(22 - fl)} -4 12 L-3 -4Z`} fill={`url(#${uid}-robe)`} stroke={C.ink} strokeWidth={1.6} />
      <path d={`M16 -4 L${f(22 + 6 * p.flutter)} ${f(26 - fl)} Q12 ${f(22 + fl)} 4 12 L3 -4Z`} fill={`url(#${uid}-robe)`} stroke={C.ink} strokeWidth={1.6} />
      {/* 躯干 */}
      <path d="M-16 0 L16 0 Q20 -22 19 -38 Q12 -45 0 -45 Q-12 -45 -19 -38 Q-20 -22 -16 0Z" fill={`url(#${uid}-robe)`} stroke={C.ink} strokeWidth={1.8} />
      <path d="M-7 -44 L0 -30 L7 -44" fill="#f2ead8" stroke={C.ink} strokeWidth={1.2} />
      <path d="M0 -30 L0 -4" stroke={C.gold} strokeWidth={2} />
      <path d="M-17 -1 L17 -1 L17.5 -9 L-17.5 -9Z" fill={C.sash} stroke={C.ink} strokeWidth={1.3} />
      <path d={`M6 -3 Q${f(12 + fl)} 8 ${f(9 + fl)} 16 L${f(13 + fl)} 15 Q14 4 9 -3Z`} fill={C.sash} stroke={C.ink} strokeWidth={1} />
      {/* 头 */}
      <path d="M-5 -44 L-5 -50 L5 -50 L5 -44Z" fill={C.skinShade} />
      <g transform={`translate(0 -64) rotate(${f(p.hd)}) scale(1.42)`}>
        <FrontHead expr={p.expr} t={t} hatLift={p.hatLift} />
      </g>
      {/* 手臂 */}
      <FLimb a={shL} b={elL} c={hdL} w1={11} w2={10} color={C.sleeve} />
      <FLimb a={shR} b={elR} c={hdR} w1={11} w2={10} color={C.sleeve} />
      {staff}
      <circle cx={hdL[0]} cy={hdL[1]} r={5} fill={C.skin} stroke={C.ink} strokeWidth={1.4} />
      <circle cx={hdR[0]} cy={hdR[1]} r={5} fill={C.skin} stroke={C.ink} strokeWidth={1.4} />
    </g>
  );
}
