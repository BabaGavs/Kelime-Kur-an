import { Chapter, ChapterInfo, Verse } from '../types/quran';
import chaptersLocal from '../data/chapters.json';
import chapter1Local from '../data/chapter1.json';

const BASE_URL = 'https://api.quran.com/api/v4';
const AUDIO_BASE_URL = 'https://audio.qurancdn.com';

// In-memory memory cache
const cache = new Map<string, any>();

// Helper to pad number (e.g. 1 -> 001)
export function padNumber(num: number, length: number = 3): string {
  return String(num).padStart(length, '0');
}

export function getWordAudioUrl(audioUrl: string | null): string | null {
  if (!audioUrl) return null;
  if (audioUrl.startsWith('http')) return audioUrl;
  return `${AUDIO_BASE_URL}/${audioUrl}`;
}

export function getVerseAudioUrl(chapterId: number, verseNumber: number): string {
  const chStr = padNumber(chapterId, 3);
  const vStr = padNumber(verseNumber, 3);
  return `https://verses.quran.com/Alafasy/mp3/${chStr}${vStr}.mp3`;
}

// Get all 114 chapters
export async function getChapters(): Promise<Chapter[]> {
  const cacheKey = 'quran_chapters_tr';
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Try localStorage
  try {
    const local = localStorage.getItem(cacheKey);
    if (local) {
      const parsed = JSON.parse(local);
      cache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {
    // Ignore storage issues
  }

  try {
    const res = await fetch(`${BASE_URL}/chapters?language=tr`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    const chapters: Chapter[] = data.chapters || [];
    cache.set(cacheKey, chapters);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(chapters));
    } catch (e) {}
    return chapters;
  } catch (err) {
    console.warn('API error fetching chapters, using local fallback', err);
    const localFallback = (chaptersLocal as any).chapters || [];
    cache.set(cacheKey, localFallback);
    return localFallback;
  }
}

// Get verses by chapter with word-by-word Turkish translations and Diyanet(77) + Elmalılı(52)
export async function getVersesByChapter(
  chapterId: number,
  page: number = 1,
  perPage: number = 100
): Promise<{ verses: Verse[]; totalVerses: number; totalPages: number }> {
  const cacheKey = `verses_ch_${chapterId}_p_${page}_sz_${perPage}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Fast starter cache for Al-Fatiha
  if (chapterId === 1 && page === 1) {
    const fatihaData = (chapter1Local as any).verses as Verse[];
    if (fatihaData && fatihaData.length > 0) {
      const result = { verses: fatihaData, totalVerses: fatihaData.length, totalPages: 1 };
      cache.set(cacheKey, result);
      return result;
    }
  }

  // Check localStorage for offline/cached browsing
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      cache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {}

  const url = `${BASE_URL}/verses/by_chapter/${chapterId}?language=tr&words=true&word_fields=text_uthmani,translation&translations=77,52&page=${page}&per_page=${perPage}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Âyetler yüklenemedi (HTTP ${res.status})`);
  }
  const data = await res.json();
  const verses: Verse[] = data.verses || [];
  const pagination = data.pagination || { total_records: verses.length, total_pages: 1 };

  const result = {
    verses,
    totalVerses: pagination.total_records,
    totalPages: pagination.total_pages,
  };

  cache.set(cacheKey, result);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(result));
  } catch (e) {}

  return result;
}

// Get verses by Mushaf page (1 to 604)
export async function getVersesByPage(
  pageNumber: number
): Promise<{ verses: Verse[]; pageNumber: number }> {
  const cacheKey = `verses_page_${pageNumber}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      cache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {}

  const url = `${BASE_URL}/verses/by_page/${pageNumber}?language=tr&words=true&word_fields=text_uthmani,translation&translations=77,52`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sayfa yüklenemedi (HTTP ${res.status})`);
  }
  const data = await res.json();
  const verses: Verse[] = data.verses || [];

  const result = {
    verses,
    pageNumber,
  };

  cache.set(cacheKey, result);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(result));
  } catch (e) {}

  return result;
}

// Get verses by Juz (1 to 30)
export async function getVersesByJuz(
  juzNumber: number,
  page: number = 1,
  perPage: number = 50
): Promise<{ verses: Verse[]; totalVerses: number; totalPages: number }> {
  const cacheKey = `verses_juz_${juzNumber}_p_${page}_sz_${perPage}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const url = `${BASE_URL}/verses/by_juz/${juzNumber}?language=tr&words=true&word_fields=text_uthmani,translation&translations=77,52&page=${page}&per_page=${perPage}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Cüz yüklenemedi (HTTP ${res.status})`);
  }
  const data = await res.json();
  const verses: Verse[] = data.verses || [];
  const pagination = data.pagination || { total_records: verses.length, total_pages: 1 };

  const result = {
    verses,
    totalVerses: pagination.total_records,
    totalPages: pagination.total_pages,
  };

  cache.set(cacheKey, result);
  return result;
}

// Chapter explanation / introduction
export async function getChapterInfo(chapterId: number): Promise<ChapterInfo | null> {
  const cacheKey = `chapter_info_${chapterId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const res = await fetch(`${BASE_URL}/chapters/${chapterId}/info?language=tr`);
    if (!res.ok) return null;
    const data = await res.json();
    const info = data.chapter_info;
    cache.set(cacheKey, info);
    return info;
  } catch (err) {
    return null;
  }
}

// Search across Quran with Turkish translations
export async function searchQuran(query: string, page: number = 1, size: number = 20) {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], totalResults: 0 };

  const url = `${BASE_URL}/search?q=${encodeURIComponent(trimmed)}&language=tr&page=${page}&size=${size}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Arama gerçekleştirilemedi (HTTP ${res.status})`);
  }
  const data = await res.json();
  return {
    results: data.search?.results || [],
    totalResults: data.search?.total_results || 0,
    totalPages: data.search?.total_pages || 1,
  };
}
