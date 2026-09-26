import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { BeatContext, GlobalDefs } from '../ming/kit';
import { useFonts } from '../ming/theme';
import { Hud } from './Hud';
import { SCENES } from './scenes';
import { BEATS, beatAt, FPS, TOTAL_FRAMES } from './timeline';

const XFADE = 6;

const darkness = (frame: number) => {
  const i = beatAt(frame);
  const cur = BEATS[i].mode === 'dark' ? 1 : 0;
  const prev = i > 0 ? (BEATS[i - 1].mode === 'dark' ? 1 : 0) : cur;
  return interpolate(frame - BEATS[i].start, [0, XFADE], [prev, cur], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

/** 《临高启明》全书导读 — the whole story, then the book's own history to 2026. */
export const LingaoVideo: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const dark = darkness(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <GlobalDefs />
      <Img src={staticFile('ming/paper.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Img src={staticFile('ming/night.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: dark }} />
      {BEATS.map((beat) => {
        const Scene = SCENES[beat.id];
        if (!Scene) return null;
        return (
          <Sequence key={beat.id} from={beat.start} durationInFrames={beat.dur + XFADE} layout="none">
            <BeatLayer beat={beat}>
              <Scene />
            </BeatLayer>
          </Sequence>
        );
      })}
      <Hud frame={frame} dark={dark} />
      <div
        style={{
          position: 'absolute', inset: 0, backgroundImage: `url(${staticFile('ming/grain.png')})`,
          backgroundPosition: `${(frame * 73) % 256}px ${(frame * 151) % 256}px`, opacity: 0.1 + dark * 0.05, mixBlendMode: 'overlay',
        }}
      />
      <Audio
        src={staticFile('lingao/score.mp3')}
        volume={(f) => interpolate(f, [TOTAL_FRAMES - 75, TOTAL_FRAMES], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
    </AbsoluteFill>
  );
};

const BeatLayer: React.FC<{ beat: (typeof BEATS)[number]; children: React.ReactNode }> = ({ beat, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, XFADE, beat.dur, beat.dur + XFADE], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <BeatContext.Provider value={{ f, dur: beat.dur, mode: beat.mode, fps: FPS }}>
      <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
    </BeatContext.Provider>
  );
};

export const LINGAO_DURATION = TOTAL_FRAMES;
