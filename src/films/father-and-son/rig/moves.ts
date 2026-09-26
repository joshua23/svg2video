import { clamp, easeInOut, invLerp } from '../lib/math';

export interface Move {
  x: number;
  /** Distance covered so far (for gait phase / wheel rotation). */
  dist: number;
  /** 0 = standing still, 1 = full stride — use to blend gait with a standing pose. */
  amount: number;
  facing: 1 | -1;
  moving: boolean;
  u: number;
}

/**
 * Travel from x0 to x1 between t0 and t1, easing in and out over `ramp` seconds.
 * Before t0 the mover waits at x0, after t1 at x1.
 */
export const travel = (t: number, t0: number, t1: number, x0: number, x1: number, ramp = 0.8): Move => {
  const T = t1 - t0;
  const r = Math.min(ramp, T / 2);
  // trapezoidal speed profile — constant cruising speed, smooth ramps
  const vmax = (x1 - x0) / (T - r);
  const tt = clamp(t - t0, 0, T);
  let d: number;
  let speed: number;
  if (tt < r) {
    d = (vmax * tt * tt) / (2 * r);
    speed = (vmax * tt) / r;
  } else if (tt > T - r) {
    const q = T - tt;
    d = x1 - x0 - (vmax * q * q) / (2 * r);
    speed = (vmax * q) / r;
  } else {
    d = (vmax * r) / 2 + vmax * (tt - r);
    speed = vmax;
  }
  const amount = Math.abs(vmax) < 1e-6 ? 0 : clamp(Math.abs(speed / vmax) * 1.6);
  return { x: x0 + d, dist: Math.abs(d), amount, facing: x1 >= x0 ? 1 : -1, moving: t > t0 && t < t1, u: T > 0 ? tt / T : 1 };
};

/** Eased 0→1 progress within [a, b]. */
export const phase = (t: number, a: number, b: number) => easeInOut(invLerp(a, b, t));

