import React from "react";
import { Bookmark as BookmarkType } from "../types/quran";
import { X, Trash2, BookOpen, ArrowRight } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white border border-stone-200 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-stone-900">
              Kayıtlı Yer İmlerim
            </h3>
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold font-mono">
              {bookmarks.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 sm:py-3 space-y-1.5 sm:space-y-2">
          {bookmarks.length === 0 ? (
            <div className="py-8 sm:py-12 text-center text-stone-400 text-[11px] sm:text-xs">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-stone-300" />
              Henüz kaydedilmiş bir yer imi yok. Âyetlerin yanındaki yer imi
              ikonuna tıklayarak buraya ekleyebilirsiniz.
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                onClick={() => {
                  onNavigateToBookmark(bm.chapterId, bm.verseNumber);
                  onClose();
                }}
                className="p-2.5 sm:p-3 rounded-xl border border-stone-200 hover:border-emerald-500 bg-stone-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer group flex items-start justify-between gap-2 sm:gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-800 truncate">
                      {bm.chapterName} Sûresi, {bm.verseNumber}. Âyet (
                      {bm.verseKey})
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-stone-400 shrink-0">
                      {new Date(bm.timestamp).toLocaleDateString("tr-TR")}
                    </span>
                  </div>

                  <p
                    dir="rtl"
                    className="font-arabic text-sm sm:text-base text-stone-800 truncate mb-0.5 sm:mb-1"
                  >
                    {bm.snippetArabic}
                  </p>
                  <p className="text-[10px] sm:text-xs text-stone-600 line-clamp-2 italic font-serif">
                    "{bm.snippetTurkish}"
                  </p>
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pt-0.5 sm:pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(bm.id);
                    }}
                    title="Yer İmini Sil"
                    className="p-1 sm:p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
