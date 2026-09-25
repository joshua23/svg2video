/**
 * 阿凡提对白配音 —— 沿用 joshua23/magic-story-cup 的两条配音链路与音色：
 *
 *   OmniVoice（本地，magic-story-cup 默认）：POST {OMNIVOICE_BASE_URL}/v1/audio/speech
 *     音色 = 「老张」691d9d11（magic-story-cup 里给《防你没商量》乡村医生配音、在用的中老年男声，
 *     语速 0.225 秒/字）。机智、乡土、带点说书味，最贴阿凡提。
 *   Speko（云端，magic-story-cup 的 TTS_PROVIDER=speko）：POST {SPEKO_BASE_URL}/v1/synthesize
 *     音色 = 阿里 Qwen3-TTS 指令版 + Ethan。对比测试（同句合成后用 Speko 转写回来核对）里，
 *     magic-story-cup 的云端默认 onyx 中文最弱、会读错；Gemini 的男声一喊就飙到 300Hz 假声；
 *     Qwen Ethan 母语级普通话、字字准确、男中音，还能按句接受表演指令。
 *
 *   node scripts/afanti/dub.mjs                    # 默认 OmniVoice，合成全部 12 句
 *   node scripts/afanti/dub.mjs l08 l11            # 只合成指定的句子（试听）
 *   DUB_PROVIDER=speko SPEKO_API_KEY=... node scripts/afanti/dub.mjs
 *   （在只允许代理出网的环境里加 NODE_USE_ENV_PROXY=1，让 Node 的 fetch 走 HTTPS_PROXY）
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
const VOICE = process.env.DUB_VOICE ?? (PROVIDER === 'speko' ? 'Ethan' : '691d9d11');
/** Speko 端的模型：阿里 Qwen3-TTS 指令版（母语级普通话 + 支持逐句表演指令） */
const SPEKO_MODEL = process.env.SPEKO_TTS_MODEL ?? 'qwen3-tts-instruct-flash';
const SPEKO_TTS_PROVIDER = process.env.SPEKO_TTS_PROVIDER ?? 'alibaba-tts';
/** 实测语速（秒/字）：老张 0.225（magic-story-cup 语速表）；Qwen Ethan 约 0.2 */
const SEC_PER_CHAR = Number(process.env.DUB_SEC_PER_CHAR ?? (PROVIDER === 'speko' ? 0.27 : 0.225));

const CHARACTER =
  '你在为喜剧动画片配音，角色是阿凡提：一个幽默、智慧、俏皮的男人，说话总带着狡黠的笑意，' +
  '声音轻快灵动、有弹性，像讲笑话时冲人眨眼；自信里带点小得意，机灵又逗趣。' +
  '表演要生动夸张、有画面感，不要低沉，不要播音腔。';

/** 每句台词的表演指令（对应画面里的动作），只有支持指令的模型会用到 */
const STYLE = {
  l01: '他正被猛冲的毛驴拖在身后，惊慌地大喊，声音被颠得断断续续。',
  l02: '刚翻上驴背，手杖指向远方，豪气冲天地发号施令，"辘轳"读作 lù lu，最后"冲啊"喊得最响。语速要快。',
  l03: '被毛驴左右甩来甩去，一连串失控的惊叫，声音随颠簸上下起伏。',
  l04: '突然被抛向空中，短促的一声惊呼。',
  l05: '站在驴背上张开双臂摇摇晃晃，小心翼翼、憋着气，自己给自己打气。',
  l06: '毛驴绊倒、自己翻了出去，短促的惊叫。',
  l07: '挂在驴身侧面像马戏演员，又怕又得意，故作潇洒地炫耀。',
  l08: '英雄般地骑行冲锋，自信满满，带着一点自以为是的得意。',
  l09: '眼前的大叶板越来越大，信心开始动摇，迟疑、嘀咕、越说越心虚。',
  l10: '被木板迎面砸中，闷哼一声。',
  l11: '被挂在转动的木轮上，却硬撑着装淡定，洋洋自得地说。',
  l12: '低头一看已经很高，彻底慌了，拼命大喊求救，再冲远去的毛驴喊回来。语速要快。',
};

/** 按镜头时长给每句一个语速：估算时长 = 字数 × 秒/字 + 标点停顿，超出就加快（封顶 1.6×） */
const slotOf = (i) => (LINES[i + 1]?.t ?? DURATION_S) - LINES[i].t - 0.08;

function speedFor(i) {
  const l = LINES[i];
  const slot = slotOf(i);
  const chars = [...l.say].filter((c) => /[一-鿿]/.test(c)).length;
  const pauses = [...l.say].filter((c) => /[，。！？、]/.test(c)).length;
  const est = chars * SEC_PER_CHAR + pauses * 0.12;
  return Math.min(1.6, Math.max(1.0, est / slot));
}

/** 实测 wav 中有声部分的时长（秒） */
function speechSpan(wav) {
  const b = fs.readFileSync(wav);
  const n = (b.length - 44) >> 1;
  let a = -1;
  let z = -1;
  for (let i = 0; i < n; i++) {
    if (Math.abs(b.readInt16LE(44 + i * 2)) > 650) {
      if (a < 0) a = i;
      z = i;
    }
  }
  return a < 0 ? 0 : (z - a) / 48000;
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

/** 用 Speko 的语音识别把 take 转写回来，核对有没有读错字（只比较汉字） */
async function transcribeOk(wav, line) {
  if (PROVIDER !== 'speko') return { ok: true, heard: '' };
  const r = await fetch(`${SPEKO}/v1/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'audio/wav', 'X-Speko-Intent': JSON.stringify({ language: 'zh-CN' }) },
    body: fs.readFileSync(wav),
  });
  const raw = await r.text();
  const m = [...raw.matchAll(/"text"\s*:\s*"([^"]*)"/g)].map((x) => x[1]);
  const heard = (m[m.length - 1] ?? '').replace(/[^\u4e00-\u9fff]/g, '');
  const want = line.say.replace(/[^\u4e00-\u9fff]/g, '');
  // 允许同音字（如「辘轳」被听写成「噜噜」），只要大多数字对得上
  let hit = 0;
  for (const ch of want) if (heard.includes(ch)) hit++;
  return { ok: hit / Math.max(1, want.length) >= 0.65, heard };
}

async function speko(line, speed) {
  if (!KEY) throw new Error('DUB_PROVIDER=speko 需要 SPEKO_API_KEY 环境变量');
  // 请求形状沿用 magic-story-cup TtsService._synthesizeSpeko，另加表演指令并锁定到阿里 Qwen3-TTS
  const body = {
    text: line.say,
    intent: { language: 'zh-CN', optimizeFor: 'accuracy' },
    voice: VOICE,
    model: SPEKO_MODEL,
    instructions: `${CHARACTER}这一句：${STYLE[line.id] ?? ''}`,
    constraints: { allowedProviders: { tts: [SPEKO_TTS_PROVIDER] } },
    ...(speed !== 1 && { speed: Number(speed.toFixed(3)) }),
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

const TAKES = Number(process.env.DUB_TAKES ?? 3);
const ids = process.argv.slice(2);
for (const [i, line] of LINES.entries()) {
  if (ids.length && !ids.includes(line.id)) continue;
  const slot = slotOf(i);
  const speed = Math.min(1.35, speedFor(i));
  // 表演型 TTS 每次的节奏都不同：合成几个 take，挑最贴合镜头时长的一条
  // （优先放得下的里面最长、最从容的；都放不下就取最短的，混音时再轻微压缩）
  const takes = [];
  for (let k = 0; k < TAKES; k++) {
    const res = PROVIDER === 'speko' ? await speko(line, speed) : await omnivoice(line, speed);
    const wav = toWav(res.buf, res.type, `${line.id}.take${k}`);
    const check = await transcribeOk(wav, line);
    takes.push({ wav, span: speechSpan(wav), via: res.via, ok: check.ok, heard: check.heard });
    if (PROVIDER !== 'speko') break; // OmniVoice 同样的输入结果稳定，一条即可
  }
  // 只在读音核对通过的 take 里挑（全都没过就退回全部）
  const good = takes.filter((t) => t.ok);
  const pool = good.length ? good : takes;
  const fit = pool.filter((t) => t.span <= slot).sort((a, b) => b.span - a.span)[0];
  const best = fit ?? [...pool].sort((a, b) => a.span - b.span)[0];
  fs.copyFileSync(best.wav, path.join(OUT, `${line.id}.wav`));
  console.log(`${line.id}  ${best.via}  speed=${speed.toFixed(2)}  takes=[${takes.map((t) => `${t.span.toFixed(2)}${t.ok ? '' : '✗'}`).join(', ')}]  听写「${best.heard}」  选 ${best.span.toFixed(2)}s / 镜头 ${slot.toFixed(2)}s  ${line.say}`);
}
