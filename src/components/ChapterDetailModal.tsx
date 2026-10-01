import React from "react";
import { Chapter, ChapterInfo } from "../types/quran";
import { X, BookOpen, Layers } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white border border-stone-200 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-stone-100 shrink-0 gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {chapter.id}. Sûre
              </span>
              <span className="text-[10px] sm:text-xs text-stone-500">
                {chapter.revelation_place === "makkah"
                  ? "Mekke Dönemi"
                  : "Medine Dönemi"}{" "}
                · İniş Sırası: {chapter.revelation_order}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 flex flex-wrap items-baseline gap-2 sm:gap-3">
              <span className="truncate">
                {chapter.translated_name.name} Sûresi
              </span>
              <span
                dir="rtl"
                className="font-arabic text-xl sm:text-2xl text-emerald-700"
              >
                {chapter.name_arabic}
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-3 sm:space-y-4 text-sm text-stone-700 leading-relaxed font-sans">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-center">
            <div>
              <span className="text-[9px] sm:text-[11px] text-stone-500 block">
                Âyet Sayısı
              </span>
              <span className="text-sm sm:text-base font-bold text-stone-900 font-mono">
                {chapter.verses_count}
              </span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[11px] text-stone-500 block">
                Mushaf Sayfası
              </span>
              <span className="text-sm sm:text-base font-bold text-stone-900 font-mono">
                {chapter.pages[0]} – {chapter.pages[1]}
              </span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[11px] text-stone-500 block">
                Nüzul Yeri
              </span>
              <span className="text-sm sm:text-base font-bold text-stone-900">
                {chapter.revelation_place === "makkah" ? "Mekkî" : "Medenî"}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 sm:mb-2">
              Sûre Hakkında Genel Bilgi
            </h4>
            {chapterInfo ? (
              <div
                className="space-y-2 text-stone-600 text-[11px] sm:text-xs sm:text-sm leading-relaxed prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: chapterInfo.text || chapterInfo.short_text,
                }}
              />
            ) : (
              <p className="text-[11px] sm:text-xs text-stone-500 italic">
                Bu sûre {chapter.verses_count} âyettir. Kur'an-ı Kerim'in{" "}
                {chapter.pages[0]}. sayfasında yer almaktadır.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] sm:text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
