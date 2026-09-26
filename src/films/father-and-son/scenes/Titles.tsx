import React from 'react';
import timeline from '../timeline.json';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { H, W } from '../lib/camera';
import { easeOut, win } from '../lib/math';
import { GlyphText } from '../lib/type';
import { Seal } from '../scenery/Card';
import { Paper } from '../scenery/Paper';
import { Fluff } from '../scenery/Weather';

const PAPER = '#efe3c8';
const INK = '#2a2017';

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, t: frame / fps };
};

/** A soft ink-wash band, like the foot of a hanging scroll. */
const Wash: React.FC<{ y: number; opacity: number }> = ({ y, opacity }) => (
  <g opacity={opacity}>
    <defs>
      <linearGradient id="title-wash" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8c7453" stopOpacity={0} />
        <stop offset="0.6" stopColor="#8c7453" stopOpacity={0.35} />
        <stop offset="1" stopColor="#8c7453" stopOpacity={0.08} />
      </linearGradient>
    </defs>
    <path d={`M0 ${y}C300 ${y - 50} 520 ${y + 10} 760 ${y - 34}S1200 ${y - 70} 1420 ${y - 20}S1780 ${y - 40} 1920 ${y - 10}L1920 1080L0 1080Z`} fill="url(#title-wash)" />
  </g>
);

/** One brushed character, revealed top-to-bottom like a stroke being laid down. */
const BrushChar: React.FC<{ ch: string; x: number; y: number; size: number; p: number; id: string }> = ({ ch, x, y, size, p, id }) => (
  <g>
    <defs>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset={Math.max(0, p - 0.12)} stopColor="#fff" stopOpacity={1} />
        <stop offset={Math.min(1, p + 0.02)} stopColor="#fff" stopOpacity={0} />
      </linearGradient>
      <mask id={id} maskUnits="userSpaceOnUse" x={x - size} y={y - size * 1.1} width={size * 2} height={size * 1.5}>
        <rect x={x - size} y={y - size * 0.95} width={size * 2} height={size * 1.25} fill={`url(#${id}-g)`} />
      </mask>
    </defs>
    <GlyphText text={ch} face="brush" size={size} x={x} y={y} anchor="middle" fill={INK} mask={`url(#${id})`} opacity={Math.min(1, p * 3)} />
  </g>
);

export const TITLE_SEC = timeline.scenes.title;

export const Title: React.FC = () => {
  const { t } = useT();
  const chars = ['父', '与', '子'];
  const size = 200;
  const seal = easeOut(win(t, 4.6, 5.1, (x) => x));
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill={PAPER} />
        <Wash y={900} opacity={win(t, 0, 3)} />
        {chars.map((c, i) => (
          <BrushChar key={c} ch={c} x={720 + i * 240} y={560} size={size} p={win(t, 1 + i * 0.8, 2.1 + i * 0.8)} id={`title-${i}`} />
        ))}
        <GlyphText text="FATHER AND SON" size={46} x={960} y={690} anchor="middle" spacing={14} fill={INK} opacity={win(t, 3.6, 5)} />
        <g transform={`translate(1262 ${372}) scale(${1.3 - 0.3 * seal})`} opacity={seal}>
          <Seal x={0} y={0} size={62} text="念" />
        </g>
        <Paper strength={0.9} />
      </svg>
    </AbsoluteFill>
  );
};

export const CREDITS_SEC = timeline.scenes.credits;

export const Credits: React.FC = () => {
  const { t } = useT();
  const a = win(t, 0.6, 2.4);
  const b = win(t, 2.2, 4);
  const c = win(t, 3.8, 5.6);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill={PAPER} />
        <Wash y={960} opacity={0.6} />
        <g transform={`translate(960 600) scale(${(1 + t * 0.003).toFixed(4)}) translate(-960 -600)`}>
        <g opacity={a}>
          <GlyphText text="父与子" face="brush" size={124} x={960} y={400} anchor="middle" spacing={30} fill={INK} />
          <GlyphText text="FATHER AND SON" size={36} x={960} y={470} anchor="middle" spacing={10} fill={INK} />
        </g>
        <g opacity={b}>
          <GlyphText
            runs={[
              { text: '向 ', face: 'brush', size: 38 },
              { text: 'Michaël Dudok de Wit ', face: 'serif', size: 40 },
              { text: '《', face: 'brush', size: 38 },
              { text: 'Father and Daughter', face: 'serif', size: 40, italic: true },
              { text: '》', face: 'brush', size: 38 },
              { text: ' (2000) ', face: 'serif', size: 40 },
              { text: '致敬', face: 'brush', size: 38 },
            ]}
            x={960}
            y={610}
            anchor="middle"
            fill={INK}
          />
          <GlyphText text="an homage to the Academy Award–winning short, retold as a story of a Chinese father and son" size={30} x={960} y={664} anchor="middle" fill={INK} opacity={0.8} />
        </g>
        <g opacity={c * 0.7}>
          <GlyphText text="drawn and animated entirely in SVG · score synthesised in code" size={26} x={960} y={790} anchor="middle" spacing={3} fill={INK} />
        </g>
        <Seal x={929} y={850} size={62} text="念" opacity={c} />
        </g>
        <Fluff t={t} color="#a89066" amount={0.45} wind={1} seed={9} />
        <Paper strength={0.9} />
      </svg>
    </AbsoluteFill>
  );
};
