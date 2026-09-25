import { Camera, V3, add, makeCamera, mix3, noise1 } from './math3d';
import { ROCK_X, SHOTS, T, WHEEL, donkeyAt, ramp, shotAt, smooth, lerp, clamp, wheelAngle } from './plan';


/** 撞击后阿凡提双手抓叶板的位置（离轮心的半径） */
export const GRIP_R = 2.05;
/** 撞击后阿凡提身体中心的大致世界坐标（手在叶板上，身体垂在下方约 0.75m） */
export function afantiOnWheel(t: number): V3 {
  const a = wheelAngle(t);
  return [WHEEL.x + GRIP_R * Math.sin(a) - 0.16 * Math.cos(a), 0, WHEEL.axleZ - GRIP_R * Math.cos(a) - 0.16 * Math.sin(a) - 0.75];
}

export interface ShotFx {
  cam: Camera;
  view: 'auto' | 'front' | 'pov';
  speedLines: number; // 0..1
  shake: number;
  shotIndex: number;
  local: number; // 0..1 镜头内进度
}

const D = (t: number): V3 => {
  const d = donkeyAt(t);
  return [d.x, d.y, 0];
};

function shake(t: number, amp: number): V3 {
  return [noise1(t * 9, 1) * amp, noise1(t * 9, 7) * amp, noise1(t * 11, 3) * amp];
}

export function cameraAt(t: number): ShotFx {
  const shot = shotAt(t);
  const idx = SHOTS.indexOf(shot);
  const u = clamp((t - shot.start) / (shot.end - shot.start));
  const d = D(t);
  let pos: V3;
  let tgt: V3;
  let fov = 50;
  let roll = 0;
  let view: ShotFx['view'] = 'auto';
  let speedLines = 0;
  let sh = 0.02;

  switch (shot.id) {
    case 'A_lowSide': {
      // 低机位侧前方，镜头随毛驴猛冲略微后拉
      const e = smooth(u);
      pos = add(d, [lerp(2.9, 2.2, e), lerp(-2.4, -3.3, e), 0.45]);
      tgt = add(d, [lerp(-0.3, 0.2, e), 0, 1.25]);
      fov = 58;
      sh = 0.035;
      break;
    }
    case 'B_wideReveal': {
      const e = smooth(u);
      pos = add(d, [lerp(-3.5, -2.2, e), -8.6, lerp(1.0, 1.3, e)]);
      tgt = add(d, [5.5, 0, 1.6]);
      fov = 44;
      speedLines = 0.3;
      break;
    }
    case 'C_frontZig': {
      pos = [d[0] + 7.6, 0, 2.55];
      tgt = [d[0], 0, 0.95];
      fov = 42;
      view = 'front';
      sh = 0.03;
      break;
    }
    case 'D_rockLow': {
      const follow = Math.max(ROCK_X + 1.6, d[0] - 2.0);
      pos = [lerp(ROCK_X + 1.6, follow, ramp(t, 4.8, 5.3)), -4.6, 0.22];
      const lift = donkeyAt(t).z;
      tgt = [d[0] + 0.6, d[1], 1.35 + lift * 0.8];
      fov = 64;
      sh = 0.015;
      break;
    }
    case 'E_hoofCU': {
      pos = add(d, [1.3, -1.45, 0.18]);
      tgt = add(d, [0.55, 0, 0.28]);
      fov = 42;
      sh = 0.03;
      speedLines = 0.4;
      break;
    }
    case 'F_orbit': {
      // 快速环绕：从侧后方甩到侧前方
      const e = smooth(u);
      const th = lerp(-128, -42, e) * (Math.PI / 180);
      const R = 4.6;
      pos = add(d, [R * Math.cos(th), R * Math.sin(th), lerp(1.2, 1.9, e)]);
      tgt = add(d, [0.6, 0, 1.25]);
      fov = 52;
      sh = 0.03;
      break;
    }
    case 'G_dutchSide': {
      pos = add(d, [-1.6, -5.6, 2.5]);
      tgt = add(d, [0.9, 0, 0.9]);
      fov = 46;
      roll = lerp(-4, -13, smooth(u));
      speedLines = 0.5;
      sh = 0.04;
      break;
    }
    case 'H_hoofTrack': {
      pos = add(d, [1.3, -2.5, 0.3]);
      tgt = add(d, [0.1, 0, 1.3]);
      fov = 70;
      speedLines = 0.4;
      sh = 0.035;
      break;
    }
    case 'I_lateral': {
      pos = add(d, [-0.8, -6.6, 1.35]);
      tgt = add(d, [3.2, 0, 1.4]);
      fov = 36;
      speedLines = 0.8;
      sh = 0.03;
      break;
    }
    case 'J_frontHero': {
      const e = smooth(u);
      pos = [d[0] + lerp(6.8, 5.6, e), d[1] * 0.5, 0.95];
      tgt = [d[0], d[1], 1.55];
      fov = 34;
      view = 'front';
      sh = 0.025;
      break;
    }
    case 'K_pov': {
      const dd = donkeyAt(t);
      const bob = Math.abs(Math.sin(dd.phase * Math.PI * 2)) * 0.05;
      pos = [dd.x - 0.12, dd.y, 2.12 - bob - dd.duck * 0.1];
      tgt = [WHEEL.x + 1, 0, lerp(2.4, 2.0, u)];
      fov = lerp(62, 52, u);
      view = 'pov';
      sh = 0.02;
      break;
    }
    case 'L_impact': {
      const k = Math.exp(-Math.max(0, t - T.impact) * 7);
      pos = [WHEEL.x - 3.4, -7.6, 1.4];
      tgt = [WHEEL.x - 0.7, 0, 2.1];
      fov = 44;
      sh = 0.02 + 0.22 * k;
      break;
    }
    case 'M_wideLow':
    default: {
      // 低角度广角：先交代辘轳全景和跑远的毛驴，再向上推近，跟住被越带越高的阿凡提
      const e = smooth(u * 4);
      const wideP = mix3([WHEEL.x - 5.4, -10.2, 0.35], [WHEEL.x - 5.1, -9.7, 0.38], e);
      const wideT = mix3([WHEEL.x - 0.1, 0, 3.7], [WHEEL.x - 0.3, 0, 4.0], e);
      const a = afantiOnWheel(t);
      const closeT: V3 = [a[0] + 0.3, a[1], a[2] + 0.1];
      const closeP: V3 = [a[0] - 2.0, a[1] - 4.8, Math.max(0.4, a[2] - 2.0)];
      const k = smooth((t - 12.35) / 0.85);
      pos = mix3(wideP, closeP, k);
      tgt = mix3(wideT, closeT, k);
      fov = lerp(52, 40, k);
      sh = 0.008 + 0.012 * ramp(t, T.panic, T.panic + 0.3);
      break;
    }
  }
  const s = shake(t, sh);
  const cam = makeCamera(add(pos, s), add(tgt, [s[0] * 0.5, s[1] * 0.5, s[2] * 0.5]), fov, roll);
  return { cam, view, speedLines, shake: sh, shotIndex: idx, local: u };
}

export { donkeyAt };
