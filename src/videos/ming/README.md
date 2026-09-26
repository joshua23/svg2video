# 临高启明 · 工业党的另类历史

A ~3 min 53 s motion-graphics essay (1920×1080, 30 fps, Simplified Chinese) built as the
Remotion composition `MingIndustrialParty`. It follows the style of kinetic typography over
parchment / night line art, with a HUD showing chapter, year, a 1368–2026 timeline and
China's share of world GDP (Maddison estimates).

## Story

| 章 | 内容 |
| --- | --- |
| 序 · 假如 | 穿越回明朝，你会做什么？当皇帝、写诗，还是建钢铁厂 |
| 壹 · 大明 | 1368 开国；约占世界经济四分之一；郑和七下西洋 |
| 贰 · 大分流 | 煤、蒸汽、工厂、铁路；“大分流”；1840；1820→1950 份额从 32.9% 跌到 4.5% |
| 叁 · 临高 | 《临高启明》：五百多名现代人 1628 年登陆临高，勘探、发电、炼铁、水泥、办学、编户、标准化、训练工人——金手指是整个工业体系 |
| 肆 · 鞭策 | 幻想也是鞭策，但不针对西方；民族主义色彩鲜明、西方鲜有人知；工业党不是自由主义道德家，不预设“天然阶梯”，视现实政治为理所当然 |
| 伍 · 锋芒 | 锋芒指向同胞与“情怀党”；战斗口号三段引文（蓄积动力 · 摆脱加入世贸后的劣势位置 · 不要迷失在人文主义想象中） |
| 陆 · 硬道理 | “发展才是硬道理”；拥抱发展的残酷真相：钢铁、电力、机床、芯片；落后就要挨打；讲的是现在 |
| 终 · 镜 | 一面镜子；焦虑与决心；假如真能回到 1368 年，你会带走什么？ |

## Files

- `beats.json` — the beat sheet: every shot's length (in beats at 100 BPM), palette, chapter,
  HUD year, music section and hit. Both the picture and the score are driven by it.
- `scenes.tsx` — the text and art for each shot; `art/*.tsx` — procedural SVG line art.
- `MingVideo.tsx`, `Hud.tsx`, `kit.tsx`, `theme.ts`, `timeline.ts` — composition, HUD and helpers.

## Regenerating assets

```bash
node scripts/ming-maps.mjs            # coastlines → art/maps.json (world-atlas + d3-geo)
python3 scripts/ming-textures.py      # parchment / night / grain textures (numpy, pillow)
python3 scripts/ming-music.py         # original synthesized score → public/ming/score.mp3 (numpy)
python3 scripts/ming-fonts.py <dir>   # subset Noto Serif SC, Ma Shan Zheng, JetBrains Mono (fonttools, brotli)
```

Re-run `ming-music.py` after changing `beats.json`, and `ming-fonts.py` after adding new
characters to any scene (source fonts are from Google Fonts, SIL OFL).

## Rendering

```bash
npx remotion render src/remotion/Root.tsx MingIndustrialParty out/ming-industrial-party.mp4 \
  --concurrency=4 --jpeg-quality=92 --crf=18
```

Add `--browser-executable=<path>` if Remotion cannot download its own headless Chrome.
