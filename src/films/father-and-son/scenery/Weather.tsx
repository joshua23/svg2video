import React from 'react';
import { H, W } from '../lib/camera';
import { TAU, f1, noise, rng } from '../lib/math';

/** Slanting spring rain in three depths. */
export const Rain: React.FC<{ t: number; amount?: number; color: string; slant?: number }> = ({ t, amount = 1, color, slant = 0.18 }) => {
  const layers = [
    { n: 140, len: 18, speed: 900, w: 0.9, o: 0.25 },
    { n: 90, len: 30, speed: 1300, w: 1.2, o: 0.32 },
    { n: 40, len: 52, speed: 1900, w: 1.6, o: 0.35 },
  ];
  return (
    <g>
      {layers.map((l, li) => {
        const r = rng(300 + li);
        const d: string[] = [];
        const n = Math.round(l.n * amount);
        for (let i = 0; i < n; i++) {
          const x0 = r() * (W + 400) - 200;
          const off = r() * (H + 200);
          const y = ((off + t * l.speed) % (H + 200)) - 100;
          const x = x0 + y * slant;
          d.push(`M${f1(x)} ${f1(y)}l${f1(l.len * slant)} ${f1(l.len)}`);
        }
        return <path key={li} d={d.join('')} stroke={color} strokeWidth={l.w} opacity={l.o} strokeLinecap="round" />;
      })}
    </g>
  );
};

/** Drifting snow. */
export const Snow: React.FC<{ t: number; amount?: number; color: string; wind?: number }> = ({ t, amount = 1, color, wind = 0.2 }) => {
  const layers = [
    { n: 160, r: 1.6, speed: 38, o: 0.55 },
    { n: 90, r: 2.6, speed: 60, o: 0.75 },
    { n: 35, r: 4.2, speed: 95, o: 0.9 },
  ];
  return (
    <g fill={color}>
      {layers.map((l, li) => {
        const r = rng(700 + li);
        const d: string[] = [];
        const n = Math.round(l.n * amount);
        for (let i = 0; i < n; i++) {
          const x0 = r() * (W + 600) - 300;
          const off = r() * (H + 100);
          const ph = r() * TAU;
          const y = ((off + t * l.speed) % (H + 100)) - 50;
          const x = (x0 + t * l.speed * wind * 3 + Math.sin(t * 0.9 + ph) * 18 + 3000) % (W + 600) - 300;
          d.push(`M${f1(x - l.r)} ${f1(y)}a${l.r} ${l.r} 0 1 0 ${f1(l.r * 2)} 0a${l.r} ${l.r} 0 1 0 ${f1(-l.r * 2)} 0`);
        }
        return <path key={li} d={d.join('')} opacity={l.o} />;
      })}
    </g>
  );
};

/** Leaves torn off by the wind, tumbling across the frame. */
export const Leaves: React.FC<{ t: number; amount?: number; color: string; wind?: number; seed?: number }> = ({ t, amount = 1, color, wind = 1, seed = 1 }) => {
  const r = rng(900 + seed);
  const n = Math.round(46 * amount);
  const shapes: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const speed = (180 + r() * 260) * wind;
    const y0 = r() * H * 0.9;
    const off = r() * (W + 400);
    const size = 4 + r() * 6;
    const span = W + 400;
    const x = ((((off + t * speed) % span) + span) % span) - 200;
    const y = y0 + Math.sin(t * (1 + r() * 2) + i) * 40 + noise(t * 0.7 + i, seed) * 60 + x * 0.08 * Math.sign(wind);
    const rot = t * (200 + r() * 400) + i * 40;
    shapes.push(<ellipse key={i} cx={0} cy={0} rx={f1(size)} ry={f1(size * 0.4)} transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot % 360)}) scale(1 ${f1(Math.abs(Math.sin(rot * 0.02)) + 0.2)})`} />);
  }
  return (
    <g fill={color} opacity={0.75}>
      {shapes}
    </g>
  );
};

/** A skein of wild geese in V formation — 大雁南飞. */
export const Geese: React.FC<{ t: number; x: number; y: number; size: number; color: string; n?: number; dir?: 1 | -1 }> = ({ t, x, y, size, color, n = 9, dir = -1 }) => {
  const birds: string[] = [];
  for (let i = 0; i < n; i++) {
    const rank = Math.ceil(i / 2);
    const side = i % 2 ? 1 : -1;
    const bx = x - dir * rank * size * 2.2 + noise(t * 0.5 + i, 3) * size * 0.4;
    const by = y + side * rank * size * 1.2 + noise(t * 0.4 + i, 5) * size * 0.3;
    const flap = Math.sin(t * 7 + i * 0.8);
    const wy = -flap * size * 0.55;
    birds.push(`M${f1(bx - size)} ${f1(by + wy)}Q${f1(bx - size * 0.45)} ${f1(by + wy * 0.3 - size * 0.12)} ${f1(bx)} ${f1(by)}Q${f1(bx + size * 0.45)} ${f1(by + wy * 0.3 - size * 0.12)} ${f1(bx + size)} ${f1(by + wy)}`);
  }
  return <path d={birds.join('')} fill="none" stroke={color} strokeWidth={Math.max(1, size * 0.18)} strokeLinecap="round" strokeLinejoin="round" />;
};

/** Willow catkins and reed down (柳絮 · 芦花) drifting on the air — keeps the quiet shots breathing. */
export const Fluff: React.FC<{ t: number; amount?: number; color: string; wind?: number; seed?: number }> = ({ t, amount = 1, color, wind = 0.6, seed = 3 }) => {
  const r = rng(1300 + seed);
  const n = Math.round(70 * amount);
  const d: string[] = [];
  const span = W + 300;
  for (let i = 0; i < n; i++) {
    const depth = 0.4 + r() * 0.9;
    const speed = (26 + r() * 40) * wind * depth;
    const off = r() * span;
    const y0 = r() * H;
    const ph = r() * 6.28;
    const x = ((((off + t * speed) % span) + span) % span) - 150;
    const y = (((y0 - t * (6 + r() * 10) * depth + Math.sin(t * (0.6 + r()) + ph) * 26 * depth) % (H + 60)) + H + 60) % (H + 60) - 30;
    const rad = (1.1 + r() * 2.2) * depth;
    d.push(`M${f1(x - rad)} ${f1(y)}a${f1(rad)} ${f1(rad)} 0 1 0 ${f1(rad * 2)} 0a${f1(rad)} ${f1(rad)} 0 1 0 ${f1(-rad * 2)} 0`);
  }
  return <path d={d.join('')} fill={color} opacity={0.6} />;
};
