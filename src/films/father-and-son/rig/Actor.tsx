import React from 'react';
import { Vec, f1 } from '../lib/math';
import { Twig } from './Figure';
import { FigureShape } from './Figure';
import { Build, Pose, Skel, fk } from './skeleton';

export interface ActorState {
  b: Build;
  pose?: Pose;
  skel?: Skel;
  x: number;
  /** Only for actors off the crest plane. */
  z?: number;
  elev?: number;
  facing: 1 | -1;
  twig?: 'near' | 'far';
  twigAngle?: number;
  hidden?: boolean;
}

export const skelOf = (a: ActorState): Skel => a.skel ?? fk(a.b, a.pose!);

/** Draw an actor whose origin is at (x, y), optionally scaled (depth). */
export const Actor: React.FC<{ a: ActorState; y: number; x?: number; scale?: number; ink: string; t: number }> = ({ a, y, x, scale = 1, ink, t }) => {
  if (a.hidden) return null;
  const s = skelOf(a);
  const hand: Vec | undefined = a.twig === 'near' ? s.armN.c : a.twig === 'far' ? s.armF.c : undefined;
  return (
    <g transform={`translate(${f1(x ?? a.x)} ${f1(y)}) scale(${(a.facing * scale).toFixed(4)} ${scale.toFixed(4)})`}>
      <FigureShape b={a.b} s={s} color={ink} />
      {hand && <Twig at={hand} angle={a.twigAngle ?? 1.2} length={a.b.H * 0.42} color={ink} sway={Math.sin(t * 2.1) * 0.4} />}
    </g>
  );
};
