#!/usr/bin/env node
/**
 * Synthesises the score for 《父与子》 Father and Son.
 *
 * A waltz in 3/4 — a nod to the accordion waltz of Father and Daughter — written in the
 * D gong pentatonic mode and voiced for synthetic Chinese instruments: guzheng (plucked,
 * Karplus–Strong), dizi (breathy flute), erhu (bowed, additive) and sheng (reed chords, the
 * accordion's cousin). Cue points are taken from the film's timeline so picture and music
 * stay locked. Output: public/father-and-son/score.mp3 (via Remotion's bundled ffmpeg).
 *
 *   node scripts/father-and-son-score.mjs [--wav out.wav]
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 44100;
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/films/father-and-son/timeline.json'), 'utf8'));

const START = {};
let TOTAL = 0;
for (const [id, sec] of Object.entries(timeline.scenes)) {
  START[id] = TOTAL;
  TOTAL += sec;
}
/** Global time of a moment inside a scene. */
const at = (scene, t) => START[scene] + t;

const N = Math.ceil((TOTAL + 1) * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const VERB = new Float32Array(N); // reverb send (mono)

// ------------------------------------------------------------------ helpers

let seed = 12345;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TABLE = 4096;
const SIN = new Float32Array(TABLE + 1).map((_, i) => Math.sin((i / TABLE) * Math.PI * 2));
const sin = (ph) => {
  const x = (ph - Math.floor(ph)) * TABLE;
  const i = x | 0;
  return SIN[i] + (SIN[i + 1] - SIN[i]) * (x - i);
};
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Mix a mono sample into the stereo bus with equal-power pan (-1..1) and a reverb send. */
const put = (i, s, pan, send) => {
  if (i < 0 || i >= N) return;
  const a = (pan + 1) * 0.25 * Math.PI;
  L[i] += s * Math.cos(a);
  R[i] += s * Math.sin(a);
  VERB[i] += s * send;
};

// D gong pentatonic: D E F# A B. Scale index 0 = D4.
const STEPS = [0, 2, 4, 7, 9];
const deg = (i) => 62 + 12 * Math.floor(i / 5) + STEPS[((i % 5) + 5) % 5];

// ------------------------------------------------------------------ instruments

/** Guzheng: Karplus–Strong pluck with a little press-vibrato on long notes. */
function zheng(t0, dur, midi, vel = 0.5, pan = 0.1, send = 0.35, bright = 0.5) {
  const f = mtof(midi);
  const len = SR / f;
  const n = Math.floor(len);
  const buf = new Float32Array(n + 2);
  for (let i = 0; i < buf.length; i++) buf[i] = rand() * 2 - 1;
  // soften the excitation
  for (let k = 0; k < 2 + (1 - bright) * 3; k++) for (let i = 1; i < buf.length; i++) buf[i] = 0.5 * (buf[i] + buf[i - 1]);
  const ring = Math.min(6, dur + 2.5);
  const total = Math.floor(ring * SR);
  const start = Math.floor(t0 * SR);
  const decay = Math.pow(0.001, 1 / (Math.max(0.6, 2.8 - (midi - 50) * 0.03) * SR / n));
  let idx = 0;
  let prev = 0;
  const damp = start + Math.floor((dur + 0.4) * SR);
  for (let s = 0; s < total; s++) {
    const cur = buf[idx];
    const next = buf[(idx + 1) % n];
    let v = 0.5 * (cur + next) * decay;
    if (start + s > damp) v *= 0.999;
    buf[idx] = v;
    idx = (idx + 1) % n;
    // gentle one-pole lowpass for warmth
    prev += (cur - prev) * (0.35 + bright * 0.5);
    const env = Math.min(1, s / 40);
    put(start + s, prev * vel * env * 0.9, pan, send);
  }
}

/** Continuous melodic line (dizi or erhu) with portamento, vibrato and re-articulation. */
function line(notes, voice, opts = {}) {
  if (!notes.length) return;
  const { vel = 0.35, pan = -0.15, send = 0.45 } = opts;
  const t0 = notes[0].t;
  const t1 = notes[notes.length - 1].t + notes[notes.length - 1].dur;
  const s0 = Math.floor(t0 * SR);
  const s1 = Math.floor((t1 + 0.35) * SR);
  let phase = 0;
  let ni = 0;
  let noiseLP = 0;
  let noiseBP = 0;
  const isErhu = voice === 'erhu';
  const glide = isErhu ? 0.07 : 0.025;
  // harmonic recipe
  const harm = isErhu
    ? Array.from({ length: 16 }, (_, k) => {
        const n = k + 1;
        return (1 / n) * (1 + 1.8 * Math.exp(-Math.pow((n - 4) / 2.2, 2)));
      })
    : [1, 0.28, 0.12, 0.05, 0.02];
  const hsum = harm.reduce((a, b) => a + b, 0);
  for (let s = s0; s < s1; s++) {
    const t = s / SR;
    while (ni < notes.length - 1 && t >= notes[ni + 1].t) ni++;
    const n = notes[ni];
    const prevN = ni > 0 ? notes[ni - 1] : n;
    const since = t - n.t;
    const connected = ni > 0 && Math.abs(prevN.t + prevN.dur - n.t) < 0.02;
    let midi = n.midi;
    if (connected && since < glide) midi = prevN.midi + (n.midi - prevN.midi) * smooth(since / glide);
    const vibDepth = (isErhu ? 0.22 : 0.12) * smooth((since - 0.18) / 0.35);
    const vib = Math.sin(2 * Math.PI * (isErhu ? 5.6 : 5.0) * t) * vibDepth;
    const f = mtof(midi + vib);
    phase += f / SR;
    // envelope: swell in, small dip at re-bow / tonguing, release after last note
    const atk = isErhu ? 0.09 : 0.04;
    let env = smooth(since / atk);
    if (connected) env = 0.72 + 0.28 * smooth(since / atk);
    const left = n.t + n.dur - t;
    if (ni === notes.length - 1 || !(Math.abs(notes[ni + 1].t - (n.t + n.dur)) < 0.02)) env *= left > 0 ? smooth(Math.min(1, left / 0.12 + 0.2)) : Math.max(0, 1 + left / 0.25);
    const swell = isErhu ? 0.85 + 0.15 * Math.sin(Math.min(1, since / Math.max(0.3, n.dur)) * Math.PI) : 1;
    let v = 0;
    for (let k = 0; k < harm.length; k++) {
      if (f * (k + 1) > 9000) break;
      v += harm[k] * sin(phase * (k + 1));
    }
    v /= hsum;
    // breath / bow noise
    const nz = rand() * 2 - 1;
    noiseLP += (nz - noiseLP) * 0.2;
    noiseBP += (noiseLP - noiseBP) * 0.05;
    const breath = (noiseLP - noiseBP) * (isErhu ? 0.018 : 0.035);
    const sample = (v + breath) * env * swell * (n.vel ?? 1) * vel;
    put(s, sample, pan, send);
  }
}

/** Sheng / reed organ note: slightly detuned reed pair, soft attack. */
function reed(t0, dur, midi, vel = 0.12, pan = 0.25, send = 0.35, atk = 0.03, rel = 0.12) {
  const f = mtof(midi);
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor((dur + rel) * SR);
  const harm = [1, 0.55, 0.38, 0.22, 0.16, 0.09, 0.06, 0.04];
  let p1 = rand();
  let p2 = rand();
  for (let s = 0; s < len; s++) {
    const t = s / SR;
    const env = smooth(t / atk) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1) * (1 + 0.06 * Math.sin(2 * Math.PI * 5.2 * t));
    p1 += f / SR;
    p2 += (f * 1.0035) / SR;
    let v = 0;
    for (let k = 0; k < harm.length; k++) {
      if (f * (k + 1) > 7000) break;
      v += harm[k] * (sin(p1 * (k + 1)) + sin(p2 * (k + 1))) * 0.5;
    }
    put(s0 + s, v * env * vel * 0.4, pan, send);
  }
}

/** Soft plucked/bowed bass under the waltz. */
function bass(t0, dur, midi, vel = 0.3, send = 0.2) {
  const f = mtof(midi);
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor((dur + 0.3) * SR);
  let ph = 0;
  for (let s = 0; s < len; s++) {
    const t = s / SR;
    ph += f / SR;
    const env = Math.min(1, t / 0.012) * Math.exp(-t * 2.2) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.3) : 1);
    const v = sin(ph) + 0.35 * sin(ph * 2) + 0.1 * sin(ph * 3);
    put(s0 + s, v * env * vel * 0.5, 0, send);
  }
}

/** The bicycle bell: two quick metallic strikes. */
function bell(t0, vel = 0.25, pan = 0) {
  const partials = [
    [2380, 1, 1.4],
    [3410, 0.6, 1.9],
    [5120, 0.35, 2.6],
    [6900, 0.2, 3.4],
  ];
  for (const strike of [0, 0.11]) {
    const s0 = Math.floor((t0 + strike) * SR);
    for (let s = 0; s < SR * 1.2; s++) {
      const t = s / SR;
      let v = 0;
      for (const [f, a, d] of partials) v += a * Math.sin(2 * Math.PI * f * t * (1 + 0.002 * Math.sin(2 * Math.PI * 7 * t))) * Math.exp(-t * d * 2.2);
      put(s0 + s, v * vel * 0.25 * Math.min(1, t * 3000), pan, 0.25);
    }
  }
}

/** Wind: filtered noise with gusts. */
function wind(t0, t1, level = 0.05, bright = 0.4, gustRate = 0.18) {
  const s0 = Math.floor(t0 * SR);
  const s1 = Math.floor(t1 * SR);
  let lp = 0;
  let bp = 0;
  let lp2 = 0;
  for (let s = s0; s < s1; s++) {
    const t = s / SR;
    const u = (t - t0) / (t1 - t0);
    const fade = smooth(u / 0.1) * smooth((1 - u) / 0.15);
    const gust = 0.55 + 0.45 * Math.sin(2 * Math.PI * gustRate * t + Math.sin(t * 0.37) * 2);
    const cut = 0.01 + 0.03 * bright * gust;
    const nz = rand() * 2 - 1;
    lp += (nz - lp) * cut;
    bp += (lp - bp) * 0.004;
    lp2 += (lp - bp - lp2) * 0.3;
    const v = lp2 * 6 * gust * level * fade;
    const i = s;
    L[i] += v * (0.8 + 0.2 * Math.sin(t * 0.3));
    R[i] += v * (0.8 + 0.2 * Math.cos(t * 0.23));
  }
}

/** Spring rain: hiss plus scattered drops. */
function rain(t0, t1, level = 0.03) {
  const s0 = Math.floor(t0 * SR);
  const s1 = Math.floor(t1 * SR);
  let hp = 0;
  let prev = 0;
  for (let s = s0; s < s1; s++) {
    const u = (s - s0) / (s1 - s0);
    const fade = smooth(u / 0.12) * smooth((1 - u) / 0.12);
    const nz = rand() * 2 - 1;
    hp = 0.97 * (hp + nz - prev);
    prev = nz;
    const drop = rand() < 0.0009 ? (rand() * 2 - 1) * 4 : 0;
    const v = (hp * 0.35 + drop) * level * fade;
    L[s] += v * (rand() < 0.5 ? 1 : 0.7);
    R[s] += v * (rand() < 0.5 ? 1 : 0.7);
  }
}

// ------------------------------------------------------------------ the music

const CHORD = {
  D: { bass: 38, notes: [50, 54, 57] },
  B: { bass: 35, notes: [47, 50, 54] },
  A: { bass: 33, notes: [45, 50, 52] },
  E: { bass: 40, notes: [52, 57, 59] },
  Dh: { bass: 38, notes: [57, 62, 66] },
};

/** Theme A — the bicycle waltz. 16 bars of [scale index, beats]. */
const THEME_A = [
  [[2, 1], [3, 1], [4, 1]], [[3, 2], [2, 1]], [[1, 1], [2, 1], [3, 1]], [[0, 3]],
  [[2, 1], [3, 1], [4, 1]], [[5, 2], [4, 1]], [[3, 1], [4, 1], [3, 1]], [[2, 2], [1, 1]],
  [[2, 1], [3, 1], [4, 1]], [[3, 2], [2, 1]], [[1, 1], [0, 1], [1, 1]], [[2, 3]],
  [[3, 1], [4, 1], [5, 1]], [[6, 2], [5, 1]], [[4, 1], [3, 1], [2, 1]], [[0, 3]],
];
const CHORDS_A = ['D', 'D', 'A', 'D', 'D', 'B', 'A', 'A', 'D', 'D', 'E', 'D', 'B', 'E', 'B', 'D'];

/** Theme B — the embrace. Ends on B (yu mode) unless resolved. */
const THEME_B = [[[4, 2], [3, 1]], [[2, 3]], [[3, 1], [4, 1], [5, 1]], [[6, 3]], [[5, 2], [4, 1]], [[3, 2], [2, 1]], [[1, 1], [2, 1], [3, 1]], [[4, 3]]];
const THEME_B_RESOLVED = [...THEME_B.slice(0, 7), [[5, 3]]];
const CHORDS_B = ['B', 'D', 'D', 'E', 'B', 'D', 'A', 'B'];
const CHORDS_B_RESOLVED = ['B', 'D', 'D', 'E', 'B', 'D', 'A', 'D'];

/** Theme A shifted down one pentatonic step: the same tune, now in B yu mode — longing. */
const THEME_A_YU = THEME_A.map((bar) => bar.map(([i, b]) => [i - 1, b]));
const CHORDS_A_YU = ['B', 'B', 'E', 'B', 'B', 'A', 'E', 'E', 'B', 'B', 'D', 'B', 'A', 'D', 'A', 'B'];

/**
 * Lay out bars from `theme` starting at time t0. Tempo may glide from bpm0 to bpm1.
 * Returns note events with absolute times, plus bar start times.
 */
function layout(theme, bars, t0, bpm0, bpm1 = bpm0, octave = 0) {
  const sel = theme.slice(bars[0], bars[1]);
  const totalBeats = sel.length * 3;
  const notes = [];
  const barTimes = [];
  let t = t0;
  let beat = 0;
  const spb = (b) => 60 / (bpm0 + (bpm1 - bpm0) * (b / totalBeats));
  for (const bar of sel) {
    barTimes.push(t);
    for (const [i, beats] of bar) {
      let d = 0;
      for (let k = 0; k < beats; k++) d += spb(beat + k);
      notes.push({ t, dur: d, midi: deg(i) + 12 * octave, vel: 1 });
      t += d;
      beat += beats;
    }
  }
  barTimes.push(t);
  return { notes, barTimes, end: t };
}

/** Oom-pah-pah: bass on one, reed chord on two and three. */
function waltz(barTimes, chords, first, vel = 1, reedVel = 0.1) {
  for (let b = 0; b < barTimes.length - 1; b++) {
    const c = CHORD[chords[(first + b) % chords.length]];
    const bt = (barTimes[b + 1] - barTimes[b]) / 3;
    bass(barTimes[b], bt * 1.2, c.bass, 0.32 * vel);
    for (const beat of [1, 2]) for (const m of c.notes) reed(barTimes[b] + bt * beat, bt * 0.55, m, reedVel * vel, 0.3, 0.3, 0.015, 0.08);
  }
}

/** Long reed chords, one per bar. */
function pads(barTimes, chords, first, vel = 0.08, octave = 0) {
  for (let b = 0; b < barTimes.length - 1; b++) {
    const c = CHORD[chords[(first + b) % chords.length]];
    const d = barTimes[b + 1] - barTimes[b];
    for (const m of c.notes) reed(barTimes[b], d * 1.02, m + 12 * octave, vel, -0.2, 0.55, 0.35, 0.6);
    bass(barTimes[b], d * 0.9, c.bass, 0.18);
  }
}

/** A pentatonic zheng run (刮奏) between two scale indices. */
function gliss(t0, from, to, dur, vel = 0.3) {
  const n = Math.abs(to - from) + 1;
  for (let k = 0; k < n; k++) {
    const i = from + Math.sign(to - from) * k;
    zheng(t0 + (k / n) * dur, 0.6, deg(i), vel * (0.6 + 0.4 * (k / n)), 0.3 - (k / n) * 0.6, 0.45, 0.6);
  }
}

/** Sparse zheng notes drawn from a chord, like drops of water. */
function drops(t0, t1, chords, every = 1.4, vel = 0.22) {
  let t = t0;
  let k = 0;
  while (t < t1) {
    const c = CHORD[chords[Math.floor(k / 2) % chords.length]];
    const m = c.notes[Math.floor(rand() * c.notes.length)] + 12 + (rand() < 0.3 ? 12 : 0);
    zheng(t, 1.5, m, vel * (0.7 + rand() * 0.3), (rand() - 0.5) * 0.8, 0.55, 0.4);
    t += every * (0.7 + rand() * 0.6);
    k++;
  }
}

// Title — a run up the strings, a held reed chord, and a note for the seal.
gliss(at('title', 0.8), -2, 9, 1.4, 0.28);
for (const m of [50, 57, 62]) reed(at('title', 1.2), 7, m, 0.07, -0.2, 0.6, 1.2, 1.5);
zheng(at('title', 3.2), 2, deg(3), 0.3);
zheng(at('title', 4.65), 3, deg(5), 0.35, 0.3);

// Parting — the ride along the dike: the waltz, played on dizi.
{
  const a = layout(THEME_A, [0, 8], at('parting', 1.2), 96);
  line(a.notes, 'dizi', { vel: 0.32, pan: -0.1 });
  waltz(a.barTimes, CHORDS_A, 0, 0.9);
  bell(at('parting', 11.2), 0.3, 0.2);
  // stopping, kneeling, the willow switch — reeds breathing, drops of zheng
  const p = [at('parting', 16.2), at('parting', 20.4), at('parting', 24.6), at('parting', 28.8), at('parting', 33)];
  pads(p, ['D', 'B', 'E', 'D'], 0, 0.06);
  drops(at('parting', 17), at('parting', 33), ['D', 'B', 'E', 'D'], 1.6, 0.2);
  // the embrace — theme B on erhu
  const b = layout(THEME_B, [0, 8], at('parting', 33.4), 72);
  line(b.notes, 'erhu', { vel: 0.3, pan: -0.2, send: 0.55 });
  pads(b.barTimes, CHORDS_B, 0, 0.07);
  // the boat goes out — the waltz again, but in yu mode, slowly
  const y = layout(THEME_A_YU, [0, 8], b.end + 0.4, 66);
  line(y.notes, 'erhu', { vel: 0.26, pan: -0.25, send: 0.6 });
  pads(y.barTimes, CHORDS_A_YU, 0, 0.06);
  // dusk: planting the switch, the long walk home
  drops(y.end + 0.5, at('parting', 82), ['B', 'D', 'E', 'B'], 2.2, 0.16);
  for (const m of [47, 54, 59]) reed(y.end, at('parting', 83) - y.end, m, 0.045, -0.2, 0.6, 2, 2);
  wind(at('parting', 60), at('parting', 84), 0.02, 0.2);
}

// Childhood — four seasons, four quarters of the waltz.
{
  const sp = layout(THEME_A, [0, 4], at('spring', 1.6), 88);
  line(sp.notes, 'dizi', { vel: 0.28 });
  for (let b = 0; b < sp.barTimes.length - 1; b++) {
    const c = CHORD[CHORDS_A[b]];
    const bt = (sp.barTimes[b + 1] - sp.barTimes[b]) / 3;
    bass(sp.barTimes[b], bt, c.bass, 0.22);
    zheng(sp.barTimes[b] + bt, 0.3, c.notes[1] + 12, 0.16, 0.4, 0.4, 0.3);
    zheng(sp.barTimes[b] + bt * 2, 0.3, c.notes[2] + 12, 0.14, 0.4, 0.4, 0.3);
  }
  rain(at('spring', 0), at('spring', 13), 0.009);

  const su = layout(THEME_A, [4, 8], at('summer', 1.2), 100);
  line(su.notes, 'dizi', { vel: 0.3, pan: 0.1 });
  waltz(su.barTimes, CHORDS_A, 4, 0.85);
  gliss(su.end - 0.2, 3, 12, 0.7, 0.18);

  const au = layout(THEME_A, [8, 12], at('autumn', 1.4), 88);
  line(au.notes, 'erhu', { vel: 0.26 });
  waltz(au.barTimes, CHORDS_A, 8, 0.7);
  wind(at('autumn', 0), at('autumn', 12), 0.035, 0.5, 0.3);

  const wi = layout(THEME_A, [12, 16], at('winter', 1.8), 76, 70);
  for (const n of wi.notes) zheng(n.t, n.dur, n.midi + 12, 0.3, 0.1, 0.6, 0.75);
  pads(wi.barTimes, CHORDS_A, 12, 0.05, 1);
  wind(at('winter', 0), at('winter', 13), 0.018, 0.15);
}

// Youth — the whole band, bells and all.
{
  const y = layout(THEME_A, [0, 12], at('youth', 1), 106);
  line(y.notes, 'dizi', { vel: 0.3, pan: -0.1 });
  for (const n of y.notes) if (n.dur < 0.6) zheng(n.t, n.dur, n.midi + 12, 0.1, 0.35, 0.35, 0.7);
  waltz(y.barTimes, CHORDS_A, 0, 1, 0.11);
  bell(at('youth', 12), 0.22, 0.5);
  bell(at('youth', 12.7), 0.18, 0.7);
  bell(at('youth', 13.5), 0.16, 0.4);
}

// Courtship — theme B, tender, with a gentle waltz beneath.
{
  const b = layout(THEME_B, [0, 8], at('courtship', 2), 70);
  line(b.notes, 'erhu', { vel: 0.3, pan: -0.15, send: 0.55 });
  const d = layout(THEME_B, [0, 8], at('courtship', 2), 70, 70, 1);
  for (const n of d.notes) if (n.t > at('courtship', 11)) zheng(n.t, n.dur, n.midi, 0.1, 0.4, 0.5, 0.6);
  waltz(b.barTimes, CHORDS_B, 0, 0.55, 0.08);
}

// Fatherhood — the opening waltz again, the same dizi, a new little boy on the crossbar.
{
  const a = layout(THEME_A, [0, 8], at('fatherhood', 1.2), 96);
  line(a.notes, 'dizi', { vel: 0.3, pan: -0.1 });
  waltz(a.barTimes, CHORDS_A, 0, 0.9);
  const c = layout(THEME_A, [12, 16], a.end + 0.5, 84, 72);
  line(c.notes, 'erhu', { vel: 0.26 });
  pads(c.barTimes, CHORDS_A, 12, 0.06);
}

// Old age — wind, and the waltz in yu mode, very slow.
{
  wind(at('oldAge', 0), at('oldAge', 30), 0.06, 0.6, 0.22);
  const y = layout(THEME_A_YU, [0, 8], at('oldAge', 3), 58);
  line(y.notes, 'erhu', { vel: 0.24, pan: -0.2, send: 0.65 });
  pads(y.barTimes, CHORDS_A_YU, 0, 0.05);
}

// Drought — years pour past on the zheng; then only reeds and wind.
{
  const seasons = ['B', 'E', 'D', 'A', 'B', 'E'];
  const t0 = at('drought', 0.3);
  const step = 0.105;
  for (let k = 0; t0 + k * step < at('drought', 10); k++) {
    const t = t0 + k * step;
    const c = CHORD[seasons[Math.min(seasons.length - 1, Math.floor((t - t0) / 1.62))]];
    const pattern = [0, 1, 2, 1];
    const m = c.notes[pattern[k % 4]] + 12 + (Math.floor(k / 4) % 2) * 12;
    zheng(t, 0.2, m, 0.13 + 0.05 * Math.sin(k * 0.3), Math.sin(k * 0.21) * 0.6, 0.5, 0.55);
  }
  for (const m of [47, 54, 59, 62]) reed(at('drought', 9.5), 17, m, 0.035, -0.1, 0.7, 3, 4);
  wind(at('drought', 9), at('drought', 41), 0.03, 0.3, 0.12);
  drops(at('drought', 12), at('drought', 26), ['B', 'E', 'B', 'A'], 2.8, 0.13);
  // he finds the boat
  zheng(at('drought', 33.2), 3, deg(4), 0.28, 0.2);
  zheng(at('drought', 33.7), 3, deg(2), 0.22, -0.1);
  for (const m of [50, 57, 62, 66]) reed(at('drought', 34), 10, m, 0.04, 0, 0.7, 2.5, 3);
}

// Reunion — he rises; the waltz returns and quickens as the years fall away; the embrace.
{
  zheng(at('reunion', 5.2), 3, deg(3), 0.22, 0.2);
  const run0 = at('reunion', 10.4);
  const arrive = at('reunion', 21.4);
  const a = layout(THEME_A, [0, 6], run0, 58, 118);
  // squeeze the run so the last note lands on the embrace
  const k = (arrive - run0) / (a.end - run0);
  const notes = a.notes.map((n) => ({ ...n, t: run0 + (n.t - run0) * k, dur: n.dur * k }));
  const bars = a.barTimes.map((t) => run0 + (t - run0) * k);
  for (const n of notes) zheng(n.t, n.dur, n.midi + 12, 0.26, 0.1, 0.45, 0.6);
  line(notes.filter((n) => n.t > run0 + 4), 'dizi', { vel: 0.22 });
  waltz(bars.slice(2), CHORDS_A, 2, 0.75);
  gliss(arrive - 0.7, 0, 10, 0.7, 0.24);
  // theme B, resolved at last, carried over into the epilogue
  const b = layout(THEME_B_RESOLVED, [0, 8], arrive, 70);
  line(b.notes, 'erhu', { vel: 0.33, pan: -0.15, send: 0.6 });
  const b2 = layout(THEME_B_RESOLVED, [0, 8], arrive, 70, 70, 1);
  line(b2.notes.filter((n) => n.t > arrive + 8), 'dizi', { vel: 0.16, pan: 0.25 });
  pads(b.barTimes, CHORDS_B_RESOLVED, 0, 0.075);
  for (const m of [50, 57, 62, 66, 69]) reed(b.end, 6, m, 0.05, 0, 0.7, 0.6, 3);

  // Epilogue — the last four bars of the waltz, alone on the zheng.
  const e = layout(THEME_A, [12, 16], Math.max(b.end + 1.5, at('epilogue', 3)), 78, 64);
  for (const n of e.notes) zheng(n.t, n.dur, n.midi + 12, 0.26, 0.15, 0.6, 0.7);
  wind(at('epilogue', 0), at('epilogue', 15), 0.018, 0.2);
}

// Credits — a last run up the strings and the home chord.
gliss(at('credits', 0.8), 0, 10, 1.6, 0.2);
for (const m of [38, 50, 57, 62, 66]) reed(at('credits', 1.5), 9, m, m < 45 ? 0.06 : 0.045, 0, 0.7, 1.5, 2.5);
zheng(at('credits', 4), 4, deg(5), 0.26, 0.2);
zheng(at('credits', 5.2), 4, deg(3), 0.22, -0.2);
zheng(at('credits', 6.6), 5, deg(0), 0.26, 0);

// A faint bed of air under everything, so no scene ever drops to dead silence.
wind(0, TOTAL, 0.008, 0.12, 0.07);

// ------------------------------------------------------------------ reverb & master

function freeverb() {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const run = (spread) => {
    const out = new Float32Array(N);
    const cbuf = combs.map((c) => ({ b: new Float32Array(c + spread), i: 0, f: 0 }));
    const abuf = aps.map((a) => ({ b: new Float32Array(a + spread), i: 0 }));
    const fb = 0.86;
    const damp = 0.3;
    for (let s = 0; s < N; s++) {
      const x = VERB[s] * 0.015;
      let y = 0;
      for (const c of cbuf) {
        const o = c.b[c.i];
        c.f = o * (1 - damp) + c.f * damp;
        c.b[c.i] = x + c.f * fb;
        c.i = (c.i + 1) % c.b.length;
        y += o;
      }
      for (const a of abuf) {
        const o = a.b[a.i];
        a.b[a.i] = y + o * 0.5;
        a.i = (a.i + 1) % a.b.length;
        y = o - y;
      }
      out[s] = y;
    }
    return out;
  };
  const vl = run(0);
  const vr = run(23);
  for (let s = 0; s < N; s++) {
    L[s] += vl[s] * 1.4;
    R[s] += vr[s] * 1.4;
  }
}

freeverb();

// Scene-level balance: lift the quiet chapters, tame the full waltz.
const LEVEL = { title: 1.5, parting: 1, spring: 1, summer: 0.85, autumn: 1.05, winter: 1.55, youth: 0.82, courtship: 1, fatherhood: 0.85, oldAge: 1.05, drought: 1.8, reunion: 1, epilogue: 1.25, credits: 1.5 };
const ids = Object.keys(timeline.scenes);
const levelAt = (t) => {
  for (let k = 0; k < ids.length; k++) {
    const s0 = START[ids[k]];
    const s1 = s0 + timeline.scenes[ids[k]];
    if (t < s1 || k === ids.length - 1) {
      const here = LEVEL[ids[k]] ?? 1;
      const next = LEVEL[ids[k + 1]] ?? here;
      const u = smooth((t - (s1 - 1)) / 2);
      return here + (next - here) * u;
    }
  }
  return 1;
};
for (let s = 0; s < N; s += 1) {
  const g = levelAt(s / SR);
  L[s] *= g;
  R[s] *= g;
}

let peak = 0;
for (let s = 0; s < N; s++) peak = Math.max(peak, Math.abs(L[s]), Math.abs(R[s]));
const gain = (0.89 / peak) * 1.3;
const pcm = Buffer.alloc(N * 4);
for (let s = 0; s < N; s++) {
  const fadeOut = Math.min(1, (N - s) / (SR * 1.5));
  const l = Math.tanh(L[s] * gain * 1.1) * fadeOut;
  const r = Math.tanh(R[s] * gain * 1.1) * fadeOut;
  pcm.writeInt16LE(Math.round(l * 32000), s * 4);
  pcm.writeInt16LE(Math.round(r * 32000), s * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const wavArg = process.argv.indexOf('--wav');
const wavPath = wavArg > 0 ? process.argv[wavArg + 1] : path.join(os.tmpdir(), 'father-and-son-score.wav');
fs.writeFileSync(wavPath, Buffer.concat([header, pcm]));
console.log(`score: ${TOTAL}s, peak ${peak.toFixed(3)} → ${wavPath}`);

const out = path.join(ROOT, 'public/father-and-son/score.mp3');
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', wavPath, '-codec:a', 'libmp3lame', '-b:a', '128k', out], { cwd: ROOT, stdio: 'inherit' });
console.log(`score: wrote ${path.relative(ROOT, out)}`);
