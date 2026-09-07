# Reminder Health · İlaç Takip & Hatırlatıcı Sistemi

Modern, çevrimdışı öncelikli (offline-first), klinik kurallara uygun yetişkin ilaç hatırlatıcı ve takip sistemi.

## 🚀 Temel Özellikler

- **📱 Mobil Uygulama (Android & iOS):**
  - React Native / Expo ile geliştirilmiş yerel mobil arayüz.
  - Android 12/14+ kilit ekranı alarmları, tam zamanında bildirimler ve 3 dakikalık ısrarcı uyarı (repeat nag).
  - Pil tasarrufu muafiyeti ve boot sonrası otomatik yeniden zamanlama.

- **📷 ITS DataMatrix (Karekod) Tarayıcı:**
  - Sağlık Bakanlığı onaylı GS1 DataMatrix ilaç karekodlarını canlı kamera ile ayrıştırma.
  - GTIN, Son Kullanma Tarihi (YYMMDD -> YYYY-MM-DD), Seri No ve Parti No otomatik doldurma.
  - Dahili Türk ilaç kataloğu ve bilinmeyen kutuları hafızada tutan çevrimdışı öğrenme motoru.

- **🔄 Self-Hosted Ubuntu Senkronizasyon Sunucusu:**
  - Node.js 22+ yerel `node:sqlite` ve `node:http` tabanlı sıfır bağımlılıklı REST API backend (`server/`).
  - Akıllı Birleştirme (Smart Merge): Last-Write-Wins (LWW), derin slot birleştirmesi ve mezardan dönme korumalı (tombstone) silme.
  - Docker ve docker-compose desteği.

- **💾 Çevrimdışı JSON Yedekleme:**
  - Sunucuya ihtiyaç duymadan cihaz hafızasına tam JSON yedek alma ve geri yükleme.

- **💻 Web Prototipi:**
  - Masaüstü ve tarayıcı ortamında tam simülasyon sunan Vite + React prototipi.

## 📂 Proje Yapısı

```
├── mobile-app/          # React Native / Expo Android & iOS uygulaması
│   ├── android/         # Yerel Android projesi (Gradle derleme)
│   └── src/             # ITS Parser, ses yönetimi, karekod modalı
├── server/              # Self-hosted Node.js / SQLite senkronizasyon sunucusu
├── src/                 # Web prototip kaynak kodları (Prototype.tsx)
├── tests/               # Otomatik birim ve entegrasyon test paketi
└── public/              # Statik varlıklar ve derlenmiş APK çıktısı
```

## 🛠️ Kurulum & Geliştirme

### Web Prototipi
```bash
npm install
npm run dev
```

### Mobil Uygulama
```bash
cd mobile-app
npm install
npx expo start
```

### Android Release APK Derleme
```bash
cd mobile-app/android
./gradlew assembleRelease
```

### Senkronizasyon Sunucusu
```bash
cd server
npm install
npm run build
npm start
# veya Docker ile:
docker compose up -d
```

### Testleri Çalıştırma
```bash
node --test tests/its-parser.test.mjs tests/notifications-reliability.test.mjs tests/smart-merge.test.mjs tests/server-api.test.mjs
```

## 📄 Lisans
MIT
