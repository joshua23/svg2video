/**
 * 程序绘制的贴图（Canvas2D）：恰袢条纹、鞍毯花纹、花帽、木纹、土路。
 * 全部由代码生成，缓存后在各帧复用。
 */
import * as THREE from 'three';
import { canvasTexture } from './lib/canvasTex';

function repeat(t: THREE.CanvasTexture, rx: number, ry: number) {
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

/** 维吾尔"艾德莱斯"式竖条纹，用于长袍 */
export const robeTex = () =>
  repeat(
    canvasTexture('robe', 256, 64, (c, w, h) => {
      const stripes: [number, string][] = [
        [0.3, '#28389a'], [0.06, '#f0b52a'], [0.26, '#15876a'], [0.05, '#c9232d'], [0.05, '#f0b52a'], [0.28, '#28389a'],
      ];
      let x = 0;
      for (const [f, col] of stripes) {
        c.fillStyle = col;
        c.fillRect(x, 0, f * w + 1, h);
        x += f * w;
      }
      c.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 12; i++) c.fillRect((i / 12) * w, 0, 2, h);
    }),
    6,
    1,
  );

export const blanketTex = () =>
  canvasTexture('blanket', 256, 256, (c, w, h) => {
    c.fillStyle = '#b71f2a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8b53a';
    c.fillRect(0, h - 44, w, 30);
    c.fillRect(0, 10, w, 10);
    c.fillStyle = '#7e141c';
    for (let x = 6; x < w; x += 20) c.fillRect(x, h - 34, 10, 10);
    const diamond = (cx: number, cy: number, r: number, col: string) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(cx, cy - r);
      c.lineTo(cx + r * 0.7, cy);
      c.lineTo(cx, cy + r);
      c.lineTo(cx - r * 0.7, cy);
      c.closePath();
      c.fill();
    };
    for (const cx of [64, 128, 192]) {
      diamond(cx, 110, 42, '#e8b53a');
      diamond(cx, 110, 22, '#7e141c');
      diamond(cx, 110, 9, '#f6e7c1');
    }
    c.fillStyle = '#e8b53a';
    for (let x = 8; x < w; x += 18) c.fillRect(x, h - 14, 5, 14);
  });

export const hatTex = () =>
  canvasTexture('hat', 512, 128, (c, w, h) => {
    c.fillStyle = '#141318';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d8a58';
    c.fillRect(0, h - 22, w, 22);
    c.fillStyle = '#f3eee2';
    // 巴旦木（杏仁）纹样，四个面各一枚
    for (let i = 0; i < 4; i++) {
      const cx = (i + 0.5) * (w / 4);
      c.save();
      c.translate(cx, 52);
      c.rotate(-0.5);
      c.beginPath();
      c.moveTo(0, -30);
      c.bezierCurveTo(24, -18, 20, 20, 0, 30);
      c.bezierCurveTo(-8, 18, -18, 4, -10, -8);
      c.bezierCurveTo(-4, -16, 6, -18, 0, -30);
      c.fill();
      c.restore();
      for (const [dx, dy] of [[-40, -30], [40, 30], [44, -34]]) {
        c.beginPath();
        c.arc(cx + dx, 52 + dy * 0.6, 5, 0, Math.PI * 2);
        c.fill();
      }
    }
  });

export const woodTex = () =>
  repeat(
    canvasTexture('wood', 256, 256, (c, w, h) => {
      c.fillStyle = '#a06c3a';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const y = (i / 26) * h + Math.sin(i * 7.3) * 4;
        c.strokeStyle = i % 3 === 0 ? 'rgba(70,40,15,0.55)' : 'rgba(200,150,95,0.35)';
        c.lineWidth = i % 3 === 0 ? 2.2 : 1.2;
        c.beginPath();
        c.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x * 0.03 + i) * 3);
        c.stroke();
      }
      c.fillStyle = 'rgba(60,32,12,0.6)';
      c.beginPath();
      c.ellipse(170, 90, 10, 5, 0, 0, Math.PI * 2);
      c.fill();
    }),
    1,
    1,
  );

/** 土路：浅色路面、两道车辙、碎石 */
export const roadTex = () => {
  const t = canvasTexture('road', 128, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(214,176,122,0)');
    g.addColorStop(0.12, '#cfa76f');
    g.addColorStop(0.5, '#d9b682');
    g.addColorStop(0.88, '#cfa76f');
    g.addColorStop(1, 'rgba(214,176,122,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(150,108,62,0.75)';
    c.fillRect(w * 0.29, 0, w * 0.06, h);
    c.fillRect(w * 0.65, 0, w * 0.06, h);
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(120,85,50,0.5)' : 'rgba(245,225,185,0.6)';
      c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
};
