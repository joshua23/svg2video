import React from 'react';
import { accent } from '../theme';
import { dash, hatch, prog, stag, useBeat } from '../kit';

/** 城楼 — a Ming gate tower in elevation: wall, three arches, double-eave pavilion. */
export const GateTower: React.FC<{ x: number; y: number; s?: number; at?: number; len?: number }> = ({ x, y, s = 1, at = 0, len = 70 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, len, 'inout');
  const q = (i: number, n = 12) => dash(stag(p, i, n));
  const W = 900;
  const wallH = 260;
  const top = -wallH;
  const eave = (yy: number, half: number, lift: number) =>
    `M${-half - 60} ${yy - lift} Q${-half + 40} ${yy + 6} ${-half + 140} ${yy} L${half - 140} ${yy} Q${half - 40} ${yy + 6} ${half + 60} ${yy - lift}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2}>
      {/* ground + wall */}
      <line x1={-W / 2 - 200} y1={0} x2={W / 2 + 200} y2={0} {...q(0)} />
      <path d={`M${-W / 2} 0 L${-W / 2 + 40} ${top} L${W / 2 - 40} ${top} L${W / 2} 0`} {...q(1)} />
      <path d={`M${-W / 2} 0 L${-W / 2 + 40} ${top} L${W / 2 - 40} ${top} L${W / 2} 0 Z`} fill={hatch(mode)} stroke="none" opacity={stag(p, 3, 12) * 0.35} />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={-W / 2 + 10 + i * 4.4} y1={-i * 29} x2={W / 2 - 10 - i * 4.4} y2={-i * 29} strokeWidth={0.8} opacity={0.35 * stag(p, 2, 12)} />
      ))}
      {[-260, 0, 260].map((cx, i) => {
        const w = i === 1 ? 130 : 96;
        const h = i === 1 ? 170 : 130;
        return (
          <g key={cx}>
            <path d={`M${cx - w / 2} 0 L${cx - w / 2} ${-h + w / 2} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${-h + w / 2} L${cx + w / 2} 0`} {...q(2 + i * 0.3)} />
            <path d={`M${cx - w / 2} 0 L${cx - w / 2} ${-h + w / 2} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${-h + w / 2} L${cx + w / 2} 0 Z`} fill="currentColor" stroke="none" opacity={0.75 * stag(p, 5, 12)} />
          </g>
        );
      })}
      {/* crenellations */}
      {Array.from({ length: 22 }, (_, i) => {
        const cx = -W / 2 + 60 + i * ((W - 120) / 21);
        return <rect key={i} x={cx - 12} y={top - 26} width={24} height={26} strokeWidth={1.4} {...q(3)} />;
      })}
      {/* platform */}
      <rect x={-330} y={top - 40} width={660} height={14} {...q(4)} />
      {/* lower storey columns */}
      {Array.from({ length: 10 }, (_, i) => {
        const cx = -290 + i * (580 / 9);
        return <line key={i} x1={cx} y1={top - 40} x2={cx} y2={top - 140} {...q(5)} />;
      })}
      <line x1={-300} y1={top - 140} x2={300} y2={top - 140} {...q(5)} />
      {Array.from({ length: 9 }, (_, i) => {
        const cx = -290 + (i + 0.5) * (580 / 9);
        return <rect key={i} x={cx - 18} y={top - 128} width={36} height={70} strokeWidth={1} {...q(6)} />;
      })}
      {/* lower eave */}
      <path d={eave(top - 150, 390, 34)} strokeWidth={2.4} {...q(6)} />
      <path d={`M-330 ${top - 150} L-250 ${top - 205} L250 ${top - 205} L330 ${top - 150}`} {...q(7)} />
      <path d={`M-330 ${top - 150} L-250 ${top - 205} L250 ${top - 205} L330 ${top - 150} Z`} fill={hatch(mode)} stroke="none" opacity={0.6 * stag(p, 9, 12)} />
      {/* upper storey */}
      {Array.from({ length: 8 }, (_, i) => {
        const cx = -220 + i * (440 / 7);
        return <line key={i} x1={cx} y1={top - 205} x2={cx} y2={top - 290} {...q(8)} />;
      })}
      <line x1={-230} y1={top - 290} x2={230} y2={top - 290} {...q(8)} />
      <path d={eave(top - 300, 310, 40)} strokeWidth={2.4} {...q(9)} />
      <path d={`M-300 ${top - 300} Q-180 ${top - 350} -120 ${top - 400} L120 ${top - 400} Q180 ${top - 350} 300 ${top - 300}`} {...q(10)} />
      <path d={`M-300 ${top - 300} Q-180 ${top - 350} -120 ${top - 400} L120 ${top - 400} Q180 ${top - 350} 300 ${top - 300} Z`} fill={hatch(mode)} stroke="none" opacity={0.6 * stag(p, 11, 12)} />
      <line x1={-150} y1={top - 404} x2={150} y2={top - 404} strokeWidth={4} {...q(11)} />
      <path d={`M-150 ${top - 404} q-14 -30 -36 -28 M150 ${top - 404} q14 -30 36 -28`} strokeWidth={3} {...q(11)} />
      {/* plaque */}
      <rect x={-40} y={top - 280} width={80} height={46} {...q(10)} stroke={accent(mode)} />
    </g>
  );
};

/** 龙椅 — a throne on a stepped dais before a screen. */
export const Throne: React.FC<{ x: number; y: number; s?: number; at?: number }> = ({ x, y, s = 1, at = 0 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 40, 'inout');
  const q = (i: number) => dash(stag(p, i, 9));
  const curl = (cx: number, cy: number, dir: number) => `M${cx} ${cy} q${dir * 40} -10 ${dir * 44} -44 q2 -26 -22 -26 q-18 2 -14 22`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.2}>
      {/* screen */}
      {[-3, -2, -1, 0, 1, 2].map((k) => (
        <rect key={k} x={k * 110} y={-640} width={110} height={420} strokeWidth={1.4} {...q(0)} />
      ))}
      {[-3, -2, -1, 0, 1, 2].map((k) => (
        <path key={k} d={`M${k * 110 + 20} -520 q35 -40 70 0 q-35 40 -70 0 M${k * 110 + 55} -420 l0 120`} strokeWidth={1} opacity={0.6 * stag(p, 1, 9)} />
      ))}
      {/* dais */}
      {[0, 1, 2].map((k) => (
        <rect key={k} x={-420 + k * 50} y={-60 - k * 50} width={840 - k * 100} height={50} {...q(2 + k * 0.4)} />
      ))}
      <rect x={-420} y={-60} width={840} height={50} fill={hatch(mode)} stroke="none" opacity={0.5 * stag(p, 4, 9)} />
      {/* seat + back */}
      <path d="M-200 -160 L-200 -300 L200 -300 L200 -160" {...q(4)} />
      <path d="M-230 -300 L230 -300 L230 -330 L-230 -330 Z" {...q(4)} />
      <path d="M-230 -330 L-230 -330 L230 -330 L230 -330 Z" fill={hatch(mode)} stroke="none" opacity={0.6 * stag(p, 6, 9)} />
      <path d="M-170 -330 L-170 -560 Q0 -600 170 -560 L170 -330" {...q(5)} />
      <path d="M-170 -330 L-170 -560 Q0 -600 170 -560 L170 -330 Z" fill={hatch(mode)} stroke="none" opacity={0.35 * stag(p, 6, 9)} />
      <path d={curl(-170, -560, -1)} strokeWidth={3} {...q(6)} />
      <path d={curl(170, -560, 1)} strokeWidth={3} {...q(6)} />
      {/* armrests */}
      <path d="M-200 -330 L-270 -330 L-270 -420 Q-270 -450 -240 -440" {...q(7)} />
      <path d="M200 -330 L270 -330 L270 -420 Q270 -450 240 -440" {...q(7)} />
      {/* dragon medallion */}
      <circle cx={0} cy={-460} r={56} stroke={accent(mode)} strokeWidth={3} {...q(8)} />
      <path d="M-30 -470 q15 -30 30 0 q15 30 30 0 M-36 -440 q36 20 72 0" stroke={accent(mode)} strokeWidth={2} {...q(8)} />
    </g>
  );
};

/** A hanging scroll with columns of verse and a brush. */
export const Scroll: React.FC<{ x: number; y: number; s?: number; at?: number }> = ({ x, y, s = 1, at = 0 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 36, 'inout');
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2}>
      <line x1={-190} y1={-300} x2={190} y2={-300} strokeWidth={6} {...dash(stag(p, 0, 5))} />
      <rect x={-160} y={-300} width={320} height={560 * stag(p, 1, 5)} />
      <line x1={-190} y1={-300 + 560 * stag(p, 1, 5)} x2={190} y2={-300 + 560 * stag(p, 1, 5)} strokeWidth={6} />
      {Array.from({ length: 5 }, (_, c) =>
        Array.from({ length: 7 }, (_, r) => (
          <line key={`${c}-${r}`} x1={100 - c * 50} y1={-250 + r * 62} x2={100 - c * 50 + (r % 2 ? 6 : -4)} y2={-212 + r * 62} strokeWidth={5} opacity={stag(p, 2 + (c * 7 + r) / 20, 5) * 0.85} />
        )),
      )}
      <rect x={-130} y={170} width={34} height={34} fill={accent(mode)} stroke="none" opacity={stag(p, 4, 5)} />
      <g transform={`translate(230 ${-40 + Math.sin(f / 10) * 6}) rotate(28)`} opacity={stag(p, 3, 5)}>
        <rect x={-8} y={-190} width={16} height={260} />
        <path d="M-10 70 Q0 140 0 150 Q0 140 10 70 Z" fill="currentColor" />
      </g>
    </g>
  );
};

/** 高炉 — a blast furnace with stoves and a molten glow at its base. */
export const Furnace: React.FC<{ x: number; y: number; s?: number; at?: number; glow?: boolean }> = ({ x, y, s = 1, at = 0, glow = true }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 50, 'inout');
  const q = (i: number) => dash(stag(p, i, 10));
  const flick = 0.8 + Math.sin(f / 3) * 0.1 + Math.sin(f / 7) * 0.1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2}>
      <line x1={-460} y1={0} x2={460} y2={0} {...q(0)} />
      {/* furnace body */}
      <path d="M-110 0 L-140 -150 L-90 -420 L-60 -520 L60 -520 L90 -420 L140 -150 L110 0" {...q(1)} />
      <path d="M-110 0 L-140 -150 L-90 -420 L-60 -520 L60 -520 L90 -420 L140 -150 L110 0 Z" fill={hatch(mode)} stroke="none" opacity={0.45 * stag(p, 4, 10)} />
      {[-150, -260, -350, -420].map((yy, i) => (
        <line key={yy} x1={-140 + i * 12 + (i > 1 ? 8 : 0)} y1={yy} x2={140 - i * 12 - (i > 1 ? 8 : 0)} y2={yy} strokeWidth={1.4} {...q(2)} />
      ))}
      <rect x={-40} y={-600} width={80} height={80} {...q(3)} />
      <path d="M40 -580 L190 -580 L190 -140" {...q(4)} />
      {/* stoves */}
      {[260, 380].map((cx, i) => (
        <g key={cx}>
          <path d={`M${cx - 45} 0 L${cx - 45} -300 A45 45 0 0 1 ${cx + 45} -300 L${cx + 45} 0`} {...q(5 + i)} />
          {[-80, -160, -240].map((yy) => (
            <line key={yy} x1={cx - 45} y1={yy} x2={cx + 45} y2={yy} strokeWidth={1} {...q(6 + i)} />
          ))}
        </g>
      ))}
      <path d="M140 -120 L215 -120 M305 -120 L335 -120" {...q(7)} />
      {/* chimney */}
      <path d="M-300 0 L-280 -640 L-240 -640 L-220 0" {...q(5)} />
      {/* tap hole + molten iron */}
      <path d="M-40 0 L-40 -60 L40 -60 L40 0" {...q(8)} />
      {glow && (
        <g stroke="none" opacity={stag(p, 8, 10) * flick}>
          <ellipse cx={0} cy={-20} rx={60} ry={30} fill={accent(mode)} opacity={0.9} />
          <ellipse cx={0} cy={-20} rx={160} ry={90} fill={accent(mode)} opacity={0.18} />
          <path d="M40 -10 Q120 -4 200 6 L200 12 Q120 6 40 4 Z" fill={accent(mode)} />
        </g>
      )}
    </g>
  );
};
