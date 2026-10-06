import { Chapter, ChapterInfo, Verse } from "../types/quran";
import chaptersLocal from "../data/chapters.json";
import { chapterInfoTR } from "../data/chapterInfo";
import { VERSE_MEAL_OVERRIDES } from "../data/verseMealOverrides";
import {
  getOfflineChapter,
  getOfflineJuz,
  getOfflinePage,
  offlineVeriYukle,
} from "./offlineData";

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
      // Bazı sûrelerde (Felağ, Nâs) API her âyete tam mealini veriyor;
      // doğru âyet bazlı metinlerle değiştiriyoruz.
      const override = VERSE_MEAL_OVERRIDES[verse.verse_key];
      let applied = false;
      verse.translations = verse.translations.map((t) => {
        const text = decodeHtmlEntities(t.text || "");
        if (!applied && t.resource_id === 77 && override) {
          applied = true;
          return { ...t, text: override };
        }
        return { ...t, text };
      });
      // Diyanet kaynağı hiç yoksa override tek başına eklenir
      if (!applied && override) {
        verse.translations = [
          { id: -1, resource_id: 77, text: override },
          ...verse.translations,
        ];
      }
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

// Sûre listesi: gömülü statik veriden gelir, API'ye hiç gidilmez.
// Böylece uygulama internetsiz de açılabilir.
export async function getChapters(): Promise<Chapter[]> {
  const cacheKey = "quran_chapters_tr_v3";
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const chapters = normalizeChapters((chaptersLocal as any).chapters || []);
  cache.set(cacheKey, chapters);
  return chapters;
}

// Sûrenin âyetleri: gömülü offline veriden okunur.
export async function getVersesByChapter(
  chapterId: number,
  page: number = 1,
  perPage: number = 100,
): Promise<{ verses: Verse[]; totalVerses: number; totalPages: number }> {
  const cacheKey = `verses_ch_offline_${chapterId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const verses = await getOfflineChapter(chapterId);
  const totalPages = Math.max(1, Math.ceil(verses.length / perPage));
  const start = (page - 1) * perPage;
  const result = {
    verses: verses.slice(start, start + perPage),
    totalVerses: verses.length,
    totalPages,
  };

  cache.set(cacheKey, result);
  return result;
}

// Mushaf sayfası (1-604): gömülü offline veriden okunur.
export async function getVersesByPage(
  pageNumber: number,
): Promise<{ verses: Verse[]; pageNumber: number }> {
  const cacheKey = `verses_page_offline_${pageNumber}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const verses = await getOfflinePage(pageNumber);
  const result = { verses, pageNumber };

  cache.set(cacheKey, result);
  return result;
}

// Cüz (1-30): gömülü offline veriden okunur.
export async function getVersesByJuz(
  juzNumber: number,
  page: number = 1,
  perPage: number = 50,
): Promise<{ verses: Verse[]; totalVerses: number; totalPages: number }> {
  const cacheKey = `verses_juz_offline_${juzNumber}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const all = await getOfflineJuz(juzNumber);
  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const start = (page - 1) * perPage;
  const result = {
    verses: all.slice(start, start + perPage),
    totalVerses: all.length,
    totalPages,
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

  // Statik veride yoksa null
  return null;
}

// Kur'an içi arama: gömülü veri üzerinde çalışır, internetsiz de sonuç verir.
// Kelime anlamlarında, Arapça metinde ve âyet meallerinde arar.
export async function searchQuran(
  query: string,
  page: number = 1,
  size: number = 20,
) {
  const trimmed = query.trim().toLocaleLowerCase("tr");
  if (!trimmed) return { results: [], totalResults: 0, totalPages: 1 };

  const payload = await offlineVeriYukle();
  const eslesenler: any[] = [];

  for (const pageVerses of payload.pages) {
    if (!pageVerses) continue;
    for (const verse of pageVerses) {
      const meal = verse.translations?.[0]?.text || "";

      // Arapça kelime veya Türkçe kelime anlamı
      const kelimeSayisi = verse.words.filter(
        (w) =>
          w.text_uthmani.includes(trimmed) ||
          (w.translation?.text || "").toLocaleLowerCase("tr").includes(trimmed),
      ).length;
      const mealDahil = meal.toLocaleLowerCase("tr").includes(trimmed);

      if (kelimeSayisi > 0 || mealDahil) {
        eslesenler.push({
          verse_key: verse.verse_key,
          page_number: verse.page_number,
          text: verse.words
            .filter((w) => w.char_type_name === "word")
            .map((w) => w.text_uthmani)
            .join(""),
          translations: [{ text: meal }],
          eslesme: kelimeSayisi,
          sira: verse.page_number * 1000 + verse.verse_number,
        });
      }
    }
  }

  // Önce tam kelime eşleşmesi, sonra meal eşleşmesi; sonra sıra
  eslesenler.sort((a, b) => {
    if (b.eslesme !== a.eslesme) return b.eslesme - a.eslesme;
    return a.sira - b.sira;
  });

  const totalResults = eslesenler.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / size));
  const start = (page - 1) * size;

  return {
    results: eslesenler.slice(start, start + size),
    totalResults,
    totalPages,
  };
}
