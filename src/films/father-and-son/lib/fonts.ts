import { continueRender, delayRender } from 'remotion';
import { BRUSH_WOFF2, SERIF_WOFF2 } from '../fonts/font-data';

/** Ma Shan Zheng (brush calligraphy) and Cormorant Garamond, subset to the glyphs the film uses. */
export const BRUSH = 'FSBrush';
export const SERIF = 'FSSerif';

const FACES: [string, string][] = [
  [BRUSH, BRUSH_WOFF2],
  [SERIF, SERIF_WOFF2],
];

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

let loaded: Promise<void> | null = null;

/**
 * Registers the fonts from memory — no network request, so a render tab can never stall
 * waiting on one. Called once at module level; blocks rendering until the faces are parsed.
 */
export const ensureFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  const handle = delayRender('Loading film fonts', { timeoutInMilliseconds: 60000 });
  loaded = Promise.all(
    FACES.map(async ([family, data]) => {
      const face = new FontFace(family, decode(data));
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error('Font loading failed', err);
      continueRender(handle);
    });
};
