import React from 'react';
import { BRUSH_GLYPHS, SERIF_GLYPHS } from '../fonts/glyphs';
import { f1 } from './math';

/**
 * Type set as SVG outlines (baked by scripts/father-and-son-glyphs.py), so rendering never
 * depends on a web font having loaded. Brush = Ma Shan Zheng, serif = Cormorant Garamond.
 */
export type Face = 'brush' | 'serif';

export interface Run {
  text: string;
  face: Face;
  size: number;
  italic?: boolean;
}

const TABLES: Record<Face, Record<string, [string, number]>> = { brush: BRUSH_GLYPHS, serif: SERIF_GLYPHS };

const advance = (ch: string, r: Run) => ((TABLES[r.face][ch]?.[1] ?? 500) * r.size) / 1000;

export const measure = (runs: Run[], spacing = 0) => {
  let w = 0;
  let n = 0;
  for (const r of runs) for (const ch of r.text) {
    w += advance(ch, r);
    n++;
  }
  return w + Math.max(0, n - 1) * spacing;
};

export const GlyphText: React.FC<{
  runs?: Run[];
  text?: string;
  face?: Face;
  size?: number;
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
  spacing?: number;
  fill: string;
  opacity?: number;
  mask?: string;
}> = ({ runs, text = '', face = 'serif', size = 32, x, y, anchor = 'start', spacing = 0, fill, opacity, mask }) => {
  const rs = runs ?? [{ text, face, size }];
  const width = measure(rs, spacing);
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const paths: React.ReactNode[] = [];
  rs.forEach((r, ri) => {
    [...r.text].forEach((ch, ci) => {
      const g = TABLES[r.face][ch];
      if (g && g[0]) {
        paths.push(
          <path key={`${ri}-${ci}`} d={g[0]} transform={`translate(${f1(cx)} ${f1(y)}) scale(${(r.size / 1000).toFixed(4)})${r.italic ? ' skewX(-11)' : ''}`} />,
        );
      }
      cx += advance(ch, r) + spacing;
    });
  });
  return (
    <g fill={fill} opacity={opacity} mask={mask}>
      {paths}
    </g>
  );
};
