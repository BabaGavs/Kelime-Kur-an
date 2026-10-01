import React, { useEffect } from "react";
import { Word, Verse, Chapter } from "../types/quran";
import { X, Volume2, Copy, Check, BookOpen } from "lucide-react";

interface WordDrawerProps {
  word: Word | null;
  verse: Verse | null;
  chapter: Chapter | null;
  onClose: () => void;
  onPlayWordAudio: (word: Word) => void;
  onPlayVerseAudio: (verse: Verse) => void;
  isPlayingWord: boolean;
}

export const WordDrawer: React.FC<WordDrawerProps> = ({
  word,
  verse,
  chapter,
  onClose,
  onPlayWordAudio,
  onPlayVerseAudio,
  isPlayingWord,
}) => {
  const [copied, setCopied] = React.useState(false);

  const isOpen = !!word && !!verse && !!chapter;

  // Esc ile kapatma
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!word || !verse || !chapter) return null;

  const turkishMeaning = word.translation?.text || "Kelime meali bulunamadı";
  const diyanetTranslation =
    verse.translations?.find((t) => t.resource_id === 77)?.text ||
    verse.translations?.[0]?.text ||
    "";

  const handleCopy = async () => {
    const text = `${word.text_uthmani} : ${turkishMeaning}\n\nBağlam (${chapter.translated_name.name} Sûresi, ${verse.verse_key}):"${diyanetTranslation}"`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Kopyalama başarısız:", err);
    }
  };

  return (
    // Tam ekran kaplayan katman: dışarıdaki boşluğa tıklayınca kapanır
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Kelime detayı"
    >
      {/* Boşluğa tıklama alanı */}
      <div className="absolute inset-0" />

      {/* Panel */}
      <div
        className="absolute inset-x-0 bottom-0 p-2 sm:p-4 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2 sm:gap-4">
          {/* Left Side: Arabic Word & Turkish Meaning */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <div className="p-2 sm:p-3 bg-emerald-50 rounded-xl sm:rounded-2xl border border-emerald-500/20 shrink-0 text-center">
              <span
                dir="rtl"
                className="font-arabic text-2xl sm:text-3xl font-bold text-emerald-900 block"
              >
                {word.text_uthmani || word.text}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded bg-stone-100 text-stone-600 truncate">
                  {chapter.translated_name.name} {verse.verse_key} ·{" "}
                  {word.position}. Kelime
                </span>
              </div>
              <h3 className="text-sm sm:text-lg font-bold text-stone-900 truncate">
                {turkishMeaning}
              </h3>
              <p className="text-[10px] sm:text-xs text-stone-500 line-clamp-1 italic mt-0.5">
                Âyet Meali:"{diyanetTranslation}"
              </p>
            </div>
          </div>

          {/* Right Side: Audio & Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-1.5 sm:pt-2 md:pt-0 border-stone-100">
            {word.audio_url && (
              <button
                onClick={() => onPlayWordAudio(word)}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shadow-sm transition-colors"
              >
                <Volume2
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPlayingWord ? "animate-pulse" : ""}`}
                />
                <span>Kelime Telaffuzu</span>
              </button>
            )}

            <button
              onClick={() => onPlayVerseAudio(verse)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-[10px] sm:text-xs font-medium text-stone-700 flex items-center gap-1 sm:gap-1.5 transition-colors"
            >
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Tüm Âyeti Oku</span>
            </button>

            <button
              onClick={handleCopy}
              title="Kelimeyi ve manasını kopyala"
              className="p-1.5 sm:p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>

            <button
              onClick={onClose}
              title="Kapat"
              aria-label="Kapat"
              className="p-1.5 sm:p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
