import React, { useEffect } from "react";

/** public/mushaf/manifest.json */
export interface MushafManifest {
  [page: string]: { w: number; h: number; bytes: number };
}

const BASE = `${import.meta.env.BASE_URL}mushaf`;

export function pageImageUrl(page: number): string {
  return `${BASE}/${page}.webp`;
}
