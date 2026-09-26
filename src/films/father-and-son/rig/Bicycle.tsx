import React from 'react';
import { TAU, Vec, f1, pt, v } from '../lib/math';

/**
 * A 28-inch "二八大杠" roadster: level top tube, swept-back bars, full chain case,
 * rear rack and a flip-down stand. Geometry in metres, origin on the ground below
 * the bottom bracket, facing +x.
 */
const G = {
  R: 0.355,
  bb: v(0, -0.28),
  rear: v(-0.45, -0.355),
  front: v(0.67, -0.355),
  seatTop: v(-0.16, -0.84),
  saddle: v(-0.2, -0.935),
  ttRear: v(-0.15, -0.81),
  headTop: v(0.52, -0.855),
  headBot: v(0.57, -0.67),
  stemTop: v(0.5, -1.0),
  grip: v(0.34, -0.985),
  crank: 0.17,
  rackY: -0.79,
  rackA: -0.76,
  rackB: -0.22,
};

export interface BikeGeom {
  m: number;
  saddle: Vec;
  grip: Vec;
  stem: Vec;
  bar: Vec;
  rack: Vec;
  bb: Vec;
  pedalN: Vec;
  pedalF: Vec;
  R: number;
}

const sc = (p: Vec, m: number) => v(p.x * m, p.y * m);

/** Attachment points in pixels for riders and passengers. */
export const bikeGeom = (m: number, crank: number): BikeGeom => {
  const bb = sc(G.bb, m);
  const c = G.crank * m;
  return {
    m,
    saddle: sc(v(G.saddle.x + 0.01, G.saddle.y - 0.03), m),
    grip: sc(G.grip, m),
    stem: sc(v(0.47, -0.97), m),
    bar: sc(v(0.24, -0.84), m),
    rack: sc(v(-0.5, G.rackY - 0.02), m),
    bb,
    pedalN: v(bb.x + Math.cos(crank) * c, bb.y + Math.sin(crank) * c),
    pedalF: v(bb.x - Math.cos(crank) * c, bb.y - Math.sin(crank) * c),
    R: G.R * m,
  };
};

/** Crank turns once for every ~2.4 wheel turns. */
export const crankFor = (dist: number, m: number) => dist / (G.R * m) / 2.4;
export const wheelFor = (dist: number, m: number) => dist / (G.R * m);

const Wheel: React.FC<{ c: Vec; R: number; angle: number; color: string; m: number }> = ({ c, R, angle, color, m }) => {
  const spokes: string[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = angle + (i / n) * TAU;
    const off = (i % 2 ? 1 : -1) * 0.2;
    spokes.push(`M${f1(c.x + Math.cos(a + off) * R * 0.08)} ${f1(c.y + Math.sin(a + off) * R * 0.08)}L${f1(c.x + Math.cos(a) * R * 0.9)} ${f1(c.y + Math.sin(a) * R * 0.9)}`);
  }
  return (
    <g fill="none" stroke={color}>
      <circle cx={f1(c.x)} cy={f1(c.y)} r={f1(R - 0.018 * m)} strokeWidth={f1(Math.max(1.2, 0.036 * m))} />
      <circle cx={f1(c.x)} cy={f1(c.y)} r={f1(R * 0.9)} strokeWidth={f1(Math.max(0.8, 0.012 * m))} />
      <path d={spokes.join('')} strokeWidth={f1(Math.max(0.5, 0.0045 * m))} opacity={0.85} />
      <circle cx={f1(c.x)} cy={f1(c.y)} r={f1(0.025 * m)} fill={color} stroke="none" />
    </g>
  );
};

export interface BicycleProps {
  x: number;
  y: number;
  /** Pixels per metre. */
  m: number;
  facing?: 1 | -1;
  color: string;
  dist?: number;
  parked?: boolean;
  /** Rotation of the whole bike around its rear contact (fallen bike etc.), degrees. */
  tilt?: number;
  bell?: boolean;
}

export const Bicycle: React.FC<BicycleProps> = ({ x, y, m, facing = 1, color, dist = 0, parked = false, tilt = 0, bell = true }) => {
  const s = (p: Vec) => sc(p, m);
  const wa = wheelFor(dist, m);
  const g = bikeGeom(m, crankFor(dist, m));
  const tube = Math.max(1.4, 0.03 * m);
  const thin = Math.max(1, 0.018 * m);
  const rear = s(G.rear);
  const front = s(G.front);
  const lift = parked ? -0.02 * m : 0;
  const rackA = s(v(G.rackA, G.rackY));
  const rackB = s(v(G.rackB, G.rackY));
  const pedal = (p: Vec) => `M${f1(p.x - 0.05 * m)} ${f1(p.y)}L${f1(p.x + 0.05 * m)} ${f1(p.y)}`;

  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${facing} 1) rotate(${f1(tilt)} ${f1(rear.x)} 0)`}>
      <g transform={`translate(0 ${f1(lift)})`}>
        <Wheel c={rear} R={g.R} angle={wa} color={color} m={m} />
        <Wheel c={front} R={g.R} angle={wa} color={color} m={m} />
        <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
          {/* mudguards */}
          <path d={`M${f1(rear.x - g.R * 1.08)} ${f1(rear.y + g.R * 0.25)}A${f1(g.R * 1.1)} ${f1(g.R * 1.1)} 0 0 1 ${f1(rear.x + g.R * 0.75)} ${f1(rear.y - g.R * 0.82)}`} strokeWidth={f1(thin * 1.6)} />
          <path d={`M${f1(front.x - g.R * 0.8)} ${f1(front.y - g.R * 0.78)}A${f1(g.R * 1.1)} ${f1(g.R * 1.1)} 0 0 1 ${f1(front.x + g.R * 1.02)} ${f1(front.y + g.R * 0.3)}`} strokeWidth={f1(thin * 1.6)} />
          {/* frame: the level top tube is the "大杠" */}
          <path d={`M${pt(s(G.ttRear))}L${pt(s(G.headTop))}`} strokeWidth={f1(tube * 1.1)} />
          <path d={`M${pt(g.bb)}L${pt(s(G.headBot))}`} strokeWidth={f1(tube)} />
          <path d={`M${pt(g.bb)}L${pt(s(G.seatTop))}`} strokeWidth={f1(tube)} />
          <path d={`M${pt(s(G.headTop))}L${pt(s(G.headBot))}`} strokeWidth={f1(tube * 1.3)} />
          <path d={`M${pt(s(G.seatTop))}L${pt(rear)}M${pt(g.bb)}L${pt(rear)}`} strokeWidth={f1(thin)} />
          <path d={`M${pt(s(G.headBot))}Q${f1(0.64 * m)} ${f1(-0.5 * m)} ${pt(front)}`} strokeWidth={f1(thin * 1.2)} />
          {/* stem and swept-back handlebar */}
          <path d={`M${pt(s(G.headTop))}L${pt(s(G.stemTop))}`} strokeWidth={f1(thin * 1.2)} />
          <path d={`M${pt(s(G.stemTop))}Q${f1(0.44 * m)} ${f1(-1.05 * m)} ${pt(g.grip)}`} strokeWidth={f1(thin * 1.3)} />
          {/* rear rack */}
          <path d={`M${pt(rackA)}L${pt(rackB)}M${pt(rackA)}L${pt(rear)}M${f1((rackA.x + rackB.x) / 2)} ${f1(rackA.y)}L${pt(rear)}`} strokeWidth={f1(thin)} />
          {/* seat post */}
          <path d={`M${pt(s(G.seatTop))}L${pt(s(v(G.saddle.x + 0.01, G.saddle.y + 0.02)))}`} strokeWidth={f1(thin * 1.2)} />
          {/* crank */}
          <path d={`M${pt(g.pedalF)}L${pt(g.pedalN)}`} strokeWidth={f1(thin * 1.3)} />
          <path d={pedal(g.pedalF) + pedal(g.pedalN)} strokeWidth={f1(thin * 1.6)} />
          {parked && (
            <path d={`M${pt(rear)}L${f1(rear.x - 0.12 * m)} ${f1(-lift)}M${pt(rear)}L${f1(rear.x + 0.02 * m)} ${f1(-lift)}`} strokeWidth={f1(thin)} />
          )}
        </g>
        {/* saddle, chain case, bell */}
        <path d={`M${f1(-0.33 * m)} ${f1(-0.945 * m)}Q${f1(-0.22 * m)} ${f1(-0.99 * m)} ${f1(-0.08 * m)} ${f1(-0.94 * m)}L${f1(-0.12 * m)} ${f1(-0.9 * m)}Q${f1(-0.24 * m)} ${f1(-0.9 * m)} ${f1(-0.33 * m)} ${f1(-0.915 * m)}Z`} fill={color} />
        <path d={`M${f1(g.bb.x + 0.11 * m)} ${f1(g.bb.y)}A${f1(0.11 * m)} ${f1(0.11 * m)} 0 0 0 ${f1(g.bb.x)} ${f1(g.bb.y - 0.11 * m)}L${f1(rear.x)} ${f1(rear.y - 0.05 * m)}A${f1(0.05 * m)} ${f1(0.05 * m)} 0 0 0 ${f1(rear.x)} ${f1(rear.y + 0.05 * m)}L${f1(g.bb.x)} ${f1(g.bb.y + 0.11 * m)}A${f1(0.11 * m)} ${f1(0.11 * m)} 0 0 0 ${f1(g.bb.x + 0.11 * m)} ${f1(g.bb.y)}Z`} fill={color} opacity={0.92} />
        {bell && <circle cx={f1(0.42 * m)} cy={f1(-1.035 * m)} r={f1(0.026 * m)} fill={color} />}
      </g>
    </g>
  );
};
