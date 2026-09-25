/**
 * 阿凡提 · 坎儿井大辘轳 —— 全部声音用 JS 程序化生成并混音。
 *
 *   node scripts/afanti/audio.mjs export-lines   导出对白表给 TTS（tts.py）
 *   node scripts/afanti/audio.mjs build          合成音效 + 配乐 + 变声对白 → public/afanti/soundtrack.wav
 *
 * 时间轴直接 import 画面用的 plan.ts（Node 22 的 TypeScript 类型擦除），
 * 所以每个蹄声、撞击、铃铛都和画面同一帧。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRAYS, DURATION_S, LINES, SHOTS, T, WHEEL, donkeyAt, hoofHits, wheelAngle,
} from '../../src/remotion/afanti/plan.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUILD = path.join(ROOT, 'build/afanti');
const SR = 48000;
const LEN = Math.ceil((DURATION_S + 0.3) * SR);

/**
 * 变声（女声 → 阿凡提的男中音）：
 *   1) TD-PSOLA 把基频降到约 0.6 倍，保持共振峰和时长；
 *   2) 再整体重采样 FORMANT_K，让共振峰（声道长度）也变"男性化"。
 * 重采样会拉长时长，所以导出给 TTS 的语速预先乘以 FORMANT_K 做补偿。
 */
const FORMANT_K = 0.87;
const PSOLA_P = 0.6;

// ------------------------------------------------------------------ utils

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}
const R = rng(424242);
const noise = () => R() * 2 - 1;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const dbToGain = (db) => Math.pow(10, db / 20);

class Bus {
  constructor(name) {
    this.name = name;
    this.L = new Float32Array(LEN);
    this.R = new Float32Array(LEN);
  }
  /** 单声道信号放到时间 t0，pan -1..1 */
  add(sig, t0, gain = 1, pan = 0) {
    const i0 = Math.round(t0 * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < sig.length; i++) {
      const j = i0 + i;
      if (j < 0 || j >= LEN) continue;
      this.L[j] += sig[i] * gl;
      this.R[j] += sig[i] * gr;
    }
  }
  addStereo(l, r, t0, gain = 1) {
    const i0 = Math.round(t0 * SR);
    for (let i = 0; i < l.length; i++) {
      const j = i0 + i;
      if (j < 0 || j >= LEN) continue;
      this.L[j] += l[i] * gain;
      this.R[j] += r[i] * gain;
    }
  }
}

/** RBJ biquad */
function biquad(type, f, q = 0.707, gainDb = 0) {
  const w = (2 * Math.PI * f) / SR;
  const cs = Math.cos(w);
  const sn = Math.sin(w);
  const alpha = sn / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lp': b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; break;
    case 'hp': b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; break;
    case 'bp': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; break;
    case 'peak': b0 = 1 + alpha * A; b1 = -2 * cs; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cs; a2 = 1 - alpha / A; break;
    default: throw new Error(type);
  }
  const c = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}
function filt(sig, ...fs) {
  const out = new Float32Array(sig.length);
  for (let i = 0; i < sig.length; i++) {
    let v = sig[i];
    for (const f of fs) v = f(v);
    out[i] = v;
  }
  return out;
}
const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const env = (i, n, att, rel) => {
  const t = i / SR;
  const T = n / SR;
  return Math.min(1, t / Math.max(1e-4, att)) * Math.min(1, (T - t) / Math.max(1e-4, rel));
};

// 简单 Freeverb 风格混响
function reverb(L, Rr, { room = 0.8, damp = 0.3, wet = 0.3, pre = 0.01 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const make = (spread) => {
    const cs = combs.map((n) => ({ b: new Float32Array(Math.round((n + spread) * SR / 44100)), i: 0, f: 0 }));
    const as = aps.map((n) => ({ b: new Float32Array(Math.round((n + spread) * SR / 44100)), i: 0 }));
    return (x) => {
      let out = 0;
      for (const c of cs) {
        const y = c.b[c.i];
        c.f = y * (1 - damp) + c.f * damp;
        c.b[c.i] = x + c.f * room;
        c.i = (c.i + 1) % c.b.length;
        out += y;
      }
      for (const a of as) {
        const bo = a.b[a.i];
        const y = -out + bo;
        a.b[a.i] = out + bo * 0.5;
        a.i = (a.i + 1) % a.b.length;
        out = y;
      }
      return out;
    };
  };
  const rl = make(0);
  const rr = make(23);
  const d = Math.round(pre * SR);
  const outL = new Float32Array(L.length);
  const outR = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) {
    const m = ((L[i - d] || 0) + (Rr[i - d] || 0)) * 0.015;
    outL[i] = L[i] + rl(m) * wet;
    outR[i] = Rr[i] + rr(m) * wet;
  }
  return [outL, outR];
}

// ------------------------------------------------------------------ SFX 合成器

function hoof(intensity = 1, ground = 1) {
  const n = Math.round(0.14 * SR);
  const s = new Float32Array(n);
  const f0 = 110 + R() * 50;
  const bp = biquad('bp', 1700 + R() * 1400, 2.2);
  const lp = biquad('lp', 900, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * f0 * (1 - t * 3)) / SR;
    const thump = Math.sin(ph) * Math.exp(-t * 55);
    const clack = bp(noise()) * Math.exp(-t * 180) * 2.2;
    const dirt = lp(noise()) * Math.exp(-t * 35) * 0.9 * ground;
    s[i] = (thump * 0.9 + clack * 0.7 + dirt) * intensity;
  }
  return s;
}

function creak({ dur = 0.3, rate = 45, rate2 = 70, res = [420, 930, 1650], gain = 1, groan = 0 } = {}) {
  const n = Math.round(dur * SR);
  const s = new Float32Array(n);
  const bank = res.map((f) => biquad('bp', f * (0.95 + R() * 0.1), 9));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const r = lerp(rate, rate2, u) * (1 + 0.15 * Math.sin(i / SR * 37));
    ph += r / SR;
    let x = 0;
    if (ph >= 1) {
      ph -= 1;
      x = 1 + noise() * 0.4;
    }
    x += noise() * 0.03;
    let y = 0;
    for (const f of bank) y += f(x);
    const g = groan ? Math.sin(2 * Math.PI * lerp(rate, rate2, u) * i / SR) * groan * 0.2 : 0;
    s[i] = (y * 1.4 + g) * Math.sin(Math.PI * u) * gain;
  }
  return s;
}

/** 可平滑调频的状态变量带通滤波器（TPT SVF） */
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, f, q) => {
    const g = Math.tan((Math.PI * clamp(f, 40, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return v1 * k; // 归一化带通
  };
}

function whoosh(dur = 0.4, f1 = 400, f2 = 2400, gain = 1, q = 1.2) {
  const n = Math.round(dur * SR);
  const s = new Float32Array(n);
  const b = svf();
  for (let i = 0; i < n; i++) {
    const u = i / n;
    s[i] = b(noise(), lerp(f1, f2, Math.sin(u * Math.PI * 0.5)), q) * Math.pow(Math.sin(Math.PI * u), 1.5) * gain * 1.6;
  }
  return s;
}

function bell(f0 = 1650, gain = 1, dur = 0.7) {
  const n = Math.round(dur * SR);
  const s = new Float32Array(n);
  const parts = [[1, 1, 7], [2.32, 0.5, 11], [4.25, 0.3, 16], [6.63, 0.18, 22], [0.5, 0.25, 5]];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const [r, a, d] of parts) v += Math.sin(2 * Math.PI * f0 * r * t) * a * Math.exp(-t * d);
    s[i] = v * gain * Math.min(1, t * 2000);
  }
  return s;
}

function jingle(gain = 1) {
  const out = buf(0.8);
  const k = 2 + Math.floor(R() * 3);
  for (let j = 0; j < k; j++) {
    const b = bell(1500 + R() * 700, (0.4 + R() * 0.4) * gain, 0.6);
    const o = Math.round(R() * 0.05 * SR);
    for (let i = 0; i < b.length && i + o < out.length; i++) out[i + o] += b[i];
  }
  return out;
}

/** 毛驴叫：吸气的"呃咿"（高而刺耳）与呼气的"啊"（低沉的锯齿波 + 共振峰）交替 */
function bray(len = 0.8, pitch = 1) {
  const n = Math.round(len * SR);
  const s = new Float32Array(n);
  const cycles = Math.max(2, Math.round(len / 0.26));
  const fa = [biquad('bp', 720, 5), biquad('bp', 1250, 6), biquad('bp', 2600, 7)];
  const fh = [biquad('bp', 1150, 4), biquad('bp', 2300, 5), biquad('bp', 3400, 6)];
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const c = (t / len) * cycles;
    const ci = Math.floor(c);
    const u = c - ci;
    const hee = ci % 2 === 0;
    const vib = 1 + 0.04 * Math.sin(2 * Math.PI * 7 * t);
    const f = (hee ? lerp(520, 640, u) : lerp(230, 150, u)) * pitch * vib;
    ph += f / SR;
    const saw = 2 * (ph - Math.floor(ph)) - 1;
    const src = saw + noise() * (hee ? 0.55 : 0.2);
    const bank = hee ? fh : fa;
    let v = 0;
    for (let k = 0; k < 3; k++) v += bank[k](src) * [1, 0.7, 0.4][k];
    const e = Math.pow(Math.sin(Math.PI * u), 0.5) * (u < 0.92 ? 1 : 0.5);
    s[i] = Math.tanh(v * 3) * e * (hee ? 0.7 : 1);
  }
  const fade = Math.round(0.03 * SR);
  for (let i = 0; i < fade; i++) s[n - 1 - i] *= i / fade;
  return s;
}

function woodImpact(gain = 1) {
  const n = Math.round(1.6 * SR);
  const s = new Float32Array(n);
  const modes = [[92, 1.0, 5], [185, 0.8, 8], [390, 0.6, 12], [640, 0.45, 18], [1060, 0.3, 26], [1720, 0.2, 40]];
  const crackF = biquad('hp', 1800, 0.7);
  const low = biquad('lp', 200, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const [f, a, d] of modes) v += Math.sin(2 * Math.PI * f * t * (1 + 0.02 * Math.exp(-t * 30))) * a * Math.exp(-t * d);
    ph += (2 * Math.PI * (70 - 30 * Math.min(1, t * 4))) / SR;
    const boom = Math.sin(ph) * Math.exp(-t * 6) * 1.4;
    const crack = crackF(noise()) * Math.exp(-t * 60) * 1.6;
    const body = low(noise()) * Math.exp(-t * 14) * 2;
    s[i] = Math.tanh((v * 0.8 + boom + crack + body) * 1.2) * gain;
  }
  return s;
}

function thud(gain = 1, f = 80) {
  const n = Math.round(0.35 * SR);
  const s = new Float32Array(n);
  const lp = biquad('lp', 600, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * f * (1 - t)) / SR;
    s[i] = (Math.sin(ph) * Math.exp(-t * 16) + lp(noise()) * Math.exp(-t * 25) * 0.9) * gain;
  }
  return s;
}

function gravelSkid(dur = 0.5, gain = 1) {
  const n = Math.round(dur * SR);
  const s = new Float32Array(n);
  const bp = biquad('bp', 2400, 0.8);
  const lp = biquad('lp', 5000, 0.7);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const grit = R() < 0.03 ? noise() * 3 : 0;
    s[i] = (lp(bp(noise()) * 1.5 + grit)) * Math.pow(1 - u, 1.5) * Math.min(1, u * 30) * gain;
  }
  return s;
}

function splash(gain = 1) {
  const n = Math.round(1.2 * SR);
  const s = new Float32Array(n);
  const bp = biquad('bp', 1400, 0.9);
  const lp = biquad('lp', 3500, 0.7);
  const bubbles = [];
  for (let k = 0; k < 14; k++) bubbles.push({ t: 0.03 + R() * 0.7, f: 500 + R() * 1400, a: 0.2 + R() * 0.4 });
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = lp(bp(noise())) * Math.exp(-t * 7) * 2.5 * Math.min(1, t * 300);
    for (const b of bubbles) {
      const dt = t - b.t;
      if (dt > 0 && dt < 0.08) v += Math.sin(2 * Math.PI * b.f * (1 + dt * 12) * dt) * Math.exp(-dt * 60) * b.a;
    }
    s[i] = v * gain;
  }
  return s;
}

function trickle(dur, gain = 1) {
  const n = Math.round(dur * SR);
  const s = new Float32Array(n);
  const bp = biquad('bp', 2200, 1.5);
  const bp2 = biquad('bp', 900, 2);
  let bub = 0, bf = 800, bph = 0;
  for (let i = 0; i < n; i++) {
    if (R() < 0.0009) { bub = 0.3 + R() * 0.3; bf = 600 + R() * 1200; }
    bub *= 0.9993;
    bf *= 1.00002;
    bph += (2 * Math.PI * bf) / SR;
    s[i] = (bp(noise()) * 0.5 + bp2(noise()) * 0.3 + Math.sin(bph) * bub * 0.3) * gain;
  }
  return s;
}

function boing(gain = 1) {
  const n = Math.round(0.9 * SR);
  const s = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 170 + 60 * Math.sin(2 * Math.PI * 11 * t) * Math.exp(-t * 3);
    ph += (2 * Math.PI * f) / SR;
    s[i] = Math.sin(ph) * Math.exp(-t * 4.5) * gain * Math.min(1, t * 500);
  }
  return s;
}

// ------------------------------------------------------------------ 配乐（维吾尔风：手鼓 dap + 都塔尔/热瓦普拨弦）

function pluck(freq, dur = 0.5, gain = 1, bright = 0.5) {
  const n = Math.round(dur * SR);
  const s = new Float32Array(n);
  const N = Math.max(2, Math.round(SR / freq));
  const line = new Float32Array(N);
  for (let i = 0; i < N; i++) line[i] = noise() * (0.5 + bright * 0.5);
  let idx = 0;
  let last = 0;
  const damp = 0.5 - 0.02 * (1 - bright);
  for (let i = 0; i < n; i++) {
    const cur = line[idx];
    const nxt = line[(idx + 1) % N];
    const v = (cur * damp + nxt * (1 - damp)) * 0.996;
    line[idx] = v;
    idx = (idx + 1) % N;
    // 弦的"金属嗡"：加一点二次谐波
    s[i] = (cur + 0.25 * (cur * Math.abs(cur))) * gain;
    last = cur;
  }
  void last;
  const f = Math.round(0.01 * SR);
  for (let i = 0; i < f; i++) s[n - 1 - i] *= i / f;
  return filt(s, biquad('peak', 2800, 1.5, 4), biquad('hp', 90, 0.7));
}

function dapDum(gain = 1) {
  const n = Math.round(0.35 * SR);
  const s = new Float32Array(n);
  let ph = 0;
  const lp = biquad('lp', 400, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (95 + 60 * Math.exp(-t * 40))) / SR;
    s[i] = (Math.sin(ph) * Math.exp(-t * 11) + lp(noise()) * Math.exp(-t * 40) * 0.5) * gain;
  }
  return s;
}
function dapTek(gain = 1) {
  const n = Math.round(0.18 * SR);
  const s = new Float32Array(n);
  const bp = biquad('bp', 1900, 1.6);
  const rings = biquad('hp', 6000, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    s[i] = (bp(noise()) * Math.exp(-t * 60) * 2.2 + rings(noise()) * Math.exp(-t * 18) * 0.35) * gain;
  }
  return s;
}

// D Hijaz（乌兹哈勒木卡姆色彩）：D Eb F# G A Bb C D
const SCALE = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19];
const noteHz = (deg, oct = 0) => {
  const semis = SCALE[((deg % 7) + 7) % 7] + 12 * (Math.floor(deg / 7) + oct);
  return 146.83 * Math.pow(2, semis / 12);
};

function buildMusic(bus) {
  const BEAT = 60 / 152;
  const E8 = BEAT / 2;
  // 手鼓节奏型（8 个八分音符一小节）
  const pattern = ['D', '', 'T', 'T', 'D', 'T', '', 'T'];
  const riffA = [0, 1, 2, 1, 0, 2, 4, 3, 2, 1, 2, 3, 4, 5, 4, 2];
  const riffB = [4, 5, 7, 5, 4, 3, 2, 1, 2, 4, 5, 4, 3, 2, 1, 0];
  const riffHero = [7, 7, 8, 7, 5, 4, 5, 7, 9, 8, 7, 5, 4, 3, 4, 5];
  let step = 0;
  for (let t = 0; t < T.impact - 0.02; t += E8, step++) {
    const bar = Math.floor(step / 8);
    const k = step % 8;
    const hero = t > 8.0;
    const lvl = hero ? 1 : 0.8;
    const p = pattern[k];
    if (p === 'D') bus.add(dapDum(0.9 * lvl), t, 1, 0);
    if (p === 'T') bus.add(dapTek(0.55 * lvl), t, 1, 0.25);
    if (hero && k % 2 === 1) bus.add(dapTek(0.25), t + E8 / 2, 1, -0.25);
    // 旋律（热瓦普）
    const riff = hero ? riffHero : bar % 2 === 0 ? riffA : riffB;
    const deg = riff[step % 16];
    bus.add(pluck(noteHz(deg, 1), 0.3, 0.42 * lvl, 0.8), t, 1, 0.3);
    if (hero) bus.add(pluck(noteHz(deg, 2), 0.2, 0.16, 0.9), t + 0.012, 1, -0.3);
    // 都塔尔低音持续（D-A 五度）
    if (k === 0 || k === 4) {
      bus.add(pluck(noteHz(0, -1), 0.7, 0.5, 0.3), t, 1, -0.35);
      bus.add(pluck(noteHz(4, -1), 0.7, 0.32, 0.3), t + 0.01, 1, -0.35);
    }
  }
  // 撞击前的滑音上冲
  for (let i = 0; i < 6; i++) bus.add(pluck(noteHz(7 + i, 1), 0.2, 0.3, 0.9), T.impact - 0.36 + i * 0.05, 1, 0.2);

  // 撞击后：静默 → "嗯哼"得意的点弦 → 惊慌的急奏
  const smug = [[11.9, 4], [12.15, 2], [12.4, 4], [12.62, 5], [12.9, 7], [13.12, 4]];
  for (const [t, d] of smug) bus.add(pluck(noteHz(d, 0), 0.35, 0.4, 0.6), t, 1, 0.1);
  for (const t of [11.9, 12.5, 13.1]) bus.add(dapTek(0.35), t, 1, 0.2);
  let s2 = 0;
  for (let t = T.panic; t < 14.72; t += 0.075, s2++) {
    const d = [4, 5, 4, 3, 4, 5, 7, 5][s2 % 8] + Math.floor(s2 / 8);
    bus.add(pluck(noteHz(d, 1), 0.15, 0.3, 0.9), t, 1, s2 % 2 ? 0.3 : -0.3);
    if (s2 % 4 === 0) bus.add(dapDum(0.5), t, 1, 0);
    if (s2 % 4 === 2) bus.add(dapTek(0.35), t, 1, 0.2);
  }
  // 片尾的滑稽收束：下行 + 一记鼓
  [[14.74, 4], [14.84, 2], [14.94, 0]].forEach(([t, d]) => bus.add(pluck(noteHz(d, 0), 0.5, 0.5, 0.5), t, 1, 0));
  bus.add(dapDum(1), 14.94, 1, 0);
}

// ------------------------------------------------------------------ 对白

function readWav(file) {
  const b = fs.readFileSync(file);
  const sr = b.readUInt32LE(24);
  let off = 12;
  while (off < b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'data') {
      const n = size / 2;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = b.readInt16LE(off + 8 + i * 2) / 32768;
      return { sr, data: out };
    }
    off += 8 + size;
  }
  throw new Error('no data chunk: ' + file);
}

/** 自相关基音跟踪：返回每 hop 个采样点的周期（采样数），0 = 清音 */
function trackPitch(x, sr, hop) {
  const win = Math.round(sr * 0.04);
  const lo = Math.round(sr / 420);
  const hi = Math.round(sr / 70);
  const out = [];
  for (let c = 0; c < x.length; c += hop) {
    const a = Math.max(0, c - win / 2);
    const b = Math.min(x.length, a + win);
    let e = 0;
    for (let i = a; i < b; i++) e += x[i] * x[i];
    if (b - a < win || e / win < 1e-4) {
      out.push(0);
      continue;
    }
    // 归一化自相关；取第一个超过全局最大值 85% 的峰，避免低八度误判
    const r = new Float32Array(hi + 1);
    let rmax = 0;
    for (let lag = lo; lag <= hi; lag++) {
      let s = 0, e1 = 0, e2 = 0;
      for (let i = a; i + lag < b; i++) {
        s += x[i] * x[i + lag];
        e1 += x[i] * x[i];
        e2 += x[i + lag] * x[i + lag];
      }
      r[lag] = s / Math.sqrt(e1 * e2 + 1e-12);
      rmax = Math.max(rmax, r[lag]);
    }
    let bestLag = 0;
    for (let lag = lo + 1; lag < hi; lag++) {
      if (r[lag] >= 0.85 * rmax && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) {
        bestLag = lag;
        break;
      }
    }
    out.push(rmax > 0.35 ? bestLag : 0);
  }
  // 中值平滑，去掉倍频跳变
  return out.map((v, i) => {
    const w = out.slice(Math.max(0, i - 2), i + 3).filter((q) => q > 0).sort((p, q) => p - q);
    return v === 0 || w.length === 0 ? 0 : w[Math.floor(w.length / 2)];
  });
}

/** TD-PSOLA 变调（p<1 降调），时长和共振峰不变 */
function psola(x, sr, p) {
  const hop = Math.round(sr * 0.005);
  const per = trackPitch(x, sr, hop);
  const P = (i) => per[Math.min(per.length - 1, Math.floor(i / hop))];
  // 分析标记：浊音段按周期落在波峰上，清音段每 5ms 一个
  const marks = [];
  let m = 0;
  while (m < x.length) {
    const T0 = P(m);
    if (T0 > 0) {
      let bi = m;
      let bv = -Infinity;
      for (let i = Math.max(0, m - (T0 >> 2)); i < Math.min(x.length, m + (T0 >> 2)); i++) if (x[i] > bv) { bv = x[i]; bi = i; }
      marks.push({ at: bi, T: T0, voiced: true });
      m = bi + T0;
    } else {
      marks.push({ at: m, T: hop * 2, voiced: false });
      m += hop;
    }
  }
  const y = new Float32Array(x.length + sr);
  const wsum = new Float32Array(y.length);
  let s = marks.length ? marks[0].at : 0;
  let k = 0;
  while (s < x.length && marks.length) {
    while (k + 1 < marks.length && Math.abs(marks[k + 1].at - s) < Math.abs(marks[k].at - s)) k++;
    const mk = marks[k];
    const L = mk.T;
    for (let i = -L; i < L; i++) {
      const src = mk.at + i;
      const dst = Math.round(s) + i;
      if (src < 0 || src >= x.length || dst < 0 || dst >= y.length) continue;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * i) / L);
      y[dst] += x[src] * w;
      wsum[dst] += w;
    }
    s += mk.voiced ? mk.T / p : mk.T / 2;
  }
  for (let i = 0; i < y.length; i++) if (wsum[i] > 1e-3) y[i] /= Math.max(1, wsum[i]);
  return y.subarray(0, x.length);
}

/** WSOLA 时间压缩（不变调）：rate>1 变快 */
function wsola(x, rate) {
  if (rate <= 1.001) return x;
  const N = Math.round(0.03 * SR);
  const Hs = N >> 1;
  const Ha = Math.round(Hs * rate);
  const tol = Math.round(0.008 * SR);
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const outLen = Math.floor(x.length / rate) + N;
  const y = new Float32Array(outLen);
  const norm = new Float32Array(outLen);
  let prev = 0;
  for (let o = 0, a = 0; a + N + tol < x.length && o + N < outLen; o += Hs, a += Ha) {
    // 在 ±tol 内找与上一帧自然延续最相似的位置
    let best = a;
    let bestC = -Infinity;
    if (o > 0) {
      for (let d = -tol; d <= tol; d += 2) {
        const c0 = a + d;
        if (c0 < 0) continue;
        let c = 0;
        for (let i = 0; i < N; i += 4) c += x[c0 + i] * x[prev + Hs + i];
        if (c > bestC) {
          bestC = c;
          best = c0;
        }
      }
    }
    for (let i = 0; i < N; i++) {
      y[o + i] += x[best + i] * win[i];
      norm[o + i] += win[i];
    }
    prev = best;
  }
  for (let i = 0; i < outLen; i++) if (norm[i] > 1e-3) y[i] /= norm[i];
  return y.subarray(0, Math.floor(x.length / rate));
}

/** 外部配音（已是男声）：重采样到 48k、切掉首尾静音、轻微 EQ、响度归一 */
function cleanVoice(w) {
  const step = w.sr / SR;
  const n = Math.floor(w.data.length / step);
  let s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = w.data[Math.min(w.data.length - 1, Math.round(i * step))];
  let a = 0;
  let b = n - 1;
  while (a < n && Math.abs(s[a]) < 0.01) a++;
  while (b > a && Math.abs(s[b]) < 0.01) b--;
  s = s.slice(Math.max(0, a - Math.round(0.02 * SR)), Math.min(n, b + Math.round(0.05 * SR)));
  const eq = filt(s, biquad('hp', 70, 0.7), biquad('peak', 3000, 1.2, 2));
  let peak = 0;
  for (const v of eq) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < eq.length; i++) eq[i] = Math.tanh((eq[i] / (peak || 1)) * 1.3) / Math.tanh(1.3);
  return eq;
}

/** 男声化 + EQ + 喊叫时的轻微失真 */
function voiceFx(w, shout) {
  const low = psola(w.data, w.sr, PSOLA_P);
  const step = (w.sr / SR) * FORMANT_K;
  const n = Math.floor(low.length / step);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * step;
    const j = Math.floor(x);
    const u = x - j;
    const y0 = low[j - 1] ?? 0, y1 = low[j] ?? 0, y2 = low[j + 1] ?? 0, y3 = low[j + 2] ?? 0;
    s[i] = y1 + 0.5 * u * (y2 - y0 + u * (2 * y0 - 5 * y1 + 4 * y2 - y3 + u * (3 * (y1 - y2) + y3 - y0)));
  }
  const eq = filt(s, biquad('hp', 70, 0.7), biquad('peak', 180, 1, 3), biquad('peak', 2600, 1.2, 4), biquad('lp', 8500, 0.7));
  let peak = 0;
  for (const v of eq) peak = Math.max(peak, Math.abs(v));
  const drive = 1.2 + shout * 1.8;
  for (let i = 0; i < eq.length; i++) eq[i] = Math.tanh((eq[i] / (peak || 1)) * drive) / Math.tanh(drive);
  return eq;
}

// ------------------------------------------------------------------ build

function exportLines() {
  fs.mkdirSync(BUILD, { recursive: true });
  const lines = LINES.map((l) => ({ ...l, speed: l.speed * FORMANT_K }));
  fs.writeFileSync(path.join(BUILD, 'lines.json'), JSON.stringify(lines, null, 1));
  console.log('wrote', path.join(BUILD, 'lines.json'));
}

function shotGain(t, ids, g) {
  const s = SHOTS.find((x) => t >= x.start && t < x.end);
  return s && ids.includes(s.id) ? g : 1;
}

function build() {
  const sfx = new Bus('sfx');
  const amb = new Bus('amb');
  const music = new Bus('music');
  const voice = new Bus('voice');

  // 蹄声：不规则的四拍，每只蹄子音色不同
  for (const h of hoofHits(0, 15)) {
    const d = donkeyAt(h.t);
    const jitter = (R() - 0.5) * 0.018;
    const g = (0.55 + R() * 0.3) * (h.leg >= 2 ? 1 : 0.8) * shotGain(h.t, ['E_hoofCU', 'H_hoofTrack'], 1.7) * (h.t > T.impact ? Math.max(0.25, 1 - (h.t - T.impact) * 0.22) : 1);
    sfx.add(hoof(g, 1), h.t + jitter, 1, clamp(d.y * 0.3, -0.5, 0.5));
    // 铃铛随步伐叮当
    if (h.leg === 2 && R() < 0.8) sfx.add(jingle(0.16 * (h.t > T.impact ? 0.5 : 1)), h.t + 0.01, 1, 0.15);
    // 马鞍嘎吱（骑行中）
    if (h.t < T.impact && h.leg === 0 && R() < 0.55) sfx.add(creak({ dur: 0.18 + R() * 0.12, rate: 40 + R() * 30, rate2: 60 + R() * 40, gain: 0.22 }), h.t, 1, -0.1);
  }

  // 重要动作的音效
  const creakAt = (t, g = 0.5, dur = 0.35) => sfx.add(creak({ dur, rate: 35, rate2: 85, gain: g }), t, 1, 0);
  const jingleAt = (t, g = 0.4) => sfx.add(jingle(g), t, 1, 0.2);
  const swish = (t, dur = 0.35, g = 0.5, f1 = 500, f2 = 2500) => sfx.add(whoosh(dur, f1, f2, g), t, 1, (R() - 0.5) * 0.6);

  // 0:00 猛冲
  sfx.add(gravelSkid(0.45, 0.6), 0.02, 1, 0);
  creakAt(0.05, 0.7, 0.45);
  jingleAt(0.06, 0.5);
  swish(0.1, 0.5, 0.35, 300, 1800); // 衣物被拖拽
  sfx.add(whoosh(0.75, 1200, 2600, 0.25, 3), 0.25, 1, -0.2); // 长袍噗噜噜
  swish(T.swingUp, 0.4, 0.6, 400, 3000);
  sfx.add(thud(0.7, 90), T.seated - 0.02, 1, 0);
  creakAt(T.seated, 0.8, 0.4);
  jingleAt(T.seated, 0.5);
  swish(T.point - 0.04, 0.25, 0.5, 900, 3500);

  // 之字形
  for (const t of [2.12, 2.32, 2.5, 2.68, 3.1, 3.45, 3.75]) {
    swish(t, 0.3, 0.45);
    if (R() < 0.7) creakAt(t + 0.05, 0.45, 0.25);
    jingleAt(t, 0.3);
  }
  sfx.add(gravelSkid(0.3, 0.35), 2.25, 1, 0.5);
  sfx.add(gravelSkid(0.3, 0.35), 2.65, 1, -0.5);
  sfx.add(gravelSkid(0.3, 0.35), 3.05, 1, 0.5);

  // 跳石
  sfx.add(gravelSkid(0.2, 0.5), T.crouch, 1, 0);
  swish(T.takeoff, 0.55, 0.7, 300, 2200);
  sfx.add(thud(1.1, 70), T.land, 1, 0);
  sfx.add(gravelSkid(0.35, 0.6), T.land, 1, 0);
  creakAt(T.land + 0.02, 0.8, 0.5);
  jingleAt(T.land, 0.6);
  sfx.add(thud(0.5, 110), T.standLand, 1, 0); // 靴子落在马鞍上
  for (let t = 5.0; t < 5.8; t += 0.35) creakAt(t, 0.35, 0.3);

  // 绊倒 + 前翻 + 钟摆
  sfx.add(hoof(1.3, 0.2), T.trip - 0.01, 1, 0);
  sfx.add(gravelSkid(0.7, 0.8), T.trip, 1, 0);
  sfx.add(thud(0.9, 60), T.trip + 0.15, 1, 0);
  jingleAt(T.trip, 0.7);
  swish(5.9, 0.45, 0.7, 300, 3200);
  swish(6.2, 0.35, 0.55);
  swish(6.45, 0.35, 0.55);
  swish(6.7, 0.35, 0.55);
  creakAt(6.18, 0.7, 0.4);
  creakAt(6.68, 0.6, 0.4);

  // 急转马戏
  sfx.add(gravelSkid(0.8, 0.8), 7.05, 1, 0.4);
  swish(7.0, 0.5, 0.7, 300, 2600);
  for (let t = 7.1; t < 7.95; t += 0.14) sfx.add(whoosh(0.16, 1500, 3000, 0.22, 3), t, 1, -0.3); // 袍子猎猎作响
  creakAt(7.3, 0.6, 0.6);

  // 英雄恢复
  swish(8.05, 0.45, 0.6, 400, 2800);
  sfx.add(thud(0.6, 95), 8.42, 1, 0);
  creakAt(8.44, 0.7, 0.35);
  jingleAt(8.44, 0.5);
  for (const s of SHOTS) if (s.start > 0.5) sfx.add(whoosh(0.28, 700, 2200, 0.28, 1.5), s.start - 0.12, 1, 0); // 转场气流

  // 撞击
  sfx.add(whoosh(0.3, 200, 900, 0.5, 1), T.impact - 0.22, 1, 0);
  sfx.add(woodImpact(1.0), T.impact, 1, 0);
  sfx.add(thud(1.0, 55), T.impact, 1, 0);
  jingleAt(T.impact + 0.02, 0.5);
  // 飞走的手杖：旋转呼呼声 + 落地"嘣"
  for (let t = T.impact + 0.05; t < T.staffLand - 0.05; t += 0.3) sfx.add(whoosh(0.22, 400, 1400, 0.3, 2), t, 1, -0.4);
  sfx.add(thud(0.6, 120), T.staffLand, 1, -0.4);
  sfx.add(boing(0.35), T.staffLand + 0.01, 1, -0.4);
  // 水桶落井
  sfx.add(splash(0.7), T.bucketSplash, 1, 0.3);
  // 惊慌踢腿
  for (let t = T.panic; t < 15; t += 0.13) sfx.add(whoosh(0.14, 800, 2600, 0.18, 2.5), t, 1, (R() - 0.5) * 0.4);

  // 毛驴叫
  for (const b of BRAYS) sfx.add(bray(b.len, b.pitch), b.t, b.gain * 0.55, 0.1);

  // 辘轳：吱呀——每片叶板经过最低点都有一声木轴呻吟
  const wheelLevel = (t) => (t < 9 ? 0 : t < 10.3 ? 0.25 : t < 11 ? 0.55 : 0.85);
  const w0 = wheelAngle(0);
  for (let k = -30; k < 30; k++) {
    // 手臂 k 经过 α≡0 (mod 2π/8) 的时间
    const t = (k * (2 * Math.PI) / WHEEL.arms - w0) / (WHEEL.omega) ;
    if (t < 9 || t > 15) continue;
    amb.add(creak({ dur: 0.6 + R() * 0.3, rate: 22, rate2: 48, res: [180, 330, 760], gain: 0.55 * wheelLevel(t), groan: 1 }), t - 0.2, 1, 0.25);
    amb.add(creak({ dur: 0.3, rate: 60, rate2: 90, res: [900, 1400, 2200], gain: 0.2 * wheelLevel(t) }), t + 0.35, 1, 0.3);
  }
  // 绳索在绞鼓上摩擦
  for (let t = 11.2; t < 15; t += 0.9) amb.add(creak({ dur: 0.5, rate: 80, rate2: 120, res: [1200, 2000, 3100], gain: 0.12 }), t, 1, 0.4);
  // 坎儿井暗渠里的流水（辘轳附近能听到）
  amb.add(trickle(6.5, 0.12), 9.0, 1, 0.35);

  // 风：随速度和机位变化，连续的呼啸
  {
    const n = LEN;
    const L = new Float32Array(n);
    const Rr = new Float32Array(n);
    const bL = svf();
    const bR = svf();
    const lpL = biquad('lp', 1800, 0.7);
    const lpR = biquad('lp', 1800, 0.7);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 420 + 180 * Math.sin(t * 1.3) + 110 * Math.sin(t * 3.7);
      const d = donkeyAt(Math.min(t, 14.99));
      const speed = t < T.impact ? d.v : 1.5;
      let lvl = 0.05 + speed * 0.028;
      lvl *= shotGain(t, ['I_lateral', 'G_dutchSide', 'K_pov'], 1.7);
      if (t > T.impact) lvl = 0.07;
      L[i] = lpL(bL(noise(), f, 0.8)) * lvl * 2.2;
      Rr[i] = lpR(bR(noise(), f * 1.1, 0.8)) * lvl * 2.2;
    }
    amb.addStereo(L, Rr, 0, 1);
  }

  buildMusic(music);

  // 对白
  // 优先使用 magic-story-cup 配音链路合成的对白（scripts/afanti/dub.mjs）；没有时退回本地 TTS + 变声
  const vdir = path.join(BUILD, 'voice');
  const sdir = path.join(BUILD, 'voice_ext');
  let usedSpeko = 0;
  for (const [i, l] of LINES.entries()) {
    const sp = path.join(sdir, `${l.id}.wav`);
    let v;
    if (fs.existsSync(sp)) {
      v = cleanVoice(readWav(sp));
      usedSpeko++;
    } else {
      const f = path.join(vdir, `${l.id}.wav`);
      if (!fs.existsSync(f)) {
        console.warn('缺少对白音频，先运行 npm run afanti:voice →', f);
        continue;
      }
      v = voiceFx(readWav(f), clamp((l.energy - 1) * 3, 0, 1));
    }
    const next = LINES[i + 1]?.t ?? DURATION_S;
    const room = next - l.t - 0.04;
    if (v.length / SR > room) {
      const rate = Math.min(1.3, v.length / SR / room);
      v = wsola(v, rate);
      console.log(`  ${l.id} 压缩 ${rate.toFixed(2)}× 以放进镜头`);
    }
    const dur = v.length / SR;
    if (l.t + dur > next + 0.05) console.warn(`⚠ ${l.id} 时长 ${dur.toFixed(2)}s，会和下一句重叠 ${(l.t + dur - next).toFixed(2)}s`);
    voice.add(v, l.t, l.gain * 0.9, -0.05);
  }
  console.log(usedSpeko ? `对白：${usedSpeko}/${LINES.length} 句使用外部配音（build/afanti/voice_ext）` : '对白：使用本地 TTS + 变声');

  // ---------------------------------------------------------------- 混音
  const [vL, vR] = reverb(voice.L, voice.R, { room: 0.7, damp: 0.5, wet: 0.16 });
  const [sL, sR] = reverb(sfx.L, sfx.R, { room: 0.78, damp: 0.4, wet: 0.22 });
  const [aL, aR] = reverb(amb.L, amb.R, { room: 0.85, damp: 0.3, wet: 0.35 });
  const [mL, mR] = reverb(music.L, music.R, { room: 0.8, damp: 0.4, wet: 0.25 });

  // 对白出现时压低配乐（侧链闪避）
  const duck = new Float32Array(LEN);
  let envv = 0;
  for (let i = 0; i < LEN; i++) {
    const x = Math.abs(vL[i]) + Math.abs(vR[i]);
    envv = x > envv ? envv + (x - envv) * 0.01 : envv * 0.99985;
    duck[i] = 1 - clamp(envv * 1.6, 0, 0.45);
  }

  const gMusic = dbToGain(-9);
  const gSfx = dbToGain(-2);
  const gAmb = dbToGain(-6);
  const gVoice = dbToGain(0);
  const outL = new Float32Array(LEN);
  const outR = new Float32Array(LEN);
  let peak = 0;
  for (let i = 0; i < LEN; i++) {
    const m = gMusic * duck[i];
    outL[i] = mL[i] * m + sL[i] * gSfx + aL[i] * gAmb + vL[i] * gVoice;
    outR[i] = mR[i] * m + sR[i] * gSfx + aR[i] * gAmb + vR[i] * gVoice;
    peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
  }
  // 母带：软限幅 + 归一化到 -1 dBFS
  const pre = 1.25 / (peak || 1);
  let p2 = 0;
  for (let i = 0; i < LEN; i++) {
    outL[i] = Math.tanh(outL[i] * pre);
    outR[i] = Math.tanh(outR[i] * pre);
    p2 = Math.max(p2, Math.abs(outL[i]), Math.abs(outR[i]));
  }
  const norm = dbToGain(-1) / p2;
  const fade = Math.round(0.25 * SR);
  const endI = Math.round(DURATION_S * SR);
  for (let i = 0; i < LEN; i++) {
    let g = norm;
    if (i > endI - fade) g *= clamp((endI - i) / fade, 0, 1);
    outL[i] *= g;
    outR[i] *= g;
  }
  writeWav(path.join(ROOT, 'public/afanti/soundtrack.wav'), outL.subarray(0, endI), outR.subarray(0, endI));
  // 分轨导出，便于检查
  fs.mkdirSync(path.join(BUILD, 'stems'), { recursive: true });
  const stems = { music: [mL, mR], sfx: [sL, sR], ambience: [aL, aR], dialogue: [vL, vR] };
  for (const [k, [l, r]] of Object.entries(stems)) writeWav(path.join(BUILD, 'stems', `${k}.wav`), l.subarray(0, endI), r.subarray(0, endI), 0.5);
  console.log('wrote public/afanti/soundtrack.wav');
}

function writeWav(file, L, Rr, gain = 1) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const n = L.length;
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 4, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(clamp(L[i] * gain, -1, 1) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(clamp(Rr[i] * gain, -1, 1) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, b);
}

const cmd = process.argv[2] ?? 'build';
if (cmd === 'export-lines') exportLines();
else if (cmd === 'voice-fx') {
  // 调试：把变声后的每句对白单独导出
  const out = path.join(BUILD, 'voice_fx');
  for (const l of LINES) {
    const v = voiceFx(readWav(path.join(BUILD, 'voice', `${l.id}.wav`)), 0);
    writeWav(path.join(out, `${l.id}.wav`), v, v);
  }
  console.log('wrote', out);
} else build();
