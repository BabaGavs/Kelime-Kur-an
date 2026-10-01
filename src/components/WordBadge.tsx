import React, { useState, useRef, useEffect } from "react";
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

const LONG_PRESS_MS = 450;

export const WordBadge: React.FC<WordBadgeProps> = ({
  word,
  verse,
  alwaysShowMeaning,
  onSelectWord,
  isSelected,
  fontClass,
  fontSizeMultiplier,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tapMeaning, setTapMeaning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const isEndOfAyah = word.char_type_name === "end";
  const turkishMeaning = word.translation?.text || "";

  const clearPress = () => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Dokunma: kisa basış -> mana, uzun basış -> bilgi kutusu
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    e.stopPropagation();
    longPressFired.current = false;
    clearPress();
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setTapMeaning(false);
      onSelectWord(word, verse);
    }, LONG_PRESS_MS);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    e.stopPropagation();
    clearPress();
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (turkishMeaning) setTapMeaning((v) => !v);
  };

  const onPointerLeave = () => {
    clearPress();
    setIsHovered(false);
  };

  // Başka bir yere dokununca manayı kapat
  useEffect(() => {
    if (!tapMeaning) return;
    const onDoc = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setTapMeaning(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [tapMeaning]);

  useEffect(() => clearPress, []);

  // Ayet sonu isareti
  if (isEndOfAyah) {
    return (
      <span
        className="inline-flex items-center justify-center mx-1 select-none text-emerald-700 font-bold"
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
      ref={rootRef}
      data-no-swipe
      className={`relative inline-flex flex-col items-center justify-center rounded-lg transition-all cursor-pointer group select-none ${
        isSelected
          ? "bg-emerald-500/20 ring-2 ring-emerald-500"
          : tapMeaning
            ? "bg-emerald-50 ring-1 ring-emerald-200"
            : "hover:bg-emerald-50"
      }`}
      style={{ padding: "calc(0.25rem) calc(0.375rem)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        if (!longPressFired.current) onSelectWord(word, verse);
        longPressFired.current = false;
      }}
      tabIndex={0}
      role="button"
      aria-label={`${word.text_uthmani}, anlamı: ${turkishMeaning}`}
    >
      {/* Arapça kelime */}
      <span
        dir="rtl"
        className={`${fontClass} leading-relaxed tracking-wide text-stone-900 transition-colors group-hover:text-emerald-700`}
        style={{
          fontSize: `calc(${1.75 * fontSizeMultiplier}rem * var(--fit, 1))`,
        }}
      >
        {word.text_uthmani || word.text}
      </span>

      {/* Ayarlarda sürekli gösterim açıksa kelimenin altında */}
      {alwaysShowMeaning && turkishMeaning && (
        <span className="text-[11px] font-medium text-stone-600 max-w-[85px] truncate text-center leading-tight mt-0.5">
          {turkishMeaning}
        </span>
      )}

      {/* Masaüstü: imleç ile üzerine gelince sadece manası */}
      {isHovered && !alwaysShowMeaning && turkishMeaning && (
        <span role="tooltip" className="word-tooltip">
          {turkishMeaning}
        </span>
      )}

      {/* Mobil: dokununca kelimenin altında manası */}
      {tapMeaning && !alwaysShowMeaning && turkishMeaning && (
        <span className="word-tap-meaning" role="status">
          {turkishMeaning}
        </span>
      )}
    </div>
  );
};
