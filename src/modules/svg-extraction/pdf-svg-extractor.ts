import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { SVGPathData } from '../shared/project-types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ExtractedSVG {
  svg_content: string;
  paths: SVGPathData[];
  dimensions: {
    width: number;
    height: number;
    viewBox: string;
  };
}

export class PDFSVGExtractor {
  async extractSVGFromPDF(pdfBlob: Blob): Promise<ExtractedSVG[]> {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const extractedSVGs: ExtractedSVG[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      const operatorList = await page.getOperatorList();
      const svgContent = this.convertOperatorListToSVG(operatorList, viewport);

      if (svgContent) {
        const paths = this.extractPathsFromSVG(svgContent);

        extractedSVGs.push({
          svg_content: svgContent,
          paths,
          dimensions: {
            width: viewport.width,
            height: viewport.height,
            viewBox: `0 0 ${viewport.width} ${viewport.height}`,
          },
        });
      }
    }

    return extractedSVGs;
  }

  private convertOperatorListToSVG(operatorList: any, viewport: any): string {
    const width = viewport.width;
    const height = viewport.height;

    let svgPaths: string[] = [];
    let currentPath = '';
    let currentX = 0;
    let currentY = 0;

    const ops = operatorList.fnArray;
    const args = operatorList.argsArray;

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const arg = args[i];

      switch (op) {
        case pdfjsLib.OPS.moveTo:
          currentX = arg[0];
          currentY = arg[1];
          currentPath += `M ${currentX} ${currentY} `;
          break;
        case pdfjsLib.OPS.lineTo:
          currentX = arg[0];
          currentY = arg[1];
          currentPath += `L ${currentX} ${currentY} `;
          break;
        case pdfjsLib.OPS.curveTo:
          currentPath += `C ${arg[0]} ${arg[1]}, ${arg[2]} ${arg[3]}, ${arg[4]} ${arg[5]} `;
          currentX = arg[4];
          currentY = arg[5];
          break;
        case pdfjsLib.OPS.closePath:
          currentPath += 'Z ';
          if (currentPath.trim()) {
            svgPaths.push(currentPath.trim());
            currentPath = '';
          }
          break;
      }
    }

    if (currentPath.trim()) {
      svgPaths.push(currentPath.trim());
    }

    if (svgPaths.length === 0) {
      return '';
    }

    const pathElements = svgPaths.map((path, index) =>
      `<path d="${path}" fill="none" stroke="#000000" stroke-width="2" id="path-${index}"/>`
    ).join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${pathElements}
</svg>`;
  }

  private extractPathsFromSVG(svgContent: string): SVGPathData[] {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const pathElements = svgDoc.querySelectorAll('path');

    return Array.from(pathElements).map((path, index) => {
      const d = path.getAttribute('d') || '';
      const length = this.calculatePathLength(d);

      return {
        id: path.getAttribute('id') || `path-${index}`,
        pathData: d,
        length,
        stroke: path.getAttribute('stroke') || '#000000',
        fill: path.getAttribute('fill') || 'none',
        strokeWidth: parseFloat(path.getAttribute('stroke-width') || '2'),
        index,
      };
    });
  }

  private calculatePathLength(pathData: string): number {
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', pathData);
    tempSvg.appendChild(tempPath);
    document.body.appendChild(tempSvg);

    const length = tempPath.getTotalLength();

    document.body.removeChild(tempSvg);

    return length;
  }

  async extractBestSVG(pdfBlob: Blob): Promise<ExtractedSVG | null> {
    const extractedSVGs = await this.extractSVGFromPDF(pdfBlob);

    if (extractedSVGs.length === 0) {
      return null;
    }

    const svgWithMostPaths = extractedSVGs.reduce((best, current) =>
      current.paths.length > best.paths.length ? current : best
    );

    return svgWithMostPaths;
  }
}
