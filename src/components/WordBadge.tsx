import React, { useState, useRef, useEffect } from 'react';
import { Word, Verse } from '../types/quran';
import { Volume2, Info, Check, Copy } from 'lucide-react';
import { getWordAudioUrl } from '../services/quranApi';

interface WordBadgeProps {
  word: Word;
  verse: Verse;
  chapterName?: string;
  alwaysShowMeaning: boolean;
  onSelectWord: (word: Word, verse: Verse) => void;
  isSelected: boolean;
  fontClass: string;
  fontSizeMultiplier: number;
  activePlayingWordId?: number | null;
  onPlayWordAudio?: (word: Word) => void;
}

export const WordBadge: React.FC<WordBadgeProps> = ({
  word,
  verse,
  chapterName,
  alwaysShowMeaning,
  onSelectWord,
  isSelected,
  fontClass,
  fontSizeMultiplier,
  activePlayingWordId,
  onPlayWordAudio,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isEndOfAyah = word.char_type_name === 'end';
  const hasAudio = !!word.audio_url;
  const isPlaying = activePlayingWordId === word.id;
  const turkishMeaning = word.translation?.text || '';
  const transliteration = word.transliteration?.text || '';

  // Get full verse translation for context
  const fullVerseTranslation =
    verse.translations && verse.translations.length > 0
      ? verse.translations[0].text
      : '';

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlayWordAudio && hasAudio) {
      onPlayWordAudio(word);
    }
  };

  const handleCopyWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${word.text_uthmani} [${transliteration}] : ${turkishMeaning} (${chapterName || ''} ${verse.verse_key})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // If this is the verse end marker (e.g. ۝ / numbers)
  if (isEndOfAyah) {
    return (
      <span
        className="inline-flex items-center justify-center mx-1 select-none text-emerald-700 dark:text-emerald-400 font-bold transition-transform hover:scale-110"
        title={`${verse.verse_key} numaralı âyet sonu`}
      >
        <span className="text-xl px-1.5 py-0.5 rounded-full border border-emerald-600/30 dark:border-emerald-400/30 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono text-xs">
          {verse.verse_number}
        </span>
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-all cursor-pointer group select-none ${
        isSelected
          ? 'bg-emerald-500/20 ring-2 ring-emerald-500 dark:bg-emerald-500/30'
          : isPlaying
          ? 'bg-amber-400/25 ring-2 ring-amber-500 animate-pulse'
          : 'hover:bg-emerald-50 dark:hover:bg-stone-800/80'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelectWord(word, verse)}
      tabIndex={0}
      role="button"
      aria-label={`${word.text_uthmani}, anlamı: ${turkishMeaning}`}
    >
      {/* Arabic Word Text */}
      <span
        dir="rtl"
        className={`${fontClass} leading-relaxed tracking-wide text-stone-900 dark:text-stone-100 transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400`}
        style={{ fontSize: `${1.75 * fontSizeMultiplier}rem` }}
      >
        {word.text_uthmani || word.text}
      </span>

      {/* Always-on subtitle meaning if enabled */}
      {alwaysShowMeaning && turkishMeaning && (
        <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300 max-w-[85px] truncate text-center leading-tight mt-0.5">
          {turkishMeaning}
        </span>
      )}

      {/* Floating Hover Context Popover (Appears on Hover or Selection) */}
      {(isHovered || isSelected) && (
        <div
          ref={popoverRef}
          className="absolute z-50 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-72 sm:w-80 p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-950/15 text-left text-xs pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-white dark:border-t-stone-900" />

          {/* Header Row */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">
              {chapterName ? `${chapterName} ` : ''}{verse.verse_key} · {word.position}. Kelime
            </span>

            <div className="flex items-center gap-1">
              {hasAudio && (
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  title="Kelime telaffuzunu dinle"
                  className="p-1 rounded-md text-stone-600 hover:text-emerald-600 dark:text-stone-400 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-600 animate-spin' : ''}`} />
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyWord}
                title="Kelimeyi ve manasını kopyala"
                className="p-1 rounded-md text-stone-600 hover:text-emerald-600 dark:text-stone-400 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Word & Turkish Meaning Body */}
          <div className="py-2.5 space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {turkishMeaning || 'Kelime manası belirtilmedi'}
              </span>
              <span dir="rtl" className="font-arabic text-xl font-bold text-stone-900 dark:text-stone-100">
                {word.text_uthmani}
              </span>
            </div>

            {transliteration && (
              <p className="text-[11px] text-stone-600 dark:text-stone-400 italic">
                Okunuşu: <span className="font-mono text-stone-700 dark:text-stone-300 not-italic">{transliteration}</span>
              </p>
            )}
          </div>

          {/* Context: Full verse meaning with context explanation */}
          {fullVerseTranslation && (
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/80 dark:bg-stone-950/40 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
              <div className="flex items-center gap-1 text-[10px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                <Info className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Âyet İçi Bağlamı:</span>
              </div>
              <p className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed italic line-clamp-3">
                "{fullVerseTranslation}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
