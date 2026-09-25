/**
 * 阿凡提对白配音 —— 沿用 joshua23/magic-story-cup 的两条配音链路与音色：
 *
 *   OmniVoice（本地，magic-story-cup 默认）：POST {OMNIVOICE_BASE_URL}/v1/audio/speech
 *     音色 = 「老张」691d9d11（magic-story-cup 里给《防你没商量》乡村医生配音、在用的中老年男声，
 *     语速 0.225 秒/字）。机智、乡土、带点说书味，最贴阿凡提。
 *   Speko（云端，magic-story-cup 的 TTS_PROVIDER=speko）：POST {SPEKO_BASE_URL}/v1/synthesize
 *     音色 = onyx（magic-story-cup 云端候选里唯一的低沉男声）。
 *
 *   node scripts/afanti/dub.mjs                    # 默认 OmniVoice，合成全部 12 句
 *   node scripts/afanti/dub.mjs l08 l11            # 只合成指定的句子（试听）
 *   DUB_PROVIDER=speko SPEKO_API_KEY=... node scripts/afanti/dub.mjs
 *
 * 可覆盖：OMNIVOICE_BASE_URL（默认 http://localhost:3900）、DUB_VOICE（音色 id）、SPEKO_BASE_URL。
 * 输出 build/afanti/voice_ext/<id>.wav（48kHz 单声道）；audio.mjs 发现这些文件就直接使用。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DURATION_S, LINES } from '../../src/remotion/afanti/plan.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'build/afanti/voice_ext');
const PROVIDER = process.env.DUB_PROVIDER ?? 'omnivoice';
const OMNI = (process.env.OMNIVOICE_BASE_URL ?? 'http://localhost:3900').replace(/\/$/, '');
const SPEKO = (process.env.SPEKO_BASE_URL ?? 'https://api.speko.dev').replace(/\/$/, '');
const KEY = process.env.SPEKO_API_KEY ?? '';
const VOICE = process.env.DUB_VOICE ?? (PROVIDER === 'speko' ? 'onyx' : '691d9d11');
/** 老张的实测语速（magic-story-cup tts_service.dart 语速表），用来把每句压进镜头时长 */
const SEC_PER_CHAR = Number(process.env.DUB_SEC_PER_CHAR ?? 0.225);

/** 按镜头时长给每句一个语速：估算时长 = 字数 × 秒/字 + 标点停顿，超出就加快（封顶 1.6×） */
function speedFor(i) {
  const l = LINES[i];
  const slot = (LINES[i + 1]?.t ?? DURATION_S) - l.t - 0.08;
  const chars = [...l.say].filter((c) => /[一-鿿]/.test(c)).length;
  const pauses = [...l.say].filter((c) => /[，。！？、]/.test(c)).length;
  const est = chars * SEC_PER_CHAR + pauses * 0.12;
  return Math.min(1.6, Math.max(1.0, est / slot));
}

function toWav(buf, type, id) {
  fs.mkdirSync(OUT, { recursive: true });
  const pcm = type.match(/audio\/pcm(?:;\s*rate=(\d+))?/i);
  const ext = pcm ? 'pcm' : type.includes('wav') ? 'src.wav' : 'mp3';
  const raw = path.join(OUT, `${id}.${ext}`);
  fs.writeFileSync(raw, buf);
  const inArgs = pcm ? ['-f', 's16le', '-ar', pcm[1] ?? '24000', '-ac', '1', '-i', raw] : ['-i', raw];
  const wav = path.join(OUT, `${id}.wav`);
  execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', ...inArgs, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', wav], { cwd: ROOT, stdio: 'inherit' });
  fs.rmSync(raw);
  return wav;
}

async function omnivoice(line, speed) {
  // 与 magic-story-cup TtsService.buildSpeechRequestBody 相同；有 voice_id 时不发 instruct
  const r = await fetch(`${OMNI}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omnivoice', input: line.say, voice: VOICE, response_format: 'mp3', speed, language: 'zh' }),
  });
  if (!r.ok) throw new Error(`OmniVoice ${line.id} HTTP ${r.status}: ${await r.text()}`);
  return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') ?? 'audio/mpeg', via: `omnivoice/${VOICE}` };
}

async function speko(line, speed) {
  if (!KEY) throw new Error('DUB_PROVIDER=speko 需要 SPEKO_API_KEY 环境变量');
  // 与 magic-story-cup TtsService._synthesizeSpeko 相同的请求形状
  const body = {
    text: line.say,
    intent: { language: 'zh-CN', optimizeFor: 'balanced' },
    workload: 'narration',
    voice: VOICE,
    ...(speed !== 1 && { speed: Number(speed.toFixed(3)) }),
    ...(process.env.SPEKO_TTS_MODEL && { model: process.env.SPEKO_TTS_MODEL }),
  };
  const r = await fetch(`${SPEKO}/v1/synthesize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Speko ${line.id} HTTP ${r.status}: ${await r.text()}`);
  const type = r.headers.get('x-speko-audio-format') ?? r.headers.get('content-type') ?? '';
  return { buf: Buffer.from(await r.arrayBuffer()), type, via: `speko/${r.headers.get('x-speko-model') ?? '?'}/${VOICE}` };
}

const ids = process.argv.slice(2);
for (const [i, line] of LINES.entries()) {
  if (ids.length && !ids.includes(line.id)) continue;
  const speed = speedFor(i);
  const res = PROVIDER === 'speko' ? await speko(line, speed) : await omnivoice(line, speed);
  toWav(res.buf, res.type, line.id);
  console.log(`${line.id}  ${res.via}  speed=${speed.toFixed(2)}  ${line.say}`);
}
