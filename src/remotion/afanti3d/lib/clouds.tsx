// 移植自 joshua23/barracuda-retro-anime（src/remake/lib/s23-clouds.tsx）：手绘感动漫积云着色器。
// 改动：云团纹理改为常驻并每帧原地更新，以便由 3D 相机实时投影云团。
/**
 * Painted anime cumulus + sky backdrop, shared by s23–s26.
 *
 * One full-screen GLSL pass (drawn first, on the no-outline layer) paints a
 * vertical sky gradient and up to 4 cloud layers. A cloud layer is a list of
 * measured lobes (circles) in "layer px" (= screen px of the reference frame
 * the layer was measured on). Each pixel finds the front-most lobe sphere
 * (2.5D: lower lobes sit in front), adds two octaves of procedural
 * cauliflower puffs (Worley circles) to the silhouette and the normal, and
 * is lit from above with a soft painterly ramp: white tops, lavender-blue
 * undersides, blue-gray crevices. Per-lobe `tone` (measured mean luminance)
 * steers the big shading masses.
 *
 * Camera moves are applied per layer as a 2D affine (screen px → layer px),
 * measured from the reference by ECC registration (see the shots).
 */
import React, { useMemo } from "react";
import * as THREE from "three";
import { NoOutline } from "./Scene3D";

export type Blob = readonly [number, number, number, number?]; // x, y, r, tone

export interface CloudLook {
  /** Edge softness in layer px (defocus). */
  soft?: number;
  /** Puff amplitude (0..1.5), cell sizes in layer px. */
  puff?: number;
  cells?: readonly [number, number];
  /** Smooth-union radius between lobes, layer px. */
  blend?: number;
  /** Mix toward the sky colour behind (aerial perspective). */
  haze?: number;
  opacity?: number;
  /** Shading contrast (0 = flat tone, 1 = full sphere lighting). */
  contrast?: number;
  /** Brightness offset of the tone ramp. */
  bright?: number;
  /** Rim (silver lining) strength. */
  rim?: number;
  seed?: number;
  /** Depth ordering: z = zY * y + zR * r (+ lobe height). */
  zY?: number;
  /** Edge rounding radius of the pillow normal (layer px). */
  pillow?: number;
  /** Weight of the per-lobe sphere normals (creases between lobes). */
  lobes?: number;
  /** Ramp level below which a painted shadow blotch starts, and its depth. */
  blotch?: number;
  blotchDepth?: number;
  /** Over other clouds (not sky): edge softness, edge offset (+ shrinks), contrast cut 0..1. */
  innerSoft?: number;
  innerGrow?: number;
  innerFlat?: number;
  /** Width (layer px) of the light sky halo around this layer's silhouette. */
  halo?: number;
  /** Smooth metaball shading instead of the silhouette pillow (0..1) and its height scale. */
  meta?: number;
  metaScale?: number;
}

export interface CloudLayer {
  blobs: readonly Blob[];
  look?: CloudLook;
  /** 2x3 affine screen px → layer px: [a, b, c, d, e, f] (x' = a x + b y + c, y' = d x + e y + f). */
  xf?: readonly number[];
}

export interface SkySpec {
  /** Gradient stops over screen y (0 = top, 1 = bottom): [y, "#hex"] */
  stops: ReadonlyArray<readonly [number, string]>;
  /** Horizontal tint: colour added toward screen x=1 (e.g. lighter right). */
  xTint?: readonly [string, number];
}

export interface Palette {
  lit: string;
  mid: string;
  shade: string;
  deep: string;
}

/** Measured on the reference clouds (mean colour per luminance band, 54–62s). */
export const DEFAULT_PALETTE: Palette = {
  lit: "#f5fafd",
  mid: "#d7e6fa",
  shade: "#acccef",
  deep: "#7dacdc",
};

const MAXL = 4;
const MAXSTOPS = 6;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uBlobs;
  uniform int uStart[${MAXL}];
  uniform int uCount[${MAXL}];
  uniform int uLayers;
  uniform vec3 uXa[${MAXL}];
  uniform vec3 uXb[${MAXL}];
  uniform vec4 uLookA[${MAXL}]; // soft, puff, haze, opacity
  uniform vec4 uLookB[${MAXL}]; // cell0, cell1, blend, contrast
  uniform vec4 uLookC[${MAXL}]; // bright, rim, seed, zY
  uniform vec4 uLookD[${MAXL}]; // pillow R, lobe normal weight, blotch threshold, blotch depth
  uniform vec4 uLookF[${MAXL}]; // metaball height scale, metaball mix
  uniform vec4 uLookE[${MAXL}]; // inner soft (over clouds), inner edge offset, inner contrast cut
  uniform vec3 uLit, uMid, uShade, uDeep;
  uniform vec3 uStopC[${MAXSTOPS}];
  uniform float uStopY[${MAXSTOPS}];
  uniform int uNStops;
  uniform vec4 uXTint;
  uniform vec3 uLight;
  uniform vec4 uHalo;
  uniform vec3 uClip; // x0, x1 (screen px), soft width; x1<x0 = off
  uniform vec2 uRes;
  varying vec2 vUv;

  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
  float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

  vec3 skyAt(vec2 uv) {
    float y = 1.0 - uv.y;
    vec3 c = uStopC[0];
    for (int i = 1; i < ${MAXSTOPS}; i++) {
      if (i >= uNStops) break;
      float t = clamp((y - uStopY[i - 1]) / max(1e-4, uStopY[i] - uStopY[i - 1]), 0.0, 1.0);
      c = mix(c, uStopC[i], smoothstep(0.0, 1.0, t));
    }
    c = mix(c, uXTint.rgb, uXTint.a * uv.x);
    return c;
  }

  // Worley puffs, smooth-max blended: returns (bump, normal.xyz)
  vec4 puffs(vec2 p, float s, float seed) {
    vec2 g = p / s; vec2 ic = floor(g);
    float ws = 0.0; float vs = 0.0; vec3 ns = vec3(0.0); const float K = 9.0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 c = ic + vec2(float(i), float(j));
      vec2 h = hash22(c + seed);
      vec2 q = (c + 0.5 + (h - 0.5) * 0.75) * s;
      float rp = s * (0.52 + 0.3 * hash12(c * 1.7 + seed));
      vec2 d = p - q; float dist = length(d);
      float v = 1.0 - dist / rp;
      float w = exp(K * v);
      ws += w; vs += w * v;
      ns += w * vec3(d.x / rp, -d.y / rp, sqrt(max(0.0, 1.0 - dist * dist / (rp * rp))));
    }
    return vec4(log(ws) / K, ns / ws);
  }

  float gHalo = 0.0;
  vec3 ramp(float v) {
    v = clamp(v, 0.0, 1.0);
    if (v < 0.33) return mix(uDeep, uShade, v / 0.33);
    if (v < 0.66) return mix(uShade, uMid, (v - 0.33) / 0.33);
    return mix(uMid, uLit, (v - 0.66) / 0.34);
  }

  vec4 layer(int L, vec2 sp, vec3 sky, float under) {
    vec2 p = vec2(dot(uXa[L], vec3(sp, 1.0)), dot(uXb[L], vec3(sp, 1.0)));
    vec4 A = uLookA[L]; vec4 B = uLookB[L]; vec4 C = uLookC[L];
    float soft = A.x, puffAmp = A.y, haze = A.z, opac = A.w;
    float blend = B.z, contrast = B.w;
    float sdf = 1e6; float bestH = -1e9; vec3 n = vec3(0.0, 0.0, 1.0);
    float tw = 0.0, ts = 0.0; float nearR = 60.0; float meta = 0.0;
    int s0 = uStart[L]; int cnt = uCount[L];
    for (int i = 0; i < 512; i++) {
      if (i >= cnt) break;
      vec4 b = texelFetch(uBlobs, ivec2(s0 + i, 0), 0);
      vec2 d = p - b.xy; float dd = dot(d, d); float r = b.z;
      float dist = sqrt(dd) - r;
      sdf = smin(sdf, dist, blend);
      float w = exp(-dd / (r * r * 0.6));
      tw += w; ts += w * b.w;
      meta += exp(-dd / (r * r * 0.5)) * r;
      if (dd < r * r) {
        float hz = sqrt(r * r - dd);
        float h = C.w * b.y + 0.35 * r + hz;
        if (h > bestH) { bestH = h; n = vec3(d.x / r, -d.y / r, hz / r); nearR = r; }
      }
    }
    float tone = tw > 1e-4 ? ts / tw : 0.9;
    // cauliflower puffs (two octaves) on the silhouette
    vec4 P0 = puffs(p, B.x, C.z);
    vec4 P1 = puffs(p + 17.3, B.y, C.z + 7.1);
    float wob = (fbm(p / (B.x * 1.3) + C.z) - 0.5);
    float sdf2 = sdf - puffAmp * (B.x * 0.42 * P0.x + B.y * 0.4 * P1.x) + wob * B.x * 0.35 * puffAmp;
    gHalo = max(gHalo, exp(-max(sdf2, 0.0) / max(1.0, uLookE[L].w)) * (1.0 - under));
    float sIn = mix(soft, uLookE[L].x, under);
    float alpha = 1.0 - smoothstep(-sIn, sIn, sdf2 + under * uLookE[L].y);
    if (alpha <= 0.001) return vec4(0.0);
    contrast *= 1.0 - under * uLookE[L].z;
    // pillow normal from the silhouette distance (edges curve away)
    float R = uLookD[L].x;
    float e = clamp(-(sdf - wob * B.x * 0.35 * puffAmp) / R, 0.0, 1.0);
    float hp = R * sqrt(max(0.0, 1.0 - (1.0 - e) * (1.0 - e)));
    // smooth metaball bulges (no creases between lobes)
    float hm = sqrt(max(meta, 0.0)) * sqrt(R) * uLookF[L].x;
    hp = mix(hp, hm, uLookF[L].y);
    vec2 gh = vec2(dFdx(hp), -dFdy(hp));
    vec3 npil = normalize(vec3(-gh * 1.0, 1.0));
    float edgeW = 1.0 - smoothstep(0.0, 1.0, -sdf2 / (B.x * 1.2));
    vec3 nn = normalize(npil + uLookD[L].y * (n - vec3(0.0, 0.0, 1.0)) + (P0.yzw - vec3(0.0, 0.0, 1.0)) * edgeW * puffAmp * 0.8 + (P1.yzw - vec3(0.0, 0.0, 1.0)) * edgeW * puffAmp * 0.3);
    float dif = dot(nn, uLight);
    // tone (measured mean luminance) -> ramp position through the palette luminances
    float lD = dot(uDeep, vec3(0.299, 0.587, 0.114)), lS = dot(uShade, vec3(0.299, 0.587, 0.114));
    float lM = dot(uMid, vec3(0.299, 0.587, 0.114)), lL = dot(uLit, vec3(0.299, 0.587, 0.114));
    float v = tone < lS ? 0.33 * (tone - lD) / (lS - lD) : tone < lM ? 0.33 + 0.33 * (tone - lS) / (lM - lS) : 0.66 + 0.34 * (tone - lM) / (lL - lM);
    // painted shadow blotches: crisp-ish threshold of the tone field
    float nz = fbm(p / 38.0 + C.z * 2.3) - 0.5;
    float bl = smoothstep(-0.04, 0.04, v - uLookD[L].z + nz * 0.35);
    v = mix(v - uLookD[L].w, v + uLookD[L].w * 0.3, bl);
    v += C.x;
    v += contrast * (dif - 0.55);
    v += (fbm(p / 17.0 + C.z * 3.1) - 0.5) * 0.06;
    vec3 col = ramp(v);
    // silver lining just inside the silhouette
    float rim = (1.0 - smoothstep(0.0, soft * 2.0 + 5.0, -sdf2)) * C.y * (1.0 - under);
    col = mix(col, uLit, clamp(rim, 0.0, 1.0) * 0.6);
    col = mix(col, sky, haze);
    return vec4(col, alpha * opac);
  }

  vec3 srgbToLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }

  void main() {
    vec2 sp = vec2(vUv.x, 1.0 - vUv.y) * uRes; // screen px, y down
    vec3 sky = skyAt(vUv);
    vec3 col = sky;
    float under = 0.0;
    for (int L = 0; L < ${MAXL}; L++) {
      if (L >= uLayers) break;
      vec4 c = layer(L, sp, sky, under);
      col = mix(col, c.rgb, c.a);
      under = max(under, c.a);
    }
    col = mix(col, uHalo.rgb, uHalo.a * gHalo * (1.0 - under));
    float a = 1.0;
    if (uClip.y > uClip.x) a = smoothstep(uClip.x - uClip.z, uClip.x + uClip.z, sp.x) * (1.0 - smoothstep(uClip.y - uClip.z, uClip.y + uClip.z, sp.x));
    if (a <= 0.0) discard;
    gl_FragColor = vec4(srgbToLinear(clamp(col, 0.0, 1.0)), a);
  }
`;

const hexToSrgb = (hex: string) => {
  const c = new THREE.Color();
  c.setStyle(hex, THREE.NoColorSpace);
  return new THREE.Vector3(c.r, c.g, c.b);
};

function makeMaterial() {
  const u: Record<string, THREE.IUniform> = {
    uBlobs: { value: null },
    uStart: { value: new Array(MAXL).fill(0) },
    uCount: { value: new Array(MAXL).fill(0) },
    uLayers: { value: 0 },
    uXa: { value: Array.from({ length: MAXL }, () => new THREE.Vector3(1, 0, 0)) },
    uXb: { value: Array.from({ length: MAXL }, () => new THREE.Vector3(0, 1, 0)) },
    uLookA: { value: Array.from({ length: MAXL }, () => new THREE.Vector4()) },
    uLookB: { value: Array.from({ length: MAXL }, () => new THREE.Vector4()) },
    uLookC: { value: Array.from({ length: MAXL }, () => new THREE.Vector4()) },
    uLookD: { value: Array.from({ length: MAXL }, () => new THREE.Vector4()) },
    uLookE: { value: Array.from({ length: MAXL }, () => new THREE.Vector4()) },
    uLookF: { value: Array.from({ length: MAXL }, () => new THREE.Vector4()) },
    uLit: { value: new THREE.Vector3() },
    uMid: { value: new THREE.Vector3() },
    uShade: { value: new THREE.Vector3() },
    uDeep: { value: new THREE.Vector3() },
    uStopC: { value: Array.from({ length: MAXSTOPS }, () => new THREE.Vector3()) },
    uStopY: { value: new Array(MAXSTOPS).fill(0) },
    uNStops: { value: 0 },
    uXTint: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLight: { value: new THREE.Vector3(-0.25, 0.8, 0.55).normalize() },
    uHalo: { value: new THREE.Vector4(0, 0, 0, 0) },
    uClip: { value: new THREE.Vector3(0, -1, 1) },
    uRes: { value: new THREE.Vector2(1920, 1080) },
  };
  return new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
}

/** 一张常驻的浮点纹理，每帧原地更新（3D 相机移动时云团的屏幕位置每帧都变） */
const MAXBLOBS = 1024;
let blobTex: THREE.DataTexture | null = null;
function blobTexture(layers: readonly CloudLayer[]) {
  if (!blobTex) {
    blobTex = new THREE.DataTexture(new Float32Array(MAXBLOBS * 2 * 4), MAXBLOBS, 2, THREE.RGBAFormat, THREE.FloatType);
    blobTex.minFilter = THREE.NearestFilter;
    blobTex.magFilter = THREE.NearestFilter;
  }
  const data = blobTex.image.data as unknown as Float32Array;
  let k = 0;
  for (const l of layers) {
    for (const b of l.blobs) {
      if (k >= MAXBLOBS) break;
      data.set([b[0], b[1], b[2], b[3] ?? 0.9], k * 4);
      k++;
    }
  }
  blobTex.needsUpdate = true;
  return blobTex;
}

export const SkyClouds: React.FC<{
  sky: SkySpec;
  layers: readonly CloudLayer[];
  /** Light glow of the sky around cloud silhouettes: [colour, strength]. */
  halo?: readonly [string, number];
  /** Only draw screen x in [x0, x1] (px) with a soft edge; used to splice two skies in a pan. */
  clipX?: readonly [number, number];
  palette?: Partial<Palette>;
  light?: readonly [number, number, number];
}> = ({ sky, layers, palette, light, halo, clipX }) => {
  const mat = useMemo(makeMaterial, []);
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  const u = mat.uniforms;
  u.uBlobs.value = blobTexture(layers);
  const pal = { ...DEFAULT_PALETTE, ...palette };
  u.uLit.value.copy(hexToSrgb(pal.lit));
  u.uMid.value.copy(hexToSrgb(pal.mid));
  u.uShade.value.copy(hexToSrgb(pal.shade));
  u.uDeep.value.copy(hexToSrgb(pal.deep));
  if (clipX) u.uClip.value.set(clipX[0], clipX[1], 220);
  else u.uClip.value.set(0, -1, 1);
  mat.transparent = !!clipX;
  if (halo) {
    const h = hexToSrgb(halo[0]);
    u.uHalo.value.set(h.x, h.y, h.z, halo[1]);
  } else u.uHalo.value.set(0, 0, 0, 0);
  if (light) u.uLight.value.set(light[0], light[1], light[2]).normalize();
  u.uNStops.value = Math.min(MAXSTOPS, sky.stops.length);
  sky.stops.slice(0, MAXSTOPS).forEach(([y, c], i) => {
    u.uStopY.value[i] = y;
    u.uStopC.value[i].copy(hexToSrgb(c));
  });
  if (sky.xTint) {
    const c = hexToSrgb(sky.xTint[0]);
    u.uXTint.value.set(c.x, c.y, c.z, sky.xTint[1]);
  } else u.uXTint.value.set(0, 0, 0, 0);
  let start = 0;
  u.uLayers.value = Math.min(MAXL, layers.length);
  layers.slice(0, MAXL).forEach((l, i) => {
    const o = l.look ?? {};
    const xf = l.xf ?? [1, 0, 0, 0, 1, 0];
    u.uStart.value[i] = start;
    u.uCount.value[i] = l.blobs.length;
    start += l.blobs.length;
    u.uXa.value[i].set(xf[0], xf[1], xf[2]);
    u.uXb.value[i].set(xf[3], xf[4], xf[5]);
    u.uLookA.value[i].set(o.soft ?? 1.5, o.puff ?? 1, o.haze ?? 0, o.opacity ?? 1);
    const cells = o.cells ?? [46, 17];
    u.uLookB.value[i].set(cells[0], cells[1], o.blend ?? 30, o.contrast ?? 0.9);
    u.uLookC.value[i].set(o.bright ?? 0, o.rim ?? 0.5, o.seed ?? i * 13.7, o.zY ?? 0.6);
    u.uLookD.value[i].set(o.pillow ?? 90, o.lobes ?? 0.35, o.blotch ?? 0.45, o.blotchDepth ?? 0.18);
    u.uLookF.value[i].set(o.metaScale ?? 1, o.meta ?? 0, 0, 0);
    u.uLookE.value[i].set(o.innerSoft ?? o.soft ?? 1.5, o.innerGrow ?? 0, o.innerFlat ?? 0, o.halo ?? 18);
  });
  mat.uniformsNeedUpdate = true;
  return (
    <NoOutline>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-1000} />
    </NoOutline>
  );
};

/** Inverse of a measured warp (ref px → screen px: s = M p + t) as a screen→layer affine. */
export function invWarp(w: readonly number[]): number[] {
  const [a, b, c, d, tx, ty] = w; // M = [[a b],[c d]]
  const det = a * d - b * c;
  const ia = d / det, ib = -b / det, ic = -c / det, id = a / det;
  return [ia, ib, -(ia * tx + ib * ty), ic, id, -(ic * tx + id * ty)];
}

/** Interpolate measured warps [time, a, b, c, d, tx, ty] (sorted by time). */
export function warpAt(t: number, keys: ReadonlyArray<readonly number[]>): number[] {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last.slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const k0 = keys[i], k1 = keys[i + 1];
    if (t >= k0[0] && t <= k1[0]) {
      const u = (t - k0[0]) / Math.max(1e-6, k1[0] - k0[0]);
      return k0.slice(1).map((v, j) => v + (k1[j + 1] - v) * u);
    }
  }
  return last.slice(1);
}

/** Compose: screen → (inverse warp) → layer, then an extra layer-space offset/scale about a point. */
export function layerXf(w: readonly number[], extra?: { dx?: number; dy?: number }): number[] {
  const x = invWarp(w);
  if (extra) {
    x[2] += extra.dx ?? 0;
    x[5] += extra.dy ?? 0;
  }
  return x;
}
