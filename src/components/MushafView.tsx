import React from 'react';
import { Verse, Chapter, AppSettings, Word } from '../types/quran';
import { WordBadge } from './WordBadge';
import { ArrowLeft, ArrowRight, Play, Pause, Bookmark, Copy, Check } from 'lucide-react';

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
}

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
}) => {
  const fontClass =
    settings.arabicFont === 'scheherazade'
      ? 'font-scheherazade'
      : settings.arabicFont === 'amiri'
      ? 'font-arabic'
      : 'font-serif';

  // Find the primary chapter of this page
  const currentChapterId = verses.length > 0 ? parseInt(verses[0].verse_key.split(':')[0], 10) : 1;
  const currentChapter = chapters.find((c) => c.id === currentChapterId);
  const currentJuz = verses.length > 0 ? verses[0].juz_number : 1;

  // Group verses by chapter if a page spans across multiple chapters
  const versesByChapter: { [chapterId: number]: Verse[] } = {};
  verses.forEach((v) => {
    const chId = parseInt(v.verse_key.split(':')[0], 10);
    if (!versesByChapter[chId]) versesByChapter[chId] = [];
    versesByChapter[chId].push(v);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mushaf Page Frame */}
      <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-stone-900 border-2 border-emerald-600/30 dark:border-emerald-500/20 shadow-xl shadow-stone-950/5 relative">
        {/* Top Header of Mushaf Page */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-200/80 dark:border-stone-800 text-xs font-semibold text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{currentJuz}. Cüz</span>
            <span>·</span>
            <span>{currentChapter?.translated_name.name} Sûresi</span>
          </span>

          <span className="font-mono text-sm px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
            Sayfa {pageNumber}
          </span>
        </div>

        {/* Content of Verses in Flow */}
        <div className="space-y-6">
          {Object.entries(versesByChapter).map(([chIdStr, chVerses]) => {
            const chId = parseInt(chIdStr, 10);
            const chObj = chapters.find((c) => c.id === chId);
            const isFirstVerseInSurah = chVerses.some((v) => v.verse_number === 1);

            return (
              <div key={chId} className="space-y-4">
                {/* Surah Banner if Surah starts on this page */}
                {isFirstVerseInSurah && chObj && (
                  <div className="text-center py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 dark:from-emerald-950/40 dark:via-emerald-900/40 dark:to-emerald-950/40 border border-emerald-300/60 dark:border-emerald-700/40 my-4 shadow-sm">
                    <span className="text-xs uppercase tracking-widest text-emerald-800 dark:text-emerald-300 font-semibold block mb-1">
                      {chObj.id}. SÛRE · {chObj.translated_name.name} ({chObj.verses_count} Âyet)
                    </span>
                    <span dir="rtl" className="font-arabic text-3xl font-bold text-emerald-900 dark:text-emerald-200 block">
                      سُورَةُ {chObj.name_arabic}
                    </span>
                    {chObj.bismillah_pre && (
                      <div dir="rtl" className="font-arabic text-2xl text-stone-700 dark:text-stone-300 mt-3">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </div>
                    )}
                  </div>
                )}

                {/* Verses Flow with Hover Badges */}
                <div
                  dir="rtl"
                  className="flex flex-wrap items-center justify-start gap-y-3.5 gap-x-1 sm:gap-x-1.5 leading-loose text-right"
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
        <div className="flex items-center justify-between pt-6 mt-8 border-t border-stone-200/80 dark:border-stone-800">
          <button
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Önceki Sayfa ({pageNumber - 1})</span>
          </button>

          <span className="text-xs font-mono font-medium text-stone-500">
            604 Sayfa içinden {pageNumber}
          </span>

          <button
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= 604}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>Sonraki Sayfa ({pageNumber + 1})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
