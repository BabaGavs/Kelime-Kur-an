import React, { useState } from "react";
import { Word, Verse } from "../types/quran";

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
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isEndOfAyah = word.char_type_name === "end";
  const turkishMeaning = word.translation?.text || "";

  // Ayet sonu isareti
  if (isEndOfAyah) {
    return (
      <span
        className="inline-flex items-center justify-center mx-1 select-none text-emerald-700 font-bold transition-transform hover:scale-110"
        title={`${verse.verse_key} numaralı âyet sonu`}
      >
        <span className="text-xl px-1.5 py-0.5 rounded-full border border-emerald-600/30 bg-emerald-50/60 text-emerald-800 font-mono text-xs">
          {verse.verse_number}
        </span>
      </span>
    );
  }

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-all cursor-pointer group select-none ${
        isSelected
          ? "bg-emerald-500/20 ring-2 ring-emerald-500"
          : "hover:bg-emerald-50"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelectWord(word, verse);
      }}
      tabIndex={0}
      role="button"
      aria-label={`${word.text_uthmani}, anlamı: ${turkishMeaning}`}
    >
      {/* Arapça kelime */}
      <span
        dir="rtl"
        className={`${fontClass} leading-relaxed tracking-wide text-stone-900 transition-colors group-hover:text-emerald-700`}
        style={{ fontSize: `${1.75 * fontSizeMultiplier}rem` }}
      >
        {word.text_uthmani || word.text}
      </span>

      {/* Ayarlarda sürekli gösterim açıksa kelimenin altında */}
      {alwaysShowMeaning && turkishMeaning && (
        <span className="text-[11px] font-medium text-stone-600 max-w-[85px] truncate text-center leading-tight mt-0.5">
          {turkishMeaning}
        </span>
      )}

      {/* Imleç ile üzerine gelince sadece manası */}
      {isHovered && !alwaysShowMeaning && turkishMeaning && (
        <span role="tooltip" className="word-tooltip">
          {turkishMeaning}
        </span>
      )}
    </div>
  );
};
