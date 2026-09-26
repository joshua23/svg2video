import React from 'react';
import { interpolateColors } from 'remotion';
import { prog } from './kit';
import { C, F, W } from './theme';
import { BEATS, beatAt, CHAPTERS, gdpShare } from './timeline';

const Y0 = 1368;
const Y1 = 2026;
const TICKS = [1368, 1644, 1840, 1949, 2026];

/** Displayed year: glides from the previous beat's year to this beat's. */
const yearAt = (frame: number) => {
  const i = beatAt(frame);
  const beat = BEATS[i];
  const prev = BEATS[Math.max(0, i - 1)];
  const len = beat.id === 'rewind' ? beat.dur * 0.75 : 18;
  const p = prog(frame, beat.start, len, beat.id === 'rewind' ? 'inout' : 'out');
  return { year: Math.round(prev.year + (beat.year - prev.year) * p), beat };
};

export const Hud: React.FC<{ frame: number; dark: number }> = ({ frame, dark }) => {
  const { year, beat } = yearAt(frame);
  const ch = CHAPTERS[beat.ch];
  const col = interpolateColors(dark, [0, 1], [C.inkSoft, C.goldSoft]);
  const strong = interpolateColors(dark, [0, 1], [C.ink, C.gold]);
  const acc = interpolateColors(dark, [0, 1], [C.red, C.gold]);
  const share = gdpShare(year);
  const label: React.CSSProperties = { fontFamily: F.serif, fontWeight: 700, fontSize: 15, letterSpacing: '0.45em', color: col };
  const mono: React.CSSProperties = { fontFamily: F.mono, fontWeight: 500, fontSize: 30, color: strong, letterSpacing: '0.04em' };
  const x0 = 660;
  const x1 = W - 660;
  const xOf = (y: number) => x0 + ((Math.min(Y1, Math.max(Y0, y)) - Y0) / (Y1 - Y0)) * (x1 - x0);

  const bracket = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M${x} ${y + sy * 22} L${x} ${y} L${x + sx * 22} ${y}`} stroke={col} strokeWidth={1.5} fill="none" opacity={0.8} />
  );

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {bracket(34, 30, 1, 1)}
        {bracket(1886, 30, -1, 1)}
        {bracket(34, 1050, 1, -1)}
        {bracket(1886, 1050, -1, -1)}
        {/* timeline ruler */}
        <line x1={x0} y1={1016} x2={x1} y2={1016} stroke={col} strokeWidth={1} opacity={0.6} />
        {Array.from({ length: 34 }, (_, i) => {
          const x = x0 + (i / 33) * (x1 - x0);
          return <line key={i} x1={x} y1={1012} x2={x} y2={1016} stroke={col} strokeWidth={1} opacity={0.5} />;
        })}
        <line x1={x0} y1={1016} x2={xOf(year)} y2={1016} stroke={acc} strokeWidth={3} />
        <path d={`M${xOf(year) - 7} 1000 L${xOf(year) + 7} 1000 L${xOf(year)} 1010 Z`} fill={acc} />
      </svg>
      {TICKS.map((t) => (
        <div key={t} style={{ position: 'absolute', left: xOf(t) - 30, width: 60, top: 1024, textAlign: 'center', fontFamily: F.mono, fontSize: 12, color: col, opacity: 0.85 }}>
          {t}
        </div>
      ))}

      <div style={{ position: 'absolute', left: 58, top: 46, ...label }}>
        {ch.n} · {ch.name}
      </div>
      <div style={{ position: 'absolute', right: 58, top: 46, ...label, textAlign: 'right' }}>
        临高启明 · 另类历史
        <div style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: '0.2em', marginTop: 8, opacity: 0.8 }}>1368 — 1644 · 明</div>
      </div>

      <div style={{ position: 'absolute', left: 58, top: 968 }}>
        <div style={label}>公元</div>
        <div style={{ ...mono, marginTop: 6, display: 'flex', alignItems: 'center', gap: 14 }}>
          {year}
          {beat.alt && (
            <span style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 15, letterSpacing: '0.3em', color: C.cream, background: acc, padding: '3px 6px 3px 10px' }}>
              架空
            </span>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', right: 58, top: 968, textAlign: 'right' }}>
        <div style={label}>中国占世界经济 · 麦迪森估算</div>
        <div style={{ ...mono, marginTop: 6 }}>
          {beat.alt ? '？' : share ? `${share.exact ? '' : '≈'}${share.value.toFixed(1)}%` : '—'}
        </div>
      </div>
    </div>
  );
};
