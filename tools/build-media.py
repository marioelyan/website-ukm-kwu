#!/usr/bin/env python3
"""
Regenerate every optimized image variant from the master sources.

Run this whenever you replace a source photo:

    python3 tools/build-media.py

Masters (the only files you need to edit):
    assets/img/hero/hero-original.jpg   -> responsive hero variants + og-image
    assets/img/logo-ukm.png              -> favicons
    assets/img/about-bootcamp.jpg        -> WebP variants
    assets/img/galeri-*.jpg              -> WebP variants

Everything else in assets/img/ is generated and should not be hand-edited.
"""
import base64
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
HERO = os.path.join(IMG, "hero")

# The hero is a full-bleed background dimmed by a dark gradient overlay, so
# fine detail is largely masked. Quality can sit lower than for a content photo.
HERO_WIDTHS = [640, 960, 1280, 1440, 1920]
HERO_WEBP_Q = 70
HERO_JPEG_Q = 70


def kb(path):
    return os.path.getsize(path) / 1024


def save_png8(img, path, size=None, background=None):
    """Quantize to an 8-bit palette — flat logo art shrinks dramatically."""
    if size:
        img = img.resize((size, size), Image.LANCZOS)
    img = img.convert("RGBA")
    if background:
        base = Image.new("RGBA", img.size, background)
        base.alpha_composite(img)
        img = base.convert("RGB")
    q = img.convert("RGB").quantize(colors=128, method=Image.MEDIANCUT)
    q.save(path, "PNG", optimize=True)
    return path


def build_hero():
    src_path = os.path.join(HERO, "hero-original.jpg")
    if not os.path.exists(src_path):
        print(f"  ! master not found: {src_path}")
        return

    src = Image.open(src_path).convert("RGB")
    ratio = src.height / src.width
    print(f"\n=== hero ({src.width}x{src.height}) ===")

    for w in HERO_WIDTHS:
        h = round(w * ratio)
        im = src if src.width == w else src.resize((w, h), Image.LANCZOS)
        wp = os.path.join(HERO, f"hero-{w}.webp")
        jp = os.path.join(HERO, f"hero-{w}.jpg")
        im.save(wp, "WEBP", quality=HERO_WEBP_Q, method=6)
        im.save(jp, "JPEG", quality=HERO_JPEG_Q, optimize=True, progressive=True)
        print(f"  hero-{w:<5} {w}x{h:<5} webp {kb(wp):6.1f} KB   jpeg {kb(jp):6.1f} KB")

    # LQIP: a 20x20 blur inlined into the CSS as the hero placeholder
    from PIL import ImageFilter

    lq = src.resize((20, 20), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.4))
    lq_path = os.path.join(HERO, "lqip.jpg")
    lq.save(lq_path, "JPEG", quality=45, optimize=True)
    b64 = base64.b64encode(open(lq_path, "rb").read()).decode()

    css_path = os.path.join(ROOT, "css", "style.css")
    css = open(css_path, encoding="utf-8").read()
    new_css, n = re.subn(
        r'(background-image: url\("data:image/jpeg;base64,)[^"]+("\);)',
        lambda m: m.group(1) + b64 + m.group(2),
        css,
    )
    if n:
        open(css_path, "w", encoding="utf-8").write(new_css)
        print(f"  lqip      {len(b64)} bytes inlined into css/style.css")

    # OG image: the social-preview standard is 1200x630
    og = src.copy()
    target = 1200 / 630
    w, h = og.size
    if w / h > target:
        nw = round(h * target)
        og = og.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * target)
        og = og.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    og = og.resize((1200, 630), Image.LANCZOS)
    og_path = os.path.join(IMG, "og-image.jpg")
    og.save(og_path, "JPEG", quality=78, optimize=True, progressive=True)
    print(f"  og-image  1200x630      {kb(og_path):6.1f} KB")


def build_favicons():
    logo_path = os.path.join(IMG, "logo-ukm.png")
    if not os.path.exists(logo_path):
        return
    logo = Image.open(logo_path).convert("RGBA")
    print("\n=== favicons ===")
    for size, name, bg in [
        (64, "favicon.png", None),
        (180, "apple-touch-icon.png", (255, 255, 255, 255)),
        (512, "icon-512.png", None),
    ]:
        p = save_png8(logo, os.path.join(IMG, name), size, bg)
        print(f"  {name:<22} {size}x{size}  {kb(p):6.1f} KB")


def build_photos():
    photos = [
        ("about-bootcamp.jpg", [700, 1400]),
        ("galeri-bazar.jpg", [1200]),
        ("galeri-workshop.jpg", [1200]),
        ("galeri-bootcamp.jpg", [1200]),
        ("galeri-branding.jpg", [1200]),
    ]
    print("\n=== photos ===")
    for name, widths in photos:
        src_path = os.path.join(IMG, name)
        if not os.path.exists(src_path):
            continue
        src = Image.open(src_path).convert("RGB")
        ratio = src.height / src.width
        best = None
        for w in widths:
            h = round(w * ratio)
            im = src if src.width == w else src.resize((w, h), Image.LANCZOS)
            out = os.path.join(IMG, f"{os.path.splitext(name)[0]}-{w}.webp")
            im.save(out, "WEBP", quality=74, method=6)
            best = max(best or 0, kb(out))
        print(f"  {name:<24} {kb(src_path):6.1f} KB -> webp {best:6.1f} KB  (-{100 - best / kb(src_path) * 100:.0f}%)")


if __name__ == "__main__":
    os.makedirs(HERO, exist_ok=True)
    build_hero()
    build_favicons()
    build_photos()
    print("\ndone.")
