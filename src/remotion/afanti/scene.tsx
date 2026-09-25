import React from 'react';
import { C } from './palette';
import { Camera, V3, add, dot, mul, pathD, project, projectPoly, rng, W, H, sub } from './math3d';
import { T, WHEEL, clamp, donkeyAt, hoofHits, smooth, staffFlight, wheelAngle } from './plan';
import { cameraAt } from './camera';
import { MOUNDS, ROCKS, SHRUBS, TREES, WELL_MOUND, KAREZ_Y } from './world';
import {
  FarLand, Ground, GroundPoly, Item, Pebbles, RoadAndDecals, Sky, dustItem, ellipsePts, moundItem, rockItem, shrubItem, treeItem,
} from './scenery';
import { windlassItems, windlassShadowPolys, pointInPoly } from './windlass';
import { BODY_Y, DonkeyProfileBody, SADDLE, bodyBob } from './rig/donkeyProfile';
import { RobeDefs, afantiProfileLayers, skeleton } from './rig/afantiProfile';
import { GRIP_R } from './camera';
import { AfantiFront, DonkeyFront, FRONT_SADDLE_Y } from './rig/front';
import { afantiFrontPose, afantiHugPose, afantiProfilePose, donkeyExtras } from './poses';

const UID = 'af';

// ------------------------------------------------------------------ dust

const HITS = hoofHits(0, 15);
const BURSTS: { t: number; n: number; r: number; spread: number }[] = [
  { t: 0.05, n: 10, r: 0.35, spread: 0.8 },
  { t: T.takeoff, n: 8, r: 0.35, spread: 0.7 },
  { t: T.land, n: 16, r: 0.45, spread: 1.2 },
  { t: T.trip + 0.1, n: 18, r: 0.45, spread: 1.2 },
  { t: 7.3, n: 14, r: 0.4, spread: 1.0 },
  { t: T.impact, n: 10, r: 0.4, spread: 1.0 },
];

function dustItems(cam: Camera, t: number): Item[] {
  const out: Item[] = [];
  const life = 0.95;
  for (let i = 0; i < HITS.length; i++) {
    const h = HITS[i];
    const age = t - h.t;
    if (age < 0 || age > life) continue;
    const d = donkeyAt(h.t);
    const r = rng(i * 31 + 7);
    const side = h.leg % 2 === 0 ? 0.18 : -0.18;
    const fwd = h.leg >= 2 ? 0.35 : -0.4;
    const u = age / life;
    const p: V3 = [d.x + fwd - 0.5 * age + (r() - 0.5) * 0.2, d.y + side + (r() - 0.5) * 0.3, 0.08 + 0.35 * Math.sqrt(u)];
    const it = dustItem(cam, p, 0.12 + 0.3 * u, 0.55 * (1 - u), `dh${i}`, UID);
    if (it) out.push(it);
  }
  BURSTS.forEach((b, bi) => {
    const age = t - b.t;
    if (age < 0 || age > 1.6) return;
    const d = donkeyAt(b.t);
    const r = rng(bi * 101 + 3);
    for (let k = 0; k < b.n; k++) {
      const a = r() * Math.PI * 2;
      const sp = b.spread * (0.4 + r() * 0.6);
      const u = age / 1.6;
      const e = 1 - Math.pow(1 - u, 3);
      const p: V3 = [d.x + Math.cos(a) * sp * e, d.y + Math.sin(a) * sp * e, 0.1 + (0.2 + r() * 0.5) * e];
      const it = dustItem(cam, p, b.r * (0.5 + e), 0.6 * (1 - u), `db${bi}-${k}`, UID);
      if (it) out.push(it);
    }
  });
  // 水桶落井溅起的水花
  const sa = t - T.bucketSplash;
  if (sa > 0 && sa < 1.1) {
    const r = rng(99);
    for (let k = 0; k < 12; k++) {
      const vx = (r() - 0.5) * 1.2;
      const vy = (r() - 0.5) * 1.2;
      const vz = 2.4 + r() * 1.6;
      const p: V3 = [WHEEL.x + 0.36 + vx * sa, KAREZ_Y + vy * sa, 0.55 + vz * sa - 4.9 * sa * sa];
      if (p[2] < 0.5) continue;
      const q = project(cam, p);
      if (!q) continue;
      const rr = Math.max(1, (cam.f * 0.05) / q.z);
      out.push({ z: q.z, el: <circle key={`w${k}`} cx={q.s[0]} cy={q.s[1]} r={rr} fill="#bfe6ff" stroke="#4d8fbf" strokeWidth={rr * 0.25} /> });
    }
  }
  return out;
}

// ------------------------------------------------------------------ characters

function spriteFrame(cam: Camera, ground: V3) {
  const q = project(cam, ground);
  if (!q || q.z < 0.2) return null;
  return { s: q.s, z: q.z, k: cam.f / q.z / 100 };
}

function characterItems(cam: Camera, t: number, view: 'auto' | 'front' | 'pov', shadowed: number): Item[] {
  const out: Item[] = [];
  if (view === 'pov') return out;
  const d = donkeyAt(t);
  const heading: V3 = [Math.cos(d.heading), Math.sin(d.heading), 0];
  const side = dot(heading, cam.right);
  const toward = dot(heading, cam.fwd);
  const fr = spriteFrame(cam, [d.x, d.y, 0]);
  const ex = donkeyExtras(t);
  const riding = t < T.impact;

  // 地面阴影
  const shadowR = 1 - clamp(d.z / 1.4) * 0.5;
  const sh = projectPoly(cam, ellipsePts(d.x - 0.35, d.y - 0.25, 0.78 * shadowR, 0.34 * shadowR, d.heading, 20, 0.01));
  if (sh) out.push({ z: 1e6, el: <path key="dshadow" d={pathD(sh.s)} fill="#5a3b1e" opacity={0.28 * shadowR} /> });

  if (fr) {
    const useFront = view === 'front' || (Math.abs(side) < 0.42 && toward < 0);
    const filter = shadowed > 0.01 ? `url(#${UID}-shadowed)` : undefined;
    if (!useFront) {
      const flip = side >= 0 ? 1 : -1;
      const squash = 0.5 + 0.5 * Math.min(1, Math.abs(side));
      const p = afantiProfilePose(t);
      const layers = afantiProfileLayers(p, t, UID);
      const pelvisT = `translate(${SADDLE[0] + p.px} ${SADDLE[1] + p.py}) rotate(${p.R})`;
      const el = (
        <g key="riders" filter={filter} transform={`translate(${fr.s[0].toFixed(1)} ${fr.s[1].toFixed(1)}) scale(${(flip * squash * fr.k).toFixed(4)} ${fr.k.toFixed(4)})`}>
          <g transform={`translate(0 ${(BODY_Y + bodyBob(d) - d.z * 100).toFixed(2)}) rotate(${d.pitch.toFixed(2)})`}>
            <DonkeyProfileBody
              d={d}
              ex={ex}
              middle={riding ? <g transform={pelvisT}>{layers.back}</g> : null}
              front={riding ? <g transform={pelvisT}>{layers.front}</g> : null}
            />
          </g>
        </g>
      );
      out.push({ z: fr.z, el });
    } else {
      const p = afantiFrontPose(t);
      const lean = clamp(-side * 40, -14, 14);
      const el = (
        <g key="ridersF" filter={filter} transform={`translate(${fr.s[0].toFixed(1)} ${fr.s[1].toFixed(1)}) scale(${fr.k.toFixed(4)}) rotate(${lean.toFixed(2)})`}>
          <DonkeyFront d={d} t={t} turn={clamp(side * 1.6, -1, 1)}>
            {riding && (
              <g transform={`translate(0 ${FRONT_SADDLE_Y})`}>
                <AfantiFront p={p} t={t} uid={UID} />
              </g>
            )}
          </DonkeyFront>
        </g>
      );
      out.push({ z: fr.z, el });
    }
  }

  if (!riding) {
    out.push(...hugItems(cam, t));
    out.push(...staffItems(cam, t));
  }
  return out;
}

/** 撞击后：阿凡提双手死抓叶板，身体吊在下面被越带越高 */
function hugItems(cam: Camera, t: number): Item[] {
  const a = wheelAngle(t);
  const radial: V3 = [Math.sin(a), 0, -Math.cos(a)];
  const lead: V3 = [-Math.cos(a), 0, -Math.sin(a)];
  const grip = add(add([WHEEL.x, 0, WHEEL.axleZ], mul(radial, GRIP_R)), mul(lead, 0.16));
  const q = project(cam, grip);
  if (!q) return [];
  const k = cam.f / q.z / 100;
  const facing = dot([1, 0, 0], cam.right) >= 0 ? 1 : -1;
  const p = afantiHugPose(t);
  const sk = skeleton(p);
  const layers = afantiProfileLayers(p, t, UID);
  // 受重力下垂的摆动：撞击后摆幅大，惊慌时乱晃
  const u = t - T.impact;
  const sway = 16 * Math.exp(-u * 1.6) * Math.sin(u * 7) + (t > T.panic ? 7 * Math.sin(t * 11) : 2 * Math.sin(t * 3));
  const el = (
    <g key="hug" transform={`translate(${q.s[0].toFixed(1)} ${q.s[1].toFixed(1)}) rotate(${(sway * facing - cam.roll * 0).toFixed(2)}) scale(${(k * facing).toFixed(4)} ${k.toFixed(4)})`}>
      <g transform={`scale(${p.squash.toFixed(3)} ${(2 - p.squash).toFixed(3)}) translate(${(-sk.handF[0]).toFixed(2)} ${(-sk.handF[1]).toFixed(2)})`}>
        {layers.back}
        {layers.front}
      </g>
    </g>
  );
  return [{ z: q.z - 0.3, el }];
}

function staffItems(cam: Camera, t: number): Item[] {
  const s = staffFlight(t);
  const flight = sub([WHEEL.x - 3.8, -1.6, 0], [WHEEL.x - 0.7, -0.2, 0]);
  const l = Math.hypot(flight[0], flight[1]);
  const hdir: V3 = [flight[0] / l, flight[1] / l, 0];
  const ar = (s.ang * Math.PI) / 180;
  const axis: V3 = [hdir[0] * Math.cos(ar), hdir[1] * Math.cos(ar), Math.sin(ar)];
  const center: V3 = [s.pos[0], s.pos[1], s.pos[2] + 0.35];
  const top = add(center, mul(axis, 1.15));
  const bot = add(center, mul(axis, -0.55));
  const pp = projectPoly(cam, [top, bot, bot]);
  if (!pp) return [];
  const w = Math.max(1.5, (cam.f * 0.045) / pp.z);
  const out: Item[] = [
    {
      z: pp.z,
      el: (
        <g key="staffFly">
          <path d={`M${pp.s[0][0]} ${pp.s[0][1]}L${pp.s[1][0]} ${pp.s[1][1]}`} stroke={C.ink} strokeWidth={w + 3} strokeLinecap="round" />
          <path d={`M${pp.s[0][0]} ${pp.s[0][1]}L${pp.s[1][0]} ${pp.s[1][1]}`} stroke={C.staff} strokeWidth={w} strokeLinecap="round" />
          <circle cx={pp.s[0][0]} cy={pp.s[0][1]} r={w * 1.1} fill={C.staffDark} stroke={C.ink} strokeWidth={1.5} />
        </g>
      ),
    },
  ];
  if (s.landed) {
    const g = project(cam, [center[0] - axis[0] * 0.55, center[1] - axis[1] * 0.55, 0]);
    if (g) out.push({ z: 1e6 - 1, el: <ellipse key="staffHole" cx={g.s[0]} cy={g.s[1]} rx={(cam.f * 0.12) / g.z} ry={(cam.f * 0.03) / g.z} fill="#6b4a2e" opacity={0.5} /> });
  }
  return out;
}

// ------------------------------------------------------------------ POV overlay

function PovOverlay({ t }: { t: number }) {
  const d = donkeyAt(t);
  const bob = Math.sin(d.phase * Math.PI * 2) * 14;
  const duckY = smooth((t - T.duck) / 0.14) * 520;
  const earSw = Math.sin(t * 13) * 5;
  return (
    <g>
      {/* 驴头（后脑勺）和竖起的长耳朵 */}
      <g transform={`translate(960 ${1150 + bob + duckY})`}>
        <path d="M-260 200 Q-150 -120 0 -150 Q150 -120 260 200Z" fill={C.donkey} stroke={C.ink} strokeWidth={6} />
        <path d="M-60 -130 Q0 -210 60 -130 Q30 -60 0 -40 Q-30 -60 -60 -130Z" fill={C.mane} />
        <path d="M-150 60 Q0 20 150 60" stroke={C.blanket} strokeWidth={22} fill="none" />
        <g transform={`rotate(${-18 - earSw} -80 -130)`}>
          <path d="M-120 -120 Q-150 -380 -85 -470 Q-20 -380 -40 -120Z" fill={C.donkey} stroke={C.ink} strokeWidth={6} />
          <path d="M-100 -130 Q-120 -340 -85 -420 Q-45 -340 -58 -130Z" fill={C.donkeyDark} opacity={0.5} />
          <path d="M-102 -440 Q-85 -500 -68 -440Z" fill={C.mane} />
        </g>
        <g transform={`rotate(${18 + earSw} 80 -130)`}>
          <path d="M120 -120 Q150 -380 85 -470 Q20 -380 40 -120Z" fill={C.donkey} stroke={C.ink} strokeWidth={6} />
          <path d="M100 -130 Q120 -340 85 -420 Q45 -340 58 -130Z" fill={C.donkeyDark} opacity={0.5} />
          <path d="M102 -440 Q85 -500 68 -440Z" fill={C.mane} />
        </g>
      </g>
      {/* 阿凡提握杖的右手 */}
      <g transform={`translate(0 ${bob * 0.6})`}>
        <path d={`M1560 1180 L${1105 + Math.sin(t * 7) * 10} ${560 + Math.cos(t * 9) * 8}`} stroke={C.ink} strokeWidth={48} strokeLinecap="round" />
        <path d={`M1560 1180 L${1105 + Math.sin(t * 7) * 10} ${560 + Math.cos(t * 9) * 8}`} stroke={C.staff} strokeWidth={38} strokeLinecap="round" />
        <circle cx={1105 + Math.sin(t * 7) * 10} cy={560 + Math.cos(t * 9) * 8} r={26} fill={C.staffDark} stroke={C.ink} strokeWidth={5} />
        <path d="M1760 1180 Q1640 1000 1470 1010 L1420 1060 Q1500 1120 1560 1180Z" fill={C.sleeve} stroke={C.ink} strokeWidth={6} />
        <ellipse cx={1435} cy={1025} rx={62} ry={50} fill={C.skin} stroke={C.ink} strokeWidth={6} transform="rotate(-38 1435 1025)" />
        <path d="M1400 995 Q1440 985 1475 1010 M1395 1025 Q1435 1012 1470 1040" stroke={C.ink} strokeWidth={4} fill="none" />
      </g>
      {/* 左手抓缰绳 */}
      <g transform={`translate(0 ${bob * 0.5 + duckY * 0.2})`}>
        <path d="M150 1180 Q260 1030 420 1020 L450 1080 Q330 1120 300 1180Z" fill={C.sleeve} stroke={C.ink} strokeWidth={6} />
        <ellipse cx={450} cy={1040} rx={58} ry={46} fill={C.skin} stroke={C.ink} strokeWidth={6} />
        <path d="M470 1040 Q700 1000 860 1060" stroke={C.blanket} strokeWidth={10} fill="none" />
      </g>
    </g>
  );
}

// ------------------------------------------------------------------ overlays

export function SpeedLines({ t, amount }: { t: number; amount: number }) {
  if (amount <= 0) return null;
  const r = rng(Math.floor(t * 30) * 13 + 1);
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < 26; i++) {
    const y = r() * H;
    const x = r() * W;
    const len = 120 + r() * 360;
    lines.push(<path key={i} d={`M${x} ${y}L${x - len} ${y + (r() - 0.5) * 8}`} stroke="#fff8e6" strokeWidth={1 + r() * 3} strokeLinecap="round" opacity={0.35 * amount} />);
  }
  return <g>{lines}</g>;
}

export function ImpactBurst({ t }: { t: number }) {
  const a = t - T.impact;
  if (a < 0 || a > 0.62) return null;
  const s = 0.6 + 0.6 * (1 - Math.exp(-a * 14));
  const op = a < 0.45 ? 1 : 1 - (a - 0.45) / 0.17;
  const pts: string[] = [];
  const r = rng(5);
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2;
    const rr = i % 2 === 0 ? 300 + r() * 80 : 150;
    pts.push(`${(Math.cos(ang) * rr).toFixed(1)},${(Math.sin(ang) * rr * 0.7).toFixed(1)}`);
  }
  return (
    <g opacity={op} transform={`translate(1470 330) scale(${s * 0.7}) rotate(${-8 + a * 10})`}>
      <polygon points={pts.join(' ')} fill="#ffe14a" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      <polygon points={pts.join(' ')} fill="#ff7a1a" transform="scale(0.72)" />
      <text x={0} y={52} textAnchor="middle" fontFamily="'ZCOOL KuaiLe', 'WenQuanYi Zen Hei', sans-serif" fontSize={190} fill="#fff" stroke={C.ink} strokeWidth={12} paintOrder="stroke" letterSpacing={6}>
        砰！
      </text>
    </g>
  );
}

// ------------------------------------------------------------------ main

export const AfantiScene: React.FC<{ t: number }> = ({ t }) => {
  const fx = cameraAt(t);
  const cam = fx.cam;
  const items: Item[] = [];

  TREES.forEach((tr, i) => {
    const it = treeItem(cam, tr, `t${i}`);
    if (it) items.push(it);
  });
  ROCKS.forEach((rk, i) => {
    const it = rockItem(cam, rk, `r${i}`);
    if (it) items.push(it);
  });
  SHRUBS.forEach((s, i) => {
    const it = shrubItem(cam, s, `s${i}`);
    if (it) items.push(it);
  });
  [...MOUNDS, WELL_MOUND].forEach((m, i) => {
    const it = moundItem(cam, m, `m${i}`);
    if (it) items.push(it);
  });
  items.push(...windlassItems(cam, t));

  // 叶板影子是否落在骑手身上
  const shadowPolys = windlassShadowPolys(t);
  const d = donkeyAt(t);
  const shadowed = shadowPolys.some((p) => pointInPoly(d.x - 0.2, d.y, p) || pointInPoly(d.x + 0.3, d.y, p)) ? 1 : 0;

  items.push(...characterItems(cam, t, fx.view, shadowed));
  items.push(...dustItems(cam, t));

  // 地面阴影（z=1e6）先画
  const groundItems = items.filter((i) => i.z >= 1e5);
  const upright = items.filter((i) => i.z < 1e5).sort((a, b) => b.z - a.z);

  const flash = t >= T.impact && t < T.impact + 0.1 ? 1 - (t - T.impact) / 0.1 : 0;
  const rollScale = fx.cam.roll !== 0 ? 1.12 : 1;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', background: '#e8cfa2' }}>
      <defs>
        <RobeDefs uid={UID} />
        <radialGradient id={`${UID}-dust`}>
          <stop offset="0" stopColor="#e9d3a8" stopOpacity={0.95} />
          <stop offset="0.6" stopColor="#d9bb8a" stopOpacity={0.55} />
          <stop offset="1" stopColor="#d2b284" stopOpacity={0} />
        </radialGradient>
        <filter id={`${UID}-shadowed`}>
          <feColorMatrix type="matrix" values="0.55 0 0 0 0  0 0.52 0 0 0  0 0 0.55 0 0.02  0 0 0 1 0" />
        </filter>
        <radialGradient id={`${UID}-vig`} cx="50%" cy="50%" r="75%">
          <stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#2a1300" stopOpacity={0.55} />
        </radialGradient>
      </defs>
      <g transform={`rotate(${fx.cam.roll} ${W / 2} ${H / 2}) translate(${W / 2} ${H / 2}) scale(${rollScale}) translate(${-W / 2} ${-H / 2})`}>
        <Sky cam={cam} uid={UID} />
        <FarLand cam={cam} />
        <Ground cam={cam} uid={UID} />
        <RoadAndDecals cam={cam} />
        <Pebbles cam={cam} />
        {shadowPolys.map((p, i) => (
          <GroundPoly key={`ws${i}`} cam={cam} pts={p} fill="#4a2e14" opacity={0.28} />
        ))}
        <GroundPoly cam={cam} pts={ellipsePts(WHEEL.x, KAREZ_Y, 2.6, 2.6, 0, 24)} fill="#b38a57" opacity={0.5} />
        {groundItems.map((i) => i.el)}
        {upright.map((i) => i.el)}
      </g>
      {fx.view === 'pov' && <PovOverlay t={t} />}
      <SpeedLines t={t} amount={fx.speedLines} />
      <ImpactBurst t={t} />
      {flash > 0 && <rect width={W} height={H} fill="#fffbe8" opacity={flash} />}
      <rect width={W} height={H} fill={`url(#${UID}-vig)`} />
    </svg>
  );
};

