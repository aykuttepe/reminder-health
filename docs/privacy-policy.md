# Rutin: İlaç Hatırlatıcı — Gizlilik Politikası

Son güncelleme: 27 Eylül 2026

Rutin, kullanıcıların ilaçlarını zamanında almalarını kolaylaştırmak amacıyla geliştirilmiş bağımsız bir ilaç ve randevu hatırlatıcı mobil uygulamadır. Bu Gizlilik Politikası, Google Play Store üzerinden dağıtılan **Rutin: İlaç Hatırlatıcı** (`com.aykuttepe.rutin`) uygulamasının verilerinizi nasıl koruduğunu ve işlediğini açıklar.

---

## 1. Temel İlke ve Veri Toplamama Taahhüdü

- Rutin **hiçbir kişisel veri, sağlık verisi veya kullanım analitiği toplamaz**.
- Uygulama bünyesinde herhangi bir reklam ağı, kullanıcı takip kodu (tracker) veya uzaktan telemetri aracı bulunmaz.
- Uygulamayı kullanmak için bir hesap açmanız, e-posta vermeniz veya giriş yapmanız gerekmez.
- Tüm verileriniz (ilaç adları, saatler, notlar, stok bilgileri ve kullanım geçmişi) **yalnızca telefonunuzun yerel depolama alanında** saklanır ve cihazınızdan dışarı aktarılmaz.

---

## 2. Telefonunuzda Saklanan Yerel Bilgiler

Uygulamanın temel işlevlerini yerine getirebilmesi için aşağıdaki bilgiler yalnızca cihazınızın kendi hafızasında (`AsyncStorage`) tutulur:
- **İlaç ve Dozaj Bilgileri:** İlaç adları, doz miktarları, alış saatleri, kutu stok sayıları ve açlık/tokluk tercihleri.
- **Doz Geçmişi:** Zamanında alınan, ertelenen veya atlanan dozların kayıtları.
- **Randevu Bilgileri:** Kullanıcı tarafından girilen hekim randevuları ve tahlil hatırlatıcıları.
- **Uygulama Tercihleri:** Bildirim sesleri, tema, dil ve kişisel hitap adı.

Bu veriler geliştiriciye veya herhangi bir üçüncü taraf sunucuya kesinlikle iletilmez.

---

## 3. İzinler ve Kullanım Amaçları

Rutin, işletim sisteminden yalnızca uygulamanın doğru çalışabilmesi için zorunlu olan minimum izinleri talep eder:
- **Bildirimler (`POST_NOTIFICATIONS`):** İlaç ve randevu saatlerinde zamanında bildirim gönderebilmek için.
- **Alarmlar ve Hatırlatıcılar (`SCHEDULE_EXACT_ALARM`):** Hatırlatmaların sistem kısıtlamalarına takılmadan tam saatinde çalmasını sağlamak için.
- **Kamera (`CAMERA`):** Yalnızca ilaç kutusunun üzerindeki karekod/barkodu okutarak ilacı hızlı ekleyebilmeniz için kullanılır. Kamera görüntüsü kaydedilmez, fotoğraflanmaz veya aktarılmaz; okunan barkod telefonun içindeki yerel ilaç kataloğunda eşleştirilir.
- **Başlangıçta Çalışma (`RECEIVE_BOOT_COMPLETED`):** Telefon yeniden başlatıldığında kurulmuş olan hatırlatma alarmlarının kaybolmaması ve otomatik olarak yeniden zamanlanması için.
- **Titreşim (`VIBRATE`):** Hatırlatmalarda ve arayüz etkileşimlerinde fiziksel geri bildirim sağlamak için.

---

## 4. Veri Saklama, Yedekleme ve Silme Hakları

- **Veri Silme:** İstediğiniz zaman uygulama içindeki **"Ayarlar > Veri & Sıfırlama"** seçeneğini kullanarak telefonunuzdaki tüm ilaç, geçmiş ve randevu kayıtlarını kalıcı olarak silebilirsiniz.
- **Uygulamayı Kaldırma:** Uygulamayı telefonunuzdan sildiğinizde cihazınızda tutulan tüm veriler işletim sistemi tarafından tamamen silinir.
- **Yedek Dosyası:** "Ayarlar > Yedekleme" bölümünden kendi isteğinizle oluşturabileceğiniz yedek dosyası (JSON formatında) yalnızca sizin belirleyeceğiniz konuma (kendi e-postanız, bulut sürücünüz vb.) aktarılır. Bu dosya şifrelenmemiş sağlık verisi barındırabileceğinden güvenli bir yerde muhafaza edilmelidir.

---

## 5. Tıbbi Sorumluluk Reddi (Medical Disclaimer)

Rutin bir kişisel zamanlama ve hatırlatma aracıdır; tıbbi bir cihaz veya yazılım değildir. Uygulama tıbbi teşhis, tedavi, reçete veya klinik tavsiye sunmaz. İlaç tedaviniz, dozaj değişiklikleriniz ve sağlık durumunuzla ilgili tüm kararlar için her zaman doktorunuza veya yetkili eczacınıza danışınız.

---

## 6. Çocukların Gizliliği

Rutin yetişkin kullanıcılar için tasarlanmış olup 13 yaşından küçük çocuklara yönelik değildir. 13 yaş altındaki çocuklardan bilerek herhangi bir veri toplanmaz.

---

## 7. İletişim

Bu Gizlilik Politikası veya uygulamanın veri güvenliği ile ilgili her türlü soru, geri bildirim veya talepleriniz için bizimle doğrudan iletişime geçebilirsiniz:

- **Geliştirici:** Aykut Tepe
- **E-posta:** tepe.aykut05@gmail.com
- **Proje Bağlantısı:** [GitHub Repository](https://github.com/aykuttepe/reminder-health)

---
---

# Rutin: Medication Reminder — Privacy Policy

Last updated: 27 September 2026

Rutin is an independent medication and appointment reminder application developed to help users take their medications on time. This Privacy Policy outlines how the **Rutin: Medication Reminder** (`com.aykuttepe.rutin`) application handles user privacy and data.

---

## 1. Zero Data Collection Policy

- Rutin **does not collect, transmit, or share any personal or health data**.
- There are no advertisements, analytics SDKs, tracking pixels, or remote telemetry frameworks within the application.
- No user account, registration, or login is required.
- All your medication schedules, dose histories, appointments, and inventory records remain **exclusively on your local device**.

---

## 2. Locally Stored Information

To function properly, the application stores data locally in your device's isolated storage (`AsyncStorage`):
- **Medication Data:** Names, dosages, scheduled hours, inventory counts, and meal instructions.
- **Dose History:** Logs of taken, snoozed, or skipped doses.
- **Appointments:** Doctor visits and laboratory checkup dates entered by the user.
- **Preferences:** Notification sounds, themes, language, and greeting names.

None of this information is ever uploaded to our servers or third-party servers.

---

## 3. Device Permissions

Rutin requests only the minimal permissions required for core reminder functionality:
- **Notifications (`POST_NOTIFICATIONS`):** To deliver dose and appointment alerts.
- **Exact Alarms (`SCHEDULE_EXACT_ALARM`):** To ensure critical reminders trigger precisely on time.
- **Camera (`CAMERA`):** Used solely when you open the in-app scanner to scan barcodes/QR codes on medication packaging. No images are saved or transmitted; decoded GTIN codes are resolved against the on-device catalog.
- **Boot Completed (`RECEIVE_BOOT_COMPLETED`):** To restore scheduled alarms after your device restarts.
- **Vibration (`VIBRATE`):** For tactile alerts and haptic feedback.

---

## 4. Data Retention and Deletion

- **In-App Deletion:** You can delete all your records at any time via **"Settings > Data & Reset"**.
- **Uninstalling:** Uninstalling the app permanently purges all local app data from your device.
- **Backups:** Off-device backup files created via "Settings > Backup" are saved only to destinations you explicitly choose.

---

## 5. Medical Disclaimer

Rutin is a personal scheduling and reminder tool; it is not a medical device and does not provide medical diagnosis, treatment, or advice. Always consult your physician or qualified healthcare provider regarding your medical conditions and treatment plans.

---

## 6. Children's Privacy

Rutin is intended for adult use and is not directed to children under 13. We do not knowingly collect information from children under 13.

---

## 7. Contact Information

For inquiries regarding this Privacy Policy:
- **Developer:** Aykut Tepe
- **Email:** tepe.aykut05@gmail.com
- **Repository:** [https://github.com/aykuttepe/reminder-health](https://github.com/aykuttepe/reminder-health)
