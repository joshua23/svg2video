import React from 'react';
import { interpolateColors } from 'remotion';
import { prog } from '../ming/kit';
import { C, F } from '../ming/theme';
import { BEATS, beatAt, CHAPTERS } from './timeline';

const VOLUMES = ['启航', '新世界', '新社会', '新澳洲', '进入', '纷争', '大陆', '深耕'];
const YEARS = [2006, 2009, 2015, 2019, 2026];
const X0 = 620;
const X1 = 1300;

/** Ruler position 0..1: volumes for the story, years for the book's own history. */
const posOf = (i: number) => {
  const b = BEATS[i];
  if (b.year) return (b.year - 2006) / 20;
  return Math.max(0, ((b.vol ?? 0) - 0.5) / 8);
};

export const Hud: React.FC<{ frame: number; dark: number }> = ({ frame, dark }) => {
  const i = beatAt(frame);
  const beat = BEATS[i];
  const p = prog(frame, beat.start, 18);
  const pos = posOf(Math.max(0, i - 1)) + (posOf(i) - posOf(Math.max(0, i - 1))) * p;
  const real = beat.year !== undefined;
  const ch = CHAPTERS[beat.ch];
  const col = interpolateColors(dark, [0, 1], [C.inkSoft, C.goldSoft]);
  const strong = interpolateColors(dark, [0, 1], [C.ink, C.gold]);
  const acc = interpolateColors(dark, [0, 1], [C.red, C.gold]);
  const label: React.CSSProperties = { fontFamily: F.serif, fontWeight: 700, fontSize: 15, letterSpacing: '0.45em', color: col };
  const value: React.CSSProperties = { fontFamily: F.serif, fontWeight: 900, fontSize: 26, color: strong, letterSpacing: '0.08em', marginTop: 6 };
  const x = X0 + pos * (X1 - X0);
  const ticks = real
    ? YEARS.map((y) => ({ t: String(y), x: X0 + ((y - 2006) / 20) * (X1 - X0) }))
    : VOLUMES.map((v, k) => ({ t: v, x: X0 + ((k + 0.5) / 8) * (X1 - X0) }));
  const bracket = (bx: number, by: number, sx: number, sy: number) => (
    <path d={`M${bx} ${by + sy * 22} L${bx} ${by} L${bx + sx * 22} ${by}`} stroke={col} strokeWidth={1.5} fill="none" opacity={0.8} />
  );
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {bracket(34, 30, 1, 1)}
        {bracket(1886, 30, -1, 1)}
        {bracket(34, 1050, 1, -1)}
        {bracket(1886, 1050, -1, -1)}
        <line x1={X0} y1={1016} x2={X1} y2={1016} stroke={col} strokeWidth={1} opacity={0.6} />
        {ticks.map((t) => <line key={t.t} x1={t.x} y1={1010} x2={t.x} y2={1016} stroke={col} strokeWidth={1} />)}
        <line x1={X0} y1={1016} x2={x} y2={1016} stroke={acc} strokeWidth={3} />
        <path d={`M${x - 7} 1000 L${x + 7} 1000 L${x} 1010 Z`} fill={acc} />
      </svg>
      {ticks.map((t) => (
        <div key={t.t} style={{ position: 'absolute', left: t.x - 40, width: 80, top: 1024, textAlign: 'center', fontFamily: real ? F.mono : F.serif, fontWeight: 700, fontSize: 12, color: col, opacity: 0.85 }}>
          {t.t}
        </div>
      ))}
      <div style={{ position: 'absolute', left: 58, top: 46, ...label }}>{ch.n} · {ch.name}</div>
      <div style={{ position: 'absolute', right: 58, top: 46, ...label, textAlign: 'right' }}>
        临高启明 · 全书导读
        <div style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: '0.2em', marginTop: 8, opacity: 0.8 }}>吹牛者 · 2009 —</div>
      </div>
      <div style={{ position: 'absolute', left: 58, top: 966 }}>
        <div style={label}>{real ? '现实' : '故事纪年'}</div>
        <div style={value}>{beat.when}</div>
      </div>
      <div style={{ position: 'absolute', right: 58, top: 966, textAlign: 'right' }}>
        <div style={label}>{real ? '所在' : '澳宋版图'}</div>
        <div style={value}>{beat.land}</div>
      </div>
    </div>
  );
};
