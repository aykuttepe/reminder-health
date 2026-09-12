export type Language = 'tr' | 'en';

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

  // Settings Menu
  settings: string;
  settingsProfile: string;
  settingsProfileDesc: string;
  profileUserSection: string;
  userNameLabel: string;
  userNameDesc: string;
  userNamePlaceholder: string;
  profileDoctorSection: string;
  doctorNameLabel: string;
  doctorNamePlaceholder: string;
  doctorSpecialtyLabel: string;
  doctorSpecialtyPlaceholder: string;
  doctorHospitalLabel: string;
  doctorHospitalPlaceholder: string;
  doctorPhoneLabel: string;
  doctorPhonePlaceholder: string;
  doctorCallButton: string;
  doctorAppointmentSection: string;
  doctorAppointmentLabel: string;
  doctorAppointmentTimeLabel: string;
  doctorSelectAppointment: string;
  doctorClearAppointment: string;
  doctorAppointmentToday: string;
  doctorAppointmentTomorrow: string;
  doctorAppointmentDaysLeft: string;
  doctorAppointmentDaysAgo: string;
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
  doctorBloodTestToday: string;
  doctorBloodTestTomorrow: string;
  doctorBloodTestDaysLeft: string;
  doctorBloodTestDaysAgo: string;
  doctorSnoozedToast: string;
  doctorNotesSection: string;
  doctorNotesPlaceholder: string;
  doctorShareMedList: string;
  doctorShareSubject: string;
  doctorShareActiveMeds: string;
  doctorShareNoMeds: string;
  profileSavedToast: string;
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
    doseAmountPlaceholder: 'Örn. 1 tablet',
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

    // Settings Menu
    settings: 'Ayarlar',
    settingsProfile: 'Kullanıcı Profili',
    settingsProfileDesc: 'Profil, hekim ve hastane bilgileri',
    profileUserSection: 'KULLANICI BİLGİSİ',
    userNameLabel: 'Kullanıcı İsmi / Hitap',
    userNameDesc: 'Ana ekranda ve bildirimlerde size nasıl hitap edileceğini belirleyin',
    userNamePlaceholder: 'Adınızı giriniz...',
    profileDoctorSection: 'TAKİP EDEN HEKİM & KLİNİK',
    doctorNameLabel: 'Doktor Adı / Ünvanı',
    doctorNamePlaceholder: 'Örn. Prof. Dr. Ahmet Yılmaz',
    doctorSpecialtyLabel: 'Uzmanlık / Branş',
    doctorSpecialtyPlaceholder: 'Örn. Nefroloji / Organ Nakli',
    doctorHospitalLabel: 'Hastane / Klinik',
    doctorHospitalPlaceholder: 'Örn. Şehir Hastanesi, Acıbadem',
    doctorPhoneLabel: 'İletişim / Telefon',
    doctorPhonePlaceholder: 'Örn. 0532 123 45 67',
    doctorCallButton: 'Doktoru Ara',
    doctorAppointmentSection: 'RANDEVU & KONTROL',
    doctorAppointmentLabel: 'Sonraki Randevu Tarihi',
    doctorAppointmentTimeLabel: 'Randevu Saati',
    doctorSelectAppointment: 'Randevu Tarihi Seçin',
    doctorClearAppointment: 'Randevuyu Temizle',
    doctorAppointmentToday: 'Bugün randevunuz var!',
    doctorAppointmentTomorrow: 'Yarın',
    doctorAppointmentDaysLeft: 'gün kaldı',
    doctorAppointmentDaysAgo: 'gün önceydi',
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
    doctorBloodTestToday: 'Bugün tahlil gününüz! Aç karnına kan veriniz.',
    doctorBloodTestTomorrow: 'Yarın tahlil gününüz (Aç karnına)',
    doctorBloodTestDaysLeft: 'gün sonra kan tahlili',
    doctorBloodTestDaysAgo: 'gün önceydi',
    doctorSnoozedToast: 'Randevu hatırlatıcısı ertelendi',
    doctorNotesSection: 'DOKTOR NOTU & TALİMATLAR',
    doctorNotesPlaceholder: 'Örn. Tansiyon 14\'ü geçerse haber ver, tuzsuz diyet, kan tahlili aç karnına...',
    doctorShareMedList: 'İlaç Listesini Hekimle Paylaş',
    doctorShareSubject: 'İlaç ve Tedavi Listesi',
    doctorShareActiveMeds: 'Kullanılan İlaçlar',
    doctorShareNoMeds: 'Kayıtlı aktif ilaç bulunmuyor.',
    profileSavedToast: 'Profil ve hekim bilgileri güncellendi',
    settingsNotifications: 'Bildirim ve Ses Ayarları',
    settingsNotificationsDesc: 'Zil sesleri, kilit ekranı ve tekrar alarmları',
    settingsReminders: 'Hatırlatıcı & Erteleme',
    settingsRemindersDesc: 'Erteleme süresi ve erken bildirim',
    settingsReliability: 'Cihaz Güvenilirliği & Alarm',
    settingsReliabilityDesc: 'Pil kısıtlamaları, arka plan alarm koruması',
    settingsStock: 'Stok ve Envanter',
    settingsStockDesc: 'Kritik eşik seviyeleri ve kutu takibi',
    settingsPrivacy: 'Gizlilik & Kilit Ekranı',
    settingsPrivacyDesc: 'İlaç adını gizleme ve gizli mod',
    settingsExperience: 'Uygulama Deneyimi',
    settingsExperienceDesc: 'Dozları daraltma, titreşim (haptics)',
    settingsSync: 'Senkronizasyon & Yedekleme',
    settingsSyncDesc: 'Ubuntu sunucu eşitleme & JSON yedek',
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
    doseAmountPlaceholder: 'E.g. 1 tablet',
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

    // Settings Menu
    settings: 'Settings',
    settingsProfile: 'User Profile',
    settingsProfileDesc: 'Manage profile, doctor and clinic details',
    profileUserSection: 'USER INFO',
    userNameLabel: 'User Name / Greeting',
    userNameDesc: 'Set how you are greeted on the home screen and in notifications',
    userNamePlaceholder: 'Enter your name...',
    profileDoctorSection: 'PRIMARY DOCTOR & CLINIC',
    doctorNameLabel: 'Doctor Name & Title',
    doctorNamePlaceholder: 'e.g. Prof. Dr. John Smith',
    doctorSpecialtyLabel: 'Specialty / Department',
    doctorSpecialtyPlaceholder: 'e.g. Nephrology / Transplant',
    doctorHospitalLabel: 'Hospital / Clinic',
    doctorHospitalPlaceholder: 'e.g. City Hospital, Mayo Clinic',
    doctorPhoneLabel: 'Contact Phone',
    doctorPhonePlaceholder: 'e.g. +1 555 123 4567',
    doctorCallButton: 'Call Doctor',
    doctorAppointmentSection: 'APPOINTMENT & CHECKUP',
    doctorAppointmentLabel: 'Next Appointment Date',
    doctorAppointmentTimeLabel: 'Appointment Time',
    doctorSelectAppointment: 'Select Appointment Date',
    doctorClearAppointment: 'Clear Appointment',
    doctorAppointmentToday: 'You have an appointment today!',
    doctorAppointmentTomorrow: 'Tomorrow',
    doctorAppointmentDaysLeft: 'days left',
    doctorAppointmentDaysAgo: 'days ago',
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
    doctorBloodTestToday: 'Today is your lab test day! Remember to go fasting.',
    doctorBloodTestTomorrow: 'Tomorrow is lab test day (Fasting)',
    doctorBloodTestDaysLeft: 'days until blood test',
    doctorBloodTestDaysAgo: 'days ago',
    doctorSnoozedToast: 'Appointment reminder snoozed',
    doctorNotesSection: 'DOCTOR NOTES & INSTRUCTIONS',
    doctorNotesPlaceholder: 'e.g. Report if BP > 140, low salt diet, fasting blood test...',
    doctorShareMedList: 'Share Medication List with Doctor',
    doctorShareSubject: 'Medication & Treatment List',
    doctorShareActiveMeds: 'Active Medications',
    doctorShareNoMeds: 'No active medications recorded.',
    profileSavedToast: 'Profile and doctor details updated',
    settingsNotifications: 'Notification & Sound Settings',
    settingsNotificationsDesc: 'Ringtones, lock screen, and repeat alarms',
    settingsReminders: 'Reminders & Snooze',
    settingsRemindersDesc: 'Snooze duration and early reminder heads-up',
    settingsReliability: 'Device Reliability & Alarms',
    settingsReliabilityDesc: 'Battery optimization and background alarms',
    settingsStock: 'Stock & Inventory',
    settingsStockDesc: 'Critical stock thresholds and box tracking',
    settingsPrivacy: 'Privacy & Lock Screen',
    settingsPrivacyDesc: 'Hide medication names and private mode',
    settingsExperience: 'App Experience',
    settingsExperienceDesc: 'Compact dose views and haptic feedback',
    settingsSync: 'Synchronization & Backup',
    settingsSyncDesc: 'Ubuntu server sync and JSON backups',
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
  },
};

export function getTranslations(lang: Language = 'tr'): Translations {
  return translations[lang] || translations.tr;
}
