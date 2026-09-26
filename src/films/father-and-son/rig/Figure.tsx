import React from 'react';
import { Vec, add, f1, mul, pt, sub, v } from '../lib/math';
import { Build, Pose, Skel, fk } from './skeleton';

export interface FigureProps {
  b: Build;
  pose?: Pose;
  skel?: Skel;
  x: number;
  y: number;
  facing?: 1 | -1;
  color: string;
  /** Extra shapes drawn in the figure's local frame (twig, cane, kite string...). */
  children?: React.ReactNode;
}

const limbPath = (a: Vec, b: Vec, c: Vec) => `M${pt(a)}L${pt(b)}L${pt(c)}`;

const torsoPath = (b: Build, s: Skel) => {
  const axis = sub(s.shA, s.hipA);
  const hemDrop = b.garment === 'coat' ? 0.2 : b.garment === 'padded' ? 0.1 : b.garment === 'dress' ? 0 : 0.055;
  const dir = mul(axis, -hemDrop * b.H / Math.max(1, Math.hypot(axis.x, axis.y)));
  const flare = b.garment === 'coat' ? 1.25 : b.garment === 'padded' ? 1.3 : 1.05;
  const mid = mul(add(s.hipA, s.hipB), 0.5);
  const hA = add(add(mid, mul(sub(s.hipA, mid), flare)), dir);
  const hB = add(add(mid, mul(sub(s.hipB, mid), flare)), dir);
  const pad = b.garment === 'padded' ? 1.12 : 1;
  const smid = mul(add(s.shA, s.shB), 0.5);
  const sA = add(smid, mul(sub(s.shA, smid), pad));
  const sB = add(smid, mul(sub(s.shB, smid), pad));
  const r = b.H * 0.02;
  return `M${pt(hA)}L${pt(hB)}L${pt(sB)}Q${pt(add(sB, v(0, -r)))} ${pt(s.neck)}Q${pt(add(sA, v(0, -r)))} ${pt(sA)}Z`;
};

/** The dress flares from the waist to below the knees, following the legs. */
const dressPath = (b: Build, s: Skel) => {
  const waist = { a: vlerpLocal(s.hipA, s.shA, 0.35), b: vlerpLocal(s.hipB, s.shB, 0.35) };
  const kneeY = Math.max(s.legF.b.y, s.legN.b.y) + b.H * 0.03;
  const xs = [s.legF.b.x, s.legN.b.x, s.hipA.x, s.hipB.x];
  const minX = Math.min(...xs) - b.H * 0.035;
  const maxX = Math.max(...xs) + b.H * 0.035;
  return `M${pt(waist.a)}L${pt(waist.b)}L${f1(maxX)} ${f1(kneeY)}Q${f1((minX + maxX) / 2)} ${f1(kneeY + b.H * 0.015)} ${f1(minX)} ${f1(kneeY)}Z`;
};

const vlerpLocal = (a: Vec, b: Vec, t: number) => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

const HatShape: React.FC<{ b: Build; s: Skel; color: string }> = ({ b, s, color }) => {
  const r = b.headR;
  const c = s.head;
  const rot = (s.tilt * 180) / Math.PI;
  if (b.hat === 'douli') {
    // Conical bamboo hat: wide, shallow, sits low on the head.
    return (
      <g transform={`translate(${f1(c.x)} ${f1(c.y)}) rotate(${f1(rot * 0.6)})`}>
        <path d={`M${f1(-r * 2.5)} ${f1(-r * 0.05)}L0 ${f1(-r * 1.45)}L${f1(r * 2.5)} ${f1(-r * 0.05)}Q0 ${f1(r * 0.25)} ${f1(-r * 2.5)} ${f1(-r * 0.05)}Z`} fill={color} />
      </g>
    );
  }
  if (b.hat === 'cap') {
    return (
      <g transform={`translate(${f1(c.x)} ${f1(c.y)}) rotate(${f1(rot)})`}>
        <path d={`M${f1(-r * 1.05)} ${f1(-r * 0.2)}Q${f1(-r * 1.0)} ${f1(-r * 1.35)} 0 ${f1(-r * 1.32)}Q${f1(r * 1.1)} ${f1(-r * 1.3)} ${f1(r * 1.02)} ${f1(-r * 0.35)}L${f1(r * 1.75)} ${f1(-r * 0.2)}L${f1(r * 0.9)} ${f1(-r * 0.05)}Z`} fill={color} />
      </g>
    );
  }
  if (b.hat === 'hood') {
    return <circle cx={f1(c.x - r * 0.15)} cy={f1(c.y - r * 0.1)} r={f1(r * 1.3)} fill={color} />;
  }
  return null;
};

const HairShape: React.FC<{ b: Build; s: Skel; color: string }> = ({ b, s, color }) => {
  const r = b.headR;
  const c = s.head;
  if (b.hair === 'braids') {
    // Two plaits falling behind the shoulders, the 1980s way.
    const back = v(c.x - r * 0.75, c.y + r * 0.2);
    const end = v(c.x - r * 1.05, c.y + r * 2.9);
    return (
      <g fill="none" stroke={color} strokeLinecap="round">
        <path d={`M${pt(back)}Q${f1(back.x - r * 0.5)} ${f1(back.y + r * 1.2)} ${pt(end)}`} strokeWidth={f1(r * 0.42)} />
        <circle cx={f1(end.x)} cy={f1(end.y)} r={f1(r * 0.28)} fill={color} stroke="none" />
      </g>
    );
  }
  if (b.hair === 'bun') {
    return <circle cx={f1(c.x - r * 0.95)} cy={f1(c.y - r * 0.2)} r={f1(r * 0.45)} fill={color} />;
  }
  return null;
};

/** The whole figure as one flat silhouette. */
export const FigureShape: React.FC<{ b: Build; s: Skel; color: string }> = ({ b, s, color }) => {
  const legW = b.legW;
  const armW = b.armW;
  const legs = [s.legF, s.legN];
  const arms = [s.armF, s.armN];
  return (
    <g>
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        {legs.map((l, i) => (
          <g key={i}>
            <path d={`M${pt(l.a)}L${pt(l.b)}`} strokeWidth={f1(legW * 1.15)} />
            <path d={`M${pt(l.b)}L${pt(l.c)}`} strokeWidth={f1(legW * 0.88)} />
            {l.d && <path d={`M${pt(l.c)}L${pt(l.d)}`} strokeWidth={f1(legW * 0.72)} />}
          </g>
        ))}
        {arms.map((a, i) => (
          <path key={i} d={limbPath(a.a, a.b, a.c)} strokeWidth={f1(armW)} />
        ))}
      </g>
      <path d={torsoPath(b, s)} fill={color} stroke={color} strokeWidth={f1(b.H * 0.012)} strokeLinejoin="round" />
      {b.garment === 'dress' && <path d={dressPath(b, s)} fill={color} />}
      {b.satchel && (
        <g transform={`translate(${f1(s.hipA.x)} ${f1(s.hipA.y)})`}>
          <rect x={f1(-b.H * 0.07)} y={f1(-b.H * 0.13)} width={f1(b.H * 0.075)} height={f1(b.H * 0.1)} rx={f1(b.H * 0.012)} fill={color} />
        </g>
      )}
      <circle cx={f1(s.head.x)} cy={f1(s.head.y)} r={f1(b.headR)} fill={color} />
      <path d={`M${pt(s.neck)}L${pt(s.head)}`} stroke={color} strokeWidth={f1(b.headR * 0.9)} />
      {arms.map((a, i) => (
        <circle key={i} cx={f1(a.c.x)} cy={f1(a.c.y)} r={f1(armW * 0.62)} fill={color} />
      ))}
      <HairShape b={b} s={s} color={color} />
      <HatShape b={b} s={s} color={color} />
    </g>
  );
};

export const Figure: React.FC<FigureProps> = ({ b, pose, skel, x, y, facing = 1, color, children }) => {
  const s = skel ?? (pose ? fk(b, pose) : undefined);
  if (!s) return null;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${facing} 1)`}>
      <FigureShape b={b} s={s} color={color} />
      {children}
    </g>
  );
};

/** A willow switch held in a hand: a thin wand with a few hanging leaves. */
export const Twig: React.FC<{ at: Vec; angle: number; length: number; color: string; sway?: number }> = ({ at, angle, length, color, sway = 0 }) => {
  const dir = v(Math.cos(angle), Math.sin(angle));
  const tip = add(at, mul(dir, length));
  const ctrl = add(add(at, mul(dir, length * 0.55)), v(0, length * 0.12));
  const leaves = [0.3, 0.45, 0.6, 0.75, 0.9].map((t, i) => {
    const p = v(
      (1 - t) * (1 - t) * at.x + 2 * (1 - t) * t * ctrl.x + t * t * tip.x,
      (1 - t) * (1 - t) * at.y + 2 * (1 - t) * t * ctrl.y + t * t * tip.y,
    );
    const hang = length * (0.1 + 0.05 * (i % 2));
    return `M${pt(p)}q${f1(sway * hang * 0.4 + hang * 0.1)} ${f1(hang * 0.5)} ${f1(sway * hang * 0.7)} ${f1(hang)}`;
  });
  return (
    <g fill="none" stroke={color} strokeLinecap="round">
      <path d={`M${pt(at)}Q${pt(ctrl)} ${pt(tip)}`} strokeWidth={f1(Math.max(1, length * 0.03))} />
      <path d={leaves.join('')} strokeWidth={f1(Math.max(1.2, length * 0.045))} />
    </g>
  );
};
