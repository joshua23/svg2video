import React from 'react';
import { accent, F } from '../theme';
import { dash, hatch, prog, stag, useBeat } from '../kit';
import maps from './maps.json';

const Label: React.FC<{ x: number; y: number; text: string; o: number; size?: number; dx?: number; dy?: number; anchor?: 'start' | 'middle' | 'end'; color?: string }> = ({
  x, y, text, o, size = 24, dx = 14, dy = -12, anchor = 'start', color,
}) => (
  <text x={x + dx} y={y + dy} fontSize={size} fill={color ?? 'currentColor'} stroke="none" opacity={o} textAnchor={anchor} style={{ fontFamily: F.serif, fontWeight: 700, letterSpacing: '0.12em' }}>
    {text}
  </text>
);

/** 郑和下西洋 — land, graticule and the treasure fleet's track. */
export const ZhengHeMap: React.FC<{ at?: number }> = ({ at = 0 }) => {
  const { f, mode } = useBeat();
  const base = prog(f, at, 30);
  const route = prog(f, at + 20, 70, 'inout');
  const branch = prog(f, at + 70, 50, 'inout');
  const a = accent(mode);
  const m = maps.zhenghe;
  return (
    <g>
      <path d={m.graticule} strokeWidth={0.6} opacity={0.25 * base} />
      <path d={m.land} fill={hatch(mode)} stroke="none" opacity={0.28 * base} />
      <path d={m.land} strokeWidth={1.2} {...dash(base)} />
      <path d={m.route} stroke={a} strokeWidth={3.5} {...dash(route)} />
      <path d={m.hormuz} stroke={a} strokeWidth={3} strokeDasharray="10 8" opacity={branch > 0 ? 1 : 0} {...{ pathLength: 1 }} style={{ clipPath: `inset(0 0 0 ${(1 - branch) * 100}%)` }} />
      <path d={m.africa} stroke={a} strokeWidth={3} strokeDasharray="10 8" opacity={branch > 0 ? 1 : 0} style={{ clipPath: `inset(0 0 0 ${(1 - branch) * 100}%)` }} />
      {m.ports.map((p, i) => {
        const o = i < 6 ? stag(route, i, 6, 0.85) : branch;
        return (
          <g key={p.name}>
            <circle cx={p.x} cy={p.y} r={7} fill={a} stroke="none" opacity={o} />
            <circle cx={p.x} cy={p.y} r={7 + (1 - o) * 30} stroke={a} strokeWidth={1.5} opacity={o * (1 - o) * 2} />
            <Label x={p.x} y={p.y} text={p.name} o={o} anchor={p.name === '马林迪' ? 'start' : 'start'} />
          </g>
        );
      })}
      {/* a treasure ship riding the line */}
      <TreasureShip x={660} y={500} s={0.32} o={base} />
    </g>
  );
};

/** 宝船 — a small junk silhouette used as a map ornament. */
export const TreasureShip: React.FC<{ x: number; y: number; s?: number; o?: number }> = ({ x, y, s = 1, o = 1 }) => {
  const { f, mode } = useBeat();
  const bob = Math.sin(f / 12) * 4;
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${s})`} opacity={o} strokeWidth={2.4}>
      <path d="M-200 0 Q-180 60 -120 70 L150 70 Q210 50 230 -10 L180 0 L-160 0 Z" fill={hatch(mode)} />
      <path d="M-200 0 Q-180 60 -120 70 L150 70 Q210 50 230 -10" />
      {[-110, -20, 70, 150].map((mx, i) => {
        const h = [170, 230, 200, 130][i];
        return (
          <g key={mx}>
            <line x1={mx} y1={0} x2={mx} y2={-h} />
            <path d={`M${mx - 50} ${-h + 10} L${mx + 45} ${-h + 10} L${mx + 55} ${-20} L${mx - 45} ${-20} Z`} fill="none" />
            {Array.from({ length: 5 }, (_, k) => (
              <line key={k} x1={mx - 48 + k} y1={-h + 10 + ((h - 30) / 5) * (k + 1)} x2={mx + 47 + k * 2} y2={-h + 10 + ((h - 30) / 5) * (k + 1)} strokeWidth={1} />
            ))}
          </g>
        );
      })}
      <path d="M-260 90 Q-230 80 -200 90 T-140 90 T-80 90 T-20 90 T40 90 T100 90 T160 90 T220 90 T280 90" strokeWidth={1.2} opacity={0.6} />
    </g>
  );
};

/** 海南 · 临高 — a close-up of the island with a landing marker. */
export const HainanMap: React.FC<{ at?: number }> = ({ at = 0 }) => {
  const { f, mode } = useBeat();
  const base = prog(f, at, 40, 'inout');
  const mark = prog(f, at + 36, 20);
  const a = accent(mode);
  const m = maps.hainan;
  const [lx, ly] = m.lingao;
  const [qx, qy] = m.qiongzhou;
  const pulse = (f % 40) / 40;
  return (
    <g>
      <path d={m.graticule} strokeWidth={0.6} opacity={0.25 * base} />
      <path d={m.land} fill={hatch(mode)} stroke="none" opacity={0.3 * base} />
      <path d={m.land} strokeWidth={1.6} {...dash(base)} />
      <Label x={m.island[0]} y={m.island[1]} text="海  南  岛" o={base} size={34} dx={0} dy={0} anchor="middle" />
      <Label x={m.leizhou[0]} y={m.leizhou[1]} text="雷  州" o={base * 0.7} size={24} dx={0} dy={0} anchor="middle" />
      <circle cx={qx} cy={qy} r={5} fill="currentColor" stroke="none" opacity={mark} />
      <Label x={qx} y={qy} text="琼州府" o={mark} size={22} />
      <g opacity={mark}>
        <circle cx={lx} cy={ly} r={10} fill={a} stroke="none" />
        <circle cx={lx} cy={ly} r={10 + pulse * 60} stroke={a} strokeWidth={2} opacity={1 - pulse} />
        <circle cx={lx} cy={ly} r={10 + ((pulse + 0.5) % 1) * 60} stroke={a} strokeWidth={2} opacity={1 - ((pulse + 0.5) % 1)} />
        <line x1={lx} y1={ly} x2={lx - 160} y2={ly - 170} stroke={a} strokeWidth={1.5} />
        <line x1={lx - 160} y1={ly - 170} x2={lx - 330} y2={ly - 170} stroke={a} strokeWidth={1.5} />
        <Label x={lx - 330} y={ly - 170} text="临高" o={1} size={44} dx={0} dy={-16} color={a} />
        <Label x={lx - 330} y={ly - 170} text="北纬 19°54′ · 东经 109°41′" o={1} size={16} dx={0} dy={30} />
      </g>
      {/* arriving fleet trail from the northwest */}
      <path d={`M${lx - 700} ${ly - 360} Q${lx - 300} ${ly - 320} ${lx - 18} ${ly - 8}`} stroke={a} strokeWidth={2.5} strokeDasharray="4 10" opacity={base} style={{ clipPath: `inset(0 ${(1 - prog(f, at + 10, 40)) * 100}% 0 0)` }} />
    </g>
  );
};

/** An orthographic globe; the West dims while China lights up. */
export const Globe: React.FC<{ x: number; y: number; s?: number; at?: number; highlight?: number }> = ({ x, y, s = 1, at = 0, highlight = 0 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 40, 'inout');
  const g = maps.globe;
  const a = accent(mode);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d={g.sphere} strokeWidth={2} {...dash(p)} />
      <path d={g.graticule} strokeWidth={0.5} opacity={0.3 * p} />
      <path d={g.land} fill={hatch(mode)} stroke="none" opacity={0.3 * p} />
      <path d={g.land} strokeWidth={1.1} opacity={p} />
      <path d={g.west} fill="currentColor" stroke="none" opacity={0.25 * p * (1 - highlight)} />
      <path d={g.china} fill={a} stroke={a} strokeWidth={1.5} opacity={p * (0.25 + 0.6 * highlight)} />
      <ellipse cx={0} cy={0} rx={470} ry={120} strokeWidth={1} opacity={0.4 * p} transform={`rotate(-18) `} strokeDasharray="3 9" />
    </g>
  );
};
