import React from 'react';
import { accent, C, F } from '../theme';
import { dash, hatch, hatchDense, lerp, prog, rng, stag, useBeat } from '../kit';

const serif = (size: number, weight = 700): React.CSSProperties => ({ fontFamily: F.serif, fontWeight: weight, fontSize: size, letterSpacing: '0.1em' });

/** 网文 — an open book whose pages are written by many hands (forum posts). */
export const NovelBook: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 36, 'inout');
  const a = accent(mode);
  const r = rng(2009);
  const posts = Array.from({ length: 8 }, (_, i) => ({
    x: -660 + (i % 4) * 200 + (r() - 0.5) * 40,
    y: 40 + Math.floor(i / 4) * 150 + (r() - 0.5) * 30,
    lines: 2 + Math.floor(r() * 3),
    id: 1000 + Math.floor(r() * 9000),
  }));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2}>
      {/* book */}
      <path d="M0 -260 Q-180 -300 -380 -260 L-380 200 Q-180 160 0 200 Q180 160 380 200 L380 -260 Q180 -300 0 -260 Z" {...dash(stag(p, 0, 6))} />
      <path d="M0 -260 L0 200" {...dash(stag(p, 1, 6))} />
      <path d="M-380 200 L-390 220 Q-180 180 0 222 Q180 180 390 220 L380 200" {...dash(stag(p, 1, 6))} />
      <text x={-190} y={-40} fill="currentColor" stroke="none" textAnchor="middle" style={{ fontFamily: F.brush, fontSize: 110 }} opacity={stag(p, 2, 6)} writingMode="tb">
        临高启明
      </text>
      <rect x={-250} y={120} width={30} height={30} fill={a} stroke="none" opacity={stag(p, 3, 6)} />
      {Array.from({ length: 9 }, (_, c) => (
        <line key={c} x1={330 - c * 34} y1={-230} x2={330 - c * 34} y2={-230 + 380 * stag(p, 2 + c / 6, 6)} strokeWidth={6} strokeDasharray="10 5" opacity={0.7} />
      ))}
      {/* posts flying in, many authors */}
      {posts.map((post, i) => {
        const q = prog(f, 26 + i * 7, 16);
        const tx = lerp(post.x - 200, post.x, q) - 380;
        return (
          <g key={i} transform={`translate(${tx} ${post.y})`} opacity={q} strokeWidth={1.4}>
            <rect x={0} y={0} width={200} height={40 + post.lines * 18} fill={mode === 'paper' ? C.paper : C.night} />
            <circle cx={20} cy={20} r={10} fill={i % 3 === 0 ? a : 'none'} />
            <text x={40} y={27} fill="currentColor" stroke="none" style={{ fontFamily: F.mono, fontSize: 15 }}>#{post.id}</text>
            {Array.from({ length: post.lines }, (_, k) => (
              <line key={k} x1={14} y1={48 + k * 18} x2={14 + 150 - k * 22} y2={48 + k * 18} strokeWidth={4} opacity={0.6} />
            ))}
          </g>
        );
      })}
    </g>
  );
};

/** 五百人 — a hemicycle of travellers appearing dot by dot. */
export const Crowd: React.FC<{ cx: number; cy: number; n?: number }> = ({ cx, cy, n = 520 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const r = rng(500);
  const p = prog(f, 4, 70, 'inout');
  const shown = Math.floor(p * n);
  const dots: React.ReactNode[] = [];
  let k = 0;
  for (let row = 0; row < 13 && k < n; row++) {
    const rad = 260 + row * 42;
    const count = Math.floor(28 + row * 5.2);
    for (let j = 0; j < count && k < n; j++, k++) {
      const t = Math.PI + (j / (count - 1)) * Math.PI;
      const jitter = (r() - 0.5) * 8;
      dots.push(
        <circle key={k} cx={cx + Math.cos(t) * (rad + jitter)} cy={cy + Math.sin(t) * (rad + jitter) * 0.55} r={6.5} fill={r() < 0.12 ? a : 'currentColor'} stroke="none" opacity={k < shown ? 0.85 : 0} />,
      );
    }
  }
  return (
    <g>
      <path d={`M${cx - 840} ${cy} A840 460 0 0 1 ${cx + 840} ${cy}`} strokeWidth={1.4} {...dash(prog(f, 0, 40))} />
      <path d={`M${cx - 230} ${cy} A230 126 0 0 1 ${cx + 230} ${cy}`} strokeWidth={1.4} {...dash(prog(f, 0, 40))} />
      {dots}
      <text x={cx} y={cy + 20} fill="currentColor" stroke="none" textAnchor="middle" style={{ fontFamily: F.mono, fontSize: 150 }}>{Math.floor(p * 500)}{p >= 1 ? '+' : ''}</text>
    </g>
  );
};

/** 勘探 — a theodolite on a tripod with triangulation lines across the land. */
export const Theodolite: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 30, 'inout');
  const a = accent(mode);
  const q = (i: number) => dash(stag(p, i, 7));
  const pan = Math.sin(f / 20) * 6;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.2}>
      {/* ground grid in perspective */}
      {Array.from({ length: 13 }, (_, i) => (
        <line key={i} x1={-700 + i * 116} y1={0} x2={(-700 + i * 116) * 0.25} y2={-190} strokeWidth={0.8} opacity={0.4 * p} />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const yy = -Math.pow(i / 5, 0.8) * 190;
        const half = 700 - (i / 5) * 525;
        return <line key={i} x1={-half} y1={yy} x2={half} y2={yy} strokeWidth={0.8} opacity={0.4 * p} />;
      })}
      <path d="M-520 -150 L420 -170 L60 -40 Z" stroke={a} strokeWidth={1.6} strokeDasharray="8 8" opacity={stag(p, 5, 7)} />
      {[[-520, -150], [420, -170], [60, -40]].map(([px, py], i) => (
        <g key={i} opacity={stag(p, 6, 7)}>
          <path d={`M${px} ${py} l-10 18 l20 0 Z`} fill={a} stroke="none" />
        </g>
      ))}
      {/* tripod */}
      <g transform="translate(-60 120)">
        <line x1={0} y1={-420} x2={-160} y2={0} {...q(0)} />
        <line x1={0} y1={-420} x2={150} y2={0} {...q(0)} />
        <line x1={0} y1={-420} x2={20} y2={10} {...q(1)} />
        <rect x={-60} y={-440} width={120} height={20} {...q(1)} />
        <g transform={`rotate(${pan} 0 -520)`}>
          <path d="M-40 -440 L-40 -560 L40 -560 L40 -440" {...q(2)} />
          <circle cx={0} cy={-510} r={34} {...q(3)} />
          <circle cx={0} cy={-510} r={8} fill="currentColor" {...q(3)} />
          <rect x={-150} y={-600} width={300} height={44} rx={20} {...q(4)} />
          <rect x={-150} y={-600} width={300} height={44} rx={20} fill={hatch(mode)} stroke="none" opacity={0.6 * stag(p, 5, 7)} />
          <line x1={150} y1={-578} x2={200} y2={-578} strokeWidth={6} {...q(4)} />
        </g>
      </g>
    </g>
  );
};

/** 发电 — a power station feeding lines across lattice pylons. */
export const PowerStation: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 30, 'inout');
  const a = accent(mode);
  const q = (i: number) => dash(stag(p, i, 8));
  const pylon = (px: number, k: number) => (
    <g key={px} transform={`translate(${px} 0)`}>
      <path d="M-60 0 L-14 -360 L14 -360 L60 0" {...q(k)} />
      {Array.from({ length: 7 }, (_, i) => {
        const y0 = -i * 50;
        const w0 = 60 - (i * 46) / 7;
        const w1 = 60 - ((i + 1) * 46) / 7;
        return <path key={i} d={`M${-w0} ${y0} L${w1} ${y0 - 50} M${w0} ${y0} L${-w1} ${y0 - 50}`} strokeWidth={1} {...q(k)} />;
      })}
      <line x1={-90} y1={-300} x2={90} y2={-300} {...q(k)} />
      <line x1={-70} y1={-240} x2={70} y2={-240} {...q(k)} />
    </g>
  );
  const hum = 0.6 + Math.sin(f / 4) * 0.4;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.2}>
      <line x1={-760} y1={0} x2={760} y2={0} {...q(0)} />
      <path d="M-700 0 L-700 -260 L-380 -260 L-380 0" {...q(1)} />
      <path d="M-720 -260 L-540 -330 L-360 -260" {...q(1)} />
      <path d="M-700 0 L-700 -260 L-380 -260 L-380 0 Z" fill={hatch(mode)} stroke="none" opacity={0.5 * stag(p, 3, 8)} />
      <path d="M-640 0 L-620 -560 L-570 -560 L-550 0" {...q(2)} />
      {Array.from({ length: 5 }, (_, i) => {
        const life = ((f / 60 + i / 5) % 1);
        return <circle key={i} cx={-595 + life * 150} cy={-590 - life * 160} r={18 + life * 50} strokeWidth={1.2} opacity={(1 - life) * 0.7 * p} />;
      })}
      <circle cx={-540} cy={-120} r={70} {...q(3)} />
      <circle cx={-540} cy={-120} r={22} fill={a} stroke="none" opacity={stag(p, 4, 8) * hum} />
      {pylon(-120, 4)}
      {pylon(260, 5)}
      {pylon(620, 6)}
      {[-300, -240].map((yy, i) => (
        <path key={yy} d={`M-380 ${yy + 60} Q-250 ${yy + 40} -210 ${yy} Q70 ${yy + 70} 170 ${yy} Q440 ${yy + 70} 530 ${yy} Q650 ${yy + 40} 760 ${yy + 20}`} stroke={a} strokeWidth={2} {...dash(stag(p, 6 + i * 0.5, 8))} />
      ))}
      <path d="M-230 -460 L-270 -380 L-230 -380 L-270 -300" stroke={a} strokeWidth={5} opacity={stag(p, 7, 8) * hum} />
    </g>
  );
};

/** 水泥窑 — an inclined rotary kiln on piers, with its preheater tower. */
export const CementKiln: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => {
  const { f, mode } = useBeat();
  const p = prog(f, 0, 30, 'inout');
  const a = accent(mode);
  const q = (i: number) => dash(stag(p, i, 7));
  const rot = (f * 3) % 60;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeWidth={2.2}>
      <line x1={-760} y1={0} x2={760} y2={0} {...q(0)} />
      <g transform="rotate(-6)">
        <rect x={-560} y={-260} width={1000} height={110} rx={50} {...q(1)} />
        <rect x={-560} y={-260} width={1000} height={110} rx={50} fill={hatch(mode)} stroke="none" opacity={0.45 * stag(p, 3, 7)} />
        {Array.from({ length: 17 }, (_, i) => (
          <line key={i} x1={-520 + i * 60 + rot} y1={-260} x2={-520 + i * 60 + rot} y2={-150} strokeWidth={1} opacity={0.5 * p} />
        ))}
        {[-400, -80, 240].map((rx) => (
          <rect key={rx} x={rx} y={-272} width={36} height={134} {...q(2)} />
        ))}
        <ellipse cx={-560} cy={-205} rx={24} ry={55} fill={a} stroke="none" opacity={stag(p, 5, 7) * (0.7 + Math.sin(f / 3) * 0.2)} />
      </g>
      {[-380, -60, 260].map((px, i) => (
        <path key={px} d={`M${px - 30} 0 L${px - 10} ${-150 + (px + 380) * 0.105 - 20} L${px + 40} ${-150 + (px + 380) * 0.105 - 20} L${px + 60} 0`} {...q(3 + i * 0.3)} />
      ))}
      <path d="M460 0 L460 -620 L640 -620 L640 0" {...q(4)} />
      {[-160, -300, -440].map((yy) => (
        <path key={yy} d={`M470 ${yy} L630 ${yy} M490 ${yy - 20} Q550 ${yy - 90} 610 ${yy - 20}`} strokeWidth={1.4} {...q(5)} />
      ))}
      {/* sacks */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={-720 + (i % 3) * 70} y={-50 - Math.floor(i / 3) * 44} width={64} height={44} rx={10} fill={hatchDense(mode)} {...q(6)} />
      ))}
    </g>
  );
};

/** 学校 · 户籍 · 标准 — three panels: a blackboard, a ledger and identical bolts. */
export const SchoolPanels: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const panel = (i: number) => prog(f, 6 + i * 16, 30, 'inout');
  const label = (px: number, t: string, o: number) => (
    <text x={px} y={300} fill="currentColor" stroke="none" textAnchor="middle" style={serif(34, 900)} opacity={o}>{t}</text>
  );
  const p0 = panel(0);
  const p1 = panel(1);
  const p2 = panel(2);
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={2}>
      {/* blackboard with a right triangle */}
      <rect x={-800} y={-220} width={440} height={420} {...dash(p0)} />
      <rect x={-800} y={-220} width={440} height={420} fill={hatchDense(mode)} stroke="none" opacity={0.25 * p0} />
      <path d="M-720 120 L-440 120 L-720 -120 Z" strokeWidth={3} {...dash(stag(p0, 1, 3))} />
      <rect x={-720} y={96} width={24} height={24} strokeWidth={1.4} opacity={stag(p0, 2, 3)} />
      <text x={-580} y={170} fill="currentColor" stroke="none" textAnchor="middle" style={{ fontFamily: F.mono, fontSize: 36 }} opacity={stag(p0, 2, 3)}>a² + b² = c²</text>
      {label(-580, '办学校', p0)}
      {/* ledger */}
      <rect x={-220} y={-220} width={440} height={420} {...dash(p1)} />
      {Array.from({ length: 8 }, (_, c) => (
        <line key={c} x1={-220 + (c + 1) * 49} y1={-220} x2={-220 + (c + 1) * 49} y2={200} strokeWidth={1} opacity={0.6 * stag(p1, 1, 3)} />
      ))}
      {Array.from({ length: 8 }, (_, c) =>
        Array.from({ length: 5 }, (_, r) => (
          <line key={`${c}-${r}`} x1={-196 + c * 49} y1={-190 + r * 76} x2={-196 + c * 49} y2={-150 + r * 76} strokeWidth={6} opacity={stag(p1, 1 + (c * 5 + r) / 40, 3) * 0.75} stroke={r === 0 ? a : 'currentColor'} />
        )),
      )}
      {label(0, '编户籍', p1)}
      {/* bolts */}
      <rect x={360} y={-220} width={440} height={420} {...dash(p2)} />
      {Array.from({ length: 9 }, (_, i) => {
        const bx = 440 + (i % 3) * 140;
        const by = -130 + Math.floor(i / 3) * 130;
        const o = stag(p2, 1 + i / 9, 3);
        const hex = Array.from({ length: 6 }, (_, k) => {
          const t = (k / 6) * Math.PI * 2 + Math.PI / 6;
          return `${(bx + Math.cos(t) * 44).toFixed(1)},${(by + Math.sin(t) * 44).toFixed(1)}`;
        }).join(' ');
        return (
          <g key={i} opacity={o}>
            <polygon points={hex} />
            <circle cx={bx} cy={by} r={22} />
            <circle cx={bx} cy={by} r={12} fill={i === 4 ? a : 'none'} stroke={i === 4 ? a : 'currentColor'} />
          </g>
        );
      })}
      <text x={580} y={185} fill={a} stroke="none" textAnchor="middle" style={{ fontFamily: F.mono, fontSize: 24 }} opacity={stag(p2, 2, 3)}>M12 × 9 · 同一规格</text>
      {label(580, '标准化', p2)}
    </g>
  );
};

const Person: React.FC<{ x: number; kind: number; o: number; step: number }> = ({ x, kind, o, step }) => {
  const { mode } = useBeat();
  const a = accent(mode);
  const sw = Math.sin(step) * 16;
  // kind: 0 = farmer with conical hat and hoe, 1 = worker with helmet and wrench
  return (
    <g transform={`translate(${x} 0)`} opacity={o} strokeWidth={3}>
      <circle cx={0} cy={-300} r={26} />
      {kind === 0 ? (
        <path d="M-60 -304 L0 -350 L60 -304 Z" fill={hatch(mode)} />
      ) : (
        <path d="M-32 -306 A32 32 0 0 1 32 -306 L40 -300 L-40 -300 Z" fill={a} stroke={a} />
      )}
      <line x1={0} y1={-274} x2={0} y2={-140} />
      <line x1={0} y1={-140} x2={-sw * 1.4} y2={0} />
      <line x1={0} y1={-140} x2={sw * 1.4} y2={0} />
      <line x1={0} y1={-240} x2={-40 + sw} y2={-170} />
      <line x1={0} y1={-240} x2={40 - sw} y2={-170} />
      {kind === 0 ? (
        <path d={`M${40 - sw} -170 L${70 - sw} -330 M${60 - sw} -330 L${100 - sw} -310`} strokeWidth={3} />
      ) : (
        <path d={`M${40 - sw} -170 L${70 - sw} -210 m-10 -12 a16 16 0 1 1 22 16`} strokeWidth={4} />
      )}
      {kind === 1 && <rect x={-18} y={-250} width={36} height={60} strokeWidth={1.5} fill={hatchDense(mode)} />}
    </g>
  );
};

/** 农民 → 工人 — figures walk through a gate and come out as workers. */
export const Workers: React.FC<{ y: number }> = ({ y }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const gateX = 1060;
  const n = 9;
  return (
    <g transform={`translate(0 ${y})`}>
      <line x1={0} y1={0} x2={1920} y2={0} strokeWidth={2} {...dash(prog(f, 0, 20))} />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={((i * 48 + f * 4) % 1920)} cy={16} r={5} strokeWidth={1.2} opacity={0.6} />
      ))}
      <path d={`M${gateX - 90} 0 L${gateX - 90} -420 L${gateX + 90} -420 L${gateX + 90} 0`} strokeWidth={3} {...dash(prog(f, 4, 24))} />
      <rect x={gateX - 110} y={-460} width={220} height={40} fill={a} stroke="none" opacity={prog(f, 16, 16)} />
      <text x={gateX} y={-430} fill={C.cream} stroke="none" textAnchor="middle" style={serif(26, 900)} opacity={prog(f, 16, 16)}>训 练</text>
      {Array.from({ length: n }, (_, i) => {
        const px = ((i * 250 + f * 4.2) % (n * 250)) - 200;
        const kind = px > gateX ? 1 : 0;
        const inside = Math.abs(px - gateX) < 80;
        return <Person key={i} x={px} kind={kind} o={inside ? 0.2 : 1} step={f / 5 + i} />;
      })}
    </g>
  );
};

interface Node { id: string; x: number; y: number; big?: boolean }
const NODES: Node[] = [
  { id: '煤', x: 200, y: 260 }, { id: '铁矿', x: 200, y: 420 }, { id: '石灰石', x: 200, y: 580 }, { id: '人', x: 200, y: 780 },
  { id: '焦炭', x: 480, y: 260 }, { id: '钢铁', x: 740, y: 380 }, { id: '水泥', x: 520, y: 580 }, { id: '教育', x: 480, y: 780 },
  { id: '工程师', x: 760, y: 740 }, { id: '机床', x: 1020, y: 440 }, { id: '标准化', x: 1020, y: 700 }, { id: '蒸汽机', x: 1020, y: 220 },
  { id: '铁路', x: 1300, y: 200 }, { id: '电力', x: 1300, y: 380 }, { id: '化肥', x: 1300, y: 560 }, { id: '枪炮', x: 1300, y: 740 },
  { id: '工业体系', x: 1620, y: 480, big: true },
];
const EDGES: [string, string][] = [
  ['煤', '焦炭'], ['焦炭', '钢铁'], ['铁矿', '钢铁'], ['石灰石', '水泥'], ['人', '教育'], ['教育', '工程师'], ['钢铁', '机床'],
  ['工程师', '机床'], ['工程师', '标准化'], ['钢铁', '蒸汽机'], ['机床', '蒸汽机'], ['标准化', '机床'], ['蒸汽机', '铁路'],
  ['水泥', '铁路'], ['蒸汽机', '电力'], ['煤', '蒸汽机'], ['电力', '化肥'], ['机床', '枪炮'], ['钢铁', '枪炮'],
  ['铁路', '工业体系'], ['电力', '工业体系'], ['化肥', '工业体系'], ['枪炮', '工业体系'], ['标准化', '工业体系'],
];

/** 科技树 — the industrial system as a graph; 机床 loops back on itself. */
export const TechTree: React.FC<{ at?: number }> = ({ at = 0 }) => {
  const { f, mode } = useBeat();
  const a = accent(mode);
  const p = prog(f, at, 150, 'inout');
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const order = (n: Node) => (n.x - 200) / 1420;
  const lit = (n: Node) => clampLit(p * 1.15 - order(n));
  return (
    <g strokeWidth={2}>
      {EDGES.map(([s, t], i) => {
        const A = byId[s];
        const B = byId[t];
        const e = clampLit((p * 1.15 - order(A)) * 2.2);
        const mx = (A.x + B.x) / 2;
        return <path key={i} d={`M${A.x} ${A.y} C${mx} ${A.y}, ${mx} ${B.y}, ${B.x} ${B.y}`} stroke={t === '工业体系' ? a : 'currentColor'} strokeWidth={1.6} {...dash(e)} opacity={e > 0 ? 0.85 : 0} />;
      })}
      {/* 机床造机床: a self-loop */}
      <path d={`M${byId['机床'].x - 30} ${byId['机床'].y - 40} C${byId['机床'].x - 110} ${byId['机床'].y - 200}, ${byId['机床'].x + 110} ${byId['机床'].y - 200}, ${byId['机床'].x + 30} ${byId['机床'].y - 40}`} stroke={a} strokeWidth={2.5} {...dash(clampLit((p - 0.5) * 3))} />
      {NODES.map((n) => {
        const l = lit(n);
        const r = n.big ? 92 : 46;
        const pulse = n.big ? 1 + Math.sin(f / 8) * 0.03 * l : 1;
        return (
          <g key={n.id} opacity={0.25 + 0.75 * l}>
            <circle cx={n.x} cy={n.y} r={r * pulse} fill={mode === 'dark' ? C.night : C.paper} stroke={n.big ? a : 'currentColor'} strokeWidth={n.big ? 3 : 2} />
            <circle cx={n.x} cy={n.y} r={r * pulse + 8} strokeWidth={0.8} strokeDasharray="3 6" opacity={l} />
            <text x={n.x} y={n.y + (n.big ? 14 : 10)} fill={n.big ? a : 'currentColor'} stroke="none" textAnchor="middle" style={serif(n.big ? 38 : n.id.length > 2 ? 22 : 28, 900)}>{n.id}</text>
          </g>
        );
      })}
    </g>
  );
};

const clampLit = (v: number) => Math.min(1, Math.max(0, v));
