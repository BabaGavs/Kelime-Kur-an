import React, { useState, useEffect, useRef } from 'react';
import {
  getChapters,
  getVersesByChapter,
  getVersesByPage,
  getVersesByJuz,
  getChapterInfo,
  getVerseAudioUrl,
  getWordAudioUrl,
} from './services/quranApi';
import { Chapter, Verse, Word, AppSettings, Bookmark, ChapterInfo } from './types/quran';
import { VerseCard } from './components/VerseCard';
import { MushafView } from './components/MushafView';
import { Sidebar } from './components/Sidebar';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { BookmarksModal } from './components/BookmarksModal';
import { ChapterDetailModal } from './components/ChapterDetailModal';
import { WordDrawer } from './components/WordDrawer';
import {
  Menu,
  Search,
  Settings,
  Bookmark as BookmarkIcon,
  Sun,
  Moon,
  Coffee,
  Info,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Volume2,
  VolumeX,
  Share2,
  ArrowUp,
  Layers,
  Sparkles,
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'word-by-word',
  theme: 'light',
  arabicFont: 'amiri',
  fontSizeMultiplier: 1.0,
  translationSource: 77, // Diyanet
  alwaysShowWordMeaning: false,
  autoPlayWordAudio: false,
};

export default function App() {
  // Navigation & Data State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalVerses, setTotalVerses] = useState<number>(7);
  const [currentJuz, setCurrentJuz] = useState<number>(1);
  const [mushafPageNumber, setMushafPageNumber] = useState<number>(1);
  const [chapterInfo, setChapterInfo] = useState<ChapterInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Settings & Bookmarks
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('quran_app_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem('quran_app_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // UI Modal States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Selected Word & Audio State
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [activePlayingWordId, setActivePlayingWordId] = useState<number | null>(null);
  const [activePlayingVerseKey, setActivePlayingVerseKey] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Audio elements ref
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const verseAudioRef = useRef<HTMLAudioElement | null>(null);

  // Save Settings & Theme Class
  useEffect(() => {
    try {
      localStorage.setItem('quran_app_settings', JSON.stringify(settings));
    } catch (e) {}

    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.removeAttribute('data-theme');
    } else if (settings.theme === 'sepia') {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'sepia');
    } else {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
    }
  }, [settings]);

  // Save Bookmarks
  useEffect(() => {
    try {
      localStorage.setItem('quran_app_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {}
  }, [bookmarks]);

  // Load initial chapters list
  useEffect(() => {
    async function initChapters() {
      try {
        const data = await getChapters();
        setChapters(data);
      } catch (err) {
        console.error('Failed to load chapters:', err);
      }
    }
    initChapters();
  }, []);

  // Load verses when chapter or page changes (Word-by-word mode or Page mode)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (settings.displayMode === 'mushaf') {
          // Load verses for specific Mushaf page
          const pageData = await getVersesByPage(mushafPageNumber);
          setVerses(pageData.verses);
          if (pageData.verses.length > 0) {
            const firstChId = parseInt(pageData.verses[0].verse_key.split(':')[0], 10);
            setSelectedChapterId(firstChId);
            setCurrentJuz(pageData.verses[0].juz_number);
          }
        } else {
          // Load verses by chapter
          const res = await getVersesByChapter(selectedChapterId, currentPage, 50);
          setVerses(res.verses);
          setTotalPages(res.totalPages);
          setTotalVerses(res.totalVerses);

          if (res.verses.length > 0) {
            setCurrentJuz(res.verses[0].juz_number);
            setMushafPageNumber(res.verses[0].page_number);
          }

          // Fetch chapter intro / info
          getChapterInfo(selectedChapterId).then((info) => setChapterInfo(info));
        }
      } catch (err) {
        console.error('Failed to load verses:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedChapterId, currentPage, settings.displayMode, mushafPageNumber]);

  // Scroll listener for "Scroll to top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Audio Play Handlers
  const handlePlayWordAudio = (word: Word) => {
    if (!word.audio_url) return;
    const url = getWordAudioUrl(word.audio_url);
    if (!url) return;

    if (wordAudioRef.current) {
      wordAudioRef.current.pause();
    }

    const audio = new Audio(url);
    wordAudioRef.current = audio;
    setActivePlayingWordId(word.id);

    audio.play().catch((e) => console.warn('Word audio play error', e));
    audio.onended = () => setActivePlayingWordId(null);
    audio.onerror = () => setActivePlayingWordId(null);
  };

  const handlePlayVerseAudio = (verse: Verse) => {
    const parts = verse.verse_key.split(':');
    const ch = parseInt(parts[0], 10);
    const v = parseInt(parts[1], 10);

    if (activePlayingVerseKey === verse.verse_key && verseAudioRef.current) {
      if (!verseAudioRef.current.paused) {
        verseAudioRef.current.pause();
        setActivePlayingVerseKey(null);
        return;
      }
    }

    if (verseAudioRef.current) {
      verseAudioRef.current.pause();
    }

    const url = getVerseAudioUrl(ch, v);
    const audio = new Audio(url);
    verseAudioRef.current = audio;
    setActivePlayingVerseKey(verse.verse_key);

    audio.play().catch((e) => console.warn('Verse audio play error', e));
    audio.onended = () => setActivePlayingVerseKey(null);
    audio.onerror = () => setActivePlayingVerseKey(null);
  };

  // Word selection for drawer
  const handleSelectWord = (word: Word, verse: Verse) => {
    setSelectedWord(word);
    setSelectedVerse(verse);
    if (settings.autoPlayWordAudio && word.audio_url) {
      handlePlayWordAudio(word);
    }
  };

  // Bookmark Toggle
  const handleToggleBookmark = (verse: Verse) => {
    const chObj = chapters.find((c) => c.id === selectedChapterId);
    const existing = bookmarks.find((b) => b.verseKey === verse.verse_key);

    if (existing) {
      setBookmarks(bookmarks.filter((b) => b.verseKey !== verse.verse_key));
    } else {
      const arabicText = verse.words
        .filter((w) => w.char_type_name === 'word')
        .map((w) => w.text_uthmani || w.text)
        .join(' ');
      const turkishText =
        verse.translations?.find((t) => t.resource_id === 77)?.text ||
        verse.translations?.[0]?.text ||
        '';

      const newBm: Bookmark = {
        id: `${verse.verse_key}-${Date.now()}`,
        verseKey: verse.verse_key,
        chapterId: selectedChapterId,
        chapterName: chObj?.translated_name.name || `${selectedChapterId}. Sûre`,
        verseNumber: verse.verse_number,
        snippetArabic: arabicText,
        snippetTurkish: turkishText,
        timestamp: Date.now(),
      };
      setBookmarks([newBm, ...bookmarks]);
    }
  };

  // Navigation callbacks
  const handleSelectChapter = (chId: number) => {
    setSelectedChapterId(chId);
    setCurrentPage(1);
    setSelectedWord(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToPage = (pgNum: number) => {
    setMushafPageNumber(pgNum);
    setSelectedWord(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToJuz = (juzNum: number) => {
    setCurrentJuz(juzNum);
    const approxPage = (juzNum - 1) * 20 + 2 === 2 ? 1 : (juzNum - 1) * 20 + 2;
    handleJumpToPage(approxPage);
  };

  const handleNavigateToVerse = (chId: number, verseNum: number) => {
    setSelectedChapterId(chId);
    setCurrentPage(1);
    setIsSearchOpen(false);
    setIsBookmarksOpen(false);

    setTimeout(() => {
      const el = document.getElementById(`verse-${chId}-${verseNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50/40');
        setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-50/40'), 3000);
      }
    }, 600);
  };

  const currentChapter = chapters.find((c) => c.id === selectedChapterId) || {
    id: 1,
    name_simple: 'Al-Fatihah',
    name_complex: 'Al-Fātiĥah',
    name_arabic: 'الفاتحة',
    verses_count: 7,
    pages: [1, 1],
    revelation_place: 'makkah',
    revelation_order: 5,
    bismillah_pre: false,
    translated_name: { language_name: 'turkish', name: 'Fâtiha' },
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile Menu & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors lg:hidden"
              aria-label="Sûre Menüsünü Aç"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => handleSelectChapter(1)}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center font-bold font-arabic text-xl shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform">
                قرآن
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base leading-tight">
                  Kur'an-ı Kerim
                </h1>
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  Kelime Mealli & Tefsirli
                </p>
              </div>
            </div>
          </div>

          {/* Center: Search trigger bar */}
          <div className="flex-1 max-w-md mx-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100/80 dark:bg-stone-800/80 hover:bg-stone-100 hover:border-emerald-500 text-stone-500 dark:text-stone-400 transition-all shadow-inner"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Kelime, meal veya sûre ara...</span>
              </span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded font-mono text-stone-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Action Icons: Mode Toggle, Bookmarks, Settings */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* View Mode Toggle: Word-by-Word vs Mushaf */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold">
              <button
                onClick={() => setSettings((s) => ({ ...s, displayMode: 'word-by-word' }))}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  settings.displayMode === 'word-by-word'
                    ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Kelime Meali
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, displayMode: 'mushaf' }))}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  settings.displayMode === 'mushaf'
                    ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Mushaf
              </button>
            </div>

            {/* Bookmarks button */}
            <button
              onClick={() => setIsBookmarksOpen(true)}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-transparent hover:border-stone-200 relative transition-colors"
              title="Kayıtlı Yer İmlerim"
            >
              <BookmarkIcon className="w-5 h-5" />
              {bookmarks.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white dark:ring-stone-900" />
              )}
            </button>

            {/* Settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-transparent hover:border-stone-200 transition-colors"
              title="Okuma Ayarları (Yazı boyutu, hat, tema)"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Left Sidebar (Surahs, Juzs, Pages) */}
        <Sidebar
          chapters={chapters}
          selectedChapterId={selectedChapterId}
          onSelectChapter={handleSelectChapter}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onJumpToPage={handleJumpToPage}
          onJumpToJuz={handleJumpToJuz}
          currentPage={mushafPageNumber}
          currentJuz={currentJuz}
        />

        {/* Center Main Reader Content Area */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 space-y-6">
          {/* Chapter Top Hero / Information Card */}
          {settings.displayMode !== 'mushaf' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -bottom-10 font-arabic text-[120px] font-bold text-white/5 select-none pointer-events-none">
                {currentChapter.name_arabic}
              </div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-200 text-xs font-semibold tracking-wider uppercase border border-emerald-400/20">
                      {currentChapter.id}. SÛRE
                    </span>
                    <span className="text-xs text-emerald-100/80">
                      {currentChapter.revelation_place === 'makkah' ? 'Mekke Dönemi' : 'Medine Dönemi'} ·{' '}
                      {currentChapter.verses_count} Âyet · {currentJuz}. Cüz
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold flex items-baseline gap-3">
                    <span>{currentChapter.translated_name.name} Sûresi</span>
                    <span className="font-arabic text-3xl font-normal text-emerald-200">
                      سُورَةُ {currentChapter.name_arabic}
                    </span>
                  </h2>

                  <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl line-clamp-2">
                    {chapterInfo?.short_text || `${currentChapter.translated_name.name} sûresi, Kur'an-ı Kerim'in ${currentChapter.pages[0]}. sayfasında yer almaktadır.`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsInfoOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm border border-white/20 transition-all shadow-sm"
                  >
                    <Info className="w-4 h-4" />
                    <span>Sûre Detayları</span>
                  </button>
                </div>
              </div>

              {/* Bismillah Banner for non-Fatiha & non-Tawbah */}
              {currentChapter.bismillah_pre && (
                <div
                  dir="rtl"
                  className="font-arabic text-2xl sm:text-3xl font-bold text-center mt-6 pt-6 border-t border-emerald-600/60 text-emerald-50"
                >
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </div>
              )}
            </div>
          )}

          {/* Quick Notice Tip */}
          <div className="p-3.5 px-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>İpucu:</strong> Arapça kelimelerin üzerine farenizi getirerek veya dokunarak{' '}
                <strong>bağlamsal Türkçe kelime manasını</strong> görebilir, ses telaffuzunu
                dinleyebilirsiniz.
              </span>
            </span>

            {/* Mobile View Toggle */}
            <button
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  displayMode: s.displayMode === 'mushaf' ? 'word-by-word' : 'mushaf',
                }))
              }
              className="sm:hidden px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-[11px]"
            >
              {settings.displayMode === 'mushaf' ? 'Kelime Meali' : 'Mushaf'}
            </button>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-stone-500">
                Âyetler ve Türkçe kelime manaları yükleniyor...
              </p>
            </div>
          ) : settings.displayMode === 'mushaf' ? (
            /* Mode 1: Traditional Quran Mushaf Page by Page */
            <MushafView
              pageNumber={mushafPageNumber}
              verses={verses}
              chapters={chapters}
              settings={settings}
              onPageChange={handleJumpToPage}
              onSelectWord={handleSelectWord}
              selectedWordId={selectedWord?.id}
              activePlayingWordId={activePlayingWordId}
              onPlayWordAudio={handlePlayWordAudio}
            />
          ) : (
            /* Mode 2: Word-by-Word Verse Cards */
            <div className="space-y-4">
              {verses.map((verse) => (
                <VerseCard
                  key={verse.id}
                  verse={verse}
                  chapter={currentChapter}
                  settings={settings}
                  isPlaying={activePlayingVerseKey === verse.verse_key}
                  activePlayingWordId={activePlayingWordId}
                  onPlayVerseAudio={handlePlayVerseAudio}
                  onPlayWordAudio={handlePlayWordAudio}
                  onSelectWord={handleSelectWord}
                  selectedWordId={selectedWord?.id}
                  isBookmarked={bookmarks.some((b) => b.verseKey === verse.verse_key)}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}

              {/* Pagination Controls for Chapters with >50 verses */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs">
                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage <= 1}
                    className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 disabled:opacity-40 font-semibold flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Önceki 50 Âyet</span>
                  </button>

                  <span className="font-mono text-stone-500">
                    Sayfa {currentPage} / {totalPages} (Toplam {totalVerses} Âyet)
                  </span>

                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-40 font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Sonraki 50 Âyet</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Surah Next / Prev Quick Switcher */}
          {settings.displayMode !== 'mushaf' && (
            <div className="flex items-center justify-between pt-6 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={() => handleSelectChapter(selectedChapterId - 1)}
                disabled={selectedChapterId <= 1}
                className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Önceki Sûre ({selectedChapterId > 1 ? chapters[selectedChapterId - 2]?.translated_name.name : ''})</span>
              </button>

              <button
                onClick={() => handleSelectChapter(selectedChapterId + 1)}
                disabled={selectedChapterId >= 114}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Sonraki Sûre ({selectedChapterId < 114 ? chapters[selectedChapterId]?.translated_name.name : ''})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl hover:scale-105 transition-all"
          title="Yukarı Çık"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Word Drawer / Bottom Bar for Selected Word */}
      <WordDrawer
        word={selectedWord}
        verse={selectedVerse}
        chapter={currentChapter}
        onClose={() => setSelectedWord(null)}
        onPlayWordAudio={handlePlayWordAudio}
        onPlayVerseAudio={handlePlayVerseAudio}
        isPlayingWord={activePlayingWordId === selectedWord?.id}
      />

      {/* Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        chapters={chapters}
        onNavigateToVerse={handleNavigateToVerse}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings((s) => ({ ...s, ...newVals }))}
      />

      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={(id) => setBookmarks((bms) => bms.filter((b) => b.id !== id))}
        onNavigateToBookmark={handleNavigateToVerse}
      />

      <ChapterDetailModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        chapter={currentChapter}
        chapterInfo={chapterInfo}
      />
    </div>
  );
}
