import React from 'react';
import { H, W, project, useCam, visibleX, zoomAt } from '../lib/camera';
import { Look } from '../lib/look';
import { f1, noise, rng } from '../lib/math';
import { CREST, HORIZON, SHORE_Z, restAt } from '../lib/stage';

/** Gradient ids must be unique per mounted instance and safe inside url(#...). */
export const useSvgId = (prefix: string) => `${prefix}-${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
const useId = useSvgId;

export const Sky: React.FC<{ look: Look; t: number; clouds?: number }> = ({ look, t, clouds = 0.6 }) => {
  const cam = useCam();
  const id = useId('sky');
  const hz = project(cam, { x: 0, y: HORIZON }, 0.06).y;
  const sun = project(cam, { x: look.sunX, y: look.sunY }, 0.03);
  const r = look.sunR * zoomAt(cam, 0.08);
  const rand = rng(7);
  const streaks = Array.from({ length: 7 }, (_, i) => {
    const y = 90 + rand() * 300;
    const x = ((rand() * 2600 + t * (6 + rand() * 6)) % 2800) - 400;
    const w = 300 + rand() * 500;
    const h = 8 + rand() * 18;
    return { x, y, w, h, o: (0.25 + rand() * 0.35) * clouds, i };
  });
  return (
    <g>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={f1(hz + 20)}>
          <stop offset="0" stopColor={look.skyTop} />
          <stop offset="0.6" stopColor={look.skyMid} />
          <stop offset="1" stopColor={look.skyLow} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor={look.sunGlow} stopOpacity={0.9} />
          <stop offset="0.25" stopColor={look.sunGlow} stopOpacity={0.45} />
          <stop offset="1" stopColor={look.sunGlow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-cloud`}>
          <stop offset="0" stopColor={look.haze} stopOpacity={1} />
          <stop offset="1" stopColor={look.haze} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill={`url(#${id})`} />
      {streaks.map((s) => (
        <ellipse key={s.i} cx={f1(s.x)} cy={f1(project(cam, { x: 0, y: s.y }, 0.04).y)} rx={f1(s.w)} ry={f1(s.h)} fill={`url(#${id}-cloud)`} opacity={f1(s.o * 10) / 10} />
      ))}
      {look.sunAlpha > 0.01 && (
        <g opacity={look.sunAlpha}>
          <circle cx={f1(sun.x)} cy={f1(sun.y)} r={f1(r * 9)} fill={`url(#${id}-sun)`} />
          <circle cx={f1(sun.x)} cy={f1(sun.y)} r={f1(r)} fill={look.sun} />
        </g>
      )}
    </g>
  );
};

const ridge = (seed: number, x0: number, x1: number, base: number, amp: number, freq: number) => {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += 16) {
    const n = noise(x * freq, seed) * 0.6 + noise(x * freq * 2.7, seed + 3) * 0.3 + noise(x * freq * 7, seed + 9) * 0.08;
    const peak = Math.pow(Math.max(0, n + 0.35), 1.6);
    pts.push(`${f1(x)} ${f1(base - amp * peak)}`);
  }
  return `M${x0} ${base + 40}L${pts.join('L')}L${x1} ${base + 40}Z`;
};

/** Ink-wash mountains dissolving into mist at their feet. */
export const Hills: React.FC<{ look: Look; show?: number }> = ({ look, show = 1 }) => {
  const cam = useCam();
  const id = useId('hill');
  const layers = [
    { p: 0.03, seed: 11, base: HORIZON + 6, amp: 120, freq: 0.0024, color: look.hillFar, o: 0.55 },
    { p: 0.06, seed: 23, base: HORIZON + 12, amp: 70, freq: 0.004, color: look.hillNear, o: 0.7 },
  ];
  return (
    <g opacity={show}>
      {layers.map((l, i) => {
        const z = zoomAt(cam, l.p);
        const top = project(cam, { x: 0, y: l.base - l.amp }, l.p).y;
        const bot = project(cam, { x: 0, y: l.base }, l.p).y;
        const ox = 960 + (cam.x - 960) * l.p;
        const oy = 540 + (cam.y - 540) * l.p;
        return (
          <g key={i}>
            <defs>
              <linearGradient id={`${id}-${i}`} gradientUnits="userSpaceOnUse" x1="0" y1={f1(top)} x2="0" y2={f1(bot)}>
                <stop offset="0" stopColor={l.color} stopOpacity={l.o} />
                <stop offset="0.7" stopColor={l.color} stopOpacity={l.o * 0.55} />
                <stop offset="1" stopColor={l.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <g transform={`translate(960 540) scale(${z.toFixed(4)}) translate(${f1(-ox)} ${f1(-oy)})`}>
              <path d={ridge(l.seed, -900, 2900, l.base, l.amp, l.freq)} fill={`url(#${id}-${i})`} />
            </g>
          </g>
        );
      })}
    </g>
  );
};

/** The far bank: a thin line of trees, a few roofs and a pagoda on a knoll. */
export const FarShore: React.FC<{ look: Look; pagoda?: boolean }> = ({ look, pagoda = true }) => {
  const cam = useCam();
  const p = 1 / SHORE_Z;
  const y = restAt(0, SHORE_Z).y;
  const rand = rng(41);
  const bumps: string[] = [];
  for (let x = -1400; x < 3400; x += 10 + rand() * 18) {
    const h = rand() < 0.18 ? 6 + rand() * 9 : 1.5 + rand() * 3;
    bumps.push(`${f1(x)} ${f1(y - h)}`);
  }
  const roofs = [380, 470, 1560, 1610, 1680].map((x, i) => (
    <path key={i} d={`M${x - 9} ${y - 5}Q${x} ${y - 11} ${x + 9} ${y - 5}L${x + 7} ${y}L${x - 7} ${y}Z`} fill={look.shore} />
  ));
  const px = 720;
  const tiers = Array.from({ length: 7 }, (_, i) => {
    const w = 11 - i * 1.1;
    const ty = y - 16 - i * 6.2;
    return `M${f1(px - w)} ${f1(ty)}Q${f1(px)} ${f1(ty - 3)} ${f1(px + w)} ${f1(ty)}L${f1(px + w * 0.6)} ${f1(ty + 5)}L${f1(px - w * 0.6)} ${f1(ty + 5)}Z`;
  });
  return (
    <g transform={layerTransformFor(cam, p)}>
      <path d={`M-1400 ${y + 4}L${bumps.join('L')}L3400 ${y + 4}Z`} fill={look.shore} />
      {pagoda && (
        <g fill={look.shore}>
          <path d={`M${px - 60} ${y}Q${px} ${y - 22} ${px + 70} ${y}Z`} />
          <path d={tiers.join('')} />
          <path d={`M${px} ${y - 64}L${px} ${y - 72}`} stroke={look.shore} strokeWidth={1.2} />
        </g>
      )}
      {roofs}
    </g>
  );
};

const layerTransformFor = (cam: { x: number; y: number; zoom: number }, p: number) => {
  const z = zoomAt(cam, p);
  const ox = 960 + (cam.x - 960) * p;
  const oy = 540 + (cam.y - 540) * p;
  return `translate(960 540) scale(${z.toFixed(4)}) translate(${f1(-ox)} ${f1(-oy)})`;
};

/**
 * The river, drawn in screen space between the far shore and the crest.
 * `level` < 1 shrinks it toward a silted bed (the drought years).
 */
export const Water: React.FC<{ look: Look; t: number; level?: number; mud?: string }> = ({ look, t, level = 1, mud }) => {
  const cam = useCam();
  const id = useId('water');
  const top = project(cam, restAt(960, SHORE_Z), 1 / SHORE_Z).y;
  const bot = project(cam, { x: 0, y: CREST + 30 }, 1).y;
  const sun = project(cam, { x: look.sunX, y: look.sunY }, 0.03);
  const glints: string[] = [];
  const ripples: string[] = [];
  if (look.glitterAlpha > 0.01 && level > 0.3) {
    for (let i = 0; i < 70; i++) {
      const d = i / 70;
      const z = SHORE_Z * Math.pow(1.2 / SHORE_Z, d);
      const pt = project(cam, restAt(960, z), 1 / z);
      const spread = (60 + 260 * d) * zoomAt(cam, 1 / z);
      for (let k = 0; k < 3; k++) {
        const n = noise(t * 2.2 + i * 1.7 + k * 13, 5);
        if (n < 0.05) continue;
        const cx = sun.x + noise(i * 3.1 + k * 7 + t * 0.3, 8) * spread;
        const len = (4 + 30 * d) * (0.4 + n) * zoomAt(cam, 1 / z) * 0.7;
        glints.push(`M${f1(cx - len)} ${f1(pt.y)}L${f1(cx + len)} ${f1(pt.y)}`);
      }
    }
  }
  const rand = rng(99);
  for (let i = 0; i < 46; i++) {
    const d = rand();
    const z = SHORE_Z * Math.pow(1.2 / SHORE_Z, d);
    const pt = project(cam, restAt(rand() * 2400 - 240 + t * 8 * (1 - d), z), 1 / z);
    const len = (20 + 120 * d) * zoomAt(cam, 1 / z);
    ripples.push(`M${f1(pt.x - len)} ${f1(pt.y)}L${f1(pt.x + len)} ${f1(pt.y)}`);
  }
  return (
    <g>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1={f1(top)} x2="0" y2={f1(bot)}>
          <stop offset="0" stopColor={look.waterFar} />
          <stop offset="1" stopColor={look.waterNear} />
        </linearGradient>
      </defs>
      <rect x={0} y={f1(top - 4)} width={W} height={f1(Math.max(0, bot - top + 4))} fill={`url(#${id})`} />
      <path d={ripples.join('')} stroke={look.glitter} strokeWidth={1.2} opacity={0.18 * level} />
      <path d={glints.join('')} stroke={look.glitter} strokeWidth={2} strokeLinecap="round" opacity={look.glitterAlpha * level} />
      {mud && level < 1 && <rect x={0} y={f1(top - 4)} width={W} height={f1(Math.max(0, bot - top + 4))} fill={mud} opacity={1 - level} />}
    </g>
  );
};

/** Road along the crest and the grassy landward slope. */
export const Dike: React.FC<{ look: Look; t: number; wind?: number; snow?: number }> = ({ look, t, wind = 0.3, snow = 0 }) => {
  const cam = useCam();
  const id = useId('dike');
  const [x0, x1] = visibleX(cam, 1, 300);
  const tufts: string[] = [];
  const fringe: string[] = [];
  const tile = 240;
  for (let ti = Math.floor(x0 / tile); ti <= Math.ceil(x1 / tile); ti++) {
    const rand = rng(1000 + ti);
    for (let k = 0; k < 16; k++) {
      const x = ti * tile + rand() * tile;
      const y = CREST + 16 + Math.pow(rand(), 1.6) * 460;
      const h = 5 + rand() * 9 + (y - CREST) * 0.02;
      const sway = wind * (6 + noise(t * 1.3 + x * 0.01, 3) * 5) * (h / 12);
      tufts.push(`M${f1(x - 3)} ${f1(y)}q${f1(sway * 0.3)} ${f1(-h * 0.6)} ${f1(sway - 3)} ${f1(-h)}M${f1(x)} ${f1(y)}q${f1(sway * 0.3)} ${f1(-h * 0.7)} ${f1(sway + 1)} ${f1(-h * 1.25)}M${f1(x + 3)} ${f1(y)}q${f1(sway * 0.3)} ${f1(-h * 0.6)} ${f1(sway + 4)} ${f1(-h * 0.9)}`);
    }
    for (let k = 0; k < 26; k++) {
      const x = ti * tile + rand() * tile;
      const h = 3 + rand() * 6;
      const sway = wind * (3 + noise(t * 1.6 + x * 0.02, 4) * 3);
      fringe.push(`M${f1(x)} ${CREST - 6}l${f1(sway)} ${f1(-h)}`);
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1={CREST} x2="0" y2={CREST + 520}>
          <stop offset="0" stopColor={look.slopeTop} />
          <stop offset="1" stopColor={look.slopeBottom} />
        </linearGradient>
      </defs>
      <rect x={f1(x0)} y={CREST + 8} width={f1(x1 - x0)} height={1200} fill={`url(#${id})`} />
      <rect x={f1(x0)} y={CREST - 7} width={f1(x1 - x0)} height={16} fill={look.road} />
      <rect x={f1(x0)} y={CREST + 8} width={f1(x1 - x0)} height={3} fill={look.grass} opacity={0.35} />
      <path d={fringe.join('')} stroke={look.grass} strokeWidth={1.3} strokeLinecap="round" opacity={0.8} />
      <path d={tufts.join('')} stroke={snow > 0.5 ? look.slopeBottom : look.grass} fill="none" strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
    </g>
  );
};
