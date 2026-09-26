import React from 'react';
import { Vec, f1, pt, v } from '../lib/math';

/**
 * A small wu-peng sampan (乌篷船): low hull, arched bamboo awning amidships, and a
 * yuloh (橹) sculling oar over the stern. Metres, origin on the waterline amidships,
 * bow toward +x.
 */
export const boatPoints = (m: number, oarSwing = 0) => {
  const handle = v((-1.25 + oarSwing * 0.1) * m, (-1.12 + Math.abs(oarSwing) * 0.03) * m);
  const pivot = v(-1.95 * m, -0.52 * m);
  const dx = pivot.x - handle.x;
  const dy = pivot.y - handle.y;
  const k = 2.6;
  const blade = v(pivot.x + dx * k, pivot.y + dy * k + 0.25 * m);
  return { handle, pivot, blade, deck: v(-1.4 * m, -0.18 * m), mid: v(0, -0.25 * m) };
};

export const hullPath = (m: number) => {
  const p = (x: number, y: number) => `${f1(x * m)} ${f1(y * m)}`;
  return `M${p(-2.15, -0.62)}Q${p(-1.9, 0.12)} ${p(-1, 0.14)}L${p(1.1, 0.14)}Q${p(1.9, 0.1)} ${p(2.25, -0.66)}L${p(2.1, -0.62)}Q${p(1.2, -0.34)} ${p(0, -0.32)}Q${p(-1.3, -0.33)} ${p(-2.02, -0.58)}Z`;
};

export const Boat: React.FC<{
  x: number;
  y: number;
  m: number;
  color: string;
  facing?: 1 | -1;
  oarSwing?: number;
  oar?: boolean;
  awning?: boolean;
  rot?: number;
  children?: React.ReactNode;
}> = ({ x, y, m, color, facing = 1, oarSwing = 0, oar = true, awning = true, rot = 0, children }) => {
  const b = boatPoints(m, oarSwing);
  const p = (px: number, py: number) => `${f1(px * m)} ${f1(py * m)}`;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${facing} 1)`}>
      {awning && (
        <path
          d={`M${p(-0.35, -0.33)}C${p(-0.35, -1.05)} ${p(0.95, -1.05)} ${p(0.95, -0.33)}L${p(0.82, -0.33)}C${p(0.82, -0.9)} ${p(-0.22, -0.9)} ${p(-0.22, -0.33)}Z`}
          fill={color}
        />
      )}
      {awning && <path d={`M${p(-0.3, -0.33)}C${p(-0.3, -0.98)} ${p(0.9, -0.98)} ${p(0.9, -0.33)}Z`} fill={color} opacity={0.55} />}
      <path d={hullPath(m)} fill={color} />
      {oar && (
        <g fill="none" stroke={color} strokeLinecap="round">
          <path d={`M${pt(b.handle)}L${pt(b.pivot)}L${pt(b.blade)}`} strokeWidth={f1(Math.max(1, 0.05 * m))} />
          <path d={`M${pt(b.handle)}L${f1(-1.35 * m)} ${f1(-0.3 * m)}`} strokeWidth={f1(Math.max(0.6, 0.015 * m))} opacity={0.8} />
        </g>
      )}
      {children}
    </g>
  );
};

/** Short horizontal ripples drawn around a point on the water. */
export const Ripples: React.FC<{ at: Vec; w: number; t: number; color: string; opacity?: number }> = ({ at, w, t, color, opacity = 0.5 }) => {
  const lines: string[] = [];
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.6 + i / 5) % 1;
    const ww = w * (0.4 + ph * 0.9);
    const y = at.y + (i - 1) * w * 0.035 + ph * w * 0.02;
    lines.push(`M${f1(at.x - ww / 2)} ${f1(y)}L${f1(at.x + ww / 2)} ${f1(y)}`);
  }
  return <path d={lines.join('')} stroke={color} strokeWidth={f1(Math.max(0.7, w * 0.012))} opacity={opacity} strokeLinecap="round" />;
};
