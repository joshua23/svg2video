import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Hud } from './Hud';
import { BeatContext, GlobalDefs } from './kit';
import { SCENES } from './scenes';
import { loadFonts } from './theme';
import { BEATS, beatAt, FPS, TOTAL_FRAMES } from './timeline';

loadFonts();

const XFADE = 6;

/** 0 = parchment, 1 = night, cross-faded around beat boundaries. */
const darkness = (frame: number) => {
  const i = beatAt(frame);
  const cur = BEATS[i].mode === 'dark' ? 1 : 0;
  const prev = i > 0 ? (BEATS[i - 1].mode === 'dark' ? 1 : 0) : cur;
  return interpolate(frame - BEATS[i].start, [0, XFADE], [prev, cur], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

export const MingVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const dark = darkness(frame);
  const grainX = (frame * 73) % 256;
  const grainY = (frame * 151) % 256;

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
          backgroundPosition: `${grainX}px ${grainY}px`, opacity: 0.1 + dark * 0.05, mixBlendMode: 'overlay',
        }}
      />
      <Audio
        src={staticFile('ming/score.mp3')}
        volume={(f) => interpolate(f, [TOTAL_FRAMES - 75, TOTAL_FRAMES], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
    </AbsoluteFill>
  );
};

const BeatLayer: React.FC<{ beat: (typeof BEATS)[number]; children: React.ReactNode }> = ({ beat, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, XFADE, beat.dur, beat.dur + XFADE], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <BeatContext.Provider value={{ f, dur: beat.dur, mode: beat.mode, fps: FPS }}>
      <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
    </BeatContext.Provider>
  );
};

export const MING_DURATION = TOTAL_FRAMES;
