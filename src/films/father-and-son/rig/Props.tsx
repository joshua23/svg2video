import React from 'react';
import { Vec, f1, pt, v } from '../lib/math';

/** Oil-paper umbrella (油纸伞) held up from `hand`. Local figure coordinates. */
export const Umbrella: React.FC<{ hand: Vec; size: number; color: string; tilt?: number }> = ({ hand, size, color, tilt = 0 }) => {
  const top = v(hand.x + Math.sin(tilt) * size * 0.75, hand.y - Math.cos(tilt) * size * 0.75);
  const r = size * 0.62;
  const rot = (tilt * 180) / Math.PI;
  const ribs: string[] = [];
  for (let i = -3; i <= 3; i++) ribs.push(`M0 0L${f1((i / 3) * r)} ${f1(r * 0.38 - Math.abs(i / 3) * r * 0.05)}`);
  return (
    <g>
      <path d={`M${pt(hand)}L${pt(top)}`} stroke={color} strokeWidth={f1(Math.max(1, size * 0.02))} />
      <g transform={`translate(${f1(top.x)} ${f1(top.y)}) rotate(${f1(rot)})`}>
        <path
          d={`M${f1(-r)} ${f1(r * 0.36)}Q${f1(-r * 0.9)} ${f1(-r * 0.25)} 0 ${f1(-r * 0.3)}Q${f1(r * 0.9)} ${f1(-r * 0.25)} ${f1(r)} ${f1(r * 0.36)}Q${f1(r * 0.67)} ${f1(r * 0.26)} ${f1(r * 0.5)} ${f1(r * 0.34)}Q${f1(r * 0.25)} ${f1(r * 0.24)} 0 ${f1(r * 0.33)}Q${f1(-r * 0.25)} ${f1(r * 0.24)} ${f1(-r * 0.5)} ${f1(r * 0.34)}Q${f1(-r * 0.67)} ${f1(r * 0.26)} ${f1(-r)} ${f1(r * 0.36)}Z`}
          fill={color}
        />
        <path d={ribs.join('')} stroke={color} strokeWidth={f1(Math.max(0.6, size * 0.008))} opacity={0.6} />
        <path d={`M0 ${f1(-r * 0.3)}l0 ${f1(-r * 0.12)}`} stroke={color} strokeWidth={f1(Math.max(1, size * 0.02))} />
      </g>
    </g>
  );
};

/** Swallow kite (沙燕风筝). Centre at (x, y), `s` = wingspan. */
export const Kite: React.FC<{ x: number; y: number; s: number; color: string; rot?: number }> = ({ x, y, s, color, rot = 0 }) => {
  const p = (a: number, b: number) => `${f1(a * s)} ${f1(b * s)}`;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})`}>
      <path
        d={`M${p(0, -0.22)}Q${p(0.08, -0.2)} ${p(0.07, -0.08)}Q${p(0.3, -0.16)} ${p(0.5, -0.05)}Q${p(0.3, -0.02)} ${p(0.1, 0.05)}L${p(0.07, 0.2)}L${p(0.16, 0.42)}L${p(0.02, 0.24)}L${p(0, 0.3)}L${p(-0.02, 0.24)}L${p(-0.16, 0.42)}L${p(-0.07, 0.2)}L${p(-0.1, 0.05)}Q${p(-0.3, -0.02)} ${p(-0.5, -0.05)}Q${p(-0.3, -0.16)} ${p(-0.07, -0.08)}Q${p(-0.08, -0.2)} ${p(0, -0.22)}Z`}
        fill={color}
      />
    </g>
  );
};

/** A walking stick from the hand to the ground. */
export const Cane: React.FC<{ hand: Vec; tip: Vec; color: string; w: number }> = ({ hand, tip, color, w }) => (
  <path d={`M${f1(hand.x - w)} ${f1(hand.y - w * 0.5)}Q${f1(hand.x)} ${f1(hand.y - w * 1.6)} ${f1(hand.x + w * 0.4)} ${f1(hand.y)}L${pt(tip)}`} stroke={color} strokeWidth={f1(w)} fill="none" strokeLinecap="round" />
);
