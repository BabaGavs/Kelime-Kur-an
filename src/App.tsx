import React, { useState, useEffect, useRef } from "react";
import {
  getChapters,
  getVersesByChapter,
  getVersesByPage,
  getVersesByJuz,
  getChapterInfo,
  getVerseAudioUrl,
  getWordAudioUrl,
} from "./services/quranApi";
import {
  Chapter,
  Verse,
  Word,
  AppSettings,
  Bookmark,
  ChapterInfo,
} from "./types/quran";
import chaptersLocal from "./data/chapters.json";
import { VerseCard } from "./components/VerseCard";
import { MushafView } from "./components/MushafView";
import { Sidebar } from "./components/Sidebar";
import { SearchModal } from "./components/SearchModal";
import { SettingsModal } from "./components/SettingsModal";
import { BookmarksModal } from "./components/BookmarksModal";
import { ChapterDetailModal } from "./components/ChapterDetailModal";
import { WordDrawer } from "./components/WordDrawer";
import {
  Menu,
  Search,
  Settings,
  Bookmark as BookmarkIcon,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
} from "lucide-react";

const DEFAULT_SETTINGS: AppSettings = {
  // Uygulama doğrudan sade Mushaf ekranıyla açılır
  displayMode: "mushaf",
  theme: "sepia",
  arabicFont: "amiri",
  fontSizeMultiplier: 1.0,
  translationSource: 77, // Diyanet
  alwaysShowWordMeaning: false,
  autoPlayWordAudio: false,
};

export default function App() {
  // Tüm platformlarda sade Mushaf görünümü: ekranın tamamı Kur'an,
  // hiçbir panel görünmez; sayfaya dokununca menü açılır.

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
      const saved = localStorage.getItem("quran_app_settings");
      return saved
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
        : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem("quran_app_bookmarks");
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
  const [activePlayingWordId, setActivePlayingWordId] = useState<number | null>(
    null,
  );
  const [activePlayingVerseKey, setActivePlayingVerseKey] = useState<
    string | null
  >(null);

  const [showScrollTop, setShowScrollTop] = useState(false);

  // Audio elements ref
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const verseAudioRef = useRef<HTMLAudioElement | null>(null);

  // Save Settings & Theme Class
  useEffect(() => {
    try {
      localStorage.setItem("quran_app_settings", JSON.stringify(settings));
    } catch (e) {}

    const root = document.documentElement;
    if (settings.theme === "sepia") {
      root.setAttribute("data-theme", "sepia");
    } else {
      root.removeAttribute("data-theme");
    }
  }, [settings]);

  // Dikey kaydırmayı kilitle: Kur'an sayfası tek ekrana sığar
  useEffect(() => {
    const lock = settings.displayMode === "mushaf";
    document.body.classList.toggle("mushaf-fit-lock", lock);
    return () => document.body.classList.remove("mushaf-fit-lock");
  }, [settings.displayMode]);

  // Save Bookmarks
  useEffect(() => {
    try {
      localStorage.setItem("quran_app_bookmarks", JSON.stringify(bookmarks));
    } catch (e) {}
  }, [bookmarks]);

  // Load initial chapters list
  useEffect(() => {
    async function initChapters() {
      try {
        const data = await getChapters();
        setChapters(data);
      } catch (err) {
        console.error("Failed to load chapters:", err);
        // Yerel yedek veriye düş
        setChapters((chaptersLocal as any).chapters || []);
      }
    }
    initChapters();
  }, []);

  // Load verses when chapter or page changes (Word-by-word mode or Page mode)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (settings.displayMode === "mushaf") {
          // Load verses for specific Mushaf page
          const pageData = await getVersesByPage(mushafPageNumber);
          setVerses(pageData.verses);
          if (pageData.verses.length > 0) {
            const firstChId = parseInt(
              pageData.verses[0].verse_key.split(":")[0],
              10,
            );
            setSelectedChapterId(firstChId);
            setCurrentJuz(pageData.verses[0].juz_number);
          }
        } else {
          // Load verses by chapter
          const res = await getVersesByChapter(
            selectedChapterId,
            currentPage,
            50,
          );
          setVerses(res.verses);
          setTotalPages(res.totalPages);
          setTotalVerses(res.totalVerses);

          if (res.verses.length > 0) {
            setCurrentJuz(res.verses[0].juz_number);
            setMushafPageNumber(res.verses[0].page_number);
          }

          // Fetch chapter intro / info
          getChapterInfo(selectedChapterId).then((info) =>
            setChapterInfo(info),
          );
        }
      } catch (err) {
        console.error("Failed to load verses:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedChapterId, currentPage, settings.displayMode, mushafPageNumber]);

  // Scroll listener for"Scroll to top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

    audio.play().catch((e) => console.warn("Word audio play error", e));
    audio.onended = () => setActivePlayingWordId(null);
    audio.onerror = () => setActivePlayingWordId(null);
  };

  const handlePlayVerseAudio = (verse: Verse) => {
    const parts = verse.verse_key.split(":");
    const ch = parseInt(parts[0], 10);
    const v = parseInt(parts[1], 10);

    if (activePlayingVerseKey === verse.verse_key && verseAudioRef.current) {
      if (!verseAudioRef.current.paused) {
        verseAudioRef.current.pause();
        setActivePlayingVerseKey(null);
        return;
      } else {
        verseAudioRef.current
          .play()
          .catch((e) => console.warn("Verse audio play error", e));
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

    audio.play().catch((e) => console.warn("Verse audio play error", e));
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
        .filter((w) => w.char_type_name === "word")
        .map((w) => w.text_uthmani || w.text)
        .join("");
      const turkishText =
        verse.translations?.find((t) => t.resource_id === 77)?.text ||
        verse.translations?.[0]?.text ||
        "";

      const newBm: Bookmark = {
        id: `${verse.verse_key}-${Date.now()}`,
        verseKey: verse.verse_key,
        chapterId: selectedChapterId,
        chapterName:
          chObj?.translated_name.name || `${selectedChapterId}. Sûre`,
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

    // Mushaf modunda içerik sayfa numarasına bağlıdır; seçilen sûrenin
    // başlangıç sayfasına atlanmalı, aksi halde aynı sayfa tekrar yüklenir.
    if (settings.displayMode === "mushaf") {
      const target = chapters.find((c) => c.id === chId);
      if (target?.pages?.[0]) {
        setMushafPageNumber(target.pages[0]);
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJumpToPage = (pgNum: number) => {
    setMushafPageNumber(pgNum);
    setSelectedWord(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJumpToJuz = (juzNum: number) => {
    setCurrentJuz(juzNum);
    const approxPage = juzNum === 1 ? 1 : (juzNum - 1) * 20 + 2;
    handleJumpToPage(approxPage);
  };

  const handleNavigateToVerse = (chId: number, verseNum: number) => {
    setSelectedChapterId(chId);
    setCurrentPage(1);
    setIsSearchOpen(false);
    setIsBookmarksOpen(false);

    // Wait for verses to load and render before scrolling
    setTimeout(() => {
      const el = document.getElementById(`verse-${chId}-${verseNum}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-emerald-500", "bg-emerald-50/40");
        setTimeout(
          () =>
            el.classList.remove(
              "ring-2",
              "ring-emerald-500",
              "bg-emerald-50/40",
            ),
          3000,
        );
      }
    }, 800);
  };

  const currentChapter = chapters.find((c) => c.id === selectedChapterId) || {
    id: 1,
    name_simple: "Al-Fatihah",
    name_complex: "Al-Fātiĥah",
    name_arabic: "الفاتحة",
    verses_count: 6,
    pages: [1, 1],
    revelation_place: "makkah",
    revelation_order: 5,
    // Besmele ayet değildir, başlıkta gösterilir
    bismillah_pre: true,
    translated_name: { language_name: "turkish", name: "Fâtiha" },
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-stone-50 text-stone-900 transition-colors">
      {/* Top Navbar - tüm platformlarda gizli (sade Mushaf görünümü) */}
      <header className="hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile Menu & Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors lg:hidden"
              aria-label="Sûre Menüsünü Aç"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => handleSelectChapter(1)}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center font-bold font-arabic text-lg sm:text-xl shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform">
                قرآن
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-stone-900 text-sm sm:text-base leading-tight">
                  Kur'an-ı Kerim
                </h1>
                <p className="text-[11px] font-medium text-emerald-700">
                  Kelime Mealli & Tefsirli
                </p>
              </div>
            </div>
          </div>

          {/* Center: Search trigger bar */}
          <div className="flex-1 max-w-md mx-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs rounded-xl border border-stone-200 bg-stone-100/80 hover:bg-stone-100 hover:border-emerald-500 text-stone-500 transition-all shadow-inner"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Kelime, meal veya sûre ara...</span>
              </span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-white border border-stone-300 rounded font-mono text-stone-500">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Action Icons: Mode Toggle, Bookmarks, Settings */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* View Mode Toggle: Word-by-Word vs Mushaf */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-stone-100 border border-stone-200 text-xs font-semibold">
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, displayMode: "word-by-word" }))
                }
                className={`px-2 sm:px-3 py-1.5 rounded-lg transition-all ${
                  settings.displayMode === "word-by-word"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Kelime Meali
              </button>
              <button
                onClick={() =>
                  setSettings((s) => ({ ...s, displayMode: "mushaf" }))
                }
                className={`px-2 sm:px-3 py-1.5 rounded-lg transition-all ${
                  settings.displayMode === "mushaf"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                Mushaf
              </button>
            </div>

            {/* Bookmarks button */}
            <button
              onClick={() => setIsBookmarksOpen(true)}
              className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-transparent hover:border-stone-200 relative transition-colors"
              title="Kayıtlı Yer İmlerim"
            >
              <BookmarkIcon className="w-5 h-5" />
              {bookmarks.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white" />
              )}
            </button>

            {/* Settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 border border-transparent hover:border-stone-200 transition-colors"
              title="Okuma Ayarları (Yazı boyutu, hat, tema)"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex min-h-0">
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
          onOpenBookmarks={() => setIsBookmarksOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSwitchToWordMode={() =>
            setSettings((s) => ({ ...s, displayMode: "word-by-word" }))
          }
        />

        {/* Center Main Reader Content Area */}
        <main
          className={`relative flex-1 min-w-0 min-h-0 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 ${
            settings.displayMode === "mushaf"
              ? "overflow-hidden"
              : "overflow-y-auto"
          }`}
        >
          {/* Fihrist düğmesi - sol üstte, sayfa dokunuş alanının dışında */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Fihristi aç"
            title="Fihrist"
            className="absolute top-2 left-2 z-20 p-2 rounded-full text-stone-300 hover:text-emerald-700 hover:bg-stone-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Chapter Top Hero / Information Card */}
          {settings.displayMode !== "mushaf" && (
            <div className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 sm:-right-6 -bottom-8 sm:-bottom-10 font-arabic text-[80px] sm:text-[120px] font-bold text-white/5 select-none pointer-events-none">
                {currentChapter.name_arabic}
              </div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-200 text-[10px] sm:text-xs font-semibold tracking-wider uppercase border border-emerald-400/20">
                      {currentChapter.id}. SÛRE
                    </span>
                    <span className="text-[10px] sm:text-xs text-emerald-100/80">
                      {currentChapter.revelation_place === "makkah"
                        ? "Mekke Dönemi"
                        : "Medine Dönemi"}{" "}
                      ·{""}
                      {currentChapter.verses_count} Âyet · {currentJuz}. Cüz
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold flex flex-wrap items-baseline gap-2 sm:gap-3">
                    <span className="truncate">
                      {currentChapter.translated_name.name} Sûresi
                    </span>
                    <span className="font-arabic text-2xl sm:text-3xl font-normal text-emerald-200">
                      سُورَةُ {currentChapter.name_arabic}
                    </span>
                  </h2>

                  <p className="text-[11px] sm:text-xs lg:text-sm text-emerald-100/90 mt-1 max-w-xl line-clamp-2">
                    {chapterInfo?.short_text ||
                      `${currentChapter.translated_name.name} sûresi, Kur'an-ı Kerim'in ${currentChapter.pages[0]}. sayfasında yer almaktadır.`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() =>
                      setSettings((s) => ({ ...s, displayMode: "mushaf" }))
                    }
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all shadow-sm"
                  >
                    Mushaf
                  </button>

                  <button
                    onClick={() => setIsInfoOpen(true)}
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm border border-white/20 transition-all shadow-sm"
                  >
                    <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Sûre Detayları</span>
                  </button>
                </div>
              </div>

              {/* Besmele: Fâtiha dahil tüm sûrelerde başlıkta gösterilir (ayet değildir) */}
              {currentChapter.bismillah_pre && (
                <div
                  dir="rtl"
                  className="font-arabic text-xl sm:text-2xl lg:text-3xl font-bold text-center mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-emerald-600/60 text-emerald-50"
                >
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </div>
              )}
            </div>
          )}

          {/* Mobile View Toggle */}
          <div className="flex sm:hidden justify-end">
            <button
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  displayMode:
                    s.displayMode === "mushaf" ? "word-by-word" : "mushaf",
                }))
              }
              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-[11px]"
            >
              {settings.displayMode === "mushaf" ? "Kelime Meali" : "Mushaf"}
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
          ) : settings.displayMode === "mushaf" ? (
            /* Mode 1: Traditional Quran Mushaf Page by Page */
            <MushafView
              pageNumber={mushafPageNumber}
              verses={verses}
              chapters={chapters}
              settings={settings}
              onPageChange={handleJumpToPage}
              onSpeakWord={handlePlayWordAudio}
              activePlayingWordId={activePlayingWordId}
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
                  isBookmarked={bookmarks.some(
                    (b) => b.verseKey === verse.verse_key,
                  )}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}

              {/* Pagination Controls for Chapters with >50 verses */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white border border-stone-200 text-xs">
                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage <= 1}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-stone-200 disabled:opacity-40 font-semibold flex items-center gap-1 sm:gap-1.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Önceki 50 Âyet</span>
                    <span className="sm:hidden">Önceki</span>
                  </button>

                  <span className="font-mono text-stone-500 text-[10px] sm:text-xs text-center">
                    Sayfa {currentPage} / {totalPages} (Toplam {totalVerses}{" "}
                    Âyet)
                  </span>

                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-40 font-semibold flex items-center gap-1 sm:gap-1.5 shadow-sm"
                  >
                    <span className="hidden sm:inline">Sonraki 50 Âyet</span>
                    <span className="sm:hidden">Sonraki</span>
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Surah Next / Prev Quick Switcher */}
          {settings.displayMode !== "mushaf" && (
            <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-stone-200 gap-2">
              <button
                onClick={() => handleSelectChapter(selectedChapterId - 1)}
                disabled={selectedChapterId <= 1}
                className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-2 transition-colors min-w-0"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">
                  Önceki Sûre (
                  {selectedChapterId > 1
                    ? chapters[selectedChapterId - 2]?.translated_name.name
                    : ""}
                  )
                </span>
              </button>

              <button
                onClick={() => handleSelectChapter(selectedChapterId + 1)}
                disabled={selectedChapterId >= 114}
                className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 disabled:pointer-events-none text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-2 shadow-sm transition-colors min-w-0"
              >
                <span className="truncate">
                  Sonraki Sûre (
                  {selectedChapterId < 114
                    ? chapters[selectedChapterId]?.translated_name.name
                    : ""}
                  )
                </span>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Floating Scroll to Top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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
        onUpdateSettings={(newVals) =>
          setSettings((s) => ({ ...s, ...newVals }))
        }
      />

      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={(id) =>
          setBookmarks((bms) => bms.filter((b) => b.id !== id))
        }
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
