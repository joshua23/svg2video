"""Subsets the fonts used by the "Ming" video to the characters it renders.

Scans src/videos/ming for every character, then writes WOFF2 subsets to
public/ming/fonts/. Source fonts (all SIL OFL, from Google Fonts):
  NotoSerifSC-400.ttf, NotoSerifSC-700.ttf, NotoSerifSC-900.ttf,
  MaShanZheng.ttf, JetBrainsMono.ttf

Usage: python3 scripts/ming-fonts.py <dir-with-source-fonts>   (needs fonttools + brotli)
"""

import sys
from pathlib import Path

from fontTools import subset

root = Path(__file__).resolve().parent.parent
src_dir = Path(sys.argv[1])
out_dir = root / "public/ming/fonts"
out_dir.mkdir(parents=True, exist_ok=True)

chars = set(chr(c) for c in range(0x20, 0x7F))
chars |= set("，。、；：？！“”‘’《》（）—…·→≈％")
for path in (root / "src/videos/ming").rglob("*"):
    if path.suffix in {".tsx", ".ts", ".json"} and path.name != "maps.json":
        chars |= set(path.read_text(encoding="utf-8"))
chars = {c for c in chars if c.isprintable()}
text = "".join(sorted(chars))

jobs = [
    ("NotoSerifSC-400.ttf", "serif-400.woff2", text),
    ("NotoSerifSC-700.ttf", "serif-700.woff2", text),
    ("NotoSerifSC-900.ttf", "serif-900.woff2", text),
    ("MaShanZheng.ttf", "brush.woff2", text),
    ("JetBrainsMono.ttf", "mono.woff2", text),
]
for src, dst, t in jobs:
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    font = subset.load_font(str(src_dir / src), options)
    sub = subset.Subsetter(options)
    sub.populate(text=t)
    sub.subset(font)
    subset.save_font(font, str(out_dir / dst), options)
    print(f"{dst}: {(out_dir / dst).stat().st_size / 1024:.0f} KB")
print(f"{len(chars)} characters")
