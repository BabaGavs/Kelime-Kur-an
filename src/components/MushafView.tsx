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
} from "lucide-react";
import { getVerseAudioUrl } from "../services/quranApi";

interface MushafViewProps {
  pageNumber: number;
  verses: Verse[];
  chapters: Chapter[];
  settings: AppSettings;
  onPageChange: (newPage: number) => void;
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
  isPageBookmarked = false,
  onTogglePageBookmark,
}) => {
  const [isPlayingPage, setIsPlayingPage] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  // ---- Bir ekrana sığdırma ----
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    const fit = () => {
      frame.style.setProperty("--fit", "1");
      // Oransal küçültme: taşma oranına göre ölçekle
      let scale = 1;
      for (let i = 0; i < 16; i++) {
        const over = content.scrollHeight - content.clientHeight;
        if (over <= 1) break;
        const ratio = content.clientHeight / content.scrollHeight;
        scale = Math.max(0.28, scale * ratio * 0.95);
        frame.style.setProperty("--fit", scale.toFixed(3));
      }
      frame.style.setProperty("--fit", scale.toFixed(3));
    };

    fit();
    // Yazı tipleri ve düzen geç yerleşebilir -> birkaç gecikmeli ölçüm
    const timers = [
      setTimeout(fit, 120),
      setTimeout(fit, 400),
      setTimeout(fit, 1000),
    ];
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
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
    <div className="mx-auto max-w-4xl h-full flex flex-col relative">
      <div
        key={pageNumber}
        ref={frameRef}
        className="mushaf-fit-frame mushaf-page-enter"
        style={{ padding: "calc(0.75rem * var(--fit, 1))" }}
      >
        {/* Üst satır: solda konum bilgisi, sağda sayfa dinleme */}
        <div className="mushaf-fit-header flex items-center gap-2">
          <span className="text-[10px] sm:text-[11px] text-stone-400 font-medium truncate">
            {currentJuz}. Cüz ·{" "}
            {chapterList.length > 1
              ? `${chapterList.length} Sûre`
              : `${primaryChapter?.id ?? 1}. Sûre`}{" "}
            · {surahNames}
          </span>

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
          style={{ gap: "calc(0.75rem * var(--fit, 1))" }}
        >
          {Object.entries(versesByChapter).map(([chIdStr, chVerses]) => {
            const chObj = chapters.find((c) => c.id === parseInt(chIdStr, 10));
            const startsSurah = chVerses.some((v) => v.verse_number === 1);

            return (
              <div
                key={chIdStr}
                className="flex flex-col"
                style={{ gap: "calc(0.5rem * var(--fit, 1))" }}
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
                          marginTop: "calc(0.35rem * var(--fit, 1))",
                        }}
                      >
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </div>
                    )}
                    <div
                      className="mx-auto w-16 h-px"
                      style={{
                        background: "var(--border-color)",
                        marginTop: "calc(0.4rem * var(--fit, 1))",
                        marginBottom: "calc(0.3rem * var(--fit, 1))",
                      }}
                    />
                  </div>
                )}

                {/* Kelimeler */}
                <div
                  dir="rtl"
                  className="flex flex-wrap items-center justify-center gap-x-0.5 sm:gap-x-1 leading-loose text-center"
                  style={{ rowGap: "calc(0.5rem * var(--fit, 1))" }}
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

        {/* Sayfa gezinme - Arapça yönü: sonraki sola, önceki sağa */}
        <div className="mushaf-fit-footer pt-2 mt-1 border-t border-stone-200/80">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPageChange(pageNumber + 1);
              }}
              disabled={!hasNext}
              className="group flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-stone-400 hover:text-emerald-700 hover:bg-stone-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
              aria-label="Sonraki sayfa"
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
                    ? "text-amber-500 hover:bg-amber-50"
                    : "text-stone-300 hover:text-amber-500 hover:bg-stone-100"
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
                onPageChange(pageNumber - 1);
              }}
              disabled={!hasPrev}
              className="group flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-stone-400 hover:text-emerald-700 hover:bg-stone-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
              aria-label="Önceki sayfa"
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
