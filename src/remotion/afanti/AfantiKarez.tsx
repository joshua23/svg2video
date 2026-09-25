import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, getStaticFiles, staticFile, useCurrentFrame } from 'remotion';
import '@fontsource/zcool-kuaile/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import { AfantiScene } from './scene';
import { FPS, LINES, clamp } from './plan';

const BAR = 132; // 2.39:1 宽银幕遮幅

function Subtitle({ t }: { t: number }) {
  const line = [...LINES].reverse().find((l) => t >= l.t - 0.05);
  if (!line) return null;
  const next = LINES[LINES.indexOf(line) + 1];
  const end = Math.min(next ? next.t - 0.05 : Infinity, line.t + Math.max(1.1, line.text.length * 0.2));
  if (t > end) return null;
  const a = clamp((t - line.t + 0.05) / 0.08) * clamp((end - t) / 0.1);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 26,
        textAlign: 'center',
        fontFamily: "'Noto Sans SC', 'WenQuanYi Zen Hei', sans-serif",
        fontWeight: 700,
        fontSize: 50,
        color: '#fff4d6',
        letterSpacing: 2,
        textShadow: '0 3px 0 #2a170e, 0 0 14px rgba(0,0,0,0.8)',
        opacity: a,
      }}
    >
      <span style={{ color: '#ffcf5a', marginRight: 14 }}>阿凡提：</span>
      {line.text}
    </div>
  );
}

function Title({ t }: { t: number }) {
  // 片尾小标题
  const a = clamp((t - 14.1) / 0.4);
  if (a <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 60,
        top: BAR + 28,
        fontFamily: "'ZCOOL KuaiLe', 'WenQuanYi Zen Hei', sans-serif",
        fontSize: 64,
        color: '#fff7df',
        textShadow: '0 4px 0 #7e161c, 0 0 18px rgba(0,0,0,0.5)',
        opacity: a,
        transform: `translateY(${(1 - a) * 20}px)`,
      }}
    >
      阿凡提大战坎儿井辘轳
    </div>
  );
}

const ALL_TEXT = LINES.map((l) => l.text).join('') + '阿凡提：大战坎儿井辘轳砰！';

function useFonts() {
  const [handle] = useState(() => delayRender('加载中文字体'));
  useEffect(() => {
    const fonts = document.fonts;
    Promise.all([
      fonts.load(`700 50px "Noto Sans SC"`, ALL_TEXT),
      fonts.load(`400 64px "ZCOOL KuaiLe"`, ALL_TEXT),
    ])
      .catch(() => undefined)
      .then(() => continueRender(handle));
  }, [handle]);
}

export const AfantiKarez: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const hasAudio = getStaticFiles().some((f) => f.name === 'afanti/soundtrack.wav');
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <AfantiScene t={t} />
      <Title t={t} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: BAR, background: '#050302' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR, background: '#050302' }} />
      <Subtitle t={t} />
      {hasAudio && <Audio src={staticFile('afanti/soundtrack.wav')} />}
    </AbsoluteFill>
  );
};
