import React from 'react';
import { Word, Verse, Chapter } from '../types/quran';
import { X, Volume2, Copy, Check, BookOpen, Share2 } from 'lucide-react';

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

  if (!word || !verse || !chapter) return null;

  const turkishMeaning = word.translation?.text || 'Kelime meali bulunamadı';
  const transliteration = word.transliteration?.text || '';
  const diyanetTranslation =
    verse.translations?.find((t) => t.resource_id === 77)?.text ||
    verse.translations?.[0]?.text ||
    '';

  const handleCopy = () => {
    const text = `${word.text_uthmani} [${transliteration}] : ${turkishMeaning}\n\nBağlam (${chapter.translated_name.name} Sûresi, ${verse.verse_key}): "${diyanetTranslation}"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 shadow-2xl transition-transform animate-in slide-in-from-bottom-5 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Arabic Word & Turkish Meaning */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-500/20 shrink-0 text-center">
            <span dir="rtl" className="font-arabic text-3xl font-bold text-emerald-900 dark:text-emerald-200 block">
              {word.text_uthmani || word.text}
            </span>
            {transliteration && (
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400 font-mono block mt-0.5">
                {transliteration}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                {chapter.translated_name.name} {verse.verse_key} · {word.position}. Kelime
              </span>
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 truncate">
              {turkishMeaning}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 italic mt-0.5">
              Âyet Meali: "{diyanetTranslation}"
            </p>
          </div>
        </div>

        {/* Right Side: Audio & Action buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-stone-100 dark:border-stone-800">
          {word.audio_url && (
            <button
              onClick={() => onPlayWordAudio(word)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Volume2 className={`w-4 h-4 ${isPlayingWord ? 'animate-pulse' : ''}`} />
              <span>Kelime Telaffuzu</span>
            </button>
          )}

          <button
            onClick={() => onPlayVerseAudio(verse)}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tüm Âyeti Oku</span>
          </button>

          <button
            onClick={handleCopy}
            title="Kelimeyi ve manasını kopyala"
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            title="Kapat"
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
