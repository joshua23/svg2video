import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

export const W = 1920;
export const H = 1080;

export type Mode = 'paper' | 'dark';

export const C = {
  paper: '#e7dcc3',
  paperDeep: '#cbb892',
  ink: '#1e1914',
  inkSoft: '#5d5040',
  inkFaint: 'rgba(30,25,20,0.28)',
  red: '#b3261e',
  night: '#07090d',
  nightGlow: '#161c28',
  gold: '#e9c778',
  goldSoft: '#b8975a',
  cream: '#f4e9cc',
  ember: '#ff7a3d',
};

export const fg = (mode: Mode) => (mode === 'paper' ? C.ink : C.gold);
export const fgText = (mode: Mode) => (mode === 'paper' ? C.ink : C.cream);
export const accent = (mode: Mode) => (mode === 'paper' ? C.red : C.ember);
export const muted = (mode: Mode) => (mode === 'paper' ? C.inkSoft : C.goldSoft);

export const F = {
  serif: '"MingSerif", "Noto Serif SC", serif',
  brush: '"MingBrush", "Ma Shan Zheng", cursive',
  mono: '"MingMono", "JetBrains Mono", monospace',
};

const fonts: [string, string, string][] = [
  ['MingSerif', 'ming/fonts/serif-400.woff2', '400'],
  ['MingSerif', 'ming/fonts/serif-700.woff2', '700'],
  ['MingSerif', 'ming/fonts/serif-900.woff2', '900'],
  ['MingBrush', 'ming/fonts/brush.woff2', '400'],
  ['MingMono', 'ming/fonts/mono.woff2', '500'],
];

let fontsReady: Promise<void> | null = null;

/** Registers and loads the video's font faces once per page. */
export const loadFonts = () => {
  if (!fontsReady) {
    fontsReady = Promise.all(
      fonts.map(([family, file, weight]) => {
        const face = new FontFace(family, `url(${staticFile(file)}) format("woff2")`, { weight });
        document.fonts.add(face);
        return face.load();
      }),
    ).then(() => undefined);
  }
  return fontsReady;
};

/** Holds the render until the fonts are loaded (delayRender must be created inside a component). */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('ming fonts', { timeoutInMilliseconds: 60000 }));
  useEffect(() => {
    loadFonts()
      .catch((err) => console.error('font load failed', err))
      .finally(() => continueRender(handle));
  }, [handle]);
};
