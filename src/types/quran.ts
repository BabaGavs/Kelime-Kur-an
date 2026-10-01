export interface Chapter {
  id: number;
  revelation_place: "makkah" | "madinah";
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: [number, number];
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface WordTranslation {
  text: string;
  language_name: string;
}

export interface WordTransliteration {
  text: string | null;
  language_name: string;
}

export interface Word {
  id: number;
  position: number;
  audio_url: string | null;
  char_type_name: "word" | "end";
  text_uthmani: string;
  text?: string;
  translation?: WordTranslation;
  transliteration?: WordTransliteration;
  page_number?: number;
  line_number?: number;
}

export interface Translation {
  id: number;
  resource_id: number;
  text: string;
}

export interface Verse {
  id: number;
  verse_number: number;
  verse_key: string; // e.g."1:1"
  hizb_number?: number;
  rub_el_hizb_number?: number;
  ruku_number?: number;
  manzil_number?: number;
  sajdah_number?: number | null;
  page_number: number;
  juz_number: number;
  words: Word[];
  translations?: Translation[];
}

export interface ChapterInfo {
  id: number;
  chapter_id: number;
  language_name: string;
  short_text: string;
  source: string;
  text: string;
}

export type DisplayMode = "word-by-word" | "mushaf" | "translation";
export type AppTheme = "light" | "sepia";
export type ArabicFont = "amiri" | "scheherazade" | "system";
export type TranslationSource = 77 | 52 | "both"; // 77 = Diyanet, 52 = Elmalılı

export interface Bookmark {
  id: string;
  verseKey: string;
  chapterId: number;
  chapterName: string;
  verseNumber: number;
  snippetArabic: string;
  snippetTurkish: string;
  timestamp: number;
}

export interface AppSettings {
  displayMode: DisplayMode;
  theme: AppTheme;
  arabicFont: ArabicFont;
  fontSizeMultiplier: number;
  translationSource: TranslationSource;
  alwaysShowWordMeaning: boolean; // if false, only show on hover/tap
  autoPlayWordAudio: boolean;
}
