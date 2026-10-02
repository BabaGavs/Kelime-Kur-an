/**
 * Diyanet çevirisinin âyet bazlı olmayan durumları düzeltir.
 *
 * Felağ (113) ve Nâs (114) sûrelerinde API, her âyete tam sûrenin
 * mealini veriyor. Böylece her âyetin altında aynı uzun metin
 * tekrar ediyordu. Aşağıda o âyetlere ait doğru, ayrı metinler var.
 *
 * Anahtar biçimi: "sure:ayet"
 */
export const VERSE_MEAL_OVERRIDES: Record<string, string> = {
  // Felağ
  "113:1": 'De ki: "Tan yerini ağartan Rabbe sığınırım."',
  "113:2": "Yaratıkların şerrinden.",
  "113:3": "Bastırdığı zaman karanlığın şerrinden.",
  "113:4": "Düğümlere nefes eden büyücülerin şerrinden.",
  "113:5": "Hased ettiği zaman hasedcilerin şerrinden.",

  // Nâs
  "114:1": 'De ki: "İnsanların Rabbi olan Allah\'a sığınırım."',
  "114:2": "O Allah ki insanların mâliki.",
  "114:3": "İnsanların İlâhı.",
  "114:4": "Vesvese veren o sinsi vesvesecinin şerrinden.",
  "114:5": "Öyle vesveseci ki, insanların gönüllerine vesvese veren.",
  "114:6": "İnsanlardan ve cinlerden olan vervesecilerden.",
};
