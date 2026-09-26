import React from 'react';
import { BRUSH } from '../lib/fonts';
import { f1, win } from '../lib/math';

/** A red square seal (印章) with white characters. */
export const Seal: React.FC<{ x: number; y: number; size: number; text: string; opacity?: number }> = ({ x, y, size, text, opacity = 1 }) => {
  const chars = [...text];
  const cols = chars.length > 2 ? 2 : 1;
  const rows = Math.ceil(chars.length / cols);
  const fs = (size * 0.78) / rows;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)})`} opacity={opacity}>
      <rect x={0} y={0} width={size} height={size} rx={size * 0.08} fill="#a8322a" />
      <rect x={size * 0.06} y={size * 0.06} width={size * 0.88} height={size * 0.88} rx={size * 0.05} fill="none" stroke="#f3dccb" strokeWidth={size * 0.035} />
      {chars.map((c, i) => {
        const col = cols - 1 - Math.floor(i / rows);
        const row = i % rows;
        return (
          <text
            key={i}
            x={size * (cols === 1 ? 0.5 : 0.28 + col * 0.44)}
            y={size * 0.12 + fs * (row + 0.86)}
            fontFamily={BRUSH}
            fontSize={fs}
            fill="#f6e6d6"
            textAnchor="middle"
          >
            {c}
          </text>
        );
      })}
    </g>
  );
};

/**
 * Chapter card: the name of a solar term (节气) brushed vertically in the corner,
 * with a seal beneath — the only words in the film besides the title.
 */
export const Card: React.FC<{ t: number; text: string; color: string; halo?: string; seal?: string; x?: number; y?: number; t0?: number; t1?: number }> = ({
  t,
  text,
  color,
  halo = '#efe3c8',
  seal = '念',
  x = 170,
  y = 110,
  t0 = 0.8,
  t1 = 6,
}) => {
  const a = win(t, t0, t0 + 1.4) * (1 - win(t, t1, t1 + 1.4));
  if (a <= 0.001) return null;
  const size = 76;
  const chars = [...text];
  const hid = `card-halo-${text.charCodeAt(0)}`;
  const h = chars.length * size * 1.05 + 70;
  return (
    <g opacity={a}>
      <defs>
        <radialGradient id={hid}>
          <stop offset="0" stopColor={halo} stopOpacity={0.85} />
          <stop offset="0.6" stopColor={halo} stopOpacity={0.55} />
          <stop offset="1" stopColor={halo} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y + h / 2} rx={size * 1.3} ry={h * 0.72} fill={`url(#${hid})`} />
      {chars.map((c, i) => (
        <text key={i} x={x} y={y + i * size * 1.05 + size * 0.85} fontFamily={BRUSH} fontSize={size} fill={color} textAnchor="middle" opacity={0.88}>
          {c}
        </text>
      ))}
      <Seal x={x - 17} y={y + chars.length * size * 1.05 + 22} size={34} text={seal} opacity={0.9} />
    </g>
  );
};
