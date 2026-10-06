/**
 * Offline veri üretici
 *
 * api.quran.com'den 604 mushaf sayfasının kelime bazlı metnini ve
 * Türkçe meallerini çeker, uygulamadaki normalizasyonla aynı işlemleri
 * uygular ve sonucu tek bir JSON olarak public/ altına yazar.
 *
 * Çalıştırma:  node scripts/build-offline-data.mjs
 *
 * Not: Ses dosyaları gömülmez (Meşale MP3'leri GB ölçeğinde); uygulama
 * içeriği stream etmeye devam eder.
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { VERSE_MEAL_OVERRIDES } from "./verse-meal-overrides.mjs";

const BASE_URL = "https://api.quran.com/api/v4";
const TOTAL_PAGES = 604;
const CONCURRENCY = 4;
const OUT_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "offline",
  "pages.json",
);

const WORD_FIELDS =
  "text_uthmani,translation&translations=77,52&per_page=50";

// ---------------------------------------------------------------
// Uygulamadaki normalizasyonun birebir karşılığı
// (src/services/quranApi.ts ile senkron tutulmalı)
// ---------------------------------------------------------------

const TRANSLITERATION_MAP = {
  aa: "â", ee: "î", oo: "û", ii: "î", uu: "û",
  ai: "ay", aw: "av", ei: "ey", ou: "û",
  th: "s", dh: "z", kh: "h", gh: "ğ", sh: "ş",
  ch: "ç", ph: "f", ts: "s", dz: "z", dj: "c",
  tj: "ç", zh: "j", x: "ks",
  q: "k", c: "k", w: "v", j: "c",
};

function transliterateToTurkish(text) {
  if (!text) return text;
  let result = text;
  for (const [key, value] of Object.entries(TRANSLITERATION_MAP)) {
    result = result.split(key).join(value);
  }
  return result;
}

const NAMED_ENTITIES = {
  quot: '"', apos: "'", amp: "&", lt: "<", gt: ">",
  nbsp: " ", ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'",
  ndash: "–", mdash: "—", hellip: "…",
};

function decodeHtmlEntities(text) {
  if (!text) return text;
  let out = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  out = out.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity) => {
      if (entity[0] === "#") {
        const isHex = entity[1] === "x" || entity[1] === "X";
        const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        return Number.isFinite(code) && code > 0
          ? String.fromCodePoint(code)
          : match;
      }
      const key = entity.toLowerCase();
      return key in NAMED_ENTITIES ? NAMED_ENTITIES[key] : match;
    },
  );
  return out;
}

const WORD_MEANING_TR = {
  "de ki": "de ki", qul: "de ki", o: "O", huwa: "O",
  allah: "Allah", "l-lahu": "Allah",
  rabbe: "Rabbe", birabbi: "Rabbe", rabbine: "Rabbine",
  "the evil": "şer", evil: "şer", sharri: "şer",
  "the knots": "düğüm", knots: "düğüm",
  "al-ʿuqad": "düğüm", "al-uqad": "düğüm",
  "in sha'": "Allah dilerse", insha: "Allah dilerse",
  "al-mulk": "mülk", "al-malik": "malik",
  "ar-rahman": "Rahman", "ar-raheem": "Rahim",
};

function turkishWordMeaning(text) {
  if (!text) return text;
  const cleaned = text.trim();
  const lower = cleaned.toLowerCase();
  if (lower in WORD_MEANING_TR) return WORD_MEANING_TR[lower];
  const stripped = cleaned.replace(/^\(the\)\s*/i, "").trim();
  const strippedLower = stripped.toLowerCase();
  if (strippedLower in WORD_MEANING_TR) return WORD_MEANING_TR[strippedLower];
  return cleaned;
}

// Fâtiha'da besmele âyet değildir; 1:1'i çıkarıp kalanları 1'den numaralandır
function stripBasmalaFromFatiha(verses) {
  const out = verses.filter((v) => {
    if (v.verse_key !== "1:1") return true;
    const text = (v.words || [])
      .filter((w) => w.char_type_name === "word")
      .map((w) => w.text_uthmani || w.text || "")
      .join("");
    return !text.includes("بِسْمِ");
  });
  return out.map((v, i) => ({ ...v, verse_number: i + 1 }));
}

function normalizeVerse(verse) {
  const words = (verse.words || []).map((w) => ({
    text_uthmani: w.text_uthmani || w.text || "",
    char_type_name: w.char_type_name,
    translation: {
      text: turkishWordMeaning(w.translation?.text || ""),
    },
  }));

  const override = VERSE_MEAL_OVERRIDES[verse.verse_key];
  const translations = (verse.translations || []).map((t) => {
    const text = decodeHtmlEntities(t.text || "");
    return t.resource_id === 77 && override ? override : text;
  });

  // Diyanet kaynağı tamamen eksikse override tek başına eklenir
  if (override && !translations.some((_, i) => verse.translations[i]?.resource_id === 77)) {
    translations.unshift(override);
  }

  return {
    id: verse.id,
    verse_key: verse.verse_key,
    verse_number: verse.verse_number,
    page_number: verse.page_number,
    juz_number: verse.juz_number,
    words,
    translations: [
      { resource_id: 77, text: translations[0] || "" },
      { resource_id: 52, text: translations[1] || "" },
    ],
  };
}

function normalizePage(verses) {
  const hasFatiha = verses.some((v) => v.verse_key === "1:1");
  const cleaned = hasFatiha ? stripBasmalaFromFatiha(verses) : verses;
  return cleaned.map(normalizeVerse);
}

// ---------------------------------------------------------------
// Çekme
// ---------------------------------------------------------------

async function fetchPage(pageNumber, attempt = 1) {
  const url = `${BASE_URL}/verses/by_page/${pageNumber}?language=tr&words=true&word_fields=${WORD_FIELDS}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return normalizePage(data.verses || []);
  } catch (err) {
    if (attempt >= 4) throw err;
    const wait = 800 * attempt;
    await new Promise((r) => setTimeout(r, wait));
    return fetchPage(pageNumber, attempt + 1);
  }
}

async function main() {
  const started = Date.now();
  const pages = new Array(TOTAL_PAGES + 1).fill(null);
  let done = 0;
  let words = 0;

  const queue = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

  async function worker() {
    while (queue.length > 0) {
      const page = queue.shift();
      if (!page) return;
      try {
        const verses = await fetchPage(page);
        pages[page] = verses;
        words += verses.reduce((sum, v) => sum + v.words.length, 0);
        done += 1;
        if (done % 25 === 0 || done === TOTAL_PAGES) {
          const pct = ((done / TOTAL_PAGES) * 100).toFixed(1);
          process.stdout.write(
            `  ${done}/${TOTAL_PAGES} sayfa (%${pct}) · ${words} kelime\n`,
          );
        }
      } catch (err) {
        console.error(`\n  ! sayfa ${page} başarısız: ${err.message}`);
        pages[page] = null;
      }
    }
  }

  console.log("604 sayfa çekiliyor (eşzamanlılık: %d)...", CONCURRENCY);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const bos = [];
  for (let p = 1; p <= TOTAL_PAGES; p += 1) {
    if (!pages[p] || pages[p].length === 0) bos.push(p);
  }
  if (bos.length > 0) {
    console.error(
      `\n${bos.length} sayfa boş çıktı: ${bos.slice(0, 20).join(", ")}${bos.length > 20 ? " ..." : ""}`,
    );
    process.exitCode = 1;
    return;
  }

  const payload = { version: 1, pages };
  const json = JSON.stringify(payload);

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, json, "utf8");

  const { size } = await stat(OUT_FILE);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\nTamam: ${TOTAL_PAGES} sayfa · ${words} kelime · ` +
      `${(size / 1024 / 1024).toFixed(1)} MB · ${secs}s`,
  );
  console.log(`  -> ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});