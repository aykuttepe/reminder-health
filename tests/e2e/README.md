# Android test ortamı

Bu klasör Reminder Health için ayrı bir Python + Robot Framework + Appium ortamıdır.
Uygulamanın npm bağımlılıklarını veya global shell ayarlarını değiştirmez.

## Doğrulanan durum — 14 Eylül 2026

- macOS ARM64, Python 3.14.6, Node.js 26.8.1 ve Java 17.
- Appium 3.7.0 ve UiAutomator2 8.7.0 kuruldu; sürücü yüklenebiliyor.
- Robot Framework 7.5, AppiumLibrary 3.2.1 ve Appium Python Client 6.0.6 kuruldu.
- `pip check` ve AppiumLibrary import kontrolü geçti.
- `server.robot` gerçek Appium HTTP sunucusuna bağlandı: **1 passed, 0 failed**.
- Appium Doctor zorunlu kontrolleri geçti; bundletool ve GStreamer yalnızca opsiyonel eksik.
- Android 15 / API 35 Google APIs ARM64 system image ve `Reminder_Health_API_35` Pixel 7 AVD kuruldu.
- `emulator-5554` boot oldu, `adb` tarafından `device` olarak görüldü ve APK başarıyla kuruldu.
- `android_smoke.robot` güncel release APK üzerinde dört ana sekme için **4 passed, 0 failed** verdi.
- `medication_flow.robot` güncel release APK üzerinde temiz uygulama verisiyle ilaç ekleme → başlangıç stokunu (30 adet) doğrulama → doz alma → Geçmiş kontrolü → stok azalmasını (29 adet) doğrulama akışını **1 passed, 0 failed** verdi.
- `medication_persistence.robot` ilaç ekleme → uygulamayı terminate/activate ile yeniden açma → kaydı bulma → ilaç adını düzenleme → tekrar açılışta güncellenen adı bulma → onaylı silme akışını **1 passed, 0 failed** verdi.
- `medication_validation.robot` boş ilaç adıyla kaydetmede `Eksik Bilgi` uyarısını ve uyarı sonrasında geçerli kayıt oluşturmayı **1 passed, 0 failed** verdi.
- `notification_test.robot` ayarlardaki 3 saniyelik test bildiriminin foreground uygulama banner'ına ulaşmasını **1 passed, 0 failed** verdi.
- `notification_background.robot` Android notification shade'de native bildirimi (`⏰ İlaç Vakti`) buldu ve **1 passed, 0 failed** verdi.
- `npm run test:all` zinciri (`server` + `android` + `medication` + `persistence` + `validation` + `notification` + `notification-background`) `fastReset` (`pm clear`) ve doğrudan kurulu paket kullanımı ile toplam **10 test, 10 passed, 0 failed** verdi; oturumlar arası 94MB APK aktarım darboğazı ve UiAutomator2 kilitlenme riski giderildi.
- Fiziksel Samsung **SM-A376B**, Android **16 / API 36** üzerinde `android_device_notifications.robot` ile arka plan ve kilit ekranı teslimi **2 passed, 0 failed** verdi. Uygulama içi 3 sn test bildirimi tetiklenip ana ekrana çıkıldığında arka planda (`state=3`) 3.7 sn sonra, kilit ekranında (`showing=true`) 3.7 sn sonra işletim sistemi notification dump'ında (`tag=test-med-main`) tespit edildi.
- Fiziksel Samsung **SM-A376B**, Android **16 / API 36** üzerinde güncellenen **0.2.21 / versionCode 22** sürümü ile `android_device_smoke.robot` **4 passed, 0 failed** verdi. İlaçlarım, Geçmiş, Ayarlar ve Bugün ekranları kontrol edildi; mevcut kullanıcı verileri korundu.
- Aynı fiziksel smoke testi üç bağımsız Appium oturumunda art arda geçti: **12 test çalıştırması, 12 passed, 0 failed**. Bu ölçüm sekme gezintisi ve oturum kararlılığıyla sınırlıdır; başarılı adımlarda screenshot alınmadığından emulator'daki screenshot hatasının çözümünü kanıtlamaz. Toplu rapor: `results/device-stability/report.html`.
- Mevcut `mobile-app/android/app/build/outputs/apk/release/app-release.apk` sürümü
  **0.2.21 / versionCode 22**; package `com.itmarti.reminder`, activity
  `com.itmarti.reminder.MainActivity`. Bu APK `./gradlew assembleRelease` ile yeniden
  derlenmiş ve emulator testleri bu binary üzerinde tekrarlanmıştır.

İlk sandbox denemesinde yerel HTTP bağlantısı engellendi. Ağ izniyle tekrar edilen
gerçek bağlantı testi başarılı oldu. Dry-run sonucu yalnızca Robot sözdizimi ve
keyword çözümlemesini kontrol eder; gerçek test sonucu olarak kullanılmaz.

## Tekrar kurulum

Repository kökünden, normal kullanıcı yetkileriyle:

```bash
python3 -m venv tests/e2e/.venv
tests/e2e/.venv/bin/python -m pip install -r tests/e2e/requirements.txt
npm ci --prefix tests/e2e
```

Python bağımlılıkları `requirements.txt`, Node bağımlılıkları `package-lock.json`
ile sabitlenmiştir. Python ortamı ve sonuç dosyaları Git dışında tutulur.

## Araçlar

Repository kökünden:

```bash
npm --prefix tests/e2e run doctor
npm --prefix tests/e2e run drivers
```

`tooling.mjs`, SDK yolunu önce `ANDROID_HOME` / `ANDROID_SDK_ROOT` ortamından,
ardından `mobile-app/android/local.properties` dosyasından alır. Mevcut Mac'te yol
`/opt/homebrew/share/android-commandlinetools` olarak doğrulandı. Java için macOS'te
Java 17 aranır. Bu ayarlar yalnızca başlatılan Appium sürecine uygulanır.

Appium sunucusu yalnızca loopback adresinde dinler:

```bash
npm --prefix tests/e2e run appium
```

Sunucu çalışırken başka bir terminalden:

```bash
npm --prefix tests/e2e run check:server
```

Rapor: `tests/e2e/results/server/report.html`. Ayrıntılı log:
`tests/e2e/results/server/log.html`. Sunucu terminalinde `Ctrl+C` ile durdurulur.

## Fiziksel cihaz smoke testi

Appium çalışırken, repository kökünden normal kullanıcı yetkileriyle:

```bash
ANDROID_UDID=R6GL5000NTV npm --prefix tests/e2e run test:device
```

Bu serial doğrulanan Samsung telefona aittir; başka cihazda `adb devices -l`
çıktısındaki serial kullanılmalıdır. Test açıkça fiziksel cihaz seçilmesini ister
ve `emulator-` serial'larını reddeder. Kurulu uygulamayı kullanır: APK capability'si
göndermez, `noReset=true`, `fullReset=false` ve `autoGrantPermissions=false` ile
çalışır. Yalnızca sekmeler arasında gezinir; ilaç, geçmiş, stok veya hesap
kayıtlarını değiştirmez. Appium kendi otomasyon yardımcı uygulamalarını kurabilir.
Telefon açık ve kilitsiz olmalıdır.

Rapor: `tests/e2e/results/device/report.html`. Bu test kurulu **0.2.20** sürümünü
doğrular; emulator'daki **0.2.21** APK'sini telefona yüklemez.

`test:all` fiziksel cihaz için değildir. Aşağıdaki emulator senaryolarının çoğu
`fullReset` ile uygulama verisini siler; bunları kişisel telefona yönlendirmeyin.

## Emulator testleri

Emulator ve Appium bağlantısı artık hazır. APK bu cihaza kuruldu ve native ekran
ağacı incelendi. Dört sekme smoke testi şu komutla tekrar çalıştırılabilir:

```bash
npm --prefix tests/e2e run test:android
```

Bu komut için ayrı bir terminalde Appium sunucusu çalışıyor olmalı. AVD'yi
başlatmak için `npm --prefix tests/e2e run emulator` kullanılabilir; mevcut test
oturumunda emulator zaten açıktır. İlaç akışı da şu komutla tekrar çalıştırılabilir:

```bash
npm --prefix tests/e2e run test:medication
```

Kalıcı veri ve düzenleme akışı:

```bash
npm --prefix tests/e2e run test:persistence
```

Form validasyonu:

```bash
npm --prefix tests/e2e run test:validation
```

Foreground bildirim teslimi:

```bash
npm --prefix tests/e2e run test:notification
```

Background native bildirim teslimi:

```bash
npm --prefix tests/e2e run test:notification-background
```

Sunucu, smoke, ilaç, kalıcılık, validasyon, foreground ve background bildirim testlerini tek seferde çalıştırmak için:

```bash
npm --prefix tests/e2e run test:all
```

APK’yi kaynak yapılandırmasından yeniden üretmek için:

```bash
cd mobile-app/android
./gradlew assembleRelease
cd ../..
```

İlaç ve bildirim senaryoları her Appium oturumundan önce `fullReset` ile APK'yi
temiz kurduğu için test verisi oturumlar arasında taşınmaz. Smoke testi veriyi
silmez. Kalıcılık testi
`fullReset` oturumunu kapatmadığı için aynı Appium oturumunda `Terminate Application`
ve `Activate Application` kullanır; böylece Appium’un oturum sonu temizliği testin
ortasında veriyi silemez. Stok azalması, düzenleme kalıcılığı, onaylı silme,
foreground banner ve Android notification shade'de bildirimin bulunması
doğrulandı. Foreground test, JavaScript callback'i de banner ürettiği için tek
başına native teslim kanıtı değildir. Sonraki adım arka plan testinin sayısal
beklemesini ve uygulama durumu kontrolünü düzeltmek, ardından kilit ekranı ve
zamanlanmış bildirim teslimini ayrı cihaz senaryolarında ölçmektir. Emulator'da
gözlenen UiAutomator2 screenshot/Binder hatası da henüz kalıcı olarak çözülmedi.

Bu ortam uygulama veya sync sunucusunu değiştirmez. Test hesabı ve sync test
ortamı henüz yapılandırılmadı.

## Bağımlılık taraması

Son npm kurulum taraması **7 moderate** bulgu bildirdi; high/critical bulgu yok.
UiAutomator2'nin eski ana sürümündeki high/critical bulgular güncel 8.7.0 sürümüne
geçilerek giderildi. `npm audit fix --force` uygulanmadı. Bu bulgular test
araçlarının bağımlılıklarına aittir; uygulama APK'sinin güvenlik taraması değildir.
