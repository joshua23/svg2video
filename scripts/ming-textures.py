"""Generates the background textures for the "Ming" video.

public/ming/paper.jpg  aged parchment with mottling and vignette (1920x1080)
public/ming/night.jpg  deep night with a soft central glow (1920x1080)
public/ming/grain.png  tileable film grain (256x256, alpha)

Usage: python3 scripts/ming-textures.py   (needs numpy + pillow)
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

W, H = 1920, 1080
out = Path(__file__).resolve().parent.parent / "public/ming"
out.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(1368)


def smooth_noise(scale, blur):
    small = rng.random((H // scale + 2, W // scale + 2))
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    img = img.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(img).astype(np.float32) / 255
    return (a - a.min()) / (a.max() - a.min() + 1e-6)


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)

# Parchment.
base = np.array([231, 220, 195], np.float32)
deep = np.array([176, 152, 112], np.float32)
mottle = 0.55 * smooth_noise(160, 60) + 0.3 * smooth_noise(60, 24) + 0.15 * smooth_noise(18, 6)
fibre = smooth_noise(3, 0.8)
vignette = np.clip((r - 0.45) / 0.95, 0, 1) ** 1.6
k = np.clip(0.22 * mottle + 0.62 * vignette + 0.05 * fibre, 0, 1)[..., None]
paper = base * (1 - k) + deep * k
paper += (rng.random((H, W, 1)) - 0.5) * 10
Image.fromarray(np.clip(paper, 0, 255).astype(np.uint8)).save(out / "paper.jpg", quality=90)

# Night.
night = np.array([7, 9, 13], np.float32)
glow = np.array([24, 30, 44], np.float32)
g = np.clip(1 - r / 1.1, 0, 1) ** 1.8
g = g * (0.8 + 0.2 * smooth_noise(120, 50))
img = night * (1 - g[..., None]) + glow * g[..., None]
stars = rng.random((H, W)) > 0.9993
img[stars] = np.array([150, 140, 120]) * rng.random((stars.sum(), 1)) + 40
img += (rng.random((H, W, 1)) - 0.5) * 5
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out / "night.jpg", quality=92)

# Grain tile (grey noise in alpha).
n = rng.random((256, 256))
alpha = (np.abs(n - 0.5) * 2) ** 2 * 255
tile = np.zeros((256, 256, 4), np.uint8)
tile[..., :3] = np.where(n[..., None] > 0.5, 255, 0)
tile[..., 3] = alpha.astype(np.uint8)
Image.fromarray(tile, "RGBA").save(out / "grain.png", optimize=True)
print("textures written to", out)
