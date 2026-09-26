import React from 'react';
import { accent, C, F } from '../theme';
import { dash, hatch, hatchDense, lerp, prog, rng, stag, useBeat } from '../kit';

const serif = (size: number, weight = 900): React.CSSProperties => ({ fontFamily: F.serif, fontWeight: weight, fontSize: size, letterSpacing: '0.1em' });

/** 印 — a cinnabar seal that stamps down with the given characters. */
export const Seal: React.FC<{ x: number; y: number; size?: number; text: string; at?: number; brush?: boolean }> = ({ x, y, size = 300, text, at = 0, brush = true }) => {
  const { f } = useBeat();
  const p = prog(f, at, 10, 'linear');
  const settle = prog(f, at + 10, 14);
  const scale = p < 1 ? lerp(1.9, 1, p * p) : 1 + (1 - settle) * 0.03 * Math.sin(settle * 20);
  const r = rng(text.length * 77);
  const chars = text.split('');
  // Up to four characters read as a single vertical column; longer text wraps into right-to-left columns.
  const cols = chars.length <= 4 ? 1 : Math.ceil(chars.length / 4);
  const perCol = Math.ceil(chars.length / cols);
  const cell = size / 2 - 10;
  const w = cols * cell + 60;
  const h = perCol * cell + 60;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${lerp(-12, -4, p)})`} opacity={p > 0 ? Math.min(1, p * 3) : 0}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={size * 0.05} fill={C.red} stroke="none" />
      <rect x={-w / 2 + 12} y={-h / 2 + 12} width={w - 24} height={h - 24} rx={size * 0.035} stroke={C.paper} strokeWidth={4} fill="none" />
      {chars.map((ch, i) => {
        const c = Math.floor(i / perCol);
        const row = i % perCol;
        const cx = w / 2 - 30 - cell * (c + 0.5);
        const cy = -h / 2 + 30 + cell * (row + 0.5);
        return (
          <text key={i} x={cx} y={cy} fill={C.paper} stroke="none" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: brush ? F.brush : F.serif, fontWeight: brush ? 400 : 900, fontSize: cell * 0.92 }}>
            {ch}
          </text>
        );
      })}
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(r() - 0.5) * w} cy={(r() - 0.5) * h} r={1 + r() * 4} fill={C.paper} stroke="none" opacity={0.5} />
      ))}
    </g>
  );
};

/** 发展阶梯 — a ladder of nations; the late-comer waits at the bottom. */
export const Ladder: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, 0, 50, 'inout');
  const rungs = ['英国', '美国', '德国', '日本', '韩国', '？'];
  const top = -640;
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={3}>
      <line x1={-180} y1={0} x2={-80} y2={top} {...dash(stag(p, 0, 3))} />
      <line x1={180} y1={0} x2={80} y2={top} {...dash(stag(p, 0, 3))} />
      {rungs.map((name, i) => {
        const k = (rungs.length - 1 - i + 0.5) / rungs.length;
        const yy = k * top;
        const half = lerp(180, 80, k);
        const o = stag(p, 1 + (rungs.length - i) / rungs.length, 3);
        const late = name === '？';
        return (
          <g key={name} opacity={o}>
            <line x1={-half} y1={yy} x2={half} y2={yy} strokeWidth={late ? 4 : 3} stroke={late ? a : 'currentColor'} />
            <text x={half + 40} y={yy + 12} fill={late ? a : 'currentColor'} stroke="none" style={serif(34)}>{late ? '后来者' : name}</text>
            <circle cx={0} cy={yy - 30} r={14} fill={late ? a : 'none'} stroke={late ? a : 'currentColor'} strokeWidth={2} />
            <line x1={0} y1={yy - 16} x2={0} y2={yy} strokeWidth={2} stroke={late ? a : 'currentColor'} />
          </g>
        );
      })}
      <text x={-240} y={top + 30} fill="currentColor" stroke="none" textAnchor="end" style={serif(22, 700)} opacity={stag(p, 2, 3)}>先行者</text>
    </g>
  );
};

/** 棋局 — a checkerboard floor in one-point perspective with two pieces. */
export const Chessboard: React.FC<{ at?: number }> = ({ at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 40, 'inout');
  const vx = 960;
  const vy = 380;
  const rows = 9;
  const cols = 16;
  const Y = (t: number) => vy + (1080 - vy) * Math.pow(t, 1.8);
  const X = (c: number, t: number) => vx + (c - cols / 2) * 260 * Math.pow(t, 1.8);
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2) continue;
      const t0 = r / rows;
      const t1 = (r + 1) / rows;
      const d = `M${X(c, t0)} ${Y(t0)} L${X(c + 1, t0)} ${Y(t0)} L${X(c + 1, t1)} ${Y(t1)} L${X(c, t1)} ${Y(t1)} Z`;
      cells.push(<path key={`${r}-${c}`} d={d} fill="currentColor" stroke="none" opacity={0.12 * stag(p, r / rows, 1.4)} />);
    }
  }
  const piece = (px: number, py: number, s: number, king: boolean, col: string) => (
    <g transform={`translate(${px} ${py}) scale(${s})`} stroke={col} strokeWidth={3} opacity={prog(f, at + 26, 16)}>
      <path d="M-50 0 L50 0 L40 -30 L-40 -30 Z" fill={hatch(mode)} />
      <path d="M-30 -30 Q-24 -120 -34 -170 L34 -170 Q24 -120 30 -30" fill={mode === 'dark' ? C.night : C.paper} />
      {king ? <path d="M-30 -170 L30 -170 L20 -200 L-20 -200 Z M0 -200 L0 -240 M-14 -226 L14 -226" /> : <path d="M-38 -170 L-38 -200 L-20 -200 L-20 -186 L-6 -186 L-6 -200 L6 -200 L6 -186 L20 -186 L20 -200 L38 -200 L38 -170" />}
    </g>
  );
  return (
    <g strokeWidth={1.4}>
      {cells}
      {Array.from({ length: cols + 1 }, (_, c) => (
        <g key={c} opacity={0.5}><line x1={X(c, 0)} y1={Y(0)} x2={X(c, 1)} y2={Y(1)} {...dash(p)} /></g>
      ))}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <g key={r} opacity={0.5}><line x1={X(0, r / rows)} y1={Y(r / rows)} x2={X(cols, r / rows)} y2={Y(r / rows)} {...dash(p)} /></g>
      ))}
      <line x1={0} y1={vy} x2={1920} y2={vy} opacity={0.4 * p} />
      <circle cx={vx} cy={vy} r={6} fill={a} stroke="none" opacity={p} />
      {piece(560, 800, 1.3, true, 'currentColor')}
      {piece(1360, 700, 1.0, false, a)}
    </g>
  );
};

/** 锋芒 — a spear that swings from facing outward (西方) to facing inward (同胞). */
export const Spear: React.FC<{ x: number; y: number; at?: number }> = ({ x, y, at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const draw = prog(f, at, 24, 'inout');
  const turn = prog(f, at + 34, 30, 'inout');
  const angle = lerp(0, 180, turn);
  return (
    <g transform={`translate(${x} ${y})`}>
      <text x={560} y={140} fill="currentColor" stroke="none" textAnchor="middle" style={serif(40)} opacity={0.35 + 0.65 * (1 - turn)}>西方</text>
      <text x={-560} y={140} fill={a} stroke="none" textAnchor="middle" style={serif(40)} opacity={turn}>同胞</text>
      <g transform={`rotate(${angle})`} strokeWidth={4}>
        <line x1={-420} y1={0} x2={380} y2={0} {...dash(draw)} />
        <path d="M380 -34 L500 0 L380 34 Q400 0 380 -34 Z" fill={a} stroke={a} opacity={draw} />
        <path d="M-420 -18 L-460 -40 M-420 18 L-460 40 M-400 -18 L-440 -40 M-400 18 L-440 40" strokeWidth={2} opacity={draw} />
        {[330, 350].map((rx) => (
          <line key={rx} x1={rx} y1={-14} x2={rx} y2={14} strokeWidth={3} opacity={draw} />
        ))}
      </g>
    </g>
  );
};

/** 齿轮 — a gear with n teeth. */
export const Gear: React.FC<{ x: number; y: number; r: number; teeth?: number; spin?: number; p?: number }> = ({ x, y, r, teeth = 16, spin = 0, p = 1 }) => {
  const { mode } = useBeat();
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const t0 = (i / teeth) * Math.PI * 2;
    const w = Math.PI / teeth;
    [[t0 - w * 0.5, r], [t0 - w * 0.3, r * 1.14], [t0 + w * 0.3, r * 1.14], [t0 + w * 0.5, r], [t0 + w * 1.5, r]].forEach(([t, rr]) =>
      pts.push(`${(Math.cos(t) * rr).toFixed(1)},${(Math.sin(t) * rr).toFixed(1)}`),
    );
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${spin})`} strokeWidth={3}>
      <polygon points={pts.join(' ')} {...dash(p)} />
      <circle r={r * 0.62} {...dash(p)} />
      <circle r={r * 0.62} fill={hatch(mode)} stroke="none" opacity={0.5 * p} />
      <circle r={r * 0.2} fill="currentColor" stroke="none" opacity={p} />
      {Array.from({ length: 6 }, (_, i) => {
        const t = (i / 6) * Math.PI * 2;
        return <line key={i} x1={Math.cos(t) * r * 0.2} y1={Math.sin(t) * r * 0.2} x2={Math.cos(t) * r * 0.62} y2={Math.sin(t) * r * 0.62} {...dash(p)} />;
      })}
    </g>
  );
};

/** 莲 — a lotus drawn in brush-like curves. */
export const Lotus: React.FC<{ x: number; y: number; s?: number; p?: number }> = ({ x, y, s = 1, p = 1 }) => {
  const { mode } = useBeat();
  const petals = [-60, -35, -12, 12, 35, 60];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={3}>
      {petals.map((deg, i) => (
        <path key={deg} d="M0 0 C-60 -60 -50 -170 0 -230 C50 -170 60 -60 0 0 Z" transform={`rotate(${deg})`} fill={i % 2 ? hatch(mode) : 'none'} {...dash(stag(p, i, 6))} />
      ))}
      <path d="M0 0 C-40 -50 -30 -180 0 -250 C30 -180 40 -50 0 0 Z" {...dash(p)} />
      <path d="M-260 60 Q-130 20 0 40 Q130 60 260 30" strokeWidth={2} {...dash(p)} />
      <path d="M0 40 L0 200" strokeWidth={3} {...dash(p)} />
      <path d="M-240 120 Q-150 70 -60 120 Q-150 160 -240 120 Z" fill={hatch(mode)} {...dash(p)} />
    </g>
  );
};

/** 道路 — a road running to the horizon; the centre line streams toward us. */
export const Road: React.FC<{ at?: number }> = ({ at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 30, 'inout');
  const vx = 1360;
  const vy = 420;
  return (
    <g strokeWidth={2.4}>
      <line x1={940} y1={vy} x2={1920} y2={vy} opacity={0.5 * p} />
      <path d={`M${vx - 6} ${vy} L${vx - 520} 1080`} {...dash(p)} />
      <path d={`M${vx + 6} ${vy} L${vx + 520} 1080`} {...dash(p)} />
      {Array.from({ length: 8 }, (_, i) => {
        const t = ((i / 8 + f / 90) % 1);
        const t2 = Math.min(1, t + 0.05);
        const e = (u: number) => Math.pow(u, 2.2);
        return <line key={i} x1={vx} y1={vy + (1080 - vy) * e(t)} x2={vx} y2={vy + (1080 - vy) * e(t2)} stroke={a} strokeWidth={2 + e(t) * 14} opacity={p} />;
      })}
      {Array.from({ length: 6 }, (_, i) => {
        const t = ((i / 6 + f / 120) % 1);
        const e = Math.pow(t, 2.2);
        const px = vx + 560 * e + 40;
        const py = vy + (1080 - vy) * e;
        return <path key={i} d={`M${px} ${py} L${px} ${py - 220 * e} M${px - 40 * e} ${py - 220 * e} L${px + 40 * e} ${py - 220 * e}`} strokeWidth={1 + e * 3} opacity={p * 0.8} />;
      })}
      <circle cx={vx} cy={vy} r={60} fill="url(#roadSun)" stroke="none" opacity={p} />
      <defs>
        <radialGradient id="roadSun">
          <stop offset="0" stopColor={a} stopOpacity={0.7} />
          <stop offset="1" stopColor={a} stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={`M${vx - 300} ${vy} Q${vx - 150} ${vy - 40} ${vx} ${vy} Q${vx + 200} ${vy - 70} ${vx + 420} ${vy}`} strokeWidth={1.4} fill={hatch(mode)} opacity={p * 0.8} />
    </g>
  );
};

/** 微笑曲线 — value added across the chain; a marker climbs out of the trough. */
export const SmileCurve: React.FC<{ x: number; y: number; w?: number; h?: number; at?: number }> = ({ x, y, w = 820, h = 460, at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 30, 'inout');
  const climb = prog(f, at + 40, 110, 'inout');
  const pt = (t: number) => ({ x: t * w, y: h * (0.08 + 0.84 * (1 - Math.pow(2 * t - 1, 2))) });
  const d = Array.from({ length: 41 }, (_, i) => {
    const q = pt(i / 40);
    return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }).join(' ');
  const m = pt(lerp(0.5, 0.08, climb));
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={2}>
      <line x1={0} y1={h} x2={w} y2={h} {...dash(p)} />
      <line x1={0} y1={0} x2={0} y2={h} {...dash(p)} />
      <path d={d} stroke={a} strokeWidth={4} {...dash(prog(f, at + 10, 30))} />
      {[['研发', 0.08], ['制造 · 组装', 0.5], ['品牌 · 渠道', 0.92]].map(([t, k]) => (
        <text key={t as string} x={(k as number) * w} y={h + 46} fill="currentColor" stroke="none" textAnchor="middle" style={serif(24, 700)} opacity={p}>{t}</text>
      ))}
      <text x={-20} y={-18} fill="currentColor" stroke="none" style={serif(20, 700)} opacity={p}>附加值</text>
      <circle cx={m.x} cy={m.y} r={16} fill={a} stroke="none" opacity={prog(f, at + 30, 10)} />
      <circle cx={m.x} cy={m.y} r={28} stroke={a} opacity={prog(f, at + 30, 10) * 0.6} />
      <text x={m.x + 36} y={m.y + 8} fill={a} stroke="none" style={serif(26)} opacity={prog(f, at + 30, 10)}>{climb < 0.2 ? '2001 · 世界工厂' : '向上'}</text>
    </g>
  );
};

/** 祥云 — auspicious cloud curls with a floating pavilion that fades away. */
export const Clouds: React.FC<{ at?: number; fade?: number }> = ({ at = 0, fade = 0 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, at, 40, 'inout');
  const curl = (cx: number, cy: number, s: number, i: number) => (
    <g key={i} transform={`translate(${cx + Math.sin(f / 40 + i) * 12} ${cy}) scale(${s})`} {...{ strokeWidth: 3 / s }}>
      <path d="M-160 0 Q-160 -60 -100 -60 Q-100 -120 -30 -110 Q0 -170 70 -130 Q140 -140 140 -70 Q200 -60 180 0 Z" fill={mode === 'dark' ? C.night : C.paper} {...dash(stag(p, i, 5))} />
      <path d="M-100 -60 q30 0 30 30 q0 20 -20 20 q-14 0 -14 -14" {...dash(stag(p, i, 5))} />
      <path d="M70 -130 q30 10 20 45 q-6 18 -24 12 q-12 -5 -6 -18" {...dash(stag(p, i, 5))} />
    </g>
  );
  return (
    <g opacity={1 - fade} style={{ filter: `blur(${fade * 6}px)` }}>
      {curl(1180, 520, 1.3, 0)}
      {curl(1560, 420, 1.0, 1)}
      {curl(1450, 720, 1.5, 2)}
      <g transform={`translate(1400 ${420 + Math.sin(f / 30) * 10})`} strokeWidth={2} opacity={stag(p, 3, 5)}>
        <path d="M-140 0 Q-60 -30 0 -80 Q60 -30 140 0" />
        <path d="M-100 0 L-100 90 M100 0 L100 90 M-40 0 L-40 90 M40 0 L40 90" />
        <path d="M-150 90 L150 90" />
        <path d="M-90 -120 Q-40 -140 0 -180 Q40 -140 90 -120" />
        <path d="M-60 -120 L-60 -60 M60 -120 L60 -60" />
      </g>
      {curl(1250, 860, 1.1, 4)}
    </g>
  );
};

/** 钢铁 — an extruded I-beam with sparks. */
export const IBeam: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 24, 'inout');
  const prof = [[-120, -140], [120, -140], [120, -100], [26, -100], [26, 100], [120, 100], [120, 140], [-120, 140], [-120, 100], [-26, 100], [-26, -100], [-120, -100]];
  const off = [520, -180];
  const face = prof.map(([px, py]) => `${px},${py}`).join(' ');
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={3}>
      {prof.map(([px, py], i) => (
        <line key={i} x1={px} y1={py} x2={px + off[0]} y2={py + off[1]} strokeWidth={1.6} {...dash(stag(p, i / prof.length, 1.6))} />
      ))}
      <polygon points={prof.map(([px, py]) => `${px + off[0]},${py + off[1]}`).join(' ')} {...dash(p)} />
      <polygon points={face} fill={hatchDense(mode)} {...dash(p)} />
      <path d={`M-120 -140 L${-120 + off[0]} ${-140 + off[1]} L${120 + off[0]} ${-140 + off[1]} L120 -140 Z`} fill={hatch(mode)} stroke="none" opacity={0.6 * p} />
    </g>
  );
};

/** 电力 — a single lattice transmission tower with humming lines. */
export const Pylon: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, 0, 26, 'inout');
  const H = 700;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.4}>
      <path d={`M-150 0 L-30 ${-H} L30 ${-H} L150 0`} {...dash(p)} />
      {Array.from({ length: 12 }, (_, i) => {
        const y0 = -(i / 12) * H;
        const y1 = -((i + 1) / 12) * H;
        const w0 = 150 - (i / 12) * 120;
        const w1 = 150 - ((i + 1) / 12) * 120;
        return <path key={i} d={`M${-w0} ${y0} L${w1} ${y1} M${w0} ${y0} L${-w1} ${y1} M${-w1} ${y1} L${w1} ${y1}`} strokeWidth={1.2} {...dash(stag(p, i / 12, 1.4))} />;
      })}
      {[-560, -460, -360].map((yy, i) => (
        <g key={yy}>
          <line x1={-260 + i * 30} y1={yy} x2={260 - i * 30} y2={yy} {...dash(p)} />
          {[-1, 1].map((sgn) => (
            <path key={sgn} d={`M${sgn * (260 - i * 30)} ${yy + 40} Q${sgn * 700} ${yy + 160} ${sgn * 1100} ${yy + 60}`} stroke={a} strokeWidth={2} {...dash(prog(f, 12, 30))} />
          ))}
        </g>
      ))}
    </g>
  );
};

/** 机床 — a lathe whose chuck spins and throws off a chip. */
export const Lathe: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, 0, 26, 'inout');
  const q = (i: number) => dash(stag(p, i, 6));
  const spin = f * 22;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.6}>
      <path d="M-560 0 L-520 -60 L520 -60 L560 0 Z" {...q(0)} />
      <path d="M-500 0 L-500 120 L-400 120 L-400 0 M400 0 L400 120 L500 120 L500 0" {...q(0)} />
      <rect x={-520} y={-340} width={240} height={280} {...q(1)} />
      <rect x={-520} y={-340} width={240} height={280} fill={hatch(mode)} stroke="none" opacity={0.5 * stag(p, 3, 6)} />
      <g transform={`translate(-250 -200) rotate(${spin})`}>
        <circle r={90} {...q(2)} />
        {[0, 120, 240].map((d) => (
          <rect key={d} x={-14} y={-90} width={28} height={50} transform={`rotate(${d})`} {...q(2)} />
        ))}
      </g>
      <rect x={-160} y={-236} width={440} height={72} {...q(3)} />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={-150 + i * 44 + ((f * 3) % 44)} y1={-236} x2={-170 + i * 44 + ((f * 3) % 44)} y2={-164} strokeWidth={1.2} opacity={p} />
      ))}
      <path d="M300 -250 L420 -250 L440 -150 L300 -150 Z" {...q(4)} />
      <line x1={280} y1={-200} x2={300} y2={-200} strokeWidth={6} {...q(4)} />
      <path d="M40 -60 L60 -150 L110 -150 L130 -60" {...q(5)} />
      <path d="M80 -150 L80 -164" stroke={a} strokeWidth={6} {...q(5)} />
      <path d={`M80 -164 q${20 + Math.sin(f / 3) * 6} -30 50 -20 q20 10 10 30`} stroke={a} strokeWidth={3} opacity={p} />
    </g>
  );
};

/** 芯片 — a die with pins; traces light up toward the core. */
export const Chip: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, 0, 26, 'inout');
  const r = rng(4004);
  const traces = Array.from({ length: 22 }, () => {
    const side = Math.floor(r() * 4);
    const k = (r() - 0.5) * 300;
    const start = side === 0 ? [k, -180] : side === 1 ? [180, k] : side === 2 ? [k, 180] : [-180, k];
    const mid = [start[0] * 0.5 + (r() - 0.5) * 60, start[1] * 0.5 + (r() - 0.5) * 60];
    return `M${start[0].toFixed(0)} ${start[1].toFixed(0)} L${mid[0].toFixed(0)} ${start[1].toFixed(0)} L${mid[0].toFixed(0)} ${mid[1].toFixed(0)} L${(mid[0] * 0.3).toFixed(0)} ${(mid[1] * 0.3).toFixed(0)}`;
  });
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.4}>
      <rect x={-200} y={-200} width={400} height={400} rx={14} {...dash(p)} />
      <rect x={-200} y={-200} width={400} height={400} rx={14} fill={hatchDense(mode)} stroke="none" opacity={0.25 * p} />
      {Array.from({ length: 14 }, (_, i) => {
        const k = -182 + i * 28;
        return (
          <g key={i} opacity={p}>
            <line x1={k} y1={-200} x2={k} y2={-250} />
            <line x1={k} y1={200} x2={k} y2={250} />
            <line x1={-200} y1={k} x2={-250} y2={k} />
            <line x1={200} y1={k} x2={250} y2={k} />
          </g>
        );
      })}
      {traces.map((d, i) => (
        <path key={i} d={d} stroke={a} strokeWidth={1.8} {...dash(stag(prog(f, 10, 36), i, traces.length))} />
      ))}
      <rect x={-60} y={-60} width={120} height={120} fill={a} stroke={a} opacity={0.2 + 0.6 * prog(f, 36, 20)} />
    </g>
  );
};

/** 天平 — a balance: industry outweighs the moral narrative. */
export const Balance: React.FC<{ x: number; y: number; at?: number }> = ({ x, y, at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 30, 'inout');
  const tilt = lerp(0, 14, prog(f, at + 30, 40, 'inout')) + Math.sin(f / 10) * 0.5;
  const L = 380;
  const t = (tilt * Math.PI) / 180;
  const left = { x: -L * Math.cos(t), y: L * Math.sin(t) };
  const right = { x: L * Math.cos(t), y: -L * Math.sin(t) };
  const pan = (cx: number, cy: number, label: string, content: React.ReactNode, col: string) => (
    <g transform={`translate(${cx} ${cy})`}>
      <line x1={0} y1={0} x2={-110} y2={240} strokeWidth={1.5} />
      <line x1={0} y1={0} x2={110} y2={240} strokeWidth={1.5} />
      <path d="M-140 240 Q0 300 140 240 Z" fill={hatch(mode)} strokeWidth={3} />
      {content}
      <text x={0} y={350} fill={col} stroke="none" textAnchor="middle" style={serif(34)}>{label}</text>
    </g>
  );
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={3} opacity={p}>
      <path d="M-120 520 L120 520 L40 480 L-40 480 Z" />
      <line x1={0} y1={480} x2={0} y2={-20} strokeWidth={6} />
      <circle cx={0} cy={-30} r={16} fill="currentColor" />
      <line x1={left.x} y1={left.y - 30} x2={right.x} y2={right.y - 30} strokeWidth={8} />
      {pan(left.x, left.y - 30, '钢铁 · 电力 · 机床 · 芯片', (
        <g>
          <rect x={-90} y={170} width={70} height={70} fill="currentColor" />
          <rect x={-10} y={150} width={90} height={90} fill={a} stroke={a} />
          <rect x={-60} y={100} width={60} height={50} fill={hatchDense(mode)} />
        </g>
      ), a)}
      {pan(right.x, right.y - 30, '宏大的道德叙事', (
        <g>
          <path d="M-60 236 L-60 180 L60 180 L60 236" />
          <path d="M-60 180 Q0 160 60 180" />
          <line x1={-40} y1={200} x2={40} y2={200} strokeWidth={1.5} />
          <line x1={-40} y1={216} x2={30} y2={216} strokeWidth={1.5} />
        </g>
      ), 'currentColor')}
    </g>
  );
};

/** 天际线 — a modern Chinese skyline with a TV tower and supertalls. */
export const Skyline: React.FC<{ y: number; at?: number }> = ({ y, at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 60, 'inout');
  const r = rng(2026);
  const blocks = Array.from({ length: 34 }, (_, i) => ({ x: 40 + i * 56, w: 40 + r() * 20, h: 80 + r() * 240 }));
  return (
    <g transform={`translate(0 ${y})`} strokeWidth={1.8}>
      <line x1={0} y1={0} x2={1920} y2={0} {...dash(p)} />
      {blocks.map((b, i) => (
        <g key={i} opacity={stag(p, i / 34, 1.5)}>
          <rect x={b.x} y={-b.h} width={b.w} height={b.h} />
          {Array.from({ length: Math.floor(b.h / 30) }, (_, k) => (
            <line key={k} x1={b.x + 8} y1={-b.h + 16 + k * 30} x2={b.x + b.w - 8} y2={-b.h + 16 + k * 30} strokeWidth={1} opacity={(i + k) % 4 === 0 ? 0.9 : 0.3} stroke={(i + k) % 7 === 0 ? a : 'currentColor'} />
          ))}
        </g>
      ))}
      {/* TV tower */}
      <g transform="translate(1180 0)" {...dash(stag(p, 0.5, 1.5))}>
        <path d="M-40 0 L-10 -560 M40 0 L10 -560 M0 0 L0 -720" strokeWidth={3} />
        <circle cx={0} cy={-200} r={70} strokeWidth={3} fill={mode === 'dark' ? C.night : C.paper} />
        <circle cx={0} cy={-470} r={46} strokeWidth={3} fill={mode === 'dark' ? C.night : C.paper} />
        <circle cx={0} cy={-610} r={20} strokeWidth={3} />
      </g>
      {/* supertalls */}
      <path d="M1380 0 L1380 -700 Q1420 -760 1460 -700 L1460 0" strokeWidth={3} fill={mode === 'dark' ? C.night : C.paper} {...dash(stag(p, 0.6, 1.5))} />
      <path d="M1520 0 L1530 -760 L1600 -800 L1600 0 Z" strokeWidth={3} fill={mode === 'dark' ? C.night : C.paper} {...dash(stag(p, 0.7, 1.5))} />
      <rect x={1545} y={-770} width={30} height={26} stroke={a} strokeWidth={2} opacity={stag(p, 0.9, 1.5)} />
    </g>
  );
};

/** 铜镜 — a bronze mirror with concentric bands, slowly turning. */
export const BronzeMirror: React.FC<{ cx: number; cy: number; r: number; at?: number }> = ({ cx, cy, r, at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 80, 'inout');
  const rot = f * 0.12;
  const q = (i: number) => dash(stag(p, i, 10));
  const petal = (n: number, rr: number, len: number, k: number) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * 360;
      return <path key={i} d={`M0 ${-rr} Q${len * 0.5} ${-rr - len * 0.6} 0 ${-rr - len} Q${-len * 0.5} ${-rr - len * 0.6} 0 ${-rr} Z`} transform={`rotate(${t})`} strokeWidth={1.4} {...q(k)} />;
    });
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <circle r={r} strokeWidth={4} {...q(0)} />
      <circle r={r * 0.94} strokeWidth={1.2} {...q(0)} />
      {Array.from({ length: 72 }, (_, i) => {
        const t = (i / 72) * Math.PI * 2;
        return <line key={i} x1={Math.cos(t) * r * 0.94} y1={Math.sin(t) * r * 0.94} x2={Math.cos(t) * r * 0.86} y2={Math.sin(t) * r * 0.86} strokeWidth={1} {...q(1)} />;
      })}
      <circle r={r * 0.86} strokeWidth={1.4} {...q(1)} />
      {Array.from({ length: 24 }, (_, i) => {
        const t = (i / 24) * Math.PI * 2;
        return <circle key={i} cx={Math.cos(t) * r * 0.78} cy={Math.sin(t) * r * 0.78} r={r * 0.05} strokeWidth={1.4} {...q(2)} />;
      })}
      <circle r={r * 0.7} strokeWidth={1.4} {...q(3)} />
      <g>{petal(16, r * 0.42, r * 0.26, 4)}</g>
      <circle r={r * 0.42} strokeWidth={2} {...q(5)} />
      {Array.from({ length: 8 }, (_, i) => {
        const t = (i / 8) * 360;
        return <path key={i} d={`M${-r * 0.06} ${-r * 0.36} L0 ${-r * 0.2} L${r * 0.06} ${-r * 0.36}`} transform={`rotate(${t})`} strokeWidth={1.4} {...q(6)} />;
      })}
      <rect x={-r * 0.16} y={-r * 0.16} width={r * 0.32} height={r * 0.32} strokeWidth={2} transform="rotate(45)" {...q(7)} />
      <circle r={r * 0.09} fill={a} stroke={a} strokeWidth={2} opacity={stag(p, 8, 10)} />
      <circle r={r} fill={hatch(mode)} stroke="none" opacity={0.08 * p} />
    </g>
  );
};
