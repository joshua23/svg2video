import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Cam, CamProvider, H, Layer, W } from '../lib/camera';
import { Look } from '../lib/look';
import { f1 } from '../lib/math';
import { CREST, atDepth, farSlopeElev } from '../lib/stage';
import { Dike, FarShore, Hills, Sky, Water } from './Land';
import { Paper } from './Paper';
import { PoplarRow, Willow } from './Trees';

/** Where father and son stop, on the crest. The planted willow grows here. */
export const SPOT = 960;
export const WILLOW_X = SPOT + 34;
export const OLD_WILLOW = { x: SPOT + 400, z: 1.2 };

export interface SetProps {
  look: Look;
  t: number;
  cam: Cam;
  wind?: number;
  leaf?: number;
  /** Growth of the son's willow; undefined = not planted yet. */
  willow?: number;
  /** 1 = the old willow on the water's edge stands, 0 = gone. */
  oldWillow?: number;
  waterLevel?: number;
  mud?: string;
  poplars?: boolean;
  snow?: number;
  /** Things beyond the crest, drawn in screen space before the dike hides their feet. */
  far?: React.ReactNode;
  /** Actors on the crest, drawn in world space; called once for the cast shadow, once for real. */
  crest?: (ink: string, shadow: boolean) => React.ReactNode;
  /** Screen-space overlays drawn in front of everything but the paper. */
  front?: React.ReactNode;
  /** Drawn over the crest actors but under the weather: foreground world-space things. */
  near?: React.ReactNode;
  paper?: number;
}

export const DikeSet: React.FC<SetProps> = ({
  look,
  t,
  cam,
  wind = 0.3,
  leaf = 1,
  willow,
  oldWillow = 1,
  waterLevel = 1,
  mud,
  poplars = true,
  snow = 0,
  far,
  crest,
  front,
  near,
  paper = 1,
}) => {
  const old = atDepth(cam, OLD_WILLOW.x, OLD_WILLOW.z, farSlopeElev(OLD_WILLOW.z));
  const trees = (ink: string, shadow: boolean) => (
    <>
      {poplars && <PoplarRow t={t} wind={wind} leaf={leaf} color={ink} foliage={shadow ? ink : look.foliage} gap={[SPOT - 110, SPOT + 470]} />}
      {willow !== undefined && (
        <Willow x={WILLOW_X} y={CREST - 3} growth={willow} seed={77} t={t} wind={wind} leaf={leaf} color={ink} foliage={shadow ? ink : look.foliage} lean={0.12} />
      )}
    </>
  );
  const kx = look.shadowKx;
  const ky = look.shadowKy;
  return (
    <AbsoluteFill>
      <CamProvider value={cam}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          <Sky look={look} t={t} />
          <Hills look={look} />
          <Water look={look} t={t} level={waterLevel} mud={mud} />
          <FarShore look={look} />
          {oldWillow > 0.01 && (
            <g transform={`translate(${f1(old.x)} ${f1(old.y)}) scale(${old.scale.toFixed(4)})`} opacity={oldWillow}>
              <Willow x={0} y={0} growth={1} seed={31} t={t} wind={wind} leaf={leaf} color={look.ink} foliage={look.foliage} lean={0.45} age={1} scale={0.72} />
            </g>
          )}
          {far}
          <Layer p={1}>
            <Dike look={look} t={t} wind={wind} snow={snow} />
            {look.shadowAlpha > 0.02 && (
              <g transform={`translate(0 ${CREST}) matrix(1 0 ${f1(-kx * 100) / 100} ${f1(-ky * 100) / 100} 0 0) translate(0 ${-CREST})`} opacity={look.shadowAlpha}>
                {trees(look.shadow, true)}
                {crest?.(look.shadow, true)}
              </g>
            )}
            {trees(look.ink, false)}
            {crest?.(look.ink, false)}
            {near}
          </Layer>
          {front}
          <rect x={0} y={0} width={W} height={H} fill={look.haze} opacity={look.hazeAlpha * 0.25} />
          <Paper strength={paper} />
        </svg>
      </CamProvider>
    </AbsoluteFill>
  );
};
