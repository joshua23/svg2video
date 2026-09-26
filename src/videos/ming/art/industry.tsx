import React from 'react';
import { accent, F } from '../theme';
import { dash, hatch, hatchDense, prog, rng, stag, useBeat } from '../kit';
import { MADDISON } from '../timeline';

const txt = (size: number, weight = 700): React.CSSProperties => ({ fontFamily: F.serif, fontWeight: weight, fontSize: size, letterSpacing: '0.12em' });

/** 煤 — a heap of faceted coal lumps with a pick. */
export const Coal: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 30, 'inout');
  const r = rng(1709);
  const lumps = Array.from({ length: 16 }, (_, i) => {
    const row = i < 7 ? 0 : i < 12 ? 1 : i < 15 ? 2 : 3;
    const inRow = [7, 5, 3, 1][row];
    const k = i - [0, 7, 12, 15][row];
    const cx = (k - (inRow - 1) / 2) * 110 + (r() - 0.5) * 20;
    const cy = -row * 80 - 40;
    const pts = Array.from({ length: 7 }, (_, j) => {
      const t = (j / 7) * Math.PI * 2 + r() * 0.4;
      const rr = 48 + r() * 18;
      return `${(cx + Math.cos(t) * rr).toFixed(1)},${(cy + Math.sin(t) * rr * 0.8).toFixed(1)}`;
    });
    return { pts: pts.join(' '), cx, cy, dense: r() > 0.5 };
  });
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2}>
      <line x1={-480} y1={0} x2={480} y2={0} {...dash(p)} />
      {lumps.map((l, i) => (
        <g key={i}>
          <polygon points={l.pts} fill={l.dense ? hatchDense(mode) : hatch(mode)} stroke="none" opacity={0.8 * stag(p, i, 16)} />
          <polygon points={l.pts} {...dash(stag(p, i, 16))} />
          <line x1={l.cx - 20} y1={l.cy - 10} x2={l.cx + 14} y2={l.cy + 18} strokeWidth={1} opacity={0.6 * stag(p, i, 16)} />
        </g>
      ))}
      <g transform="translate(360 -250) rotate(-30)" opacity={stag(p, 15, 16)}>
        <line x1={0} y1={0} x2={0} y2={260} strokeWidth={6} />
        <path d="M-120 20 Q0 -40 120 20" strokeWidth={8} />
      </g>
    </g>
  );
};

/** 瓦特蒸汽机 — a beam engine with a turning flywheel. */
export const BeamEngine: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 34, 'inout');
  const q = (i: number) => dash(stag(p, i, 9));
  const th = f * 0.09;
  const rock = Math.sin(th) * 0.16;
  const beamL = 300;
  const endL = { x: -beamL * Math.cos(rock), y: -520 - beamL * Math.sin(rock) };
  const endR = { x: beamL * Math.cos(rock), y: -520 + beamL * Math.sin(rock) };
  const wx = 330;
  const wy = -220;
  const crank = { x: wx + Math.cos(th) * 90, y: wy + Math.sin(th) * 90 };
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.2}>
      <line x1={-520} y1={0} x2={620} y2={0} {...q(0)} />
      {/* engine house wall */}
      <path d="M-60 0 L-60 -500 L60 -500 L60 0" {...q(1)} />
      <path d="M-60 0 L-60 -500 L60 -500 L60 0 Z" fill={hatch(mode)} stroke="none" opacity={0.5 * stag(p, 3, 9)} />
      {/* beam */}
      <line x1={endL.x} y1={endL.y} x2={endR.x} y2={endR.y} strokeWidth={14} {...q(2)} />
      <circle cx={0} cy={-520} r={16} {...q(2)} fill="currentColor" />
      {/* cylinder + piston rod */}
      <rect x={-360} y={-330} width={120} height={330} {...q(3)} />
      <rect x={-360} y={-330} width={120} height={330} fill={hatchDense(mode)} stroke="none" opacity={0.5 * stag(p, 5, 9)} />
      <line x1={-300} y1={-330} x2={endL.x} y2={endL.y} strokeWidth={5} {...q(4)} />
      {/* boiler */}
      <path d="M-500 0 L-500 -120 A60 60 0 0 1 -380 -120 L-380 0" {...q(4)} />
      <path d="M-380 -80 L-360 -80" {...q(5)} />
      {/* connecting rod + flywheel */}
      <line x1={endR.x} y1={endR.y} x2={crank.x} y2={crank.y} strokeWidth={5} {...q(5)} />
      <circle cx={wx} cy={wy} r={210} strokeWidth={10} {...q(6)} />
      <circle cx={wx} cy={wy} r={190} strokeWidth={1.2} {...q(6)} />
      {Array.from({ length: 8 }, (_, i) => {
        const t = th + (i / 8) * Math.PI * 2;
        return <line key={i} x1={wx} y1={wy} x2={wx + Math.cos(t) * 200} y2={wy + Math.sin(t) * 200} strokeWidth={4} {...q(7)} />;
      })}
      <circle cx={wx} cy={wy} r={24} fill="currentColor" {...q(7)} />
      <path d={`M${wx - 60} 0 L${wx} ${wy} L${wx + 60} 0`} {...q(8)} />
      {/* governor */}
      <g opacity={stag(p, 8, 9)} transform={`translate(-150 -420)`}>
        <line x1={0} y1={0} x2={0} y2={-80} />
        <line x1={0} y1={-80} x2={-40 - Math.sin(th * 2) * 8} y2={-30} />
        <line x1={0} y1={-80} x2={40 + Math.sin(th * 2) * 8} y2={-30} />
        <circle cx={-40 - Math.sin(th * 2) * 8} cy={-30} r={12} fill={accent(mode)} stroke="none" />
        <circle cx={40 + Math.sin(th * 2) * 8} cy={-30} r={12} fill={accent(mode)} stroke="none" />
      </g>
    </g>
  );
};

/** 纱厂 — a water-powered, many-windowed mill with a chimney. */
export const Mill: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 34, 'inout');
  const q = (i: number) => dash(stag(p, i, 8));
  const W = 700;
  const floors = 5;
  const cols = 12;
  const wheel = f * 0.05;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2}>
      <line x1={-560} y1={0} x2={560} y2={0} {...q(0)} />
      <path d={`M${-W / 2} 0 L${-W / 2} -440 L${W / 2} -440 L${W / 2} 0`} {...q(1)} />
      <path d={`M${-W / 2 - 20} -440 L0 -520 L${W / 2 + 20} -440`} {...q(2)} />
      <path d={`M${-W / 2 - 20} -440 L0 -520 L${W / 2 + 20} -440 Z`} fill={hatchDense(mode)} stroke="none" opacity={0.6 * stag(p, 4, 8)} />
      {Array.from({ length: floors * cols }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const wx = -W / 2 + 30 + c * ((W - 60) / cols);
        const wy = -410 + r * 82;
        const lit = mode === 'dark' || (r + c) % 5 === 0;
        return (
          <rect key={i} x={wx} y={wy} width={34} height={50} strokeWidth={1.2} fill={lit && stag(p, 5, 8) > 0.5 ? accent(mode) : 'none'} fillOpacity={0.35} {...dash(stag(p, 3 + (i / (floors * cols)) * 3, 8))} />
        );
      })}
      {/* chimney + smoke */}
      <path d="M420 0 L440 -700 L490 -700 L510 0" {...q(2)} />
      {Array.from({ length: 5 }, (_, i) => {
        const life = ((f / 60 + i / 5) % 1);
        return <circle key={i} cx={465 + life * 160} cy={-730 - life * 180} r={20 + life * 60} strokeWidth={1.2} opacity={(1 - life) * 0.7 * stag(p, 6, 8)} />;
      })}
      {/* water wheel */}
      <g transform={`translate(${-W / 2 - 110} -120)`} opacity={stag(p, 6, 8)}>
        <circle r={120} strokeWidth={4} />
        <circle r={100} strokeWidth={1} />
        {Array.from({ length: 12 }, (_, i) => {
          const t = wheel + (i / 12) * Math.PI * 2;
          return <line key={i} x1={0} y1={0} x2={Math.cos(t) * 120} y2={Math.sin(t) * 120} strokeWidth={2} />;
        })}
        <path d="M-200 110 Q-100 90 0 110 T200 110" strokeWidth={1.4} />
      </g>
    </g>
  );
};

/** 机车 — an early locomotive with turning wheels and puffing smoke. */
export const Locomotive: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 30, 'inout');
  const q = (i: number) => dash(stag(p, i, 8));
  const th = f * 0.18;
  const wheel = (cx: number, r: number, k: number) => (
    <g key={cx}>
      <circle cx={cx} cy={-r} r={r} strokeWidth={4} {...q(k)} />
      {Array.from({ length: 10 }, (_, i) => {
        const t = th + (i / 10) * Math.PI * 2;
        return <line key={i} x1={cx} y1={-r} x2={cx + Math.cos(t) * r} y2={-r + Math.sin(t) * r} strokeWidth={1.5} {...q(k)} />;
      })}
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.2}>
      <line x1={-700} y1={0} x2={700} y2={0} strokeWidth={3} {...q(0)} />
      {Array.from({ length: 28 }, (_, i) => {
        const tx = -700 + ((i * 52 - f * 6) % 1456 + 1456) % 1456;
        return <line key={i} x1={tx} y1={6} x2={tx + 30} y2={6} strokeWidth={5} opacity={p} />;
      })}
      <rect x={-380} y={-300} width={440} height={170} rx={70} {...q(1)} />
      <rect x={-380} y={-300} width={440} height={170} rx={70} fill={hatch(mode)} stroke="none" opacity={0.5 * stag(p, 3, 8)} />
      {[-300, -180, -60].map((bx) => (
        <line key={bx} x1={bx} y1={-300} x2={bx} y2={-130} strokeWidth={1.2} {...q(2)} />
      ))}
      <path d="M-340 -300 L-360 -470 L-280 -470 L-300 -300" {...q(2)} />
      <path d="M-380 -470 L-260 -470" strokeWidth={6} {...q(2)} />
      <path d="M-120 -300 Q-100 -350 -80 -300" {...q(3)} />
      <path d="M60 -130 L60 -380 L250 -380 L250 -130 Z" {...q(3)} />
      <rect x={100} y={-340} width={110} height={90} {...q(4)} />
      <path d="M40 -392 L270 -392" strokeWidth={6} {...q(4)} />
      {wheel(-280, 70, 5)}
      {wheel(-100, 70, 5)}
      {wheel(150, 110, 6)}
      <line x1={-280 + Math.cos(th) * 40} y1={-70 + Math.sin(th) * 40} x2={150 + Math.cos(th) * 60} y2={-110 + Math.sin(th) * 60} strokeWidth={6} {...q(6)} />
      {/* tender */}
      <path d="M300 -60 L300 -260 L620 -260 L620 -60 Z" {...q(7)} />
      <path d="M300 -60 L300 -260 L620 -260 L620 -60 Z" fill={hatchDense(mode)} stroke="none" opacity={0.4 * stag(p, 7, 8)} />
      {wheel(380, 55, 7)}
      {wheel(540, 55, 7)}
      {Array.from({ length: 6 }, (_, i) => {
        const life = ((f / 45 + i / 6) % 1);
        return <circle key={i} cx={-320 + life * 420} cy={-500 - life * 120} r={24 + life * 70} strokeWidth={1.3} opacity={(1 - life) * 0.8 * p} />;
      })}
    </g>
  );
};

/** 复仇女神号 — an iron steam warship firing broadside. */
export const Warship: React.FC<{ x: number; y: number; s?: number; at?: number }> = ({ x, y, s = 1, at = 0 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 40, 'inout');
  const q = (i: number) => dash(stag(p, i, 8));
  const bob = Math.sin(f / 16) * 5;
  const a = accent(mode);
  const flashes = [0, 1, 2, 3, 4].map((i) => {
    const t = f - at - 44 - i * 7;
    return t >= 0 && t < 14 ? 1 - t / 14 : 0;
  });
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${s})`} strokeWidth={2.2}>
      <path d="M-560 -40 L520 -40 Q560 -40 600 -80 L580 20 Q540 60 480 60 L-500 60 Q-560 40 -560 -40 Z" {...q(0)} />
      <path d="M-560 -40 L520 -40 Q560 -40 600 -80 L580 20 Q540 60 480 60 L-500 60 Q-560 40 -560 -40 Z" fill={hatchDense(mode)} stroke="none" opacity={0.55 * stag(p, 2, 8)} />
      {/* paddle box */}
      <path d="M-120 -40 A110 110 0 0 1 100 -40" strokeWidth={3} {...q(1)} />
      {Array.from({ length: 9 }, (_, i) => {
        const t = Math.PI + (i / 8) * Math.PI;
        return <line key={i} x1={-10} y1={-40} x2={-10 + Math.cos(t) * 100} y2={-40 + Math.sin(t) * 100} strokeWidth={1} {...q(2)} />;
      })}
      {/* funnel + smoke */}
      <path d="M-40 -150 L-30 -330 L20 -330 L30 -150" {...q(2)} />
      {Array.from({ length: 6 }, (_, i) => {
        const life = ((f / 70 + i / 6) % 1);
        return <circle key={i} cx={-5 - life * 380} cy={-360 - life * 90} r={20 + life * 80} strokeWidth={1.2} opacity={(1 - life) * 0.7 * p} />;
      })}
      {/* masts + rigging */}
      {[-360, 300].map((mx, i) => (
        <g key={mx}>
          <line x1={mx} y1={-40} x2={mx} y2={-560} strokeWidth={3} {...q(3 + i)} />
          <line x1={mx - 150} y1={-420} x2={mx + 150} y2={-420} {...q(4 + i)} />
          <line x1={mx - 110} y1={-300} x2={mx + 110} y2={-300} {...q(4 + i)} />
          <g opacity={0.6}><path d={`M${mx} -560 L${mx - 260} -40 M${mx} -560 L${mx + 240} -40`} strokeWidth={1} {...q(5 + i)} /></g>
        </g>
      ))}
      {/* gun ports + flashes */}
      {[-440, -300, 180, 320, 440].map((gx, i) => (
        <g key={gx}>
          <rect x={gx - 14} y={-20} width={28} height={20} {...q(6)} />
          <g stroke="none" opacity={flashes[i]}>
            <circle cx={gx - 40} cy={-10} r={40 + (1 - flashes[i]) * 60} fill={a} opacity={0.35} />
            <circle cx={gx - 30} cy={-10} r={18} fill="#fff1c7" />
          </g>
        </g>
      ))}
      <path d="M-700 90 Q-650 75 -600 90 T-500 90 T-400 90 T-300 90 T-200 90 T-100 90 T0 90 T100 90 T200 90 T300 90 T400 90 T500 90 T600 90 T700 90" strokeWidth={1.4} {...q(7)} />
    </g>
  );
};

/** 分岔 — two paths leaving the same point (schematic). */
export const DivergeChart: React.FC<{ x: number; y: number; w?: number; h?: number }> = ({ x, y, w = 1000, h = 520 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 6, 70, 'inout');
  const a = accent(mode);
  const west = `M0 ${h * 0.72} C${w * 0.35} ${h * 0.72}, ${w * 0.55} ${h * 0.62}, ${w * 0.7} ${h * 0.4} S${w * 0.9} ${h * 0.02}, ${w} 0`;
  const china = `M0 ${h * 0.72} C${w * 0.35} ${h * 0.72}, ${w * 0.55} ${h * 0.74}, ${w * 0.75} ${h * 0.82} S${w * 0.92} ${h * 0.9}, ${w} ${h * 0.92}`;
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={2}>
      <line x1={0} y1={h} x2={w} y2={h} {...dash(prog(f, 0, 20))} />
      <line x1={0} y1={0} x2={0} y2={h} {...dash(prog(f, 0, 20))} />
      {[0.25, 0.5, 0.75].map((k) => (
        <line key={k} x1={0} y1={h * k} x2={w} y2={h * k} strokeWidth={0.8} strokeDasharray="4 8" opacity={0.4 * prog(f, 6, 20)} />
      ))}
      <path d={west} stroke={a} strokeWidth={5} {...dash(p)} />
      <path d={china} strokeWidth={5} {...dash(p)} />
      <circle cx={0} cy={h * 0.72} r={9} fill="currentColor" stroke="none" opacity={prog(f, 4, 10)} />
      <text x={w + 20} y={10} fill={a} stroke="none" style={txt(34, 900)} opacity={prog(f, 60, 16)}>西欧</text>
      <text x={w + 20} y={h * 0.94} fill="currentColor" stroke="none" style={txt(34, 900)} opacity={prog(f, 60, 16)}>中国</text>
      {['1500', '1700', '1800', '1900'].map((t, i) => (
        <text key={t} x={(w / 3) * i} y={h + 40} fill="currentColor" stroke="none" style={{ fontFamily: F.mono, fontSize: 20 }} textAnchor="middle" opacity={prog(f, 8, 16) * 0.8}>{t}</text>
      ))}
      <text x={0} y={-24} fill="currentColor" stroke="none" style={txt(18)} opacity={0.7 * prog(f, 10, 16)}>人均产出 · 示意</text>
    </g>
  );
};

/** 麦迪森 — China's share of world GDP, 1500–1950, with a running figure. */
export const GdpChart: React.FC<{ x: number; y: number; w?: number; h?: number }> = ({ x, y, w = 1000, h = 520 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const data = MADDISON.filter(([yr]) => yr <= 1950);
  const X = (yr: number) => ((yr - 1500) / 450) * w;
  const Y = (v: number) => h - (v / 36) * h;
  const d = data.map(([yr, v], i) => `${i ? 'L' : 'M'}${X(yr).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const p = prog(f, 10, 110, 'inout');
  const cur = 1500 + p * 450;
  let v = data[0][1];
  for (let i = 0; i < data.length - 1; i++) {
    const [y0, v0] = data[i];
    const [y1, v1] = data[i + 1];
    if (cur >= y0 && cur <= y1) v = v0 + ((v1 - v0) * (cur - y0)) / (y1 - y0);
  }
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={2}>
      <line x1={0} y1={h} x2={w} y2={h} {...dash(prog(f, 0, 20))} />
      <line x1={0} y1={0} x2={0} y2={h} {...dash(prog(f, 0, 20))} />
      {[10, 20, 30].map((k) => (
        <g key={k} opacity={prog(f, 4, 16)}>
          <line x1={0} y1={Y(k)} x2={w} y2={Y(k)} strokeWidth={0.8} strokeDasharray="4 8" opacity={0.45} />
          <text x={-16} y={Y(k) + 7} fill="currentColor" stroke="none" textAnchor="end" style={{ fontFamily: F.mono, fontSize: 18 }}>{k}%</text>
        </g>
      ))}
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={hatch(mode)} stroke="none" opacity={0.5} style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }} />
      <path d={d} stroke={a} strokeWidth={5} style={{ clipPath: `inset(-20px ${(1 - p) * 100}% -20px -20px)` }} />
      {data.map(([yr, val]) => (
        <g key={yr} opacity={cur >= yr ? 1 : 0}>
          <circle cx={X(yr)} cy={Y(val)} r={8} fill={a} stroke="none" />
          <text x={X(yr)} y={h + 36} fill="currentColor" stroke="none" textAnchor="middle" style={{ fontFamily: F.mono, fontSize: 18 }}>{yr}</text>
          <text x={X(yr)} y={Y(val) - 20} fill="currentColor" stroke="none" textAnchor="middle" style={{ fontFamily: F.mono, fontSize: 20 }}>{val}</text>
        </g>
      ))}
      <line x1={X(1840)} y1={0} x2={X(1840)} y2={h} stroke={a} strokeWidth={1.5} strokeDasharray="6 6" opacity={cur > 1840 ? 0.8 : 0} />
      <text x={X(1840) + 12} y={24} fill={a} stroke="none" style={txt(20)} opacity={cur > 1840 ? 1 : 0}>1840 鸦片战争</text>
      <text x={w} y={-40} fill={a} stroke="none" textAnchor="end" style={{ fontFamily: F.mono, fontSize: 96 }}>{v.toFixed(1)}%</text>
    </g>
  );
};
