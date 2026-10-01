import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, BookOpen, Volume2, ArrowRight, X } from 'lucide-react';
import { searchQuran } from '../services/quranApi';
import { Chapter } from '../types/quran';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  onNavigateToVerse: (chapterId: number, verseNumber: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  chapters,
  onNavigateToVerse,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Quick Sûre matches
  const matchedChapters = query.trim()
    ? chapters.filter((c) => {
        const q = query.toLowerCase().trim();
        return (
          c.translated_name.name.toLowerCase().includes(q) ||
          c.name_simple.toLowerCase().includes(q) ||
          c.name_arabic.includes(q) ||
          String(c.id) === q
        );
      }).slice(0, 4)
    : [];

  // Search API call with debounce
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setResults([]);
      setTotalResults(0);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchQuran(q, 1, 15);
        setResults(data.results);
        setTotalResults(data.totalResults);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Türkçe kelime, âyet meali veya sûre adı ara (örn: Rahman, cennet, sabır)..."
            className="flex-1 bg-transparent text-sm sm:text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Kapat
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Chapter matches */}
          {matchedChapters.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase mb-2">
                Eşleşen Sûreler
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedChapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onNavigateToVerse(ch.id, 1);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-500 bg-stone-50/50 dark:bg-stone-800/50 text-left flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold font-mono">
                        {ch.id}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {ch.translated_name.name} Sûresi
                        </div>
                        <div className="text-[10px] text-stone-500">{ch.verses_count} Âyet</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Verse / Translation Results */}
          {results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
                  Âyet ve Mealler ({totalResults} sonuç)
                </h4>
              </div>

              <div className="space-y-2.5">
                {results.map((res: any, idx) => {
                  const parts = res.verse_key?.split(':') || ['1', '1'];
                  const chapterId = parseInt(parts[0], 10);
                  const verseNumber = parseInt(parts[1], 10);
                  const chObj = chapters.find((c) => c.id === chapterId);
                  const translationText = res.translations?.[0]?.text || '';

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        onNavigateToVerse(chapterId, verseNumber);
                        onClose();
                      }}
                      className="w-full text-left p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-500 bg-white dark:bg-stone-850 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                          <BookOpen className="w-3.5 h-3.5" />
                          {chObj?.translated_name.name || `${chapterId}. Sûre`}, {verseNumber}. Âyet ({res.verse_key})
                        </span>
                        <span dir="rtl" className="font-arabic text-sm text-stone-700 dark:text-stone-300">
                          {res.text?.slice(0, 40)}...
                        </span>
                      </div>

                      {translationText && (
                        <p
                          className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-serif line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: translationText }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {query.trim().length >= 2 && !loading && results.length === 0 && matchedChapters.length === 0 && (
            <div className="p-8 text-center text-stone-500 text-sm">
              <p>"{query}" ile ilgili bir sonuç bulunamadı.</p>
              <p className="text-xs text-stone-400 mt-1">
                Farklı bir Türkçe veya Arapça kelime deneyebilirsiniz.
              </p>
            </div>
          )}

          {!query && (
            <div className="p-8 text-center text-stone-400 text-xs">
              Kur'an-ı Kerim genelinde aramak için en az 2 harf giriniz.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
