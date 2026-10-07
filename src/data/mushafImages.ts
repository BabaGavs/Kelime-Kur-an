/**
 * Madani Mushaf görsel + şeffaf tıklama katmanı.
 *
 * Neden görsel: Madani Mushaf'ın satırları gerçek kashida ile doldurulmuş
 * bir PDF'tir; bu kashida tarayıcıda Arapça OpenType özelliği olarak yok,
 * CSS ile yeniden üretilemez. Sayfa bu yüzden görsel olarak servis edilir.
 *
 * Neden şeffaf metin: tıklama yapılabilmesi için üzerine görünmez ama
 * konumlandırılmış bir metin katmanı yerleştirilir. Konumlar
 * `layout.json`'daki GERÇEK Madani satır kırılmalarından gelir, bu yüzden
 * tıklama her zaman doğru kelimeye düşer.
 *
 * Görsel sabit ölçeklidir: sayfa 1'deki puntola sayfa 600'dekiyle aynıdır.
 */

/** layout.json içindeki bir satır */
export type LayoutLine =
  /** Madani satır kırılmasındaki kelimeler */
  | { t: "text"; w: { loc: string; w: string }[] }
  /** Sûre başlığı (sure: "002") */
  | { t: "surah-header"; s: string }
  /** Besmele */
  | { t: "basmala" };

/** public/mushaf/manifest.json */
export interface MushafManifest {
  [page: string]: { w: number; h: number; bytes: number };
}

const BASE = `${import.meta.env.BASE_URL}mushaf`;

export function pageImageUrl(page: number): string {
  return `${BASE}/${page}.webp`;
}

/** layout/ dizini (sayfa bazlı JSON) */
export function layoutUrl(): string {
  return `${BASE}/layout`;
}
