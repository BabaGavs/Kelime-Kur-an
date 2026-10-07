import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Verse, Word } from "../types/quran";
import { WordBadge } from "./WordBadge";
import { layoutUrl, pageImageUrl, type LayoutLine } from "../data/mushafImages";

interface MushafPageProps {
  pageNumber: number;
  /** Sayfadaki kelimeler (anlam çevirisi için); layout.loc ile eşleşir */
  verses: Verse[];
  alwaysShowMeaning: boolean;
  fontSizeMultiplier: number;
  fontClass: string;
}

/**
 * Sayfa görselindeki metin alanı oranları. Değerler render edilen Madani
 * görselinden ölçülmüştür: ilk satır üstte %12.6, son satır %88.0.
 * Şeffaf katman bu oranlarla hizalanır; iki katman aynı kutuya yerleştiği
 * için oran görsele görelidir.
 */
const FIRST_LINE_TOP = 12.6;
const LAST_LINE_TOP = 88.0;

function lineTop(index: number, total: number): number {
  if (total <= 1) return FIRST_LINE_TOP;
  return (
    FIRST_LINE_TOP + (index * (LAST_LINE_TOP - FIRST_LINE_TOP)) / (total - 1)
  );
}

/** layout.json (sayfa bazlı) yükleme; hata durumunda null. */
async function loadPage(page: number): Promise<LayoutLine[] | null> {
  try {
    const res = await fetch(`${layoutUrl()}/${page}.json`);
    if (!res.ok) return null;
    return (await res.json()) as LayoutLine[];
  } catch {
    return null;
  }
}

/**
 * Madani Mushaf sayfası.
 *
 * Arka planda gerçek Madani render'ı (kashida ve süslemeler dahil), üstünde
 * tamamen şeffaf ama tıklanabilir metin katmanı. Katmanın satır kırılmaları
 * `layout/{page}.json`'dan gelir (gerçek Madani kırılmaları), kelimeleri ise
 * `layout.loc` (sûre:âyet:kelime) ile `verses` içindeki gerçek kelimeye
 * bağlanır — böylece tıklama daima doğru manayı açar.
 *
 * Görsel sabit ölçeklidir: sayfa 1 ile sayfa 600'de puntola aynıdır.
 */
export const MushafPage: React.FC<MushafPageProps> = ({
  pageNumber,
  verses,
  alwaysShowMeaning,
  fontSizeMultiplier,
  fontClass,
}) => {
  const [lines, setLines] = useState<LayoutLine[] | null>(null);

  useEffect(() => {
    let alive = true;
    setLines(null);
    loadPage(pageNumber).then((d) => {
      if (alive) setLines(d);
    });
    // Komşuları ısıt: hızlı sayfa çevirmede boşluk oluşmasın
    for (const n of [pageNumber + 1, pageNumber - 1]) {
      if (n >= 1 && n <= 604) loadPage(n);
    }
    return () => {
      alive = false;
    };
  }, [pageNumber]);

  // Sonraki sayfanın görselini önden indir (geçiş pürüzsüz olsun)
  useEffect(() => {
    if (pageNumber < 604) new Image().src = pageImageUrl(pageNumber + 1);
  }, [pageNumber]);

  // layout.loc -> gerçek kelime + âyet.
  //
  // loc içindeki sura:ayet:kelime üçlüsü doğrudan kullanılmıyor; offline
  // veride verse_key kaymalı (Fâtiha'da besmele ayet sayılmadığı için
  // "1:1" kayıp) ve bazı sayfalarda sıra farkı var. Bu yüzden eşleşme
  // metin üzerinden, ileri kayarak yapılır: layout kelimeleri sırayla
  // gömülü kelimeler havuzunda aranır. Besmele ve âyet sonu rakamları
  // (görselde basılı ama tıklanabilir metinde olmayan) havuzda
  // bulunmadığı için doğal olarak atlanır.
  const lookup = useMemo(() => {
    const pool: { word: Word; verse: Verse }[] = [];
    for (const v of verses) {
      for (const w of v.words) pool.push({ word: w, verse: v });
    }

    const map = new Map<string, { word: Word; verse: Verse }>();
    const laidOut = (lines ?? [])
      .filter((l) => l.t === "text")
      .flatMap((l) => (l as { w: { loc: string; w: string }[] }).w);

    let cursor = 0;
    for (const lw of laidOut) {
      const text = lw.w;
      let found = -1;
      // Önce ileri kayarak ara (normal durumda bu yeter)
      for (let i = cursor; i < pool.length; i++) {
        if (pool[i].word.text_uthmani === text) {
          found = i;
          break;
        }
      }
      // Havuzda yoksa baştan ara: besmele gibi araya karışmış kelimeler
      // imleci sonuna kaçırmasın.
      if (found < 0) {
        for (let i = 0; i < cursor; i++) {
          if (pool[i].word.text_uthmani === text) {
            found = i;
            break;
          }
        }
      }
      if (found < 0) continue;
      map.set(lw.loc, pool[found]);
      cursor = found + 1;
    }
    return map;
  }, [verses, lines]);

  const textLines = useMemo(
    () => (lines ?? []).filter((l) => l.t === "text"),
    [lines],
  );

  // Şeffaf katmanın puntolası, görselin render edilen genişliğine göre
  // ölçeklenir (görselde metin yüksekliği ≈ genişliğin %1.8'i).
  // Görsel max-width/height ile ölçeklendiği için sabit bir CSS birimi
  // yeterli olmaz; gerçek genişlik ölçülür.
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderedWidth, setRenderedWidth] = useState(0);

  const measure = useCallback(() => {
    const w = imgRef.current?.clientWidth ?? 0;
    if (w > 0) setRenderedWidth(w);
  }, []);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    if (imgRef.current) ro.observe(imgRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const hitFontSize = renderedWidth > 0 ? renderedWidth * 0.018 : undefined;

  const image = (
    <img
      ref={imgRef}
      src={pageImageUrl(pageNumber)}
      alt={`Kur'an-ı Kerim, ${pageNumber}. sayfa`}
      className="mushaf-image-img"
      decoding="async"
      onLoad={measure}
    />
  );

  // Görsel hazır değilse sadece görsel gösterilir
  if (!lines) {
    return (
      <div className="mushaf-image-page">
        <div className="mushaf-image-holder">{image}</div>
      </div>
    );
  }

  if (!lines) {
    // Görsel hemen görünür; tıklama katmanı veri gelince bindirilir
    return (
      <div className="mushaf-image-page">
        <div className="mushaf-image-holder">{image}</div>
      </div>
    );
  }

  return (
    <div className="mushaf-image-page">
      <div className="mushaf-image-holder">
        {image}
        <div className="mushaf-hit-layer" dir="rtl">
          {textLines.map((line, i) => (
            <div
              key={i}
              className="mushaf-hit-line"
              style={{
                top: `${lineTop(i, textLines.length)}%`,
                fontSize: hitFontSize,
              }}
            >
              {line.w.map((w) => {
                const hit = lookup.get(w.loc);
                if (!hit) return null;
                return (
                  <WordBadge
                    key={w.loc}
                    word={hit.word}
                    verse={hit.verse}
                    chapterName={undefined}
                    alwaysShowMeaning={alwaysShowMeaning}
                    fontClass={fontClass}
                    fontSizeMultiplier={fontSizeMultiplier}
                    flow="inline-block"
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
