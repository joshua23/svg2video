/**
 * 3D 卡通着色角色：阿凡提与小毛驴，全部由基本几何体拼成，套 toon 材质，
 * 墨线由后期 Outline 通道根据深度 / 法线 / 物体 ID 自动勾出。
 *
 * 坐标（three.js）：+x 向前，+y 向上，+z = 角色右侧（相机通常在这一侧）。
 */
import React from 'react';
import * as THREE from 'three';
import { flat, toon } from './lib/materials';
import { NoOutline } from './lib/Scene3D';
import { blanketTex, hatTex, robeTex } from './textures';
import type { DonkeyState } from '../afanti/plan';
import { LEG_OFFSETS } from '../afanti/plan';
import { legAngles } from '../afanti/rig/donkeyProfile';
import type { Expr } from '../afanti/rig/afantiProfile';

export type T3 = [number, number, number];
const DEG = Math.PI / 180;
const Y = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ geometry cache

const geoCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}
const capsule = (r: number, l: number) => geo(`cap${r.toFixed(3)}|${l.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, l), 6, 14));
const sphere = (r: number) => geo(`sph${r.toFixed(3)}`, () => new THREE.SphereGeometry(r, 20, 14));
const cone = (r: number, h: number, seg = 12) => geo(`cone${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));

export const add3 = (a: T3, b: T3): T3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul3 = (a: T3, s: number): T3 => [a[0] * s, a[1] * s, a[2] * s];
/** 绕 z 轴（侧面平面内）旋转，角度为度，正 = 逆时针（从 +z 看） */
export const rotZ = (v: T3, deg: number): T3 => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
};
/** 2D 骨骼的肢体方向（a：0=下，90=前，180=上）+ 侧向外展 b（弧度），side=+1 右侧 */
export const dir3 = (aDeg: number, b = 0, side = 1): T3 => {
  const a = aDeg * DEG;
  return [Math.sin(a) * Math.cos(b), -Math.cos(a) * Math.cos(b), side * Math.sin(b)];
};

export const Bone: React.FC<{ a: T3; b: T3; r: number; mat: THREE.Material; oid?: number; scale?: T3 }> = ({ a, b, r, mat, oid, scale }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(Y, L > 1e-6 ? d.normalize() : Y);
  return (
    <mesh
      position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]}
      quaternion={q}
      scale={scale}
      geometry={capsule(r, Math.round(L * 200) / 200)}
      material={mat}
      userData={oid ? { oid } : undefined}
      castShadow
    />
  );
};

const Ball: React.FC<{ p: T3; r: number; mat: THREE.Material; scale?: T3; oid?: number; rot?: T3 }> = ({ p, r, mat, scale, oid, rot }) => (
  <mesh position={p} rotation={rot} scale={scale} geometry={sphere(r)} material={mat} userData={oid ? { oid } : undefined} castShadow />
);

// ------------------------------------------------------------------ palette

const P = {
  donkey: '#958b7e',
  donkeyFar: '#7d746a',
  donkeyLight: '#e4dacb',
  hoof: '#2b2622',
  mane: '#2e2925',
  earIn: '#e7b3a3',
  saddle: '#6e3f1f',
  brass: '#e6b23e',
  red: '#b3232b',
  skin: '#e3a574',
  beard: '#1c1411',
  sleeve: '#28389a',
  trousers: '#3b2a24',
  boot: '#2a1a12',
  sash: '#cf2a2f',
  staff: '#8c5a2a',
  white: '#fbf8f0',
  ink: '#1a1412',
};
const SK = [0.62, 1] as const;
/** 卡通比例：大头 */
const HEAD_SCALE = 1.32; // 皮肤：柔和的两级阴影
const ST = [0.5, 1] as const;

// ------------------------------------------------------------------ donkey

export interface DonkeyExtras3 {
  earFlop: number;
  mouthOpen: number;
  eye: 'normal' | 'wide' | 'calm';
  t: number;
}

/** 鞍毯：覆盖驴背与两侧的弧形布片（自定义几何，贴图的金边落在两侧下摆） */
const blanketGeo = () =>
  geo('blanket', () => {
    const g = new THREE.BufferGeometry();
    const nx = 8;
    const na = 18;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= nx; i++) {
      const x = -0.26 + (i / nx) * 0.5;
      for (let j = 0; j <= na; j++) {
        const phi = (-55 + (j / na) * 290) * DEG;
        const R = 0.272;
        pos.push(x, Math.sin(phi) * R + 0.02, Math.cos(phi) * R * 0.86);
        uv.push(i / nx, 1 - Math.abs(phi / DEG - 90) / 145);
      }
    }
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < na; j++) {
        const a = i * (na + 1) + j;
        const b = a + na + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  });

const HIPS3: T3[] = [
  [-0.4, -0.06, -0.12],
  [-0.37, -0.08, 0.12],
  [0.33, -0.08, -0.11],
  [0.36, -0.1, 0.11],
];

export const Donkey3D: React.FC<{ d: DonkeyState; ex: DonkeyExtras3; rider?: React.ReactNode }> = ({ d, ex, rider }) => {
  const t = ex.t;
  const body = toon(P.donkey, { steps: ST });
  const far = toon(P.donkeyFar, { steps: ST });
  const light = toon(P.donkeyLight, { steps: ST });
  const dark = toon(P.hoof, { steps: ST });
  const mane = toon(P.mane, { steps: ST });
  const legs = [0, 1, 2, 3].map((i) => legAngles(d, i));
  const neckBase: T3 = [0.3, 0.1, 0];
  const neckAng = 138 - 42 * d.duck - 18 * d.trip + Math.sin(d.phase * Math.PI * 2) * 4;
  const neckEnd = add3(neckBase, mul3(dir3(neckAng), 0.4));
  const headRot = -12 + 40 * d.duck + 20 * d.trip + Math.sin(d.phase * Math.PI * 2 + 1) * 3;
  const tailSwing = Math.sin(t * 9) * 14 + d.v * 2;
  const earA = 0.25 - ex.earFlop * 0.45 + Math.sin(t * 13) * 0.08;
  const eyeY = ex.eye === 'calm' ? 0.45 : ex.eye === 'wide' ? 1.25 : 1;
  const jaw = ex.mouthOpen * 0.5;
  const BODY_OID = 7001;
  return (
    <group>
      {/* 身体（同一 oid：身体各部分之间不画内线） */}
      <mesh geometry={capsule(0.25, 0.6)} material={body} rotation={[0, 0, Math.PI / 2]} scale={[0.95, 1, 0.82]} userData={{ oid: BODY_OID }} castShadow />
      <Ball p={[0.3, 0.0, 0]} r={0.22} mat={body} scale={[1, 1.05, 0.9]} oid={BODY_OID} />
      <Ball p={[-0.33, 0.03, 0]} r={0.24} mat={body} scale={[1, 1, 0.92]} oid={BODY_OID} />
      <mesh geometry={capsule(0.2, 0.42)} material={light} position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.7, 1, 0.78]} userData={{ oid: BODY_OID }} />
      {/* 脖子与鬃毛 */}
      <Bone a={neckBase} b={neckEnd} r={0.105} mat={body} oid={BODY_OID} />
      <Bone a={add3(neckBase, rotZ([-0.05, 0.1, 0], 0))} b={add3(neckEnd, [-0.06, 0.07, 0])} r={0.04} mat={mane} scale={[1, 1, 0.6]} />
      {/* 颈圈与铜铃 */}
      <mesh position={add3(neckBase, mul3(dir3(neckAng), 0.08))} rotation={[0, 0, (neckAng - 180) * DEG]} geometry={geo('collar', () => new THREE.TorusGeometry(0.11, 0.018, 8, 20))} material={toon(P.red, { steps: ST })} scale={[1, 1, 1]}>
        <group rotation={[Math.PI / 2, 0, 0]} />
      </mesh>
      <group position={add3(neckBase, [0.1, -0.08, 0])} rotation={[0, 0, (Math.sin(t * 22) * 22 - d.pitch * 0.8) * DEG]}>
        <mesh position={[0, -0.05, 0]} geometry={geo('bell', () => new THREE.LatheGeometry([new THREE.Vector2(0.0, 0.035), new THREE.Vector2(0.022, 0.03), new THREE.Vector2(0.03, 0.0), new THREE.Vector2(0.042, -0.035), new THREE.Vector2(0.0, -0.035)], 14))} material={toon(P.brass, { steps: [0.6, 1], emissive: '#5a3a00' })} castShadow />
      </group>
      {/* 头 */}
      <group position={neckEnd} rotation={[0, 0, -(headRot + 24) * DEG]}>
        <mesh geometry={capsule(0.1, 0.2)} material={body} position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.05, 1, 0.82]} userData={{ oid: BODY_OID + 1 }} castShadow />
        <Ball p={[0.3, -0.015, 0]} r={0.1} mat={light} scale={[1, 0.92, 0.88]} oid={BODY_OID + 1} />
        <group position={[0.2, -0.06, 0]} rotation={[0, 0, -jaw]}>
          <Ball p={[0.08, -0.03, 0]} r={0.065} mat={light} scale={[1.2, 0.7, 0.9]} oid={BODY_OID + 1} />
        </group>
        {jaw > 0.05 && <Ball p={[0.3, -0.08, 0]} r={0.05} mat={flat('#4a1616')} scale={[1, 1, 0.8]} />}
        <Ball p={[0.38, 0.0, 0.045]} r={0.014} mat={dark} />
        <Ball p={[0.38, 0.0, -0.045]} r={0.014} mat={dark} />
        {/* 眼睛 */}
        {[1, -1].map((s) => (
          <group key={s} position={[0.09, 0.05, s * 0.078]}>
            <Ball p={[0, 0, 0]} r={0.028} mat={flat(P.white)} scale={[0.8, eyeY, 0.6]} />
            <Ball p={[0.012, 0.003, s * 0.012]} r={0.015} mat={flat(P.ink)} scale={[1, eyeY > 0.5 ? 1 : 0.5, 1]} />
          </group>
        ))}
        {/* 笼头 */}
        <mesh position={[0.18, -0.005, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.85, 1.02, 1]} geometry={geo('bridle', () => new THREE.TorusGeometry(0.1, 0.012, 6, 20))} material={toon(P.red, { steps: ST })} />
        {/* 额毛 */}
        <mesh position={[0.02, 0.1, 0]} rotation={[0, 0, -0.6]} geometry={cone(0.04, 0.09)} material={mane} />
        {/* 长耳朵 */}
        {[1, -1].map((s) => (
          <group key={s} position={[-0.01, 0.07, s * 0.05]} rotation={[s * 0.28, 0, earA + (s < 0 ? 0.12 : 0)]}>
            <mesh position={[0, 0.17, 0]} scale={[1, 1, 0.45]} geometry={cone(0.05, 0.34)} material={s > 0 ? body : far} castShadow />
            <mesh position={[0.012, 0.15, s * 0.012]} scale={[0.7, 0.85, 0.2]} geometry={cone(0.05, 0.34)} material={toon(P.earIn, { steps: SK })} />
            <mesh position={[0, 0.31, 0]} scale={[1, 1, 0.45]} geometry={cone(0.018, 0.06)} material={mane} />
          </group>
        ))}
      </group>
      {/* 尾巴 */}
      <group position={[-0.56, 0.08, 0]} rotation={[0, 0, (-25 + tailSwing) * DEG]}>
        <Bone a={[0, 0, 0]} b={[-0.05, -0.3, 0]} r={0.018} mat={body} />
        <Ball p={[-0.05, -0.33, 0]} r={0.035} mat={mane} scale={[0.8, 1.5, 0.8]} />
      </group>
      {/* 腿 */}
      {legs.map((a, i) => {
        const front = i >= 2;
        const hip = HIPS3[i];
        const knee = add3(hip, mul3(dir3(a.up), front ? 0.31 : 0.33));
        const ankle = add3(knee, mul3(dir3(a.low), 0.34));
        const hoof = add3(ankle, mul3(dir3(a.low), 0.06));
        const m = i % 2 === 0 ? far : body;
        return (
          <group key={i}>
            <Bone a={hip} b={knee} r={front ? 0.065 : 0.08} mat={m} />
            <Bone a={knee} b={ankle} r={0.035} mat={m} />
            <Bone a={ankle} b={hoof} r={0.042} mat={dark} />
          </group>
        );
      })}
      {/* 鞍毯、马鞍、马镫 */}
      <mesh geometry={blanketGeo()} material={toon('#ffffff', { steps: ST, map: blanketTex(), side: THREE.DoubleSide, id: 'blanket' })} castShadow />
      <mesh geometry={capsule(0.06, 0.24)} material={toon(P.saddle, { steps: ST })} position={[-0.03, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 2.3]} castShadow />
      <Ball p={[0.13, 0.33, 0]} r={0.035} mat={toon(P.saddle, { steps: ST })} scale={[1, 1.3, 1]} />
      <Ball p={[-0.18, 0.32, 0]} r={0.045} mat={toon(P.saddle, { steps: ST })} scale={[0.7, 1, 2]} />
      {[1, -1].map((s) => (
        <group key={s}>
          <Bone a={[0, 0.26, s * 0.2]} b={[0, -0.1, s * 0.23]} r={0.008} mat={toon(P.saddle, { steps: ST })} />
          <mesh position={[0, -0.12, s * 0.23]} geometry={geo('stirrup', () => new THREE.TorusGeometry(0.035, 0.008, 6, 12))} material={toon('#8c8c8c', { steps: ST })} />
        </group>
      ))}
      {rider && <group position={[-0.03, 0.33, 0]}>{rider}</group>}
    </group>
  );
};

export { LEG_OFFSETS };

// ------------------------------------------------------------------ Afanti

export interface Limb3 {
  a1: number; // 上段方向（度，侧面平面内）
  a2: number; // 下段方向
  b1: number; // 上段外展（弧度）
  b2: number;
  /** 正面姿势：直接给出方向向量（覆盖角度） */
  d1?: T3;
  d2?: T3;
}

export interface Pose3 {
  /** 骨盆相对挂载点的位置（米）与旋转（弧度：pitch 绕 z，roll 绕 x） */
  pos: T3;
  pitch: number;
  roll: number;
  tl: number; // 躯干前倾（度）
  hd: number; // 低头（度）
  headRoll: number; // 歪头（弧度）
  armN: Limb3; // 右臂（+z 侧，握杖）
  armF: Limb3; // 左臂
  legN: Limb3;
  legF: Limb3;
  staff: T3 | null; // 手杖方向（根坐标系）
  expr: Expr;
  hatLift: number; // 米
  flutter: number;
}

/** 关节位置（根坐标系，米） */
export function skeleton3(p: Pose3) {
  const up = rotZ([0, 1, 0], -p.tl);
  const neck = mul3(up, 0.45);
  const shoulderC = mul3(up, 0.4);
  const sN = add3(shoulderC, [0, 0, 0.17]);
  const sF = add3(shoulderC, [0, 0, -0.17]);
  const seg = (o: T3, l: Limb3, side: number, L1: number, L2: number) => {
    const d1 = l.d1 ?? dir3(l.a1, l.b1, side);
    const d2 = l.d2 ?? dir3(l.a2, l.b2, side);
    const m = add3(o, mul3(d1, L1));
    return [o, m, add3(m, mul3(d2, L2))] as const;
  };
  const armN = seg(sN, p.armN, 1, 0.27, 0.25);
  const armF = seg(sF, p.armF, -1, 0.27, 0.25);
  const legN = seg([0, 0, 0.09], p.legN, 1, 0.4, 0.39);
  const legF = seg([0, 0, -0.09], p.legF, -1, 0.4, 0.39);
  const head = add3(neck, rotZ([0.03, 0.2, 0], -(p.tl + p.hd)));
  return { up, neck, head, armN, armF, legN, legF };
}

function Face({ e }: { e: Expr }) {
  const ink = flat(P.ink);
  const white = flat(P.white);
  const beard = toon(P.beard, { steps: ST });
  const eyeS = e.eyes === 'wide' ? 1.3 : e.eyes === 'squint' ? 0.4 : 1;
  const gaze: T3 = e.eyes === 'down' ? [0.004, -0.012, 0] : e.eyes === 'up' ? [0.004, 0.012, 0] : [0.006, 0, 0];
  let mouth: React.ReactNode = null;
  const mp: T3 = [0.128, -0.068, 0];
  switch (e.mouth) {
    case 'o':
      mouth = <Ball p={mp} r={0.02} mat={flat('#4a1212')} scale={[0.5, 1.2, 1]} />;
      break;
    case 'scream':
      mouth = <Ball p={add3(mp, [0, -0.012, 0])} r={0.036} mat={flat('#4a1212')} scale={[0.5, 1.35, 1.1]} />;
      break;
    case 'grin':
    case 'grit':
      mouth = <mesh position={mp} scale={[0.02, 0.02, 0.06]} geometry={geo('box1', () => new THREE.BoxGeometry(1, 1, 1))} material={white} />;
      break;
    case 'wobble':
    case 'smile':
    case 'smug':
      mouth = (
        <mesh position={add3(mp, [0, 0.006, 0])} rotation={[0, Math.PI / 2, e.mouth === 'smug' ? 0.25 : 0]} geometry={geo('smile', () => new THREE.TorusGeometry(0.024, 0.005, 6, 12, Math.PI))} material={ink} scale={[1, -1, 1]} />
      );
      break;
  }
  return (
    <group>
      {/* 眼睛 */}
      {[1, -1].map((s) => {
        const wink = e.eyes === 'wink' && s > 0;
        return (
          <group key={s} position={[0.112, 0.03, s * 0.052]}>
            {wink ? (
              <mesh scale={[0.006, 0.006, 0.04]} geometry={geo('box1', () => new THREE.BoxGeometry(1, 1, 1))} material={ink} />
            ) : (
              <>
                <Ball p={[0, 0, 0]} r={0.026} mat={white} scale={[0.45, 1.15 * eyeS, 0.9]} />
                <Ball p={add3([0.01, 0, 0], gaze)} r={0.012} mat={ink} scale={[0.5, 1.2, 1]} />
              </>
            )}
            <mesh
              position={[0.012, 0.045 + e.brow * 0.01, 0]}
              rotation={[s * (0.25 - e.brow * 0.35), 0, 0]}
              scale={[0.012, 0.014, 0.055]}
              geometry={geo('box1', () => new THREE.BoxGeometry(1, 1, 1))}
              material={beard}
            />
          </group>
        );
      })}
      {/* 鹰钩鼻 */}
      <group position={[0.13, -0.005, 0]} rotation={[0, 0, -1.9]}>
        <mesh position={[0, 0.045, 0]} geometry={cone(0.03, 0.09)} material={toon(P.skin, { steps: SK })} castShadow />
      </group>
      <Ball p={[0.155, -0.035, 0]} r={0.022} mat={toon(P.skin, { steps: SK })} />
      {mouth}
      {/* 上翘八字胡 */}
      {[1, -1].map((s) => (
        <group key={s} position={[0.14, -0.05, s * 0.022]} rotation={[s * -0.9, 0, 0]}>
          <mesh position={[0, 0.03, 0]} geometry={capsule(0.011, 0.045)} material={beard} />
          <Ball p={[0, 0.058, 0]} r={0.012} mat={beard} />
        </group>
      ))}
      {/* 山羊胡 */}
      <group position={[0.09, -0.11, 0]} rotation={[0, 0, 0.5]}>
        <mesh position={[0, -0.06, 0]} rotation={[0, 0, Math.PI]} geometry={cone(0.042, 0.13)} material={beard} castShadow />
        <Ball p={[0.012, -0.125, 0]} r={0.014} mat={beard} />
      </group>
      {/* 腮红 */}
      <NoOutline>
        {[1, -1].map((s) => (
          <Ball key={s} p={[0.1, -0.03, s * 0.085]} r={0.022} mat={flat('#e98672', { transparent: true, opacity: 0.55 })} scale={[0.3, 0.7, 1]} />
        ))}
      </NoOutline>
    </group>
  );
}

export const Afanti3D: React.FC<{ p: Pose3; t: number; only?: 'arms' }> = ({ p, t, only }) => {
  const s = skeleton3(p);
  const skin = toon(P.skin, { steps: SK });
  const sleeve = toon(P.sleeve, { steps: ST });
  const trousers = toon(P.trousers, { steps: ST });
  const boot = toon(P.boot, { steps: ST });
  const robe = toon('#ffffff', { steps: ST, map: robeTex(), side: THREE.DoubleSide, id: 'robe' });
  const fl = Math.sin(t * 29) * 0.12 * p.flutter;
  const torsoA = -p.tl * DEG;
  const bootOf = (leg: readonly [T3, T3, T3], k: string) => {
    const [, knee, ankle] = leg;
    const shin: T3 = [ankle[0] - knee[0], ankle[1] - knee[1], ankle[2] - knee[2]];
    const L = Math.hypot(...shin) || 1;
    const sd: T3 = mul3(shin, 1 / L);
    // 脚尖方向：小腿方向在侧面平面内转 90°
    const toe: T3 = [-sd[1], sd[0], 0];
    const tl = Math.hypot(toe[0], toe[1]) || 1;
    const tdir: T3 = [Math.abs(toe[0] / tl) > 0.01 ? toe[0] / tl : 1, toe[1] / tl, 0];
    const f = tdir[0] < 0 ? mul3(tdir, -1) : tdir;
    return (
      <group key={k}>
        <Bone a={add3(knee, mul3(sd, L * 0.4))} b={ankle} r={0.058} mat={boot} />
        <Bone a={add3(ankle, mul3(f, -0.03))} b={add3(ankle, mul3(f, 0.13))} r={0.04} mat={boot} />
        <Ball p={add3(add3(ankle, mul3(f, 0.17)), [0, 0.02, 0])} r={0.018} mat={boot} />
      </group>
    );
  };
  return (
    <group position={p.pos} rotation={[p.roll, 0, p.pitch]}>
      {!only && (
        <>
      {/* 腿 */}
      <Bone a={s.legN[0]} b={s.legN[1]} r={0.064} mat={trousers} />
      <Bone a={s.legN[1]} b={s.legN[2]} r={0.052} mat={trousers} />
      <Bone a={s.legF[0]} b={s.legF[1]} r={0.064} mat={trousers} />
      <Bone a={s.legF[1]} b={s.legF[2]} r={0.052} mat={trousers} />
      {bootOf(s.legN, 'bn')}
      {bootOf(s.legF, 'bf')}
      {/* 长袍下摆（前面开襟） */}
      <mesh
        position={[0, -0.2, 0]}
        rotation={[fl * 0.3, 0, (-p.tl * 0.3 + 12 * p.flutter) * DEG + fl]}
        scale={[1, 1, 0.82]}
        geometry={geo('skirt', () => new THREE.CylinderGeometry(0.17, 0.27, 0.46, 20, 1, true, Math.PI / 2 + 0.55, Math.PI * 2 - 1.1))}
        material={robe}
        castShadow
      />
      {/* 躯干 */}
      <group rotation={[0, 0, torsoA]}>
        <mesh position={[0, 0.2, 0]} scale={[0.95, 1, 1.12]} geometry={capsule(0.16, 0.22)} material={robe} userData={{ oid: 8001 }} castShadow />
        <mesh position={[0, 0.03, 0]} scale={[1, 1, 1.1]} geometry={geo('sash', () => new THREE.CylinderGeometry(0.165, 0.17, 0.075, 18))} material={toon(P.sash, { steps: ST })} />
        <group position={[-0.16, 0.03, 0.05]} rotation={[0, 0, (-70 - 20 * p.flutter) * DEG + fl * 2]}>
          <mesh position={[0, 0.09, 0]} scale={[0.03, 0.18, 0.06]} geometry={geo('box1', () => new THREE.BoxGeometry(1, 1, 1))} material={toon(P.sash, { steps: ST })} />
        </group>
      </group>
      {/* 脖子与头 */}
      <Bone a={s.neck} b={add3(s.neck, rotZ([0, 0.06, 0], -p.tl))} r={0.055} mat={skin} />
      <group position={s.head} rotation={[p.headRoll, 0, -(p.tl + p.hd) * DEG]} scale={HEAD_SCALE}>
        <Ball p={[0, 0, 0]} r={0.135} mat={skin} scale={[1, 1.05, 0.95]} />
        <Ball p={[-0.06, -0.01, 0]} r={0.12} mat={toon(P.beard, { steps: ST })} scale={[0.7, 0.85, 0.95]} />
        <Ball p={[-0.01, -0.005, 0.128]} r={0.03} mat={skin} scale={[0.7, 1, 0.5]} />
        <Ball p={[-0.01, -0.005, -0.128]} r={0.03} mat={skin} scale={[0.7, 1, 0.5]} />
        <Face e={p.expr} />
        {/* 花帽（朵帕）：四方小帽 */}
        <group position={[-0.01, 0.105 + p.hatLift, 0]} rotation={[0, Math.PI / 4, p.hatLift * 3]}>
          <mesh geometry={geo('hat', () => new THREE.CylinderGeometry(0.128, 0.142, 0.12, 4, 1))} material={toon('#ffffff', { steps: [0.7, 1], map: hatTex(), id: 'hat' })} castShadow />
        </group>
      </group>
        </>
      )}
      {/* 手臂 */}
      {[s.armN, s.armF].map((arm, i) => (
        <group key={i}>
          <Bone a={arm[0]} b={arm[1]} r={0.05} mat={sleeve} />
          <Bone a={arm[1]} b={arm[2]} r={0.044} mat={sleeve} />
          <Ball p={arm[2]} r={0.047} mat={skin} />
        </group>
      ))}
      {/* 长手杖（右手） */}
      {p.staff && (
        <group>
          <Bone a={add3(s.armN[2], mul3(p.staff, -0.48))} b={add3(s.armN[2], mul3(p.staff, 1.2))} r={0.018} mat={toon(P.staff, { steps: ST })} />
          <Ball p={add3(s.armN[2], mul3(p.staff, 1.22))} r={0.036} mat={toon('#5f3b19', { steps: ST })} />
        </group>
      )}
    </group>
  );
};
