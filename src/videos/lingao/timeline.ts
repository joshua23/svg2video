import data from './beats.json';
import { Mode } from '../ming/theme';

export interface Beat {
  id: string;
  b: number;
  mode: Mode;
  ch: number;
  /** Volume 1–8 for story shots (0 = before the story). */
  vol?: number;
  /** Real-world year for the shots about the book itself. */
  year?: number;
  when: string;
  land: string;
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
