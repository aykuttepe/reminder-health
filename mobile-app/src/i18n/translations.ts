export type Language = 'tr' | 'en';

export const STORAGE_KEY_LANGUAGE = 'reminder_health_language_v1';

export interface Translations {
  // Tabs
  tabToday: string;
  tabMedicines: string;
  tabHistory: string;
  tabSettings: string;

  // Header & Status
  appTitle: string;
  defaultGreeting: string;
  greetingPrefix: string;
  allDone: string;
  progressDone: string;
  todayScheduleReady: string;

  // Empty States
  noMedsTodayTitle: string;
  noMedsTodayDesc: string;
  noMedsRecordedTitle: string;
  noMedsRecordedDesc: string;
  addFirstMedicine: string;
  addMedicine: string;

  // Actions
  take: string;
  taken: string;
  skip: string;
  skipped: string;
  snooze: string;
  snoozed: string;
  undo: string;
  close: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  saveChanges: string;
  savePlan: string;
  revertStatus: string;
  share: string;
  export: string;
  import: string;
  clear: string;
  refresh: string;
  retry: string;
  test: string;
  revertLog: string;

  // Card Badges & Info
  nextDose: string;
  plannedDose: string;
  restOfDay: string;
  todayTakenList: string;
  hideList: string;
  showList: string;
  stock: string;
  criticalStock: string;
  remaining: string;
  refill30: string;
  timeLabel: string;

  // Meal Conditions
  mealTok: string;
  mealAc: string;
  mealYemekle: string;
  mealFarketmez: string;

  // Medicine Forms
  formTablet: string;
  formKapsul: string;
  formDamla: string;
  formSurup: string;

  // Frequencies
  freqEveryday: string;
  freqAlternate: string;
  freqCycle: string;
  freqVariable: string;

  // Durations
  durationContinuous: string;
  durationDays: string;
  durationBadgeContinuous: string;
  durationNotStarted: string;
  durationCompleted: string;

  // Add/Edit Modal
  modalAddTitle: string;
  modalEditTitle: string;
  medName: string;
  medNamePlaceholder: string;
  doseAmount: string;
  doseAmountPlaceholder: string;
  doseAmountDefault: string;
  medForm: string;
  mealCondition: string;
  timesPerDay: string;
  addTime: string;
  removeTime: string;
  slotAmountLabel: string;
  slotAmountPlaceholder: string;
  instructions: string;
  instructionsPlaceholder: string;
  stockTracking: string;
  stockRemainingLabel: string;
  stockThresholdLabel: string;
  scanBarcodeBanner: string;
  scanBarcodeDesc: string;
  itsMatched: string;
  subTabPlan: string;
  subTabStock: string;
  stockTriageCritical: string;
  stockTriageLow: string;
  stockTriageGood: string;
  stockDaysLeft: string;
  stockRunOut: string;
  stockRunOutDate: string;
  stockAddBox: string;
  stockDailyConsumption: string;
  stockFilterAll: string;
  stockFilterCritical: string;
  stockFilterLow: string;
  stockFilterGood: string;
  stockEmptyTitle: string;
  stockEmptyDesc: string;
  stockUnitPiece: string;

  // Settings Menu
  settings: string;
  settingsProfile: string;
  settingsProfileDesc: string;
  profileUserSection: string;
  userNameLabel: string;
  userNameDesc: string;
  userNamePlaceholder: string;
  doctorNameLabel: string;
  doctorSpecialtyLabel: string;
  doctorHospitalLabel: string;
  doctorCallButton: string;
  doctorAppointmentSection: string;
  doctorAppointmentLabel: string;
  doctorAppointmentTimeLabel: string;
  doctorSelectAppointment: string;
  doctorClearAppointment: string;
  doctorLeadReminderLabel: string;
  doctorLeadReminderSub: string;
  leadOpt3d: string;
  leadOpt2d: string;
  leadOpt1d: string;
  leadOpt0d: string;
  leadOpt2h: string;
  leadOpt1h: string;
  doctorBloodTestSection: string;
  doctorBloodTestLabel: string;
  doctorSelectBloodTest: string;
  doctorClearBloodTest: string;
  doctorSnoozedToast: string;
  doctorNotesSection: string;
  doctorShareMedList: string;
  doctorShareSubject: string;
  doctorShareActiveMeds: string;
  doctorShareNoMeds: string;
  settingsNotifications: string;
  settingsNotificationsDesc: string;
  settingsReminders: string;
  settingsRemindersDesc: string;
  settingsReliability: string;
  settingsReliabilityDesc: string;
  settingsStock: string;
  settingsStockDesc: string;
  settingsPrivacy: string;
  settingsPrivacyDesc: string;
  settingsExperience: string;
  settingsExperienceDesc: string;
  settingsSync: string;
  settingsSyncDesc: string;
  settingsBackup: string;
  syncServerUrl: string;
  syncConnectedAccount: string;
  syncDisconnect: string;
  syncEmailLabel: string;
  syncEmailPlaceholder: string;
  syncUpdateEmail: string;
  syncEmailSaved: string;
  syncCodeLabel: string;
  syncCodePlaceholder: string;
  syncConnectBtn: string;
  syncForgotCode: string;
  syncRecoveryKeyLabel: string;
  syncRecoveryKeyPlaceholder: string;
  syncRecoverBtn: string;
  syncNewCredentialsTitle: string;
  syncNewSyncCode: string;
  syncNewRecoveryKey: string;
  syncCopy: string;
  syncCopied: string;
  syncNewCredentialsWarning: string;
  syncIntervalLabel: string;
  syncIntervalSub: string;
  syncIntervalMinute: string;
  syncCustomInterval: string;
  syncCustomIntervalRange: string;
  autoSyncTitle: string;
  autoSyncDesc: string;
  autoSyncEnabledToast: string;
  autoSyncDisabledToast: string;
  settingsDiagnostics: string;
  settingsDiagnosticsDesc: string;
  settingsLanguage: string;
  settingsLanguageDesc: string;
  settingsReset: string;
  settingsResetDesc: string;

  // Language Subpage
  languageTitle: string;
  languageSubtitle: string;
  langTurkish: string;
  langEnglish: string;
  langChangedToast: string;

  // History
  adherenceTitle: string;
  weeklyProgress: string;
  noHistory: string;

  // Diagnostics
  diagHealthStatus: string;
  diagAllOk: string;
  diagErrorsCount: string;
  diagRecordsCount: string;
  diagShareExport: string;
  diagClear: string;
  diagSimulateWarn: string;
  diagSimulateError: string;
  diagFilterAll: string;
  diagFilterErrors: string;
  diagFilterWarnings: string;
  diagCleanTitle: string;
  diagCleanDesc: string;
  diagDetails: string;
  diagBreadcrumbs: string;
  diagStackTrace: string;

  // Toasts
  toastDoseTaken: string;
  toastDoseSkipped: string;
  toastDoseSnoozed: string;
  toastMedSaved: string;
  toastMedDeleted: string;
  toastSyncSuccess: string;
  toastSyncFailed: string;
  toastResetSuccess: string;
  confirmDeleteTitle: string;
  confirmDeleteDesc: string;
  confirmResetTitle: string;
  confirmResetDesc: string;

  // Backup & restore ({placeholders} are filled in App.tsx)
  backupTitle: string;
  backupDesc: string;
  backupExport: string;
  backupImport: string;
  backupExportFailed: string;
  backupShareUnavailable: string;
  backupReadFailed: string;
  backupErrorTooLarge: string;
  backupErrorInvalidJson: string;
  backupErrorNotObject: string;
  backupErrorVersion: string;
  backupErrorNoDoses: string;
  backupErrorInvalidDose: string;
  backupErrorInvalidAppointments: string;
  backupForeignAccount: string;
  restoreConfirmTitle: string;
  restoreConfirmDesc: string;
  restoreConfirmNoAppointments: string;
  restoreConfirmSyncNote: string;
  restoreAction: string;
  restoreSuccess: string;
  restoreBusy: string;

  // Cloud master switch
  cloudSyncTitle: string;
  cloudSyncOnDesc: string;
  cloudSyncOffDesc: string;
  localModeBackupHint: string;
  toastCloudOn: string;
  toastCloudOff: string;
  settingsSyncLocalDesc: string;

  // Alarm reliability page
  reliabilityIntro: string;
  reliabilityBatteryTitle: string;
  reliabilityBatteryDesc: string;
  reliabilityExactTitle: string;
  reliabilityExactDesc: string;
  reliabilityVendorTitle: string;
  reliabilityVendorDesc: string;
  reliabilityOpenSettings: string;
  reliabilityOpened: string;
  reliabilityTestButton: string;
  reliabilityTestToast: string;
  exactAlarmBannerTitle: string;
  exactAlarmBannerText: string;
  storageReadFailed: string;
  settingsExperienceSection: string;
  autoCollapseTitle: string;
  autoCollapseDesc: string;
  errorBoundaryTitle: string;
  errorBoundaryText: string;
  errorBoundaryDetail: string;
  errorBoundaryNoDetail: string;
  errorBoundaryRetry: string;
  errorBoundaryShare: string;
}

export const translations: Record<Language, Translations> = {
  tr: {
    // Tabs
    tabToday: 'Bugün',
    tabMedicines: 'İlaçlarım',
    tabHistory: 'Geçmiş',
    tabSettings: 'Ayarlar',

    // Header & Status
    appTitle: 'Reminder Health',
    defaultGreeting: 'Sana uygun bir rutin.',
    greetingPrefix: 'Merhaba',
    allDone: '🎉 Bugünkü tüm ilaçlar alındı',
    progressDone: 'tamamlandı',
    todayScheduleReady: 'Günün ilaç planı hazır',

    // Empty States
    noMedsTodayTitle: 'Henüz İlaç Eklenmedi',
    noMedsTodayDesc: 'Bugün için planlanmış bir dozunuz bulunmuyor. Yeni bir ilaç ekleyerek rutininizi oluşturun.',
    noMedsRecordedTitle: 'Kayıtlı İlaç Yok',
    noMedsRecordedDesc: 'Henüz herhangi bir ilaç kaydetmediniz. Kutunun üzerindeki karekodu tarayarak veya manuel ekleyerek başlayabilirsiniz.',
    addFirstMedicine: '+ İlk İlacını Ekle',
    addMedicine: '+ Yeni İlaç Ekle',

    // Actions
    take: 'Al',
    taken: 'Alındı',
    skip: 'Atla',
    skipped: 'Atlandı',
    snooze: 'Ertele',
    snoozed: 'Ertelendi',
    undo: 'Geri Al',
    close: 'Kapat',
    save: 'Kaydet',
    cancel: 'Vazgeç',
    delete: 'İlacı Sil',
    edit: 'Düzenle',
    saveChanges: 'Değişiklikleri Kaydet',
    savePlan: 'Planı Kaydet',
    revertStatus: 'Geri Alındı',
    share: 'Paylaş',
    export: 'Dışa Aktar',
    import: 'İçe Aktar',
    clear: 'Temizle',
    refresh: 'Yenile',
    retry: 'Yeniden Dene',
    test: 'Test Et',
    revertLog: 'kaydı geri alındı',

    // Card Badges & Info
    nextDose: 'Sıradaki Doz',
    plannedDose: 'Planlı Doz',
    restOfDay: 'Günün Kalanı',
    todayTakenList: 'Bugün Alınanlar',
    hideList: 'Gizle',
    showList: 'Göster',
    stock: 'Stok',
    criticalStock: 'Kritik Stok!',
    remaining: 'Kalan',
    refill30: '+30 Kutu Yenile',
    timeLabel: 'Saat',

    // Meal Conditions
    mealTok: 'Tok karnına',
    mealAc: 'Aç karnına',
    mealYemekle: 'Yemekle birlikte',
    mealFarketmez: 'Fark etmez',

    // Medicine Forms
    formTablet: 'Tablet',
    formKapsul: 'Kapsül',
    formDamla: 'Damla',
    formSurup: 'Şurup',

    // Frequencies
    freqEveryday: 'Her gün',
    freqAlternate: 'Gün aşırı',
    freqCycle: 'Al / Ara Döngüsü',
    freqVariable: 'Değişken Doz',

    // Durations
    durationContinuous: 'Sürekli (Kronik)',
    durationDays: 'Süreli Tedavi (Kür)',
    durationBadgeContinuous: 'Sürekli Kullanım',
    durationNotStarted: 'Henüz Başlamadı',
    durationCompleted: 'Tedavi Tamamlandı',

    // Add/Edit Modal
    modalAddTitle: 'Yeni İlaç Ekle',
    modalEditTitle: 'İlacı Düzenle',
    medName: 'İlaç Adı',
    medNamePlaceholder: 'Örn. Coraspin',
    doseAmount: 'Doz Miktarı',
    doseAmountPlaceholder: 'Örn. 1 adet',
    doseAmountDefault: '1 adet',
    medForm: 'İlaç Formu',
    mealCondition: 'Açlık / Tokluk Durumu',
    timesPerDay: 'Günlük Doz Saatleri',
    addTime: '+ Saat Ekle',
    removeTime: 'Kaldır',
    slotAmountLabel: 'Bu Saatin Doz Miktarı',
    slotAmountPlaceholder: 'Örn. 2 tablet (farklıysa girin)',
    instructions: 'Talimatlar & Notlar',
    instructionsPlaceholder: 'Örn. Bol su ile çiğnemeden içiniz.',
    stockTracking: 'Kutu & Stok Takibi',
    stockRemainingLabel: 'Kalan Stok (adet)',
    stockThresholdLabel: 'Kritik Stok Uyarısı (adet)',
    scanBarcodeBanner: 'Karekod / Kutu Tara (ITS)',
    scanBarcodeDesc: 'Kutudaki DataMatrix karekoddan adı ve SKT\'yi otomatik doldur',
    itsMatched: 'ITS Karekod Eşleşti',
    subTabPlan: 'Tedavi Planı',
    subTabStock: 'Stok & Envanter',
    stockTriageCritical: 'Kritik / Tükendi',
    stockTriageLow: 'Azalıyor',
    stockTriageGood: 'Yeterli',
    stockDaysLeft: 'gün kaldı',
    stockRunOut: 'Tükendi',
    stockRunOutDate: 'Tahmini bitiş',
    stockAddBox: '+1 Kutu',
    stockDailyConsumption: 'Günlük',
    stockFilterAll: 'Tümü',
    stockFilterCritical: 'Kritikler (≤7g)',
    stockFilterLow: 'Azalanlar (≤14g)',
    stockFilterGood: 'Yeterliler',
    stockEmptyTitle: 'Kayıtlı İlaç Bulunamadı',
    stockEmptyDesc: 'Stok takibi için önce bir ilaç ekleyin.',
    stockUnitPiece: 'adet',

    // Settings Menu
    settings: 'Ayarlar',
    settingsProfile: 'Kullanıcı Profili',
    settingsProfileDesc: 'Profil, hekim ve hastane bilgileri',
    profileUserSection: 'KULLANICI BİLGİSİ',
    userNameLabel: 'Kullanıcı İsmi / Hitap',
    userNameDesc: 'Ana ekranda ve bildirimlerde size nasıl hitap edileceğini belirleyin',
    userNamePlaceholder: 'Adınızı giriniz...',
    doctorNameLabel: 'Doktor Adı / Ünvanı',
    doctorSpecialtyLabel: 'Uzmanlık / Branş',
    doctorHospitalLabel: 'Hastane / Klinik',
    doctorCallButton: 'Doktoru Ara',
    doctorAppointmentSection: 'RANDEVU & KONTROL',
    doctorAppointmentLabel: 'Sonraki Randevu Tarihi',
    doctorAppointmentTimeLabel: 'Randevu Saati',
    doctorSelectAppointment: 'Randevu Tarihi Seçin',
    doctorClearAppointment: 'Randevuyu Temizle',
    doctorLeadReminderLabel: 'Önceden Hatırlatıcılar (Çoklu Seçim)',
    doctorLeadReminderSub: 'Randevu öncesinde istediğiniz zaman dilimlerini seçebilirsiniz',
    leadOpt3d: '3 Gün Önce',
    leadOpt2d: '2 Gün Önce',
    leadOpt1d: '1 Gün Önce',
    leadOpt0d: 'Randevu Sabahı (05:00)',
    leadOpt2h: '2 Saat Önce',
    leadOpt1h: '1 Saat Önce',
    doctorBloodTestSection: 'KAN TAHLİLİ / TETKİK HAZIRLIĞI',
    doctorBloodTestLabel: 'Kan Verme / Tahlil Tarihi',
    doctorSelectBloodTest: 'Kan Tahlili Tarihi Seçin',
    doctorClearBloodTest: 'Tahlil Tarihini Temizle',
    doctorSnoozedToast: 'Randevu hatırlatıcısı ertelendi',
    doctorNotesSection: 'DOKTOR NOTU & TALİMATLAR',
    doctorShareMedList: 'İlaç Listesini Hekimle Paylaş',
    doctorShareSubject: 'İlaç ve Tedavi Listesi',
    doctorShareActiveMeds: 'Kullanılan İlaçlar',
    doctorShareNoMeds: 'Kayıtlı aktif ilaç bulunmuyor.',
    settingsNotifications: 'Hatırlatmalar',
    settingsNotificationsDesc: 'Zil sesleri, kilit ekranı ve tekrar alarmları',
    settingsReminders: 'Erteleme ve Tekrar',
    settingsRemindersDesc: 'Erteleme süresi ve erken bildirim',
    settingsReliability: 'Alarm Güvenilirliği',
    settingsReliabilityDesc: 'Hatırlatmaların zamanında çalması için izinler',
    settingsStock: 'Stok ve Envanter',
    settingsStockDesc: 'Kritik eşik seviyeleri ve kutu takibi',
    settingsPrivacy: 'Gizlilik ve Kilit Ekranı',
    settingsPrivacyDesc: 'İlaç adını gizleme ve gizli mod',
    settingsExperience: 'Görünüm',
    settingsExperienceDesc: 'İlaç adını gizleme, dozları daraltma, titreşim',
    settingsSync: 'Senkronizasyon & Yedekleme',
    settingsSyncDesc: 'Bulut eşitleme ve yedek',
    settingsBackup: 'Yedekleme',
    syncServerUrl: 'Sunucu Adresi (URL)',
    syncConnectedAccount: 'Bağlı hesap',
    syncDisconnect: 'Hesaptan ayrıl',
    syncEmailLabel: 'E-posta Adresi',
    syncEmailPlaceholder: 'ornek@mail.com',
    syncUpdateEmail: 'E-postayı Kaydet',
    syncEmailSaved: 'E-posta başarıyla kaydedildi',
    syncCodeLabel: 'Kişisel Eşitleme Kodu',
    syncCodePlaceholder: 'Size verilen kodu girin',
    syncConnectBtn: 'Kodla Bağlan',
    syncForgotCode: 'Kodumu Unuttum / Kurtarma Anahtarı',
    syncRecoveryKeyLabel: 'Kurtarma Anahtarı',
    syncRecoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    syncRecoverBtn: 'Hesabı Kurtar',
    syncNewCredentialsTitle: 'Hesap Kurtarıldı!',
    syncNewSyncCode: 'Yeni Eşitleme Kodunuz:',
    syncNewRecoveryKey: 'Yeni Kurtarma Anahtarınız:',
    syncCopy: 'Kopyala',
    syncCopied: 'Kopyalandı!',
    syncNewCredentialsWarning: 'Bu bilgileri güvenli bir yere kaydedin. Diğer cihazlardaki oturumlar güvenlik sebebiyle sonlandırıldı.',
    syncIntervalLabel: 'Eşitleme Aralığı',
    syncIntervalSub: 'Arka planda sunucu ile ne sıklıkla eşitlensin?',
    syncIntervalMinute: 'dk',
    syncCustomInterval: 'Özel Aralık',
    syncCustomIntervalRange: '1 - 1440 dakika arası',
    autoSyncTitle: 'Otomatik Senkronizasyon',
    autoSyncDesc: 'İlaç durumu değiştiğinde, uygulama açıldığında ve seçilen aralıklarla otomatik eşitlenir',
    autoSyncEnabledToast: 'Otomatik eşitleme açıldı',
    autoSyncDisabledToast: 'Otomatik eşitleme kapatıldı',
    settingsDiagnostics: 'Hata & Tanılama Günlüğü',
    settingsDiagnosticsDesc: 'Sistem logları, yakalanan hatalar ve kaza raporları',
    settingsLanguage: 'Dil / Language',
    settingsLanguageDesc: 'Türkçe / English dil seçimi',
    settingsReset: 'Veri & Sıfırlama',
    settingsResetDesc: 'Tüm kayıtları ve ayarları fabrika haline döndür',

    // Language Subpage
    languageTitle: 'Dil Seçimi (Language)',
    languageSubtitle: 'Uygulama arayüz dilini buradan değiştirebilirsiniz.',
    langTurkish: 'Türkçe (Varsayılan)',
    langEnglish: 'English',
    langChangedToast: 'Uygulama dili Türkçe olarak ayarlandı',

    // History
    adherenceTitle: 'İlaç Uyum Oranı',
    weeklyProgress: 'Son 7 Günlük Takip',
    noHistory: 'Henüz kayıt bulunmuyor.',

    // Diagnostics
    diagHealthStatus: 'Sistem Sağlık Durumu',
    diagAllOk: 'Sistem kararlı, aktif hata yok',
    diagErrorsCount: 'hata kaydı mevcut',
    diagRecordsCount: 'Kayıt',
    diagShareExport: 'Paylaş / Dışa Aktar',
    diagClear: 'Temizle',
    diagSimulateWarn: '⚠️ Test Uyarısı (WARN)',
    diagSimulateError: '💥 Test Hatası (ERROR)',
    diagFilterAll: 'Tümü',
    diagFilterErrors: 'Hatalar',
    diagFilterWarnings: 'Uyarılar',
    diagCleanTitle: 'Tertemiz!',
    diagCleanDesc: 'Henüz kaydedilmiş bir sistem günlüğü bulunmuyor.',
    diagDetails: 'DETAYLAR:',
    diagBreadcrumbs: 'SON EYLEMLER (BREADCRUMBS):',
    diagStackTrace: 'STACK TRACE:',

    // Toasts
    toastDoseTaken: 'alındı',
    toastDoseSkipped: 'atlandı',
    toastDoseSnoozed: '⏱️ Hatırlatıcı ertelendi',
    toastMedSaved: 'İlaç kaydedildi',
    toastMedDeleted: 'İlaç silindi',
    toastSyncSuccess: 'Eşitleme tamamlandı',
    toastSyncFailed: 'Eşitleme başarısız oldu',
    toastResetSuccess: 'Tüm veriler sıfırlandı',
    confirmDeleteTitle: 'İlacı Sil',
    confirmDeleteDesc: 'Bu ilacı silmek istediğinizden emin misiniz?',
    confirmResetTitle: 'Verileri Sıfırla',
    confirmResetDesc: 'Tüm ilaç kayıtlarınız ve ayarlarınız silinecektir. Devam edilsin mi?',

    backupTitle: 'Cihaz Dışı Yedek',
    backupDesc: 'İlaçlarınızı, geçmişinizi, randevularınızı ve ayarlarınızı tek bir dosyaya kaydedin; telefon değişirse veya uygulama silinirse bu dosyadan geri yükleyin. Dosyayı telefonun dışında (e-posta, bulut sürücü, bilgisayar) saklayın. Dosya şifreli değildir ve sağlık bilgisi içerir.',
    backupExport: 'Yedek Dosyası Oluştur',
    backupImport: 'Yedekten Geri Yükle',
    backupExportFailed: 'Yedek dosyası oluşturulamadı.',
    backupShareUnavailable: 'Bu cihazda dosya paylaşımı kullanılamıyor.',
    backupReadFailed: 'Seçilen dosya okunamadı.',
    backupErrorTooLarge: 'Dosya bir yedek için fazla büyük.',
    backupErrorInvalidJson: 'Dosya bozuk veya bir yedek dosyası değil.',
    backupErrorNotObject: 'Dosya bir yedek dosyası değil.',
    backupErrorVersion: 'Bu yedek, uygulamanın bu sürümünün tanımadığı bir biçimde ({version}). Uygulamayı güncelleyip tekrar deneyin.',
    backupErrorNoDoses: 'Dosyada ilaç listesi bulunamadı.',
    backupErrorInvalidDose: 'Yedekteki {n}. ilaç kaydı hatalı. Hiçbir veri değiştirilmedi.',
    backupErrorInvalidAppointments: 'Yedekteki randevu listesi hatalı. Hiçbir veri değiştirilmedi.',
    backupForeignAccount: 'Bu yedek, bu telefonun bağlı olduğu hesaptan farklı bir eşitleme hesabına ait; hesaplar karışmasın diye geri yüklenmedi. Önce o hesaba bağlanıp tekrar deneyin.',
    restoreConfirmTitle: 'Yedeği Geri Yükle',
    restoreConfirmDesc: '{date} tarihli yedek: {meds} ilaç, {appts} randevu.\n\nBu telefondaki ilaçlar, geçmiş ve ayarlar yedektekilerle değiştirilecek.',
    restoreConfirmNoAppointments: 'Bu yedekte randevu yok; mevcut randevularınız korunacak.',
    restoreConfirmSyncNote: 'Eşitleme hesabınız bağlı: geri yüklenen veriler diğer cihazlarınıza da gönderilecek.',
    restoreAction: 'Geri Yükle',
    restoreSuccess: 'Yedek geri yüklendi',
    restoreBusy: 'Eşitleme veya hesap işlemi sürüyor. Bitince tekrar deneyin.',

    cloudSyncTitle: 'Bulut Eşitleme',
    cloudSyncOnDesc: 'Verileriniz hesabınıza gönderilir ve cihazlarınız arasında eşitlenir.',
    cloudSyncOffDesc: 'Yerel mod: veriler yalnızca bu telefonda kalır, sunucuya hiçbir şey gönderilmez. Hesabınız ve kayıtlarınız silinmez; yeniden açtığınızda aynı hesapla birleştirilir.',
    localModeBackupHint: 'Telefon kaybolur veya uygulama silinirse verileri yalnızca cihaz dışı yedekten geri alabilirsiniz. Düzenli yedek alın.',
    toastCloudOn: 'Bulut eşitleme açıldı',
    toastCloudOff: 'Yerel mod: veriler bu telefonda',
    settingsSyncLocalDesc: 'Verileriniz yalnızca bu telefonda · Yedek al',
    reliabilityIntro: 'Bazı telefonlar pil tasarrufu için arka plandaki uygulamaları durdurur. Hatırlatmaların gecikmemesi için aşağıdaki ayarları bir kez kontrol edin.',
    reliabilityBatteryTitle: 'Pil kısıtlaması',
    reliabilityBatteryDesc: 'Açılan ekranda bu uygulama için "Kısıtlama yok" seçin.',
    reliabilityExactTitle: 'Tam saatinde çalma',
    reliabilityExactDesc: '"Alarmlar ve hatırlatıcılar" iznini açık tutun.',
    reliabilityVendorTitle: 'Telefon üreticisi ayarları',
    reliabilityVendorDesc: 'Samsung, Xiaomi, Huawei gibi telefonlarda "Otomatik başlatma" ve arka planda çalışma iznini açın.',
    reliabilityOpenSettings: 'Ayarları Aç',
    reliabilityOpened: 'Telefon ayarları açıldı',
    reliabilityTestButton: 'Deneme Alarmı Çal (5 sn sonra)',
    reliabilityTestToast: '5 saniye sonra deneme alarmı çalacak. Telefonu kilitleyip deneyebilirsiniz.',
    exactAlarmBannerTitle: 'Hatırlatmalar gecikebilir',
    exactAlarmBannerText: 'Tam saatinde gelmeleri için "Alarmlar ve hatırlatıcılar" iznini açın.',
    storageReadFailed: 'Kayıtlar okunamadı. Uygulamayı yeniden açın.',
    settingsExperienceSection: 'Uygulama Deneyimi',
    autoCollapseTitle: 'Alınan Dozları Otomatik Daralt',
    autoCollapseDesc: 'Bugün sekmesinde alınan ilaçlar katlanmış kalsın',
    errorBoundaryTitle: 'Beklenmeyen Bir Hata Oluştu',
    errorBoundaryText: 'Arayüzde geçici bir problem meydana geldi. İlaç kayıtlarınız ve verileriniz cihazınızda güvenle korundu.',
    errorBoundaryDetail: 'Hata Tanımı:',
    errorBoundaryNoDetail: 'Detay bulunamadı',
    errorBoundaryRetry: 'Yeniden Dene',
    errorBoundaryShare: 'Raporu Paylaş',
  },

  en: {
    // Tabs
    tabToday: 'Today',
    tabMedicines: 'My Meds',
    tabHistory: 'History',
    tabSettings: 'Settings',

    // Header & Status
    appTitle: 'Reminder Health',
    defaultGreeting: 'A routine that fits you.',
    greetingPrefix: 'Hello',
    allDone: '🎉 All medications taken for today',
    progressDone: 'completed',
    todayScheduleReady: 'Today\'s medication schedule is ready',

    // Empty States
    noMedsTodayTitle: 'No Medications Added Yet',
    noMedsTodayDesc: 'You have no doses scheduled for today. Create your routine by adding your first medication.',
    noMedsRecordedTitle: 'No Medications Recorded',
    noMedsRecordedDesc: 'You haven\'t added any medications yet. Start by scanning the box barcode or adding manually.',
    addFirstMedicine: '+ Add First Medication',
    addMedicine: '+ Add Medication',

    // Actions
    take: 'Take',
    taken: 'Taken',
    skip: 'Skip',
    skipped: 'Skipped',
    snooze: 'Snooze',
    snoozed: 'Snoozed',
    undo: 'Undo',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete Medication',
    edit: 'Edit',
    saveChanges: 'Save Changes',
    savePlan: 'Save Plan',
    revertStatus: 'Reset',
    share: 'Share',
    export: 'Export',
    import: 'Import',
    clear: 'Clear',
    refresh: 'Refresh',
    retry: 'Retry',
    test: 'Test',
    revertLog: 'record reverted',

    // Card Badges & Info
    nextDose: 'Next Dose',
    plannedDose: 'Scheduled Dose',
    restOfDay: 'Rest of Today',
    todayTakenList: 'Taken Today',
    hideList: 'Hide',
    showList: 'Show',
    stock: 'Stock',
    criticalStock: 'Low Stock!',
    remaining: 'Remaining',
    refill30: '+30 Refill Box',
    timeLabel: 'Time',

    // Meal Conditions
    mealTok: 'After meal',
    mealAc: 'Before meal',
    mealYemekle: 'With meal',
    mealFarketmez: 'Doesn\'t matter',

    // Medicine Forms
    formTablet: 'Tablet',
    formKapsul: 'Capsule',
    formDamla: 'Drops',
    formSurup: 'Syrup',

    // Frequencies
    freqEveryday: 'Every day',
    freqAlternate: 'Alternate days',
    freqCycle: 'Take / Pause Cycle',
    freqVariable: 'Variable Dose',

    // Durations
    durationContinuous: 'Continuous (Chronic)',
    durationDays: 'Course of Treatment',
    durationBadgeContinuous: 'Continuous Use',
    durationNotStarted: 'Not Started Yet',
    durationCompleted: 'Treatment Completed',

    // Add/Edit Modal
    modalAddTitle: 'Add New Medication',
    modalEditTitle: 'Edit Medication',
    medName: 'Medication Name',
    medNamePlaceholder: 'E.g. Aspirin',
    doseAmount: 'Dose Amount',
    doseAmountPlaceholder: 'E.g. 1 pill',
    doseAmountDefault: '1 pill',
    medForm: 'Medication Form',
    mealCondition: 'Meal Timing',
    timesPerDay: 'Daily Dose Times',
    addTime: '+ Add Time',
    removeTime: 'Remove',
    slotAmountLabel: 'Dose Amount for this Time',
    slotAmountPlaceholder: 'E.g. 2 tablets (if different)',
    instructions: 'Instructions & Notes',
    instructionsPlaceholder: 'E.g. Swallow with water, do not chew.',
    stockTracking: 'Box & Stock Tracking',
    stockRemainingLabel: 'Remaining Stock (units)',
    stockThresholdLabel: 'Low Stock Alert (units)',
    scanBarcodeBanner: 'Scan Barcode / Box (ITS)',
    scanBarcodeDesc: 'Auto-fill name & expiry from DataMatrix barcode',
    itsMatched: 'ITS Barcode Matched',
    subTabPlan: 'Treatment Plan',
    subTabStock: 'Stock & Inventory',
    stockTriageCritical: 'Critical / Out',
    stockTriageLow: 'Low Stock',
    stockTriageGood: 'Sufficient',
    stockDaysLeft: 'days left',
    stockRunOut: 'Out of stock',
    stockRunOutDate: 'Est. run-out',
    stockAddBox: '+1 Box',
    stockDailyConsumption: 'Daily',
    stockFilterAll: 'All',
    stockFilterCritical: 'Critical (≤7d)',
    stockFilterLow: 'Low (≤14d)',
    stockFilterGood: 'Sufficient',
    stockEmptyTitle: 'No Medications Found',
    stockEmptyDesc: 'Add a medication first to track inventory.',
    stockUnitPiece: 'units',

    // Settings Menu
    settings: 'Settings',
    settingsProfile: 'User Profile',
    settingsProfileDesc: 'Manage profile, doctor and clinic details',
    profileUserSection: 'USER INFO',
    userNameLabel: 'User Name / Greeting',
    userNameDesc: 'Set how you are greeted on the home screen and in notifications',
    userNamePlaceholder: 'Enter your name...',
    doctorNameLabel: 'Doctor Name & Title',
    doctorSpecialtyLabel: 'Specialty / Department',
    doctorHospitalLabel: 'Hospital / Clinic',
    doctorCallButton: 'Call Doctor',
    doctorAppointmentSection: 'APPOINTMENT & CHECKUP',
    doctorAppointmentLabel: 'Next Appointment Date',
    doctorAppointmentTimeLabel: 'Appointment Time',
    doctorSelectAppointment: 'Select Appointment Date',
    doctorClearAppointment: 'Clear Appointment',
    doctorLeadReminderLabel: 'Advance Reminders (Multi-Select)',
    doctorLeadReminderSub: 'Select whichever reminder windows you need before the visit',
    leadOpt3d: '3 Days Before',
    leadOpt2d: '2 Days Before',
    leadOpt1d: '1 Day Before',
    leadOpt0d: 'Appointment Morning (05:00)',
    leadOpt2h: '2 Hours Before',
    leadOpt1h: '1 Hour Before',
    doctorBloodTestSection: 'BLOOD TEST / LAB PREP',
    doctorBloodTestLabel: 'Blood Test / Lab Date',
    doctorSelectBloodTest: 'Select Blood Test Date',
    doctorClearBloodTest: 'Clear Lab Date',
    doctorSnoozedToast: 'Appointment reminder snoozed',
    doctorNotesSection: 'DOCTOR NOTES & INSTRUCTIONS',
    doctorShareMedList: 'Share Medication List with Doctor',
    doctorShareSubject: 'Medication & Treatment List',
    doctorShareActiveMeds: 'Active Medications',
    doctorShareNoMeds: 'No active medications recorded.',
    settingsNotifications: 'Reminders',
    settingsNotificationsDesc: 'Ringtones, lock screen, and repeat alarms',
    settingsReminders: 'Snooze and Repeat',
    settingsRemindersDesc: 'Snooze duration and early reminder heads-up',
    settingsReliability: 'Alarm Reliability',
    settingsReliabilityDesc: 'Permissions that keep reminders on time',
    settingsStock: 'Stock & Inventory',
    settingsStockDesc: 'Critical stock thresholds and box tracking',
    settingsPrivacy: 'Privacy and Lock Screen',
    settingsPrivacyDesc: 'Hide medication names and private mode',
    settingsExperience: 'Display',
    settingsExperienceDesc: 'Hide medicine names, compact doses, vibration',
    settingsSync: 'Synchronization & Backup',
    settingsSyncDesc: 'Cloud sync and backup',
    settingsBackup: 'Backup',
    syncServerUrl: 'Server Address (URL)',
    syncConnectedAccount: 'Connected account',
    syncDisconnect: 'Disconnect account',
    syncEmailLabel: 'Email Address',
    syncEmailPlaceholder: 'user@example.com',
    syncUpdateEmail: 'Save Email',
    syncEmailSaved: 'Email saved successfully',
    syncCodeLabel: 'Personal Sync Code',
    syncCodePlaceholder: 'Enter your sync code',
    syncConnectBtn: 'Connect with Code',
    syncForgotCode: 'Forgot Code / Recovery Key',
    syncRecoveryKeyLabel: 'Recovery Key',
    syncRecoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    syncRecoverBtn: 'Recover Account',
    syncNewCredentialsTitle: 'Account Recovered!',
    syncNewSyncCode: 'Your New Sync Code:',
    syncNewRecoveryKey: 'Your New Recovery Key:',
    syncCopy: 'Copy',
    syncCopied: 'Copied!',
    syncNewCredentialsWarning: 'Save these credentials safely. Sessions on all other devices have been revoked for security.',
    syncIntervalLabel: 'Sync Interval',
    syncIntervalSub: 'How often to sync with server in the background',
    syncIntervalMinute: 'min',
    syncCustomInterval: 'Custom Interval',
    syncCustomIntervalRange: 'Between 1 - 1440 minutes',
    autoSyncTitle: 'Automatic Synchronization',
    autoSyncDesc: 'Syncs automatically on dose changes, app open, and set intervals',
    autoSyncEnabledToast: 'Automatic sync enabled',
    autoSyncDisabledToast: 'Automatic sync disabled',
    settingsDiagnostics: 'Diagnostics & Error Log',
    settingsDiagnosticsDesc: 'System logs, captured errors, and crash reports',
    settingsLanguage: 'Language / Dil',
    settingsLanguageDesc: 'Select Turkish or English language',
    settingsReset: 'Data & Reset',
    settingsResetDesc: 'Reset all records and settings to factory defaults',

    // Language Subpage
    languageTitle: 'Language Selection',
    languageSubtitle: 'Choose your preferred application language.',
    langTurkish: 'Türkçe (Turkish)',
    langEnglish: 'English (Default)',
    langChangedToast: 'Application language changed to English',

    // History
    adherenceTitle: 'Medication Adherence',
    weeklyProgress: 'Last 7 Days Progress',
    noHistory: 'No records available yet.',

    // Diagnostics
    diagHealthStatus: 'System Health Status',
    diagAllOk: 'System stable, no active errors',
    diagErrorsCount: 'error logs recorded',
    diagRecordsCount: 'Records',
    diagShareExport: 'Share / Export',
    diagClear: 'Clear',
    diagSimulateWarn: '⚠️ Test Warning (WARN)',
    diagSimulateError: '💥 Test Error (ERROR)',
    diagFilterAll: 'All',
    diagFilterErrors: 'Errors',
    diagFilterWarnings: 'Warnings',
    diagCleanTitle: 'All Clean!',
    diagCleanDesc: 'No system logs or errors recorded yet.',
    diagDetails: 'DETAILS:',
    diagBreadcrumbs: 'RECENT ACTIONS (BREADCRUMBS):',
    diagStackTrace: 'STACK TRACE:',

    // Toasts
    toastDoseTaken: 'taken',
    toastDoseSkipped: 'skipped',
    toastDoseSnoozed: '⏱️ Reminder snoozed',
    toastMedSaved: 'Medication saved',
    toastMedDeleted: 'Medication deleted',
    toastSyncSuccess: 'Sync completed',
    toastSyncFailed: 'Sync failed',
    toastResetSuccess: 'All data reset',
    confirmDeleteTitle: 'Delete Medication',
    confirmDeleteDesc: 'Are you sure you want to delete this medication?',
    confirmResetTitle: 'Reset Data',
    confirmResetDesc: 'All medications and settings will be permanently erased. Continue?',

    backupTitle: 'Off-Device Backup',
    backupDesc: 'Save your medications, history, appointments and settings to a single file, and restore from it if you change phones or remove the app. Keep the file off this phone (email, cloud drive, computer). The file is not encrypted and contains health information.',
    backupExport: 'Create Backup File',
    backupImport: 'Restore from Backup',
    backupExportFailed: 'The backup file could not be created.',
    backupShareUnavailable: 'File sharing is not available on this device.',
    backupReadFailed: 'The selected file could not be read.',
    backupErrorTooLarge: 'The file is too large to be a backup.',
    backupErrorInvalidJson: 'The file is damaged or is not a backup file.',
    backupErrorNotObject: 'The file is not a backup file.',
    backupErrorVersion: 'This backup uses a format this version of the app does not know ({version}). Update the app and try again.',
    backupErrorNoDoses: 'No medication list was found in the file.',
    backupErrorInvalidDose: 'Medication record {n} in the backup is invalid. Nothing was changed.',
    backupErrorInvalidAppointments: 'The appointment list in the backup is invalid. Nothing was changed.',
    backupForeignAccount: 'This backup belongs to a different sync account than the one this phone is bound to, so it was not restored to keep accounts separate. Connect to that account first and try again.',
    restoreConfirmTitle: 'Restore Backup',
    restoreConfirmDesc: 'Backup from {date}: {meds} medications, {appts} appointments.\n\nMedications, history and settings on this phone will be replaced with those in the backup.',
    restoreConfirmNoAppointments: 'This backup has no appointments; your current appointments will be kept.',
    restoreConfirmSyncNote: 'Your sync account is connected: the restored data will also be sent to your other devices.',
    restoreAction: 'Restore',
    restoreSuccess: 'Backup restored',
    restoreBusy: 'A sync or account operation is in progress. Try again when it finishes.',

    cloudSyncTitle: 'Cloud Sync',
    cloudSyncOnDesc: 'Your data is sent to your account and kept in sync across your devices.',
    cloudSyncOffDesc: 'Local mode: data stays on this phone only and nothing is sent to the server. Your account and records are not deleted; turning it back on merges with the same account.',
    localModeBackupHint: 'If this phone is lost or the app is removed, only an off-device backup can bring your data back. Back up regularly.',
    toastCloudOn: 'Cloud sync turned on',
    toastCloudOff: 'Local mode: data stays on this phone',
    settingsSyncLocalDesc: 'Data stays on this phone · Back up',
    reliabilityIntro: 'Some phones stop background apps to save battery. Check the settings below once so reminders are not delayed.',
    reliabilityBatteryTitle: 'Battery restriction',
    reliabilityBatteryDesc: 'On the screen that opens, choose "Unrestricted" for this app.',
    reliabilityExactTitle: 'Ring on time',
    reliabilityExactDesc: 'Keep the "Alarms & reminders" permission on.',
    reliabilityVendorTitle: 'Phone maker settings',
    reliabilityVendorDesc: 'On Samsung, Xiaomi, Huawei and similar phones, allow auto-start and background activity.',
    reliabilityOpenSettings: 'Open Settings',
    reliabilityOpened: 'Phone settings opened',
    reliabilityTestButton: 'Play Test Alarm (in 5 s)',
    reliabilityTestToast: 'A test alarm will ring in 5 seconds. You can lock the phone to try it.',
    exactAlarmBannerTitle: 'Reminders may be late',
    exactAlarmBannerText: 'Turn on "Alarms & reminders" so they arrive on time.',
    storageReadFailed: 'Your records could not be read. Please reopen the app.',
    settingsExperienceSection: 'App Experience',
    autoCollapseTitle: 'Collapse Taken Doses',
    autoCollapseDesc: 'Keep taken medicines folded on the Today tab',
    errorBoundaryTitle: 'Something Went Wrong',
    errorBoundaryText: 'The screen hit a temporary problem. Your medicines and records are safe on this device.',
    errorBoundaryDetail: 'Error details:',
    errorBoundaryNoDetail: 'No details available',
    errorBoundaryRetry: 'Try Again',
    errorBoundaryShare: 'Share Report',
  },
};

export function getTranslations(lang: Language = 'tr'): Translations {
  return translations[lang] || translations.tr;
}
