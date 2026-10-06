import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.babagavs.kelimekur",
  appName: "Kelime Kur'an",
  webDir: "dist",
  android: {
    // Kur'an sayfaları WebView'da çalışıyor; arka plan rengi paletle uyumlu
    backgroundColor: "#faf8f7",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;