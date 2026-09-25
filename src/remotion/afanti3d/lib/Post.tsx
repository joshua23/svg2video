// 移植自 joshua23/barracuda-retro-anime（src/remake/lib/Post.tsx）：Barracuda-M 复刻项目的 3D 卡通渲染管线。
/**
 * Post-processing chain shared by every 3D shot — this is what makes the
 * remake read as "3D rendered retro anime" instead of plain WebGL:
 *
 *   RenderPass
 *   → NormalDepthPass     (prepass: world normals + depth of outlined layer 0)
 *   → Outline (ShaderPass) ink lines from depth/normal discontinuities
 *   → UnrealBloomPass      glow on emissive UI / lights
 *   → FinalFX (ShaderPass) radial chromatic aberration, grain, vignette, lift
 *   → OutputPass           linear → sRGB
 *
 * Rendering happens in useFrame(priority 1), which @remotion/three triggers
 * once per Remotion frame via advance() — so output is frame-deterministic.
 */
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

/** Objects on this layer are rendered but get no ink outline. */
export const NO_OUTLINE_LAYER = 1;

export interface OutlineOpts {
  color?: string;
  /** Line opacity 0..1 */
  opacity?: number;
  /** Sample radius in pixels. */
  thickness?: number;
  /** Relative depth jump that starts / saturates a line. */
  depthLo?: number;
  depthHi?: number;
  /** Normal difference (1 - dot) that starts / saturates a line. */
  normalLo?: number;
  normalHi?: number;
  /** Draw lines wherever two different objects meet (default true). */
  idLines?: boolean;
  /** 1 = edge mask, 2 = normals, 3 = object ids (diagnostics). */
  debug?: number;
}

export interface PostOpts {
  outline?: OutlineOpts | false;
  bloom?: { strength: number; radius: number; threshold: number } | false;
  /** Radial chromatic aberration amount (uv units at the corners). */
  ca?: number;
  grain?: number;
  vignette?: number;
  /** Multiply / add applied last, in linear space — quick global grading. */
  gain?: [number, number, number];
  lift?: [number, number, number];
  saturation?: number;
  /** Radial smear half-length in px at r²=1 (≈ frame corners) — lens softness. */
  edgeBlur?: number;
  /** Uniform blur radius (px) over the whole frame. */
  softness?: number;
}

/** Per-object ID colour: userData.oid (shared by meshes that form one
 *  outline-free object) or the object id; instances get their own ids. */
function makeIdMaterial() {
  const m = new THREE.ShaderMaterial({
    uniforms: { oid: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */ `
      #include <common>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      flat varying float vInst;
      void main() {
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinbase_vertex>
        #include <skinning_vertex>
        #include <project_vertex>
        #ifdef USE_INSTANCING
          vInst = float(gl_InstanceID);
        #else
          vInst = 0.0;
        #endif
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 oid;
      flat varying float vInst;
      void main() {
        float k = mod(vInst * 37.0, 251.0) / 255.0;
        gl_FragColor = vec4(oid.xy, fract(oid.z + k), 1.0);
      }`,
  });
  m.onBeforeRender = (_r, _s, _c, _g, object) => {
    const id = (object.userData.oid as number | undefined) ?? object.id;
    const h = (id * 2654435761) >>> 0;
    m.uniforms.oid.value.set(((h >>> 16) & 255) / 255, ((h >>> 8) & 255) / 255, (h & 255) / 255);
    m.uniformsNeedUpdate = true;
  };
  return m;
}

class NormalDepthPass extends Pass {
  target: THREE.WebGLRenderTarget;
  idTarget: THREE.WebGLRenderTarget;
  private normalMat = new THREE.MeshNormalMaterial();
  private idMat = makeIdMaterial();
  constructor(private scene: THREE.Scene, private camera: THREE.Camera, w: number, h: number) {
    super();
    this.needsSwap = false;
    this.target = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      depthTexture: new THREE.DepthTexture(w, h, THREE.FloatType),
    });
    this.idTarget = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  }
  private pass(renderer: THREE.WebGLRenderer, mat: THREE.Material, target: THREE.WebGLRenderTarget) {
    this.scene.overrideMaterial = mat;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
  }
  render(renderer: THREE.WebGLRenderer) {
    const prevOverride = this.scene.overrideMaterial;
    const prevBg = this.scene.background;
    const prevMask = this.camera.layers.mask;
    this.scene.background = null;
    this.camera.layers.set(0);
    this.pass(renderer, this.normalMat, this.target);
    this.pass(renderer, this.idMat, this.idTarget);
    this.camera.layers.mask = prevMask;
    this.scene.overrideMaterial = prevOverride;
    this.scene.background = prevBg;
  }
  setSize(w: number, h: number) {
    this.target.setSize(w, h);
    this.idTarget.setSize(w, h);
  }
  dispose() {
    this.target.dispose();
    this.idTarget.dispose();
    this.normalMat.dispose();
    this.idMat.dispose();
  }
}
// FullScreenQuad import keeps tree-shaking honest for Pass subclasses.
void FullScreenQuad;

const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tNormal: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    tId: { value: null as THREE.Texture | null },
    idLines: { value: 1 },
    resolution: { value: new THREE.Vector2(1920, 1080) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 1000 },
    lineColor: { value: new THREE.Color("#1a1618") },
    opacity: { value: 0.85 },
    thickness: { value: 1.0 },
    depthLo: { value: 0.015 },
    depthHi: { value: 0.06 },
    normalLo: { value: 0.25 },
    normalHi: { value: 0.6 },
    debug: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse; uniform sampler2D tNormal; uniform sampler2D tDepth; uniform sampler2D tId;
    uniform vec2 resolution; uniform float cameraNear; uniform float cameraFar;
    uniform vec3 lineColor; uniform float opacity; uniform float thickness; uniform float idLines;
    uniform float depthLo; uniform float depthHi; uniform float normalLo; uniform float normalHi; uniform float debug;
    varying vec2 vUv;
    float viewZ(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      return -perspectiveDepthToViewZ(d, cameraNear, cameraFar);
    }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec2 px = thickness / resolution;
      float zc = viewZ(vUv);
      vec4 nc = texture2D(tNormal, vUv);
      vec3 ic = texture2D(tId, vUv).rgb;
      float de = 0.0; float ne = 0.0; float ie = 0.0;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7853982;
        vec2 uv2 = vUv + vec2(cos(a), sin(a)) * px;
        float z2 = viewZ(uv2);
        vec4 n2 = texture2D(tNormal, uv2);
        vec3 i2 = texture2D(tId, uv2).rgb;
        bool farther = n2.a < 0.5 || z2 > zc;
        de = max(de, (z2 - zc) / max(zc, 1e-4));
        if (n2.a > 0.5) {
          vec3 na = nc.rgb * 2.0 - 1.0; vec3 nb = n2.rgb * 2.0 - 1.0;
          ne = max(ne, 1.0 - dot(normalize(na), normalize(nb)));
        }
        if (farther && distance(ic, i2) > 0.002) ie = 1.0;
      }
      float e = max(max(smoothstep(depthLo, depthHi, de), smoothstep(normalLo, normalHi, ne)), ie * idLines);
      e *= step(0.5, nc.a);
      col.rgb = mix(col.rgb, lineColor, e * opacity);
      if (debug > 0.5) col = vec4(vec3(1.0 - e), 1.0);
      if (debug > 1.5) col = vec4(nc.rgb * nc.a, 1.0);
      if (debug > 2.5) col = vec4(ic, 1.0);
      gl_FragColor = col;
    }
  `,
};

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    resolution: { value: new THREE.Vector2(1920, 1080) },
    ca: { value: 0.0 },
    grain: { value: 0.0 },
    vignette: { value: 0.0 },
    seed: { value: 0 },
    gain: { value: new THREE.Vector3(1, 1, 1) },
    lift: { value: new THREE.Vector3(0, 0, 0) },
    saturation: { value: 1 },
    edgeBlur: { value: 0 },
    softness: { value: 0 },
  },
  vertexShader: OutlineShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float ca; uniform float grain;
    uniform float vignette; uniform float seed; uniform vec3 gain; uniform vec3 lift; uniform float saturation;
    uniform float edgeBlur; uniform float softness;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32 + seed); return fract(p.x * p.y); }
    const vec2 TAPS[12] = vec2[12](
      vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
      vec2( 0.962,-0.195), vec2( 0.473,-0.480), vec2( 0.519, 0.767), vec2( 0.185,-0.893),
      vec2( 0.507, 0.064), vec2( 0.896, 0.412), vec2(-0.322,-0.933), vec2(-0.792,-0.598));
    // Lens CA as measured on the original: zero at the centre, growing with r²,
    // red pulled inward / blue pushed outward (cyan fringe on the outer edge).
    vec3 tapCA(vec2 uv, vec2 off) {
      return vec3(texture2D(tDiffuse, uv - off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv + off).b);
    }
    void main() {
      vec2 c = vUv - 0.5;
      vec2 cpx = c * resolution;
      float r2 = dot(c * vec2(resolution.x / resolution.y, 1.0), c * vec2(resolution.x / resolution.y, 1.0));
      // Mostly horizontal (anamorphic-like): no fringe on the vertical centre line.
      vec2 off = vec2(c.x * 2.0, c.y * 0.5) * ca * r2;
      // Radial (zoom-like) smear toward the edges + uniform softness, in px.
      float L = edgeBlur * r2;
      vec2 dir = length(cpx) > 1.0 ? normalize(cpx) / resolution : vec2(0.0);
      vec3 col = tapCA(vUv, off);
      if (L > 0.25 || softness > 0.25) {
        vec2 soft = softness / resolution;
        vec3 acc = col;
        for (int i = 0; i < 12; i++) {
          float s = (float(i) / 11.0 - 0.5) * 2.0;
          acc += tapCA(vUv + TAPS[i] * soft + dir * L * s, off);
        }
        col = acc / 13.0;
      }
      col = col * gain + lift;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col *= 1.0 - vignette * smoothstep(0.25, 1.1, r2);
      col += (hash(vUv * resolution) - 0.5) * grain;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export const Post: React.FC<{ opts: PostOpts }> = ({ opts }) => {
  const { gl, scene, camera, size } = useThree();
  const frame = useCurrentFrame();

  const chain = useMemo(() => {
    const w = size.width;
    const h = size.height;
    const composer = new EffectComposer(
      gl,
      new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }),
    );
    composer.setPixelRatio(1);
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    const nd = new NormalDepthPass(scene, camera, w, h);
    composer.addPass(nd);
    const outline = new ShaderPass(OutlineShader);
    outline.uniforms.tNormal.value = nd.target.texture;
    outline.uniforms.tDepth.value = nd.target.depthTexture;
    outline.uniforms.tId.value = nd.idTarget.texture;
    outline.uniforms.resolution.value.set(w, h);
    composer.addPass(outline);
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.4, 0.85);
    composer.addPass(bloom);
    const fx = new ShaderPass(FinalShader);
    fx.uniforms.resolution.value.set(w, h);
    composer.addPass(fx);
    composer.addPass(new OutputPass());
    return { composer, nd, outline, bloom, fx };
  }, [gl, scene, camera, size.width, size.height]);

  useEffect(() => () => {
    chain.nd.dispose();
    chain.composer.dispose();
  }, [chain]);

  // Uniforms are synced in a layout effect so they are set before
  // @remotion/three calls advance() (a passive effect) for this frame.
  useLayoutEffect(() => {
    const { nd, outline, bloom, fx } = chain;
    const o = opts.outline;
    nd.enabled = !!o;
    outline.enabled = !!o;
    if (o) {
      const u = outline.uniforms;
      u.lineColor.value.set(o.color ?? "#1a1618");
      u.opacity.value = o.opacity ?? 0.85;
      u.thickness.value = o.thickness ?? 1.0;
      u.depthLo.value = o.depthLo ?? 0.015;
      u.depthHi.value = o.depthHi ?? 0.06;
      u.normalLo.value = o.normalLo ?? 0.25;
      u.normalHi.value = o.normalHi ?? 0.6;
      u.debug.value = o.debug ?? 0;
      u.idLines.value = o.idLines === false ? 0 : 1;
      const cam = camera as THREE.PerspectiveCamera;
      u.cameraNear.value = cam.near;
      u.cameraFar.value = cam.far;
    }
    bloom.enabled = !!opts.bloom;
    if (opts.bloom) {
      bloom.strength = opts.bloom.strength;
      bloom.radius = opts.bloom.radius;
      bloom.threshold = opts.bloom.threshold;
    }
    const f = fx.uniforms;
    f.ca.value = opts.ca ?? 0.0;
    f.grain.value = opts.grain ?? 0.0;
    f.vignette.value = opts.vignette ?? 0.0;
    f.seed.value = frame % 97;
    f.gain.value.set(...(opts.gain ?? [1, 1, 1]));
    f.lift.value.set(...(opts.lift ?? [0, 0, 0]));
    f.saturation.value = opts.saturation ?? 1;
    f.edgeBlur.value = opts.edgeBlur ?? 0;
    f.softness.value = opts.softness ?? 0;
  });

  useFrame(() => {
    chain.composer.render();
  }, 1);

  return null;
};
