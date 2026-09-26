import data from './beats.json';
import { Mode } from './theme';

export interface Beat {
  id: string;
  b: number;
  mode: Mode;
  ch: number;
  year: number;
  alt?: boolean;
  music: string;
  hit?: string;
  start: number;
  dur: number;
}

export const FPS = data.fps;
const framesPerBeat = (60 / data.bpm) * FPS;

let cursor = 0;
export const BEATS: Beat[] = data.beats.map((raw) => {
  const dur = Math.round(raw.b * framesPerBeat);
  const beat = { ...raw, mode: raw.mode as Mode, start: cursor, dur };
  cursor += dur;
  return beat;
});

export const TOTAL_FRAMES = cursor;
export const CHAPTERS = data.chapters;

export const beatAt = (frame: number) => {
  let i = BEATS.length - 1;
  while (i > 0 && BEATS[i].start > frame) i--;
  return i;
};

/** China's share of world GDP, per cent (Maddison, The World Economy: Historical Statistics, 2003). */
export const MADDISON: [number, number][] = [
  [1500, 24.9], [1600, 29.2], [1700, 22.3], [1820, 32.9], [1870, 17.2], [1913, 8.9], [1950, 4.5], [1973, 4.6], [2001, 12.3],
];

export const gdpShare = (year: number): { value: number; exact: boolean } | null => {
  if (year < MADDISON[0][0] || year > MADDISON[MADDISON.length - 1][0]) return null;
  for (let i = 0; i < MADDISON.length - 1; i++) {
    const [y0, v0] = MADDISON[i];
    const [y1, v1] = MADDISON[i + 1];
    if (year >= y0 && year <= y1) {
      if (year === y0) return { value: v0, exact: true };
      if (year === y1) return { value: v1, exact: true };
      return { value: v0 + ((v1 - v0) * (year - y0)) / (y1 - y0), exact: false };
    }
  }
  return null;
};
