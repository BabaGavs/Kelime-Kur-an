import React, { useState } from "react";
import { Chapter } from "../types/quran";
import { Search, Compass, Book, X, Settings, Bookmark } from "lucide-react";

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
  /** Panel teması: Mushaf modunda Madani, Kelime Meali modunda teal */
  theme: "mushaf" | "word";
  /* Panel içi aksiyonlar */
  onOpenSettings?: () => void;
  onOpenBookmarks?: () => void;
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
  theme,
  onOpenSettings,
  onOpenBookmarks,
}) => {
  const [activeTab, setActiveTab] = useState<"surahs" | "juz">("surahs");
  const [filterText, setFilterText] = useState("");

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

  // Arama kutusuna sayfa numarası yazılıp Enter'a basılınca o sayfaya gidilir
  const isPageQuery = /^\d+$/.test(filterText.trim());
  const pageQueryNum = parseInt(filterText.trim(), 10);
  const pageQueryValid =
    isPageQuery && pageQueryNum >= 1 && pageQueryNum <= 604;

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageQueryValid) return;
    onJumpToPage(pageQueryNum);
    setFilterText("");
    onClose();
  };

  return (
    <>
      {/* Arka plan: panel açıkken görünür */}
      {isOpen && (
        <div
          className={`fihrist-overlay fihrist--${theme} fixed inset-0 z-40 transition-opacity`}
          onClick={onClose}
        />
      )}

      <aside
        className={`fihrist fihrist--${theme} fixed top-0 bottom-0 left-0 z-50 w-full sm:w-80 md:w-[360px] lg:w-[380px] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Başlık */}
        <div className="fi-header flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="fi-logo font-arabic">
              {theme === "mushaf" ? "ق" : "قرآن"}
            </div>
            <div>
              <h2 className="fi-title">Kur'an-ı Kerim Fihristi</h2>
              <p className="fi-subtitle">114 Sûre · 30 Cüz · 604 Sayfa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fihristi kapat"
            className="fi-icon-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sekmeler: Sûreler / Cüzler */}
        <div className="fi-tabs">
          <button
            onClick={() => setActiveTab("surahs")}
            aria-current={activeTab === "surahs"}
            className={`fi-tab ${activeTab === "surahs" ? "fi-tab--active" : ""}`}
          >
            <Book className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Sûreler
          </button>
          <button
            onClick={() => setActiveTab("juz")}
            aria-current={activeTab === "juz"}
            className={`fi-tab ${activeTab === "juz" ? "fi-tab--active" : ""}`}
          >
            <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Cüzler
          </button>
        </div>

        {/* Sekme 1: Sûreler listesi ve arama */}
        {activeTab === "surahs" && (
          <div className="flex-1 flex flex-col min-h-0">
            <form onSubmit={handleFilterSubmit} className="fi-search-form">
              <div className="relative">
                <Search className="fi-search-icon" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Sûre veya sayfa ara..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="fi-search-input"
                />
              </div>
              {pageQueryValid ? (
                <button type="submit" className="fi-goto-btn">
                  <span className="font-semibold">
                    {pageQueryNum}. sayfaya git
                  </span>
                  <span className="fi-goto-hint">Aç ↵</span>
                </button>
              ) : (
                <p className="fi-hint">
                  Sayfa numarası yazıp Enter'a basın (şu an {currentPage}.
                  sayfa)
                </p>
              )}
            </form>

            <div className="flex-1 overflow-y-auto p-1 sm:p-1.5 fi-list">
              {filteredChapters.map((ch) => {
                const isCurrent = ch.id === selectedChapterId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onSelectChapter(ch.id);
                      onClose();
                    }}
                    className={`fi-item ${isCurrent ? "fi-item--current" : ""}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span
                        className={`fi-num ${isCurrent ? "fi-num--current" : ""}`}
                      >
                        {ch.id}
                      </span>
                      <div className="min-w-0">
                        <div className="fi-item-title truncate">
                          {ch.translated_name.name}
                        </div>
                        <div className="fi-item-meta">
                          {ch.verses_count} Âyet ·{" "}
                          {ch.revelation_place === "makkah"
                            ? "Mekkî"
                            : "Medenî"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="fi-arabic block">{ch.name_arabic}</span>
                      <span className="fi-page-ref">{ch.pages[0]}. sf</span>
                    </div>
                  </button>
                );
              })}
              {filteredChapters.length === 0 && (
                <div className="p-4 sm:p-6 text-center text-[11px] sm:text-xs fi-hint">
                  Aramanızla eşleşen sûre bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sekme 2: Cüzler (1 - 30) */}
        {activeTab === "juz" && (
          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            <p className="fi-hint mb-2 sm:mb-3 px-1">
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
                    className={`fi-juz ${isSelected ? "fi-juz--active" : ""}`}
                  >
                    <span className="text-[10px] sm:text-xs font-bold">
                      {juzNum}. Cüz
                    </span>
                    <span className="fi-juz-range">
                      Sayfa {juzNum === 1 ? 1 : (juzNum - 1) * 20 + 2} -{" "}
                      {juzNum * 20 + 1 > 604 ? 604 : juzNum * 20 + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Alt aksiyon çubuğu: yer imleri, ayarlar */}
        <div className="fi-footer">
          {onOpenBookmarks && (
            <button
              onClick={() => {
                onOpenBookmarks();
                onClose();
              }}
              className="fi-foot-btn"
            >
              <Bookmark className="w-4 h-4" />
              <span>Yer İmleri</span>
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="fi-foot-btn"
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
