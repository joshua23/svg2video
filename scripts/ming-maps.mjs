// Pre-projects the maps used by the "Ming" video into SVG path strings so the
// composition does not ship megabytes of TopoJSON or project coastlines per frame.
//
// Usage: node scripts/ming-maps.mjs  ->  src/videos/ming/art/maps.json

import { geoEquirectangular, geoGraticule10, geoMercator, geoOrthographic, geoPath } from 'd3-geo';
import fs from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { feature } from 'topojson-client';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const land50 = require('world-atlas/land-50m.json');
const land10 = require('world-atlas/land-10m.json');
const land110 = require('world-atlas/land-110m.json');
const countries110 = require('world-atlas/countries-110m.json');

const round = (d) => (d ?? '').replace(/(\d+\.\d{1})\d+/g, '$1');

// 1. Zheng He's voyages, 1405-1433 (equirectangular, Indian Ocean + South China Sea).
const zh = geoEquirectangular()
  .fitExtent([[60, 60], [1860, 1020]], { type: 'MultiPoint', coordinates: [[34, -12], [126, 38]] })
  .clipExtent([[-40, -40], [1960, 1120]]);
const zhPath = geoPath(zh);
const ports = [
  ['南京', 118.8, 32.05], ['长乐', 119.5, 25.96], ['占城', 109.2, 13.8], ['马六甲', 102.25, 2.2],
  ['锡兰', 80.2, 6.03], ['古里', 75.78, 11.25], ['霍尔木兹', 56.27, 27.1], ['马林迪', 40.12, -3.22],
];
const routeCoords = [
  [118.8, 32.05], [122.3, 30.5], [119.5, 25.96], [117.5, 22.0], [111.5, 16.5], [109.2, 13.8], [106.5, 7.5],
  [104.4, 1.3], [102.25, 2.2], [98.2, 5.8], [93.0, 6.2], [85.0, 5.2], [80.2, 6.03], [76.8, 8.2], [75.78, 11.25],
];
const branchHormuz = [[75.78, 11.25], [68.5, 18.5], [60.5, 23.5], [56.27, 27.1]];
const branchAfrica = [[75.78, 11.25], [62.0, 6.0], [50.0, 1.0], [40.12, -3.22]];
const line = (coords) => round(zhPath({ type: 'LineString', coordinates: coords }));
const zhLand = feature(land50, land50.objects.land);
const zhenghe = {
  land: round(zhPath(zhLand)),
  graticule: round(zhPath(geoGraticule10())),
  route: line(routeCoords),
  hormuz: line(branchHormuz),
  africa: line(branchAfrica),
  ports: ports.map(([name, lon, lat]) => {
    const [x, y] = zh([lon, lat]);
    return { name, x: +x.toFixed(1), y: +y.toFixed(1) };
  }),
};

// 2. Hainan and Lingao (Mercator close-up).
const hn = geoMercator().center([109.75, 19.45]).scale(15500).translate([1300, 600]).clipExtent([[-40, -40], [1960, 1120]]);
const hnPath = geoPath(hn);
const hnLand = feature(land10, land10.objects.land);
const hainan = {
  land: round(hnPath(hnLand)),
  graticule: round(hnPath(geoGraticule10())),
  lingao: hn([109.69, 19.91]).map((v) => +v.toFixed(1)),
  qiongzhou: hn([110.35, 20.0]).map((v) => +v.toFixed(1)),
  island: hn([109.85, 19.05]).map((v) => +v.toFixed(1)),
  leizhou: hn([110.05, 20.75]).map((v) => +v.toFixed(1)),
};

// 3. An orthographic globe centred between Europe and China.
const gl = geoOrthographic().rotate([-62, -30]).scale(400).translate([0, 0]).clipAngle(90);
const glPath = geoPath(gl);
const countries = feature(countries110, countries110.objects.countries).features;
const WEST = new Set([
  '826', '250', '276', '380', '724', '620', '528', '056', '756', '040', '752', '578', '208', '246', '372', '616',
  '203', '348', '642', '100', '300', '703', '705', '191', '440', '428', '233', '442', '470', '352',
]);
const globe = {
  land: round(glPath(feature(land110, land110.objects.land))),
  graticule: round(glPath(geoGraticule10())),
  china: round(glPath({ type: 'FeatureCollection', features: countries.filter((c) => c.id === '156') })),
  west: round(glPath({ type: 'FeatureCollection', features: countries.filter((c) => WEST.has(c.id)) })),
  sphere: round(glPath({ type: 'Sphere' })),
};

const out = join(root, 'src/videos/ming/art/maps.json');
fs.writeFileSync(out, JSON.stringify({ zhenghe, hainan, globe }));
console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(0), 'KB');
