import { Camera, V3, add, cross, dot, mul, norm, pathD, projectPoly, sub } from './math3d';
import { WHEEL, bucketZ, wheelAngle } from './plan';
import { Item, SUN_DIR } from './scenery';
import { C } from './palette';
import { KAREZ_Y } from './world';

interface Box {
  c: V3;
  a: V3; // 三个正交单位轴
  b: V3;
  n: V3;
  h: [number, number, number];
  color: string;
  grain?: boolean;
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `rgb(${r},${g},${b})`;
}

function boxFaces(cam: Camera, bx: Box, key: string): Item[] {
  const out: Item[] = [];
  // 凸盒子的可见面互不遮挡，所以整只盒子共用中心深度，避免不同叶板的面交错
  const cz = dot(sub(bx.c, cam.pos), cam.fwd);
  const axes: [V3, number][] = [
    [bx.a, bx.h[0]],
    [bx.b, bx.h[1]],
    [bx.n, bx.h[2]],
  ];
  for (let i = 0; i < 3; i++) {
    const [ax, ha] = axes[i];
    const [u, hu] = axes[(i + 1) % 3];
    const [v, hv] = axes[(i + 2) % 3];
    for (const sgn of [-1, 1]) {
      const nrm = mul(ax, sgn);
      const fc = add(bx.c, mul(nrm, ha));
      if (dot(nrm, sub(cam.pos, fc)) <= 0) continue;
      const pts: V3[] = [
        add(fc, add(mul(u, -hu), mul(v, -hv))),
        add(fc, add(mul(u, hu), mul(v, -hv))),
        add(fc, add(mul(u, hu), mul(v, hv))),
        add(fc, add(mul(u, -hu), mul(v, hv))),
      ];
      const p = projectPoly(cam, pts);
      if (!p) continue;
      const lit = 0.62 + 0.5 * Math.max(0, dot(nrm, SUN_DIR));
      const col = shade(bx.color, lit);
      const grain =
        bx.grain && hu > 0.3
          ? (() => {
              const lines: V3[][] = [];
              for (const k of [-0.5, 0, 0.5]) {
                lines.push([add(fc, add(mul(u, -hu * 0.95), mul(v, hv * k))), add(fc, add(mul(u, hu * 0.95), mul(v, hv * k)))]);
              }
              return lines
                .map((l) => projectPoly(cam, [l[0], l[1], l[1]]))
                .filter(Boolean)
                .map((pp, j) => <path key={j} d={`M${pp!.s[0][0]} ${pp!.s[0][1]}L${pp!.s[1][0]} ${pp!.s[1][1]}`} stroke={shade(bx.color, lit * 0.72)} strokeWidth={1.2} />);
            })()
          : null;
      out.push({
        z: cz,
        el: (
          <g key={`${key}-${i}-${sgn}`}>
            <path d={pathD(p.s)} fill={col} stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
            {grain}
          </g>
        ),
      });
    }
  }
  return out;
}

function beam(p0: V3, p1: V3, w: number, d: number, color: string, up: V3 = [0, 0, 1], grain = false): Box {
  const axis = sub(p1, p0);
  const L = Math.hypot(...axis);
  const a = norm(axis);
  let b = cross(a, up);
  if (Math.hypot(...b) < 1e-4) b = cross(a, [1, 0, 0]);
  b = norm(b);
  const n = norm(cross(a, b));
  return { c: mul(add(p0, p1), 0.5), a, b, n, h: [L / 2, w / 2, d / 2], color, grain };
}

const AX = WHEEL.x;
const AZ = WHEEL.axleZ;

/** 静态木架：两副 A 形架跨在路两侧，第三副在竖井另一侧 */
const FRAME: Box[] = (() => {
  const out: Box[] = [];
  const aFrame = (y: number) => {
    const top: V3 = [AX, y, AZ + 0.32];
    out.push(beam([AX - 1.9, y, 0], top, 0.22, 0.22, C.woodDark, [0, 1, 0]));
    out.push(beam([AX + 1.9, y, 0], top, 0.22, 0.22, C.woodDark, [0, 1, 0]));
    out.push(beam([AX - 1.25, y, 1.6], [AX + 1.25, y, 1.6], 0.16, 0.16, C.wood, [0, 1, 0]));
  };
  aFrame(-1.3);
  aFrame(1.3);
  aFrame(KAREZ_Y + 1.35);
  // 顶部纵梁
  out.push(beam([AX, -1.55, AZ + 0.5], [AX, KAREZ_Y + 1.6, AZ + 0.5], 0.16, 0.16, C.woodDark));
  return out;
})();

export function windlassItems(cam: Camera, t: number): Item[] {
  const items: Item[] = [];
  const ang = wheelAngle(t);
  let k = 0;
  for (const b of FRAME) items.push(...boxFaces(cam, b, `fr${k++}`));
  // 轴
  items.push(...boxFaces(cam, { ...beam([AX, -1.75, AZ], [AX, KAREZ_Y + 1.7, AZ], 0.26, 0.26, C.wood, [1, 0, 0]), b: [Math.cos(ang), 0, Math.sin(ang)], n: [Math.sin(ang), 0, -Math.cos(ang)] }, 'axle'));
  // 绞绳鼓
  items.push(...boxFaces(cam, { c: [AX, KAREZ_Y, AZ], a: [0, 1, 0], b: [Math.cos(ang), 0, Math.sin(ang)], n: [Math.sin(ang), 0, -Math.cos(ang)], h: [0.55, 0.36, 0.36], color: C.woodLight }, 'drum'));
  // 轮毂
  items.push(...boxFaces(cam, { c: [AX, 0, AZ], a: [0, 1, 0], b: [Math.cos(ang), 0, Math.sin(ang)], n: [Math.sin(ang), 0, -Math.cos(ang)], h: [0.3, 0.42, 0.42], color: C.woodDark }, 'hub'));
  // 手臂 + 宽叶板
  for (let i = 0; i < WHEEL.arms; i++) {
    const a = ang + (i * 2 * Math.PI) / WHEEL.arms;
    const radial: V3 = [Math.sin(a), 0, -Math.cos(a)];
    const tang: V3 = [Math.cos(a), 0, Math.sin(a)]; // 叶板运动方向的反方向
    const p0 = add([AX, 0, AZ], mul(radial, 0.3));
    const p1 = add([AX, 0, AZ], mul(radial, WHEEL.rOut + 0.05));
    items.push(...boxFaces(cam, beam(p0, p1, 0.17, 0.2, C.woodDark, tang), `arm${i}`));
    const mid = add([AX, 0, AZ], mul(radial, (WHEEL.rIn + WHEEL.rOut) / 2));
    const plankC = add(mid, mul(tang, -0.14));
    items.push(
      ...boxFaces(
        cam,
        { c: plankC, a: radial, b: [0, 1, 0], n: tang, h: [(WHEEL.rOut - WHEEL.rIn) / 2, WHEEL.plankW / 2, 0.055], color: i === 0 ? '#b07a45' : C.wood, grain: true },
        `plank${i}`,
      ),
    );
    // 叶板铁箍
    for (const r of [WHEEL.rIn + 0.25, WHEEL.rOut - 0.25]) {
      const c = add(add([AX, 0, AZ], mul(radial, r)), mul(tang, -0.14));
      items.push(...boxFaces(cam, { c, a: radial, b: [0, 1, 0], n: tang, h: [0.05, WHEEL.plankW / 2 + 0.01, 0.07], color: '#3d3a38' }, `band${i}-${r}`));
    }
  }
  // 绳子与水桶
  const bz = bucketZ(t);
  const ropeTop: V3 = [AX + 0.36, KAREZ_Y, AZ];
  const ropeBot: V3 = [AX + 0.36, KAREZ_Y, Math.max(-0.2, bz + 0.45)];
  const rp = projectPoly(cam, [ropeTop, ropeBot, ropeBot]);
  if (rp) items.push({ z: rp.z - 0.05, el: <path key="rope" d={`M${rp.s[0][0]} ${rp.s[0][1]}L${rp.s[1][0]} ${rp.s[1][1]}`} stroke={C.rope} strokeWidth={Math.max(1, cam.f * 0.03 / rp.z)} /> });
  if (bz > 0.05) {
    items.push(...boxFaces(cam, { c: [AX + 0.36, KAREZ_Y, bz + 0.2], a: [1, 0, 0], b: [0, 1, 0], n: [0, 0, 1], h: [0.2, 0.2, 0.22], color: '#7a4a28' }, 'bucket'));
  }
  return items;
}

/** 辘轳在地面上的投影阴影（叶板转动时影子扫过路面） */
export function windlassShadowPolys(t: number): V3[][] {
  const ang = wheelAngle(t);
  const toGround = (p: V3): V3 => {
    const k = p[2] / SUN_DIR[2];
    return [p[0] - SUN_DIR[0] * k, p[1] - SUN_DIR[1] * k, 0];
  };
  const polys: V3[][] = [];
  for (let i = 0; i < WHEEL.arms; i++) {
    const a = ang + (i * 2 * Math.PI) / WHEEL.arms;
    const radial: V3 = [Math.sin(a), 0, -Math.cos(a)];
    const r0 = add([AX, 0, AZ], mul(radial, WHEEL.rIn));
    const r1 = add([AX, 0, AZ], mul(radial, WHEEL.rOut));
    const hw = WHEEL.plankW / 2;
    polys.push([toGround(add(r0, [0, -hw, 0])), toGround(add(r1, [0, -hw, 0])), toGround(add(r1, [0, hw, 0])), toGround(add(r0, [0, hw, 0]))]);
    const q0 = add([AX, 0, AZ], mul(radial, 0.2));
    polys.push([toGround(add(q0, [0, -0.1, 0])), toGround(add(r0, [0, -0.1, 0])), toGround(add(r0, [0, 0.1, 0])), toGround(add(q0, [0, 0.1, 0]))]);
  }
  for (const y of [-1.3, 1.3]) {
    const top = toGround([AX, y, AZ + 0.3]);
    polys.push([[AX - 1.95, y - 0.1, 0], top, [AX - 1.85, y + 0.1, 0]]);
    polys.push([[AX + 1.85, y - 0.1, 0], top, [AX + 1.95, y + 0.1, 0]]);
  }
  return polys;
}

export function pointInPoly(x: number, y: number, poly: V3[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
