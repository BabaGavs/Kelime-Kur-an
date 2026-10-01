import React, { useState, useRef, useEffect, useCallback } from "react";
import { Verse, Chapter, AppSettings, Word, DisplayMode } from "../types/quran";
import { WordBadge } from "./WordBadge";
import { ArrowLeft, ArrowRight, Play, Square } from "lucide-react";
import { getVerseAudioUrl } from "../services/quranApi";

interface MushafViewProps {
  pageNumber: number;
  verses: Verse[];
  chapters: Chapter[];
  settings: AppSettings;
  onPageChange: (newPage: number) => void;
  onSelectWord: (word: Word, verse: Verse) => void;
  selectedWordId?: number | null;
  activePlayingWordId?: number | null;
  onPlayWordAudio: (word: Word) => void;
  /** Mobil/tablet: boşluğa dokununca menüyü aç */
  onOpenMenu?: () => void;
  /** Sayfa çevirme (parmak kaydırma) etkin mi */
  swipeEnabled?: boolean;
  /** Görünüm modu (geçiş butonları için) */
  displayMode?: DisplayMode;
  /** Mobil/tablet sayfa başında mod geçişi */
  onDisplayModeChange?: (mode: DisplayMode) => void;
}

const SWIPE_THRESHOLD = 70;

export const MushafView: React.FC<MushafViewProps> = ({
  pageNumber,
  verses,
  chapters,
  settings,
  onPageChange,
  onSelectWord,
  selectedWordId,
  activePlayingWordId,
  onPlayWordAudio,
  onOpenMenu,
  swipeEnabled = false,
  displayMode = "mushaf",
  onDisplayModeChange,
}) => {
  const [isPlayingPage, setIsPlayingPage] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  // ---- Sayfa çevirme (kitap hissi) ----
  const [dragX, setDragX] = useState(0);
  const [enterDir, setEnterDir] = useState<"next" | "prev" | null>(null);
  const dirRef = useRef<"next" | "prev">("next");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const axisLocked = useRef<"x" | "y" | null>(null);

  // Sayfa değişince giriş animasyonu
  useEffect(() => {
    setDragX(0);
    setEnterDir(dirRef.current);
    const t = setTimeout(() => setEnterDir(null), 360);
    return () => clearTimeout(t);
  }, [pageNumber]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!swipeEnabled) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    axisLocked.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swipeEnabled || !touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    // Yatay/dikey ayrımı: dikey hareketi engelleme
    if (!axisLocked.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        axisLocked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
    }
    if (axisLocked.current !== "x") return;

    // Baştaki/ sondaki sayfada dışarı kaydırmayı dirençli yap
    let dxClamped = dx;
    if ((dx > 0 && pageNumber <= 1) || (dx < 0 && pageNumber >= 604)) {
      dxClamped = dx * 0.25;
    }
    setDragX(dxClamped);
  };

  const onTouchEnd = () => {
    if (!swipeEnabled || axisLocked.current !== "x") {
      touchStart.current = null;
      axisLocked.current = null;
      setDragX(0);
      return;
    }
    const dx = dragX;
    touchStart.current = null;
    axisLocked.current = null;

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const goNext = dx < 0;
      if ((goNext && pageNumber < 604) || (!goNext && pageNumber > 1)) {
        dirRef.current = goNext ? "next" : "prev";
        setDragX(0);
        onPageChange(pageNumber + (goNext ? 1 : -1));
        return;
      }
    }
    setDragX(0);
  };

  // ---- Sayfa dinleme ----
  const stopPageAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlayingPage(false);
  }, []);

  // Stop playing when page changes
  useEffect(() => {
    stopPageAudio();
  }, [pageNumber, stopPageAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playVerseAtIndex = (index: number) => {
    if (index >= verses.length) {
      stopPageAudio();
      return;
    }

    const verse = verses[index];
    const parts = verse.verse_key.split(":");
    const ch = parseInt(parts[0], 10);
    const v = parseInt(parts[1], 10);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const url = getVerseAudioUrl(ch, v);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      if (isPlayingRef.current) {
        playVerseAtIndex(index + 1);
      }
    };

    audio.onerror = () => {
      if (isPlayingRef.current) {
        playVerseAtIndex(index + 1);
      }
    };

    audio.play().catch((e) => console.warn("Sayfa dinleme hatası", e));
  };

  const handlePlayPage = () => {
    if (isPlayingPage) {
      stopPageAudio();
    } else {
      isPlayingRef.current = true;
      setIsPlayingPage(true);
      playVerseAtIndex(0);
    }
  };

  const fontClass =
    settings.arabicFont === "scheherazade"
      ? "font-scheherazade"
      : settings.arabicFont === "amiri"
        ? "font-arabic"
        : "font-serif";

  // Find the primary chapter of this page
  const currentChapterId =
    verses.length > 0 ? parseInt(verses[0].verse_key.split(":")[0], 10) : 1;
  const currentChapter = chapters.find((c) => c.id === currentChapterId);
  const currentJuz = verses.length > 0 ? verses[0].juz_number : 1;

  // Group verses by chapter if a page spans across multiple chapters
  const versesByChapter: { [chapterId: number]: Verse[] } = {};
  verses.forEach((v) => {
    const chId = parseInt(v.verse_key.split(":")[0], 10);
    if (!versesByChapter[chId]) versesByChapter[chId] = [];
    versesByChapter[chId].push(v);
  });

  return (
    <div
      className="max-w-4xl mx-auto"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      // Boşluğa dokununca menüyü aç (sadece mobil/tablet)
      onClick={() => onOpenMenu?.()}
    >
      {/* Mushaf Page Frame */}
      <div
        className={[
          "p-4 sm:p-6 lg:p-10 rounded-2xl sm:rounded-3xl bg-white border-2 border-emerald-600/30 shadow-xl shadow-stone-950/5 relative",
          enterDir === "next"
            ? "mushaf-page-enter-next"
            : enterDir === "prev"
              ? "mushaf-page-enter-prev"
              : "",
        ].join(" ")}
        style={
          dragX !== 0
            ? {
                transform: `perspective(1600px) translateX(${dragX}px) rotateY(${dragX / 32}deg)`,
                transition: "none",
              }
            : { transition: "transform 300ms cubic-bezier(0.22, 0.9, 0.3, 1)" }
        }
      >
        {/* Top Header of Mushaf Page */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-stone-200/80 text-[10px] sm:text-xs font-semibold text-stone-500">
          <span className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <span className="text-emerald-700 font-bold">
              {currentJuz}. Cüz
            </span>
            <span>·</span>
            <span className="truncate">
              {currentChapter?.translated_name.name} Sûresi
            </span>
          </span>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobil/tablet mod geçişi */}
            {onDisplayModeChange && (
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-100 border border-stone-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisplayModeChange("word-by-word");
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all ${
                    displayMode === "word-by-word"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  Kelime Meali
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisplayModeChange("mushaf");
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all ${
                    displayMode === "mushaf"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  Mushaf
                </button>
              </div>
            )}

            {/* Sayfa dinleme butonu (masaüstünde yazı, mobilde ikon) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPage();
              }}
              disabled={verses.length === 0}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isPlayingPage
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              } disabled:opacity-40 disabled:pointer-events-none`}
              title={isPlayingPage ? "Sayfa Dinlemeyi Durdur" : "Sayfayı Dinle"}
            >
              {isPlayingPage ? (
                <Square className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span className="hidden lg:inline">
                {isPlayingPage ? "Durdur" : "Sayfayı Dinle"}
              </span>
            </button>
          </div>
        </div>

        {/* Content of Verses in Flow */}
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(versesByChapter).map(([chIdStr, chVerses]) => {
            const chId = parseInt(chIdStr, 10);
            const chObj = chapters.find((c) => c.id === chId);
            const isFirstVerseInSurah = chVerses.some(
              (v) => v.verse_number === 1,
            );

            return (
              <div key={chId} className="space-y-3 sm:space-y-4">
                {/* Surah Banner if Surah starts on this page */}
                {isFirstVerseInSurah && chObj && (
                  <div className="text-center py-3 sm:py-4 px-3 sm:px-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 border border-emerald-300/60 my-2 sm:my-4 shadow-sm">
                    <span className="text-[10px] sm:text-xs uppercase tracking-widest text-emerald-800 font-semibold block mb-1">
                      {chObj.id}. SÛRE · {chObj.translated_name.name} (
                      {chObj.verses_count} Âyet)
                    </span>
                    <span
                      dir="rtl"
                      className="font-arabic text-2xl sm:text-3xl font-bold text-emerald-900 block"
                    >
                      سُورَةُ {chObj.name_arabic}
                    </span>
                    {chObj.bismillah_pre && (
                      <div
                        dir="rtl"
                        className="font-arabic text-xl sm:text-2xl text-stone-700 mt-2 sm:mt-3"
                      >
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </div>
                    )}
                  </div>
                )}

                {/* Verses Flow with Hover Badges */}
                <div
                  dir="rtl"
                  className="flex flex-wrap items-center justify-start gap-y-2.5 sm:gap-y-3.5 gap-x-0.5 sm:gap-x-1 sm:gap-x-1.5 leading-loose text-right"
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
                          isSelected={selectedWordId === w.id}
                          activePlayingWordId={activePlayingWordId}
                          onSelectWord={onSelectWord}
                          onPlayWordAudio={onPlayWordAudio}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Page Footer Navigation */}
        {swipeEnabled ? (
          // Mobilde parmakla kaydırma var: yalnızca sayfa numarası
          <div className="pt-4 mt-6 sm:mt-8 border-t border-stone-200/80 flex justify-center">
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
              {pageNumber}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-4 sm:pt-6 mt-4 sm:mt-8 border-t border-stone-200/80 gap-2">
            <button
              onClick={() => onPageChange(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none text-[10px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">
                Önceki Sayfa ({pageNumber - 1})
              </span>
              <span className="sm:hidden">Önceki</span>
            </button>

            <span className="text-[10px] sm:text-xs font-mono font-medium text-stone-500 text-center">
              604 Sayfa içinden {pageNumber}
            </span>

            <button
              onClick={() => onPageChange(pageNumber + 1)}
              disabled={pageNumber >= 604}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:pointer-events-none text-[10px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shadow-sm transition-colors"
            >
              <span className="hidden sm:inline">
                Sonraki Sayfa ({pageNumber + 1})
              </span>
              <span className="sm:hidden">Sonraki</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
