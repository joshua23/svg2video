import React, { createContext, useContext } from 'react';
import { Easing, interpolate } from 'remotion';
import { accent, C, F, fg, fgText, Mode, muted } from './theme';

export interface BeatInfo {
  f: number;
  dur: number;
  mode: Mode;
  fps: number;
}

export const BeatContext = createContext<BeatInfo>({ f: 0, dur: 1, mode: 'paper', fps: 30 });
export const useBeat = () => useContext(BeatContext);

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Progress 0..1 of a window [start, start+len) in frames, eased. */
export const prog = (f: number, start: number, len: number, kind: 'out' | 'inout' | 'linear' = 'out') => {
  const p = clamp01((f - start) / Math.max(1, len));
  return kind === 'linear' ? p : kind === 'out' ? easeOut(p) : easeInOut(p);
};

/** Staggered progress for item i of n inside a parent progress p. */
export const stag = (p: number, i: number, n: number, spread = 0.6) => {
  const start = n <= 1 ? 0 : (i / (n - 1)) * spread;
  return clamp01((p - start) / (1 - spread));
};

/** Props that stroke-draw any SVG shape (via normalised pathLength). */
export const dash = (p: number) => ({
  pathLength: 1,
  strokeDasharray: '1 1',
  strokeDashoffset: 1 - clamp01(p),
  opacity: p <= 0.001 ? 0 : 1,
});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Seg = string | { t: string; a?: boolean; brush?: boolean; dim?: boolean; strike?: boolean };
type Line = Seg[];

interface HeadlineProps {
  lines: (Line | string)[];
  x?: number;
  y?: number;
  size?: number;
  at?: number;
  stagger?: number;
  align?: 'left' | 'center' | 'right';
  width?: number;
  weight?: number;
  lineHeight?: number;
  color?: string;
}

/** Big kinetic headline: each segment rises out of a blur, accents glow. */
export const Headline: React.FC<HeadlineProps> = ({
  lines, x = 150, y = 300, size = 120, at = 4, stagger = 7, align = 'left', width = 1620, weight = 900,
  lineHeight = 1.18, color,
}) => {
  const { f, mode } = useBeat();
  let k = 0;
  const glow = mode === 'dark';
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width, textAlign: align, fontFamily: F.serif,
        fontWeight: weight, fontSize: size, lineHeight, color: color ?? fgText(mode), letterSpacing: '0.04em',
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap' }}>
          {(typeof line === 'string' ? [line] : line).map((seg, si) => {
            const s = typeof seg === 'string' ? { t: seg } : seg;
            const p = prog(f, at + k++ * stagger, 16);
            const col = s.a ? accent(mode) : s.dim ? muted(mode) : undefined;
            const shadow = glow
              ? s.a
                ? '0 0 22px rgba(255,122,61,0.75), 0 0 60px rgba(255,90,40,0.35)'
                : '0 0 20px rgba(233,199,120,0.45), 0 0 50px rgba(233,199,120,0.18)'
              : 'none';
            const strikeP = s.strike ? prog(f, at + k * stagger + 14, 12) : 0;
            return (
              <span
                key={si}
                style={{
                  display: 'inline-block', position: 'relative', color: col, textShadow: shadow,
                  fontFamily: s.brush ? F.brush : undefined, fontWeight: s.brush ? 400 : undefined,
                  opacity: p, transform: `translateY(${(1 - p) * 0.35 * size}px) scale(${s.a ? lerp(1.12, 1, p) : 1})`,
                  filter: `blur(${(1 - p) * 10}px)`, transformOrigin: 'left bottom',
                }}
              >
                {s.t}
                {s.strike && (
                  <span
                    style={{
                      position: 'absolute', left: -8, top: '54%', height: size * 0.07, width: `calc(${strikeP * 100}% + 16px)`,
                      background: accent(mode), transform: 'rotate(-3deg)', borderRadius: 4,
                    }}
                  />
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Small letter-spaced caption in the style of museum labels. */
export const Caption: React.FC<{ text: string; x?: number; y?: number; at?: number; align?: 'left' | 'center' | 'right'; width?: number; size?: number; color?: string }> = ({
  text, x = 150, y = 560, at = 20, align = 'left', width = 1200, size = 22, color,
}) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 18);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width, textAlign: align, fontFamily: F.serif, fontWeight: 700,
        fontSize: size, letterSpacing: '0.42em', color: color ?? muted(mode), opacity: p,
        transform: `translateX(${(1 - p) * -16}px)`,
      }}
    >
      {text}
    </div>
  );
};

/** Medium body copy, revealed line by line. */
export const Body: React.FC<{ lines: string[]; x?: number; y?: number; at?: number; size?: number; width?: number; align?: 'left' | 'center' | 'right'; italic?: boolean }> = ({
  lines, x = 150, y = 620, at = 24, size = 38, width = 1100, align = 'left',
}) => {
  const { f, mode } = useBeat();
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, textAlign: align, fontFamily: F.serif, fontWeight: 400, fontSize: size, lineHeight: 1.6, color: fgText(mode) }}>
      {lines.map((l, i) => {
        const p = prog(f, at + i * 10, 18);
        return (
          <div key={i} style={{ opacity: p * 0.92, transform: `translateY(${(1 - p) * 14}px)` }}>
            {l}
          </div>
        );
      })}
    </div>
  );
};

/** Big numeric / mono figure. */
export const Figure: React.FC<{ text: string; x: number; y: number; size?: number; at?: number; color?: string; align?: 'left' | 'center' | 'right'; width?: number }> = ({
  text, x, y, size = 160, at = 0, color, align = 'left', width = 900,
}) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 14);
  const glow = mode === 'dark' ? '0 0 26px rgba(233,199,120,0.55)' : 'none';
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width, textAlign: align, fontFamily: F.mono, fontWeight: 500, fontSize: size,
        color: color ?? fg(mode), opacity: p, textShadow: glow, letterSpacing: '0.02em', lineHeight: 1,
      }}
    >
      {text}
    </div>
  );
};

/** SVG stage for line art with a slow push-in; glows in dark mode. */
export const Art: React.FC<{ x?: number; y?: number; w?: number; h?: number; vb?: string; children: React.ReactNode; zoom?: number; glow?: boolean }> = ({
  x = 0, y = 0, w = 1920, h = 1080, vb, children, zoom = 0.04, glow = true,
}) => {
  const { f, dur, mode } = useBeat();
  const s = 1 + zoom * (f / Math.max(1, dur));
  const filter = mode === 'dark' && glow
    ? 'drop-shadow(0 0 3px rgba(233,199,120,0.9)) drop-shadow(0 0 14px rgba(233,199,120,0.35))'
    : undefined;
  return (
    <svg
      width={w}
      height={h}
      viewBox={vb ?? `0 0 ${w} ${h}`}
      style={{ position: 'absolute', left: x, top: y, overflow: 'visible', transform: `scale(${s})`, filter, color: fg(mode) }}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
};

export const hatch = (mode: Mode) => `url(#hatch-${mode})`;
export const hatchDense = (mode: Mode) => `url(#hatchx-${mode})`;

/** Pattern defs shared by every Art stage (ids are document-global). */
export const GlobalDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      {(['paper', 'dark'] as Mode[]).map((m) => (
        <React.Fragment key={m}>
          <pattern id={`hatch-${m}`} width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <line x1={0} y1={0} x2={0} y2={9} stroke={m === 'paper' ? C.ink : C.gold} strokeWidth={1.1} opacity={0.55} />
          </pattern>
          <pattern id={`hatchx-${m}`} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <line x1={0} y1={0} x2={0} y2={7} stroke={m === 'paper' ? C.ink : C.gold} strokeWidth={1.2} opacity={0.7} />
            <line x1={0} y1={3.5} x2={7} y2={3.5} stroke={m === 'paper' ? C.ink : C.gold} strokeWidth={1} opacity={0.45} />
          </pattern>
        </React.Fragment>
      ))}
    </defs>
  </svg>
);

/** Seeded PRNG so every render of a frame is identical. */
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const fadeIn = (f: number, at: number, len = 12) => interpolate(f, [at, at + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
