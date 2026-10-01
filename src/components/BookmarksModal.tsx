import React from 'react';
import { Bookmark as BookmarkType } from '../types/quran';
import { X, Trash2, BookOpen, ArrowRight } from 'lucide-react';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: BookmarkType[];
  onRemoveBookmark: (id: string) => void;
  onNavigateToBookmark: (chapterId: number, verseNumber: number) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onNavigateToBookmark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Kayıtlı Yer İmlerim
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold font-mono">
              {bookmarks.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {bookmarks.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-700" />
              Henüz kaydedilmiş bir yer imi yok. Âyetlerin yanındaki yer imi ikonuna tıklayarak
              buraya ekleyebilirsiniz.
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                onClick={() => {
                  onNavigateToBookmark(bm.chapterId, bm.verseNumber);
                  onClose();
                }}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-500 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all cursor-pointer group flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                      {bm.chapterName} Sûresi, {bm.verseNumber}. Âyet ({bm.verseKey})
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {new Date(bm.timestamp).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <p dir="rtl" className="font-arabic text-base text-stone-800 dark:text-stone-200 truncate mb-1">
                    {bm.snippetArabic}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 italic font-serif">
                    "{bm.snippetTurkish}"
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(bm.id);
                    }}
                    title="Yer İmini Sil"
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
