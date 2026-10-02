import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Word, Verse } from "../types/quran";

interface WordBadgeProps {
  word: Word;
  verse: Verse;
  chapterName?: string;
  alwaysShowMeaning: boolean;
  fontClass: string;
  fontSizeMultiplier: number;
}

const VIEWPORT_MARGIN = 8;

export const WordBadge: React.FC<WordBadgeProps> = ({
  word,
  verse,
  alwaysShowMeaning,
  fontClass,
  fontSizeMultiplier,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tapMeaning, setTapMeaning] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);

  const isEndOfAyah = word.char_type_name === "end";
  const turkishMeaning = word.translation?.text || "";
  const showTooltip = isHovered && !alwaysShowMeaning && !!turkishMeaning;
  const showTapMeaning = tapMeaning && !alwaysShowMeaning && !!turkishMeaning;
  const showPopup = showTooltip || showTapMeaning;

  // Tek dokunuş: manası. Başka hiçbir tepki yok.
  const handleActivate = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (turkishMeaning) setTapMeaning((v) => !v);
  };

  // Manayı ekran içinde tut: kelime soldaysa kutu sağa, sağdaysa sola kayar
  useLayoutEffect(() => {
    if (!showPopup) return;

    const anchor = rootRef.current;
    const pop = popRef.current;
    if (!anchor || !pop) return;

    const place = () => {
      const a = anchor.getBoundingClientRect();
      // Ölçüm için geçici konum: sol üst köşe, kaymasız
      pop.style.transform = "none";
      const p = pop.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Yatay: kelimenin üstünde ortala, sığmazsa kenara yasla
      const centered = a.left + a.width / 2 - p.width / 2;
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(centered, vw - p.width - VIEWPORT_MARGIN),
      );

      // Dikey: kelimenin altı (dokunma) / üstü (imleç)
      const below = showTapMeaning;
      const rawTop = below ? a.bottom + 6 : a.top - p.height - 6;
      const top = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rawTop, vh - p.height - VIEWPORT_MARGIN),
      );

      pop.style.left = `${Math.round(left)}px`;
      pop.style.top = `${Math.round(top)}px`;
    };

    // Ölçüm bitene kadar gizli, sonra yerine oturur
    place();
    pop.style.visibility = "visible";
    place();

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    // Yazı tipleri geç yüklenince satırlar kayar -> yeniden ölç
    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) place();
      });
    }
    const raf = requestAnimationFrame(() => {
      if (!cancelled) place();
    });

    // Kelimenin boyutu değişirse (yazı tipi, fit ölçeklemesi) yeniden ölç
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    ro?.observe(anchor);
    ro?.observe(pop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [showPopup, showTapMeaning]);

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
        tapMeaning
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
      aria-label={`${word.text_uthmani}, anlamı: ${turkishMeaning || "belirtilmemiş"}`}
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

      {/* Manası: ekran içinde konumlanan tek kutu (imleç üstte, dokunuş altta) */}
      {showPopup && (
        <span
          ref={popRef}
          role={showTapMeaning ? "status" : "tooltip"}
          className={`word-popup ${showTapMeaning ? "word-tap-meaning" : "word-tooltip"}`}
          // Konumu JS ölçene kadar gizli
          style={{ visibility: "hidden" }}
        >
          {turkishMeaning}
        </span>
      )}
    </div>
  );
};
