import React, { useEffect } from "react";
import { pageImageUrl } from "../data/mushafImages";

interface MushafPageProps {
  pageNumber: number;
}

/**
 * Madani Mushaf sayfası — gerçek kashida'lı PDF render'ı.
 *
 * Kashida tarayıcıda Arapça OpenType özelliği olarak yoktur ve CSS ile
 * yeniden üretilemez; bu yüzden sayfa görsel olarak servis edilir.
 * Görsel sabit ölçeklidir: sayfa 1 ile sayfa 600'de puntola aynıdır.
 *
 * Bilerek etkileşimsiz: Mushaf saf okuma içindir. Kelime anlamı yalnızca
 * Kelime Meali modunda çalışır.
 */
export const MushafPage: React.FC<MushafPageProps> = ({ pageNumber }) => {
  // Sonraki sayfanın görselini önden indir (geçiş pürüzsüz olsun)
  useEffect(() => {
    if (pageNumber < 604) new Image().src = pageImageUrl(pageNumber + 1);
  }, [pageNumber]);

  return (
    <div className="mushaf-image-page">
      <div className="mushaf-image-holder">
        <img
          src={pageImageUrl(pageNumber)}
          alt={`Kur'an-ı Kerim, ${pageNumber}. sayfa`}
          className="mushaf-image-img"
          decoding="async"
        />
      </div>
    </div>
  );
};
