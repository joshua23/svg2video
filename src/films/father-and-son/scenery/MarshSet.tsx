import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Cam, CamProvider, H, Layer, W, project } from '../lib/camera';
import { Look } from '../lib/look';
import { f1, mix, rng } from '../lib/math';
import { M } from '../lib/stage';
import { Boat } from '../rig/Boat';
import { Hills, Sky, useSvgId } from './Land';
import { Paper } from './Paper';
import { ReedClump } from './Reeds';

/** Ground line of the dried riverbed. */
export const MG = 780;
export const OLD_BOAT = { x: 700, y: MG + 16, rot: -5 };

const Ground: React.FC<{ look: Look }> = ({ look }) => {
  const id = useSvgId('mud');
  const far = mix(look.road, look.haze, 0.35);
  const near = mix(look.slopeTop, look.slopeBottom, 0.35);
  const r = rng(61);
  const cracks: string[] = [];
  for (let i = 0; i < 70; i++) {
    let x = -1400 + r() * 5200;
    let y = MG + 30 + Math.pow(r(), 0.8) * 520;
    const seg = [`M${f1(x)} ${f1(y)}`];
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 90;
      y += (r() - 0.3) * 26;
      seg.push(`L${f1(x)} ${f1(y)}`);
    }
    cracks.push(seg.join(''));
  }
  const puddles = Array.from({ length: 9 }, (_, i) => ({ x: -800 + i * 520 + r() * 200, y: MG - 60 + r() * 40, w: 60 + r() * 120 }));
  return (
    <g>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="470" x2="0" y2="1250">
          <stop offset="0" stopColor={far} />
          <stop offset="0.35" stopColor={mix(far, near, 0.6)} />
          <stop offset="1" stopColor={near} />
        </linearGradient>
      </defs>
      <rect x={-3000} y={470} width={9000} height={1400} fill={`url(#${id})`} />
      {puddles.map((p, i) => (
        <ellipse key={i} cx={f1(p.x)} cy={f1(p.y)} rx={f1(p.w)} ry={f1(p.w * 0.05)} fill={look.skyLow} opacity={0.55} />
      ))}
      <path d={cracks.join('')} stroke={look.ink} strokeWidth={1.1} fill="none" opacity={0.28} />
    </g>
  );
};

/** The mud that has swallowed the old sampan's belly. */
const Mound: React.FC<{ look: Look }> = ({ look }) => {
  const c = mix(mix(look.road, look.haze, 0.35), mix(look.slopeTop, look.slopeBottom, 0.35), 0.62);
  const { x, y } = OLD_BOAT;
  return <path d={`M${x - 230} ${y + 40}Q${x - 190} ${y - 22} ${x - 60} ${y - 18}Q${x + 80} ${y - 12} ${x + 190} ${y - 26}Q${x + 250} ${y - 10} ${x + 280} ${y + 40}Z`} fill={c} />;
};

/** The sampan, decades on: hull split, awning fallen to a few bare ribs, the oar in the mud. */
export const OldBoat: React.FC<{ ink: string; t: number }> = ({ ink }) => {
  const { x, y, rot } = OLD_BOAT;
  const m = M;
  const p = (a: number, b: number) => `${f1(a * m)} ${f1(b * m)}`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M${p(-0.3, -0.33)}C${p(-0.32, -0.95)} ${p(0.45, -1.05)} ${p(0.62, -0.62)}M${p(0.1, -0.33)}C${p(0.12, -0.8)} ${p(0.7, -0.9)} ${p(0.92, -0.35)}M${p(0.55, -0.33)}L${p(0.75, -0.7)}`} stroke={ink} strokeWidth={f1(0.045 * m)} fill="none" strokeLinecap="round" />
      <Boat x={0} y={0} m={m} color={ink} oar={false} awning={false} />
      <path d={`M${p(2.5, 0.5)}L${p(3.9, 0.36)}M${p(3.9, 0.36)}l${p(0.35, -0.02)}`} stroke={ink} strokeWidth={f1(0.05 * m)} strokeLinecap="round" />
    </g>
  );
};

export interface MarshProps {
  look: Look;
  t: number;
  cam: Cam;
  wind?: number;
  /** Actors drawn behind the old boat's near side (i.e. inside it). */
  inBoat?: (ink: string, shadow: boolean) => React.ReactNode;
  /** Actors standing on the mud in front of everything. */
  actors?: (ink: string, shadow: boolean) => React.ReactNode;
  /** 0..1 — the midground reeds thin out toward the right. */
  bloom?: number;
  paper?: number;
  front?: React.ReactNode;
}

export const MarshSet: React.FC<MarshProps> = ({ look, t, cam, wind = 0.35, inBoat, actors, bloom = 0, paper = 1, front }) => {
  const kx = look.shadowKx;
  const ky = look.shadowKy;
  const plume = mix(look.haze, look.road, 0.4);
  const reedInk = mix(look.ink, look.hillNear, 0.35);
  const mass = mix(look.hillNear, look.ink, 0.2);
  const shadowT = `translate(0 ${MG}) matrix(1 0 ${f1(-kx * 100) / 100} ${f1(-ky * 100) / 100} 0 0) translate(0 ${-MG})`;
  const sun = project(cam, { x: look.sunX, y: look.sunY }, 0.03);
  const bid = useSvgId('bloom');
  return (
    <AbsoluteFill>
      <CamProvider value={cam}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          <Sky look={look} t={t} />
          <Hills look={look} />
          <Layer p={0.22}>
            <ReedClump x0={-2600} x1={5200} y={500} t={t} wind={wind} color={mix(look.hillNear, look.ink, 0.25)} plume={plume} h={46} seed={5} density={1.4} w={1} mass={mix(look.hillFar, look.hillNear, 0.5)} />
          </Layer>
          <Layer p={1}>
            <Ground look={look} />
          </Layer>
          <Layer p={0.6}>
            <ReedClump x0={-1500} x1={-250} y={640} t={t} wind={wind} color={reedInk} plume={plume} h={170} seed={11} mass={mass} />
            <ReedClump x0={120} x1={1180} y={640} t={t} wind={wind} color={reedInk} plume={plume} h={190} seed={12} mass={mass} />
            <ReedClump x0={1480} x1={1960} y={646} t={t} wind={wind} color={reedInk} plume={plume} h={130} seed={13} density={0.6} mass={mass} />
            <ReedClump x0={2550} x1={2850} y={650} t={t} wind={wind} color={reedInk} plume={plume} h={90} seed={14} density={0.4} mass={mass} />
          </Layer>
          <Layer p={1}>
            {look.shadowAlpha > 0.02 && (
              <g transform={shadowT} opacity={look.shadowAlpha}>
                <OldBoat ink={look.shadow} t={t} />
                {inBoat?.(look.shadow, true)}
                {actors?.(look.shadow, true)}
              </g>
            )}
            {inBoat?.(look.ink, false)}
            <OldBoat ink={look.ink} t={t} />
            <Mound look={look} />
            {actors?.(look.ink, false)}
          </Layer>
          <Layer p={1.35}>
            <ReedClump x0={-900} x1={40} y={1010} t={t} wind={wind} color={look.ink} plume={mix(look.ink, plume, 0.5)} h={560} seed={21} density={0.55} w={2.6} />
            <ReedClump x0={1600} x1={2050} y={1020} t={t} wind={wind} color={look.ink} plume={mix(look.ink, plume, 0.5)} h={460} seed={22} density={0.45} w={2.6} />
          </Layer>
          <defs>
            <radialGradient id={bid} gradientUnits="userSpaceOnUse" cx={f1(sun.x)} cy={f1(sun.y)} r={1500}>
              <stop offset="0" stopColor="#fffaf0" stopOpacity={1} />
              <stop offset="0.5" stopColor="#fff6e2" stopOpacity={0.8} />
              <stop offset="1" stopColor={look.haze} stopOpacity={0.5} />
            </radialGradient>
          </defs>
          {front}
          <rect x={0} y={0} width={W} height={H} fill={look.haze} opacity={look.hazeAlpha * 0.25} />
          {bloom > 0 && <rect x={0} y={0} width={W} height={H} fill={`url(#${bid})`} opacity={bloom} />}
          <Paper strength={paper} />
        </svg>
      </CamProvider>
    </AbsoluteFill>
  );
};
