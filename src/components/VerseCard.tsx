import React, { useState } from 'react';
import { Verse, Chapter, AppSettings, Word } from '../types/quran';
import { WordBadge } from './WordBadge';
import { Play, Pause, Bookmark, Share2, Copy, Check, BookOpen } from 'lucide-react';

interface VerseCardProps {
  verse: Verse;
  chapter: Chapter;
  settings: AppSettings;
  isPlaying: boolean;
  activePlayingWordId?: number | null;
  onPlayVerseAudio: (verse: Verse) => void;
  onPlayWordAudio: (word: Word) => void;
  onSelectWord: (word: Word, verse: Verse) => void;
  selectedWordId?: number | null;
  isBookmarked: boolean;
  onToggleBookmark: (verse: Verse) => void;
}

export const VerseCard: React.FC<VerseCardProps> = ({
  verse,
  chapter,
  settings,
  isPlaying,
  activePlayingWordId,
  onPlayVerseAudio,
  onPlayWordAudio,
  onSelectWord,
  selectedWordId,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [copied, setCopied] = useState(false);

  const fontClass =
    settings.arabicFont === 'scheherazade'
      ? 'font-scheherazade'
      : settings.arabicFont === 'amiri'
      ? 'font-arabic'
      : 'font-serif';

  // Get translations based on user settings
  const diyanetTranslation = verse.translations?.find((t) => t.resource_id === 77)?.text || '';
  const elmaliliTranslation = verse.translations?.find((t) => t.resource_id === 52)?.text || '';

  const handleCopy = () => {
    const arabicText = verse.words
      .filter((w) => w.char_type_name === 'word')
      .map((w) => w.text_uthmani || w.text)
      .join(' ');
    const textToCopy = `${chapter.translated_name.name} Sûresi, ${verse.verse_number}. Âyet\n${arabicText}\n\nMeali (Diyanet): ${diyanetTranslation || elmaliliTranslation}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      id={`verse-${verse.verse_key.replace(':', '-')}`}
      className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-sm transition-all hover:shadow-md hover:border-emerald-500/30"
    >
      {/* Verse Top Bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100 dark:border-stone-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold tracking-wide">
            {verse.verse_key}
          </span>
          <span className="text-stone-600 dark:text-stone-400 font-medium hidden sm:inline">
            {chapter.translated_name.name} · {verse.page_number}. Sayfa · {verse.juz_number}. Cüz
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPlayVerseAudio(verse)}
            title={isPlaying ? 'Âyeti Durdur' : 'Âyeti Dinle (Mişari Râşid el-Afâsî)'}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
              isPlaying
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden md:inline">Durdur</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="text-[11px] hidden md:inline">Dinle</span>
              </>
            )}
          </button>

          <button
            onClick={() => onToggleBookmark(verse)}
            title={isBookmarked ? 'Yer İmlerinden Çıkar' : 'Yer İmlerine Ekle'}
            className={`p-2 rounded-lg transition-colors ${
              isBookmarked
                ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                : 'text-stone-600 hover:text-amber-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleCopy}
            title="Âyet ve Mealini Kopyala"
            className="p-2 rounded-lg text-stone-600 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Interactive Arabic Words Container */}
      <div
        dir="rtl"
        className="flex flex-wrap items-center justify-start gap-y-3 gap-x-1.5 sm:gap-x-2 py-3 px-2 sm:px-3 rounded-xl bg-stone-50/70 dark:bg-stone-950/40 border border-stone-100 dark:border-stone-800/60 mb-5 leading-loose text-right"
      >
        {verse.words.map((word) => (
          <WordBadge
            key={`${verse.id}-${word.id}`}
            word={word}
            verse={verse}
            chapterName={chapter.translated_name.name}
            alwaysShowMeaning={settings.alwaysShowWordMeaning}
            fontClass={fontClass}
            fontSizeMultiplier={settings.fontSizeMultiplier}
            isSelected={selectedWordId === word.id}
            activePlayingWordId={activePlayingWordId}
            onSelectWord={onSelectWord}
            onPlayWordAudio={onPlayWordAudio}
          />
        ))}
      </div>

      {/* Full Verse Translation Display */}
      {settings.displayMode !== 'mushaf' && (
        <div className="space-y-3 pt-2 text-stone-700 dark:text-stone-300">
          {(settings.translationSource === 77 || settings.translationSource === 'both') && diyanetTranslation && (
            <div className="text-sm sm:text-base leading-relaxed pl-3.5 border-l-2 border-emerald-500/70 dark:border-emerald-400">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 block mb-0.5">
                Diyanet İşleri Meali:
              </span>
              <p className="font-serif italic text-stone-800 dark:text-stone-200">
                {diyanetTranslation}
              </p>
            </div>
          )}

          {(settings.translationSource === 52 || settings.translationSource === 'both') && elmaliliTranslation && (
            <div className="text-sm sm:text-base leading-relaxed pl-3.5 border-l-2 border-amber-500/60 dark:border-amber-400/80">
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 block mb-0.5">
                Elmalılı Hamdi Yazır Meali:
              </span>
              <p className="font-serif italic text-stone-800 dark:text-stone-200">
                {elmaliliTranslation}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
