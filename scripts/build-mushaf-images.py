#!/usr/bin/env python3
"""
Madani Mushaf (Hafs) sayfalarini cercevesiz WebP'ye cevirir.

Kaynak: kullanici tarafindan saglanan PDF (605 sayfa; index 1..604 = Mushaf
1..604, index 0 kapak).

Iki sey oluyor:
1. Cerceve, sure adi ve sayfa numarasi kirpilir -> sadece ayet metni kalir.
   Cerceve PDF'te vektor cizgidir; `get_drawings()` ile en ic cerceve
   bulunur, metin alanı onun icidir.
2. Renk korunur: kirmizi tajweed isaretleri (Allah, idgam/ikhfa) gecerli
   oldugu icin gri tonlamaya cevrilmez.

Cikti: public/mushaf/{page}.webp  (yaklasik 92 KB/sayfa)
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import pymupdf
from PIL import Image

# Cerceve icindeki metin alani (pt). Tum sayfalarda birebir ayni.
TEXT_BOX = pymupdf.Rect(79.0, 63.8, 460.6, 714.7)

# Fetih/ilk sayfa ozel: cercevesi gorsel (vektor degil) oldugu icin
# get_drawings() onu bulamaz. Krem metin kutusu elle olculdu.
CLIP_OVERRIDES = {
    1: pymupdf.Rect(230.0, 262.0, 405.0, 514.0),
}

# PDF sayfa indeksi = Mushaf sayfa numarasi (index 0 kapak).
PAGE_OFFSET = 0

# Cercevenin kendisini kirpmak icin iceriye dogru pay (negatif = iceri al).
# Pozitif pay cerceveyi kirpma alaninin icinde birakirdi.
PAD = -1.6


def inner_frame(page: pymupdf.Page) -> pymupdf.Rect:
    """Sayfadaki en ic cercevenin dikdortgenini dondurur."""
    best = None
    for drawing in page.get_drawings():
        r = drawing["rect"]
        if r.width > page.rect.width * 0.5 and r.height > page.rect.height * 0.5:
            area = r.width * r.height
            if best is None or area < best[0]:
                best = (area, r)
    return best[1] if best else page.rect


def have_cwebp() -> bool:
    try:
        subprocess.run(["cwebp", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def recolor_white_to_cream(path: Path) -> None:
    """Beyaz zeminli sayfaları uygulamanın krem zeminine çevirir.

    Fetih sayfasının kutusu PDF'te beyaz; diğer 603 sayfa krem. Iki zemin
    yan yana gelince Fetih beyaz bir leke gibi duruyor.
    """
    im = Image.open(path).convert("RGB")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            if r > 232 and g > 228 and b > 205:
                px[x, y] = (255, 244, 203)
    im.save(path)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, default=Path("public/mushaf"))
    ap.add_argument("--scale", type=float, default=1.6)
    ap.add_argument("--quality", type=int, default=84)
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=604)
    args = ap.parse_args()

    if not args.pdf.exists():
        print(f"PDF bulunamadi: {args.pdf}", file=sys.stderr)
        return 1
    if not have_cwebp():
        print("cwebp kurulu degil (brew install webp)", file=sys.stderr)
        return 1

    out_dir = args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_png = out_dir / ".tmp.png"

    doc = pymupdf.open(args.pdf)
    manifest = {}
    for page_no in range(args.start, args.end + 1):
        index = page_no + PAGE_OFFSET
        if index >= doc.page_count:
            print(f"  !! sayfa {page_no} PDF icinde yok, atlandi")
            continue

        page = doc[index]
        # Cerceveyi kirp; 2 pt pay ile kenardaki harfleri koru
        frame = CLIP_OVERRIDES.get(page_no) or (
            inner_frame(page) + (-PAD, -PAD, PAD, PAD)
        )
        pix = page.get_pixmap(
            matrix=pymupdf.Matrix(args.scale, args.scale),
            clip=frame,
            colorspace=pymupdf.csRGB,
        )
        pix.save(tmp_png)
        # Fetih sayfasi beyaz zeminli; krem ile eslestir
        if page_no in CLIP_OVERRIDES:
            recolor_white_to_cream(tmp_png)

        target = out_dir / f"{page_no}.webp"
        subprocess.run(
            ["cwebp", "-quiet", "-q", str(args.quality), "-m", "6",
             str(tmp_png), "-o", str(target)],
            check=True,
        )
        manifest[str(page_no)] = {
            "w": pix.width,
            "h": pix.height,
            "bytes": target.stat().st_size,
        }
        if page_no % 50 == 0:
            print(f"  {page_no}/{args.end}  ({target.stat().st_size//1024} KB)")

    tmp_png.unlink(missing_ok=True)
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, separators=(",", ":")), encoding="utf-8"
    )

    total = sum(v["bytes"] for v in manifest.values())
    print(
        f"\n{len(manifest)} sayfa, toplam {total/1e6:.1f} MB, "
        f"ort {total/len(manifest)/1024:.0f} KB"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())