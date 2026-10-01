import React, { useState, useRef, useEffect } from "react";
import { Word, Verse } from "../types/quran";

interface WordBadgeProps {
  word: Word;
  verse: Verse;
  chapterName?: string;
  alwaysShowMeaning: boolean;
  /** Çift dokunuş: kelimenin telaffuzunu seslendir */
  onSpeakWord: (word: Word) => void;
  isSelected: boolean;
  fontClass: string;
  fontSizeMultiplier: number;
  activePlayingWordId?: number | null;
}

const DOUBLE_TAP_MS = 320;

export const WordBadge: React.FC<WordBadgeProps> = ({
  word,
  verse,
  alwaysShowMeaning,
  onSpeakWord,
  isSelected,
  fontClass,
  fontSizeMultiplier,
  activePlayingWordId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tapMeaning, setTapMeaning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  const isEndOfAyah = word.char_type_name === "end";
  const turkishMeaning = word.translation?.text || "";
  const isPlaying = activePlayingWordId === word.id;

  // Tek dokunuş: manası. Çift dokunuş: telaffuz sesi.
  const handleActivate = (e: React.PointerEvent) => {
    e.stopPropagation();
    const now = Date.now();

    if (now - lastTap.current < DOUBLE_TAP_MS) {
      // Çift dokunuş -> sesli oku
      lastTap.current = 0;
      setTapMeaning(false);
      if (word.audio_url) onSpeakWord(word);
      return;
    }

    lastTap.current = now;
    if (turkishMeaning) setTapMeaning((v) => !v);

    // Pencere ikinci dokunuşu beklesin
    window.setTimeout(() => {
      lastTap.current = 0;
    }, DOUBLE_TAP_MS);
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
      className={`relative inline-flex flex-col items-center justify-center rounded-lg transition-all cursor-pointer group select-none ${
        isSelected
          ? "bg-emerald-500/20 ring-2 ring-emerald-500"
          : tapMeaning
            ? "bg-emerald-50 ring-1 ring-emerald-200"
            : "hover:bg-emerald-50"
      }`}
      style={{ padding: "calc(0.25rem) calc(0.375rem)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handleActivate}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate(e as unknown as React.PointerEvent);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${word.text_uthmani}, anlamı: ${turkishMeaning || "belirtilmemiş"}. Çift dokunuşla telaffuzu dinleyin.`}
    >
      {/* Arapça kelime */}
      <span
        dir="rtl"
        className={`${fontClass} leading-relaxed tracking-wide text-stone-900 transition-colors ${
          isPlaying ? "text-emerald-700" : "group-hover:text-emerald-700"
        }`}
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

      {/* Dokununca kelimenin altında manası */}
      {tapMeaning && !alwaysShowMeaning && turkishMeaning && (
        <span className="word-tap-meaning" role="status">
          {turkishMeaning}
        </span>
      )}
    </div>
  );
};
