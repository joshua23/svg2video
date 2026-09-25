// 移植自 joshua23/barracuda-retro-anime（src/remake/lib/canvasTex.ts）：Barracuda-M 复刻项目的 3D 卡通渲染管线。
/**
 * Canvas2D → THREE.CanvasTexture, for UI graphics, lettering and decals
 * that live on planes inside 3D shots (so they get real perspective, the
 * same post chain, and camera moves for free).
 *
 * `draw` must be deterministic for a given `key`; the texture is redrawn
 * only when `key` changes (use a stepped time in the key for animated UI).
 */
import { useMemo } from "react";
import * as THREE from "three";

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const texCache = new Map<string, THREE.CanvasTexture>();

export function canvasTexture(key: string, w: number, h: number, draw: Draw): THREE.CanvasTexture {
  let tex = texCache.get(key);
  if (tex) return tex;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  texCache.set(key, tex);
  // Keep the cache bounded for animated (per-step) textures.
  if (texCache.size > 400) {
    const first = texCache.keys().next().value as string;
    texCache.get(first)?.dispose();
    texCache.delete(first);
  }
  return tex;
}

/**
 * One persistent canvas + texture per `id`, redrawn in place whenever `key`
 * changes. Use this for anything animated per frame (full-frame 2D cards,
 * UI screens) — canvasTexture() would allocate a new texture per key.
 */
const dynCache = new Map<string, { tex: THREE.CanvasTexture; ctx: CanvasRenderingContext2D; key: string }>();
export function dynamicCanvasTexture(id: string, w: number, h: number, key: string, draw: Draw): THREE.CanvasTexture {
  let e = dynCache.get(id);
  if (!e || e.tex.image.width !== w || e.tex.image.height !== h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    e = { tex, ctx: c.getContext("2d")!, key: "\u0000" };
    dynCache.set(id, e);
  }
  if (e.key !== key) {
    e.ctx.save();
    e.ctx.setTransform(1, 0, 0, 1, 0, 0);
    e.ctx.globalAlpha = 1;
    e.ctx.globalCompositeOperation = "source-over";
    e.ctx.filter = "none";
    e.ctx.clearRect(0, 0, w, h);
    e.ctx.restore();
    draw(e.ctx, w, h);
    e.key = key;
    e.tex.needsUpdate = true;
  }
  return e.tex;
}

export function useCanvasTexture(key: string, w: number, h: number, draw: Draw): THREE.CanvasTexture {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => canvasTexture(key, w, h, draw), [key, w, h]);
}

/**
 * Draw `text` so its ink bounding box fills `box` = [x0, y0, x1, y1]
 * (measured on the reference frame). Font size is solved from the box
 * width; `fitHeight` additionally stretches vertically to the box height.
 * `font(size)` returns a CSS font string, e.g. s => `500 ${s}px "Helvetica Neue"`.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  box: readonly [number, number, number, number],
  o: { fitHeight?: boolean; letterSpacing?: number } = {},
) {
  const [x0, y0, x1, y1] = box;
  const ls = o.letterSpacing ?? 0;
  const measure = (size: number) => {
    ctx.font = font(size);
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${ls * size}px`;
    const m = ctx.measureText(text);
    return { w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m };
  };
  const ref = 100;
  const { w } = measure(ref);
  const size = (ref * (x1 - x0)) / Math.max(1, w);
  const { m } = measure(size);
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const sy = o.fitHeight ? (y1 - y0) / Math.max(1, inkH) : 1;
  ctx.save();
  ctx.translate(x0 + m.actualBoundingBoxLeft, y0 + m.actualBoundingBoxAscent * sy);
  ctx.scale(1, sy);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, 0, 0);
  ctx.restore();
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  return size;
}

/** Letter-spaced text helper (canvas letterSpacing is not universally supported). */
export function spacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right" = "left",
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}
