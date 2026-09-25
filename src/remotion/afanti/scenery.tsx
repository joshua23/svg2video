import React from 'react';
import { C } from './palette';
import { Camera, V2, V3, convexHull, pathD, project, projectPoly, rng, toCam, camToScreen, NEAR, W, H } from './math3d';
import { Mound, Rock, Shrub, Tree, RIDGE_FAR, RIDGE_MID, PEBBLES } from './world';
import { WHEEL } from './plan';

export interface Item {
  z: number;
  el: React.ReactNode;
}

const onScreen = (s: V2, m = 600) => s[0] > -m && s[0] < W + m && s[1] > -m && s[1] < H + m * 1.5;

// ------------------------------------------------------------------ sky & far

export function horizonY(cam: Camera) {
  const h: V3 = [cam.fwd[0], cam.fwd[1], 0];
  const l = Math.hypot(h[0], h[1]) || 1;
  const far: V3 = [cam.pos[0] + (h[0] / l) * 1e5, cam.pos[1] + (h[1] / l) * 1e5, cam.pos[2]];
  const q = toCam(cam, far);
  return q[2] > 1 ? camToScreen(cam, q)[1] : -2000;
}

export const SUN_DIR: V3 = (() => {
  const v: V3 = [0.62, 0.42, 0.66];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

export function Sky({ cam, uid }: { cam: Camera; uid: string }) {
  const hy = horizonY(cam);
  const sun = project(cam, [cam.pos[0] + SUN_DIR[0] * 1e5, cam.pos[1] + SUN_DIR[1] * 1e5, cam.pos[2] + SUN_DIR[2] * 1e5]);
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-sky`} gradientUnits="userSpaceOnUse" x1={0} y1={hy - 1400} x2={0} y2={hy}>
          <stop offset="0" stopColor="#3f86c9" />
          <stop offset="0.55" stopColor="#8fc0e3" />
          <stop offset="0.9" stopColor="#e6dcc0" />
          <stop offset="1" stopColor="#f6e2b6" />
        </linearGradient>
        <radialGradient id={`${uid}-sun`}>
          <stop offset="0" stopColor="#fffdf2" stopOpacity={1} />
          <stop offset="0.12" stopColor="#fff6cf" stopOpacity={0.95} />
          <stop offset="0.35" stopColor="#ffe9a8" stopOpacity={0.35} />
          <stop offset="1" stopColor="#ffe3a0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-600} y={-1200} width={W + 1200} height={H + 2400} fill={`url(#${uid}-sky)`} />
      {/* 高空薄云 */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const r = rng(300 + i);
        const a = r() * Math.PI * 2;
        const el = 0.2 + r() * 0.25;
        const dir: V3 = [Math.cos(a) * Math.cos(el), Math.sin(a) * Math.cos(el), Math.sin(el)];
        const p = project(cam, [cam.pos[0] + dir[0] * 1e4, cam.pos[1] + dir[1] * 1e4, cam.pos[2] + dir[2] * 1e4]);
        if (!p || !onScreen(p.s, 900)) return null;
        const w = 260 + r() * 300;
        return (
          <g key={i} opacity={0.55}>
            <ellipse cx={p.s[0]} cy={p.s[1]} rx={w} ry={w * 0.09} fill="#fdfaf2" />
            <ellipse cx={p.s[0] + w * 0.3} cy={p.s[1] - w * 0.05} rx={w * 0.5} ry={w * 0.07} fill="#ffffff" />
          </g>
        );
      })}
      {sun && onScreen(sun.s, 400) && <circle cx={sun.s[0]} cy={sun.s[1]} r={420} fill={`url(#${uid}-sun)`} />}
    </g>
  );
}

function RidgeRing({ cam, ridge, radius, zBase, fill, stroke, haze }: { cam: Camera; ridge: number[]; radius: number; zBase: number; fill: string; stroke?: string; haze?: string }) {
  const cx = WHEEL.x * 0.5;
  const n = ridge.length;
  const runs: { top: V2[]; base: V2[] }[] = [];
  let cur: { top: V2[]; base: V2[] } | null = null;
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const a = (k / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    const top = project(cam, [x, y, zBase + ridge[k]]);
    const base = project(cam, [x, y, zBase - 200]);
    if (top && base && top.s[0] > -3000 && top.s[0] < W + 3000) {
      if (!cur) {
        cur = { top: [], base: [] };
        runs.push(cur);
      }
      cur.top.push(top.s);
      cur.base.push(base.s);
    } else cur = null;
  }
  return (
    <g>
      {runs.map((r, i) =>
        r.top.length > 1 ? (
          <g key={i}>
            <path d={pathD([...r.top, ...r.base.reverse()])} fill={fill} stroke={stroke ?? 'none'} strokeWidth={1.5} />
            {haze && <path d={pathD([...r.top.map((p) => [p[0], p[1] + 28] as V2), ...r.base])} fill={haze} opacity={0.35} />}
          </g>
        ) : null,
      )}
    </g>
  );
}

export function FarLand({ cam }: { cam: Camera }) {
  return (
    <g>
      <RidgeRing cam={cam} ridge={RIDGE_FAR} radius={6200} zBase={-60} fill="#b9c3d0" />
      <RidgeRing cam={cam} ridge={RIDGE_FAR.map((h) => Math.max(0, h - 520))} radius={6150} zBase={460} fill="#eef2f6" />
      <RidgeRing cam={cam} ridge={RIDGE_MID} radius={1700} zBase={-10} fill="#c47a4d" stroke="#a9623b" haze="#e2b58c" />
    </g>
  );
}

export function Ground({ cam, uid }: { cam: Camera; uid: string }) {
  const S = 4000;
  const cx = cam.pos[0];
  const cy = cam.pos[1];
  const g = projectPoly(cam, [
    [cx - S, cy - S, 0],
    [cx + S, cy - S, 0],
    [cx + S, cy + S, 0],
    [cx - S, cy + S, 0],
  ]);
  const hy = horizonY(cam);
  if (!g) return null;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-ground`} gradientUnits="userSpaceOnUse" x1={0} y1={hy} x2={0} y2={hy + 700}>
          <stop offset="0" stopColor="#e8cfa2" />
          <stop offset="0.15" stopColor="#d9b681" />
          <stop offset="1" stopColor="#caa06a" />
        </linearGradient>
      </defs>
      <path d={pathD(g.s)} fill={`url(#${uid}-ground)`} />
    </g>
  );
}

/** 地面上的平面多边形（道路、车辙、阴影、大片砾石） */
export function GroundPoly({ cam, pts, fill, opacity = 1 }: { cam: Camera; pts: V3[]; fill: string; opacity?: number }) {
  const p = projectPoly(cam, pts);
  if (!p) return null;
  return <path d={pathD(p.s)} fill={fill} opacity={opacity} />;
}

export function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28, z = 0): V3[] {
  const out: V3[] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c, z]);
  }
  return out;
}

const PATCHES = (() => {
  const r = rng(555);
  return Array.from({ length: 26 }).map(() => ({
    x: -200 + r() * (WHEEL.x + 500),
    y: (r() < 0.5 ? -1 : 1) * (8 + r() * 160),
    rx: 14 + r() * 50,
    ry: 6 + r() * 20,
    rot: r() * 3,
    dark: r() < 0.6,
  }));
})();

export function RoadAndDecals({ cam }: { cam: Camera }) {
  const x0 = -120;
  const x1 = WHEEL.x + 260;
  return (
    <g>
      {PATCHES.map((p, i) => (
        <GroundPoly key={i} cam={cam} pts={ellipsePts(p.x, p.y, p.rx, p.ry, p.rot, 20)} fill={p.dark ? '#b88e5c' : '#ecd4a6'} opacity={0.45} />
      ))}
      <GroundPoly cam={cam} pts={[[x0, -2.6, 0], [x1, -2.6, 0], [x1, 2.6, 0], [x0, 2.6, 0]]} fill="#d6b17a" opacity={0.6} />
      <GroundPoly cam={cam} pts={[[x0, -1.9, 0], [x1, -1.9, 0], [x1, 1.9, 0], [x0, 1.9, 0]]} fill={C.road} />
      <GroundPoly cam={cam} pts={[[x0, -0.2, 0], [x1, -0.2, 0], [x1, 0.2, 0], [x0, 0.2, 0]]} fill="#d7b582" opacity={0.7} />
      <GroundPoly cam={cam} pts={[[x0, 0.52, 0], [x1, 0.52, 0], [x1, 0.74, 0], [x0, 0.74, 0]]} fill={C.rut} opacity={0.75} />
      <GroundPoly cam={cam} pts={[[x0, -0.74, 0], [x1, -0.74, 0], [x1, -0.52, 0], [x0, -0.52, 0]]} fill={C.rut} opacity={0.75} />
    </g>
  );
}

export function Pebbles({ cam }: { cam: Camera }) {
  const out: React.ReactNode[] = [];
  const h = Math.max(0.15, cam.pos[2]);
  for (let i = 0; i < PEBBLES.length; i++) {
    const p = PEBBLES[i];
    const dx = p.x - cam.pos[0];
    const dy = p.y - cam.pos[1];
    if (dx * dx + dy * dy > 1600) continue;
    const q = project(cam, [p.x, p.y, 0]);
    if (!q || q.z < 0.3 || !onScreen(q.s, 50)) continue;
    const rx = (cam.f * p.r) / q.z;
    if (rx < 0.6) continue;
    const ry = rx * Math.min(1, Math.max(0.12, h / Math.hypot(dx, dy)));
    const col = p.c < 0.33 ? '#8d6a45' : p.c < 0.66 ? '#a98a63' : '#e9d7b2';
    out.push(<ellipse key={i} cx={q.s[0]} cy={q.s[1]} rx={rx} ry={ry} fill={col} />);
  }
  return <g>{out}</g>;
}

// ------------------------------------------------------------------ billboards

function billboard(cam: Camera, p: V3) {
  const q = project(cam, p);
  if (!q) return null;
  return { s: q.s, z: q.z, k: cam.f / q.z };
}

export function treeItem(cam: Camera, tr: Tree, key: string): Item | null {
  const b = billboard(cam, tr.p);
  if (!b || b.z < 0.5 || !onScreen(b.s, b.k * 6)) return null;
  const r = rng(tr.seed);
  const h = tr.h;
  const clumps = Array.from({ length: 9 }).map(() => ({
    x: (r() - 0.5) * h * 0.7,
    y: -h * (0.55 + r() * 0.42),
    r: h * (0.12 + r() * 0.1),
    c: ['#e8b732', '#f3cf55', '#d99a22', '#f6dc7a', '#c7861d'][Math.floor(r() * 5)],
  }));
  const trunkTop = -h * 0.62;
  const bend = tr.lean * 0.02 * h;
  const el = (
    <g key={key} transform={`translate(${b.s[0].toFixed(1)} ${b.s[1].toFixed(1)}) scale(${b.k.toFixed(3)})`}>
      <path
        d={`M${-0.28} 0 Q${-0.1 + bend * 0.3} ${trunkTop * 0.5} ${bend - 0.12} ${trunkTop} L${bend + 0.14} ${trunkTop} Q${0.15 + bend * 0.4} ${trunkTop * 0.5} ${0.32} 0Z`}
        fill="#6e4a2c"
        stroke="#3f2816"
        strokeWidth={0.05}
      />
      <path d={`M${bend * 0.6} ${trunkTop * 0.7} L${bend - h * 0.18} ${trunkTop * 1.05} M${bend * 0.8} ${trunkTop * 0.85} L${bend + h * 0.2} ${trunkTop * 1.12}`} stroke="#5a3a20" strokeWidth={0.12} strokeLinecap="round" />
      {clumps.map((c, i) => (
        <g key={i}>
          <circle cx={c.x + bend} cy={c.y} r={c.r * 1.06} fill="#9c6a1a" opacity={0.5} />
          <circle cx={c.x + bend} cy={c.y} r={c.r} fill={c.c} />
          <circle cx={c.x + bend - c.r * 0.3} cy={c.y - c.r * 0.35} r={c.r * 0.45} fill="#fbe7a2" opacity={0.55} />
        </g>
      ))}
    </g>
  );
  return { z: b.z, el };
}

export function rockItem(cam: Camera, rk: Rock, key: string): Item | null {
  const b = billboard(cam, rk.p);
  if (!b || b.z < 0.25 || !onScreen(b.s, b.k * 2)) return null;
  const r = rng(rk.seed);
  const n = 8;
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const rr = rk.r * (0.8 + r() * 0.35);
    pts.push([Math.cos(a) * rr * 1.3, Math.sin(a) * rr * 0.95]);
  }
  const top: V2[] = pts.slice(2, 7).map((p) => [p[0] * 0.8, p[1] * 0.9 + rk.r * 0.08] as V2);
  const base = rk.tone < 0.5 ? '#9b7654' : '#b48b62';
  const el = (
    <g key={key} transform={`translate(${b.s[0].toFixed(1)} ${b.s[1].toFixed(1)}) scale(${b.k.toFixed(3)})`}>
      <ellipse cx={-rk.r * 0.3} cy={0} rx={rk.r * 1.6} ry={rk.r * 0.22} fill="#6b4a2e" opacity={0.35} />
      <path d={pathD(pts)} fill={base} stroke="#4d3320" strokeWidth={Math.max(0.02, rk.r * 0.05)} strokeLinejoin="round" />
      <path d={pathD(top)} fill="#d8b98f" opacity={0.7} />
      <path d={`M${pts[3][0] * 0.5} ${pts[3][1] * 0.6} L${pts[5][0] * 0.3} ${-rk.r * 0.1}`} stroke="#5d3f27" strokeWidth={rk.r * 0.04} />
    </g>
  );
  return { z: b.z, el };
}

export function shrubItem(cam: Camera, sh: Shrub, key: string): Item | null {
  const b = billboard(cam, sh.p);
  if (!b || b.z < 0.25 || !onScreen(b.s, b.k * 2)) return null;
  const r = rng(sh.seed);
  const spikes: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + 0.15 + (i / 13) * (Math.PI - 0.3);
    const l = sh.r * (0.7 + r() * 0.6);
    spikes.push(<path key={i} d={`M0 0 L${Math.cos(a) * l * 1.3} ${Math.sin(a) * l}`} stroke={r() < 0.3 ? '#9a7a3e' : '#7d8a3c'} strokeWidth={sh.r * 0.07} strokeLinecap="round" />);
  }
  const el = (
    <g key={key} transform={`translate(${b.s[0].toFixed(1)} ${b.s[1].toFixed(1)}) scale(${b.k.toFixed(3)})`}>
      <ellipse cx={0} cy={0} rx={sh.r * 1.2} ry={sh.r * 0.18} fill="#6b4a2e" opacity={0.3} />
      <path d={`M${-sh.r * 1.1} 0 Q${-sh.r} ${-sh.r * 0.9} 0 ${-sh.r * 0.95} Q${sh.r} ${-sh.r * 0.9} ${sh.r * 1.1} 0Z`} fill="#6f7c35" opacity={0.85} />
      {spikes}
      <circle cx={-sh.r * 0.3} cy={-sh.r * 0.6} r={sh.r * 0.08} fill="#d0487a" />
      <circle cx={sh.r * 0.4} cy={-sh.r * 0.5} r={sh.r * 0.07} fill="#d0487a" />
    </g>
  );
  return { z: b.z, el };
}

export function moundItem(cam: Camera, m: Mound, key: string): Item | null {
  const c = project(cam, m.p);
  if (!c || c.z < 0.5 || !onScreen(c.s, 2000)) return null;
  const ring = (r: number, z: number, n = 18) => ellipsePts(m.p[0], m.p[1], r, r, 0, n, z);
  const low = ring(m.r, 0);
  const high = ring(m.r * 0.5, m.h);
  const all: V2[] = [];
  for (const p of [...low, ...high]) {
    const q = project(cam, p);
    if (!q) return null;
    all.push(q.s);
  }
  const hull = convexHull(all);
  const hole = projectPoly(cam, ring(m.r * 0.3, m.h - 0.01, 16));
  const lip = projectPoly(cam, ring(m.r * 0.5, m.h, 16));
  const el = (
    <g key={key}>
      <path d={pathD(hull)} fill={C.earth} stroke="#7b5732" strokeWidth={Math.max(0.5, (cam.f * 0.02) / c.z)} />
      {lip && <path d={pathD(lip.s)} fill="#cfa773" />}
      {hole && <path d={pathD(hole.s)} fill="#2e1f14" />}
    </g>
  );
  return { z: c.z, el };
}

export function dustItem(cam: Camera, p: V3, r: number, a: number, key: string, uid: string): Item | null {
  const q = project(cam, p);
  if (!q || q.z < NEAR * 4) return null;
  const rr = (cam.f * r) / q.z;
  if (rr < 0.8 || !onScreen(q.s, rr)) return null;
  return { z: q.z, el: <circle key={key} cx={q.s[0]} cy={q.s[1]} r={rr} fill={`url(#${uid}-dust)`} opacity={a} /> };
}
