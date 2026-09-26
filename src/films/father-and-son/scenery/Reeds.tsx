import React from 'react';
import { project, useCam, zoomAt } from '../lib/camera';
import { f1, lerp, noise, rng } from '../lib/math';
import { M, SHORE_Z, WATER_DROP, restAt } from '../lib/stage';

interface Reed {
  x: number;
  y: number;
  h: number;
  ph: number;
  lean: number;
}

/** Stems, arching blades and feathery plumes (芦花) for a batch of reeds sharing one scale. */
export const reedPaths = (reeds: Reed[], t: number, wind: number) => {
  const stems: string[] = [];
  const blades: string[] = [];
  const plumes: string[] = [];
  for (const r of reeds) {
    const sway = wind * (0.14 + 0.07 * Math.sin(t * 1.6 + r.ph) + 0.05 * noise(t * 0.8 + r.ph, 2)) + r.lean;
    const bend = sway * r.h;
    const tip = { x: r.x + bend, y: r.y - r.h * (1 - Math.abs(sway) * 0.12) };
    stems.push(`M${f1(r.x)} ${f1(r.y)}Q${f1(r.x + bend * 0.15)} ${f1(r.y - r.h * 0.6)} ${f1(tip.x)} ${f1(tip.y)}`);
    // two long leaves arching out and drooping
    for (let k = 0; k < 2; k++) {
      const side = (r.ph + k) % 2 > 1 ? 1 : -1;
      const u = 0.3 + k * 0.22;
      const bx = r.x + bend * u * u;
      const by = r.y - r.h * u;
      const L = r.h * (0.34 - k * 0.06);
      blades.push(`M${f1(bx)} ${f1(by)}q${f1(side * L * 0.35 + bend * 0.15)} ${f1(-L * 0.45)} ${f1(side * L * 0.8 + bend * 0.35)} ${f1(-L * 0.05)}`);
    }
    // plume: a loose fan of short strokes streaming downwind
    const dir = Math.sign(sway) || 1;
    const pl = r.h * 0.16;
    for (let k = 0; k < 5; k++) {
      const a = -1.35 + k * 0.28;
      const ex = tip.x + dir * Math.cos(a + 1.2) * pl * 0.9 + bend * 0.1;
      const ey = tip.y + Math.sin(a + 1.2) * pl * 0.55 + pl * 0.35;
      plumes.push(`M${f1(tip.x)} ${f1(tip.y)}Q${f1((tip.x + ex) / 2 + dir * pl * 0.15)} ${f1((tip.y + ey) / 2 - pl * 0.15)} ${f1(ex)} ${f1(ey)}`);
    }
  }
  return { stems: stems.join(''), blades: blades.join(''), plumes: plumes.join('') };
};

const ReedBatch: React.FC<{ reeds: Reed[]; t: number; wind: number; color: string; plume: string; w: number; opacity?: number }> = ({ reeds, t, wind, color, plume, w, opacity = 1 }) => {
  const { stems, blades, plumes } = reedPaths(reeds, t, wind);
  return (
    <g opacity={opacity}>
      <path d={stems} stroke={color} strokeWidth={f1(Math.max(0.5, w))} fill="none" />
      <path d={blades} stroke={color} strokeWidth={f1(Math.max(0.4, w * 1.1))} fill="none" strokeLinecap="round" opacity={0.85} />
      <path d={plumes} stroke={plume} strokeWidth={f1(Math.max(0.6, w * 1.5))} fill="none" strokeLinecap="round" opacity={0.9} />
    </g>
  );
};

/**
 * Reeds filling the dried river beyond the dike, from depth zFar down to zNear.
 * `grow` (0..1) raises them out of the retreating water.
 */
export const ReedField: React.FC<{ t: number; wind: number; color: string; plume: string; grow: number; zNear: number; zFar: number }> = ({
  t,
  wind,
  color,
  plume,
  grow,
  zNear,
  zFar,
}) => {
  const cam = useCam();
  if (grow <= 0.01) return null;
  const rows: React.ReactNode[] = [];
  const N = 26;
  for (let i = 0; i < N; i++) {
    const z = SHORE_Z * Math.pow(1.22 / SHORE_Z, i / (N - 1));
    if (z > zFar || z < zNear) continue;
    const p = 1 / z;
    const sc = zoomAt(cam, p) / z;
    const r = rng(4000 + i);
    const reeds: Reed[] = [];
    const spacing = Math.max(3, 16 * (1 / z));
    for (let x = -700 + r() * spacing; x < 2620; x += spacing * (0.6 + r() * 0.8)) {
      const base = project(cam, restAt(960 + (x - 960) * z, z, -WATER_DROP), p);
      const h = (1.9 + r() * 0.9) * M * sc * grow;
      reeds.push({ x: base.x, y: base.y, h, ph: r() * 6.28, lean: (r() - 0.5) * 0.08 });
    }
    rows.push(<ReedBatch key={i} reeds={reeds} t={t} wind={wind} color={color} plume={plume} w={1.6 * sc} opacity={lerp(0.55, 1, Math.min(1, 2 / z))} />);
  }
  return <g>{rows}</g>;
};

/** A clump of reeds on flat ground in world space (for the riverbed set). */
export const ReedClump: React.FC<{ x0: number; x1: number; y: number; t: number; wind: number; color: string; plume: string; h: number; seed: number; density?: number; w?: number; mass?: string }> = ({
  x0,
  x1,
  y,
  t,
  wind,
  color,
  plume,
  h,
  seed,
  density = 1,
  w = 1.6,
  mass,
}) => {
  const r = rng(seed);
  const reeds: Reed[] = [];
  const spacing = 7 / density;
  const top: string[] = [];
  for (let x = x0; x < x1; x += spacing * (0.5 + r())) {
    const edge = Math.min(1, (x - x0) / 160, (x1 - x) / 160);
    const hh = h * (0.5 + r() * 0.6) * (0.35 + 0.65 * Math.sqrt(Math.max(0, edge)));
    reeds.push({ x, y: y + (r() - 0.5) * 18, h: hh, ph: r() * 6.28, lean: (r() - 0.5) * 0.14 });
  }
  // a soft mass behind the stems so the clump reads as a dense bed
  for (let x = x0; x <= x1; x += 24) {
    const edge = Math.min(1, (x - x0) / 160, (x1 - x) / 160);
    const hh = h * 0.62 * Math.sqrt(Math.max(0, edge)) * (0.8 + 0.25 * noise(x * 0.02, seed));
    top.push(`${f1(x + wind * hh * 0.1)} ${f1(y - hh)}`);
  }
  return (
    <g>
      {mass && <path d={`M${x0} ${y + 10}L${top.join('L')}L${x1} ${y + 10}Z`} fill={mass} opacity={0.55} />}
      <ReedBatch reeds={reeds} t={t} wind={wind} color={color} plume={plume} w={w} />
    </g>
  );
};
