import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
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
  /** Görünüm modu */
  displayMode?: DisplayMode;
  /** Mod değiştirme geri çağrısı (panelden) */
  onDisplayModeChange?: (mode: DisplayMode) => void;
  /** Panelden "Dinle" isteği için sayaç */
  playPageSignal?: number;
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
  playPageSignal = 0,
}) => {
  const [isPlayingPage, setIsPlayingPage] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  // ---- Bir ekrana sığdırma (mobil/tablet) ----
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    const fit = () => {
      if (!swipeEnabled) {
        frame.style.setProperty("--fit", "1");
        return;
      }
      frame.style.setProperty("--fit", "1");
      // Oransal küçültme: taşma oranına göre ölçekle (hızlı yakınsar)
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
  }, [pageNumber, verses, swipeEnabled, settings.fontSizeMultiplier]);

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

  // Pointer tabanlı sürükleme: hem dokunmatik hem fare ile çalışır
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Kelimelerin üzerinde sürükleme başlatma (kelime seçimi önemli)
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    touchStart.current = { x: e.clientX, y: e.clientY };
    axisLocked.current = null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!touchStart.current) return;
    const dx = e.clientX - touchStart.current.x;
    const dy = e.clientY - touchStart.current.y;

    // Yatay/dikey ayrımı: dikey hareketi engelleme
    if (!axisLocked.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        axisLocked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axisLocked.current === "x") {
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {}
        }
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

  const onPointerUp = () => {
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

  const handlePlayPage = useCallback(() => {
    if (isPlayingRef.current) {
      stopPageAudio();
    } else {
      isPlayingRef.current = true;
      setIsPlayingPage(true);
      playVerseAtIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses, stopPageAudio]);

  // Panelden gelen "Dinle" isteği
  useEffect(() => {
    if (playPageSignal > 0) handlePlayPage();
  }, [playPageSignal, handlePlayPage]);

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
      className={`mx-auto max-w-4xl ${swipeEnabled ? "h-full flex flex-col" : "space-y-4 sm:space-y-6"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ cursor: dragX !== 0 ? "grabbing" : "grab" }}
      // Boşluğa dokununca menüyü aç
      onClick={() => onOpenMenu?.()}
    >
      {/* Mushaf Page Frame - çerçevesiz, ekranın tamamı */}
      <div
        ref={frameRef}
        className={[
          "relative",
          swipeEnabled ? "mushaf-fit-frame" : "p-4 sm:p-6 lg:p-10",
          enterDir === "next"
            ? "mushaf-page-enter-next"
            : enterDir === "prev"
              ? "mushaf-page-enter-prev"
              : "",
        ].join(" ")}
        style={{
          padding: swipeEnabled ? "calc(0.5rem * var(--fit, 1))" : undefined,
          ...(dragX !== 0
            ? {
                transform: `perspective(1600px) translateX(${dragX}px) rotateY(${dragX / 32}deg)`,
                transition: "none",
              }
            : {
                transition: "transform 300ms cubic-bezier(0.22, 0.9, 0.3, 1)",
              }),
        }}
      >
        {/* Üst satır bilgi alanı: görünmez, yalnızca düzeni tutar */}
        <div className="mushaf-fit-header flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-stone-400 opacity-0 select-none pointer-events-none">
            {currentJuz}. Cüz · {currentChapter?.translated_name.name} Sûresi
          </span>

          {/* Sayfa dinleme - küçük ve yumuşak */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPage();
            }}
            disabled={verses.length === 0}
            data-no-swipe
            aria-label={
              isPlayingPage ? "Sayfa dinlemeyi durdur" : "Sayfayı dinle"
            }
            className={`p-2 rounded-full transition-all ${
              isPlayingPage
                ? "bg-amber-500 text-white shadow-md"
                : "text-stone-300 hover:text-emerald-700 hover:bg-stone-100"
            } disabled:opacity-30 disabled:pointer-events-none`}
          >
            {isPlayingPage ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </button>
        </div>

        {/* Content of Verses in Flow */}
        <div
          ref={contentRef}
          className={`mushaf-fit-content ${swipeEnabled ? "flex flex-col" : "space-y-4 sm:space-y-6"}`}
          style={{
            gap: swipeEnabled ? "calc(0.75rem * var(--fit, 1))" : undefined,
          }}
        >
          {Object.entries(versesByChapter).map(([chIdStr, chVerses]) => {
            const chId = parseInt(chIdStr, 10);
            const chObj = chapters.find((c) => c.id === chId);
            const isFirstVerseInSurah = chVerses.some(
              (v) => v.verse_number === 1,
            );

            return (
              <div
                key={chId}
                className={
                  swipeEnabled ? "flex flex-col" : "space-y-3 sm:space-y-4"
                }
                style={{
                  gap: swipeEnabled
                    ? "calc(0.5rem * var(--fit, 1))"
                    : undefined,
                }}
              >
                {/* Sûre başlığı - yalnızca metin, çerçevesiz */}
                {isFirstVerseInSurah && chObj && (
                  <div className="text-center">
                    <div
                      dir="rtl"
                      className="font-arabic font-bold text-stone-800"
                      style={{
                        fontSize: swipeEnabled
                          ? "calc(1.5rem * var(--fit, 1))"
                          : "1.875rem",
                      }}
                    >
                      سُورَةُ {chObj.name_arabic}
                    </div>
                    {chObj.bismillah_pre && (
                      <div
                        dir="rtl"
                        className="font-arabic text-stone-500"
                        style={{
                          fontSize: swipeEnabled
                            ? "calc(1.1rem * var(--fit, 1))"
                            : "1.5rem",
                          marginTop: swipeEnabled
                            ? "calc(0.35rem * var(--fit, 1))"
                            : "0.5rem",
                        }}
                      >
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </div>
                    )}
                    <div
                      className="mx-auto my-2 w-16 h-px"
                      style={{
                        background: "var(--border-color)",
                        marginTop: swipeEnabled
                          ? "calc(0.4rem * var(--fit, 1))"
                          : "0.5rem",
                        marginBottom: swipeEnabled
                          ? "calc(0.3rem * var(--fit, 1))"
                          : "0.4rem",
                      }}
                    />
                  </div>
                )}

                {/* Verses Flow with Hover Badges */}
                <div
                  dir="rtl"
                  className="flex flex-wrap items-center justify-center gap-x-0.5 sm:gap-x-1 sm:gap-x-1.5 leading-loose text-center"
                  style={{
                    rowGap: swipeEnabled
                      ? "calc(0.5rem * var(--fit, 1))"
                      : undefined,
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
          <div className="mushaf-fit-footer pt-2.5 border-t border-stone-200/80 flex justify-center">
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
