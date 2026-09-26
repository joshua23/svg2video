import React from 'react';
import { accent, C, F } from '../ming/theme';
import { dash, hatch, hatchDense, prog, stag, useBeat } from '../ming/kit';
import maps from '../ming/art/maps.json';

const label = (size: number, weight = 700): React.CSSProperties => ({ fontFamily: F.serif, fontWeight: weight, fontSize: size, letterSpacing: '0.12em' });

/** 虫洞 — nested rotating ellipses collapsing toward a bright core. */
export const Wormhole: React.FC<{ cx: number; cy: number; at?: number }> = ({ cx, cy, at = 0 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 50, 'inout');
  const a = accent(mode);
  return (
    <g>
      {Array.from({ length: 18 }, (_, i) => {
        const k = ((i / 18 + f / 240) % 1);
        const rx = 40 + Math.pow(k, 1.6) * 900;
        const ry = rx * 0.32;
        return (
          <ellipse key={i} cx={cx + Math.sin(f / 40 + k * 3) * 30 * k} cy={cy} rx={rx} ry={ry} strokeWidth={0.6 + k * 1.8}
            transform={`rotate(${-12 + k * 20} ${cx} ${cy})`} opacity={p * (1 - k) * 0.95} />
        );
      })}
      {Array.from({ length: 24 }, (_, i) => {
        const t = (i / 24) * Math.PI * 2 + f * 0.004;
        return <line key={i} x1={cx + Math.cos(t) * 60} y1={cy + Math.sin(t) * 20} x2={cx + Math.cos(t) * 1100} y2={cy + Math.sin(t) * 360} strokeWidth={0.6} opacity={0.35 * p} />;
      })}
      <circle cx={cx} cy={cy} r={60} fill="url(#holeCore)" stroke="none" opacity={p} />
      <circle cx={cx} cy={cy} r={16} fill={a} stroke="none" opacity={p} />
      <defs>
        <radialGradient id="holeCore">
          <stop offset="0" stopColor="#fff3cf" stopOpacity={1} />
          <stop offset="0.4" stopColor={a} stopOpacity={0.6} />
          <stop offset="1" stopColor={a} stopOpacity={0} />
        </radialGradient>
      </defs>
    </g>
  );
};

/** 丰城轮 — a modern cargo ship loaded with containers and machinery. */
export const CargoShip: React.FC<{ x: number; y: number; s?: number; at?: number }> = ({ x, y, s = 1, at = 0 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 44, 'inout');
  const q = (i: number) => dash(stag(p, i, 8));
  const bob = Math.sin(f / 18) * 5;
  const a = accent(mode);
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${s})`} strokeWidth={2.2}>
      <path d="M-640 -60 L560 -60 Q640 -60 680 -140 L640 60 Q620 90 560 90 L-600 90 Q-640 80 -640 -60 Z" {...q(0)} />
      <path d="M-640 -60 L560 -60 Q640 -60 680 -140 L640 60 Q620 90 560 90 L-600 90 Q-640 80 -640 -60 Z" fill={hatchDense(mode)} stroke="none" opacity={0.45 * stag(p, 2, 8)} />
      <line x1={-620} y1={20} x2={640} y2={20} strokeWidth={1.2} {...q(1)} />
      {/* bridge */}
      <path d="M-600 -60 L-600 -300 L-440 -300 L-440 -60" {...q(1)} />
      {[-270, -220, -170, -120].map((yy) => (
        <line key={yy} x1={-590} y1={yy} x2={-450} y2={yy} strokeWidth={1} {...q(2)} />
      ))}
      <path d="M-620 -300 L-420 -300 L-420 -320 L-620 -320 Z" {...q(2)} />
      <path d="M-540 -320 L-540 -380 M-560 -380 L-520 -380" {...q(2)} />
      {/* containers */}
      {Array.from({ length: 24 }, (_, i) => {
        const col = i % 8;
        const row = Math.floor(i / 8);
        const cx = -400 + col * 116;
        const cy = -110 - row * 52;
        return (
          <rect key={i} x={cx} y={cy} width={108} height={48} strokeWidth={1.4}
            fill={(i * 7) % 5 === 0 ? a : 'none'} fillOpacity={0.35} {...dash(stag(p, 3 + (i / 24) * 3, 8))} />
        );
      })}
      {/* crane */}
      <path d="M460 -60 L460 -330 L620 -250" strokeWidth={3} {...q(6)} />
      <line x1={600} y1={-255} x2={600} y2={-170} strokeWidth={1} {...q(7)} />
      <path d="M-760 110 Q-700 95 -640 110 T-520 110 T-400 110 T-280 110 T-160 110 T-40 110 T80 110 T200 110 T320 110 T440 110 T560 110 T680 110 T800 110" strokeWidth={1.3} {...q(7)} />
      <text x={-560} y={70} fill="currentColor" stroke="none" style={label(28, 900)} opacity={stag(p, 7, 8)}>丰 城 轮</text>
    </g>
  );
};

/** 开会 — a long table seen from above, agenda items lighting up in turn. */
export const MeetingTable: React.FC<{ x: number; y: number; items: string[]; at?: number }> = ({ x, y, items, at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 30, 'inout');
  const W = 820;
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={2}>
      <rect x={-W / 2} y={-110} width={W} height={220} rx={110} {...dash(p)} />
      <rect x={-W / 2} y={-110} width={W} height={220} rx={110} fill={hatch(mode)} stroke="none" opacity={0.35 * p} />
      {Array.from({ length: 14 }, (_, i) => {
        const side = i < 7 ? -1 : 1;
        const k = i % 7;
        const cx = -W / 2 + 110 + k * ((W - 220) / 6);
        return <rect key={i} x={cx - 26} y={side < 0 ? -170 : 130} width={52} height={40} rx={10} opacity={stag(p, i / 14, 1.5)} />;
      })}
      <circle cx={-W / 2 - 60} cy={0} r={28} opacity={p} />
      {items.map((t, i) => {
        const on = prog(f, at + 24 + i * 12, 10);
        return (
          <g key={t} opacity={on}>
            <rect x={-W / 2 + 40 + i * ((W - 80) / items.length)} y={-40} width={(W - 80) / items.length - 16} height={80} rx={8} stroke={i === items.length - 1 ? a : 'currentColor'} fill={mode === 'dark' ? C.night : C.paper} />
            <text x={-W / 2 + 40 + i * ((W - 80) / items.length) + ((W - 80) / items.length - 16) / 2} y={12} textAnchor="middle" fill={i === items.length - 1 ? a : 'currentColor'} stroke="none" style={label(30, 900)}>{t}</text>
          </g>
        );
      })}
    </g>
  );
};

/** 炮 — a field gun on a carriage, firing. */
export const Cannon: React.FC<{ x: number; y: number; s?: number; at?: number }> = ({ x, y, s = 1, at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 30, 'inout');
  const fire = (t: number) => (t >= 0 && t < 16 ? 1 - t / 16 : 0);
  const fl = Math.max(fire(f - at - 34), fire(f - at - 70));
  const recoil = fl * 30;
  const spokes = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.6}>
      <line x1={-560} y1={0} x2={560} y2={0} {...dash(p)} />
      <g transform={`translate(${-recoil} 0)`}>
        <g transform="rotate(-10 0 -140)">
          <path d="M-260 -170 L300 -160 L300 -118 L-260 -104 Q-300 -137 -260 -170 Z" {...dash(stag(p, 1, 4))} />
          <path d="M-260 -170 L300 -160 L300 -118 L-260 -104 Q-300 -137 -260 -170 Z" fill={hatchDense(mode)} stroke="none" opacity={0.5 * p} />
          {[-120, 40, 200].map((bx) => <line key={bx} x1={bx} y1={-168} x2={bx} y2={-106} strokeWidth={4} opacity={p} />)}
        </g>
        <path d="M-420 0 L-120 -110 L60 -110 L40 -60 Z" {...dash(stag(p, 2, 4))} />
        <circle cx={-40} cy={-110} r={110} strokeWidth={5} {...dash(stag(p, 2, 4))} />
        {spokes.map((t, i) => <line key={i} x1={-40} y1={-110} x2={-40 + Math.cos(t) * 110} y2={-110 + Math.sin(t) * 110} strokeWidth={2} opacity={p} />)}
      </g>
      <g stroke="none" opacity={fl}>
        <circle cx={380} cy={-210} r={60 + (1 - fl) * 80} fill={a} opacity={0.35} />
        <circle cx={360} cy={-205} r={30} fill="#fff1c7" />
      </g>
      {Array.from({ length: 6 }, (_, i) => {
        const life = ((f / 50 + i / 6) % 1);
        return <circle key={i} cx={360 + life * 260} cy={-210 - life * 140} r={20 + life * 70} strokeWidth={1.2} opacity={(1 - life) * 0.6 * p} />;
      })}
    </g>
  );
};

/** 盐场 — a grid of evaporation pans filling in from the sea. */
export const SaltPans: React.FC<{ x: number; y: number; at?: number }> = ({ x, y, at = 0 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 50, 'inout');
  const cols = 8;
  const rows = 5;
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={2}>
      <path d="M-520 260 Q-400 240 -280 260 T-40 260 T200 260 T440 260 T560 260" {...dash(p)} />
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const px = -500 + c * 128;
        const py = -260 + r * 100;
        const o = stag(p, (c + (rows - r)) / (cols + rows), 1.4);
        // perspective-ish skew
        return (
          <g key={i} transform={`skewX(-18)`}>
            <rect x={px + r * 30} y={py} width={112} height={84} {...dash(o)} />
            <rect x={px + r * 30 + 6} y={py + 6} width={100} height={72} fill={(i % 5 === 0 ? hatchDense(mode) : hatch(mode))} stroke="none" opacity={0.6 * o} />
          </g>
        );
      })}
    </g>
  );
};

type Place = { name: string; xy: number[] };

/** Label nudges for places that sit close together on the small-scale map. */
const OFFSET: Record<string, [number, number, 'start' | 'end']> = {
  厦门: [-14, -10, 'end'], 澎湖: [-16, 30, 'end'], 安平: [16, 30, 'start'], 天津: [16, 28, 'start'],
  澳门: [16, 30, 'start'], 广州: [-14, -10, 'end'], 长崎: [16, 28, 'start'],
};

const PlaceDots: React.FC<{ places: Place[]; lit: string[]; done?: string[]; at: number; size?: number }> = ({ places, lit, done = [], at, size = 26 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const pulse = (f % 40) / 40;
  return (
    <g>
      {places.map((pl) => {
        const idx = lit.indexOf(pl.name);
        const on = idx >= 0 ? prog(f, at + idx * 12, 14) : 0;
        const isDone = done.includes(pl.name);
        const [x, y] = pl.xy;
        const col = on > 0 || isDone ? a : 'currentColor';
        const base = isDone ? 0.9 : 0.45;
        return (
          <g key={pl.name}>
            <circle cx={x} cy={y} r={on > 0 ? 9 : 5} fill={col} stroke="none" opacity={Math.max(base, on)} />
            {on > 0 && <circle cx={x} cy={y} r={9 + pulse * 46} stroke={a} strokeWidth={2} opacity={on * (1 - pulse)} />}
            <text x={x + (OFFSET[pl.name]?.[0] ?? 14)} y={y + (OFFSET[pl.name]?.[1] ?? -12)} textAnchor={OFFSET[pl.name]?.[2] ?? 'start'} fill={col} stroke="none" style={label(on > 0 ? size + 8 : size - 4, on > 0 ? 900 : 700)} opacity={Math.max(isDone ? 0.9 : 0.55, on)}>{pl.name}</text>
          </g>
        );
      })}
    </g>
  );
};

/** 东亚 — the stage for volumes five to eight, with named places lighting up. */
export const EastAsiaMap: React.FC<{ lit: string[]; done?: string[]; at?: number; arrows?: [string, string][] }> = ({ lit, done, at = 0, arrows = [] }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const base = prog(f, 0, 30);
  const m = maps.eastasia;
  const byName = Object.fromEntries(m.places.map((p) => [p.name, p.xy]));
  return (
    <g>
      <path d={m.graticule} strokeWidth={0.6} opacity={0.25 * base} />
      <path d={m.land} fill={hatch(mode)} stroke="none" opacity={0.25 * base} />
      <path d={m.land} strokeWidth={1.2} {...dash(base)} />
      {arrows.map(([s, t], i) => {
        const [x0, y0] = byName[s];
        const [x1, y1] = byName[t];
        const mx = (x0 + x1) / 2 + (y1 - y0) * 0.25;
        const my = (y0 + y1) / 2 - (x1 - x0) * 0.25;
        return <path key={i} d={`M${x0} ${y0} Q${mx} ${my} ${x1} ${y1}`} stroke={a} strokeWidth={3} {...dash(prog(f, at + i * 10, 30, "inout"))} />;
      })}
      <PlaceDots places={m.places} lit={lit} done={done} at={at + 10} />
    </g>
  );
};

/** 珠江口 — the Pearl River Delta close-up. */
export const PearlRiverMap: React.FC<{ lit: string[]; done?: string[]; at?: number; fleet?: boolean }> = ({ lit, done, at = 0, fleet = false }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const base = prog(f, 0, 36, 'inout');
  const m = maps.prd;
  const byName = Object.fromEntries(m.places.map((p) => [p.name, p.xy]));
  const [hx, hy] = byName['虎门'];
  const [gx, gy] = byName['广州'];
  return (
    <g>
      <path d={m.land} fill={hatch(mode)} stroke="none" opacity={0.3 * base} />
      <path d={m.land} strokeWidth={1.4} {...dash(base)} />
      {fleet && (
        <path d={`M${hx + 120} ${1080} Q${hx + 80} ${hy + 200} ${hx} ${hy} Q${(hx + gx) / 2 + 60} ${(hy + gy) / 2} ${gx} ${gy}`} stroke={a} strokeWidth={3.5} strokeDasharray="14 10" opacity={base}
          style={{ clipPath: `inset(${(1 - prog(f, at, 60, 'inout')) * 100}% 0 0 0)` }} />
      )}
      <PlaceDots places={m.places} lit={lit} done={done} at={at + 10} size={30} />
    </g>
  );
};

/** 海南诸县 — the island with towns turning red as they fall. */
export const HainanTowns: React.FC<{ lit: string[]; at?: number }> = ({ lit, at = 0 }) => {
  const { f, mode } = useBeat();
  const base = prog(f, 0, 30, 'inout');
  const m = maps.hainan;
  return (
    <g>
      <path d={m.graticule} strokeWidth={0.6} opacity={0.25 * base} />
      <path d={m.land} fill={hatch(mode)} stroke="none" opacity={0.3 * base} />
      <path d={m.land} strokeWidth={1.6} {...dash(base)} />
      <PlaceDots places={m.towns} lit={lit} at={at} size={30} />
    </g>
  );
};
