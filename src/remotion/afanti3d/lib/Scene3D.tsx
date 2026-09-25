// 移植自 joshua23/barracuda-retro-anime（src/remake/lib/Scene3D.tsx）：Barracuda-M 复刻项目的 3D 卡通渲染管线。
/**
 * Scene3D — full-frame ThreeCanvas with the shared anime post chain.
 * Cam — declarative per-frame camera (position / target / fov / roll).
 * NoOutline — puts all descendants on NO_OUTLINE_LAYER.
 */
import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill } from "remotion";
const WIDTH = 1920;
const HEIGHT = 1080;
import { NO_OUTLINE_LAYER, Post, PostOpts } from "./Post";

export type V3 = readonly [number, number, number];

export const Scene3D: React.FC<{
  children: React.ReactNode;
  post?: PostOpts;
  background?: string;
  shadows?: boolean;
  fov?: number;
  near?: number;
  far?: number;
}> = ({ children, post = {}, background = "#000000", shadows = true, fov = 35, near = 0.1, far = 400 }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <ThreeCanvas
        width={WIDTH}
        height={HEIGHT}
        dpr={1}
        flat
        shadows={shadows ? "soft" : false}
        gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
        camera={{ fov, near, far, position: [0, 0, 10] }}
        onCreated={({ camera }) => {
          camera.layers.enableAll();
        }}
      >
        <color attach="background" args={[background]} />
        {children}
        <Post opts={post} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const Cam: React.FC<{
  position: V3;
  target: V3;
  fov?: number;
  /** Roll around the view axis, degrees. */
  roll?: number;
  near?: number;
  far?: number;
  /** Lens shift in NDC units (keeps perspective, shifts framing). */
  shift?: readonly [number, number];
}> = ({ position, target, fov, roll = 0, near, far, shift }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(position[0], position[1], position[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(target[0], target[1], target[2]);
    if (roll) cam.rotateZ(THREE.MathUtils.degToRad(roll));
    if (fov !== undefined) cam.fov = fov;
    if (near !== undefined) cam.near = near;
    if (far !== undefined) cam.far = far;
    cam.updateProjectionMatrix();
    if (shift) {
      cam.projectionMatrix.elements[8] = shift[0];
      cam.projectionMatrix.elements[9] = shift[1];
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    }
    cam.updateMatrixWorld();
  });
  return null;
};

export const NoOutline: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => o.layers.set(NO_OUTLINE_LAYER));
  });
  return <group ref={ref}>{children}</group>;
};
