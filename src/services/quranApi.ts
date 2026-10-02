import { Chapter, ChapterInfo, Verse } from "../types/quran";
import chaptersLocal from "../data/chapters.json";
import chapter1Local from "../data/chapter1.json";
import { chapterInfoTR } from "../data/chapterInfo";

const BASE_URL = "https://api.quran.com/api/v4";
const AUDIO_BASE_URL = "https://audio.qurancdn.com";

// In-memory memory cache
const cache = new Map<string, any>();

// Helper to pad number (e.g. 1 -> 001)
export function padNumber(num: number, length: number = 3): string {
  return String(num).padStart(length, "0");
}

// Convert English transliteration to Turkish
export function transliterateToTurkish(text: string): string {
  if (!text) return text;

  const replacements: Record<string, string> = {
    // Multi-character patterns (longer first)
    aa: "â",
    ee: "î",
    oo: "û",
    ii: "î",
    uu: "û",
    ai: "ay",
    aw: "av",
    ei: "ey",
    ou: "û",
    th: "s",
    dh: "z",
    kh: "h",
    gh: "ğ",
    sh: "ş",
    ch: "ç",
    ph: "f",
    ts: "s",
    dz: "z",
    dj: "c",
    tj: "ç",
    zh: "j",
    x: "ks",

    // Single characters
    q: "k",
    c: "k",
    w: "v",
    j: "c",
    y: "y",
    g: "g",
    k: "k",
    l: "l",
    m: "m",
    n: "n",
    p: "p",
    r: "r",
    s: "s",
    t: "t",
    z: "z",
    f: "f",
    h: "h",
    d: "d",
    b: "b",
    v: "v",

    // Special characters
    "'": "ʿ",
    "`": "ʿ",
    ʾ: "ʿ",
    ʕ: "ʿ",
    ʔ: "",
    ā: "â",
    ī: "î",
    ū: "û",
    ē: "ê",
    ō: "ô",
  };

  let result = text.toLowerCase();

  // Apply replacements (longer patterns first)
  const sortedKeys = Object.keys(replacements).sort(
    (a, b) => b.length - a.length,
  );
  for (const key of sortedKeys) {
    result = result.split(key).join(replacements[key]);
  }

  return result;
}

export function getVerseAudioUrl(
  chapterId: number,
  verseNumber: number,
): string {
  const chStr = padNumber(chapterId, 3);
  const vStr = padNumber(verseNumber, 3);
  return `https://verses.quran.com/Alafasy/mp3/${chStr}${vStr}.mp3`;
}

// Diyanet çevirisi HTML entity'leri (&quot; &amp; &#39; ...) kaçışlı döner.
// Bunları gerçek karaktere çevirir, < > gibi etiketleri temizler.
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  let out = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");

  const named: Record<string, string> = {
    quot: '"',
    apos: "'",
    amp: "&",
    lt: "<",
    gt: ">",
    nbsp: " ",
    ldquo: '"',
    rdquo: '"',
    lsquo: "'",
    rsquo: "'",
    ndash: "–",
    mdash: "—",
    hellip: "…",
  };

  out = out.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const isHex = entity[1] === "x" || entity[1] === "X";
      const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(code) && code > 0
        ? String.fromCodePoint(code)
        : match;
    }
    const key = entity.toLowerCase();
    return key in named ? named[key] : match;
  });

  return out;
}

// API'nin kelime anlamları yer yer İngilizce kalıyor.
// En sık geçenleri Türkçeye çeviriyoruz (kalanı olduğu gibi bırakılır).
const WORD_MEANING_TR: Record<string, string> = {
  "de ki": "de ki",
  qul: "de ki",
  o: "O",
  huwa: "O",
  allah: "Allah",
  "l-lahu": "Allah",
  rabbe: "Rabbe",
  birabbi: "Rabbe",
  rabbine: "Rabbine",
  "the evil": "şer",
  evil: "şer",
  sharri: "şer",
  "the knots": "düğüm",
  knots: "düğüm",
  "al-ʿuqad": "düğüm",
  "al-uqad": "düğüm",
  "in sha':": "Allah dilerse",
  insha: "Allah dilerse",
  "al-mulk": "mülk",
  "al-malik": "malik",
  "ar-rahman": "Rahman",
  "ar-raheem": "Rahim",
};

function turkishWordMeaning(text: string): string {
  if (!text) return text;
  const cleaned = text.trim();
  const lower = cleaned.toLowerCase();
  if (lower in WORD_MEANING_TR) return WORD_MEANING_TR[lower];
  // Baştaki "(the)" gibi İngilizce kalıntıları at
  const stripped = cleaned.replace(/^\(the\)\s*/i, "").trim();
  const strippedLower = stripped.toLowerCase();
  if (strippedLower in WORD_MEANING_TR) return WORD_MEANING_TR[strippedLower];
  return cleaned;
}

// Kelime anlamlarını Türkçeleştirir, meal metinlerindeki entity'leri çözer
function normalizeVerses(verses: Verse[]): Verse[] {
  for (const verse of verses) {
    for (const word of verse.words || []) {
      if (word.translation?.text) {
        word.translation.text = turkishWordMeaning(word.translation.text);
      }
      if (word.transliteration?.text) {
        word.transliteration.text = transliterateToTurkish(
          word.transliteration.text,
        );
      }
    }
    if (verse.translations) {
      verse.translations = verse.translations.map((t) => ({
        ...t,
        text: decodeHtmlEntities(t.text || ""),
      }));
    }
  }
  return verses;
}

// Fâtiha'da besmele ayet değildir; API'de 1. âyet olarak gelir,
// diğer sûrelerdeki gibi başlıkta gösterilmeli. Bu yüzden normalize edilir.
function normalizeChapters(chapters: Chapter[]): Chapter[] {
  return chapters.map((c) =>
    // Besmele başlığa taşındığı için Fâtiha'da "âyet" olarak sayılmaz
    c.id === 1 ? { ...c, bismillah_pre: true, verses_count: 6 } : c,
  );
}

// Besmeleyi âyet listesinden çıkarır (yalnızca Fâtiha için)
function stripBasmalaFromFatiha(verses: Verse[]): Verse[] {
  const out = verses.filter((v) => {
    if (v.verse_key !== "1:1") return true;
    const text = (v.words || [])
      .filter((w) => w.char_type_name === "word")
      .map((w) => w.text_uthmani || w.text || "")
      .join("");
    return !text.includes("بِسْمِ");
  });
  // Kalan âyetleri 1'den yeniden numaralandır
  return out.map((v, i) => ({ ...v, verse_number: i + 1 }));
}

// Get all 114 chapters
export async function getChapters(): Promise<Chapter[]> {
  const cacheKey = "quran_chapters_tr_v2";
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Try localStorage
  try {
    const local = localStorage.getItem(cacheKey);
    if (local) {
      const parsed = normalizeChapters(JSON.parse(local));
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
    const chapters: Chapter[] = normalizeChapters(data.chapters || []);
    cache.set(cacheKey, chapters);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(chapters));
    } catch (e) {}
    return chapters;
  } catch (err) {
    console.warn("API error fetching chapters, using local fallback", err);
    const localFallback = normalizeChapters(
      (chaptersLocal as any).chapters || [],
    );
    cache.set(cacheKey, localFallback);
    return localFallback;
  }
}

// Get verses by chapter with word-by-word Turkish translations and Diyanet(77) + Elmalılı(52)
export async function getVersesByChapter(
  chapterId: number,
  page: number = 1,
  perPage: number = 100,
): Promise<{ verses: Verse[]; totalVerses: number; totalPages: number }> {
  const cacheKey = `verses_ch_v3_${chapterId}_p_${page}_sz_${perPage}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Fast starter cache for Al-Fatiha
  if (chapterId === 1 && page === 1) {
    const fatihaData = (chapter1Local as any).verses as Verse[];
    if (fatihaData && fatihaData.length > 0) {
      const result = {
        verses: normalizeVerses(fatihaData),
        totalVerses: fatihaData.length,
        totalPages: 1,
      };
      cache.set(cacheKey, result);
      return result;
    }
  }

  // Check localStorage for offline/cached browsing
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.verses) parsed.verses = normalizeVerses(parsed.verses);
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
  const rawVerses: Verse[] = data.verses || [];
  const verses = normalizeVerses(
    chapterId === 1 ? stripBasmalaFromFatiha(rawVerses) : rawVerses,
  );

  const pagination = data.pagination || {
    total_records: verses.length,
    total_pages: 1,
  };

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
  pageNumber: number,
): Promise<{ verses: Verse[]; pageNumber: number }> {
  const cacheKey = `verses_page_v3_${pageNumber}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.verses) parsed.verses = normalizeVerses(parsed.verses);
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
  const rawVerses: Verse[] = data.verses || [];
  // Fâtiha sayfasında besmele ayet olmaktan çıkarılıp başlığa alınır
  const verses = normalizeVerses(
    rawVerses.some((v) => v.verse_key === "1:1")
      ? stripBasmalaFromFatiha(rawVerses)
      : rawVerses,
  );

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
  perPage: number = 50,
): Promise<{ verses: Verse[]; totalVerses: number; totalPages: number }> {
  const cacheKey = `verses_juz_v3_${juzNumber}_p_${page}_sz_${perPage}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const url = `${BASE_URL}/verses/by_juz/${juzNumber}?language=tr&words=true&word_fields=text_uthmani,translation&translations=77,52&page=${page}&per_page=${perPage}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Cüz yüklenemedi (HTTP ${res.status})`);
  }
  const data = await res.json();
  const verses: Verse[] = normalizeVerses(data.verses || []);

  const pagination = data.pagination || {
    total_records: verses.length,
    total_pages: 1,
  };

  const result = {
    verses,
    totalVerses: pagination.total_records,
    totalPages: pagination.total_pages,
  };

  cache.set(cacheKey, result);
  return result;
}

// Chapter explanation / introduction - uses static Turkish data
export async function getChapterInfo(
  chapterId: number,
): Promise<ChapterInfo | null> {
  const cacheKey = `chapter_info_tr_v2_${chapterId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Use static Turkish chapter info
  const staticInfo = chapterInfoTR[chapterId];
  if (staticInfo) {
    const info: ChapterInfo = {
      id: chapterId,
      chapter_id: chapterId,
      language_name: "turkish",
      short_text: staticInfo.short_text,
      source: "Statik Türkçe Sûre Bilgileri",
      text: staticInfo.text,
    };
    cache.set(cacheKey, info);
    return info;
  }

  // Fallback to API if static data not available
  try {
    const res = await fetch(
      `${BASE_URL}/chapters/${chapterId}/info?language=tr`,
    );
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
export async function searchQuran(
  query: string,
  page: number = 1,
  size: number = 20,
) {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], totalResults: 0 };

  const url = `${BASE_URL}/search?q=${encodeURIComponent(trimmed)}&language=tr&page=${page}&size=${size}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Arama gerçekleştirilemedi (HTTP ${res.status})`);
  }
  const data = await res.json();
  const results = (data.search?.results || []).map((r: any) => ({
    ...r,
    translations: (r.translations || []).map((t: any) => ({
      ...t,
      text: decodeHtmlEntities(t.text || ""),
    })),
  }));
  return {
    results,
    totalResults: data.search?.total_results || 0,
    totalPages: data.search?.total_pages || 1,
  };
}
