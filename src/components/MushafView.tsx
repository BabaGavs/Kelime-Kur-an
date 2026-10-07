import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { Verse, Chapter, AppSettings, Word } from "../types/quran";
import { WordBadge } from "./WordBadge";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Bookmark,
  Search,
  Grid2x2,
} from "lucide-react";
import { getVerseAudioUrl } from "../services/quranApi";
import { juzNameAr } from "../data/juzNames";

/** Madani Mushaf sayfalarının sabit satır sayısı */
const MUSHAF_LINES = 15;

// Latin rakamlarını Arap rakamlarına çevirir (Madani alt bar)
function toArabicDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

interface MushafViewProps {
  pageNumber: number;
  verses: Verse[];
  chapters: Chapter[];
  settings: AppSettings;
  onPageChange: (newPage: number) => void;
  /** Fihrist menüsünü aç */
  onOpenMenu?: () => void;
  /** Kelime Meali moduna geç */
  onSwitchToWordMode?: () => void;
  /** Arama panelini aç */
  onOpenSearch?: () => void;
  /** Bu sayfa yer imlerinde mi */
  isPageBookmarked?: boolean;
  onTogglePageBookmark?: (page: number) => void;
}

export const MushafView: React.FC<MushafViewProps> = ({
  pageNumber,
  verses,
  chapters,
  settings,
  onPageChange,
  onOpenMenu,
  onSwitchToWordMode,
  onOpenSearch,
  isPageBookmarked = false,
  onTogglePageBookmark,
}) => {
  const [isPlayingPage, setIsPlayingPage] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  // ---- Dokunmatik ile sayfa değiştirme (sadece mobil) ----
  const surfaceRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const navTimer = useRef<number | null>(null);

  /** Butonları kısa süre gösterip gizler (geçiş animasyonu sırasında) */
  const flashNav = useCallback(() => {
    setShowNavButtons(true);
    if (navTimer.current) window.clearTimeout(navTimer.current);
    navTimer.current = window.setTimeout(() => setShowNavButtons(false), 900);
  }, []);

  useEffect(() => {
    return () => {
      if (navTimer.current) window.clearTimeout(navTimer.current);
    };
  }, []);

  // Masaüstünde butonlar zaten görünür; odaklanınca da görünür kalsın
  const keepNavVisible = useCallback(() => {
    if (!window.matchMedia("(max-width: 639px)").matches) {
      setShowNavButtons(true);
    }
  }, []);

  const handleSwipeStart = useCallback((e: React.PointerEvent) => {
    // Yalnızca tek parmakla ve fare dışı (dokunmatik) hareketler sayılır
    if (e.pointerType === "mouse") return;
    swipeStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, []);

  const handleSwipeEnd = useCallback(
    (e: React.PointerEvent) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start || e.pointerType === "mouse") return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const sure = Date.now() - start.t;

      // Yatay hareket belirgin olmalı; dikey kaydırma ve kısa dokunuş sayılmaz
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      if (sure > 800) return;

      // Arapça kitap yönü: sola sürükle -> sonraki sayfa, sağa -> önceki
      const target = dx < 0 ? pageNumber + 1 : pageNumber - 1;
      if (target < 1 || target > 604) return;
      flashNav();
      onPageChange(target);
    },
    [flashNav, onPageChange, pageNumber],
  );

  // ---- Bir ekrana sığdırma ----
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    const fit = () => {
      frame.style.setProperty("--fit", "1");
      // Stale layout'u engelle: --fit sıfırlandı, yerleşimi zorla yeniden hesapla
      void content.getBoundingClientRect();

      // Madani'de her sayfa sabit 15 satırlık bir ızgaradır ve satırlar
      // sayfayı tamamen doldurur. Satır yüksekliğini sabitleyip puntolayı
      // buna sığacak şekilde küçültüyoruz (taşma yoksa dokunmuyoruz).
      const line = content.clientHeight / MUSHAF_LINES;
      frame.style.setProperty("--line-h", `${line.toFixed(2)}px`);
      void content.getBoundingClientRect();

      // Oransal küçültme: satır yüksekliği sabit, yalnızca puntola ölçeklenir
      let scale = 1;
      for (let i = 0; i < 18; i++) {
        const over = content.scrollHeight - content.clientHeight;
        if (over <= 1) break;
        const ratio = content.clientHeight / content.scrollHeight;
        scale = Math.max(0.28, scale * ratio * 0.97);
        frame.style.setProperty("--fit", scale.toFixed(3));
        // Yeni --fit uygulandı, yerleşimi tazele
        void content.getBoundingClientRect();
      }
      frame.style.setProperty("--fit", scale.toFixed(3));
    };

    fit();

    // Yazı tipleri geç yüklenince satırlar kayar ve içerik taşabilir;
    // bu yüzden yerleşim oturana kadar birkaç kez yeniden ölçüyoruz.
    let cancelled = false;
    const verify = (tries: number) => {
      if (cancelled) return;
      fit();
      // İçerik, ölçümden sonra da büyüyebiliyor (font yerleşimi,
      // geç gelen kelimeler). Bu yüzden koşulsuz birkaç kare tekrar ölçüyoruz.
      if (tries > 0) requestAnimationFrame(() => verify(tries - 1));
    };
    const refit = () => verify(4);
    const timers = [
      setTimeout(refit, 60),
      setTimeout(refit, 200),
      setTimeout(refit, 500),
      setTimeout(refit, 1000),
      setTimeout(refit, 1800),
    ];
    if (document.fonts?.ready) document.fonts.ready.then(refit);

    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", refit);
      window.removeEventListener("orientationchange", refit);
    };
  }, [pageNumber, verses, settings.fontSizeMultiplier]);

  // ---- Sayfa dinleme ----
  const stopPageAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlayingPage(false);
  }, []);

  useEffect(() => {
    stopPageAudio();
  }, [pageNumber, stopPageAudio]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playVerseAtIndex = useCallback(
    (index: number) => {
      if (index >= verses.length) {
        stopPageAudio();
        return;
      }

      const verse = verses[index];
      const parts = verse.verse_key.split(":");
      const ch = parseInt(parts[0], 10);
      const v = parseInt(parts[1], 10);

      if (audioRef.current) audioRef.current.pause();

      const audio = new Audio(getVerseAudioUrl(ch, v));
      audioRef.current = audio;

      const next = () => {
        if (isPlayingRef.current) playVerseAtIndex(index + 1);
      };
      audio.onended = next;
      audio.onerror = next;

      audio.play().catch((e) => console.warn("Sayfa dinleme hatası", e));
    },
    [verses, stopPageAudio],
  );

  const handlePlayPage = useCallback(() => {
    if (isPlayingRef.current) {
      stopPageAudio();
    } else {
      isPlayingRef.current = true;
      setIsPlayingPage(true);
      playVerseAtIndex(0);
    }
  }, [playVerseAtIndex, stopPageAudio]);

  const fontClass =
    settings.arabicFont === "scheherazade"
      ? "font-scheherazade"
      : settings.arabicFont === "amiri"
        ? "font-arabic"
        : "font-serif";

  // Sayfadaki sûreleri grupla
  const versesByChapter: { [chapterId: number]: Verse[] } = {};
  verses.forEach((v) => {
    const chId = parseInt(v.verse_key.split(":")[0], 10);
    if (!versesByChapter[chId]) versesByChapter[chId] = [];
    versesByChapter[chId].push(v);
  });

  // Konum bilgisi: cüz ve o an okunan sûre (Madani üst barı)
  const currentJuz = verses.length > 0 ? verses[0].juz_number : 1;
  const chapterList = Object.keys(versesByChapter).map(Number);
  const primaryChapter = chapters.find((c) => c.id === chapterList[0]);
  // Rozet metni: Türkçe sûre adı (Bakara, Âl-i İmrân ...)
  const surahLabel =
    chapterList.length === 0
      ? ""
      : chapterList
          .map((id) => chapters.find((c) => c.id === id)?.translated_name.name)
          .filter(Boolean)
          .join(", ");

  const hasPrev = pageNumber > 1;
  const hasNext = pageNumber < 604;

  return (
    <div className="h-full w-full flex flex-col mushaf-page-surface">
      {/* ---------- ÜST BAR (Madani) ---------- */}
      <div className="mushaf-topbar">
        {/* Sol: yer imi + cüz rozeti */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onTogglePageBookmark?.(pageNumber)}
            aria-label={
              isPageBookmarked
                ? `${pageNumber}. sayfayı yer imlerinden çıkar`
                : `${pageNumber}. sayfayı yer imlerine ekle`
            }
            aria-pressed={!!isPageBookmarked}
            className={`shrink-0 transition-colors ${
              isPageBookmarked
                ? "text-[var(--mushaf-accent)]"
                : "text-[var(--mushaf-accent)]/50 hover:text-[var(--mushaf-accent)]"
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${isPageBookmarked ? "fill-current" : ""}`}
            />
          </button>
          <span className="mushaf-badge mushaf-badge--juz">
            {juzNameAr(currentJuz)}
          </span>
        </div>

        {/* Sağ: sûre rozeti, fihrist, arama, geri */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="mushaf-badge mushaf-badge--surah truncate">
            {surahLabel}
          </span>

          {onOpenMenu && (
            <button
              onClick={() => {
                setShowNavButtons(true);
                onOpenMenu();
              }}
              aria-label="Fihristi aç"
              title="Fihrist"
              className="shrink-0 text-[var(--mushaf-accent)] hover:opacity-70 transition-opacity"
            >
              <Grid2x2 className="w-[18px] h-[18px]" />
            </button>
          )}

          {onOpenSearch && (
            <button
              onClick={() => {
                setShowNavButtons(true);
                onOpenSearch();
              }}
              aria-label="Ara"
              title="Ara"
              className="shrink-0 text-[var(--mushaf-accent)] hover:opacity-70 transition-opacity"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </div>

      {/* ---------- SAYFA ---------- */}
      <div
        ref={surfaceRef}
        className="flex-1 min-h-0 relative flex flex-col"
        style={{ touchAction: "pan-y" }}
        onPointerDown={handleSwipeStart}
        onPointerUp={handleSwipeEnd}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
        onMouseEnter={keepNavVisible}
      >
        <div
          key={pageNumber}
          ref={frameRef}
          className="mushaf-fit-frame mushaf-page-enter"
          style={{
            // Tam ekran sayfa: üst/alt neredeyse sıfır, yanlarda okuma payı
            paddingTop: "calc(0.15rem * var(--fit, 1))",
            paddingBottom: "calc(0.15rem * var(--fit, 1))",
            paddingInline: "calc(0.5rem * var(--fit, 1))",
          }}
        >
          {/* Kur'an metni - dikeyde ortalanmış */}
          <div
            ref={contentRef}
            className="mushaf-fit-content flex flex-col"
            style={{ gap: "calc(0.45rem * var(--fit, 1))" }}
          >
            {Object.entries(versesByChapter).map(([chIdStr, chVerses]) => {
              const chObj = chapters.find(
                (c) => c.id === parseInt(chIdStr, 10),
              );
              const startsSurah = chVerses.some((v) => v.verse_number === 1);

              return (
                <div
                  key={chIdStr}
                  className="flex flex-col"
                  style={{ gap: "calc(0.3rem * var(--fit, 1))" }}
                >
                  {/* Sûre başlığı - yalnızca metin */}
                  {startsSurah && chObj && (
                    <div className="text-center">
                      <div
                        dir="rtl"
                        className="mushaf-surah-title font-arabic font-bold"
                        style={{ fontSize: "calc(1.5rem * var(--fit, 1))" }}
                      >
                        سُورَةُ {chObj.name_arabic}
                      </div>
                      {chObj.bismillah_pre && (
                        <div
                          dir="rtl"
                          className="mushaf-bismillah font-arabic"
                          style={{
                            fontSize: "calc(1.1rem * var(--fit, 1))",
                            marginTop: "calc(0.22rem * var(--fit, 1))",
                          }}
                        >
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </div>
                      )}
                      <div
                        className="mx-auto w-16 h-px"
                        style={{
                          background: "var(--border-color)",
                          marginTop: "calc(0.28rem * var(--fit, 1))",
                          marginBottom: "calc(0.18rem * var(--fit, 1))",
                        }}
                      />
                    </div>
                  )}

                  {/* Kelimeler: Mushaf hattı gibi satırlar iki yana yaslanır */}
                  <div
                    dir="rtl"
                    className="mushaf-verse-text mushaf-ink"
                    style={{
                      fontSize: `calc(1.75rem * var(--fit, 1))`,
                      marginBlock: "calc(0.3rem * var(--fit, 1))",
                    }}
                  >
                    {chVerses.map((v) => (
                      <React.Fragment key={v.id}>
                        {v.words.map((w) => (
                          <WordBadge
                            key={`${v.id}-${w.id}`}
                            word={w}
                            verse={v}
                            chapterName={chObj?.translated_name.name}
                            alwaysShowMeaning={settings.alwaysShowWordMeaning}
                            fontClass={fontClass}
                            fontSizeMultiplier={settings.fontSizeMultiplier}
                            flow="inline-block"
                          />
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sayfa sonu */}
        </div>
      </div>

      {/* ---------- ALT BAR (Madani) ---------- */}
      <div className="mushaf-bottombar">
        {/* Sol: önceki ok ve Arap rakamı sayfa numarası */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              flashNav();
              if (hasPrev) onPageChange(pageNumber - 1);
            }}
            disabled={!hasPrev}
            aria-label="Önceki sayfa"
            className={`shrink-0 grid place-items-center w-5 h-5 rounded-md bg-[var(--mushaf-accent)] text-[#fff4cb] disabled:opacity-35 disabled:pointer-events-none transition-opacity ${
              showNavButtons ? "opacity-100" : "opacity-40"
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="mushaf-page-num">{toArabicDigits(pageNumber)}</span>
        </div>

        {/* Sağ: sonraki ok, mod anahtarı ve dinleme (kenardan içeride) */}
        <div className="flex items-center gap-3 mr-6 sm:mr-12">
          <button
            onClick={(e) => {
              e.stopPropagation();
              flashNav();
              if (hasNext) onPageChange(pageNumber + 1);
            }}
            disabled={!hasNext}
            aria-label="Sonraki sayfa"
            className={`shrink-0 grid place-items-center w-5 h-5 rounded-md bg-[var(--mushaf-accent)] text-[#fff4cb] disabled:opacity-35 disabled:pointer-events-none transition-opacity ${
              showNavButtons ? "opacity-100" : "opacity-40"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {onSwitchToWordMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwitchToWordMode();
              }}
              className="shrink-0 px-2.5 py-1 rounded-lg border border-[var(--mushaf-accent)]/45 text-[10px] sm:text-[11px] font-medium text-[var(--mushaf-accent)]/80 hover:bg-[var(--mushaf-accent)]/10 transition-colors"
            >
              Kelime Meali
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPage();
            }}
            disabled={verses.length === 0}
            aria-label={
              isPlayingPage ? "Sayfa dinlemeyi durdur" : "Sayfayı dinle"
            }
            title={isPlayingPage ? "Durdur" : "Sayfayı dinle"}
            className={`shrink-0 flex items-center gap-1 text-[11px] font-medium transition-colors disabled:opacity-30 ${
              isPlayingPage
                ? "text-[var(--mushaf-accent)]"
                : "text-[var(--mushaf-accent)]/60 hover:text-[var(--mushaf-accent)]"
            }`}
          >
            {isPlayingPage ? (
              <Square className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span className="hidden sm:inline">
              {isPlayingPage ? "Durduruluyor…" : "Sayfayı Dinle"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
