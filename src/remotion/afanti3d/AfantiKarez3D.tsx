/**
 * 阿凡提大战坎儿井辘轳 · 3D 卡通渲染复古动画版（Barracuda-M 复刻项目的渲染风格）。
 */
import React from 'react';
import { AbsoluteFill, Audio, getStaticFiles, staticFile, useCurrentFrame } from 'remotion';
import { Film3D } from './scene3d';
import { BAR, Subtitle, useFonts } from '../afanti/AfantiKarez';
import { ImpactBurst, SpeedLines } from '../afanti/scene';
import { FPS, T, clamp } from '../afanti/plan';
import { cameraAt } from '../afanti/camera';

/** 片尾复古动画标题：斜体粗字 + 黄色立体厚边 + 深色描边（致敬 BARRACUDA 标题卡） */
function RetroTitle({ t }: { t: number }) {
  const a = clamp((t - 13.95) / 0.35);
  if (a <= 0) return null;
  const pop = 1 + 0.25 * Math.exp(-(t - 13.95) * 9) * Math.sin((t - 13.95) * 30);
  const depth = 14;
  const text = '阿凡提';
  const font = "'ZCOOL QingKe HuangYou', 'ZCOOL KuaiLe', sans-serif";
  const layers = [];
  for (let i = depth; i >= 1; i--) {
    layers.push(
      <text key={i} x={i * 0.9} y={i} fontFamily={font} fontSize={150} fill={i === depth ? '#1b1210' : '#f7c531'} stroke="#1b1210" strokeWidth={i === depth ? 10 : 0} letterSpacing={8}>
        {text}
      </text>,
    );
  }
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: a }}>
      <defs>
        <linearGradient id="rt-g" x1="0" y1="-120" x2="0" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff9a3c" />
          <stop offset="0.55" stopColor="#f2542d" />
          <stop offset="1" stopColor="#d8302a" />
        </linearGradient>
      </defs>
      <g transform={`translate(1270 ${BAR + 190}) scale(${pop * a}) skewX(-12) rotate(-4)`}>
        {layers}
        <text x={0} y={0} fontFamily={font} fontSize={150} fill="url(#rt-g)" stroke="#1b1210" strokeWidth={6} paintOrder="stroke" letterSpacing={8}>
          {text}
        </text>
        <text x={16} y={62} fontFamily={font} fontSize={46} fill="#fff6e0" stroke="#1b1210" strokeWidth={8} paintOrder="stroke" letterSpacing={6}>
          大战坎儿井辘轳
        </text>
      </g>
    </svg>
  );
}

export const AfantiKarez3D: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const fx = cameraAt(t);
  const hasAudio = getStaticFiles().some((f) => f.name === 'afanti/soundtrack.wav');
  const flash = t >= T.impact && t < T.impact + 0.1 ? 1 - (t - T.impact) / 0.1 : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Film3D t={t} />
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        <SpeedLines t={t} amount={fx.speedLines} />
        <ImpactBurst t={t} />
        {flash > 0 && <rect width={1920} height={1080} fill="#fffbe8" opacity={flash} />}
      </svg>
      <RetroTitle t={t} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: BAR, background: '#050302' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR, background: '#050302' }} />
      <Subtitle t={t} />
      {hasAudio && <Audio src={staticFile('afanti/soundtrack.wav')} />}
    </AbsoluteFill>
  );
};
