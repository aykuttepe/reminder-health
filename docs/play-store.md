# Google Play yayın rehberi — Rutin: İlaç Hatırlatıcı

Bu belge Play Console'da doldurulacak alanların hazır cevaplarını ve yayın adımlarını içerir.
Paket adı: `com.itmarti.reminder` (Play'e ilk yüklemeden sonra değiştirilemez).

## 1. Derleme ve imza

- Play için **AAB** (Android App Bundle) yüklenir, APK değil:
  ```bash
  cd mobile-app/android && ./gradlew bundlePlayRelease
  ```
  Çıktı: `mobile-app/android/app/build/outputs/bundle/playRelease/app-play-release.aab`
- `play` derleme türü yükleme anahtarıyla imzalanır. Anahtar depoda değildir:
  - Dosya: `~/Keys/rutin/rutin-upload-key.jks`
  - Şifre ve takma ad: `~/.gradle/gradle.properties` içindeki `RUTIN_UPLOAD_*` satırları
  - **Bu dosya ile o satırları birlikte yedekle** (ör. parola yöneticisi + harici disk). Kaybolursa
    Play Console > Uygulama bütünlüğü üzerinden yükleme anahtarı sıfırlama istenebilir.
- İlk yüklemede **Play App Signing**'i kabul et; asıl imza anahtarını Google saklar.
- `github` derleme türü (GitHub Releases APK) eski anahtarla imzalanmaya devam eder; mevcut kurulumlar
  güncellenmeye devam eder. İki tür aynı paket adını taşır ama imzaları farklıdır: GitHub APK'sı olan bir
  telefona Play sürümü üstüne kurulamaz (bkz. bölüm 8).

## 2. Mağaza girişi (Store listing)

- **Uygulama adı (en fazla 30):** Rutin: İlaç Hatırlatıcı
- **Kısa açıklama (en fazla 80):** İlaç saatlerini kaçırmayın: sade, reklamsız, verileriniz yalnızca telefonunuzda.
- **Tam açıklama:**

  > Rutin, ilaçlarınızı zamanında almanız için tasarlanmış sade bir hatırlatıcıdır. Büyük yazılar, net
  > düğmeler ve reklamsız bir arayüzle her yaştan kullanıcıya uygundur.
  >
  > **Neler yapabilirsiniz**
  > • İlaç ekleyin, günde birden fazla saat belirleyin; her saat için farklı doz yazabilirsiniz.
  > • Bildirimden tek dokunuşla "Aldım", "Ertele" veya "Atla" deyin.
  > • Almayı unuttuğunuz dozlar için tekrar hatırlatma alın.
  > • Gün aşırı, döngülü veya belirli süreli tedavileri planlayın.
  > • Geçmiş ekranında hangi gün hangi dozu aldığınızı görün; yanlış işaretlediğiniz kaydı düzeltin.
  > • Kutudaki ilaç sayısını takip edin, azaldığında uyarı alın.
  > • Doktor randevularınızı ve tahlil günlerinizi hatırlatıcıyla birlikte kaydedin.
  > • İlaç listenizi tek dokunuşla doktorunuzla paylaşın.
  > • İlaç kutusundaki karekodu okutarak ilacı hızlıca ekleyin.
  >
  > **Gizliliğiniz**
  > Rutin hesap açmanızı istemez, reklam veya analiz aracı içermez. Tüm bilgileriniz yalnızca telefonunuzda
  > saklanır. İsterseniz bir yedek dosyası oluşturup kendiniz saklayabilir, yeni telefonda geri
  > yükleyebilirsiniz.
  >
  > Rutin bir hatırlatma aracıdır; tıbbi tavsiye vermez. İlaç kullanımınızla ilgili kararlar için
  > doktorunuza veya eczacınıza danışın.
- **Kategori:** Tıp (Medical)
- **İletişim e-postası:** Play geliştirici hesabındaki adres (herkese açık görünür).
- **Gizlilik politikası URL'si:**
  `https://github.com/aykuttepe/reminder-health/blob/main/docs/privacy-policy.md`
  (Yayından önce dosyadaki `[İLETİŞİM E-POSTASI]` yer tutucusunu doldur.)
- **Görseller (henüz hazırlanmadı):** 512×512 simge, 1024×500 öne çıkan görsel, en az 2 telefon ekran
  görüntüsü (Bugün, İlaçlarım, Geçmiş, bildirim önerilir).

## 3. Uygulama içeriği (App content)

| Bölüm | Cevap |
|---|---|
| Uygulama erişimi | Tüm işlevler kısıtlamasız; giriş gerekmez. |
| Reklamlar | Uygulamada reklam yok. |
| İçerik derecelendirmesi | Kategori: "Referans, Haber veya Eğitim" dışı yardımcı araç; şiddet, cinsellik, kumar, kullanıcı etkileşimi, konum paylaşımı yok. Uygulama ilaç satmaz ve kontrollü madde tanıtmaz. |
| Hedef kitle | 18 yaş ve üzeri (çocuklara yönelik değil; Aile politikası kapsamı dışında kalır). |
| Haber uygulaması | Hayır |
| COVID-19 uygulaması | Hayır |
| Devlet uygulaması | Hayır |
| Finansal özellikler | Yok |
| Sağlık uygulamaları beyanı | "İlaç ve tedavi yönetimi" (Medication and treatment management). Tıbbi cihaz değildir, teşhis/tedavi önermez. |

### Veri güvenliği (Data safety)

Play derlemesi hiçbir veriyi cihaz dışına göndermez: bulut eşitleme kapalı (`CLOUD_SYNC_AVAILABLE = false`),
GitHub güncelleme denetimi yok, barkod yalnızca telefondaki katalogda aranır (`IS_STORE_BUILD`).

- Uygulama kullanıcı verisi topluyor veya paylaşıyor mu? **Hayır.**
- Veriler aktarım sırasında şifreleniyor mu? Veri aktarılmadığı için soru kapsam dışı kalır.
- Kullanıcı verilerinin silinmesini istemek: Uygulama içinden "Ayarlar > Veri & Sıfırlama" ile tüm veriler
  silinir; hesap yoktur.

> Bulut eşitleme, sunucudan barkod sorgusu veya hata raporu gönderimi ileride açılırsa bu form ve gizlilik
> politikası **aynı sürümde** güncellenmelidir (sağlık bilgisi toplanmış olur). Hesap oluşturma geri
> gelirse Play, uygulama içinden ve web'den hesap silme yolu da ister.

## 4. İzin gerekçeleri

| İzin | Neden | Play durumu |
|---|---|---|
| POST_NOTIFICATIONS | İlaç ve randevu hatırlatmaları | Normal (çalışma anında sorulur) |
| SCHEDULE_EXACT_ALARM | Hatırlatmaların tam saatinde gelmesi | Kullanıcı "Alarmlar ve hatırlatıcılar" ayarından verir |
| RECEIVE_BOOT_COMPLETED | Telefon yeniden başlayınca hatırlatmaları geri kurmak | Normal |
| CAMERA | İlaç kutusu karekodunu okumak | Normal (çalışma anında sorulur) |
| VIBRATE, WAKE_LOCK | Uyarı titreşimi, bildirim anında ekran | Normal |
| INTERNET | Kütüphanelerin varsayılanı; Play derlemesi veri göndermez | Normal |

Play derlemesinden çıkarılanlar: `USE_EXACT_ALARM` (yalnızca alarm/takvim uygulamalarına verilir),
`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (politika istisnası gerektirir), `REQUEST_INSTALL_PACKAGES`,
`SYSTEM_ALERT_WINDOW`.

## 5. Test ve yayın sırası

1. Play Console'da uygulamayı oluştur (ad, varsayılan dil Türkçe, uygulama, ücretsiz).
2. Bölüm 3'teki formları doldur, mağaza girişini ve görselleri ekle.
3. **Dahili test** kanalına AAB yükle, kendi Google hesabını test kullanıcısı olarak ekle, Play'den kur.
4. **Kapalı test:** 2023 Kasım sonrası açılan kişisel geliştirici hesapları, üretime çıkmadan önce en az
   **12 test kullanıcısıyla 14 gün** kesintisiz kapalı test yapmak zorundadır. Aile ve arkadaşlardan
   test kullanıcısı listesi hazırla.
5. Kapalı test tamamlanınca üretim erişimi başvurusu yap, onaydan sonra üretim sürümünü yayınla.

Her yeni sürümde `versionCode` artmalıdır (app.json `android.versionCode`); GitHub ve Play aynı numarayı
kullanabilir.

## 6. Sürüm akışı

- GitHub: `vX.Y.Z` etiketi → CI `assembleGithubRelease` → GitHub Release'e `app-release.apk`.
- Play: aynı commit'ten yerelde `./gradlew bundlePlayRelease` → AAB'yi Play Console'a yükle.

## 7. Bilinen sınırlama: tam saatinde alarm

Android 14 ve üzerinde, Play'den yeni kurulan uygulamaya "Alarmlar ve hatırlatıcılar" izni varsayılan
olarak kapalı gelir. İzin verilmezse Android hatırlatmaları geciktirir: emulator'da izin kapalıyken
`notification-schedule` 3/3 ve 3 dakikalık erteleme testi başarısız oldu, izin açılınca geçti. Bu yüzden
izin kapalıyken Bugün ekranında "Hatırlatmalar gecikebilir" uyarısı çıkar ve dokununca izin ekranı açılır;
izin verildiğinde mevcut alarmlar tam saatli olarak yeniden kurulur. İzin ayrıca "Ayarlar > Alarm
Güvenilirliği > Tam saatinde çalma" bölümünden açılabilir.

## 8. GitHub APK kullanan telefonların Play'e geçişi

İmza anahtarları farklı olduğu için Play sürümü GitHub APK'sının üstüne kurulamaz. Tek seferlik geçiş:

1. Rutin'de "Ayarlar > Yedekleme > Yedek Dosyası Oluştur" ile yedeği telefon dışına kaydet.
2. GitHub'dan kurulan Rutin'i kaldır.
3. Play Store'dan Rutin'i kur.
4. "Yedekten Geri Yükle" ile dosyayı seç.
5. "Ayarlar > Alarm Güvenilirliği" bölümünden izinleri yeniden ver.
