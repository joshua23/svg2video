# 临高启明 · 全书导读

A 3 min 8 s Simplified Chinese companion to `MingIndustrialParty`, in the same style (Remotion
composition `LingaoQimingGuide`). It reuses the kit, theme, fonts and line art in `../ming`.

1. 序 — 202X 年 D 日的虫洞；五百多人穿越；片名
2. 卷一 启航 — 丰城轮与出发前的会议
3. 卷二 新世界 — 1628 年登陆临高、百仞滩首战、水泥 / 盐场 / 教育 / 电报、“澳洲人”与“澳宋”
4. 卷三 新社会 — 521 名元老与元老院、五年计划、甜港风云、秋赋
5. 卷四 新澳洲 — 统一海南、珠江口（大角沙角、虎门、澳门和约）
6. 卷五 进入 — 钢铁、江南、济州岛与登州、对马与马尼拉大帆船
7. 卷六 纷争 — 台湾海峡（澎湖、安平、厦门）、马尼拉
8. 卷七 大陆 — 拿下广州、治理广州
9. 卷八 深耕经营 — 暂停北上、南下与产业升级、渗透京师与天津卫（连载至 2026 年 9 月）
10. 外篇 成书 — 2006 年 SC 论坛的提问、2009 年吹牛者动笔、读者共创、2015 年灰机 wiki、
    2017/2022/2025 实体书、2019 年下架与重新上架、“工业党”与学术讨论、争议、篇幅
11. 终 — 十七年仍未完结；如果重来一次，中国能不能先走一步？

Sources: Chinese Wikipedia (临高启明), the Qidian chapter catalogue (latest chapter
“天津卫（二十一）”, 2026-09-20), Douban's series page for the printed volumes, and the
public per-volume chapter index. Volume summaries are derived from chapter titles, so
arcs are described at the level of places and themes rather than detailed outcomes.

```bash
python3 scripts/ming-music.py lingao     # score → public/lingao/score.mp3
node scripts/ming-maps.mjs               # adds the East Asia / Pearl River / Hainan town maps
python3 scripts/ming-fonts.py <font-dir> # font subset covers both videos
npx remotion render src/remotion/Root.tsx LingaoQimingGuide out/lingao.mp4 --crf=18
```
