import React from 'react';
import { accent } from '../theme';
import { dash, prog, rng, stag, useBeat } from '../kit';

const MANSIONS = '角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸';

/** 浑天仪 — an armillary sphere with the 28 lunar mansions, slowly turning. */
export const Armillary: React.FC<{ cx: number; cy: number; r: number; at?: number; len?: number; spin?: number; opacity?: number }> = ({
  cx, cy, r, at = 0, len = 60, spin = 0.6, opacity = 1,
}) => {
  const { f } = useBeat();
  const p = prog(f, at, len, 'inout');
  const a = (f * spin * Math.PI) / 180;
  const rings = [0, 0.7, 1.4, 2.2].map((k) => Math.abs(Math.cos(a + k)));
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} strokeWidth={2} {...dash(stag(p, 0, 8))} />
      <circle cx={cx} cy={cy} r={r * 0.9} strokeWidth={1} {...dash(stag(p, 1, 8))} />
      <circle cx={cx} cy={cy} r={r * 1.08} strokeWidth={0.8} strokeDasharray="2 10" opacity={stag(p, 2, 8) * 0.8} />
      {Array.from({ length: 120 }, (_, i) => {
        const t = (i / 120) * Math.PI * 2 + a * 0.3;
        const l = i % 10 === 0 ? 16 : 7;
        return (
          <line
            key={i}
            x1={cx + Math.cos(t) * r} y1={cy + Math.sin(t) * r}
            x2={cx + Math.cos(t) * (r - l)} y2={cy + Math.sin(t) * (r - l)}
            strokeWidth={1} opacity={stag(p, 2, 8)}
          />
        );
      })}
      {MANSIONS.split('').map((ch, i) => {
        const t = (i / 28) * Math.PI * 2 - a * 0.5;
        const rr = r * 0.95;
        return (
          <text
            key={i} x={cx + Math.cos(t) * rr} y={cy + Math.sin(t) * rr} fontSize={r * 0.055}
            fill="currentColor" stroke="none" textAnchor="middle" dominantBaseline="central"
            transform={`rotate(${(t * 180) / Math.PI + 90} ${cx + Math.cos(t) * rr} ${cy + Math.sin(t) * rr})`}
            opacity={stag(p, 3, 8)} style={{ fontFamily: 'MingSerif', fontWeight: 700 }}
          >
            {ch}
          </text>
        );
      })}
      {/* meridian and equatorial rings as turning ellipses */}
      <ellipse cx={cx} cy={cy} rx={r * 0.86 * rings[0]} ry={r * 0.86} strokeWidth={1.6} {...dash(stag(p, 4, 8))} />
      <ellipse cx={cx} cy={cy} rx={r * 0.86} ry={r * 0.86 * rings[1] * 0.4 + 2} strokeWidth={1.6} {...dash(stag(p, 4, 8))} />
      <ellipse cx={cx} cy={cy} rx={r * 0.78} ry={r * 0.78 * (rings[2] * 0.5 + 0.1)} strokeWidth={1.2} transform={`rotate(-23.5 ${cx} ${cy})`} {...dash(stag(p, 5, 8))} />
      <ellipse cx={cx} cy={cy} rx={r * 0.7 * rings[3]} ry={r * 0.7} strokeWidth={1} transform={`rotate(30 ${cx} ${cy})`} {...dash(stag(p, 5, 8))} />
      <line x1={cx - r * 0.86} y1={cy} x2={cx + r * 0.86} y2={cy} strokeWidth={0.8} opacity={0.5 * stag(p, 6, 8)} />
      <line x1={cx} y1={cy - r * 0.86} x2={cx} y2={cy + r * 0.86} strokeWidth={0.8} opacity={0.5 * stag(p, 6, 8)} />
      <circle cx={cx} cy={cy} r={r * 0.05} strokeWidth={1.5} {...dash(stag(p, 7, 8))} />
      <line x1={cx - r * 0.95} y1={cy - r * 0.35} x2={cx + r * 0.95} y2={cy + r * 0.35} strokeWidth={1.4} {...dash(stag(p, 7, 8))} />
    </g>
  );
};

/** Rising embers around a point — used for glow moments. */
export const Embers: React.FC<{ x: number; y: number; w?: number; n?: number; seed?: number; rise?: number; color?: string }> = ({
  x, y, w = 200, n = 40, seed = 7, rise = 260, color,
}) => {
  const { f, mode } = useBeat();
  const r = rng(seed);
  return (
    <g stroke="none">
      {Array.from({ length: n }, (_, i) => {
        const x0 = x + (r() - 0.5) * w;
        const speed = 0.4 + r() * 0.8;
        const phase = r();
        const life = ((f * speed) / 90 + phase) % 1;
        const px = x0 + Math.sin((f + i * 20) / 18) * 12 * life;
        const py = y - life * rise;
        const s = 1.2 + r() * 2.4;
        return <circle key={i} cx={px} cy={py} r={s * (1 - life)} fill={color ?? accent(mode)} opacity={(1 - life) * 0.9} />;
      })}
    </g>
  );
};

/** 启明星 — a four-pointed morning star with soft rays. */
export const MorningStar: React.FC<{ x: number; y: number; size?: number; at?: number }> = ({ x, y, size = 60, at = 0 }) => {
  const { f } = useBeat();
  const p = prog(f, at, 30);
  const pulse = 1 + Math.sin(f / 9) * 0.06;
  const s = size * p * pulse;
  const d = `M${x} ${y - s} Q${x + s * 0.12} ${y - s * 0.12} ${x + s} ${y} Q${x + s * 0.12} ${y + s * 0.12} ${x} ${y + s} Q${x - s * 0.12} ${y + s * 0.12} ${x - s} ${y} Q${x - s * 0.12} ${y - s * 0.12} ${x} ${y - s} Z`;
  return (
    <g stroke="none">
      <circle cx={x} cy={y} r={s * 2.2} fill="url(#starGlow)" opacity={0.8 * p} />
      <path d={d} fill="#fff6dc" opacity={p} />
      <path d={d} fill="#fff6dc" opacity={0.6 * p} transform={`translate(${x} ${y}) rotate(45) scale(0.45) translate(${-x} ${-y})`} />
      <defs>
        <radialGradient id="starGlow">
          <stop offset="0" stopColor="#ffe7a8" stopOpacity={0.9} />
          <stop offset="0.35" stopColor="#e9c778" stopOpacity={0.35} />
          <stop offset="1" stopColor="#e9c778" stopOpacity={0} />
        </radialGradient>
      </defs>
    </g>
  );
};

/** Radiating lines behind a subject (reference: "REBIRTH"). */
export const Rays: React.FC<{ cx: number; cy: number; n?: number; r0?: number; r1?: number; at?: number; opacity?: number }> = ({
  cx, cy, n = 60, r0 = 200, r1 = 1400, at = 0, opacity = 0.35,
}) => {
  const { f } = useBeat();
  const p = prog(f, at, 30);
  return (
    <g opacity={opacity * p}>
      {Array.from({ length: n }, (_, i) => {
        const t = (i / n) * Math.PI * 2 + f * 0.0015;
        return <line key={i} x1={cx + Math.cos(t) * r0} y1={cy + Math.sin(t) * r0} x2={cx + Math.cos(t) * r1 * p} y2={cy + Math.sin(t) * r1 * p} strokeWidth={i % 3 === 0 ? 2 : 1} />;
      })}
    </g>
  );
};
