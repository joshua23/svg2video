import { Cam, W, project, zoomAt } from './camera';
import { Vec } from './math';

/**
 * The set: a long river dike seen from the landward side, the crest running
 * straight across the frame and the river opening out beyond it.
 */
export const HORIZON = 462;
export const CREST = 640;
/** Pixels per metre on the crest at zoom 1. */
export const M = 70;
/** Standing height of a grown man on the crest. */
export const MAN = 1.72 * M;
/** Distance of the far shore, in crest-distances. */
export const SHORE_Z = 11;
/** How far the water lies below the crest, metres. */
export const WATER_DROP = 1.1;

/** Rest-position screen point for lateral position x (crest px), depth z and elevation (m, + up). */
export const restAt = (x: number, z: number, elev = 0): Vec => ({
  x: W / 2 + (x - W / 2) / z,
  y: HORIZON + (CREST - HORIZON) / z - (elev * M) / z,
});

/** Screen position and scale of something standing at depth z beyond (z > 1) or before (z < 1) the crest. */
export const atDepth = (cam: Cam, x: number, z: number, elev = 0) => {
  const p = 1 / z;
  const s = project(cam, restAt(x, z, elev), p);
  return { x: s.x, y: s.y, scale: zoomAt(cam, p) / z };
};

/** Far slope of the dike: elevation (m) at depth z, reaching the water at z = 1.22. */
export const farSlopeElev = (z: number) => -Math.min(WATER_DROP, ((z - 1) / 0.22) * WATER_DROP);
