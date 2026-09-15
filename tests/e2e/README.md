# Android test ortamı

Bu klasör Reminder Health için ayrı bir Python + Robot Framework + Appium ortamıdır.
Uygulamanın npm bağımlılıklarını veya global shell ayarlarını değiştirmez.

## Bildirim aksiyonları ve gerçek plan saati — 15 Eylül 2026 (v0.2.22)

- Android **15 / API 35** (`emulator-5554`), kurulu **0.2.22 / versionCode 23**. Tüm senaryolar
  `fastReset` ile temiz veriyle çalışır; fiziksel cihazı `EmulatorNotificationProbe.py` reddeder.
- `notification_actions.robot` (ayarlardaki test bildirimi ilk ilacın kimliği ve saatini taşır,
  bu yüzden butonlar planlı hatırlatmayla aynı `App.tsx` işleyicisine gider):
  - "✅ İlaç İçildi" (uygulama arka planda): stok 30 → 29, Geçmiş'te "Alındı"; Bugün ekranından
    "Yanlış işaretledim" ile stok 30'a iade edildi — **passed**.
  - "❌ Atla": Geçmiş'te "Atlandı", stok 30 kaldı — **passed**.
  - "⏱️ 3 Dk Ertele": `dose-*-snooze` bildirimi 3 dakika sonra butonlarıyla geldi; oradan
    "İlaç İçildi" stoğu 29'a düşürdü — **passed**.
  - Uygulama süreci `am kill` ile öldürüldükten sonra "✅ İlaç İçildi": ilk APK'da doz kaydedilmedi
    (Bugün "1 dozdan 0'ı alındı", stok 30; üç koşuda tekrarlandı, kanıt
    `results/notification-actions-cold/`). Neden: yanıt, doz listesi yüklenmeden işleniyor ve
    uygulamayı açan yanıt ayrıca okunmuyordu.
  - **Düzeltme** (`mobile-app/App.tsx`, `src/notifications.ts`): yanıtlar doz listesi yüklenene
    kadar sırada tutulur, ardından `getLastNotificationResponse` ile birlikte bir kez işlenir;
    işleyici güncel dil/titreşim ayarlarını ref üzerinden kullanır. Düzeltilmiş APK'da soğuk açılış
    testi **4/4 passed** ("1 dozdan 1'i alındı", stok 29; `results/notification-actions-fix-cold-r*`).
    Paketin diğer üç testi aynı APK'da **passed** (`results/notification-actions-fix/`).
  - Süreç öldürüldükten sonra UiAutomator bir süre launcher ağacını raporlayabildiği için panel
    `cmd statusbar expand-notifications` ile yeniden denenerek açılır.
- **Silinen ilaç hatırlatmaya devam ediyordu** (fiziksel cihaz testinde bulundu): silinen ilaçlar senkron
  için `deletedAt` işaretiyle listede kalıyor, bildirim planlayıcısı bu işarete bakmadığı için 30 günlük
  plan boyunca ana ve tekrar hatırlatmaları kurulmaya devam ediyordu. Telefonda silinmiş test dozları için
  `repeat-10`'a kadar bildirim geldi. Düzeltme `mobile-app/src/medicationPlan.ts` `isDoseActive`;
  birim testi düzeltmeden önce başarısız, sonra **passed**; `notification_schedule.robot` içindeki
  "Deleted Medication Stops Reminding" emulator'da **passed** (ilaç silindikten sonra slotunda bildirim yok).
  Ekrana düşmüş eski bildirimler silme ile kapanmaz; yalnızca yeni hatırlatmalar engellenir.
- `notification_schedule.robot` (emulator saatinden 3 dakika sonrasına planlanan gerçek doz,
  ekran kapalı ve uygulama arka planda):
  - Ana hatırlatma planlanan dakikadan **52 ms** (düzeltme sonrası tekrar: **54 ms**) sonra sisteme düştü; "İlaç İçildi" stoğu 29'a
    düşürdü ve +3 dk tekrar bildirimi gelmedi — **passed**.
  - Kontrol: işaretlenmeyen dozda ilk tekrar +3 dk'dan **162 ms** (tekrar: **169 ms**) sonra geldi, stok 30 kaldı —
    **passed**. Böylece "tekrar gelmedi" sonucu boşuna geçmiyor.
  - Gecikme `dumpsys notification` içindeki `mUpdateTimeMs` ile ölçülür; ekran kapalıdır ama
    emulator'da PIN yoktur, Doze/pil optimizasyonu altındaki teslim bu ölçümün kapsamı dışındadır.
- Ayrıştırıcı birim testleri: `npm --prefix tests/e2e run test:probe` — **7 test passed**.
- `test:all` zinciri düzeltilmiş APK'da tekrar **11 test, 11 passed** verdi (önceki koşu 20:51–20:54,
  aynı sonuç). Mobil unit testleri **31 passed** (2'si yeni), kök paket **67 passed**, runtime
  bütünlük kontrolü **28 korunan dosya** geçti.

## Son tekrar — 15 Eylül 2026 (v0.2.22)

- Android **15 / API 35** (`emulator-5554` / Pixel 7), kurulu release binary **0.2.22 / versionCode 23**.
- Geri alma akışı ve görünür düzeltme seçenekleri doğrulandı (`medication_undo.robot`): **1 passed, 0 failed**.
  - Toast üzerinden anında "Geri Al": Stok 29'dan tekrar 30'a iade edildi, doz Bugün ekranında bekleyen duruma döndü.
  - Bugün ekranı "Alınan Dozlar" → "Yanlış işaretledim" onaylı geri alma: Stok 29'dan 30'a iade edildi, doz bekleyen duruma döndü.
  - Geçmiş ekranı "Yanlış işaretledim" onaylı geri alma: Stok 29'dan 30'a iade edildi, doz Bugün ekranında bekleyen duruma döndü.
- Sunucu eşitleme doğrulaması (`server/tests/dose-undo-sync.test.mjs`): Geri alınan kayıt, eski istemciden gelen stale "alındı" verisi replay edildiğinde korundu, stok 30 olarak kaldı, hesap ayrımı doğrulandı: **7 test passed**.
- Mobil unit testleri (`mobile-app/tests/*.test.cjs`): Doz geri alma, stok iadesi, slot geçersizliği ve stale senkronizasyon dahil **29 test passed**.
- Kök test paketi: **67 test passed**. Runtime bütünlük kontrolü: **28 korunan dosya geçti**.
- Emulator akış ekran görüntüsü kaydedildi: `tests/e2e/results/undo/medication-undo-flow.png`.

## Önceki tekrar — 15 Eylül 2026

- Samsung **SM-A376B**, Android **16 / API 36**, kurulu uygulama **0.2.21 / versionCode 22**; bildirim izni açık.
- Gerçek cihaz arka plan ve kilitli bildirim testi: **2 passed, 0 failed**. Ölçüm başlangıcından yeni sistem kaydına kadar süreler sırasıyla **5148 ms** ve **5154 ms**. Her iki bildirim de arka plan/kilit durumu doğrulandıktan sonra geldi.
- Rapor: `results/device-notifications-20260915/report.html`. Bunlar 3 saniyelik test bildiriminin teslim kontrolleridir; gerçek ilaç planı saatinde teslim ve bildirim aksiyonları henüz kapsamda değildir.
- Bildirim kaydı ayrıştırıcısı: **4 unit test geçti**. Appium HTTP bağlantısı: **1 test geçti** (`results/server-20260915/report.html`). Runtime bütünlük kontrolü: **28 korunan dosya geçti**.
- APK yüklenmedi, uygulama verisi sıfırlanmadı ve ayarlar değiştirilmedi. Test sonunda ekran uyandırıldı; kilit kullanıcı tarafından açılmalıdır.

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
- `npm run test:all` zinciri (`server` + `android` + `medication` + `persistence` + `validation` + `notification` + `notification-background`) `fastReset` (`pm clear`) ve doğrudan kurulu paket kullanımı ile toplam **10 test, 10 passed, 0 failed** verdi. Her oturumda APK aktarımı kaldırıldı; bu sonuç UiAutomator2 kilitlenme riskinin kalıcı olarak giderildiğini kanıtlamaz.
- Fiziksel Samsung **SM-A376B**, Android **16 / API 36** üzerinde `android_device_notifications.robot` ile arka plan ve kilit ekranı teslimi **2 passed, 0 failed** verdi. 14 Eylül 22:49 tarihli `results/device-notifications/output.xml` kaydında, ölçüm başlangıcından yeni Android `tag=test-med-main` kaydına kadar geçen süre arka planda **5158 ms**, kilitliyken **5252 ms**. Uygulamanın arka plan durumu (`state=3`) ve kilitli senaryoda keyguard görünürlüğü (`showing=true`) bildirimden önce ve sonra kontrol edildi. Bu süreler UI tıklama ve ADB işlem süresini de içerir; yalnızca Android zamanlayıcı gecikmesi değildir.
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

Rapor: `tests/e2e/results/device/report.html`. Bu test telefonda kurulu sürümü
doğrular; APK yüklemez. İlk testler **0.2.20**, son kayıtlı smoke testi **0.2.21**
üzerindedir. Yeni çalıştırmalardan önce kurulu sürüm ayrıca kontrol edilmelidir.

`test:all` fiziksel cihaz için değildir. Aşağıdaki emulator senaryolarının çoğu
`noReset=false` ile uygulama verisini siler; bunları kişisel telefona yönlendirmeyin.

## Fiziksel cihazda gerçek hatırlatma ve bildirim butonları (veri değiştirir)

Yalnızca cihaz sahibinin onayıyla çalıştırılır. Telefon USB ile bağlı, kilidi açık ve Appium
çalışırken, gece yarısına en az 20 dakika varken:

```bash
ANDROID_UDID=R6GL5000NTV npm --prefix tests/e2e run test:device-medication-actions
```

Gerçek hesaba `E2E Test A silinecek` ve `E2E Test B silinecek` adlı iki ilaç ekler; senkron açıksa
bunlar sunucuya da gider. Ayarlardaki test bildirimini kullanmaz (o bildirim listedeki ilk gerçek
ilacı hedefler). Bildirim butonuna basmadan önce uygulamanın başka bir doz için aktif hatırlatması
varsa test durur. Stok, ilacın kendi düzenleme ekranındaki "Kalan Stok (adet)" alanından okunur;
düzenleyici kaydetmeden kapatılır. Test başarısız olsa bile yalnızca bu koşunun eklediği ilaçlar
sonunda silinir. Ekran görüntüsü veya UI dökümü kaydedilmez. Bekleme sırasında ekranın PIN
kilidine düşmemesi için yalnızca `KEYCODE_WAKEUP` gönderilir; hiçbir ayar değiştirilmez.

Son durum (16 Eylül 2026 00:22–00:40, Samsung SM-A376B, Android 16, 0.2.23): gerçek hatırlatmalar
uygulama arka plandayken slotundan **76–300 ms**, ilk tekrarlar **86–134 ms** sonra sisteme düştü;
test stoğu doğru okundu ve test ilaçları her testten sonra silindi. One UI bildirimleri grupladığı
için "İlaç İçildi" butonu görünmedi, butona basılmadı: iki senaryo da **failed** ve soğuk açılış
düzeltmesi telefonda henüz doğrulanmadı. Bir önceki sürümdeki geniş genişletme seçicisi başka bir
uygulamanın bildirimine tıkladı; seçici artık yalnızca bu uygulamanın hatırlatma satırındaki genişletme
butonunu hedefler (Samsung'da henüz doğrulanmadı). Aynı koşuda silinen ilaçların tekrar bildirimleri
gelmeye devam etti; bu hata düzeltildi ve telefona gidecek sürüm 0.2.24 olarak yayınlandı
(v0.2.23 etiketi aynı düzeltmeleri içerir; telefona önce silme düzeltmesi olmayan yerel bir 0.2.23 kurulmuştu).

1. Planlı hatırlatma gecikmesi ölçülür, "İlaç İçildi" test stoğunu 30 → 29 yapar, +3 dk tekrar gelmez.
2. İşaretlenmeyen dozun ilk tekrarı gelir (tekrar ayarının açık olduğunu kanıtlar), uygulama süreci
   `am kill` ile kapatılır ve bildirimden "İlaç İçildi" yine kaydedilir.

## Fiziksel cihaz bildirim testi

Telefon USB ile bağlı, kilidi açık ve Appium çalışırken repository kökünden:

```bash
ANDROID_UDID=R6GL5000NTV npm --prefix tests/e2e run test:device-notifications
```

Bu senaryo kurulu uygulamanın test bildirimi düğmesini kullanır. İlaç, doz,
stok ve hesap kayıtlarını değiştirmez; uygulamayı kurmaz veya sıfırlamaz.
Önce Home ile arka plana geçer, ikinci testte ekranı da kilitler. Yeni Android
bildirim kaydını önceki zaman damgasıyla karşılaştırır; eski bildirimler ve
uygulama içi banner başarı sayılmaz. Otomatik screenshot alınmaz; ham bildirim
dökümü rapora yazılmaz. Test sonrasında kilit ekranı uyanır; gerekiyorsa kullanıcı
kilidi kendisi açar. PIN veya güvenlik ayarları değiştirilmez.

Test bildirimi ses çıkarabilir; uygulamada tekrar açıksa üç dakika sonra ek test
bildirimi gelebilir. Diğer bildirimler temizlenmez. Bu test, test bildiriminin
keyguard görünürken işletim sistemine teslimini ölçer; kilit ekranındaki görsel
yerleşimi, PIN güvenliğini, gerçek ilaç planı saatini veya bildirim aksiyonlarını
doğrulamaz.

Rapor: `tests/e2e/results/device-notifications/report.html`. Bildirim kaydı
ayrıştırıcısının cihaz gerektirmeyen kontrolleri:

```bash
cd tests/e2e
.venv/bin/python -m unittest -v test_notification_probe.py
```

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

Bildirim butonları (İlaç İçildi, Atla, Ertele, süreç öldürüldükten sonra İlaç İçildi; ~8 dk):

```bash
npm --prefix tests/e2e run test:notification-actions
```

Gerçek plan saatinde teslim ve tekrar bildirimi (~12 dk; gece yarısına 5 dakikadan az kala çalışmaz):

```bash
npm --prefix tests/e2e run test:notification-schedule
```

Bu iki paket `test:all` zincirine eklenmedi: soğuk açılış senaryosu bilinen hata nedeniyle
düzeltmeden önce başarısızdı ve plan testi uzun sürüyor; eklenmesi ayrı bir karardır.

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

Emulator ilaç ve bildirim senaryoları kurulu paketi `noReset=false`,
`fullReset=false` ile temizler (`fastReset`); test verisi oturumlar arasında
taşınmaz. APK emulator'a önceden kurulmuş olmalıdır. Smoke testi veriyi silmez.
Kalıcılık testi aynı Appium oturumunda `Terminate Application` ve
`Activate Application` kullanarak uygulamayı yeniden açar. Stok azalması,
düzenleme kalıcılığı, onaylı silme,
foreground banner ve Android notification shade'de bildirimin bulunması
doğrulandı. Foreground test, JavaScript callback'i de banner ürettiği için tek
başına native teslim kanıtı değildir. Arka plan testinin bekleme ve uygulama
durumu kontrolleri düzeltildi. Gerçek plan saatinde teslim ve bildirim aksiyonlarının
geçmiş/stok etkisi artık `notification_schedule.robot` ve `notification_actions.robot` ile
ölçülüyor; soğuk açılışta kaybolan "İlaç İçildi" aksiyonu emulator'da düzeltildi. Emulator'da
gözlenen UiAutomator2 screenshot/Binder hatası da henüz kalıcı olarak çözülmedi.

Bu ortam uygulama veya sync sunucusunu değiştirmez. Test hesabı ve sync test
ortamı henüz yapılandırılmadı.

## Bağımlılık taraması

Son npm kurulum taraması **7 moderate** bulgu bildirdi; high/critical bulgu yok.
UiAutomator2'nin eski ana sürümündeki high/critical bulgular güncel 8.7.0 sürümüne
geçilerek giderildi. `npm audit fix --force` uygulanmadı. Bu bulgular test
araçlarının bağımlılıklarına aittir; uygulama APK'sinin güvenlik taraması değildir.
