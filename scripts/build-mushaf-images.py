#!/usr/bin/env python3
"""
Mushaf sayfalarini cercevesiz WebP'ye cevirir.

Cerceve, sure adi, cuz basligi ve sayfa numarasi kirpilir -> sadece ayet
metni kalir. Cerceve PDF'te vektor cizgidir; `get_drawings()` ile en ic
dikdortgen bulunur, metin alani onun icidir.

Renk korunur: kirmizi tajweed isaretleri (Allah, idgam/ikhfa) gecerli
oldugu icin gri tonlamaya cevrilmez.

Cikti: public/mushaf/{page}.webp  (~93 KB/sayfa). Tum sayfalar ayni orana
esitlenir, boylece sayfa cevirildiginde yazi olcegi degismez.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import pymupdf
from PIL import Image

# Cerceve icindeki metin alani (pt). Ana PDF'te tum sayfalarda birebir ayni.
TEXT_BOX = pymupdf.Rect(79.0, 63.8, 460.6, 714.7)

# Standart sayfa orani (w/h). Tum cikti gorselleri buna esitlenir.
PAGE_RATIO = TEXT_BOX.width / TEXT_BOX.height

# Ana PDF sayfa rengi. Kenar dolgusu bu renge yapilir; gorsel ile dolgu
# arasinda iz kalmaz.
CREAM = (255, 248, 219)

# Fetih sayfasi ozel: cercevesi gorsel (vektor degil) oldugu icin
# get_drawings() onu bulamaz. Krem metin kutusunun ic kenarlari elle
# olculdu; ustteki cerceve 262.5 pt'de bitiyor (0.5 pay birakildi).
CLIP_OVERRIDES = {
    1: pymupdf.Rect(230.0, 263.0, 405.0, 514.0),
}

# PDF sayfa indeksi = Mushaf sayfa numarasi (index 0 kapak).
PAGE_OFFSET = 0

# Cercevenin kendisini kirpmak icin iceriye dogru pay (negatif = iceri al).
# Pozitif pay cerceveyi kirpma alaninin icinde birakirdi.
PAD = -1.6


# --- yardimcilar ---------------------------------------------------------


def have_cwebp() -> bool:
    try:
        subprocess.run(["cwebp", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


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


def render(page: pymupdf.Page, scale: float, clip=None) -> Image.Image:
    """Sayfayi RGB PIL goruntusune cevirir."""
    pix = page.get_pixmap(
        matrix=pymupdf.Matrix(scale, scale), clip=clip, colorspace=pymupdf.csRGB
    )
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def normalize(im: Image.Image) -> Image.Image:
    """Beyaz -> krem cevirir ve kenar dolgusuyla standart orana esitler.

    Iki duzeltme birden:

    - **Renk.** Fetih'in kutusu PDF'te beyaz; diger 603 sayfa krem.
      Esitlenmezse Fetih krem sayfada beyaz bir leke gibi duruyor.
    - **Oran.** Esitlenmezse sayfa cevirildiginde yazi bir kare buyuyup
      bir kare kuculuyor. Krem dolgu orani esitler ve gozle gorunmez.
    """
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            if r > 232 and g > 228 and b > 205:
                px[x, y] = CREAM

    w, h = im.size
    if abs(w / h - PAGE_RATIO) < 0.005:
        return im

    # Genis olan boyuta krem dolgu ekle. Sikistirma yapma: kenar kirpilir.
    if w / h > PAGE_RATIO:
        tw, th = w, round(w / PAGE_RATIO)
    else:
        tw, th = round(h * PAGE_RATIO), h
    canvas = Image.new("RGB", (tw, th), CREAM)
    canvas.paste(im, ((tw - w) // 2, (th - h) // 2))
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
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
    manifest: dict[str, dict[str, int]] = {}
    try:
        for page_no in range(args.start, args.end + 1):
            index = page_no + PAGE_OFFSET
            if index >= doc.page_count:
                print(f"  !! sayfa {page_no} PDF icinde yok, atlandi")
                continue

            page = doc[index]
            frame = CLIP_OVERRIDES.get(page_no) or (
                inner_frame(page) + (-PAD, -PAD, PAD, PAD)
            )
            im = normalize(render(page, args.scale, clip=frame))
            im.save(tmp_png)

            target = out_dir / f"{page_no}.webp"
            subprocess.run(
                ["cwebp", "-quiet", "-q", str(args.quality), "-m", "6",
                 str(tmp_png), "-o", str(target)],
                check=True,
            )
            manifest[str(page_no)] = {
                "w": im.width,
                "h": im.height,
                "bytes": target.stat().st_size,
            }
            if page_no % 50 == 0 or page_no in CLIP_OVERRIDES:
                print(f"  {page_no}/{args.end}  ({target.stat().st_size//1024} KB)")
    finally:
        doc.close()

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
