"""Synthesizes the score for the "Ming" video from its beat sheet.

Reads src/videos/ming/beats.json (100 BPM grid, one "music" section and an
optional "hit" per shot) and renders an original cue that follows the cut:
guqin/pipa-like plucks, string pads, taiko, gong, anvil and brass stabs, all
synthesized with numpy. Hits land exactly on shot boundaries.

Usage: python3 scripts/ming-music.py   ->  public/ming/score.mp3
       (needs numpy; encodes with the ffmpeg bundled in @remotion/compositor)
"""

import json
import os
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SHEET = json.loads((ROOT / "src/videos/ming/beats.json").read_text(encoding="utf-8"))
SR = 44100
BEAT = 60 / SHEET["bpm"]
rng = np.random.default_rng(1644)

beats = []
g = 0
for b in SHEET["beats"]:
    beats.append({**b, "g0": g})
    g += b["b"]
TOTAL_BEATS = g
TAIL = 6.0
N = int((TOTAL_BEATS * BEAT + TAIL) * SR)
L = np.zeros((2, N))  # dry bus
R = np.zeros((2, N))  # reverb send


def note(name):
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    base, acc, octv = name[0], name[1:-1], int(name[-1])
    semis = names[base] + (1 if acc == "#" else -1 if acc == "b" else 0) + (octv - 4) * 12
    return 440.0 * 2 ** (semis / 12)


def put(sig, t, gain=1.0, pan=0.0, send=0.3):
    i = int(t * SR)
    if i >= N or len(sig) == 0:
        return
    sig = sig[: N - i]
    lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    for ch, cg in ((0, lg), (1, rg)):
        L[ch, i : i + len(sig)] += sig * gain * cg * 1.41
        R[ch, i : i + len(sig)] += sig * gain * cg * 1.41 * send


def env(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, cutoff):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, len(x))


def highpass(x, cutoff):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / (1 + (cutoff / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(spec, len(x))


# ---- instruments -------------------------------------------------------

def pad(freqs, dur, bright=6.0, attack=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.004, 0.0, 0.0045):
            ph = rng.random() * 2 * np.pi
            ff = f * (1 + det)
            for h in range(1, 13):
                if ff * h > 9000:
                    break
                out += np.sin(2 * np.pi * ff * h * t + ph * h) * (1 / h) * np.exp(-h / bright)
    vib = 1 + 0.12 * np.sin(2 * np.pi * 0.22 * t)
    return out * vib * env(n, attack, min(0.9, dur * 0.4)) / (len(freqs) * 3)


def pluck(f, dur=2.2, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for h in range(1, 11):
        out += np.sin(2 * np.pi * f * h * t * (1 + 0.0008 * h)) / h ** 1.2 * np.exp(-t * (1.8 + h * 1.3 / bright))
    click = rng.standard_normal(n) * np.exp(-t * 400) * 0.3
    return (out + click) * env(n, 0.002, 0.05) * 0.6


def bass(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return s * np.exp(-t * 3.5) * env(n, 0.004, 0.04)


def taiko(size=1.0):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    fr = 48 + 70 * np.exp(-t * 22 / size)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    body = np.sin(ph) * np.exp(-t * 4.5 / size)
    skin = lowpass(rng.standard_normal(n), 900) * np.exp(-t * 35) * 0.8
    return (body + skin) * 0.9


def boom():
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    fr = 34 + 60 * np.exp(-t * 12)
    sub = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 1.6)
    crash = highpass(rng.standard_normal(n), 3000) * np.exp(-t * 2.5) * 0.25
    return sub * 1.1 + crash + np.pad(taiko(1.6), (0, n - int(1.2 * SR))) * 0.8


def gong(f0=82.0, dur=6.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, dec in ((1, 1, 0.5), (1.52, 0.7, 0.7), (2.03, 0.55, 0.9), (2.71, 0.45, 1.2), (3.38, 0.35, 1.5), (4.1, 0.3, 1.9), (5.3, 0.22, 2.4), (6.6, 0.15, 3)):
        wob = 1 + 0.003 * np.sin(2 * np.pi * (0.7 + ratio * 0.1) * t)
        out += amp * np.sin(2 * np.pi * f0 * ratio * t * wob) * np.exp(-t * dec)
    swell = 1 - np.exp(-t * 18)
    return out * swell * env(n, 0.001, 1.5) * 0.45


def tick(f=1100):
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.7 * t)) * np.exp(-t * 90) * 0.5


def hat():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    return highpass(rng.standard_normal(n), 7000) * np.exp(-t * 60) * 0.35


def clank():
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    out = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((1180, 5), (1830, 7), (2790, 9), (3950, 12)))
    return (out * 0.25 + highpass(rng.standard_normal(n), 2500) * np.exp(-t * 40) * 0.4) * 0.8


def stab(freqs, dur=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = pad(freqs, dur, bright=10, attack=0.01)
    return s * np.exp(-t * 3) * 2.2


def swell_noise(dur):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = rng.standard_normal(n)
    return (lowpass(x, 1200) * t ** 2 * 0.6 + highpass(x, 5000) * t ** 3 * 0.25)


def heartbeat():
    k = taiko(0.6)[: int(0.5 * SR)] * 0.6
    out = np.zeros(int(0.8 * SR))
    out[: len(k)] += k
    out[int(0.22 * SR) : int(0.22 * SR) + len(k)] += k[: len(out) - int(0.22 * SR)] * 0.7
    return lowpass(out, 400)


def bell(f):
    n = int(3 * SR)
    t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 1.2), (2.76, 0.5, 2.5), (5.4, 0.25, 4))) * 0.35


# ---- harmony -------------------------------------------------------------

PROG_MINOR = [["D3", "F3", "A3"], ["Bb2", "D3", "F3"], ["F2", "A2", "C3", "F3"], ["C3", "E3", "G3"]]
PROG_HOPE = [["F2", "A2", "C3", "F3"], ["C3", "E3", "G3"], ["D3", "F3", "A3"], ["Bb2", "D3", "F3"]]
PROG_DARK = [["D3", "F3", "A3"], ["D3", "F3", "A3"], ["Bb2", "D3", "F3"], ["A2", "C#3", "E3"]]
PENTA = ["D4", "F4", "G4", "A4", "C5", "D5", "F5", "G5", "A5"]

SECTION = {
    #          pad prog     pad  pluck  drum   bass  hats  arp
    "intro":   (PROG_DARK,  0.5, 0.3,   0,     0,    0,    0),
    "pulse":   (PROG_DARK,  0.5, 0.0,   0,     0,    0,    0),
    "swell":   (PROG_DARK,  0.8, 0.0,   0,     0,    0,    0),
    "title":   (PROG_MINOR, 1.0, 0.6,   0,     0,    0,    0),
    "ming":    (PROG_MINOR, 0.8, 1.0,   1,     0.5,  0,    0),
    "industry":(PROG_MINOR, 0.8, 0.4,   2,     1.0,  1,    0),
    "war":     (PROG_DARK,  1.0, 0.0,   3,     1.0,  0,    0),
    "after":   (PROG_DARK,  0.6, 0.5,   0,     0,    0,    0),
    "rise":    (PROG_HOPE,  0.7, 0.3,   0,     0,    0,    0),
    "lingao":  (PROG_HOPE,  0.8, 1.0,   1,     0.6,  0,    0),
    "build":   (PROG_HOPE,  0.9, 0.6,   2,     1.0,  1,    1),
    "system":  (PROG_HOPE,  1.0, 0.8,   2,     1.0,  1,    1),
    "dark":    (PROG_DARK,  0.6, 0.0,   4,     0,    0,    0),
    "tension": (PROG_DARK,  0.6, 0.0,   5,     0.8,  0,    0),
    "quote":   (PROG_MINOR, 0.6, 0.5,   5,     0,    0,    0),
    "deng":    (PROG_MINOR, 1.0, 0.4,   1,     0.6,  0,    0),
    "drive":   (PROG_MINOR, 1.0, 0.5,   3,     1.0,  1,    1),
    "peak":    (PROG_MINOR, 1.2, 0.8,   2,     1.0,  1,    1),
    "coda":    (PROG_MINOR, 0.7, 0.8,   0,     0,    0,    0),
    "final":   (PROG_MINOR, 0.9, 0.6,   0,     0,    0,    0),
    "outro":   (PROG_MINOR, 0.6, 0.4,   0,     0,    0,    0),
}

# ---- arrange ------------------------------------------------------------

section_of_beat = []
for b in beats:
    section_of_beat += [b["music"]] * b["b"]

# pads: one chord per bar (4 beats), crossfaded; re-voiced when the section changes
bar = 0
while bar * 4 < TOTAL_BEATS:
    sec = section_of_beat[bar * 4]
    prog, pad_gain, *_ = SECTION[sec]
    chord = [note(n) for n in prog[bar % 4]]
    chord_hi = chord + [c * 2 for c in chord[:2]] if pad_gain >= 1 else chord
    dur = 4 * BEAT + 0.8
    put(pad(chord_hi, dur, bright=4 + 3 * pad_gain), bar * 4 * BEAT, gain=0.22 * pad_gain, pan=0, send=0.6)
    if sec in ("intro", "war", "dark", "tension", "after", "swell", "pulse"):
        put(pad([note("D1"), note("D2"), note("A2")], dur, bright=2.5), bar * 4 * BEAT, gain=0.28, send=0.3)
    bar += 1

melody_idx = 4
for gb in range(TOTAL_BEATS):
    sec = section_of_beat[gb]
    prog, pad_gain, pl, drum, bs, hats, arp = SECTION[sec]
    t = gb * BEAT
    chord = prog[(gb // 4) % 4]
    # plucked melody: pentatonic random walk, denser in brighter sections
    if pl and (gb % 2 == 0 or (pl >= 1 and rng.random() < 0.5)):
        melody_idx = int(np.clip(melody_idx + rng.choice([-2, -1, -1, 1, 1, 2]), 0, len(PENTA) - 1))
        f = note(PENTA[melody_idx])
        put(pluck(f), t, gain=0.22 * pl, pan=rng.uniform(-0.4, 0.4), send=0.5)
        if rng.random() < 0.35 * pl:
            put(pluck(f * 0.75, 1.6), t + BEAT / 2, gain=0.14 * pl, pan=rng.uniform(-0.5, 0.5), send=0.5)
    # arpeggio (16ths) for driving sections
    if arp:
        tones = [note(n) * 2 for n in chord]
        for k in range(4):
            put(pluck(tones[(gb * 4 + k) % len(tones)] * (2 if k % 2 else 1), 0.5, bright=2), t + k * BEAT / 4, gain=0.07, pan=0.5 if k % 2 else -0.5, send=0.35)
    # bass on 8ths
    if bs:
        root = note(chord[0]) / 2
        for k in (0, 0.5):
            put(bass(root, BEAT * 0.5), t + k * BEAT, gain=0.35 * bs, send=0.05)
    if hats:
        for k in range(2):
            put(hat(), t + k * BEAT / 2 + BEAT / 4, gain=0.5, pan=0.3, send=0.1)
    # drum patterns
    if drum == 1 and gb % 2 == 0:
        put(taiko(0.8), t, gain=0.35, send=0.25)
    elif drum == 2:
        put(taiko(1.0), t, gain=0.45 if gb % 2 == 0 else 0.25, send=0.25)
        if gb % 4 == 3:
            put(taiko(0.7), t + BEAT / 2, gain=0.3, pan=0.2, send=0.25)
    elif drum == 3:
        put(taiko(1.2), t, gain=0.55, send=0.3)
        for k in (0.25, 0.5, 0.75):
            put(taiko(0.6), t + k * BEAT, gain=0.18 + 0.1 * (gb % 2), pan=rng.uniform(-0.3, 0.3), send=0.2)
    elif drum == 4 and gb % 4 == 0:
        put(heartbeat(), t, gain=0.7, send=0.2)
    elif drum == 5:
        put(tick(1400 if gb % 2 else 1000), t, gain=0.35, pan=-0.2, send=0.2)
        if gb % 4 == 0:
            put(heartbeat(), t, gain=0.5, send=0.2)

# per-shot hits, with pre-swells into the big ones
for b in beats:
    t = b["g0"] * BEAT
    hit = b.get("hit")
    if hit == "boom":
        sw = swell_noise(1.2)
        put(sw, t - 1.2, gain=0.35, send=0.4)
        put(boom(), t, gain=0.9, send=0.35)
    elif hit == "gong":
        sw = swell_noise(1.8)
        put(sw, t - 1.8, gain=0.3, send=0.5)
        put(gong(), t, gain=0.8, send=0.6)
        put(boom(), t, gain=0.6, send=0.3)
    elif hit == "soft":
        put(taiko(1.4), t, gain=0.4, send=0.4)
        put(bell(note("D5")), t, gain=0.25, pan=0.3, send=0.6)
    elif hit == "tick":
        put(tick(900), t, gain=0.6, send=0.3)
        put(taiko(0.8), t, gain=0.3, send=0.3)
    elif hit == "clank":
        put(clank(), t, gain=0.6, pan=rng.uniform(-0.3, 0.3), send=0.35)
        put(taiko(1.0), t, gain=0.45, send=0.2)
    elif hit == "stab":
        chord = [note(n) for n in ["D3", "A3", "D4", "F4"]]
        put(stab(chord, 0.7), t, gain=0.7, send=0.4)
        put(taiko(1.3), t, gain=0.6, send=0.3)
        put(clank(), t, gain=0.35, send=0.3)

# final sustained chord under the end card
end_t = beats[-1]["g0"] * BEAT
put(pad([note(n) for n in ["D2", "A2", "D3", "F3", "A3", "D4"]], (beats[-1]["b"]) * BEAT + TAIL, bright=5, attack=1.0), end_t, gain=0.3, send=0.7)
put(pluck(note("D4"), 4.0), end_t + 0.3, gain=0.3, send=0.7)
put(pluck(note("A4"), 4.0), end_t + 0.9, gain=0.25, send=0.7)
put(pluck(note("D5"), 5.0), end_t + 1.5, gain=0.25, send=0.7)

# ---- reverb + master ----------------------------------------------------

ir_len = int(2.6 * SR)
tt = np.arange(ir_len) / SR
size = 1 << int(np.ceil(np.log2(N + ir_len)))
wet = np.zeros_like(L)
for ch in range(2):
    ir = lowpass(rng.standard_normal(ir_len), 5000) * np.exp(-tt * 2.6)
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    wet[ch] = np.fft.irfft(np.fft.rfft(R[ch], size) * np.fft.rfft(ir, size), size)[:N]
mix = L + wet * 0.55
mix = highpass(mix[0], 28), highpass(mix[1], 28)
mix = np.array(mix)
# gentle RMS compressor (-22 dB threshold, 3:1) so quiet passages survive small speakers
win = int(0.08 * SR)
power = (mix ** 2).mean(axis=0)
c = np.cumsum(np.concatenate([[0], power]))
rms = np.sqrt(np.maximum((c[win:] - c[:-win]) / win, 1e-12))
rms = np.concatenate([np.full(win // 2, rms[0]), rms, np.full(N - len(rms) - win // 2, rms[-1])])
peak = np.max(np.abs(mix))
thr = peak * 10 ** (-22 / 20)
gain = np.where(rms > thr, (thr / rms) ** (1 - 1 / 3), 1.0)
k = int(0.05 * SR)
gain = np.convolve(gain, np.ones(k) / k, mode="same")
mix = mix * gain
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.4) / np.tanh(1.4)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 10 ** (-1.0 / 20)
fade = int(TAIL * 0.8 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2

tmp = ROOT / "node_modules/.cache/ming/score.wav"
tmp.parent.mkdir(parents=True, exist_ok=True)
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

out = ROOT / "public/ming/score.mp3"
compositor = ROOT / "node_modules/@remotion/compositor-linux-x64-gnu"
ffmpeg = compositor / "ffmpeg"
ffmpeg.chmod(0o755)
subprocess.run(
    [str(ffmpeg), "-loglevel", "error", "-y", "-i", str(tmp), "-c:a", "libmp3lame", "-b:a", "192k", str(out)],
    check=True, env={**os.environ, "LD_LIBRARY_PATH": str(compositor)},
)
print(f"wrote {out}: {N / SR:.1f}s, {TOTAL_BEATS} beats")
