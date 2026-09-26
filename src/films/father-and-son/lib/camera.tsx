import React, { createContext, useContext } from 'react';
import { Vec } from './math';

export const W = 1920;
export const H = 1080;
const CX = W / 2;
const CY = H / 2;

/** Camera looking at world point (x, y) of the dike plane, with a zoom factor. */
export interface Cam {
  x: number;
  y: number;
  zoom: number;
}

export const REST: Cam = { x: CX, y: CY, zoom: 1 };

const CamContext = createContext<Cam>(REST);
export const CamProvider = CamContext.Provider;
export const useCam = () => useContext(CamContext);

/** Effective zoom of a layer with parallax factor p (0 = infinitely far, 1 = dike plane). */
export const zoomAt = (cam: Cam, p: number) => 1 + (cam.zoom - 1) * p;

/** World → screen for a layer with parallax p. */
export const project = (cam: Cam, w: Vec, p = 1): Vec => {
  const z = zoomAt(cam, p);
  return {
    x: CX + (w.x - CX - (cam.x - CX) * p) * z,
    y: CY + (w.y - CY - (cam.y - CY) * p) * z,
  };
};

export const layerTransform = (cam: Cam, p: number) => {
  const z = zoomAt(cam, p);
  const ox = CX + (cam.x - CX) * p;
  const oy = CY + (cam.y - CY) * p;
  return `translate(${CX} ${CY}) scale(${z.toFixed(5)}) translate(${(-ox).toFixed(2)} ${(-oy).toFixed(2)})`;
};

/** A group placed at parallax depth p. */
export const Layer: React.FC<{ p: number; children: React.ReactNode; opacity?: number }> = ({ p, children, opacity }) => {
  const cam = useCam();
  return (
    <g transform={layerTransform(cam, p)} opacity={opacity}>
      {children}
    </g>
  );
};

/** Visible world x-range for a layer, handy for tiling scenery. */
export const visibleX = (cam: Cam, p: number, margin = 200): [number, number] => {
  const z = zoomAt(cam, p);
  const ox = CX + (cam.x - CX) * p;
  return [ox - CX / z - margin, ox + CX / z + margin];
};
