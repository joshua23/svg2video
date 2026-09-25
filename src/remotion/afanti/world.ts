import { V3, rng } from './math3d';
import { ROCK_X, TRIP_X, WHEEL } from './plan';

export const KAREZ_Y = WHEEL.shaftY;

export interface Tree {
  p: V3;
  h: number;
  seed: number;
  lean: number;
}
export interface Rock {
  p: V3;
  r: number;
  seed: number;
  tone: number;
}
export interface Shrub {
  p: V3;
  r: number;
  seed: number;
}
export interface Mound {
  p: V3;
  r: number;
  h: number;
}
export interface Pebble {
  x: number;
  y: number;
  r: number;
  c: number;
}

const R = rng(20240917);

export const TREES: Tree[] = [];
// 金黄色胡杨林：道路两侧的林带 + 零星孤树
for (let i = 0; i < 70; i++) {
  const side = R() < 0.5 ? -1 : 1;
  const x = -60 + R() * (WHEEL.x + 160);
  const y = side * (13 + Math.pow(R(), 1.6) * 70);
  // 给结尾广角机位留出前景
  if (x > WHEEL.x - 26 && x < WHEEL.x + 8 && y < -9 && y > -30) continue;
  TREES.push({ p: [x, y, 0], h: 6 + R() * 5, seed: Math.floor(R() * 1e6), lean: (R() - 0.5) * 14 });
}
// 快速侧向跟拍时从镜头前掠过的近景胡杨
for (const x of [43, 46.5, 50]) {
  TREES.push({ p: [x, -4.6 - R() * 0.6, 0], h: 5.5 + R() * 2, seed: Math.floor(R() * 1e6), lean: (R() - 0.5) * 10 });
}
// 辘轳旁边的一棵老胡杨
TREES.push({ p: [WHEEL.x + 9, 8.5, 0], h: 8.5, seed: 777, lean: -8 });
TREES.push({ p: [WHEEL.x - 22, 17, 0], h: 7.5, seed: 4242, lean: 6 });

export const ROCKS: Rock[] = [];
for (let i = 0; i < 90; i++) {
  const side = R() < 0.5 ? -1 : 1;
  const x = -40 + R() * (WHEEL.x + 120);
  const y = side * (2.6 + Math.pow(R(), 1.4) * 30);
  ROCKS.push({ p: [x, y, 0], r: 0.15 + Math.pow(R(), 2) * 0.9, seed: Math.floor(R() * 1e6), tone: R() });
}
// 路中间要跳过去的大石头 + 绊脚石 + 贴地机位前景石
export const JUMP_ROCK: Rock = { p: [ROCK_X, 0.05, 0], r: 0.55, seed: 99, tone: 0.3 };
export const TRIP_STONE: Rock = { p: [TRIP_X, 0.25, 0], r: 0.13, seed: 7, tone: 0.6 };
ROCKS.push(JUMP_ROCK, TRIP_STONE);
ROCKS.push({ p: [ROCK_X + 1.0, -2.55, 0], r: 0.32, seed: 5, tone: 0.1 });
ROCKS.push({ p: [ROCK_X + 2.2, -2.9, 0], r: 0.18, seed: 6, tone: 0.8 });

export const SHRUBS: Shrub[] = [];
for (let i = 0; i < 140; i++) {
  const side = R() < 0.5 ? -1 : 1;
  const x = -40 + R() * (WHEEL.x + 120);
  const y = side * (2.4 + Math.pow(R(), 1.3) * 40);
  if (x > WHEEL.x - 14 && x < WHEEL.x + 10 && y < -3 && y > -14) continue;
  SHRUBS.push({ p: [x, y, 0], r: 0.25 + R() * 0.45, seed: Math.floor(R() * 1e6) });
}
// 侧向跟拍的前景骆驼刺
for (let x = 36; x < WHEEL.x - 2; x += 3.1) {
  SHRUBS.push({ p: [x + R(), -4.4 - R() * 0.8, 0], r: 0.35 + R() * 0.3, seed: Math.floor(R() * 1e6) });
}

/** 坎儿井竖井口的环形土堆：一条直线穿过戈壁，最终通向大辘轳 */
export const MOUNDS: Mound[] = [];
for (let k = -12; k <= 14; k++) {
  if (k === 0) continue;
  MOUNDS.push({ p: [WHEEL.x + k * 15, KAREZ_Y, 0], r: 1.35, h: 0.55 });
}
// 远处另一条坎儿井
for (let k = -10; k <= 20; k++) {
  MOUNDS.push({ p: [WHEEL.x + k * 18 - 40, -46 + k * 0.6, 0], r: 1.5, h: 0.6 });
}
export const WELL_MOUND: Mound = { p: [WHEEL.x, KAREZ_Y, 0], r: 1.75, h: 0.62 };

export const PEBBLES: Pebble[] = [];
for (let i = 0; i < 2600; i++) {
  const x = -30 + R() * (WHEEL.x + 70);
  const y = (R() - 0.5) * 2 * (1 + Math.pow(R(), 1.5) * 16);
  PEBBLES.push({ x, y, r: 0.02 + Math.pow(R(), 3) * 0.08, c: R() });
}

/** 远山：两圈山脊线（近的是红褐色火焰山，远的是淡蓝色雪峰天山） */
export function ridge(n: number, seed: number, base: number, amp: number) {
  const r = rng(seed);
  const ph = [r() * 6, r() * 6, r() * 6, r() * 6];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const h =
      base +
      amp *
        (0.5 +
          0.28 * Math.sin(a * 3 + ph[0]) +
          0.18 * Math.sin(a * 7 + ph[1]) +
          0.12 * Math.sin(a * 17 + ph[2]) +
          0.06 * Math.sin(a * 41 + ph[3]));
    out.push(Math.max(0, h));
  }
  return out;
}
export const RIDGE_FAR = ridge(240, 11, 60, 900);
export const RIDGE_MID = ridge(360, 23, 20, 160);
