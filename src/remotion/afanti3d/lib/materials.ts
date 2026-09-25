// 移植自 joshua23/barracuda-retro-anime（src/remake/lib/materials.ts）：Barracuda-M 复刻项目的 3D 卡通渲染管线。
/**
 * Cel-shading materials. Built on MeshToonMaterial so three's shadow maps,
 * fog and lights keep working; the look comes from a hard-stepped gradient
 * map (2–3 tones) shared across all materials, like an anime toon render.
 *
 * Materials are memoised by their options so shots can call `toon(...)`
 * inline in JSX every frame without allocating.
 */
import * as THREE from "three";

const cache = new Map<string, THREE.Material>();
function memo<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

const gradCache = new Map<string, THREE.DataTexture>();
/** Stepped light ramp, e.g. [0.45, 1] = 2 tones, [0.3, 0.7, 1] = 3 tones. */
export function gradient(steps: readonly number[]): THREE.DataTexture {
  const key = steps.join(",");
  let t = gradCache.get(key);
  if (!t) {
    const data = new Uint8Array(steps.length * 4);
    steps.forEach((s, i) => {
      const v = Math.round(s * 255);
      data.set([v, v, v, 255], i * 4);
    });
    t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    gradCache.set(key, t);
  }
  return t;
}

export interface ToonOpts {
  steps?: readonly number[];
  emissive?: string;
  emissiveIntensity?: number;
  map?: THREE.Texture | null;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  /** Unique suffix when a map-bearing material must not be shared. */
  id?: string;
}

export function toon(color: string, o: ToonOpts = {}): THREE.MeshToonMaterial {
  const key = `toon|${color}|${(o.steps ?? [0.55, 1]).join(",")}|${o.emissive ?? ""}|${o.emissiveIntensity ?? 1}|${o.map?.uuid ?? ""}|${o.transparent ?? false}|${o.opacity ?? 1}|${o.side ?? 0}|${o.id ?? ""}`;
  return memo(key, () =>
    new THREE.MeshToonMaterial({
      color: new THREE.Color(color),
      gradientMap: gradient(o.steps ?? [0.55, 1]),
      emissive: new THREE.Color(o.emissive ?? "#000000"),
      emissiveIntensity: o.emissiveIntensity ?? 1,
      map: o.map ?? null,
      transparent: o.transparent ?? false,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
    }),
  );
}

/** Unlit colour — screens, LEDs, painted backdrops, glowing UI. */
export function flat(color: string, o: { map?: THREE.Texture | null; transparent?: boolean; opacity?: number; side?: THREE.Side; blending?: THREE.Blending; depthWrite?: boolean; id?: string } = {}): THREE.MeshBasicMaterial {
  const key = `flat|${color}|${o.map?.uuid ?? ""}|${o.transparent ?? false}|${o.opacity ?? 1}|${o.side ?? 0}|${o.blending ?? 1}|${o.depthWrite ?? true}|${o.id ?? ""}`;
  return memo(key, () =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      map: o.map ?? null,
      transparent: o.transparent ?? false,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
      blending: o.blending ?? THREE.NormalBlending,
      depthWrite: o.depthWrite ?? true,
      toneMapped: false,
    }),
  );
}
