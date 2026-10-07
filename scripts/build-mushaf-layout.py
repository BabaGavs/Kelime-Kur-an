#!/usr/bin/env python3
"""
Madani Mushaf gercek satir kirilmalarini indirir.

Kaynak: github.com/zonetecde/mushaf-layout (604 sayfa JSON).
Her dosya `lines[]` icerir: sure basligi, besmele ve 15 metin satiri;
her satirda `words[]` -> location (surah:ayet:kelime), metin ve glyph kodlari.

Bu kirilmalar PDF goruntusunun uzerine yerlestirilecek seffaf metin
katmanini kurar; boylece tiklama her zaman dogru kelimeye duser.

Cikti: public/mushaf/layout.json  (sayfa -> satirlar)
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

RAW = (
    "https://raw.githubusercontent.com/zonetecde/mushaf-layout"
    "/refs/heads/main/mushaf/page-{:03d}.json"
)


def fetch(page: int, retries: int = 3) -> dict | None:
    """Sayfa JSON'unu curl ile indirir (urllib bu host'ta baglanti kuramiyor)."""
    url = RAW.format(page)
    for attempt in range(retries):
        proc = subprocess.run(
            [
                "curl", "-sS", "--fail", "--max-time", "45",
                "-A", "Mozilla/5.0 (KelimeKur-an layout builder)",
                url,
            ],
            capture_output=True,
        )
        if proc.returncode == 0 and proc.stdout:
            try:
                return json.loads(proc.stdout.decode("utf-8"))
            except json.JSONDecodeError:
                pass
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("public/mushaf/layout"))
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=604)
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    written = 0
    missing: list[int] = []
    total_bytes = 0

    for page in range(args.start, args.end + 1):
        data = fetch(page)
        if data is None:
            missing.append(page)
            print(f"  !! sayfa {page} alinamadi")
            continue

        lines = []
        for line in data.get("lines", []):
            kind = line.get("type")
            if kind == "text":
                lines.append(
                    {
                        "t": kind,
                        "w": [
                            {"loc": w.get("location"), "w": w.get("word", "").strip()}
                            for w in line.get("words", [])
                        ],
                    }
                )
            elif kind == "surah-header":
                lines.append({"t": kind, "s": line.get("surah")})
            elif kind == "basmala":
                lines.append({"t": kind})

        target = args.out / f"{page}.json"
        target.write_text(json.dumps(lines, separators=(",", ":")), encoding="utf-8")
        total_bytes += target.stat().st_size
        written += 1
        if page % 50 == 0:
            print(f"  {page}/{args.end}")

    print(f"\n{written} sayfa, {total_bytes/1e6:.1f} MB, ort {total_bytes/max(1,written):.0f} B")
    if missing:
        print(f"Eksik sayfalar ({len(missing)}): {missing[:20]}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())