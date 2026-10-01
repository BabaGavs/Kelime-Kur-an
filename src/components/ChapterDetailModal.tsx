import React from 'react';
import { Chapter, ChapterInfo } from '../types/quran';
import { X, BookOpen, Layers } from 'lucide-react';

interface ChapterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter;
  chapterInfo: ChapterInfo | null;
}

export const ChapterDetailModal: React.FC<ChapterDetailModalProps> = ({
  isOpen,
  onClose,
  chapter,
  chapterInfo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                {chapter.id}. Sûre
              </span>
              <span className="text-xs text-stone-500">
                {chapter.revelation_place === 'makkah' ? 'Mekke Dönemi' : 'Medine Dönemi'} · İniş Sırası: {chapter.revelation_order}
              </span>
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-baseline gap-3">
              <span>{chapter.translated_name.name} Sûresi</span>
              <span dir="rtl" className="font-arabic text-2xl text-emerald-700 dark:text-emerald-400">
                {chapter.name_arabic}
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800 text-center">
            <div>
              <span className="text-[11px] text-stone-500 block">Âyet Sayısı</span>
              <span className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
                {chapter.verses_count}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-stone-500 block">Mushaf Sayfası</span>
              <span className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
                {chapter.pages[0]} – {chapter.pages[1]}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-stone-500 block">Nüzul Yeri</span>
              <span className="text-base font-bold text-stone-900 dark:text-stone-100">
                {chapter.revelation_place === 'makkah' ? 'Mekkî' : 'Medenî'}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Sûre Hakkında Genel Bilgi
            </h4>
            {chapterInfo ? (
              <div
                className="space-y-2 text-stone-600 dark:text-stone-300 text-xs sm:text-sm leading-relaxed prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: chapterInfo.text || chapterInfo.short_text }}
              />
            ) : (
              <p className="text-xs text-stone-500 italic">
                Bu sûre {chapter.verses_count} âyettir. Kur'an-ı Kerim'in {chapter.pages[0]}. sayfasında yer almaktadır.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
