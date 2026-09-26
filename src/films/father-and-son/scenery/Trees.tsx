import React from 'react';
import { useCam, visibleX } from '../lib/camera';
import { useSvgId } from './Land';
import { f1, lerp, noise, rng } from '../lib/math';
import { CREST, M } from '../lib/stage';

/** Lombardy poplar (白杨): a tall, narrow flame of leaves on a slim trunk. */
export const Poplar: React.FC<{ x: number; y: number; h: number; seed: number; t: number; wind: number; leaf: number; color: string; foliage: string }> = ({
  x,
  y,
  h,
  seed,
  t,
  wind,
  leaf,
  color,
  foliage,
}) => {
  const sway = (u: number) => wind * u * u * h * (0.035 + 0.02 * noise(t * 0.9 + seed, seed));
  const left: string[] = [];
  const right: string[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const yy = -h * lerp(0.2, 1, u);
    const w = h * 0.075 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.02)), 0.75) * (1 - 0.35 * u);
    const jl = 1 + 0.18 * noise(i * 1.9, seed);
    const jr = 1 + 0.18 * noise(i * 2.3, seed + 5);
    const dx = sway(u);
    left.push(`${f1(dx - w * jl)} ${f1(yy)}`);
    right.unshift(`${f1(dx + w * jr)} ${f1(yy)}`);
  }
  const top = sway(1);
  const branches: string[] = [];
  if (leaf < 0.95) {
    const r = rng(seed);
    for (let i = 0; i < 30; i++) {
      const u = 0.2 + r() * 0.75;
      const y0 = -h * u;
      const side = r() < 0.5 ? 1 : -1;
      const len = h * (0.06 + r() * 0.14) * (1 - u * 0.55);
      const spread = 0.15 + r() * 0.3;
      branches.push(`M${f1(sway(u))} ${f1(y0)}q${f1(side * len * spread)} ${f1(-len * 0.45)} ${f1(side * len * spread * 0.8 + sway(Math.min(1, u + 0.1)) - sway(u))} ${f1(-len)}`);
    }
  }
  return (
    <g transform={`translate(${f1(x)} ${f1(y)})`}>
      <path d={`M${f1(-h * 0.012)} 0Q${f1(top * 0.3)} ${f1(-h * 0.5)} ${f1(top)} ${f1(-h * 0.97)}Q${f1(top * 0.3)} ${f1(-h * 0.5)} ${f1(h * 0.012)} 0Z`} fill={color} />
      {branches.length > 0 && <path d={branches.join('')} stroke={color} strokeWidth={f1(Math.max(0.8, h * 0.004))} fill="none" opacity={1 - leaf * 0.8} />}
      {leaf > 0.02 && <path d={`M${left.join('L')}L${right.join('L')}Z`} fill={foliage} opacity={f1(Math.min(1, leaf * 1.25) * 10) / 10} />}
      {leaf <= 0.02 && <path d={`M${left.join('L')}L${right.join('L')}Z`} fill={color} opacity={0.1} />}
    </g>
  );
};

/** The row of poplars along the crest, with a gap left around the willow. */
export const PoplarRow: React.FC<{ t: number; wind: number; leaf: number; color: string; foliage: string; gap?: [number, number]; spacing?: number; heightScale?: number }> = ({
  t,
  wind,
  leaf,
  color,
  foliage,
  gap = [-120, 150],
  spacing = 250,
  heightScale = 1,
}) => {
  const cam = useCam();
  const [x0, x1] = visibleX(cam, 1, 200);
  const trees: React.ReactNode[] = [];
  for (let k = Math.floor(x0 / spacing); k <= Math.ceil(x1 / spacing); k++) {
    const r = rng(500 + k * 7);
    const x = k * spacing + (r() - 0.5) * 50;
    if (x > gap[0] && x < gap[1]) continue;
    const h = (390 + r() * 90) * heightScale;
    trees.push(<Poplar key={k} x={x} y={CREST - 5} h={h} seed={k * 13 + 3} t={t} wind={wind} leaf={leaf} color={color} foliage={foliage} />);
  }
  return <g>{trees}</g>;
};

export interface WillowProps {
  x: number;
  y: number;
  /** 0 = a freshly planted switch, 1 = an old tree. */
  growth: number;
  seed: number;
  t: number;
  wind: number;
  leaf: number;
  color: string;
  foliage: string;
  lean?: number;
  scale?: number;
  /** Adds gnarled bulk to the trunk. */
  age?: number;
}

/** Weeping willow (垂柳) — the tree of farewells. */
export const Willow: React.FC<WillowProps> = ({ x, y, growth, seed, t, wind, leaf, color, foliage, lean = 0.1, scale = 1, age = 0 }) => {
  const g = Math.max(0, Math.min(1, growth));
  const h = lerp(0.45, 8.4, Math.pow(g, 1.1)) * M * scale;
  const r = rng(seed);
  const mature = Math.min(1, g * 2.2);
  const forkY = -h * lerp(0.7, 0.36, mature);
  const fork = { x: lean * h * 0.22, y: forkY };
  const tw = h * lerp(0.018, 0.042, mature) * (1 + age * 0.35);
  const trunk = `M${f1(-tw)} 0C${f1(-tw * 0.8)} ${f1(-h * 0.12)} ${f1(fork.x - tw * 0.9)} ${f1(forkY * 0.65)} ${f1(fork.x - tw * 0.55)} ${f1(forkY)}L${f1(fork.x + tw * 0.55)} ${f1(forkY)}C${f1(fork.x + tw * 0.9)} ${f1(forkY * 0.65)} ${f1(tw * 0.85)} ${f1(-h * 0.12)} ${f1(tw * 1.15)} 0Z`;
  // crown dome
  const cx = fork.x + lean * h * 0.08;
  const cy = -h * lerp(0.86, 0.7, mature);
  const rx = h * lerp(0.16, 0.44, mature);
  const ry = h * lerp(0.14, 0.3, mature);
  const nL = Math.round(lerp(2, 5, mature));
  const limbs: string[] = [];
  const limbBase: string[] = [];
  const twigs: string[] = [];
  const bez = (p0: number[], p1: number[], p2: number[], p3: number[], u: number) => {
    const m = 1 - u;
    return [0, 1].map((k) => m * m * m * p0[k] + 3 * m * m * u * p1[k] + 3 * m * u * u * p2[k] + u * u * u * p3[k]);
  };
  for (let i = 0; i < nL; i++) {
    const a = lerp(-2.75, -0.4, nL === 1 ? 0.5 : (i + (r() - 0.5) * 0.5) / (nL - 1));
    const k = 0.62 + r() * 0.3;
    const e = [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * 1.1];
    const s0 = [fork.x + (r() - 0.5) * tw * 0.6, forkY + r() * tw * 1.5];
    const side = Math.sign(e[0] - s0[0]) || 1;
    const L = Math.hypot(e[0] - s0[0], e[1] - s0[1]);
    const c1 = [s0[0] + side * L * 0.28, s0[1] - L * 0.18];
    const c2 = [e[0] - side * L * 0.12, e[1] + L * 0.25];
    limbs.push(`M${f1(s0[0])} ${f1(s0[1])}C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(e[0])} ${f1(e[1])}`);
    const h1 = bez(s0, c1, c2, e, 0.5);
    const hc1 = [(s0[0] + c1[0]) / 2, (s0[1] + c1[1]) / 2];
    limbBase.push(`M${f1(s0[0])} ${f1(s0[1])}Q${f1(hc1[0])} ${f1(hc1[1])} ${f1(h1[0])} ${f1(h1[1])}`);
    // secondary branches, arching out and over
    for (let j = 0; j < 4; j++) {
      const u = 0.35 + j * 0.17 + r() * 0.08;
      const [bx, by] = bez(s0, c1, c2, e, u);
      const out = side * (0.4 + r() * 0.8);
      const len = h * (0.1 + r() * 0.1);
      twigs.push(`M${f1(bx)} ${f1(by)}q${f1(out * len * 0.5)} ${f1(-len * 0.55)} ${f1(out * len)} ${f1(-len * 0.25)}`);
    }
  }
  const nS = Math.round(lerp(5, 110, g));
  const strands: string[] = [];
  const curtain = -h * lerp(0.08, 0.12, mature);
  for (let i = 0; i < nS; i++) {
    const a = lerp(-3.05, -0.09, (i + r() * 0.8) / nS);
    const k = 0.55 + r() * 0.45;
    const ax = cx + Math.cos(a) * rx * k;
    const ay = cy + Math.sin(a) * ry * k;
    const bottom = curtain - r() * h * 0.2 - (1 - Math.abs(Math.cos(a))) * h * 0.06;
    const L = bottom - ay;
    if (L <= 3) continue;
    const out = Math.cos(a) * rx * 0.22;
    const drift = L * 0.55 * Math.tanh(wind * (0.55 + 0.35 * noise(t * 0.6 + i * 0.37, seed))) + L * 0.04 * Math.sin(t * 1.5 + i * 0.9);
    strands.push(`M${f1(ax)} ${f1(ay)}C${f1(ax + out)} ${f1(ay - h * 0.03)} ${f1(ax + out * 1.2 + drift * 0.35)} ${f1(ay + L * 0.45)} ${f1(ax + out * 0.9 + drift)} ${f1(ay + L)}`);
  }
  const sPath = strands.join('');
  const sw = Math.max(0.6, h * 0.0022);
  const lw = Math.max(2.5, h * 0.024);
  const gid = useSvgId('crown');
  return (
    <g transform={`translate(${f1(x)} ${f1(y)})`}>
      <defs>
        <radialGradient id={gid}>
          <stop offset="0" stopColor={foliage} stopOpacity={0.7} />
          <stop offset="0.65" stopColor={foliage} stopOpacity={0.45} />
          <stop offset="1" stopColor={foliage} stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={trunk} fill={color} />
      <path d={limbBase.join('')} stroke={color} strokeWidth={f1(Math.max(1.2, tw * 0.62))} fill="none" strokeLinecap="round" />
      <path d={limbs.join('')} stroke={color} strokeWidth={f1(Math.max(1, tw * 0.3))} fill="none" strokeLinecap="round" />
      <path d={twigs.join('')} stroke={color} strokeWidth={f1(Math.max(0.7, tw * 0.11))} fill="none" strokeLinecap="round" />
      {leaf > 0.02 && <ellipse cx={f1(cx + wind * rx * 0.1)} cy={f1(cy + ry * 0.45)} rx={f1(rx * 1.15)} ry={f1(ry * 1.35)} fill={`url(#${gid})`} opacity={f1(leaf * 10) / 10} />}
      {leaf > 0.02 && <path d={sPath} stroke={foliage} strokeWidth={f1(lw)} fill="none" strokeLinecap="round" opacity={f1(leaf * 0.32 * 100) / 100} />}
      <path d={sPath} stroke={color} strokeWidth={f1(sw)} fill="none" opacity={0.7} />
    </g>
  );
};
