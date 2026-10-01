import React, { useState, useEffect } from "react";
import { Chapter } from "../types/quran";
import {
  Search,
  MapPin,
  Compass,
  Book,
  X,
  Settings,
  Bookmark,
  BookOpen,
  Volume2,
} from "lucide-react";

interface SidebarProps {
  chapters: Chapter[];
  selectedChapterId: number;
  onSelectChapter: (chapterId: number) => void;
  isOpen: boolean;
  onClose: () => void;
  onJumpToPage: (page: number) => void;
  onJumpToJuz: (juz: number) => void;
  currentPage: number;
  currentJuz: number;
  /* Panel içi aksiyonlar */
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenBookmarks?: () => void;
  onSwitchToWordMode?: () => void;
  /** Sayfayı sesli dinle */
  onPlayPage?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chapters,
  selectedChapterId,
  onSelectChapter,
  isOpen,
  onClose,
  onJumpToPage,
  onJumpToJuz,
  currentPage,
  currentJuz,
  onOpenSearch,
  onOpenSettings,
  onOpenBookmarks,
  onSwitchToWordMode,
  onPlayPage,
}) => {
  const [activeTab, setActiveTab] = useState<"surahs" | "juz" | "pages">(
    "surahs",
  );
  const [filterText, setFilterText] = useState("");
  const [pageInput, setPageInput] = useState("");

  const filteredChapters = chapters.filter((c) => {
    const q = filterText.toLowerCase().trim();
    if (!q) return true;
    return (
      c.translated_name.name.toLowerCase().includes(q) ||
      c.name_simple.toLowerCase().includes(q) ||
      c.name_arabic.includes(q) ||
      String(c.id) === q
    );
  });

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (p >= 1 && p <= 604) {
      onJumpToPage(p);
      setPageInput("");
      onClose();
    }
  };

  return (
    <>
      {/* Arka plan: her platformda panel açıkken görünür */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Aside Container - her platformda açılan panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-full sm:w-80 md:w-[360px] lg:w-[380px] bg-white border-r border-stone-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 sm:p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold font-arabic text-base sm:text-lg shadow-sm">
              ق
            </div>
            <div>
              <h2 className="font-semibold text-stone-900 text-xs sm:text-sm">
                Kur'an-ı Kerim Fihristi
              </h2>
              <p className="text-[10px] sm:text-[11px] text-stone-500">
                114 Sûre · 30 Cüz · 604 Sayfa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 lg:hidden hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Sûreler, Cüzler, Sayfalar) */}
        <div className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1.5 sm:pb-2 grid grid-cols-3 gap-1 bg-stone-50/70 border-b border-stone-200">
          <button
            onClick={() => setActiveTab("surahs")}
            className={`py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "surahs"
                ? "bg-white text-emerald-700 shadow-sm font-semibold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Book className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Sûreler
          </button>
          <button
            onClick={() => setActiveTab("juz")}
            className={`py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "juz"
                ? "bg-white text-emerald-700 shadow-sm font-semibold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Cüzler
          </button>
          <button
            onClick={() => setActiveTab("pages")}
            className={`py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-1.5 ${
              activeTab === "pages"
                ? "bg-white text-emerald-700 shadow-sm font-semibold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Sayfalar
          </button>
        </div>

        {/* Tab 1: Sûreler List & Filter */}
        {activeTab === "surahs" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Input for Sûre */}
            <div className="p-2 sm:p-3 border-b border-stone-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Sûre adı veya numarası ara..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-stone-900 placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* Scrollable list of chapters */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-1 sm:p-1.5">
              {filteredChapters.map((ch) => {
                const isCurrent = ch.id === selectedChapterId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onSelectChapter(ch.id);
                      onClose();
                    }}
                    className={`w-full text-left p-2 sm:p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      isCurrent
                        ? "bg-emerald-50 text-emerald-900 font-medium"
                        : "hover:bg-stone-100/80 text-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-semibold font-mono ${
                          isCurrent
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-stone-100 text-stone-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                        }`}
                      >
                        {ch.id}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] sm:text-xs font-semibold text-stone-900 truncate">
                          {ch.translated_name.name}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-stone-500">
                          {ch.verses_count} Âyet ·{" "}
                          {ch.revelation_place === "makkah"
                            ? "Mekkî"
                            : "Medenî"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-arabic text-sm sm:text-base font-bold text-stone-700 block">
                        {ch.name_arabic}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-stone-600">
                        {ch.pages[0]}. sf
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredChapters.length === 0 && (
                <div className="p-4 sm:p-6 text-center text-[11px] sm:text-xs text-stone-500">
                  Aramanızla eşleşen sûre bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Cüzler (1 - 30) */}
        {activeTab === "juz" && (
          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-stone-500 mb-2 sm:mb-3 px-1">
              Okumak istediğiniz cüzü seçin (Toplam 30 Cüz):
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {Array.from({ length: 30 }, (_, idx) => idx + 1).map((juzNum) => {
                const isSelected = currentJuz === juzNum;
                return (
                  <button
                    key={juzNum}
                    onClick={() => {
                      onJumpToJuz(juzNum);
                      onClose();
                    }}
                    className={`p-2 sm:p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-stone-200 hover:border-emerald-400 hover:bg-stone-50 text-stone-800"
                    }`}
                  >
                    <span className="text-[10px] sm:text-xs font-bold">
                      {juzNum}. Cüz
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-stone-600 mt-0.5 sm:mt-1">
                      Sayfa {juzNum === 1 ? 1 : (juzNum - 1) * 20 + 2} -{" "}
                      {juzNum * 20 + 1 > 604 ? 604 : juzNum * 20 + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Sayfalar (1 - 604) */}
        {activeTab === "pages" && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col">
            <form onSubmit={handlePageJumpSubmit} className="mb-3 sm:mb-4">
              <label className="block text-[10px] sm:text-xs font-medium text-stone-700 mb-1 sm:mb-1.5">
                Sayfa Numarasına Git (1 – 604):
              </label>
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="number"
                  min={1}
                  max={604}
                  placeholder={`Mevcut: ${currentPage}`}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                />
                <button
                  type="submit"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] sm:text-xs font-semibold shadow-sm transition-colors"
                >
                  Aç
                </button>
              </div>
            </form>

            <div className="text-[10px] sm:text-xs font-medium text-stone-500 mb-1.5 sm:mb-2">
              Hızlı Sayfa Atlama:
            </div>
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 max-h-72 overflow-y-auto p-1 border border-stone-100 rounded-xl">
              {[
                1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 249, 282, 332,
                404, 500, 562, 595, 604,
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    onJumpToPage(p);
                    onClose();
                  }}
                  className={`py-1 sm:py-1.5 px-1 sm:px-2 text-[10px] sm:text-xs rounded-lg font-mono text-center transition-colors ${
                    currentPage === p
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-stone-700"
                  }`}
                >
                  sf {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alt aksiyon çubuğu: arama, yer imleri, ayarlar, mod değişimi */}
        <div className="p-2 sm:p-3 border-t border-stone-200 bg-stone-50/70 grid grid-cols-5 gap-1 sm:gap-1.5">
          {onPlayPage && (
            <button
              onClick={() => {
                onPlayPage();
                onClose();
              }}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium text-stone-600 hover:bg-white hover:text-emerald-700 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
              <span>Dinle</span>
            </button>
          )}
          {onOpenSearch && (
            <button
              onClick={() => {
                onOpenSearch();
                onClose();
              }}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium text-stone-600 hover:bg-white hover:text-emerald-700 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Arama</span>
            </button>
          )}
          {onOpenBookmarks && (
            <button
              onClick={() => {
                onOpenBookmarks();
                onClose();
              }}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium text-stone-600 hover:bg-white hover:text-emerald-700 transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              <span>Yer İmleri</span>
            </button>
          )}
          {onSwitchToWordMode && (
            <button
              onClick={() => {
                onSwitchToWordMode();
                onClose();
              }}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium text-stone-600 hover:bg-white hover:text-emerald-700 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Kelime Meali</span>
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium text-stone-600 hover:bg-white hover:text-emerald-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Ayarlar</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
