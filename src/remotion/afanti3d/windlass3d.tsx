/**
 * 3D 坎儿井巨型木辘轳：A 形木架跨在土路两侧，长轴伸到路旁的竖井口，
 * 轴上有绞绳鼓和吊进竖井的水桶；轴的另一端是带 8 块宽叶板的大绞轮。
 */
import React from 'react';
import * as THREE from 'three';
import { toon } from './lib/materials';
import { woodTex } from './textures';
import { W3 } from './world3d';
import { WHEEL, bucketZ, wheelAngle } from '../afanti/plan';
import { KAREZ_Y } from '../afanti/world';

type T3 = [number, number, number];
const AX = WHEEL.x;
const AZ = WHEEL.axleZ;
const Y = new THREE.Vector3(0, 1, 0);
const box = new THREE.BoxGeometry(1, 1, 1);

const woodM = () => toon('#ffffff', { steps: [0.45, 0.75, 1], map: woodTex(), id: 'wood' });
const darkWood = () => toon('#6b4524', { steps: [0.45, 0.75, 1] });

/** 两点之间的方木 */
const Beam: React.FC<{ a: T3; b: T3; w: number; mat: THREE.Material }> = ({ a, b, w, mat }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(Y, d.normalize());
  return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q} scale={[w, L, w]} geometry={box} material={mat} castShadow receiveShadow />;
};

const AFrame: React.FC<{ y: number }> = ({ y }) => {
  const top = W3(AX, y, AZ + 0.32);
  const m = darkWood();
  return (
    <group>
      <Beam a={W3(AX - 1.9, y, 0)} b={top} w={0.22} mat={m} />
      <Beam a={W3(AX + 1.9, y, 0)} b={top} w={0.22} mat={m} />
      <Beam a={W3(AX - 1.28, y, 1.6)} b={W3(AX + 1.28, y, 1.6)} w={0.16} mat={woodM()} />
    </group>
  );
};

export const Windlass3D: React.FC<{ t: number }> = ({ t }) => {
  const ang = wheelAngle(t);
  const wood = woodM();
  const dark = darkWood();
  const iron = toon('#3d3a38', { steps: [0.5, 1] });
  const plankL = WHEEL.rOut - WHEEL.rIn;
  const bz = bucketZ(t);
  return (
    <group>
      <AFrame y={-1.3} />
      <AFrame y={1.3} />
      <AFrame y={KAREZ_Y + 1.35} />
      <Beam a={W3(AX, -1.55, AZ + 0.52)} b={W3(AX, KAREZ_Y + 1.6, AZ + 0.52)} w={0.16} mat={dark} />
      {/* 转动部分：绕 three.js 的 z 轴（即世界 y 轴）旋转 */}
      <group position={W3(AX, 0, AZ)} rotation={[0, 0, ang]}>
        {/* 轴 */}
        <mesh position={[0, 0, -(KAREZ_Y - 1.75 + 1.7) / 2]} scale={[0.26, 0.26, KAREZ_Y + 1.7 + 1.75]} geometry={box} material={wood} castShadow />
        {/* 轮毂 */}
        <mesh scale={[0.84, 0.84, 0.6]} geometry={box} material={dark} castShadow />
        {/* 绞绳鼓 + 缠绕的绳子 */}
        <mesh position={[0, 0, -KAREZ_Y]} rotation={[Math.PI / 2, 0, 0]} geometry={new THREE.CylinderGeometry(0.36, 0.36, 1.1, 10)} material={wood} castShadow />
        {[-0.4, -0.2, 0, 0.2, 0.4].map((z) => (
          <mesh key={z} position={[0, 0, -KAREZ_Y + z]} geometry={new THREE.TorusGeometry(0.37, 0.025, 6, 16)} material={toon('#c7a36b', { steps: [0.5, 1] })} />
        ))}
        {/* 8 根手臂 + 宽叶板（叶板在运动方向的前侧） */}
        {Array.from({ length: WHEEL.arms }).map((_, i) => {
          const a = (i * 2 * Math.PI) / WHEEL.arms;
          return (
            <group key={i} rotation={[0, 0, a]}>
              <mesh position={[0, -(0.3 + WHEEL.rOut) / 2, 0]} scale={[0.17, WHEEL.rOut - 0.3, 0.2]} geometry={box} material={dark} castShadow receiveShadow />
              <mesh position={[-0.14, -(WHEEL.rIn + WHEEL.rOut) / 2, 0]} scale={[0.11, plankL, WHEEL.plankW]} geometry={box} material={i === 0 ? toon('#ffffff', { steps: [0.5, 0.8, 1], map: woodTex(), id: 'plank0' }) : wood} castShadow receiveShadow />
              {[WHEEL.rIn + 0.25, WHEEL.rOut - 0.25].map((r) => (
                <mesh key={r} position={[-0.14, -r, 0]} scale={[0.14, 0.1, WHEEL.plankW + 0.02]} geometry={box} material={iron} />
              ))}
            </group>
          );
        })}
      </group>
      {/* 绳子与水桶 */}
      {(() => {
        const top = W3(AX + 0.37, KAREZ_Y, AZ);
        const bot = W3(AX + 0.37, KAREZ_Y, Math.max(-0.3, bz + 0.45));
        return <Beam a={top} b={bot} w={0.03} mat={toon('#c7a36b', { steps: [0.5, 1] })} />;
      })()}
      {bz > 0.02 && (
        <mesh position={W3(AX + 0.37, KAREZ_Y, bz + 0.2)} geometry={new THREE.CylinderGeometry(0.22, 0.17, 0.42, 10)} material={toon('#7a4a28', { steps: [0.5, 1] })} castShadow />
      )}
    </group>
  );
};
