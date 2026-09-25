/**
 * 阿凡提 · 坎儿井大辘轳 —— 全片的"导演分镜表"。
 *
 * 这个文件不依赖任何其它模块：画面（Remotion）和声音（scripts/afanti/audio.mjs，
 * 通过 Node 的 TypeScript 类型擦除直接 import）共用同一份运动规划，
 * 因此每一个蹄声、撞击声、铃铛声都与画面逐帧对齐。
 *
 * 世界坐标：米。x 轴 = 土路前进方向（朝向辘轳），y 轴 = 路的左侧，z 轴 = 向上。
 */

export const FPS = 30;
export const DURATION_S = 15;
export const DURATION_FRAMES = FPS * DURATION_S;

// ---------------------------------------------------------------- helpers

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const smooth = (u: number) => {
  const x = clamp(u);
  return x * x * (3 - 2 * x);
};
/** 0→1 over [a,b] with smoothstep */
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
/** piecewise-smooth interpolation through (t, v) keys */
export function keyed(t: number, keys: [number, number][]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- key times

export const T = {
  lurch: 0.04,
  swingUp: 0.86,
  seated: 1.22,
  point: 1.34,
  zigStart: 2.05,
  zigEnd: 3.95,
  crouch: 4.12,
  takeoff: 4.26,
  land: 4.86,
  standLand: 4.98,
  trip: 5.8,
  tripRecover: 6.55,
  turnStart: 7.02,
  turnEnd: 7.98,
  heroBack: 8.05,
  heroPose: 8.5,
  duck: 10.78,
  impact: 11.0,
  staffLand: 12.52,
  lookDown: 13.2,
  panic: 13.42,
  bucketSplash: 12.9,
};

// ---------------------------------------------------------------- donkey motion

const SPEED_KEYS: [number, number][] = [
  [0, 1.2], [0.2, 4.4], [1.0, 4.7], [2.0, 5.0], [4.0, 5.0], [4.14, 4.0],
  [4.3, 5.3], [5.5, 5.3], [5.78, 5.1], [6.1, 2.2], [6.6, 3.3], [7.0, 4.9],
  [8.0, 5.4], [9.0, 6.6], [10.0, 7.5], [11.0, 7.8], [11.7, 6.2], [13.0, 5.2], [15.0, 4.8],
];
export const donkeySpeed = (t: number) => keyed(t, SPEED_KEYS);

const ZIG_A = 0.62;
const ZIG_P = 0.8;
function lateral(t: number): number {
  let y = 0;
  if (t > T.zigStart && t < T.zigEnd) {
    const u = (t - T.zigStart) / (T.zigEnd - T.zigStart);
    const win = Math.pow(Math.sin(Math.PI * u), 0.45);
    y += ZIG_A * win * Math.sin((2 * Math.PI * (t - T.zigStart)) / ZIG_P);
  }
  if (t > T.turnStart && t < T.turnEnd) {
    const u = (t - T.turnStart) / (T.turnEnd - T.turnStart);
    y += 1.35 * Math.pow(Math.sin(Math.PI * u), 2);
  }
  return y;
}

// 预积分：240Hz 采样位置和步态相位
const SR = 240;
const N = Math.ceil(16 * SR) + 2;
const XS = new Float64Array(N);
const PHASE = new Float64Array(N);
(() => {
  let x = 0;
  let ph = 0.18;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    XS[i] = x;
    PHASE[i] = ph;
    const v = donkeySpeed(t);
    x += v / SR;
    const airborne = t > T.takeoff && t < T.land;
    const freq = v < 0.3 ? 0 : 1.25 + 0.27 * v;
    ph += (airborne ? freq * 0.25 : freq) / SR;
  }
})();
function sample(arr: Float64Array, t: number) {
  const f = clamp(t, 0, 15.99) * SR;
  const i = Math.floor(f);
  return lerp(arr[i], arr[i + 1], f - i);
}

export const donkeyX = (t: number) => sample(XS, t);
export const gaitPhase = (t: number) => sample(PHASE, t);

/** 辘轳（坎儿井竖井口上方的巨型木绞轮）的位置：让毛驴恰好在撞击时刻从下方擦过 */
export const WHEEL = {
  x: donkeyX(T.impact) + 0.38,
  axleZ: 4.7,
  rIn: 1.7,
  rOut: 3.5,
  plankW: 1.4,
  arms: 8,
  omega: -0.55, // rad/s；最低处的叶板朝 -x（迎向来者）运动，然后上升
  shaftY: 3.7,
};
/** α=0 时手臂垂直向下；撞击瞬间 0 号手臂几乎在最低点 */
export const wheelAngle = (t: number) => 0.06 + WHEEL.omega * (t - T.impact);

export const ROCK_X = donkeyX((T.takeoff + T.land) / 2) + 0.1;
export const TRIP_X = donkeyX(T.trip) + 0.45;

export interface DonkeyState {
  x: number;
  y: number;
  z: number; // 跳跃离地高度
  heading: number; // rad，0 = +x
  v: number;
  phase: number;
  pitch: number; // deg, 正 = 低头前倾
  duck: number; // 0..1 低头钻过
  crouch: number;
  airborne: number; // 0..1
  trip: number; // 0..1
}

export function donkeyAt(t: number): DonkeyState {
  const x = donkeyX(t);
  const y = lateral(t);
  const dt = 1 / 120;
  const dy = (lateral(t + dt) - lateral(t - dt)) / (2 * dt);
  const v = donkeySpeed(t);
  const heading = Math.atan2(dy, Math.max(0.5, v));
  let z = 0;
  let airborne = 0;
  if (t > T.takeoff && t < T.land) {
    const u = (t - T.takeoff) / (T.land - T.takeoff);
    z = 0.95 * Math.sin(Math.PI * u);
    airborne = 1;
  }
  const crouch = Math.max(ramp(t, 4.05, T.crouch) * (1 - ramp(t, T.crouch, T.takeoff)),
    ramp(t, T.land - 0.02, T.land + 0.06) * (1 - ramp(t, T.land + 0.06, T.land + 0.25)));
  let pitch = 0;
  pitch += keyed(t, [[4.1, 0], [T.takeoff, -14], [4.55, 0], [T.land - 0.05, 12], [T.land + 0.25, 0]]);
  const trip = ramp(t, T.trip, T.trip + 0.2) * (1 - ramp(t, 6.3, T.tripRecover));
  pitch += 27 * trip;
  const duck = ramp(t, T.duck, T.duck + 0.12) * (1 - ramp(t, T.impact + 0.25, T.impact + 0.6));
  return { x, y, z, heading, v, phase: gaitPhase(t), pitch, duck, crouch, airborne, trip };
}

/** 蹄子落地的时间（给音效用）；四拍跑步：后左、后右、前左、前右 */
export const LEG_OFFSETS = [0.0, 0.11, 0.36, 0.47]; // HL HR FL FR
export function hoofHits(t0: number, t1: number): { t: number; leg: number }[] {
  const hits: { t: number; leg: number }[] = [];
  const step = 1 / SR;
  for (let t = t0; t < t1; t += step) {
    if (t > T.takeoff && t < T.land) continue;
    const a = gaitPhase(t);
    const b = gaitPhase(t + step);
    for (let leg = 0; leg < 4; leg++) {
      const pa = a - LEG_OFFSETS[leg];
      const pb = b - LEG_OFFSETS[leg];
      if (Math.floor(pb) > Math.floor(pa)) hits.push({ t: t + step, leg });
    }
  }
  return hits;
}

// ---------------------------------------------------------------- shots

export type ShotId =
  | 'A_lowSide' | 'B_wideReveal' | 'C_frontZig' | 'D_rockLow' | 'E_hoofCU' | 'F_orbit'
  | 'G_dutchSide' | 'H_hoofTrack' | 'I_lateral' | 'J_frontHero' | 'K_pov' | 'L_impact' | 'M_wideLow';

/** 7 个镜头（Shot），13 个机位（Angle） */
export const SHOTS: { id: ShotId; shot: number; start: number; end: number; label: string }[] = [
  { id: 'A_lowSide', shot: 1, start: 0, end: 1.05, label: '低机位侧前跟拍' },
  { id: 'B_wideReveal', shot: 1, start: 1.05, end: 2.0, label: '宽景侧向跟拍·露出大辘轳' },
  { id: 'C_frontZig', shot: 2, start: 2.0, end: 4.0, label: '正面倒退跟拍·之字形' },
  { id: 'D_rockLow', shot: 3, start: 4.0, end: 5.5, label: '贴地低机位·跳石' },
  { id: 'E_hoofCU', shot: 4, start: 5.5, end: 5.95, label: '蹄部特写·绊倒' },
  { id: 'F_orbit', shot: 4, start: 5.95, end: 7.0, label: '快速环绕·前翻' },
  { id: 'G_dutchSide', shot: 5, start: 7.0, end: 8.0, label: '倾斜侧跟·马戏侧挂' },
  { id: 'H_hoofTrack', shot: 6, start: 8.0, end: 8.8, label: '低蹄部跟踪' },
  { id: 'I_lateral', shot: 6, start: 8.8, end: 9.5, label: '快速侧向跟踪' },
  { id: 'J_frontHero', shot: 6, start: 9.5, end: 10.3, label: '正面向后跟踪·英雄姿势' },
  { id: 'K_pov', shot: 6, start: 10.3, end: 11.0, label: '阿凡提视角' },
  { id: 'L_impact', shot: 7, start: 11.0, end: 11.55, label: '撞击！' },
  { id: 'M_wideLow', shot: 7, start: 11.55, end: 15.0, label: '低角度广角揭示' },
];
export const shotAt = (t: number) => SHOTS.find((s) => t >= s.start && t < s.end) ?? SHOTS[SHOTS.length - 1];

// ---------------------------------------------------------------- dialogue

export interface Line {
  id: string;
  t: number;
  who: 'afanti';
  text: string; // 字幕
  say: string; // 送进 TTS 的文本
  speed: number; // FastSpeech2 时长倍率（<1 更快）
  f0: number; // 基频倍率（变声前）
  energy: number;
  gain: number;
}

export const LINES: Line[] = [
  { id: 'l01', t: 0.08, who: 'afanti', text: '哎哎哎——等等我！', say: '哎哎哎，等等我！', speed: 0.72, f0: 1.25, energy: 1.3, gain: 1.0 },
  { id: 'l02', t: 1.38, who: 'afanti', text: '目标——大辘轳！冲啊！', say: '目标，大辘轳！冲啊！', speed: 0.74, f0: 1.1, energy: 1.3, gain: 1.0 },
  { id: 'l03', t: 2.64, who: 'afanti', text: '哎哟哟哟哟！', say: '哎哟哟哟哟！', speed: 0.8, f0: 1.3, energy: 1.2, gain: 0.95 },
  { id: 'l04', t: 4.3, who: 'afanti', text: '哇！', say: '哇！', speed: 0.9, f0: 1.4, energy: 1.3, gain: 0.9 },
  { id: 'l05', t: 4.9, who: 'afanti', text: '稳住……稳住……', say: '稳住，稳住。', speed: 0.64, f0: 1.0, energy: 1.0, gain: 0.95 },
  { id: 'l06', t: 5.9, who: 'afanti', text: '哎呀！', say: '哎呀！', speed: 0.75, f0: 1.35, energy: 1.3, gain: 0.95 },
  { id: 'l07', t: 7.12, who: 'afanti', text: '看——马戏表演！', say: '看，马戏表演！', speed: 0.72, f0: 1.15, energy: 1.2, gain: 0.95 },
  { id: 'l08', t: 8.5, who: 'afanti', text: '智慧，所向无敌！', say: '智慧，所向无敌！', speed: 0.8, f0: 0.95, energy: 1.2, gain: 1.0 },
  { id: 'l09', t: 10.26, who: 'afanti', text: '呃……怎么越来越大？', say: '呃，怎么越来越大？', speed: 0.6, f0: 1.05, energy: 1.0, gain: 0.95 },
  { id: 'l10', t: 11.04, who: 'afanti', text: '哎哟！', say: '哎哟！', speed: 0.7, f0: 1.3, energy: 1.3, gain: 1.0 },
  { id: 'l11', t: 11.95, who: 'afanti', text: '嗯哼，一切尽在掌握。', say: '嗯哼，一切尽在掌握。', speed: 0.72, f0: 0.95, energy: 1.0, gain: 0.95 },
  { id: 'l12', t: 13.45, who: 'afanti', text: '救命啊！毛驴——回来！', say: '救命啊！毛驴，回来！', speed: 0.72, f0: 1.35, energy: 1.35, gain: 1.0 },
];

/** 毛驴叫声（程序合成） */
export const BRAYS = [
  { t: 0.12, len: 0.75, pitch: 1.0, gain: 0.8 },
  { t: 5.86, len: 0.55, pitch: 1.12, gain: 0.75 },
  { t: 14.05, len: 0.95, pitch: 0.95, gain: 0.5 },
];

// ---------------------------------------------------------------- Afanti after impact

/** 撞击后阿凡提抱住的叶板（0 号手臂）上的位置 */
export function armPoint(t: number, r: number, arm = 0): [number, number, number] {
  const a = wheelAngle(t) + (arm * 2 * Math.PI) / WHEEL.arms;
  return [WHEEL.x + r * Math.sin(a), 0, WHEEL.axleZ - r * Math.cos(a)];
}

/** 飞走的长手杖 */
export function staffFlight(t: number) {
  const t0 = T.impact;
  const tl = T.staffLand;
  const u = clamp(t, t0, tl) - t0;
  const dur = tl - t0;
  const p0: [number, number, number] = [WHEEL.x - 0.7, -0.2, 2.0];
  const vz = (0 - p0[2] + 4.9 * dur * dur) / dur;
  const pos: [number, number, number] = [p0[0] - 3.1 * u, p0[1] - 1.4 * u, p0[2] + vz * u - 4.9 * u * u];
  const landAngle = 62; // deg，插进地里
  const spin = 3.2 * 360;
  const ang = t < tl ? landAngle - spin * (tl - t) / dur * 0.9 : landAngle;
  const wobble = t > tl ? 9 * Math.exp(-(t - tl) * 3.2) * Math.sin((t - tl) * 38) : 0;
  return { pos, ang: ang + wobble, landed: t >= tl, wobble };
}

/** 水桶：辘轳转动时绳子放下，桶落进竖井 */
export const bucketZ = (t: number) => 2.45 - 0.2 * t;
