/**
 * 渲染成片：node scripts/afanti/render.mjs [输出路径]
 * 先运行 npm run afanti:audio 生成 public/afanti/soundtrack.wav。
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { existsSync, globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// 用法：node scripts/afanti/render.mjs [合成ID] [输出路径]
const ID = process.argv[2] ?? 'AfantiKarez';
const out = path.resolve(process.argv[3] ?? path.join(ROOT, ID === 'AfantiKarez3D' ? 'renders/afanti-karez-3d.mp4' : 'renders/afanti-karez.mp4'));
// 3D 版需要 WebGL：没有 GPU 的机器用软件渲染 swangle，有 GPU 的机器可设 AFANTI_GL=angle
const chromiumOptions = { gl: process.env.AFANTI_GL ?? (ID === 'AfantiKarez3D' ? 'swangle' : undefined) };

if (!existsSync(path.join(ROOT, 'public/afanti/soundtrack.wav'))) {
  console.warn('⚠ 没有找到 public/afanti/soundtrack.wav，视频将没有声音（先运行 npm run afanti:audio）');
}

// 云端/CI 环境里优先用预装的 Chromium headless shell；本地则让 Remotion 自己管理浏览器
const browserExecutable =
  process.env.REMOTION_BROWSER ?? globSync('/opt/pw-browsers/chromium_headless_shell-*/*/headless_shell')[0] ?? null;

const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/remotion/Root.tsx'), publicDir: path.join(ROOT, 'public') });
const composition = await selectComposition({ serveUrl, id: ID, browserExecutable, chromiumOptions });
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  crf: 18,
  audioCodec: 'aac',
  audioBitrate: '192k',
  outputLocation: out,
  browserExecutable,
  chromiumOptions,
  concurrency: Number(process.env.CONCURRENCY ?? 3),
  timeoutInMilliseconds: 240000,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 20);
    if (p !== last) {
      last = p;
      process.stdout.write(`\r渲染中 ${Math.round(progress * 100)}%`);
    }
  },
});
console.log(`\n✅ ${path.relative(ROOT, out)}`);
