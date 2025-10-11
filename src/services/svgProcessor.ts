import { getLength } from '@remotion/paths';
import { SVGPathData } from '../types';

export class SVGProcessor {
  parseSVG(svgContent: string): SVGPathData[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    const paths: SVGPathData[] = [];
    const pathElements = doc.querySelectorAll('path');

    pathElements.forEach((pathElement, index) => {
      const pathData = pathElement.getAttribute('d');
      if (pathData) {
        try {
          const length = getLength(pathData);

          paths.push({
            id: `path-${index}`,
            pathData,
            length,
            stroke: pathElement.getAttribute('stroke') || '#000000',
            fill: pathElement.getAttribute('fill') || 'none',
            strokeWidth: parseFloat(pathElement.getAttribute('stroke-width') || '1'),
            index,
          });
        } catch (error) {
          console.warn(`Failed to process path ${index}:`, error);
        }
      }
    });

    return paths;
  }

  convertShapeToPath(svgContent: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      return svgContent;
    }

    const circles = svg.querySelectorAll('circle');
    circles.forEach((circle) => {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '0');

      const pathData = `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`;

      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', circle.getAttribute('stroke') || '#000000');
      path.setAttribute('fill', circle.getAttribute('fill') || 'none');
      path.setAttribute('stroke-width', circle.getAttribute('stroke-width') || '1');

      circle.parentNode?.replaceChild(path, circle);
    });

    const rects = svg.querySelectorAll('rect');
    rects.forEach((rect) => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const width = parseFloat(rect.getAttribute('width') || '0');
      const height = parseFloat(rect.getAttribute('height') || '0');

      const pathData = `M ${x},${y} L ${x + width},${y} L ${x + width},${y + height} L ${x},${y + height} Z`;

      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', rect.getAttribute('stroke') || '#000000');
      path.setAttribute('fill', rect.getAttribute('fill') || 'none');
      path.setAttribute('stroke-width', rect.getAttribute('stroke-width') || '1');

      rect.parentNode?.replaceChild(path, rect);
    });

    const polygons = svg.querySelectorAll('polygon');
    polygons.forEach((polygon) => {
      const points = polygon.getAttribute('points') || '';
      const coords = points.trim().split(/\s+/).map(p => p.split(',').map(Number));

      if (coords.length > 0) {
        let pathData = `M ${coords[0][0]},${coords[0][1]}`;
        for (let i = 1; i < coords.length; i++) {
          pathData += ` L ${coords[i][0]},${coords[i][1]}`;
        }
        pathData += ' Z';

        const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', polygon.getAttribute('stroke') || '#000000');
        path.setAttribute('fill', polygon.getAttribute('fill') || 'none');
        path.setAttribute('stroke-width', polygon.getAttribute('stroke-width') || '1');

        polygon.parentNode?.replaceChild(path, polygon);
      }
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  }

  extractViewBox(svgContent: string): { width: number; height: number; viewBox?: string } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      return { width: 1024, height: 1024 };
    }

    const viewBox = svg.getAttribute('viewBox');
    const width = parseFloat(svg.getAttribute('width') || '1024');
    const height = parseFloat(svg.getAttribute('height') || '1024');

    return { width, height, viewBox: viewBox || undefined };
  }

  async processAndExtractPaths(svgContent: string): Promise<{
    paths: SVGPathData[];
    dimensions: { width: number; height: number; viewBox?: string };
    processedSVG: string;
  }> {
    const processedSVG = this.convertShapeToPath(svgContent);
    const paths = this.parseSVG(processedSVG);
    const dimensions = this.extractViewBox(processedSVG);

    return {
      paths,
      dimensions,
      processedSVG,
    };
  }
}
