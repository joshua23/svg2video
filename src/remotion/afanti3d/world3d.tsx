/**
 * 3D 戈壁绿洲：地面、土路、胡杨林、岩石、骆驼刺、坎儿井土堆、火焰山与天山远景、动漫积云天空。
 * 世界数据（位置、随机种子）与 2D 版共用 ../afanti/world.ts，保证空间布局一致。
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { flat, toon } from './lib/materials';
import { NoOutline } from './lib/Scene3D';
import { canvasTexture } from './lib/canvasTex';
import { SkyClouds, Blob } from './lib/clouds';
import { roadTex } from './textures';
import { Camera, rng, toCam, camToScreen, W as SW, H as SH } from '../afanti/math3d';
import { MOUNDS, Mound, PEBBLES, RIDGE_FAR, RIDGE_MID, ROCKS, Rock, SHRUBS, Shrub, TREES, Tree, WELL_MOUND } from '../afanti/world';
import { WHEEL } from '../afanti/plan';
import { horizonY } from '../afanti/scenery';

/** 世界坐标（x 前、y 左、z 上）→ three.js（x 右、y 上、z 朝向观众） */
export const W3 = (x: number, y: number, z: number): [number, number, number] => [x, z, -y];

const geoCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

// ------------------------------------------------------------------ sky

interface Lobe {
  dir: [number, number, number];
  r: number; // 角半径（弧度）
  tone: number;
}

/** 地平线上一圈高耸的积云（方向 + 角半径），像 Barracuda 结尾那种手绘夏日积云 */
const LOBES: Lobe[] = (() => {
  const R = rng(9090);
  const out: Lobe[] = [];
  const clouds = 13;
  for (let c = 0; c < clouds; c++) {
    const az0 = (c / clouds) * Math.PI * 2 + R() * 0.3;
    const width = 0.18 + R() * 0.3;
    const height = 0.08 + R() * 0.16;
    const base = 0.02 + R() * 0.03;
    const n = 10 + Math.floor(R() * 10);
    for (let i = 0; i < n; i++) {
      const u = R();
      const hx = (u - 0.5) * width;
      const dome = Math.sqrt(Math.max(0, 1 - (2 * hx / width) ** 2));
      const el = base + R() * height * dome;
      const r = (0.025 + R() * 0.035) * (0.6 + dome * 0.6);
      const az = az0 + hx;
      const ce = Math.cos(el + r * 0.6);
      out.push({
        dir: [Math.cos(az) * ce, Math.sin(az) * ce, Math.sin(el + r * 0.6)],
        r,
        tone: 0.72 + 0.25 * ((el - base) / Math.max(0.01, height)),
      });
    }
  }
  return out;
})();

export const Sky: React.FC<{ cam: Camera }> = ({ cam }) => {
  const hy = horizonY(cam) / SH;
  const roll = (cam.roll * Math.PI) / 180;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const blobs: Blob[] = [];
  for (const l of LOBES) {
    const p: [number, number, number] = [cam.pos[0] + l.dir[0] * 1e4, cam.pos[1] + l.dir[1] * 1e4, cam.pos[2] + l.dir[2] * 1e4];
    const q = toCam(cam, p);
    if (q[2] < 1) continue;
    const s = camToScreen(cam, q);
    const dx = s[0] - SW / 2;
    const dy = s[1] - SH / 2;
    const x = SW / 2 + dx * cr - dy * sr;
    const y = SH / 2 + dx * sr + dy * cr;
    const rp = cam.f * l.r;
    if (x < -rp - 200 || x > SW + rp + 200 || y < -rp - 200 || y > SH + rp + 200) continue;
    blobs.push([x, y, rp, l.tone]);
  }
  const k = cam.f / 800;
  const h = (v: number) => Math.min(0.999, Math.max(0.001, v));
  return (
    <SkyClouds
      sky={{
        stops: [
          [0, '#156fbe'],
          [h(hy - 0.75), '#1f82cf'],
          [h(hy - 0.35), '#4ea3e0'],
          [h(hy - 0.08), '#a9d3ef'],
          [h(hy - 0.01), '#f0e3c4'],
          [1, '#f3dfb6'],
        ],
      }}
      halo={['#8cc7ee', 0.5]}
      layers={
        blobs.length
          ? [
              {
                blobs,
                look: {
                  soft: 2,
                  puff: 1,
                  cells: [34 * k, 13 * k],
                  blend: 10 * k,
                  contrast: 0.35,
                  rim: 0.3,
                  lobes: 0.15,
                  pillow: 110 * k,
                  blotch: 0.4,
                  haze: 0.08,
                },
              },
            ]
          : []
      }
    />
  );
};

// ------------------------------------------------------------------ far land

function ringGeometry(ridge: number[], radius: number, zBase: number, colorOf: (h: number, i: number) => THREE.Color) {
  const g = new THREE.BufferGeometry();
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const cx = WHEEL.x * 0.5;
  const n = ridge.length;
  const rows = 4;
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const a = (k / n) * Math.PI * 2;
    for (let j = 0; j <= rows; j++) {
      const u = j / rows;
      const hgt = zBase - 150 + (ridge[k] + 150) * u;
      const p = W3(cx + Math.cos(a) * radius, Math.sin(a) * radius, hgt);
      pos.push(...p);
      const c = colorOf(u, k);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j;
      const b = a + rows + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const farMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide });

export const FarLand: React.FC = () => {
  const geos = useMemo(() => {
    const lin = (hex: string) => new THREE.Color(hex);
    const tian = ringGeometry(RIDGE_FAR, 6200, -60, (u) => (u > 0.72 ? lin('#eef3f8') : lin('#a9b8cb').lerp(lin('#c4cfdc'), u)));
    const flame = ringGeometry(RIDGE_MID, 1700, -10, (u, k) => {
      const band = Math.sin(k * 0.9) > 0.3 ? 0.85 : 1;
      return lin('#e3b48c').lerp(lin('#c0643d'), u * 0.9).multiplyScalar(u > 0.55 ? band : 1);
    });
    return { tian, flame };
  }, []);
  return (
    <group>
      <mesh geometry={geos.tian} material={farMat} />
      <mesh geometry={geos.flame} material={farMat} />
    </group>
  );
};

// ------------------------------------------------------------------ ground

const gobiTex = () => {
  const t = canvasTexture('gobi', 512, 512, (c, w, h) => {
    c.fillStyle = '#dcb880';
    c.fillRect(0, 0, w, h);
    const R = rng(4);
    for (let i = 0; i < 90; i++) {
      c.fillStyle = R() < 0.6 ? 'rgba(170,125,75,0.18)' : 'rgba(245,225,185,0.25)';
      c.beginPath();
      c.ellipse(R() * w, R() * h, 20 + R() * 60, 8 + R() * 25, R() * 3, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 3000; i++) {
      c.fillStyle = R() < 0.5 ? 'rgba(125,90,55,0.45)' : 'rgba(250,235,200,0.5)';
      c.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(320, 320);
  return t;
};

export const Ground: React.FC = () => {
  const road = useMemo(() => {
    const t = roadTex().clone();
    t.needsUpdate = true;
    t.wrapT = THREE.RepeatWrapping;
    const L = WHEEL.x + 380;
    t.repeat.set(1, L / 8);
    return { t, L };
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WHEEL.x * 0.5, 0, 0]} receiveShadow material={toon('#ffffff', { steps: [0.62, 1], map: gobiTex(), id: 'gobi' })} userData={{ oid: 9001 }}>
        <planeGeometry args={[4000, 4000]} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        position={[WHEEL.x + 190 - road.L / 2, 0.006, 0]}
        receiveShadow
        material={toon('#ffffff', { steps: [0.62, 1], map: road.t, transparent: true, id: 'road' })}
        userData={{ oid: 9001 }}
      >
        <planeGeometry args={[5.4, road.L]} />
      </mesh>
    </group>
  );
};

// ------------------------------------------------------------------ props

const GOLD = ['#e8b732', '#f3cf55', '#d99a22', '#f6dc7a', '#c7861d'];

export const Tree3D: React.FC<{ tr: Tree }> = ({ tr }) => {
  const R = rng(tr.seed);
  const h = tr.h;
  const lean = (tr.lean * Math.PI) / 180;
  const top: [number, number, number] = [Math.sin(lean) * h * 0.6, h * 0.62, 0];
  const clumps = Array.from({ length: 8 }).map(() => ({
    p: [top[0] + (R() - 0.5) * h * 0.7, h * (0.58 + R() * 0.35), (R() - 0.5) * h * 0.5] as [number, number, number],
    r: h * (0.12 + R() * 0.09),
    c: GOLD[Math.floor(R() * GOLD.length)],
    rot: R() * 6,
  }));
  const p = W3(tr.p[0], tr.p[1], 0);
  const trunk = toon('#6e4a2c', { steps: [0.5, 1] });
  return (
    <group position={p} rotation={[0, R() * 6, 0]}>
      <mesh position={[top[0] / 2, top[1] / 2, 0]} rotation={[0, 0, -lean * 0.6]} geometry={geo(`trunk${h.toFixed(1)}`, () => new THREE.CylinderGeometry(0.12 + h * 0.015, 0.25 + h * 0.03, h * 0.64, 7))} material={trunk} castShadow />
      <mesh position={[top[0] * 0.8 - h * 0.1, top[1] * 0.95, 0]} rotation={[0, 0, 0.9]} geometry={geo('branch', () => new THREE.CylinderGeometry(0.05, 0.1, 1.6, 5))} material={trunk} />
      {clumps.map((c, i) => (
        <mesh key={i} position={c.p} rotation={[c.rot, c.rot * 1.3, 0]} geometry={geo(`clump${c.r.toFixed(2)}`, () => new THREE.IcosahedronGeometry(c.r, 1))} material={toon(c.c, { steps: [0.5, 0.78, 1] })} userData={{ oid: 20000 + (tr.seed % 5000) }} castShadow />
      ))}
    </group>
  );
};

export const Rock3D: React.FC<{ rk: Rock }> = ({ rk }) => {
  const R = rng(rk.seed + 11);
  const p = W3(rk.p[0], rk.p[1], rk.r * 0.25);
  return (
    <mesh
      position={p}
      rotation={[R() * 6, R() * 6, R() * 6]}
      scale={[rk.r * (1.1 + R() * 0.4), rk.r * (0.65 + R() * 0.25), rk.r * (0.9 + R() * 0.4)]}
      geometry={geo('rock', () => new THREE.DodecahedronGeometry(1, 0))}
      material={toon(rk.tone < 0.5 ? '#a17753' : '#b98e63', { steps: [0.45, 0.72, 1] })}
      castShadow
      receiveShadow
    />
  );
};

export const Shrub3D: React.FC<{ sh: Shrub }> = ({ sh }) => {
  const R = rng(sh.seed);
  const p = W3(sh.p[0], sh.p[1], 0);
  const m = toon('#7a8a3a', { steps: [0.5, 1] });
  return (
    <group position={p} rotation={[0, R() * 6, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(R() - 0.5) * sh.r, sh.r * 0.35, (R() - 0.5) * sh.r]} scale={[sh.r, sh.r * 0.55, sh.r]} geometry={geo('shrub', () => new THREE.IcosahedronGeometry(0.6, 0))} material={i === 2 ? toon('#9c8a4a', { steps: [0.5, 1] }) : m} userData={{ oid: 30000 + (sh.seed % 5000) }} castShadow />
      ))}
    </group>
  );
};

const moundGeo = () =>
  geo('mound', () => {
    const pts = [
      new THREE.Vector2(0.22, -0.6),
      new THREE.Vector2(0.25, 0.7),
      new THREE.Vector2(0.34, 0.92),
      new THREE.Vector2(0.5, 1.0),
      new THREE.Vector2(0.68, 0.8),
      new THREE.Vector2(0.86, 0.35),
      new THREE.Vector2(1.0, 0.0),
    ];
    return new THREE.LatheGeometry(pts, 24);
  });

export const Mound3D: React.FC<{ m: Mound }> = ({ m }) => (
  <group position={W3(m.p[0], m.p[1], 0)}>
    <mesh scale={[m.r, m.h, m.r]} geometry={moundGeo()} material={toon('#bf9460', { steps: [0.5, 0.8, 1], side: THREE.DoubleSide })} castShadow receiveShadow />
    <mesh position={[0, m.h * 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} material={flat('#2b1c12')}>
      <circleGeometry args={[m.r * 0.24, 18]} />
    </mesh>
  </group>
);

export const Pebbles3D: React.FC = () => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), toon('#ffffff', { steps: [0.5, 1], id: 'pebble' }), PEBBLES.length);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    PEBBLES.forEach((p, i) => {
      o.position.set(...W3(p.x, p.y, 0.005));
      o.scale.set(p.r * 1.3, p.r * 0.45, p.r);
      o.rotation.set(0, p.c * 6, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(p.c < 0.33 ? '#7d5c3c' : p.c < 0.66 ? '#a58760' : '#efdcb6'));
    });
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, []);
  return (
    <NoOutline>
      <primitive object={mesh} />
    </NoOutline>
  );
};

export const Props3D: React.FC = () => (
  <group>
    {TREES.map((tr, i) => (
      <Tree3D key={`t${i}`} tr={tr} />
    ))}
    {ROCKS.map((rk, i) => (
      <Rock3D key={`r${i}`} rk={rk} />
    ))}
    {SHRUBS.map((sh, i) => (
      <Shrub3D key={`s${i}`} sh={sh} />
    ))}
    {[...MOUNDS, WELL_MOUND].map((m, i) => (
      <Mound3D key={`m${i}`} m={m} />
    ))}
    <Pebbles3D />
  </group>
);
