import { Verse } from "../types/quran";

/**
 * Gömülü offline mushaf verisi
 *
 * public/offline/pages.json dosyası build-offline-data.mjs script'iyle
 * üretilir: 604 sayfanın kelime bazlı Arapça metni, Türkçe kelime
 * mealleri ve Diyanet/Elmalılı âyet mealleri.
 *
 * Veri bir kez yüklenip bellekte tutulur; sonraki sayfa geçişleri
 * diskten tekrar okunmaz. Böylece uygulama internetsiz tam çalışır.
 */

interface OfflinePayload {
  version: number;
  pages: (Verse[] | null)[];
}

let yuklemeSozu: Promise<OfflinePayload> | null = null;
let veri: OfflinePayload | null = null;

/** Offline veriyi yükler; sonraki çağrılar aynı sözü döndürür. */
export function offlineVeriYukle(): Promise<OfflinePayload> {
  if (yuklemeSozu) return yuklemeSozu;

  yuklemeSozu = (async () => {
    // Vite base path'i Capacitor altında değişebilir
    const base = import.meta.env.BASE_URL || "/";
    const url = `${base.replace(/\/?$/, "/")}offline/pages.json`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Offline veri yüklenemedi (HTTP ${res.status})`);
    }
    const payload = (await res.json()) as OfflinePayload;
    if (!payload?.pages || payload.pages.length < 2) {
      throw new Error("Offline veri biçimi geçersiz");
    }
    veri = payload;
    return payload;
  })();

  return yuklemeSozu;
}

export function offlineVeriHazirMi(): boolean {
  return veri !== null;
}

/** Bir sayfanın âyetlerini döndürür. */
export async function getOfflinePage(page: number): Promise<Verse[]> {
  const payload = veri ?? (await offlineVeriYukle());
  return payload.pages[page] ?? [];
}

/** Bir sûrenin tüm âyetlerini verir (sayfalar arasında sıralı). */
export async function getOfflineChapter(chapterId: number): Promise<Verse[]> {
  const payload = veri ?? (await offlineVeriYukle());
  const out: Verse[] = [];
  for (const page of payload.pages) {
    if (!page) continue;
    for (const verse of page) {
      if (Number(verse.verse_key.split(":")[0]) === chapterId) out.push(verse);
    }
  }
  return out;
}

/** Bir cüzün tüm âyetlerini verir. */
export async function getOfflineJuz(juzNumber: number): Promise<Verse[]> {
  const payload = veri ?? (await offlineVeriYukle());
  const out: Verse[] = [];
  for (const page of payload.pages) {
    if (!page) continue;
    for (const verse of page) {
      if (verse.juz_number === juzNumber) out.push(verse);
    }
  }
  return out;
}

/**
 * Bir ayete giden sayfayı bulur. Arama sonuçları ve yer imleri
 * sayfa numarasına ihtiyaç duyar.
 */
export async function findPageOfVerse(verseKey: string): Promise<number> {
  const payload = veri ?? (await offlineVeriYukle());
  for (let p = 1; p < payload.pages.length; p += 1) {
    const page = payload.pages[p];
    if (page && page.some((v) => v.verse_key === verseKey)) return p;
  }
  return 1;
}

/** Bir sûrenin ilk sayfasını döndürür (Mushaf modunda atlama için). */
export async function findChapterStartPage(chapterId: number): Promise<number> {
  const payload = veri ?? (await offlineVeriYukle());
  for (let p = 1; p < payload.pages.length; p += 1) {
    const page = payload.pages[p];
    if (!page) continue;
    const ilk = page[0];
    if (ilk && Number(ilk.verse_key.split(":")[0]) === chapterId) return p;
  }
  return 1;
}

/** Bir cüzün ilk sayfasını döndürür (yaklaşık hesap yerine kesin). */
export async function findJuzStartPage(juzNumber: number): Promise<number> {
  const payload = veri ?? (await offlineVeriYukle());
  for (let p = 1; p < payload.pages.length; p += 1) {
    const page = payload.pages[p];
    if (!page) continue;
    const ilk = page[0];
    if (ilk && ilk.juz_number === juzNumber) return p;
  }
  return 1;
}
