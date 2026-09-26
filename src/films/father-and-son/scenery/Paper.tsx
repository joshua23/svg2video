import React from 'react';
import { H, W } from '../lib/camera';

/**
 * Paper tooth, charcoal grain and a soft vignette over everything. The grain sits still
 * like the tooth of a sheet of paper, so the drawing moves across it.
 */
export const Paper: React.FC<{ strength?: number; tint?: string }> = ({ strength = 1, tint = '#3a2a18' }) => {
  const seed = 2;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={seed} result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values={`0 0 0 0 0.23  0 0 0 0 0.17  0 0 0 0 0.1  0 0 0 ${0.32 * strength} ${-0.12 * strength}`}
          />
        </filter>
        <filter id="paper-fibre" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves={3} seed={3} result="n" />
          <feColorMatrix in="n" type="matrix" values={`0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.12  0 0 0 ${0.5 * strength} ${-0.18 * strength}`} />
        </filter>
        <radialGradient id="paper-vignette" cx="50%" cy="48%" r="75%">
          <stop offset="0.55" stopColor={tint} stopOpacity={0} />
          <stop offset="1" stopColor={tint} stopOpacity={0.42 * strength} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} filter="url(#paper-fibre)" />
      <rect x={0} y={0} width={W} height={H} filter="url(#paper-grain)" />
      <rect x={0} y={0} width={W} height={H} fill="url(#paper-vignette)" />
    </g>
  );
};
