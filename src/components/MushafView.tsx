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
  Menu,
} from "lucide-react";
import { getVerseAudioUrl } from "../services/quranApi";

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

      // Oransal küçültme: taşma oranına göre ölçekle
      let scale = 1;
      for (let i = 0; i < 16; i++) {
        const over = content.scrollHeight - content.clientHeight;
        if (over <= 1) break;
        const ratio = content.clientHeight / content.scrollHeight;
        scale = Math.max(0.28, scale * ratio * 0.95);
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

  // Konum bilgisi: cüz, sûre sayısı ve sûre adları
  const currentJuz = verses.length > 0 ? verses[0].juz_number : 1;
  const chapterList = Object.keys(versesByChapter).map(Number);
  const primaryChapter = chapters.find((c) => c.id === chapterList[0]);
  const surahNames =
    chapterList
      .map((id) => chapters.find((c) => c.id === id)?.translated_name.name)
      .filter(Boolean)
      .join(" · ") ||
    primaryChapter?.translated_name.name ||
    "";

  const hasPrev = pageNumber > 1;
  const hasNext = pageNumber < 604;

  return (
    // Madani sayfa kenar boşluğu: page_margin 6-11dp
    <div
      ref={surfaceRef}
      className="h-full flex flex-col relative mushaf-page-surface"
      style={{
        margin: "calc(0.45rem * var(--fit, 1))",
        padding: "calc(0.5rem * var(--fit, 1))",
        // Dokunmatik yatay sürükleme: tarayıcının kendi kaydırmasını engelle
        touchAction: "pan-y",
      }}
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
          // Üst/alt boşluk neredeyse sıfır: başlık ve gezinme kenara yaslanır
          paddingTop: "calc(0.15rem * var(--fit, 1))",
          paddingBottom: "calc(0.15rem * var(--fit, 1))",
        }}
      >
        {/* Üst satır: solda fihrist + konum bilgisi, sağda sayfa dinleme */}
        <div className="mushaf-fit-header relative flex items-center gap-2">
          {onOpenMenu && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenMenu();
              }}
              aria-label="Fihristi aç"
              title="Fihrist"
              className="-ml-1 shrink-0 p-1 -translate-y-px rounded-full text-stone-300 hover:text-emerald-700 hover:bg-stone-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <span className="text-[10px] sm:text-[11px] text-stone-400 font-medium truncate">
            {currentJuz}. Cüz ·{" "}
            {chapterList.length > 1
              ? `${chapterList.length} Sûre`
              : `${primaryChapter?.id ?? 1}. Sûre`}{" "}
            · {surahNames}
          </span>

          {/* Mod anahtarı başlığın tam ortasında */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-lg bg-stone-100/70 border border-stone-200 p-0.5"
            style={{ marginInline: "calc(0.25rem * var(--fit, 1))" }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwitchToWordMode?.();
              }}
              disabled={!onSwitchToWordMode}
              className="px-2 sm:px-2.5 py-0.5 rounded-md font-medium text-stone-500 hover:text-emerald-700 transition-colors disabled:pointer-events-none"
              style={{ fontSize: "calc(10px * var(--fit, 1))" }}
            >
              Kelime Meali
            </button>
            <span
              className="px-2 sm:px-2.5 py-0.5 rounded-md font-semibold bg-white text-emerald-700 shadow-sm"
              style={{ fontSize: "calc(10px * var(--fit, 1))" }}
              aria-current="page"
            >
              Mushaf
            </span>
          </div>

          <span className="flex-1" />

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
            className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors ${
              isPlayingPage
                ? "text-amber-600 bg-amber-50"
                : "text-stone-400 hover:text-emerald-700 hover:bg-stone-100"
            } disabled:opacity-30 disabled:pointer-events-none`}
          >
            {isPlayingPage ? (
              <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            ) : (
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 translate-x-px fill-current" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPage();
            }}
            disabled={verses.length === 0}
            className={`shrink-0 text-[11px] sm:text-xs font-medium transition-colors ${
              isPlayingPage
                ? "text-amber-600"
                : "text-stone-400 hover:text-emerald-700"
            } disabled:opacity-30 disabled:pointer-events-none`}
          >
            {isPlayingPage ? "Durduruluyor…" : "Sayfayı Dinle"}
          </button>
        </div>

        {/* Kur'an metni - dikeyde ortalanmış */}
        <div
          ref={contentRef}
          className="mushaf-fit-content flex flex-col"
          style={{ gap: "calc(0.45rem * var(--fit, 1))" }}
        >
          {Object.entries(versesByChapter).map(([chIdStr, chVerses]) => {
            const chObj = chapters.find((c) => c.id === parseInt(chIdStr, 10));
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

                {/* Kelimeler */}
                <div
                  dir="rtl"
                  className="flex flex-wrap items-center justify-center gap-x-0.5 sm:gap-x-1 leading-mushaf text-center mushaf-ink"
                  style={{ rowGap: "calc(0.3rem * var(--fit, 1))" }}
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
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sayfa gezinme - Arapça yönü: sonraki sola, önceki sağa.
            Mobilde butonlar yalnızca geçiş animasyonu sırasında görünür;
            normalde sayfayı parmakla sürüklemek değiştirir. */}
        <div className="mushaf-fit-footer pt-2 mt-1 border-t border-stone-300/70">
          <div className="flex items-center justify-between gap-2">
            {/* Masaüstünde hep görünür, mobilde geçişte belirir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                flashNav();
                onPageChange(pageNumber + 1);
              }}
              disabled={!hasNext}
              aria-label="Sonraki sayfa"
              className={`group flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-stone-400 hover:text-emerald-700 hover:bg-stone-100 disabled:opacity-25 disabled:pointer-events-none transition-opacity duration-300 sm:opacity-100 ${
                showNavButtons
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none sm:pointer-events-auto"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Sonraki</span>
            </button>

            {/* Sayfa numarası + yer imi (hatim takibi) */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] sm:text-xs text-stone-400 tabular-nums">
                {pageNumber}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePageBookmark?.(pageNumber);
                }}
                aria-label={
                  isPageBookmarked
                    ? `${pageNumber}. sayfayı yer imlerinden çıkar`
                    : `${pageNumber}. sayfayı yer imlerine ekle`
                }
                title={
                  isPageBookmarked
                    ? "Yer imlerinden çıkar"
                    : "Yer imlerine ekle"
                }
                aria-pressed={!!isPageBookmarked}
                className={`p-1 rounded-full transition-colors ${
                  isPageBookmarked
                    ? "text-[var(--bookmark)] hover:bg-emerald-50"
                    : "text-stone-400 hover:text-[var(--bookmark)] hover:bg-stone-200/50"
                }`}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${isPageBookmarked ? "fill-current" : ""}`}
                />
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                flashNav();
                onPageChange(pageNumber - 1);
              }}
              disabled={!hasPrev}
              aria-label="Önceki sayfa"
              className={`group flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-stone-400 hover:text-emerald-700 hover:bg-stone-100 disabled:opacity-25 disabled:pointer-events-none transition-opacity duration-300 sm:opacity-100 ${
                showNavButtons
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none sm:pointer-events-auto"
              }`}
            >
              <span className="hidden sm:inline">Önceki</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
