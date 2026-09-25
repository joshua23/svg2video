/**
 * 用 Speko 语音网关（https://api.speko.dev）合成阿凡提的对白。
 * Speko 会按语言和效果自动路由到最合适的 TTS 服务；这里优先请求支持
 * "表演指令"的模型，让每句台词带上角色语气。
 *
 *   export SPEKO_API_KEY=sk_live_...        # 不要写进仓库
 *   node scripts/afanti/speko-voice.mjs voices          # 列出可用音色
 *   node scripts/afanti/speko-voice.mjs                 # 合成全部 12 句
 *   node scripts/afanti/speko-voice.mjs l08             # 只合成第 8 句（试听）
 *
 * 可选环境变量：SPEKO_MODEL（默认 qwen3-tts-instruct-flash）、SPEKO_VOICE、SPEKO_BASE_URL。
 * 输出：build/afanti/voice_speko/<id>.wav（48kHz 单声道）。audio.mjs 发现这些文件时
 * 会直接使用它们（不再做变声处理）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LINES } from '../../src/remotion/afanti/plan.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'build/afanti/voice_speko');
const KEY = process.env.SPEKO_API_KEY;
const BASE = (process.env.SPEKO_BASE_URL ?? 'https://api.speko.dev').replace(/\/$/, '');
const MODEL = process.env.SPEKO_MODEL ?? 'qwen3-tts-instruct-flash';
const VOICE = process.env.SPEKO_VOICE;

if (!KEY) {
  console.error('缺少 SPEKO_API_KEY 环境变量');
  process.exit(1);
}

const CHARACTER =
  '你在为动画片配音，角色是阿凡提：新疆维吾尔族的中年男子，机智幽默、自信到有点夸张，嗓音温暖明亮，' +
  '普通话略带维吾尔族口音。表演要像喜剧动画一样夸张、有画面感，情绪饱满，不要播音腔。';

/** 每句台词的表演指令（对应画面里的动作） */
const STYLE = {
  l01: '他正被猛冲的毛驴拖在身后，惊慌地大喊，声音被颠得断断续续。',
  l02: '刚翻上驴背，手杖指向远方，豪气冲天地发号施令，最后"冲啊"喊得最响。',
  l03: '被毛驴左右甩来甩去，一连串失控的惊叫，声音随颠簸上下起伏。',
  l04: '突然被抛向空中，短促的一声惊呼。',
  l05: '站在驴背上张开双臂摇摇晃晃，小心翼翼、憋着气，自己给自己打气。',
  l06: '毛驴绊倒、自己翻了出去，短促的惊叫。',
  l07: '挂在驴身侧面像马戏演员，又怕又得意，故作潇洒地炫耀。',
  l08: '英雄般地骑行冲锋，自信满满、慢条斯理，带着一点自以为是的得意。',
  l09: '眼前的大叶板越来越大，信心开始动摇，迟疑、嘀咕、越说越心虚。',
  l10: '被木板迎面砸中，闷哼一声"哎哟"。',
  l11: '被挂在转动的木轮上，却硬撑着装淡定，慢悠悠、洋洋自得地说。',
  l12: '低头一看已经很高，彻底慌了，拼命大喊求救，再冲远去的毛驴喊回来。',
};

async function listVoices() {
  const r = await fetch(`${BASE}/v1/voices`, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`voices ${r.status}: ${await r.text()}`);
  const j = await r.json();
  for (const v of j.voices ?? []) console.log(`${v.vendor}\t${v.id}\t${v.name}`);
}

async function synth(line) {
  const body = {
    text: line.say,
    intent: { language: 'zh', optimizeFor: 'quality' },
    model: MODEL,
    instructions: `${CHARACTER}这一句：${STYLE[line.id] ?? ''}`,
  };
  if (VOICE) body.voice = VOICE;
  const r = await fetch(`${BASE}/v1/synthesize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${line.id} ${r.status}: ${await r.text()}`);
  const type = r.headers.get('content-type') ?? '';
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(OUT, { recursive: true });
  const wav = path.join(OUT, `${line.id}.wav`);
  const pcm = type.match(/audio\/pcm(?:;\s*rate=(\d+))?/i);
  const raw = path.join(OUT, `${line.id}.${pcm ? 'pcm' : type.includes('wav') ? 'src.wav' : type.includes('ogg') ? 'ogg' : 'mp3'}`);
  fs.writeFileSync(raw, buf);
  const inArgs = pcm ? ['-f', 's16le', '-ar', pcm[1] ?? '24000', '-ac', '1', '-i', raw] : ['-i', raw];
  execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', ...inArgs, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', wav], { cwd: ROOT, stdio: 'inherit' });
  console.log(`${line.id}  ${r.headers.get('x-speko-provider')}/${r.headers.get('x-speko-model')}  ${line.say}`);
}

const args = process.argv.slice(2);
if (args[0] === 'voices') await listVoices();
else {
  const todo = args.length ? LINES.filter((l) => args.includes(l.id)) : LINES;
  for (const l of todo) await synth(l);
}
