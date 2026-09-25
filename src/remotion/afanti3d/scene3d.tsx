/**
 * 3D 卡通渲染版的逐帧场景：相机、灯光、角色、辘轳、尘土、飞走的手杖。
 * 相机机位与运动沿用 2D 版的 camera.ts（同一套分镜）。
 */
import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Cam, NoOutline, Scene3D } from './lib/Scene3D';
import { toon } from './lib/materials';
import { canvasTexture } from './lib/canvasTex';
import { Afanti3D, Bone, Donkey3D, T3, skeleton3 } from './rig3d';
import { hangPose3, riderPose3 } from './poses3d';
import { FarLand, Ground, Props3D, Sky, W3 } from './world3d';
import { Windlass3D } from './windlass3d';
import { cameraAt, GRIP_R } from '../afanti/camera';
import { donkeyExtras } from '../afanti/poses';
import { bodyBob } from '../afanti/rig/donkeyProfile';
import { SUN_DIR } from '../afanti/scenery';
import { KAREZ_Y } from '../afanti/world';
import { T, WHEEL, donkeyAt, hoofHits, ramp, staffFlight, wheelAngle } from '../afanti/plan';
import { rng } from '../afanti/math3d';

const W3v = (v: readonly number[]): T3 => W3(v[0], v[1], v[2]);

// ------------------------------------------------------------------ sun

const Sun: React.FC<{ focus: T3 }> = ({ focus }) => {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight('#fff4e0', 0.62 * Math.PI);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    const c = l.shadow.camera as THREE.OrthographicCamera;
    c.left = -11;
    c.right = 11;
    c.top = 11;
    c.bottom = -11;
    c.near = 1;
    c.far = 120;
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.03;
    return l;
  }, []);
  const sd = W3v(SUN_DIR);
  useLayoutEffect(() => {
    light.position.set(focus[0] + sd[0] * 50, focus[1] + sd[1] * 50, focus[2] + sd[2] * 50);
    light.target.position.set(...focus);
    light.target.updateMatrixWorld();
  });
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
};

// ------------------------------------------------------------------ dust

const HITS = hoofHits(0, 15);
const BURSTS = [
  { t: 0.05, n: 10, r: 0.35, spread: 0.8 },
  { t: T.takeoff, n: 8, r: 0.35, spread: 0.7 },
  { t: T.land, n: 16, r: 0.45, spread: 1.2 },
  { t: T.trip + 0.1, n: 18, r: 0.45, spread: 1.2 },
  { t: 7.3, n: 14, r: 0.4, spread: 1.0 },
  { t: T.impact, n: 10, r: 0.4, spread: 1.0 },
];

const dustTex = () =>
  canvasTexture('dust', 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(240,222,186,0.95)');
    g.addColorStop(0.55, 'rgba(226,200,156,0.55)');
    g.addColorStop(1, 'rgba(220,194,150,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
const spriteMats = new Map<string, THREE.SpriteMaterial>();
const spriteMat = (a: number, color = '#ffffff') => {
  const k = `${color}|${Math.round(a * 20)}`;
  let m = spriteMats.get(k);
  if (!m) {
    m = new THREE.SpriteMaterial({ map: dustTex(), color, transparent: true, opacity: Math.round(a * 20) / 20, depthWrite: false });
    spriteMats.set(k, m);
  }
  return m;
};

function dust(t: number) {
  const out: { p: T3; r: number; a: number; c?: string }[] = [];
  HITS.forEach((h, i) => {
    const age = t - h.t;
    if (age < 0 || age > 0.95) return;
    const d = donkeyAt(h.t);
    const r = rng(i * 31 + 7);
    const u = age / 0.95;
    const side = h.leg % 2 === 0 ? 0.18 : -0.18;
    const fwd = h.leg >= 2 ? 0.35 : -0.4;
    out.push({ p: W3(d.x + fwd - 0.5 * age + (r() - 0.5) * 0.2, d.y + side, 0.08 + 0.35 * Math.sqrt(u)), r: 0.14 + 0.32 * u, a: 0.6 * (1 - u) });
  });
  BURSTS.forEach((b, bi) => {
    const age = t - b.t;
    if (age < 0 || age > 1.6) return;
    const d = donkeyAt(b.t);
    const r = rng(bi * 101 + 3);
    const u = age / 1.6;
    const e = 1 - Math.pow(1 - u, 3);
    for (let k = 0; k < b.n; k++) {
      const a = r() * Math.PI * 2;
      const sp = b.spread * (0.4 + r() * 0.6);
      out.push({ p: W3(d.x + Math.cos(a) * sp * e, d.y + Math.sin(a) * sp * e, 0.1 + (0.2 + r() * 0.5) * e), r: b.r * (0.5 + e), a: 0.65 * (1 - u) });
    }
  });
  const sa = t - T.bucketSplash;
  if (sa > 0 && sa < 1.1) {
    const r = rng(99);
    for (let k = 0; k < 14; k++) {
      const vx = (r() - 0.5) * 1.2;
      const vy = (r() - 0.5) * 1.2;
      const vz = 2.4 + r() * 1.6;
      const z = 0.55 + vz * sa - 4.9 * sa * sa;
      if (z > 0.5) out.push({ p: W3(WHEEL.x + 0.37 + vx * sa, KAREZ_Y + vy * sa, z), r: 0.07, a: 0.95, c: '#bfe6ff' });
    }
  }
  return out;
}

// ------------------------------------------------------------------ scene

export const Film3D: React.FC<{ t: number }> = ({ t }) => {
  const fx = cameraAt(t);
  const cam = fx.cam;
  const pos = W3v(cam.pos);
  const tgt = W3(cam.pos[0] + cam.fwd[0], cam.pos[1] + cam.fwd[1], cam.pos[2] + cam.fwd[2]);
  const fov = (2 * Math.atan(540 / cam.f) * 180) / Math.PI;
  const d = donkeyAt(t);
  const riding = t < T.impact;
  const pov = fx.view === 'pov';
  const bob = bodyBob(d);
  const focus: T3 = riding || t < T.impact + 0.6 ? W3(d.x, d.y, 0) : W3(WHEEL.x - 1.5, 0, 2);

  // 撞击后：双手抓叶板吊着
  let hang: React.ReactNode = null;
  let staff: React.ReactNode = null;
  if (!riding) {
    const a = wheelAngle(t);
    const grip = W3(WHEEL.x + GRIP_R * Math.sin(a) - 0.16 * Math.cos(a), 0, WHEEL.axleZ - GRIP_R * Math.cos(a) - 0.16 * Math.sin(a));
    const hp = hangPose3(t);
    const sk = skeleton3(hp.pose);
    const hand = sk.armF[2];
    const u = t - T.impact;
    const sway = 16 * Math.exp(-u * 1.6) * Math.sin(u * 7) + (t > T.panic ? 7 * Math.sin(t * 11) : 2 * Math.sin(t * 3));
    // 吊着的时候身体转过来，以 3/4 侧脸朝向镜头（表情看得见）
    const toCam = Math.atan2(-(pos[2] - grip[2]), pos[0] - grip[0]);
    const yaw = toCam * ramp(t, T.impact + 0.25, T.impact + 0.8) + 0.45 * Math.sign(toCam || 1) * -ramp(t, T.impact + 0.25, T.impact + 0.8);
    hang = (
      <group position={grip} rotation={[0, yaw, (-sway * Math.PI) / 180]} scale={[hp.squash, 2 - hp.squash, 1]}>
        <Afanti3D p={{ ...hp.pose, pos: [-hand[0], -hand[1], -hand[2]] }} t={t} />
      </group>
    );
    const s = staffFlight(t);
    const fl = [-3.1, -1.4];
    const l = Math.hypot(fl[0], fl[1]);
    const ar = (s.ang * Math.PI) / 180;
    const axis = [(fl[0] / l) * Math.cos(ar), (fl[1] / l) * Math.cos(ar), Math.sin(ar)];
    const c = [s.pos[0], s.pos[1], s.pos[2] + 0.35];
    const top = W3(c[0] + axis[0] * 1.15, c[1] + axis[1] * 1.15, c[2] + axis[2] * 1.15);
    const bot = W3(c[0] - axis[0] * 0.55, c[1] - axis[1] * 0.55, c[2] - axis[2] * 0.55);
    staff = (
      <group>
        <Bone a={top} b={bot} r={0.02} mat={toon('#8c5a2a', { steps: [0.5, 1] })} />
        <mesh position={top} geometry={new THREE.SphereGeometry(0.04, 10, 8)} material={toon('#5f3b19', { steps: [0.5, 1] })} />
      </group>
    );
  }

  const riderNode = riding ? <Afanti3D p={riderPose3(t)} t={t} only={pov ? 'arms' : undefined} /> : null;

  return (
    <Scene3D
      background="#f0e3c4"
      fov={fov}
      near={0.05}
      far={9000}
      post={{
        outline: { color: '#1b1412', opacity: 0.92, thickness: 1.5, depthLo: 0.012, depthHi: 0.05, normalLo: 0.3, normalHi: 0.7 },
        bloom: { strength: 0.32, radius: 0.45, threshold: 0.82 },
        ca: 0.0032,
        edgeBlur: 3.5,
        softness: 0.7,
        vignette: 0.22,
        saturation: 1.08,
        gain: [1.03, 1.0, 0.95],
        grain: 0.012,
      }}
    >
      <Cam position={pos} target={tgt} fov={fov} roll={cam.roll} near={0.05} far={9000} />
      <Sky cam={cam} />
      <FarLand />
      <ambientLight intensity={0.46 * Math.PI} color="#e8f0ff" />
      <hemisphereLight intensity={0.12 * Math.PI} color="#bfdcff" groundColor="#e0b77c" />
      <Sun focus={focus} />
      <Ground />
      <Props3D />
      <Windlass3D t={t} />
      <group position={W3(d.x, d.y, 0.76 - bob / 100 + d.z)} rotation={[0, d.heading, 0]}>
        <group rotation={[0, 0, (-d.pitch * Math.PI) / 180]}>
          <Donkey3D d={d} ex={donkeyExtras(t)} rider={riderNode} />
        </group>
      </group>
      {hang}
      {staff}
      <NoOutline>
        {dust(t).map((p, i) => (
          <sprite key={i} position={p.p} scale={[p.r * 2, p.r * 2, 1]} material={spriteMat(p.a, p.c)} />
        ))}
      </NoOutline>
    </Scene3D>
  );
};
