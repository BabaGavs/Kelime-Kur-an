#!/usr/bin/env python3
"""
Madani Mushaf (Hafs) sayfalarini WebP'ye cevirir.

Kaynak: archive.org "Quran Mushaf Almadinah Hafs - 604 Pages" (PDF, 624 sayfa).
Bu PDF sayfa basina 15 satirlik gercek Madani Mushaf sayfalari icerir; kashida
ve sure/ayet suslemeleri font icinde oldugu icin render ile birebir gelir.

Cikti: public/mushaf/{page}.webp  (cokrem zemin, cercevesiz - cerceve CSS ile)
       public/mushaf/manifest.json  (boyut bilgisi)

Cerceve PDF'ten kirpilir; zemin PDF beyazindan uygulama kremine (#FFF4CB),
murekkep #3F3520 olarak cevrilir. Boylece APK'da tek renkli veri tutulur.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

import pymupdf
from PIL import Image

# Uygulama paleti (src/index.css ile ayni)
CREAM = (255, 244, 203)
INK = (63, 53, 32)

# PDF sayfa -> Mushaf sayfa farki. Dogrulama: PDF index 300 = Mushaf 298
PAGE_OFFSET = 2


def have_cwebp() -> bool:
    try:
        subprocess.run(["cwebp", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def render_page(pdf_page, scale: float, quality: int, tmp: Path) -> Image.Image:
    """Sayfayi krem zemin + koyu mumruk olarak render eder.

    PDF beyaz zemin uzerinde siyah metin icerir. PIL paste() maskesinde
    255 = tam kaplar, 0 = hic kaplamaz; bu yuzden maske ters cevrilir
    (beyaz arkaplan -> kumrulu basilmaz, siyah metin -> basilir).
    """
    pix = pdf_page.get_pixmap(
        matrix=pymupdf.Matrix(scale, scale), colorspace=pymupdf.csGRAY
    )
    gray = Image.frombytes("L", (pix.width, pix.height), pix.samples)
    mask = gray.point(lambda v: 255 - v)  # 0 = kaplar (siyah metin)
    rgb = Image.new("RGB", gray.size, CREAM)
    rgb.paste(INK, (0, 0), mask)
    return rgb


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--out", type=Path, default=Path("public/mushaf"))
    ap.add_argument("--scale", type=float, default=1.4)
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
        pdf_index = page_no + PAGE_OFFSET
        if pdf_index >= doc.page_count:
            print(f"  !! sayfa {page_no} PDF icinde yok, atlandi")
            continue

        image = render_page(doc[pdf_index], args.scale, args.quality, tmp_png)
        image.save(tmp_png)
        target = out_dir / f"{page_no}.webp"
        subprocess.run(
            ["cwebp", "-quiet", "-q", str(args.quality), "-m", "6",
             str(tmp_png), "-o", str(target)],
            check=True,
        )
        manifest[str(page_no)] = {
            "w": image.width,
            "h": image.height,
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