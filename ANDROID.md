# Android (Capacitor)

React + Vite projesini native Android uygulamasına çevirir. Kur'an metni
uygulama içine gömülüdür; **uygulama internetsiz tam çalışır**.

## Gereksinimler

| Gereken | Sürüm |
|---------|-------|
| JDK | 21+ (`brew install openjdk@21`) |
| Android SDK | platform 36, build-tools 35+ |
| Node | 20+ |

## Günlük akış

```bash
npm run apk      # build + sync + assembleDebug
```

APK çıktısı:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Sık kullanılan komutlar

| Komut | Ne yapar |
|-------|----------|
| `npm run build` | Web varlıklarını `dist/` içine üretir |
| `npm run cap:sync` | `dist/` içeriğini `android/` klasörüne kopyalar |
| `npm run apk` | Debug APK üretir |
| `npm run apk:release` | İmzalı release APK üretir (keystore gerekli) |
| `npm run offline-data` | Gömülü mushaf verisini yeniden üretir (604 sayfa) |
| `npx cap open android` | Android Studio'da açar |

## Offline veri

`public/offline/pages.json` — 604 mushaf sayfasının kelime bazlı Arapça
metni, Türkçe kelime mealleri ve Diyanet/Elmalılı âyet mealleri.

```bash
npm run offline-data   # ~45 saniye, ~10 MB üretir
```

Bu dosya `.gitignore` içindedir; API'den yeniden üretilir.

**Ses dosyaları gömülmez** — Meşale MP3'leri GB ölçeğinde olduğu için
`verses.quran.com` üzerinden stream edilir. Sesli okuma için internet gerekir.

## Play Store'a yükleme

Google Play artık APK değil **AAB** (Android App Bundle) istiyor:

```bash
cd android && ./gradlew bundleRelease
# -> app/build/outputs/bundle/release/app-release.aab
```

### İlk sefer: keystore

```bash
mkdir -p keystore
keytool -genkey -v \
  -keystore keystore/kelime-kur.jks \
  -alias kelimekur \
  -keyalg RSA -keysize 2048 -validity 10000
```

Sonra şifreleri ortam değişkeni olarak ver:

```bash
export KS_STORE_PASSWORD=...
export KS_KEY_ALIAS=kelimekur
export KS_KEY_PASSWORD=...
```

> Keystore dosyasını ve şifrelerini kaybetme. Play Console'a yüklediğin
> keystore ile eşleşmek zorunda; kaybedersen uygulama güncellemesi yayınlayamaz.
> Şifreleri bir parola yöneticisinde sakla.

## Uygulama kimliği

| | |
|---|---|
| Package | `com.babagavs.kelimekur` |
| minSdk | 24 (Android 7.0) |
| targetSdk | 36 (Android 16) |
| İzinler | `INTERNET` (ses), `VIBRATE` (haptics) |