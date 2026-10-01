import React, { useState, useEffect } from 'react';
import { Chapter } from '../types/quran';
import { Search, MapPin, Compass, Book, X } from 'lucide-react';

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
}) => {
  const [activeTab, setActiveTab] = useState<'surahs' | 'juz' | 'pages'>('surahs');
  const [filterText, setFilterText] = useState('');
  const [pageInput, setPageInput] = useState('');

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
      setPageInput('');
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Aside Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold font-arabic text-lg shadow-sm">
              ق
            </div>
            <div>
              <h2 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                Kur'an-ı Kerim Fihristi
              </h2>
              <p className="text-[11px] text-stone-500">114 Sûre · 30 Cüz · 604 Sayfa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 lg:hidden hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Sûreler, Cüzler, Sayfalar) */}
        <div className="px-3 pt-3 pb-2 grid grid-cols-3 gap-1 bg-stone-50/70 dark:bg-stone-950/50 border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setActiveTab('surahs')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'surahs'
                ? 'bg-white dark:bg-stone-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Book className="w-3.5 h-3.5" />
            Sûreler
          </button>
          <button
            onClick={() => setActiveTab('juz')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'juz'
                ? 'bg-white dark:bg-stone-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Cüzler
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'pages'
                ? 'bg-white dark:bg-stone-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Sayfalar
          </button>
        </div>

        {/* Tab 1: Sûreler List & Filter */}
        {activeTab === 'surahs' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Input for Sûre */}
            <div className="p-3 border-b border-stone-100 dark:border-stone-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Sûre adı veya numarası ara..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* Scrollable list of chapters */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60 p-1.5">
              {filteredChapters.map((ch) => {
                const isCurrent = ch.id === selectedChapterId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      onSelectChapter(ch.id);
                      onClose();
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      isCurrent
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium'
                        : 'hover:bg-stone-100/80 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold font-mono ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/60 group-hover:text-emerald-700'
                        }`}
                      >
                        {ch.id}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {ch.translated_name.name}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {ch.verses_count} Âyet · {ch.revelation_place === 'makkah' ? 'Mekkî' : 'Medenî'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-arabic text-base font-bold text-stone-700 dark:text-stone-300 block">
                        {ch.name_arabic}
                      </span>
                      <span className="text-[10px] text-stone-600 dark:text-stone-400">
                        {ch.pages[0]}. sf
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredChapters.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-500">
                  Aramanızla eşleşen sûre bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Cüzler (1 - 30) */}
        {activeTab === 'juz' && (
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs text-stone-500 mb-3 px-1">
              Okumak istediğiniz cüzü seçin (Toplam 30 Cüz):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 30 }, (_, idx) => idx + 1).map((juzNum) => {
                const isSelected = currentJuz === juzNum;
                return (
                  <button
                    key={juzNum}
                    onClick={() => {
                      onJumpToJuz(juzNum);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'border-stone-200 dark:border-stone-800 hover:border-emerald-400 hover:bg-stone-50 dark:hover:bg-stone-800/70 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <span className="text-xs font-bold">{juzNum}. Cüz</span>
                    <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1">
                      Sayfa {(juzNum - 1) * 20 + 2 === 2 ? 1 : (juzNum - 1) * 20 + 2} - {juzNum * 20 + 1 > 604 ? 604 : juzNum * 20 + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Sayfalar (1 - 604) */}
        {activeTab === 'pages' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            <form onSubmit={handlePageJumpSubmit} className="mb-4">
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                Sayfa Numarasına Git (1 – 604):
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={604}
                  placeholder={`Mevcut: ${currentPage}`}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Aç
                </button>
              </div>
            </form>

            <div className="text-xs font-medium text-stone-500 mb-2">Hızlı Sayfa Atlama:</div>
            <div className="grid grid-cols-4 gap-1.5 max-h-72 overflow-y-auto p-1 border border-stone-100 dark:border-stone-800 rounded-xl">
              {[1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 249, 282, 332, 404, 500, 562, 595, 604].map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => {
                      onJumpToPage(p);
                      onClose();
                    }}
                    className={`py-1.5 px-2 text-xs rounded-lg font-mono text-center transition-colors ${
                      currentPage === p
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-stone-100 dark:bg-stone-800/80 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    sf {p}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
