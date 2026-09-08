import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  Platform,
  LogBox,
  Vibration,
  AppState,
  Share,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  initNotifications,
  requestNotificationPermissions,
  syncMedicationNotifications,
  scheduleTestNotification,
  playTestSound,
  updateNotificationHandler,
  SOUND_PROFILE_OPTIONS,
  SOUND_CHANNELS,
  openChannelNotificationSettings,
  openBatteryOptimizationSettings,
  openExactAlarmSettings,
  cancelDoseRepeatNotifications,
  cancelAllRepeatNotifications,
  registerDoseStatusChecker,
  snoozeNotification,
  buildNotificationContent,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  URGENT_REPEAT_CHANNEL_ID,
  NOTIFICATION_CATEGORY_MED_ACTIONS,
  ACTION_TAKEN,
  ACTION_SNOOZE,
  ACTION_SKIP,
  NotificationSoundType,
  ActiveNotificationPayload,
} from './src/notifications';
import { CameraScannerModal } from './src/components/CameraScannerModal';
import { CatalogMedicine } from './src/data/medCatalog';
import {
  checkServerHealth,
  syncWithServer,
  smartMergeDoses,
  createBackupPayload,
  validateBackupJSON,
  type SyncDose,
} from './src/syncManager';
import { logger, type LogEntry, type LogLevel } from './src/logger';
import { ErrorBoundary } from './src/components/ErrorBoundary';

LogBox.ignoreLogs([
  'Cannot connect to Expo CLI',
  'SafeAreaView has been deprecated',
]);

export type Tab = 'Bugün' | 'İlaçlarım' | 'Geçmiş' | 'Ayarlar';
export type SettingsSubPage =
  | 'main'
  | 'profile'
  | 'language'
  | 'notifications'
  | 'reminders'
  | 'reliability'
  | 'stock'
  | 'privacy'
  | 'experience'
  | 'sync'
  | 'reset'
  | 'diagnostics';
import { getTranslations, type Language } from './src/i18n/translations';
import {
  localDateKey, dateFromKey, normalizeDoseDay, slotStatus, updateDoseSlot,
  calculateEndDate, getDurationInfo, adjustTimeMinutes, parseDoseAmount,
  formatStock, getCycleInfo,
  type MealCondition, type MedicineForm, type FrequencyType, type Dose, type ScheduledSlot,
} from './src/medicationPlan';
export * from './src/medicationPlan';

const mealLabels: Record<MealCondition, string> = {
  tok: 'Tok karnına',
  ac: 'Aç karnına',
  yemekle: 'Yemekle birlikte',
  farketmez: 'Fark etmez',
};

const formLabels: Record<MedicineForm, string> = {
  tablet: 'Tablet',
  kapsul: 'Kapsül',
  damla: 'Damla',
  surup: 'Şurup',
};

const initialDoses: Dose[] = [];

const STORAGE_KEY_DOSES = 'rutin_native_doses';
const STORAGE_KEY_SETTINGS = 'rutin_native_settings';
const STORAGE_KEY_LEARNED_MEDS = 'rutin_native_learned_meds';
const STORAGE_KEY_SYNC_CONFIG = 'rutin_native_sync_config';
const STORAGE_KEY_LANGUAGE = 'reminder_health_language_v1';

const SNOOZE_OPTIONS = [5, 10, 15, 20, 30];

const LEAD_TIME_OPTIONS = [
  { value: 0, label: 'Vaktinde' },
  { value: 5, label: '5 Dk Önce' },
  { value: 10, label: '10 Dk Önce' },
  { value: 15, label: '15 Dk Önce' },
];

const STOCK_THRESHOLD_OPTIONS = [3, 5, 7, 10];

/**
 * Dual Clock Picker Component:
 * - Pure numeric pad (keyboardType="number-pad")
 * - Dedicated SAAT and DAKİKA touch targets
 * - Instant selection on focus (selectTextOnFocus)
 * - Auto-advances focus to minute when 2 hour digits are entered
 */
function TimeSlotPicker({
  slotTime,
  onChange,
  onStep,
}: {
  slotTime: string;
  onChange: (time: string) => void;
  onStep: (deltaMinutes: number) => void;
}) {
  const [h = '09', m = '00'] = (slotTime || '09:00').split(':');
  const [hourText, setHourText] = useState(h);
  const [minuteText, setMinuteText] = useState(m);
  const [isHourFocused, setIsHourFocused] = useState(false);
  const [isMinuteFocused, setIsMinuteFocused] = useState(false);
  const hourRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isHourFocused && !isMinuteFocused) {
      const [curH = '09', curM = '00'] = (slotTime || '09:00').split(':');
      setHourText(curH);
      setMinuteText(curM);
    }
  }, [slotTime, isHourFocused, isMinuteFocused]);

  const handleHourChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 2);
    setHourText(clean);

    if (clean.length === 2) {
      let num = parseInt(clean, 10);
      if (num > 23) num = 23;
      const formatted = String(num).padStart(2, '0');
      setHourText(formatted);
      onChange(`${formatted}:${(minuteText || '00').padStart(2, '0')}`);
      minuteRef.current?.focus();
    } else if (clean.length === 1 && parseInt(clean, 10) >= 3) {
      const formatted = `0${clean}`;
      setHourText(formatted);
      onChange(`${formatted}:${(minuteText || '00').padStart(2, '0')}`);
      minuteRef.current?.focus();
    } else if (clean.length === 1) {
      const num = parseInt(clean, 10);
      onChange(`${String(num).padStart(2, '0')}:${(minuteText || '00').padStart(2, '0')}`);
    }
  };

  const handleHourBlur = () => {
    setIsHourFocused(false);
    let num = parseInt(hourText, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 23) num = 23;
    const formattedH = String(num).padStart(2, '0');
    const formattedM = (minuteText || '00').padStart(2, '0');
    setHourText(formattedH);
    onChange(`${formattedH}:${formattedM}`);
  };

  const handleMinuteChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 2);
    setMinuteText(clean);

    if (clean.length === 2) {
      let num = parseInt(clean, 10);
      if (num > 59) num = 59;
      const formattedM = String(num).padStart(2, '0');
      const formattedH = (hourText || '00').padStart(2, '0');
      setMinuteText(formattedM);
      onChange(`${formattedH}:${formattedM}`);
    } else if (clean.length === 1 && parseInt(clean, 10) >= 6) {
      const formattedM = `0${clean}`;
      const formattedH = (hourText || '00').padStart(2, '0');
      setMinuteText(formattedM);
      onChange(`${formattedH}:${formattedM}`);
    } else if (clean.length === 1) {
      let num = parseInt(clean, 10);
      const formattedH = (hourText || '00').padStart(2, '0');
      onChange(`${formattedH}:${String(num).padStart(2, '0')}`);
    }
  };

  const handleMinuteBlur = () => {
    setIsMinuteFocused(false);
    let num = parseInt(minuteText, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    const formattedM = String(num).padStart(2, '0');
    const formattedH = (hourText || '00').padStart(2, '0');
    setMinuteText(formattedM);
    onChange(`${formattedH}:${formattedM}`);
  };

  return (
    <View style={styles.timeStepperRow}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onStep(-15)}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={16} color="#a9dfca" />
        <Text style={styles.stepBtnText}>15 dk</Text>
      </TouchableOpacity>

      <View style={styles.dualClockContainer}>
        {/* Hour Input Block */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.clockBox, isHourFocused && styles.clockBoxFocused]}
          onPress={() => hourRef.current?.focus()}
        >
          <Text style={[styles.clockBoxLabel, isHourFocused && styles.clockBoxLabelFocused]}>
            SAAT
          </Text>
          <TextInput
            ref={hourRef}
            style={styles.clockDigitInput}
            value={hourText}
            onChangeText={handleHourChange}
            onFocus={() => setIsHourFocused(true)}
            onBlur={handleHourBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus={true}
            placeholder="09"
            placeholderTextColor="#50667d"
          />
        </TouchableOpacity>

        <Text style={styles.clockSeparator}>:</Text>

        {/* Minute Input Block */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.clockBox, isMinuteFocused && styles.clockBoxFocused]}
          onPress={() => minuteRef.current?.focus()}
        >
          <Text style={[styles.clockBoxLabel, isMinuteFocused && styles.clockBoxLabelFocused]}>
            DAKİKA
          </Text>
          <TextInput
            ref={minuteRef}
            style={styles.clockDigitInput}
            value={minuteText}
            onChangeText={handleMinuteChange}
            onFocus={() => setIsMinuteFocused(true)}
            onBlur={handleMinuteBlur}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && (!minuteText || minuteText.length === 0)) {
                hourRef.current?.focus();
              }
            }}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus={true}
            placeholder="00"
            placeholderTextColor="#50667d"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => onStep(15)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={16} color="#a9dfca" />
        <Text style={styles.stepBtnText}>15 dk</Text>
      </TouchableOpacity>
    </View>
  );
}

function MainApp() {
  const [tab, setTab] = useState<Tab>('Bugün');
  const [settingsSubPage, setSettingsSubPage] = useState<SettingsSubPage>('main');
  const [today, setToday] = useState(localDateKey);
  const [hydrated, setHydrated] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [scheduleInfo, setScheduleInfo] = useState<string | null>(null);
  const [doses, setDoses] = useState<Dose[]>(() => initialDoses.map(d => normalizeDoseDay(d)));
  const pastWeekHistory = Array.from({ length: 7 }, (_, index) => {
    const date = dateFromKey(today);
    date.setDate(date.getDate() - 6 + index);
    return { date: localDateKey(date), dayNum: date.getDate(), label: date.toLocaleDateString('tr-TR', { weekday: 'short' }), isToday: index === 6 };
  });
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(localDateKey);
  const [expandedTaken, setExpandedTaken] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Diagnostics & Logger State
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<LogEntry[]>([]);
  const [diagnosticsFilter, setDiagnosticsFilter] = useState<'ALL' | 'ERROR' | 'WARN'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('1 tablet');
  const [doseCount, setDoseCount] = useState<number>(1);
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [mealCondition, setMealCondition] = useState<MealCondition>('tok');
  const [formType, setFormType] = useState<MedicineForm>('tablet');
  const [instructions, setInstructions] = useState('');
  const [stock, setStock] = useState<string>('30');
  const [stockThreshold, setStockThreshold] = useState<string>('5');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('everyday');
  const [cyclePhase1Days, setCyclePhase1Days] = useState<string>('4');
  const [cyclePhase1Amount, setCyclePhase1Amount] = useState<string>('1.5 tablet');
  const [cyclePhase2Days, setCyclePhase2Days] = useState<string>('3');
  const [cyclePhase2Amount, setCyclePhase2Amount] = useState<string>('1 tablet');
  const [cycleStartDate, setCycleStartDate] = useState<string>(localDateKey);
  const [durationMode, setDurationMode] = useState<'continuous' | 'days'>('continuous');
  const [durationDays, setDurationDays] = useState<string>('7');
  const [startDate, setStartDate] = useState<string>(localDateKey);
  const [toastText, setToastText] = useState<string | null>(null);
  const [previousState, setPreviousState] = useState<Dose[] | null>(null);

  // ITS Barcode & Camera Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [learnedMeds, setLearnedMeds] = useState<Record<string, Partial<CatalogMedicine>>>({});
  const [currentGTIN, setCurrentGTIN] = useState<string | null>(null);
  const [currentExpiryDate, setCurrentExpiryDate] = useState<string | null>(null);
  const [currentBatchNo, setCurrentBatchNo] = useState<string | null>(null);

  const handleScanResult = (result: {
    gtin: string;
    name?: string;
    amount?: string;
    form?: MedicineForm;
    mealCondition?: MealCondition;
    instructions?: string;
    expiryDate?: string;
    batchNo?: string;
    raw: string;
  }) => {
    setCurrentGTIN(result.gtin);
    if (result.expiryDate) setCurrentExpiryDate(result.expiryDate);
    if (result.batchNo) setCurrentBatchNo(result.batchNo);

    if (result.name) {
      setName(result.name);
      showToast(`📦 ${result.name} karekoddan otomatik tanımlandı`);
    } else {
      showToast(`🏷️ Barkod okundu (${result.gtin}). Lütfen ilaç adını yazınız.`);
    }

    if (result.amount) setAmount(result.amount);
    if (result.form) setFormType(result.form);
    if (result.mealCondition) setMealCondition(result.mealCondition);
    if (result.instructions) setInstructions(result.instructions);
  };

  const addDoseSlot = () => {
    let nextTime = '14:00';
    if (times.length === 1) nextTime = '20:00';
    else if (times.length === 2) nextTime = '14:00';
    else if (times.length >= 3) nextTime = '23:00';
    const updated = [...times, nextTime].sort();
    setTimes(updated);
    setDoseCount(updated.length);
  };

  const removeDoseSlot = (index: number) => {
    if (times.length <= 1) return;
    const updated = times.filter((_, i) => i !== index);
    setTimes(updated);
    setDoseCount(updated.length);
  };

  const setSlotTime = (index: number, newTime: string) => {
    const updated = [...times];
    updated[index] = newTime;
    setTimes(updated);
  };

  const stepSlotMinutes = (index: number, delta: number) => {
    const current = times[index] || '09:00';
    setSlotTime(index, adjustTimeMinutes(current, delta));
  };

  // Language & i18n
  const [language, setLanguage] = useState<Language>('tr');
  const t = getTranslations(language);

  const updateLanguage = async (newLang: Language) => {
    setLanguage(newLang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_LANGUAGE, newLang);
      logger.info('Settings', `Dil değiştirildi: ${newLang}`);
    } catch (err) {
      console.error('Failed to save language setting', err);
    }
  };

  const getMealLabel = (cond?: MealCondition | string) => {
    if (!cond) return language === 'en' ? 'On time' : 'Zamanında';
    switch (cond) {
      case 'tok': return t.mealTok;
      case 'ac': return t.mealAc;
      case 'yemekle': return t.mealYemekle;
      case 'farketmez': return t.mealFarketmez;
      default: return cond;
    }
  };

  const getFormLabel = (form?: MedicineForm | string) => {
    if (!form) return t.formTablet;
    switch (form) {
      case 'tablet': return t.formTablet;
      case 'kapsul': return t.formKapsul;
      case 'damla': return t.formDamla;
      case 'surup': return t.formSurup;
      default: return form;
    }
  };

  // Settings
  const [privateMode, setPrivateMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<NotificationSoundType>('default');
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean | null>(null);
  const [activeBannerNotification, setActiveBannerNotification] = useState<ActiveNotificationPayload | null>(null);

  // Customizable Feature States
  const [userName, setUserName] = useState('');
  const [snoozeMinutes, setSnoozeMinutes] = useState(15);
  const [leadTimeMinutes, setLeadTimeMinutes] = useState(0);
  const [defaultStockThreshold, setDefaultStockThreshold] = useState(5);
  const [stockAlertsEnabled, setStockAlertsEnabled] = useState(true);
  const [hideDoseAmount, setHideDoseAmount] = useState(false);
  const [autoCollapseTaken, setAutoCollapseTaken] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [repeatNagEnabled, setRepeatNagEnabled] = useState(true);
  const [repeatNagCount, setRepeatNagCount] = useState(5);
  const [batteryExemptionEnabled, setBatteryExemptionEnabled] = useState(true);
  const [exactAlarmEnabled, setExactAlarmEnabled] = useState(true);
  const [autoRescheduleOnBoot, setAutoRescheduleOnBoot] = useState(true);
  const [wakeScreenOnAlarm, setWakeScreenOnAlarm] = useState(true);

  // Sync & Backup States
  const [serverUrl, setServerUrl] = useState('http://192.168.1.50:3000');
  const [apiToken, setApiToken] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'testing' | 'syncing' | 'connected' | 'error'>('idle');
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const triggerHaptic = () => {
    if (hapticsEnabled) {
      try {
        Vibration.vibrate(30);
      } catch {}
    }
  };

  const dosesRef = useRef(doses);
  dosesRef.current = doses;

  const soundSettingsRef = useRef({
    enabled: notifications,
    soundEnabled,
    soundType,
    privateMode,
    hideDoseAmount,
    lang: language,
  });
  soundSettingsRef.current = {
    enabled: notifications,
    soundEnabled,
    soundType,
    privateMode,
    hideDoseAmount,
    lang: language,
  };

  const snoozeDose = async (dose: Dose, time: string, date = localDateKey(), minutes = 3) => {
    if (!soundSettingsRef.current.enabled) {
      showToast('Hatırlatmalar kapalı. Önce Ayarlar’dan açın.');
      return;
    }
    try {
      logger.breadcrumb(`Doz ertelendi: ${dose.name} (${time}) +${minutes}dk`);
      await cancelDoseRepeatNotifications(dose.id, time, date);
      await snoozeNotification({ ...dose, time, statusDate: date, amount: getCycleInfo(dose, date).todayAmount }, minutes, soundSettingsRef.current);
      setDoses(previous => previous.map(d => d.id === dose.id ? { ...d, snooze: minutes } : d));
      showToast(`⏱️ Hatırlatıcı ${minutes} dakika ertelendi`);
    } catch (error) {
      logger.error('Notifications', `Doz erteleme hatası: ${dose.name}`, error);
      console.error('Snooze failed', error);
      showToast('Erteleme kurulamadı. Lütfen tekrar deneyin.');
    }
  };

  // Initialize Logger and Global JS Handlers
  useEffect(() => {
    void logger.init();
    logger.setupGlobalErrorHandlers();
    const unsub = logger.subscribe(() => {
      setDiagnosticsLogs(logger.getLogs());
    });
    setDiagnosticsLogs(logger.getLogs());
    logger.info('System', 'Uygulama açıldı (Reminder Health v0.2.1)');
    return () => unsub();
  }, []);

  // Initialize Notifications and Request Permissions
  useEffect(() => {
    let mounted = true;
    initNotifications().then(() => requestNotificationPermissions()).then(granted => {
      if (mounted) setHasNotificationPermission(granted);
    });

    // Register active status checker so notifications for taken medicines are silenced immediately
    registerDoseStatusChecker((doseId, timeStr, date) => {
      const d = dosesRef.current.find(x => x.id === doseId);
      if (!d) return false;
      const targetTime = timeStr || d.time;
      const status = slotStatus(d, targetTime, date ?? localDateKey());
      return status === 'taken' || status === 'skipped';
    });

    const removeListener = addNotificationResponseListener(({ actionId, doseId, timeStr, date }) => {
      const dose = dosesRef.current.find(d => d.id === doseId);
      if (!dose) return;
      const time = timeStr || dose.time;
      const doseDate = date ?? localDateKey();
      if (!(dose.times?.length ? dose.times : [dose.time]).includes(time)) return;
      if (actionId === ACTION_TAKEN || actionId === ACTION_SKIP) {
        cancelDoseRepeatNotifications(dose.id, time, doseDate).catch(console.error);
        setDoses(previous => previous.map(d => d.id === dose.id
          ? updateDoseSlot(d, time, doseDate, actionId === ACTION_TAKEN ? 'taken' : 'skipped') : d));
        showToast(actionId === ACTION_TAKEN ? '✅ İlaç bildirimi onaylandı' : 'İlaç atlandı');
      } else if (actionId === ACTION_SNOOZE) {
        void snoozeDose(dose, time, doseDate);
      }
    });

    const removeReceivedListener = addNotificationReceivedListener(payload => {
      const dose = dosesRef.current.find(d => d.id === payload.doseId);
      if (dose && slotStatus(dose, payload.time || dose.time, payload.date ?? localDateKey()) !== 'pending') return;
      setActiveBannerNotification(payload);
    });

    return () => {
      mounted = false;
      removeListener();
      removeReceivedListener();
      registerDoseStatusChecker(null);
    };
  }, []);

  // Hydrate before writing defaults or rebuilding the device notification queue.
  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_DOSES),
      AsyncStorage.getItem(STORAGE_KEY_SETTINGS),
      AsyncStorage.getItem(STORAGE_KEY_LEARNED_MEDS),
      AsyncStorage.getItem(STORAGE_KEY_SYNC_CONFIG),
      AsyncStorage.getItem(STORAGE_KEY_LANGUAGE),
    ])
      .then(([doseData, settingData, learnedData, syncData, langData]) => {
        if (!mounted) return;
        if (langData === 'tr' || langData === 'en') {
          setLanguage(langData);
        }
        if (doseData) {
          const parsed = JSON.parse(doseData);
          if (Array.isArray(parsed)) {
            // Filter out legacy seed items (İlaç A, B, C, D)
            const clean = parsed.filter(d => !((d.id >= 1 && d.id <= 4) && ['İlaç A', 'İlaç B', 'İlaç C', 'İlaç D'].includes(d.name)));
            setDoses(clean.map(d => normalizeDoseDay(d)));
          }
        }
        if (learnedData) {
          try {
            const parsed = JSON.parse(learnedData);
            if (parsed && typeof parsed === 'object') setLearnedMeds(parsed);
          } catch {}
        }
        if (syncData) {
          try {
            const parsed = JSON.parse(syncData);
            if (parsed.serverUrl) setServerUrl(parsed.serverUrl);
            if (parsed.apiToken !== undefined) setApiToken(parsed.apiToken);
            if (parsed.autoSync !== undefined) setAutoSync(parsed.autoSync);
            if (parsed.lastSyncAt) setLastSyncAt(parsed.lastSyncAt);
          } catch {}
        }
        if (settingData) {
          const parsed = JSON.parse(settingData);
          if (parsed.privateMode !== undefined) setPrivateMode(parsed.privateMode);
          if (parsed.notifications !== undefined) setNotifications(parsed.notifications);
          if (parsed.soundEnabled !== undefined) setSoundEnabled(parsed.soundEnabled);
          if (parsed.soundType !== undefined) setSoundType(parsed.soundType);
          if (parsed.userName !== undefined && parsed.userName !== 'Ahmet') setUserName(parsed.userName);
          if (parsed.snoozeMinutes !== undefined) setSnoozeMinutes(parsed.snoozeMinutes);
          if (parsed.leadTimeMinutes !== undefined) setLeadTimeMinutes(parsed.leadTimeMinutes);
          if (parsed.defaultStockThreshold !== undefined) setDefaultStockThreshold(parsed.defaultStockThreshold);
          if (parsed.stockAlertsEnabled !== undefined) setStockAlertsEnabled(parsed.stockAlertsEnabled);
          if (parsed.hideDoseAmount !== undefined) setHideDoseAmount(parsed.hideDoseAmount);
          if (parsed.autoCollapseTaken !== undefined) setAutoCollapseTaken(parsed.autoCollapseTaken);
          if (parsed.hapticsEnabled !== undefined) setHapticsEnabled(parsed.hapticsEnabled);
          if (parsed.repeatNagEnabled !== undefined) setRepeatNagEnabled(parsed.repeatNagEnabled);
          if (parsed.repeatNagCount !== undefined) setRepeatNagCount(parsed.repeatNagCount);
          if (parsed.batteryExemptionEnabled !== undefined) setBatteryExemptionEnabled(parsed.batteryExemptionEnabled);
          if (parsed.exactAlarmEnabled !== undefined) setExactAlarmEnabled(parsed.exactAlarmEnabled);
          if (parsed.autoRescheduleOnBoot !== undefined) setAutoRescheduleOnBoot(parsed.autoRescheduleOnBoot);
          if (parsed.wakeScreenOnAlarm !== undefined) setWakeScreenOnAlarm(parsed.wakeScreenOnAlarm);
        }
        setHydrated(true);
      }).catch(error => {
        console.error('Storage hydration failed', error);
        if (mounted) setScheduleInfo('Kayıtlar okunamadı. Uygulamayı yeniden açın.');
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setToday(localDateKey());
      setRefreshVersion(version => version + 1);
    };
    const timer = setInterval(() => setToday(localDateKey()), 30000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setDoses(previous => previous.map(d => normalizeDoseDay(d, today)));
    setSelectedHistoryDate(today);
  }, [today, hydrated]);

  // Save to Storage
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY_DOSES, JSON.stringify(doses)).catch(() => {});
  }, [doses, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY_SYNC_CONFIG,
      JSON.stringify({
        serverUrl,
        apiToken,
        autoSync,
        lastSyncAt,
      })
    ).catch(() => {});
  }, [hydrated, serverUrl, apiToken, autoSync, lastSyncAt]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY_SETTINGS,
      JSON.stringify({
        privateMode,
        notifications,
        soundEnabled,
        soundType,
        userName,
        snoozeMinutes,
        leadTimeMinutes,
        defaultStockThreshold,
        stockAlertsEnabled,
        hideDoseAmount,
        autoCollapseTaken,
        hapticsEnabled,
        repeatNagEnabled,
        repeatNagCount,
        batteryExemptionEnabled,
        exactAlarmEnabled,
        autoRescheduleOnBoot,
        wakeScreenOnAlarm,
      })
    ).catch(() => {});
    updateNotificationHandler(soundEnabled, soundType);
  }, [
    hydrated,
    privateMode,
    notifications,
    soundEnabled,
    soundType,
    userName,
    snoozeMinutes,
    leadTimeMinutes,
    defaultStockThreshold,
    stockAlertsEnabled,
    hideDoseAmount,
    autoCollapseTaken,
    hapticsEnabled,
    repeatNagEnabled,
    repeatNagCount,
    batteryExemptionEnabled,
    exactAlarmEnabled,
    autoRescheduleOnBoot,
    wakeScreenOnAlarm,
  ]);


  // Sync device scheduled alarms whenever doses or settings change
  useEffect(() => {
    if (!hydrated || hasNotificationPermission === null) return;
    let current = true;
    syncMedicationNotifications(doses, {
      enabled: notifications && hasNotificationPermission,
      privateMode,
      soundEnabled,
      soundType,
      leadTimeMinutes,
      hideDoseAmount,
      repeatNagEnabled,
      repeatNagCount,
      lang: language,
    }).then(summary => {
      if (current) setScheduleInfo(summary.refreshAfter
        ? (language === 'en'
            ? `Reminder schedule ready until ${new Date(summary.refreshAfter).toLocaleString('en-US')}. Open the app before this date to automatically refresh.`
            : `Hatırlatma planı ${new Date(summary.refreshAfter).toLocaleString('tr-TR')} tarihine kadar hazır. Uygulamayı bu tarihten önce açın; plan otomatik yenilenir.`)
        : null);
      logger.info('Notifications', `Bildirim planı senkronize edildi (${doses.length} ilaç)`);
    }).catch(error => {
      logger.error('Notifications', 'Bildirim senkronizasyon hatası', error);
      if (current) setScheduleInfo(language === 'en' ? 'Could not update reminders. Check permissions and restart app.' : 'Hatırlatmalar güncellenemedi. İzinleri kontrol edip uygulamayı yeniden açın.');
    });
    return () => { current = false; };
  }, [
    hydrated, hasNotificationPermission, today, refreshVersion,
    doses,
    notifications,
    privateMode,
    soundEnabled,
    soundType,
    leadTimeMinutes,
    hideDoseAmount,
    repeatNagEnabled,
    repeatNagCount,
    language,
  ]);

  // Computed Slots for Today
  const unpausedDoses = doses.filter(d => !d.paused && !d.deletedAt);
  const completedDoses: Dose[] = [];
  const offCycleDoses: Dose[] = [];
  const activeTodayDoses: Dose[] = [];

  unpausedDoses.forEach(d => {
    const dur = getDurationInfo(d, today, language);
    if (dur.isExpired) {
      completedDoses.push(d);
      return;
    }
    const cyc = getCycleInfo(d, today, language);
    if (!dur.hasStarted || !cyc.isActiveToday) {
      offCycleDoses.push(d);
      return;
    }
    activeTodayDoses.push(d);
  });

  const todaySlots: ScheduledSlot[] = [];
  activeTodayDoses.forEach(d => {
    const info = getCycleInfo(d, today, language);
    const durInfo = getDurationInfo(d, today, language);
    const dTimes = d.times && d.times.length > 0 ? d.times : [d.time];
    dTimes.forEach(t => {
      const status = slotStatus(d, t, today);
      todaySlots.push({
        slotId: `${d.id}_${t}`,
        doseId: d.id,
        dose: d,
        time: t,
        status,
        todayAmount: info.todayAmount,
        cycleInfo: info,
        durationInfo: durInfo,
      });
    });
  });
  todaySlots.sort((a, b) => a.time.localeCompare(b.time));

  const pendingSlots = todaySlots.filter(s => s.status === 'pending');
  const nextSlot = pendingSlots[0];
  const takenSlots = todaySlots.filter(s => s.status === 'taken');
  const recordedSlots = todaySlots.filter(s => s.status !== 'pending');
  const historySlots = doses.flatMap(dose => {
    const times = new Set([...(dose.times?.length ? dose.times : [dose.time]), ...Object.keys(dose.dailyStatuses?.[selectedHistoryDate] ?? {})]);
    return [...times].map(time => ({ dose, time, status: slotStatus(dose, time, selectedHistoryDate),
      todayAmount: getCycleInfo(dose, selectedHistoryDate, language).todayAmount, slotId: `${dose.id}_${time}` }));
  }).filter(slot => slot.status !== 'pending').sort((a, b) => a.time.localeCompare(b.time));


  const showToast = (text: string, prev?: Dose[]) => {
    setToastText(text);
    if (prev) setPreviousState(prev);
    setTimeout(() => setToastText(null), 4000);
  };

  const changeDose = (id: number, patch: Partial<Dose>, msg: string) => {
    const prev = doses;
    setDoses(ds => ds.map(d => d.id === id ? { ...d, ...patch } : d));
    showToast(msg, prev);
  };

  const applySlot = (slot: ScheduledSlot, status: Dose['status']) => {
    triggerHaptic();
    const previous = doses;
    const date = localDateKey();
    logger.breadcrumb(`Doz eylemi: ${slot.dose.name} (${slot.time}) -> ${status}`);
    setDoses(current => current.map(d => d.id === slot.doseId ? updateDoseSlot(d, slot.time, date, status) : d));
    if (status !== 'pending') cancelDoseRepeatNotifications(slot.doseId, slot.time).catch(err => {
      logger.warn('Notifications', `Tekrar bildirimi iptal edilemedi: ${slot.dose.name}`, { error: String(err) });
    });
    showToast(`${slot.dose.name} (${slot.time}) ${status === 'taken' ? 'alındı' : status === 'skipped' ? 'atlandı' : 'kaydı geri alındı'}`, previous);
  };
  const takeSlot = (slot: ScheduledSlot) => applySlot(slot, 'taken');
  const skipSlot = (slot: ScheduledSlot) => applySlot(slot, 'skipped');
  const revertSlot = (slot: ScheduledSlot) => applySlot(slot, 'pending');

  const openEditor = (dose?: Dose) => {
    if (dose) {
      setEditingId(dose.id);
      setName(dose.name);
      setAmount(dose.amount);
      const dTimes = dose.times && dose.times.length > 0 ? dose.times : [dose.time];
      setTimes(dTimes);
      setDoseCount(dTimes.length);
      setMealCondition(dose.mealCondition ?? 'tok');
      setFormType(dose.form ?? 'tablet');
      setInstructions(dose.instructions ?? '');
      setStock(String(dose.stock ?? 30));
      setStockThreshold(String(dose.stockThreshold ?? 5));
      setFrequencyType(dose.frequencyType ?? 'everyday');
      setCyclePhase1Days(String(dose.cyclePhase1Days ?? 4));
      setCyclePhase1Amount(dose.cyclePhase1Amount ?? dose.amount);
      setCyclePhase2Days(String(dose.cyclePhase2Days ?? 3));
      setCyclePhase2Amount(dose.cyclePhase2Amount ?? '1 tablet');
      setCycleStartDate(dose.cycleStartDate ?? today);
      setDurationMode(dose.durationMode ?? 'continuous');
      setDurationDays(String(dose.durationDays ?? 7));
      setStartDate(dose.startDate ?? dose.cycleStartDate ?? today);
      setCurrentGTIN(dose.gtin ?? null);
      setCurrentExpiryDate(dose.expiryDate ?? null);
      setCurrentBatchNo(null);
    } else {
      setEditingId(null);
      setName('');
      setAmount('1 tablet');
      setTimes(['09:00']);
      setDoseCount(1);
      setMealCondition('tok');
      setFormType('tablet');
      setInstructions('');
      setStock('30');
      setStockThreshold(String(defaultStockThreshold));
      setFrequencyType('everyday');
      setCyclePhase1Days('4');
      setCyclePhase1Amount('1.5 tablet');
      setCyclePhase2Days('3');
      setCyclePhase2Amount('1 tablet');
      setCycleStartDate(today);
      setDurationMode('continuous');
      setDurationDays('7');
      setStartDate(today);
      setCurrentGTIN(null);
      setCurrentExpiryDate(null);
      setCurrentBatchNo(null);
    }
    setEditorOpen(true);
  };

  const handleDoseCountChange = (count: number) => {
    setDoseCount(count);
    const defaults = ['08:00', '14:00', '20:00', '23:00'];
    const newTimes = [...times];
    while (newTimes.length < count) {
      newTimes.push(defaults[newTimes.length] || '12:00');
    }
    setTimes(newTimes.slice(0, count));
  };

  const applyCyclePreset = (p1Days: number, p1Amt: string, p2Days: number, p2Amt: string, type: FrequencyType) => {
    setFrequencyType(type);
    setCyclePhase1Days(String(p1Days));
    setCyclePhase1Amount(p1Amt);
    setCyclePhase2Days(String(p2Days));
    setCyclePhase2Amount(p2Amt);
    if (type === 'variable') setAmount(p1Amt);
  };

  const saveDose = () => {
    if (!name.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilaç adını giriniz.');
      return;
    }
    const effectiveTimes = times.length > 0 ? times : ['09:00'];
    const patch = {
      name: name.trim(),
      amount: amount.trim(),
      time: effectiveTimes[0] || '09:00',
      times: effectiveTimes,
      mealCondition,
      form: formType,
      instructions: instructions.trim() || undefined,
      stock: Math.max(0, Number(stock) || 0),
      stockThreshold: Math.max(1, Number(stockThreshold) || 5),
      frequencyType,
      cyclePhase1Days: Math.max(1, Number(cyclePhase1Days) || 1),
      cyclePhase1Amount: cyclePhase1Amount.trim() || amount.trim(),
      cyclePhase2Days: Math.max(1, Number(cyclePhase2Days) || 1),
      cyclePhase2Amount: cyclePhase2Amount.trim() || (frequencyType === 'cycle' ? '0 (Ara)' : '1 tablet'),
      cycleStartDate,
      durationMode,
      durationDays: durationMode === 'days' ? Math.max(1, Number(durationDays) || 7) : undefined,
      startDate: durationMode === 'days' ? startDate : undefined,
      endDate: durationMode === 'days' ? calculateEndDate(startDate, Number(durationDays) || 7) : undefined,
      gtin: currentGTIN || undefined,
      expiryDate: currentExpiryDate || undefined,
      updatedAt: Date.now(),
      deletedAt: undefined,
    };

    if (currentGTIN) {
      const cleanG = currentGTIN.trim().padStart(14, '0');
      const updatedLearned = {
        ...learnedMeds,
        [cleanG]: {
          gtin: cleanG,
          name: name.trim(),
          amount: amount.trim(),
          form: formType,
          mealCondition,
          instructions: instructions.trim() || undefined,
        },
      };
      setLearnedMeds(updatedLearned);
      AsyncStorage.setItem(STORAGE_KEY_LEARNED_MEDS, JSON.stringify(updatedLearned)).catch(() => {});
    }

    if (editingId) {
      logger.breadcrumb(`İlaç güncellendi: ${name.trim()} (${amount.trim()})`);
      setDoses(ds => ds.map(d => d.id === editingId ? { ...d, ...patch } : d));
      showToast('İlaç güncellendi');
    } else {
      logger.breadcrumb(`Yeni ilaç eklendi: ${name.trim()} (${amount.trim()})`);
      setDoses(ds => [...ds, { id: Date.now(), ...patch, status: 'pending', statusDate: today, slotStatuses: {} }]);
      showToast('Yeni ilaç eklendi');
    }
    setEditorOpen(false);
  };

  const deleteDose = (id: number) => {
    logger.breadcrumb(`İlaç silindi: id=${id}`);
    const prev = doses;
    setDoses(ds => ds.map(d => d.id === id ? { ...d, deletedAt: Date.now(), updatedAt: Date.now() } : d));
    setEditorOpen(false);
    showToast('İlaç silindi', prev);
  };

  // Sync Action Handlers
  const handleTestConnection = async () => {
    triggerHaptic();
    setSyncStatus('testing');
    setSyncStatusMsg('Sunucuya bağlanılıyor...');
    const result = await checkServerHealth(serverUrl, apiToken);
    if (result.ok) {
      setSyncStatus('connected');
      setSyncStatusMsg(`Sunucu Çevrimiçi (v${result.version} · ${result.latencyMs}ms)`);
      showToast('Sunucu bağlantısı başarılı');
    } else {
      setSyncStatus('error');
      setSyncStatusMsg(`Bağlanılamadı: ${result.error}`);
      showToast('Bağlantı başarısız');
    }
  };

  const handleSyncNow = async () => {
    triggerHaptic();
    logger.breadcrumb(`Sunucu eşitlemesi başlatıldı: ${serverUrl}`);
    setSyncStatus('syncing');
    setSyncStatusMsg('Eşitleniyor...');
    try {
      const response = await syncWithServer(serverUrl, apiToken, {
        doses: doses.map(d => ({ ...d, updatedAt: (d as any).updatedAt || Date.now() })),
        learnedMeds,
        settings: {
          userName,
          notifications,
          soundEnabled,
          soundType,
          snoozeMinutes,
        },
      });

      if (response.success) {
        const merged = smartMergeDoses(doses as SyncDose[], response.doses);
        setDoses(merged.map(d => normalizeDoseDay(d, today)));
        if (response.learnedMeds) {
          setLearnedMeds(prev => ({ ...prev, ...response.learnedMeds }));
        }
        const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncAt(nowStr);
        setSyncStatus('connected');
        const activeCount = response.doses.filter(d => !d.deletedAt).length;
        setSyncStatusMsg(`Eşitlendi (${activeCount} aktif ilaç)`);
        showToast('Eşitleme tamamlandı');
        logger.info('Sync', `Sunucu ile başarıyla eşitlendi (${activeCount} aktif ilaç)`);
      } else {
        setSyncStatus('error');
        setSyncStatusMsg(response.message || 'Eşitleme başarısız');
        logger.warn('Sync', `Sunucu eşitleme başarısız yanıt döndü: ${response.message}`, { serverUrl });
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncStatusMsg(err.message || 'Bağlantı hatası');
      showToast('Eşitleme başarısız oldu');
      logger.error('Sync', 'Sunucu eşitleme hatası', err, { serverUrl });
    }
  };

  const handleExportBackup = async () => {
    triggerHaptic();
    const backup = createBackupPayload({
      doses,
      settings: {
        userName,
        notifications,
        soundEnabled,
        soundType,
        snoozeMinutes,
        leadTimeMinutes,
        defaultStockThreshold,
        stockAlertsEnabled,
        hideDoseAmount,
        autoCollapseTaken,
        hapticsEnabled,
      },
      learnedMeds,
    });
    const jsonStr = JSON.stringify(backup, null, 2);
    try {
      await Share.share({
        title: 'Reminder Health İlaç Yedeklemesi',
        message: jsonStr,
      });
    } catch {
      Alert.alert('Hata', 'Yedek dosyası paylaşılamadı.');
    }
  };

  const resetAllData = () => {
    Alert.alert(
      'Sıfırla',
      'Tüm kayıtları ve ayarları başlangıç durumuna döndürmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            AsyncStorage.clear().catch(() => {});
            setDoses([]);
            setPrivateMode(true);
            setNotifications(true);
            setSoundEnabled(true);
            setSoundType('default');
            setUserName('');
            setSnoozeMinutes(15);
            setLeadTimeMinutes(0);
            setDefaultStockThreshold(5);
            setStockAlertsEnabled(true);
            setHideDoseAmount(false);
            setAutoCollapseTaken(false);
            setHapticsEnabled(true);
            showToast('Tüm veriler ve ayarlar sıfırlandı');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />

        {/* Floating Push Notification Banner */}
        {activeBannerNotification && (
          <View style={styles.pushNotificationBanner}>
            <View style={styles.pushBannerHeader}>
              <View style={styles.pushBannerAppRow}>
                <Ionicons name="medical" size={13} color="#a9dfca" />
                <Text style={styles.pushBannerAppName}>
                  {activeBannerNotification.isRepeat ? '⚠️ RUTİN · TEKRAR UYARISI (+3 DK)' : 'RUTİN · BİLDİRİM'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveBannerNotification(null)}>
                <Ionicons name="close" size={16} color="#adb3bf" />
              </TouchableOpacity>
            </View>
            <Text style={styles.pushBannerTitle}>{activeBannerNotification.title}</Text>
            <Text style={styles.pushBannerBody}>{activeBannerNotification.body}</Text>
            <View style={styles.pushBannerActions}>
              <TouchableOpacity
                style={styles.pushBannerActionTake}
                onPress={() => {
                  triggerHaptic();
                  const targetDose = doses.find(d => d.id === activeBannerNotification.doseId);
                  const targetTime = activeBannerNotification.time || targetDose?.time;
                  if (targetDose) {
                    cancelDoseRepeatNotifications(targetDose.id, targetTime, activeBannerNotification.date).catch(console.error);
                    setDoses(previous => previous.map(d => d.id === targetDose.id
                      ? updateDoseSlot(d, targetTime || d.time, activeBannerNotification.date ?? localDateKey(), 'taken') : d));
                  }
                  setActiveBannerNotification(null);
                  showToast('✅ İlaç alındı olarak onaylandı');
                }}
              >
                <Ionicons name="checkmark-circle" size={15} color="#081624" />
                <Text style={styles.pushBannerActionTakeText}>{t.take}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pushBannerActionSnooze}
                onPress={() => {
                  triggerHaptic();
                  const targetDose = doses.find(d => d.id === activeBannerNotification.doseId);
                  const targetTime = activeBannerNotification.time || targetDose?.time;
                  if (targetDose) {
                    void snoozeDose(targetDose, targetTime || targetDose.time, activeBannerNotification.date ?? localDateKey());
                  }
                  setActiveBannerNotification(null);
                }}
              >
                <Ionicons name="alarm-outline" size={15} color="#f5f3f0" />
                <Text style={styles.pushBannerActionSnoozeText}>{language === 'en' ? 'Snooze 3m' : '3 Dk Ertele'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pushBannerActionSkip}
                onPress={() => {
                  triggerHaptic();
                  const targetDose = doses.find(d => d.id === activeBannerNotification.doseId);
                  const targetTime = activeBannerNotification.time || targetDose?.time;
                  if (targetDose) {
                    cancelDoseRepeatNotifications(targetDose.id, targetTime, activeBannerNotification.date).catch(console.error);
                    setDoses(previous => previous.map(d => d.id === targetDose.id
                      ? updateDoseSlot(d, targetTime || d.time, activeBannerNotification.date ?? localDateKey(), 'skipped') : d));
                  }
                  setActiveBannerNotification(null);
                  showToast(language === 'en' ? '❌ Marked as skipped' : '❌ İlaç atlandı olarak işaretlendi');
                }}
              >
                <Ionicons name="close-circle-outline" size={15} color="#f87171" />
                <Text style={styles.pushBannerActionSkipText}>{t.skip}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              {tab === 'Bugün' && t.tabToday}
              {tab === 'İlaçlarım' && t.tabMedicines}
              {tab === 'Geçmiş' && t.tabHistory}
              {tab === 'Ayarlar' && t.tabSettings}
            </Text>
            <Text style={styles.headerSubtitle}>
              {tab === 'Bugün' || tab === 'Geçmiş'
                ? dateFromKey(today).toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
                : tab === 'İlaçlarım'
                  ? (language === 'en' ? 'Your medication plan, all in one place.' : 'Kullanım planın, bir arada.')
                  : (userName
                      ? (language === 'en' ? `Hello ${userName}, a routine tailored to you.` : `Merhaba ${userName}, sana uygun bir rutin.`)
                      : (language === 'en' ? 'A routine tailored to you.' : 'Sana uygun bir rutin.'))}
            </Text>
          </View>
          {tab === 'Bugün' && (
            <View style={styles.progressBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#a9dfca" />
              <Text style={styles.progressText}>
                {language === 'en' ? `${takenSlots.length} of ${todaySlots.length} doses taken` : `${todaySlots.length} dozdan ${takenSlots.length}'i alındı`}
              </Text>
            </View>
          )}
          {tab === 'İlaçlarım' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => openEditor()}>
              <Ionicons name="add" size={24} color="#081624" />
            </TouchableOpacity>
          )}
        </View>

        {/* Content Tabs */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {tab === 'Bugün' && (
            <>
              {/* Cihaz Güvenilirliği & Alarm Koruma Durumu */}
              <TouchableOpacity
                style={styles.reliabilityStatusBanner}
                onPress={() => {
                  triggerHaptic();
                  setTab('Ayarlar');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.reliabilityStatusLeft}>
                  <View style={styles.reliabilityStatusDot} />
                  <Ionicons name="shield-checkmark" size={14} color="#a9dfca" />
                  <Text style={styles.reliabilityStatusText}>
                    Alarmlar & 3 Dk Tekrarlar Tam Korumalı
                  </Text>
                </View>
                <View style={styles.reliabilityStatusAction}>
                  <Text style={styles.reliabilityStatusActionText}>Pil / İzinler</Text>
                  <Ionicons name="chevron-forward" size={12} color="#a9dfca" />
                </View>
              </TouchableOpacity>

              {/* Next Dose Hero */}
              {nextSlot ? (
                <View style={styles.heroCard}>
                  <Text style={styles.heroEyebrow}>{t.nextDose.toUpperCase()}</Text>
                  <Text style={styles.heroTime}>{nextSlot.time}</Text>
                  <Text style={styles.heroName}>{nextSlot.dose.name}</Text>

                  <View style={styles.chipsRow}>
                    <View style={styles.chipMeal}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={13} color="#a9dfca" />
                      <Text style={styles.chipMealText}>{getMealLabel(nextSlot.dose.mealCondition)}</Text>
                    </View>
                    <View style={styles.chipForm}>
                      <MaterialCommunityIcons name="pill" size={13} color="#f5f3f0" />
                      <Text style={styles.chipFormText}>{getFormLabel(nextSlot.dose.form)}</Text>
                    </View>
                    {nextSlot.dose.frequencyType && nextSlot.dose.frequencyType !== 'everyday' && (
                      <View style={styles.chipCycle}>
                        <Ionicons name="sync" size={13} color="#a9dfca" />
                        <Text style={styles.chipCycleText}>{nextSlot.cycleInfo.phaseLabel}</Text>
                      </View>
                    )}
                    {!nextSlot.durationInfo.isContinuous && (
                      <View style={[styles.chipDuration, nextSlot.durationInfo.isExpired && styles.chipDurationExpired]}>
                        <Ionicons name="hourglass-outline" size={12} color="#a9dfca" />
                        <Text style={styles.chipDurationText}>{nextSlot.durationInfo.badgeText}</Text>
                      </View>
                    )}
                    {nextSlot.dose.stock !== undefined && (
                      <View style={[styles.chipStock, nextSlot.dose.stock <= (nextSlot.dose.stockThreshold ?? 5) && styles.chipStockLow]}>
                        <MaterialCommunityIcons name="package-variant" size={13} color={nextSlot.dose.stock <= (nextSlot.dose.stockThreshold ?? 5) ? '#f0b484' : '#adb3bf'} />
                        <Text style={[styles.chipStockText, nextSlot.dose.stock <= (nextSlot.dose.stockThreshold ?? 5) && styles.chipStockLowText]}>
                          {formatStock(nextSlot.dose.stock)} {language === 'en' ? (nextSlot.dose.stock === 1 ? 'unit' : 'units') : 'adet'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.heroAmount}>
                    {nextSlot.todayAmount} {nextSlot.dose.instructions ? `· ${nextSlot.dose.instructions}` : (language === 'en' ? '· As scheduled' : '· Planına göre')}
                  </Text>

                  <TouchableOpacity style={styles.takeBtn} onPress={() => takeSlot(nextSlot)}>
                    <Ionicons name="checkmark" size={28} color="#092326" />
                    <Text style={styles.takeBtnText}>{t.take}</Text>
                  </TouchableOpacity>

                  <View style={styles.heroSecondaryActions}>
                    <TouchableOpacity style={styles.heroSecBtn} onPress={() => void snoozeDose(nextSlot.dose, nextSlot.time, today, snoozeMinutes)}>
                      <Ionicons name="alarm-outline" size={18} color="#adb3bf" />
                      <Text style={styles.heroSecBtnText}>{t.snooze}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.heroSecBtn} onPress={() => skipSlot(nextSlot)}>
                      <Ionicons name="close-circle-outline" size={18} color="#adb3bf" />
                      <Text style={styles.heroSecBtnText}>{t.skip}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : todaySlots.length > 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkmark-circle" size={54} color="#a9dfca" />
                  <Text style={styles.emptyCardTitle}>{t.allDone}</Text>
                  <Text style={styles.emptyCardSub}>{language === 'en' ? `${takenSlots.length} doses taken, no pending doses.` : `${takenSlots.length} doz alındı, bekleyen doz yok.`}</Text>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="medical-outline" size={54} color="#a9dfca" />
                  <Text style={styles.emptyCardTitle}>{t.noMedsTodayTitle}</Text>
                  <Text style={styles.emptyCardSub}>{t.noMedsTodayDesc}</Text>
                  <TouchableOpacity style={[styles.takeBtn, { marginTop: 18 }]} onPress={() => openEditor()}>
                    <Ionicons name="add" size={24} color="#092326" />
                    <Text style={styles.takeBtnText}>{t.addFirstMedicine}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Off-cycle section */}
              {offCycleDoses.length > 0 && (
                <View style={styles.offCycleBox}>
                  <View style={styles.offCycleHeader}>
                    <Ionicons name="sync" size={16} color="#a9dfca" />
                    <Text style={styles.offCycleHeaderText}>
                      {language === 'en' ? `Not Scheduled Today (${offCycleDoses.length} Meds)` : `Bugün Planlanmayanlar (${offCycleDoses.length} İlaç)`}
                    </Text>
                  </View>
                  {offCycleDoses.map(d => {
                    const info = getCycleInfo(d, today, language);
                    return (
                      <View key={d.id} style={styles.offCycleItem}>
                        <View>
                          <Text style={styles.offCycleItemName}>{d.name}</Text>
                          <Text style={styles.offCycleItemSub}>
                            {getDurationInfo(d, today, language).hasStarted ? info.phaseLabel : (language === 'en' ? 'Not Started Yet' : 'Henüz Başlamadı')} · {language === 'en' ? 'No dose today' : 'Bugün doz yok'}
                          </Text>
                        </View>
                        <View style={styles.offBadge}>
                          <Text style={styles.offBadgeText}>{language === 'en' ? 'Off Day' : 'Beklemede'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Completed treatment section */}
              {completedDoses.length > 0 && (
                <View style={styles.completedBox}>
                  <View style={styles.completedHeader}>
                    <Ionicons name="checkmark-done-circle" size={16} color="#34d399" />
                    <Text style={styles.completedHeaderText}>
                      {language === 'en' ? `Completed Treatments (${completedDoses.length} Meds)` : `Tedavisi Tamamlananlar (${completedDoses.length} İlaç)`}
                    </Text>
                  </View>
                  {completedDoses.map(d => (
                    <View key={d.id} style={styles.completedItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.completedItemName}>{d.name}</Text>
                        <Text style={styles.completedItemSub}>
                          {language === 'en' ? `${d.durationDays}-Day Treatment Completed` : `${d.durationDays} Günlük Tedavi Tamamlandı`} · {d.startDate} - {d.endDate}
                        </Text>
                      </View>
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>{language === 'en' ? 'Completed' : 'Tamamlandı'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Remaining doses */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.restOfDay}</Text>
              </View>
              {pendingSlots.slice(1).length > 0 ? (
                pendingSlots.slice(1).map(slot => (
                  <View key={slot.slotId} style={styles.doseRow}>
                    <Text style={styles.doseRowTime}>{slot.time}</Text>
                    <View style={styles.doseRowMain}>
                      <Text style={styles.doseRowName}>{slot.dose.name}</Text>
                      <Text style={styles.doseRowSub}>
                        {slot.todayAmount} · {getMealLabel(slot.dose.mealCondition)}
                        {slot.dose.frequencyType && slot.dose.frequencyType !== 'everyday' ? ` · ${slot.cycleInfo.phaseLabel}` : ''}
                        {!slot.durationInfo.isContinuous ? ` · ${slot.durationInfo.badgeText}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.quickTakeBtn} onPress={() => takeSlot(slot)}>
                      <Ionicons name="checkmark" size={18} color="#a9dfca" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.quietEmpty}>{language === 'en' ? 'No other scheduled doses.' : 'Başka planlı doz bulunmuyor.'}</Text>
              )}

              {/* Taken doses toggle */}
              <TouchableOpacity style={styles.takenToggle} onPress={() => setExpandedTaken(!expandedTaken)}>
                <Ionicons name="clipboard-outline" size={20} color="#adb3bf" />
                <Text style={styles.takenToggleText}>
                  {language === 'en' ? `Taken (${takenSlots.length} records)` : `Alınanlar (${takenSlots.length} kayıt)`}
                </Text>
                <Ionicons name={expandedTaken ? 'chevron-up' : 'chevron-down'} size={18} color="#adb3bf" />
              </TouchableOpacity>

              {expandedTaken && (
                <View style={styles.takenList}>
                  {takenSlots.map(slot => (
                    <TouchableOpacity key={slot.slotId} style={styles.doseRow} onPress={() => revertSlot(slot)}>
                      <Text style={styles.doseRowTime}>{slot.time}</Text>
                      <View style={styles.doseRowMain}>
                        <Text style={styles.doseRowName}>{slot.dose.name}</Text>
                        <Text style={styles.doseRowSub}>
                          {slot.todayAmount} · {language === 'en' ? 'Taken (Tap to revert)' : 'Alındı (Geri almak için dokun)'}
                        </Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={20} color="#a9dfca" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {tab === 'İlaçlarım' && (
            <View>
              <View style={styles.medsHeader}>
                <Text style={styles.sectionTitle}>
                  {language === 'en' ? `DAILY PLAN (${doses.filter(d => !d.deletedAt).length} Meds)` : `GÜNLÜK PLAN (${doses.filter(d => !d.deletedAt).length} İlaç)`}
                </Text>
              </View>
              {doses.filter(d => !d.deletedAt).length === 0 ? (
                <View style={[styles.emptyCard, { marginHorizontal: 0, marginBottom: 16 }]}>
                  <Ionicons name="medkit-outline" size={48} color="#a9dfca" />
                  <Text style={styles.emptyCardTitle}>{t.noMedsRecordedTitle}</Text>
                  <Text style={styles.emptyCardSub}>{t.noMedsRecordedDesc}</Text>
                </View>
              ) : (
                doses.filter(d => !d.deletedAt).map(dose => {
                  const cycleInfo = getCycleInfo(dose, today, language);
                  const durationInfo = getDurationInfo(dose, today, language);
                  const medTimes = dose.times && dose.times.length > 0 ? dose.times : [dose.time];
                  const isLow = (dose.stock ?? 10) <= (dose.stockThreshold ?? 5);
                  let regimenText = language === 'en' ? 'Every day' : 'Her gün';
                  if (dose.frequencyType === 'alternate') regimenText = language === 'en' ? 'Alternate days' : 'Gün aşırı';
                  else if (dose.frequencyType === 'cycle') regimenText = language === 'en' ? `${dose.cyclePhase1Days || 3}d on / ${dose.cyclePhase2Days || 4}d off` : `${dose.cyclePhase1Days || 3} gün al / ${dose.cyclePhase2Days || 4} gün ara`;
                  else if (dose.frequencyType === 'variable') regimenText = language === 'en' ? `${dose.cyclePhase1Days || 4}d ${dose.cyclePhase1Amount || '1.5 tab'} / ${dose.cyclePhase2Days || 3}d ${dose.cyclePhase2Amount || '1 tab'}` : `${dose.cyclePhase1Days || 4} gün ${dose.cyclePhase1Amount || '1.5 tab'} / ${dose.cyclePhase2Days || 3} gün ${dose.cyclePhase2Amount || '1 tab'}`;

                  return (
                    <TouchableOpacity key={dose.id} style={styles.medCard} onPress={() => openEditor(dose)}>
                      <View style={styles.medCardHeader}>
                        <Text style={styles.medCardTime}>{medTimes.join(', ')}</Text>
                        <View style={styles.medCardBadges}>
                          {!durationInfo.isContinuous && (
                            <View style={[styles.durationTag, durationInfo.isExpired && styles.durationTagExpired]}>
                              <Ionicons name={durationInfo.isExpired ? "checkmark-circle" : "hourglass-outline"} size={10} color={durationInfo.isExpired ? "#94a3b8" : "#a9dfca"} />
                              <Text style={[styles.durationTagText, durationInfo.isExpired && styles.durationTagTextExpired]}>
                                {durationInfo.badgeText}
                              </Text>
                            </View>
                          )}
                          <View style={[styles.cycleTag, cycleInfo.phaseType === 'off' && styles.cycleTagOff]}>
                            <Text style={[styles.cycleTagText, cycleInfo.phaseType === 'off' && styles.cycleTagOffText]}>
                              {cycleInfo.phaseType === 'off' ? (language === 'en' ? 'Rest day' : 'Ara gününde') : cycleInfo.phaseLabel}
                            </Text>
                          </View>
                          <View style={[styles.stockPill, isLow && styles.stockPillLow]}>
                            <Text style={[styles.stockPillText, isLow && styles.stockPillLowText]}>{formatStock(dose.stock)}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.medCardName}>{dose.name}</Text>
                      <Text style={styles.medCardSub}>
                        {dose.amount} · {getMealLabel(dose.mealCondition)} · {regimenText}
                        {dose.instructions ? ` · ${dose.instructions}` : ''}
                      </Text>
                      {!durationInfo.isContinuous && (
                        <View style={styles.medCardDurationRow}>
                          <Ionicons name="calendar-outline" size={11} color="#a9dfca" />
                          <Text style={styles.medCardDurationText}>
                            {dose.startDate} - {dose.endDate || calculateEndDate(dose.startDate || today, dose.durationDays || 7)} ({dose.durationDays} Günlük Tedavi)
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
              <TouchableOpacity style={styles.fullAddBtn} onPress={() => openEditor()}>
                <Ionicons name="add" size={20} color="#f5f3f0" />
                <Text style={styles.fullAddBtnText}>Yeni İlaç Ekle</Text>
              </TouchableOpacity>
            </View>
          )}

          {tab === 'Geçmiş' && (
            <View>
              <View style={styles.adherenceCard}>
                <View style={styles.adherencePill}>
                  <Ionicons name="trending-up" size={16} color="#a9dfca" />
                  <Text style={styles.adherencePillText}>Son 7 Gün</Text>
                </View>
                <Text style={styles.adherenceSub}>{takenSlots.length} / {todaySlots.length} doz bugün alındı</Text>
                <View style={styles.weekStrip}>
                  {pastWeekHistory.map(day => (
                    <TouchableOpacity
                      key={day.date}
                      style={[styles.weekPill, selectedHistoryDate === day.date && styles.weekPillActive]}
                      onPress={() => setSelectedHistoryDate(day.date)}
                    >
                      <Text style={styles.weekPillLabel}>{day.label}</Text>
                      <Text style={styles.weekPillNum}>{day.dayNum}</Text>
                      <View style={[styles.weekDot, day.isToday ? styles.dotToday : styles.dotComplete]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionTitle}>
                {selectedHistoryDate === today ? "Bugünün Kayıtları" : dateFromKey(selectedHistoryDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {
                historySlots.length > 0 ? (
                  historySlots.map(slot => (
                    <View key={slot.slotId} style={styles.doseRow}>
                      <Text style={styles.doseRowTime}>{slot.time}</Text>
                      <View style={styles.doseRowMain}>
                        <Text style={styles.doseRowName}>{slot.dose.name}</Text>
                        <Text style={styles.doseRowSub}>{slot.todayAmount} · {slot.status === 'taken' ? 'Alındı' : 'Atlandı'}</Text>
                      </View>
                      <Ionicons
                        name={slot.status === 'taken' ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={slot.status === 'taken' ? '#a9dfca' : '#e6ba93'}
                      />
                    </View>
                  ))
                ) : (
                  <Text style={styles.quietEmpty}>Henüz kayıt bulunmuyor.</Text>
                )
              }
            </View>
          )}

          {tab === 'Ayarlar' && (
            <View style={styles.settingsContainer}>
              {settingsSubPage !== 'main' && (
                <View style={styles.settingsSubHeader}>
                  <TouchableOpacity
                    style={styles.settingsBackBtn}
                    onPress={() => {
                      triggerHaptic();
                      setSettingsSubPage('main');
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={18} color="#a9dfca" />
                    <Text style={styles.settingsBackBtnText}>{t.tabSettings}</Text>
                  </TouchableOpacity>
                  <Text style={styles.settingsSubHeaderTitle} numberOfLines={1}>
                    {settingsSubPage === 'profile' && t.settingsProfile}
                    {settingsSubPage === 'language' && t.settingsLanguage}
                    {settingsSubPage === 'notifications' && t.settingsNotifications}
                    {settingsSubPage === 'reminders' && t.settingsReminders}
                    {settingsSubPage === 'reliability' && t.settingsReliability}
                    {settingsSubPage === 'stock' && t.settingsStock}
                    {settingsSubPage === 'privacy' && t.settingsPrivacy}
                    {settingsSubPage === 'experience' && t.settingsExperience}
                    {settingsSubPage === 'sync' && t.settingsSync}
                    {settingsSubPage === 'reset' && t.settingsReset}
                    {settingsSubPage === 'diagnostics' && t.settingsDiagnostics}
                  </Text>
                </View>
              )}

              {settingsSubPage === 'main' && (
                <>
                  {scheduleInfo && <Text style={styles.settingSub}>{scheduleInfo}</Text>}
                  {hasNotificationPermission === false && (
                    <TouchableOpacity
                      style={styles.permBanner}
                      onPress={async () => {
                        const granted = await requestNotificationPermissions();
                        setHasNotificationPermission(granted);
                        if (granted) showToast('Bildirim izni verildi!');
                        else Alert.alert('İzin Reddedildi', 'Telefonunuzun Ayarlar > Bildirimler menüsünden Expo Go için bildirim izni vermeniz gerekebilir.');
                      }}
                    >
                      <Ionicons name="warning-outline" size={20} color="#f0b484" />
                      <Text style={styles.permBannerText}>Bildirim izni kapalı. Doz hatırlatıcıları için dokunun.</Text>
                      <View style={styles.permBannerBtn}>
                        <Text style={styles.permBannerBtnText}>İzin Ver</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="options-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>AYAR KATEGORİLERİ</Text>
                  </View>

                  <View style={styles.menuListCard}>
                    {/* 1. Kullanıcı Profili */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('profile'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#182b3a' }]}>
                        <Ionicons name="person-circle-outline" size={22} color="#a9dfca" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>Kullanıcı Profili</Text>
                        <Text style={styles.menuItemSub}>{userName ? `Hitap: ${userName}` : 'İsim ve hitap tercihlerini belirleyin'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* Dil / Language */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('language'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#13352c' }]}>
                        <Ionicons name="globe-outline" size={22} color="#5eead4" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>{t.settingsLanguage}</Text>
                        <Text style={styles.menuItemSub}>{language === 'tr' ? 'Türkçe (Varsayılan)' : 'English'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* 2. Bildirim ve Ses Ayarları */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('notifications'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#183335' }]}>
                        <Ionicons name="notifications-outline" size={22} color="#a9dfca" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>Bildirim ve Ses Ayarları</Text>
                        <Text style={styles.menuItemSub}>
                          {notifications ? (soundEnabled ? 'Sesli bildirimler açık' : 'Sessiz bildirim') : 'Bildirimler kapalı'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* 3. Hatırlatıcı & Erteleme */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('reminders'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#262f3a' }]}>
                        <Ionicons name="time-outline" size={22} color="#a9dfca" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>Hatırlatıcı & Erteleme</Text>
                        <Text style={styles.menuItemSub}>
                          {`${snoozeMinutes} dk erteleme · ${repeatNagEnabled ? `${repeatNagCount} tekrar` : 'Tekrarsız'}`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* 4. Cihaz Güvenilirliği & Alarm Koruması */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('reliability'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#1b342b' }]}>
                        <Ionicons name="shield-checkmark-outline" size={22} color="#34d399" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>Cihaz Güvenilirliği & Alarm</Text>
                        <Text style={styles.menuItemSub}>Pil optimizasyonu, hassas alarm & arka plan</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* 5. Stok ve Envanter */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('stock'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#2a2838' }]}>
                        <Ionicons name="cube-outline" size={22} color="#c4b5fd" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>Stok ve Envanter</Text>
                        <Text style={styles.menuItemSub}>{`Kritik eşik: ${defaultStockThreshold} doz · ${stockAlertsEnabled ? 'Uyarılar aktif' : 'Kapalı'}`}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* 6. Gizlilik ve Kilit Ekranı */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('privacy'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#1d2c38' }]}>
                        <Ionicons name="lock-closed-outline" size={22} color="#7dd3fc" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>Gizlilik ve Kilit Ekranı</Text>
                        <Text style={styles.menuItemSub}>{privateMode ? 'Gizlilik modu aktif (İlaç gizli)' : 'Detaylı bildirimler'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* 7. Uygulama Deneyimi */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('experience'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#2d2538' }]}>
                        <Ionicons name="sparkles-outline" size={22} color="#f472b6" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>Uygulama Deneyimi</Text>
                        <Text style={styles.menuItemSub}>Dozları daraltma, titreşim (haptics)</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    {/* 8. Senkronizasyon & Yedekleme */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('sync'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#173347' }]}>
                        <Ionicons name="cloud-upload-outline" size={22} color="#38bdf8" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuItemTitle}>Senkronizasyon & Yedekleme</Text>
                        <Text style={styles.menuItemSub}>
                          {lastSyncAt ? `Son eşitleme: ${lastSyncAt}` : 'Ubuntu sunucu eşitleme & JSON yedek'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    {/* 9. Hata & Tanılama Günlüğü */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('diagnostics'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#281a17' }]}>
                        <Ionicons name="bug-outline" size={22} color="#f0b484" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.menuItemTitle}>Hata & Tanılama Günlüğü</Text>
                          {diagnosticsLogs.some(l => l.level === 'ERROR' || l.level === 'FATAL') && (
                            <View style={{ backgroundColor: '#4c1d1d', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: '#fca5a5', fontSize: 10, fontWeight: '700' }}>
                                {diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length} Hata
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.menuItemSub}>Sistem logları, yakalanan hatalar ve kaza raporları</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4e6173" />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* 10. Veri & Sıfırlama */}
                    <TouchableOpacity
                      style={styles.menuListItem}
                      onPress={() => { triggerHaptic(); setSettingsSubPage('reset'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: '#361c22' }]}>
                        <Ionicons name="refresh-outline" size={22} color="#ff9696" />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={[styles.menuItemTitle, { color: '#ff9696' }]}>Veri & Sıfırlama</Text>
                        <Text style={styles.menuItemSub}>Tüm kayıtları ve ayarları fabrika haline döndür</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#ff9696" />
                    </TouchableOpacity>
                  </View>

                  {/* SÜRÜM BİLGİSİ */}
                  <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#a9dfca' }}>Reminder Health v0.2.1 (Release)</Text>
                    <Text style={{ fontSize: 11, color: '#68778d', marginTop: 2 }}>Karekod & Senkronizasyon · Güncel Sürüm</Text>
                  </View>
                </>
              )}

              {/* SUB PAGE 1: KULLANICI PROFİLİ */}
              {settingsSubPage === 'profile' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="person-circle-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>KULLANICI PROFİLİ</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View>
                      <Text style={styles.settingTitle}>Kullanıcı İsmi / Hitap</Text>
                      <Text style={styles.settingSub}>Ana ekranda ve bildirimlerde size nasıl hitap edileceğini belirleyin</Text>
                      <View style={styles.profileInputRow}>
                        <Ionicons name="person-outline" size={16} color="#a9dfca" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.profileInput}
                          value={userName}
                          onChangeText={setUserName}
                          placeholder="Adınızı giriniz..."
                          placeholderTextColor="#5c6e80"
                          maxLength={24}
                        />
                        {userName.trim().length > 0 && (
                          <TouchableOpacity onPress={() => showToast(`İsim "${userName}" olarak güncellendi`)}>
                            <Ionicons name="checkmark-circle" size={18} color="#a9dfca" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* SUB PAGE: DİL / LANGUAGE */}
              {settingsSubPage === 'language' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="globe-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>{t.languageTitle.toUpperCase()}</Text>
                  </View>
                  <View style={styles.settingCard}>
                    {/* Türkçe Card */}
                    <TouchableOpacity
                      style={[
                        styles.languageOptionCard,
                        language === 'tr' && styles.languageOptionCardActive,
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        updateLanguage('tr');
                        showToast('Dil Türkçe olarak ayarlandı');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.languageOptionTitle}>Türkçe</Text>
                          <View style={styles.languageDefaultBadge}>
                            <Text style={styles.languageDefaultBadgeText}>Varsayılan</Text>
                          </View>
                        </View>
                        <Text style={styles.languageOptionSub}>Uygulama arayüzü ve bildirimler Türkçe görüntülenir</Text>
                      </View>
                      <Ionicons
                        name={language === 'tr' ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={language === 'tr' ? '#a9dfca' : '#4e6173'}
                      />
                    </TouchableOpacity>

                    <View style={styles.menuListDivider} />

                    {/* English Card */}
                    <TouchableOpacity
                      style={[
                        styles.languageOptionCard,
                        language === 'en' && styles.languageOptionCardActive,
                      ]}
                      onPress={() => {
                        triggerHaptic();
                        updateLanguage('en');
                        showToast('Language set to English');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.languageOptionTitle}>English</Text>
                        <Text style={styles.languageOptionSub}>App interface and notifications will be displayed in English</Text>
                      </View>
                      <Ionicons
                        name={language === 'en' ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={language === 'en' ? '#a9dfca' : '#4e6173'}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* SUB PAGE 2: BİLDİRİM VE SES AYARLARI */}
              {settingsSubPage === 'notifications' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="notifications-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>BİLDİRİM VE SES AYARLARI</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>Bildirimler</Text>
                        <Text style={styles.settingSub}>Doz zamanında sistem hatırlatıcıları</Text>
                      </View>
                      <Switch
                        value={notifications}
                        onValueChange={val => {
                          triggerHaptic();
                          setNotifications(val);
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>Bildirim Sesi</Text>
                        <Text style={styles.settingSub}>Doz hatırlatıcılarında sesli uyarı çal</Text>
                      </View>
                      <Switch
                        value={soundEnabled}
                        onValueChange={val => {
                          triggerHaptic();
                          setSoundEnabled(val);
                          showToast(val ? '🔊 Bildirim sesi açıldı' : '🔕 Bildirim sesi kapatıldı (Sessiz mod)');
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    {/* Ses Türü Seçenekleri */}
                    {soundEnabled && (
                      <View style={styles.soundSection}>
                        <View style={styles.soundSectionHeader}>
                          <Text style={styles.soundSectionTitle}>SES VE MELODİ TÜRÜ</Text>
                          <TouchableOpacity
                            style={styles.testSoundHeaderBtn}
                            onPress={() => {
                              triggerHaptic();
                              playTestSound(soundType, soundEnabled);
                              showToast('🔊 Bildirim sesi önizlemesi çalınıyor...');
                            }}
                          >
                            <Ionicons name="volume-high-outline" size={13} color="#a9dfca" />
                            <Text style={styles.testSoundHeaderBtnText}>Sesi Dinle</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.soundOptionsList}>
                          {SOUND_PROFILE_OPTIONS.map(opt => {
                            const isSelected = soundType === opt.id;
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[styles.soundOptionCard, isSelected && styles.soundOptionCardActive]}
                                onPress={() => {
                                  triggerHaptic();
                                  setSoundType(opt.id);
                                  playTestSound(opt.id, true);
                                  showToast(`🎵 ${opt.title} seçildi`);
                                }}
                              >
                                <View style={[styles.soundOptionIconCircle, isSelected && styles.soundOptionIconCircleActive]}>
                                  <Ionicons
                                    name={opt.icon as any}
                                    size={18}
                                    color={isSelected ? '#081624' : '#a9dfca'}
                                  />
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[styles.soundOptionTitle, isSelected && styles.soundOptionTitleActive]}>
                                      {opt.title}
                                    </Text>
                                    <View style={[styles.soundOptionBadge, isSelected && styles.soundOptionBadgeActive]}>
                                      <Text style={[styles.soundOptionBadgeText, isSelected && styles.soundOptionBadgeTextActive]}>
                                        {opt.badge}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={styles.soundOptionSub}>{opt.description}</Text>
                                </View>
                                <Ionicons
                                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                  size={20}
                                  color={isSelected ? '#a9dfca' : '#455668'}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Cihazdan Özel Bildirim Sesi Seçme / Sistem Ayarları Butonu */}
                        <TouchableOpacity
                          style={styles.deviceSoundActionBtn}
                          activeOpacity={0.8}
                          onPress={async () => {
                            triggerHaptic();
                            const targetChannel = SOUND_CHANNELS[soundType]?.id || 'medication-channel-custom-v2';
                            showToast('📱 Cihaz ses ayarları açılıyor...');
                            await openChannelNotificationSettings(targetChannel);
                          }}
                        >
                          <View style={styles.deviceSoundActionIcon}>
                            <Ionicons name="phone-portrait-outline" size={20} color="#081624" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.deviceSoundActionTitle}>Cihazdan Özel Bildirim Sesi Seç</Text>
                            <Text style={styles.deviceSoundActionSub}>
                              Android sistem ekranını açarak telefonunuzdaki dahili bildirim seslerinden birini seçin
                            </Text>
                          </View>
                          <Ionicons name="open-outline" size={18} color="#a9dfca" />
                        </TouchableOpacity>

                        <View style={styles.deviceSoundTipCard}>
                          <Ionicons name="information-circle-outline" size={16} color="#a9dfca" style={{ marginTop: 1 }} />
                          <Text style={styles.deviceSoundTipText}>
                            İpucu: Yukarıdaki butona dokunduğunuzda açılan Android ekranında <Text style={{ color: '#a9dfca', fontWeight: 'bold' }}>"Ses"</Text> (Sound) seçeneğine tıklayarak telefonunuzdaki Samsung, Xiaomi, Pixel veya kendi yüklediğiniz zil seslerinden birini doğrudan bu kanala atayabilirsiniz.
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* SUB PAGE 3: HATIRLATICI & ERTELEME */}
              {settingsSubPage === 'reminders' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="time-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>HATIRLATICI & ERTELEME</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.settingTitle}>Varsayılan Erteleme Süresi</Text>
                        <View style={styles.selectedPillBadge}>
                          <Text style={styles.selectedPillBadgeText}>{snoozeMinutes} Dakika</Text>
                        </View>
                      </View>
                      <Text style={styles.settingSub}>Bildirimlerdeki erteleme butonunun süresi</Text>
                      <View style={styles.chipSelector}>
                        {SNOOZE_OPTIONS.map(mins => (
                          <TouchableOpacity
                            key={mins}
                            style={[styles.choiceChip, snoozeMinutes === mins && styles.choiceChipActive]}
                            onPress={() => {
                              triggerHaptic();
                              setSnoozeMinutes(mins);
                              showToast(`Erteleme süresi ${mins} dakika yapıldı`);
                            }}
                          >
                            <Text style={[styles.choiceChipText, snoozeMinutes === mins && styles.choiceChipTextActive]}>
                              {mins} dk
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.settingDivider} />

                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.settingTitle}>Ön Bildirim (Erken Uyarı)</Text>
                        <View style={styles.selectedPillBadge}>
                          <Text style={styles.selectedPillBadgeText}>
                            {LEAD_TIME_OPTIONS.find(o => o.value === leadTimeMinutes)?.label ?? 'Vaktinde'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.settingSub}>Doz vaktinden kaç dakika önce hazırlık uyarısı verilsin?</Text>
                      <View style={styles.chipSelector}>
                        {LEAD_TIME_OPTIONS.map(opt => (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.choiceChip, leadTimeMinutes === opt.value && styles.choiceChipActive]}
                            onPress={() => {
                              triggerHaptic();
                              setLeadTimeMinutes(opt.value);
                              showToast(`Ön bildirim: ${opt.label}`);
                            }}
                          >
                            <Text style={[styles.choiceChipText, leadTimeMinutes === opt.value && styles.choiceChipTextActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.settingDivider} />

                    {/* 3 Dakikada Bir Tekrar Uyarısı */}
                    <View>
                      <View style={styles.settingRow}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.settingTitle}>3 Dakikada Bir Tekrar Uyarısı</Text>
                          <Text style={styles.settingSub}>
                            İlaç onaylanana (içilene) kadar her 3 dakikada bir ısrarcı bildirim gönderir
                          </Text>
                        </View>
                        <Switch
                          value={repeatNagEnabled}
                          onValueChange={val => {
                            triggerHaptic();
                            setRepeatNagEnabled(val);
                            showToast(val ? '3 dakikada bir ısrarcı bildirim açıldı' : 'Tekrar bildirimleri kapatıldı');
                          }}
                          trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                        />
                      </View>

                      {repeatNagEnabled && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={[styles.settingSub, { marginBottom: 6 }]}>Maksimum Tekrar Sayısı:</Text>
                          <View style={styles.chipSelector}>
                            {[
                              { count: 3, label: '3 Tekrar (9 dk)' },
                              { count: 5, label: '5 Tekrar (15 dk)' },
                              { count: 10, label: '10 Tekrar (30 dk)' },
                            ].map(opt => (
                              <TouchableOpacity
                                key={opt.count}
                                style={[styles.choiceChip, repeatNagCount === opt.count && styles.choiceChipActive]}
                                onPress={() => {
                                  triggerHaptic();
                                  setRepeatNagCount(opt.count);
                                  showToast(`Tekrar uyarısı: ${opt.label}`);
                                }}
                              >
                                <Text style={[styles.choiceChipText, repeatNagCount === opt.count && styles.choiceChipTextActive]}>
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </>
              )}

              {/* SUB PAGE 4: CİHAZ GÜVENİLİRLİĞİ & ALARM KORUMASI */}
              {settingsSubPage === 'reliability' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>CİHAZ GÜVENİLİRLİĞİ & ALARM KORUMASI</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View style={styles.reliabilityHeaderRow}>
                      <View style={batteryExemptionEnabled && exactAlarmEnabled ? styles.reliabilityBadgeActive : [styles.reliabilityBadgeActive, { backgroundColor: '#2d2516', borderColor: '#59441f' }]}>
                        <View style={[styles.reliabilityBadgeDot, (!batteryExemptionEnabled || !exactAlarmEnabled) && { backgroundColor: '#f0b484' }]} />
                        <Text style={[styles.reliabilityBadgeActiveText, (!batteryExemptionEnabled || !exactAlarmEnabled) && { color: '#f0b484' }]}>
                          {batteryExemptionEnabled && exactAlarmEnabled ? 'Arka Plan Koruması Tam' : 'Kısmi Koruma'}
                        </Text>
                      </View>
                      <Text style={styles.reliabilityVersionText}>Android 14+ / iOS Uyumlu</Text>
                    </View>

                    {/* 1. Pil Optimizasyonu Muafiyeti (Doze Mode) */}
                    <View style={styles.reliabilityItem}>
                      <View style={styles.reliabilityItemIconWrap}>
                        <Ionicons name="battery-charging" size={18} color="#a9dfca" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                        <Text style={styles.settingTitle}>Pil Optimizasyonu Muafiyeti</Text>
                        <Text style={styles.settingSub}>
                          Telefon Doze (derin uyku) modundayken alarmların gecikmesini veya atlanmasını engeller
                        </Text>
                      </View>
                      <Switch
                        value={batteryExemptionEnabled}
                        onValueChange={async (val) => {
                          triggerHaptic();
                          setBatteryExemptionEnabled(val);
                          if (val) {
                            const ok = await openBatteryOptimizationSettings();
                            if (ok) showToast('⚡ Pil ayarları açıldı. "Kısıtlama Yok" seçiniz.');
                          } else {
                            showToast('Pil muafiyeti kapatıldı (Standart mod)');
                          }
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    <View style={styles.settingDivider} />

                    {/* 2. Exact Alarm (Hassas Zamanlama) */}
                    <View style={styles.reliabilityItem}>
                      <View style={styles.reliabilityItemIconWrap}>
                        <Ionicons name="alarm" size={18} color="#a9dfca" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                        <Text style={styles.settingTitle}>Hassas Alarm İzni (Exact Alarm)</Text>
                        <Text style={styles.settingSub}>
                          İlaç zamanlayıcılarının saniyesi saniyesine ve yüksek öncelikli çalması için sistem alarm izni
                        </Text>
                      </View>
                      <Switch
                        value={exactAlarmEnabled}
                        onValueChange={async (val) => {
                          triggerHaptic();
                          setExactAlarmEnabled(val);
                          if (val) {
                            const ok = await openExactAlarmSettings();
                            if (ok) showToast('⏰ Alarm izinleri açıldı.');
                          } else {
                            showToast('Hassas alarm kapatıldı');
                          }
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    <View style={styles.settingDivider} />

                    {/* 3. Yeniden Başlatma Koruması (Boot) */}
                    <View style={styles.reliabilityItem}>
                      <View style={styles.reliabilityItemIconWrap}>
                        <Ionicons name="sync-circle" size={18} color="#a9dfca" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                        <Text style={styles.settingTitle}>Yeniden Başlatma Koruması (Boot)</Text>
                        <Text style={styles.settingSub}>
                          Telefon kapatılıp açıldığında aktif tüm günlük ilaç alarmları işletim sistemince otomatik baştan kurulur
                        </Text>
                      </View>
                      <Switch
                        value={autoRescheduleOnBoot}
                        onValueChange={(val) => {
                          triggerHaptic();
                          setAutoRescheduleOnBoot(val);
                          showToast(val ? '🔄 Yeniden başlatma koruması devrede' : 'Yeniden başlatma koruması kapatıldı');
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    <View style={styles.settingDivider} />

                    {/* 4. Ekran Kapalıyken Uyandırma (Wake Screen) */}
                    <View style={styles.reliabilityItem}>
                      <View style={styles.reliabilityItemIconWrap}>
                        <Ionicons name="phone-portrait-outline" size={18} color="#a9dfca" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                        <Text style={styles.settingTitle}>Ekran Kapalıyken Uyandır</Text>
                        <Text style={styles.settingSub}>
                          Alarm saatinde telefon kilitliyse ekranı aydınlatıp tam ekran ilaç uyarısını gösterir
                        </Text>
                      </View>
                      <Switch
                        value={wakeScreenOnAlarm}
                        onValueChange={(val) => {
                          triggerHaptic();
                          setWakeScreenOnAlarm(val);
                          showToast(val ? '💡 Ekran uyandırma aktif' : 'Ekran uyandırma kapatıldı');
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    <View style={styles.settingDivider} />

                    {/* 5. Üretici Özel Koruması */}
                    <View style={styles.reliabilityItem}>
                      <View style={styles.reliabilityItemIconWrap}>
                        <Ionicons name="hardware-chip-outline" size={18} color="#a9dfca" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                        <Text style={styles.settingTitle}>Üretici Arka Plan Ayarları</Text>
                        <Text style={styles.settingSub}>
                          Xiaomi (MIUI/HyperOS), Samsung (OneUI) veya Huawei cihazlarda "Otomatik Başlatma" ve kısıtlamasız arka plan izni verin
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reliabilityActionBtn}
                        onPress={async () => {
                          triggerHaptic();
                          const ok = await openChannelNotificationSettings();
                          if (ok) showToast('⚙️ Cihaz ve bildirim izinleri açıldı.');
                        }}
                      >
                        <Text style={styles.reliabilityActionBtnText}>İzinleri Aç</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 6. Canlı Alarm & Titreşim Testi */}
                    <TouchableOpacity
                      style={styles.reliabilityTestBtn}
                      onPress={() => {
                        triggerHaptic();
                        showToast('⏱️ 5 saniye sonra test alarmı çalacak! Telefonu kilitleyip deneyebilirsiniz.');
                        scheduleTestNotification(
                          privateMode,
                          doses[0],
                          payload => {
                            try {
                              Vibration.vibrate([0, 500, 200, 500]);
                            } catch {}
                            setActiveBannerNotification(payload);
                          },
                          { soundEnabled, soundType, hideDoseAmount, repeatNagEnabled }
                        );
                      }}
                    >
                      <Ionicons name="flash" size={18} color="#081624" />
                      <Text style={styles.reliabilityTestBtnText}>5 Sn Sonra Canlı Alarmı Test Et (Kilit Ekranı)</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* SUB PAGE 5: STOK VE ENVANTER */}
              {settingsSubPage === 'stock' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="cube-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>STOK VE ENVANTER</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.settingTitle}>Varsayılan Kritik Stok Eşiği</Text>
                        <View style={styles.selectedPillBadge}>
                          <Text style={styles.selectedPillBadgeText}>{defaultStockThreshold} Doz</Text>
                        </View>
                      </View>
                      <Text style={styles.settingSub}>İlaç miktarı bu sayının altına inince eczane uyarısı verilir</Text>
                      <View style={styles.chipSelector}>
                        {STOCK_THRESHOLD_OPTIONS.map(t => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.choiceChip, defaultStockThreshold === t && styles.choiceChipActive]}
                            onPress={() => {
                              triggerHaptic();
                              setDefaultStockThreshold(t);
                              showToast(`Kritik stok eşiği ${t} doz olarak ayarlandı`);
                            }}
                          >
                            <Text style={[styles.choiceChipText, defaultStockThreshold === t && styles.choiceChipTextActive]}>
                              {t} Doz
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>Kritik Stok Bildirimi</Text>
                        <Text style={styles.settingSub}>İlaç azaldığında cihaz uyarısı göster</Text>
                      </View>
                      <Switch
                        value={stockAlertsEnabled}
                        onValueChange={val => {
                          triggerHaptic();
                          setStockAlertsEnabled(val);
                          showToast(val ? 'Stok uyarıları açıldı' : 'Stok uyarıları kapatıldı');
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* SUB PAGE 6: GİZLİLİK VE KİLİT EKRANI */}
              {settingsSubPage === 'privacy' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>GİZLİLİK VE KİLİT EKRANI</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>İlaç Adını Gizle</Text>
                        <Text style={styles.settingSub}>Kilit ekranında ilacın adını sakla</Text>
                      </View>
                      <Switch
                        value={privateMode}
                        onValueChange={val => {
                          triggerHaptic();
                          setPrivateMode(val);
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>Doz Miktarını Gizle</Text>
                        <Text style={styles.settingSub}>Kilit ekranında kaç tablet/damla olduğu bilgisini sakla</Text>
                      </View>
                      <Switch
                        value={hideDoseAmount}
                        onValueChange={val => {
                          triggerHaptic();
                          setHideDoseAmount(val);
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    {/* Lockscreen Preview */}
                    <View style={styles.notifPreviewCard}>
                      <View style={styles.notifPreviewHeaderRow}>
                        <Text style={styles.notifPreviewTag}>KİLİT EKRANI BİLDİRİM ÖNİZLEMESİ</Text>
                        <View style={styles.previewSoundBadge}>
                          <Ionicons
                            name={soundEnabled && soundType !== 'silent' ? 'volume-medium' : 'volume-mute'}
                            size={12}
                            color={soundEnabled && soundType !== 'silent' ? '#a9dfca' : '#adb3bf'}
                          />
                          <Text style={styles.previewSoundBadgeText}>
                            {soundEnabled && soundType !== 'silent'
                              ? (soundType === 'alarm'
                                  ? 'Alarm Sesi'
                                  : soundType === 'gentle'
                                  ? 'Kibar Ton'
                                  : soundType === 'chime'
                                  ? 'Kristal Zil'
                                  : soundType === 'system_custom'
                                  ? 'Cihaz Sesi'
                                  : 'Sistem Sesi')
                              : 'Sessiz'}
                          </Text>
                        </View>
                      </View>
                      {(() => {
                        const sampleDose = doses[0] ?? {
                          id: 999,
                          name: 'Örnek İlaç',
                          amount: '1 tablet',
                          time: '09:00',
                          mealCondition: 'tok',
                          instructions: 'Kullanım talimatına göre alınız.',
                          stock: 30,
                          stockThreshold: 5,
                          form: 'tablet',
                        };
                        const previewContent = buildNotificationContent(sampleDose, {
                          privateMode,
                          hideDoseAmount,
                          isRepeat: false,
                        });
                        return (
                          <View style={styles.notifPreviewContent}>
                            <View style={styles.notifPreviewIconCircle}>
                              <Ionicons name="notifications" size={18} color="#a9dfca" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.notifPreviewTitle}>
                                {notifications ? previewContent.title : 'Hatırlatıcılar Kapalı'}
                              </Text>
                              <Text style={styles.notifPreviewBody}>
                                {notifications ? previewContent.body : 'Doz bildirimleri kapalı durumdadır.'}
                              </Text>
                              {notifications && repeatNagEnabled && (
                                <View style={styles.notifRepeatNagBadge}>
                                  <Ionicons name="repeat" size={12} color="#a9dfca" />
                                  <Text style={styles.notifRepeatNagBadgeText}>
                                    Onaylanmazsa her 3 dk tekrarlanır ({repeatNagCount} tekrar)
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })()}
                    </View>

                    {/* Test Notification Trigger */}
                    <TouchableOpacity
                      style={styles.testNotificationBtn}
                      onPress={() => {
                        triggerHaptic();
                        showToast('🔔 Test bildirimi zamanlandı! 3 saniye sonra bildirim inecek.');
                        scheduleTestNotification(
                          privateMode,
                          doses[0],
                          payload => {
                            setActiveBannerNotification(payload);
                          },
                          { soundEnabled, soundType, hideDoseAmount, repeatNagEnabled }
                        );
                      }}
                    >
                      <Ionicons name="paper-plane-outline" size={18} color="#081624" />
                      <Text style={styles.testNotificationBtnText}>3 Sn Sonra Test Bildirimi Gönder</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* SUB PAGE 7: UYGULAMA DENEYİMİ */}
              {settingsSubPage === 'experience' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="sparkles-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>UYGULAMA DENEYİMİ</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>Alınan Dozları Otomatik Daralt</Text>
                        <Text style={styles.settingSub}>Bugün sekmesinde alınan ilaçlar katlanmış kalsın</Text>
                      </View>
                      <Switch
                        value={autoCollapseTaken}
                        onValueChange={val => {
                          triggerHaptic();
                          setAutoCollapseTaken(val);
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>Dokunsal Titreşim (Haptics)</Text>
                        <Text style={styles.settingSub}>İşlem butonlarına dokunulduğunda hafif geri bildirim</Text>
                      </View>
                      <Switch
                        value={hapticsEnabled}
                        onValueChange={val => {
                          if (val) {
                            try { Vibration.vibrate(40); } catch {}
                          }
                          setHapticsEnabled(val);
                          showToast(val ? 'Titreşimli geri bildirim açıldı' : 'Titreşim kapatıldı');
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* SUB PAGE 8: SENKRONİZASYON & YEDEKLEME */}
              {settingsSubPage === 'sync' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#38bdf8" />
                    <Text style={[styles.settingGroupTitle, { color: '#38bdf8' }]}>UBUNTU / SELF-HOSTED EŞİTLEME</Text>
                  </View>

                  <View style={styles.syncCard}>
                    <Text style={styles.syncCardDesc}>
                      Kendi Ubuntu sunucunuzdaki veya yerel ağınızdaki Reminder Health REST API'si ile verilerinizi çift yönlü (Smart Merge) senkronize edin.
                    </Text>

                    {/* Server URL Input */}
                    <Text style={styles.inputLabel}>Sunucu Adresi (URL)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={serverUrl}
                      onChangeText={setServerUrl}
                      placeholder="http://192.168.1.50:3000"
                      placeholderTextColor="#667"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    {/* API Token Input */}
                    <Text style={styles.inputLabel}>Erişim Anahtarı (API Token - Opsiyonel)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={apiToken}
                      onChangeText={setApiToken}
                      placeholder="Bearer token veya boş bırakın"
                      placeholderTextColor="#667"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />

                    {/* Status Badge */}
                    {syncStatusMsg ? (
                      <View style={[
                        styles.syncStatusBadge,
                        syncStatus === 'connected' ? styles.syncStatusSuccess :
                        syncStatus === 'error' ? styles.syncStatusError : styles.syncStatusNeutral
                      ]}>
                        <Ionicons
                          name={syncStatus === 'connected' ? 'checkmark-circle' : syncStatus === 'error' ? 'alert-circle' : 'information-circle'}
                          size={16}
                          color={syncStatus === 'connected' ? '#34d399' : syncStatus === 'error' ? '#f87171' : '#38bdf8'}
                        />
                        <Text style={[
                          styles.syncStatusText,
                          { color: syncStatus === 'connected' ? '#34d399' : syncStatus === 'error' ? '#f87171' : '#38bdf8' }
                        ]}>
                          {syncStatusMsg}
                        </Text>
                      </View>
                    ) : null}

                    {/* Buttons: Test & Sync */}
                    <View style={styles.syncActionsRow}>
                      <TouchableOpacity
                        style={styles.syncSecondaryBtn}
                        onPress={handleTestConnection}
                        disabled={syncStatus === 'testing' || syncStatus === 'syncing'}
                      >
                        <Ionicons name="wifi-outline" size={16} color="#a9dfca" />
                        <Text style={styles.syncSecondaryBtnText}>
                          {syncStatus === 'testing' ? 'Bağlanıyor...' : 'Bağlantıyı Test Et'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.syncPrimaryBtn}
                        onPress={handleSyncNow}
                        disabled={syncStatus === 'testing' || syncStatus === 'syncing'}
                      >
                        <Ionicons name="sync-outline" size={16} color="#081624" />
                        <Text style={styles.syncPrimaryBtnText}>
                          {syncStatus === 'syncing' ? 'Eşitleniyor...' : 'Şimdi Eşitle'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="options-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>OTOMATİK EŞİTLEME</Text>
                  </View>

                  <View style={styles.settingCard}>
                    <View style={styles.settingRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.settingTitle}>Otomatik Senkronizasyon</Text>
                        <Text style={styles.settingSub}>Uygulama açıldığında arka planda sunucuyla eşitler</Text>
                      </View>
                      <Switch
                        value={autoSync}
                        onValueChange={val => {
                          triggerHaptic();
                          setAutoSync(val);
                          showToast(val ? 'Otomatik eşitleme açıldı' : 'Otomatik eşitleme kapatıldı');
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>
                    {lastSyncAt && (
                      <View style={styles.settingDivider}>
                        <Text style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 8 }}>
                          🕒 Son başarılı eşitleme: {lastSyncAt}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="save-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>ÇEVRİMDIŞI JSON YEDEKLEME</Text>
                  </View>

                  <View style={styles.syncCard}>
                    <Text style={styles.syncCardDesc}>
                      Sunucunuz olmasa dahi telefonunuzdaki tüm ilaçları, kullanım geçmişini ve ayarları .json dosyası olarak telefonunuza kaydedebilir veya geri yükleyebilirsiniz.
                    </Text>

                    <TouchableOpacity style={styles.backupExportBtn} onPress={handleExportBackup}>
                      <Ionicons name="download-outline" size={18} color="#a9dfca" />
                      <Text style={styles.backupExportBtnText}>Yedeği Dışa Aktar (.json)</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* SUB PAGE 9: HATA & TANILAMA GÜNLÜĞÜ */}
              {settingsSubPage === 'diagnostics' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="bug-outline" size={16} color="#f0b484" />
                    <Text style={[styles.settingGroupTitle, { color: '#f0b484' }]}>HATA & TANILAMA GÜNLÜĞÜ</Text>
                  </View>

                  {/* Summary & Action Card */}
                  <View style={styles.settingCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.settingTitle}>Sistem Sağlık Durumu</Text>
                        <Text style={styles.settingSub}>
                          {diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length > 0
                            ? `${diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length} hata kaydı mevcut`
                            : 'Sistem kararlı, aktif hata yok'}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: diagnosticsLogs.some(l => l.level === 'ERROR' || l.level === 'FATAL') ? '#381616' : '#143532',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: diagnosticsLogs.some(l => l.level === 'ERROR' || l.level === 'FATAL') ? '#6e2727' : '#225e53',
                      }}>
                        <Text style={{
                          color: diagnosticsLogs.some(l => l.level === 'ERROR' || l.level === 'FATAL') ? '#fca5a5' : '#a9dfca',
                          fontSize: 12,
                          fontWeight: '700',
                        }}>
                          {diagnosticsLogs.length} / 100 Kayıt
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                      <TouchableOpacity
                        style={[styles.diagActionBtn, { backgroundColor: '#172c3d', borderColor: '#244763' }]}
                        onPress={async () => {
                          triggerHaptic();
                          const text = logger.exportLogsAsText();
                          try {
                            await Share.share({
                              title: 'Reminder Health Tanılama Günlüğü',
                              message: text,
                            });
                          } catch (err) {
                            Alert.alert('Paylaşılamadı', 'Günlük panoya aktarılamadı.');
                          }
                        }}
                      >
                        <Ionicons name="share-outline" size={16} color="#38bdf8" />
                        <Text style={[styles.diagActionBtnText, { color: '#38bdf8' }]}>Paylaş / Dışa Aktar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.diagActionBtn, { backgroundColor: '#2b171a', borderColor: '#522929' }]}
                        onPress={() => {
                          triggerHaptic();
                          Alert.alert(
                            'Logları Temizle',
                            'Tüm hata ve tanılama kayıtları silinsin mi?',
                            [
                              { text: 'Vazgeç', style: 'cancel' },
                              {
                                text: 'Temizle',
                                style: 'destructive',
                                onPress: () => {
                                  logger.clearLogs();
                                  showToast('Tanılama günlüğü temizlendi');
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ff9696" />
                        <Text style={[styles.diagActionBtnText, { color: '#ff9696' }]}>Temizle</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Test Error Generation */}
                    <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#203244' }}>
                      <Text style={{ fontSize: 11.5, color: '#8e9eaf', marginBottom: 8, fontWeight: '600' }}>
                        Hata Test ve Tanılama Simülasyonu:
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.diagTestBtn, { backgroundColor: '#281a13', borderColor: '#573318' }]}
                          onPress={() => {
                            triggerHaptic();
                            logger.warn('Test', 'Kullanıcı tarafından test uyarısı üretildi.', { source: 'DiagnosticsUI' });
                            showToast('⚠️ Test uyarısı günlüğe eklendi');
                          }}
                        >
                          <Text style={[styles.diagTestBtnText, { color: '#f0b484' }]}>⚠️ Test Uyarısı (WARN)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.diagTestBtn, { backgroundColor: '#33171a', borderColor: '#66282e' }]}
                          onPress={() => {
                            triggerHaptic();
                            try {
                              throw new Error('Kullanıcı kontrollü test hatası (Simüle Edilmiş Hata)');
                            } catch (e) {
                              logger.error('Test', 'Simüle edilmiş hata yakalandı.', e, { origin: 'ManualTrigger' });
                            }
                            showToast('💥 Test hatası yakalandı ve kaydedildi');
                          }}
                        >
                          <Text style={[styles.diagTestBtnText, { color: '#fca5a5' }]}>💥 Test Hatası (ERROR)</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Filter Tabs */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {(['ALL', 'ERROR', 'WARN'] as const).map(f => {
                      const count = f === 'ALL'
                        ? diagnosticsLogs.length
                        : f === 'ERROR'
                        ? diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length
                        : diagnosticsLogs.filter(l => l.level === 'WARN').length;
                      return (
                        <TouchableOpacity
                          key={f}
                          style={[
                            styles.choiceChip,
                            diagnosticsFilter === f && styles.choiceChipActive,
                            { paddingVertical: 8 }
                          ]}
                          onPress={() => {
                            triggerHaptic();
                            setDiagnosticsFilter(f);
                          }}
                        >
                          <Text style={[
                            styles.choiceChipText,
                            diagnosticsFilter === f && styles.choiceChipTextActive,
                            { fontSize: 12 }
                          ]}>
                            {f === 'ALL' ? 'Tümü' : f === 'ERROR' ? 'Hatalar' : 'Uyarılar'} ({count})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Log List */}
                  {diagnosticsLogs
                    .filter(l => {
                      if (diagnosticsFilter === 'ERROR') return l.level === 'ERROR' || l.level === 'FATAL';
                      if (diagnosticsFilter === 'WARN') return l.level === 'WARN';
                      return true;
                    })
                    .length === 0 ? (
                    <View style={[styles.settingCard, { alignItems: 'center', paddingVertical: 32 }]}>
                      <Ionicons name="checkmark-circle-outline" size={44} color="#a9dfca" />
                      <Text style={{ color: '#f5f3f0', fontSize: 15, fontWeight: '700', marginTop: 10 }}>
                        Tertemiz!
                      </Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                        {diagnosticsFilter === 'ALL'
                          ? 'Henüz kaydedilmiş bir sistem günlüğü veya hata bulunmuyor.'
                          : 'Seçili filtreye uygun kayıt bulunmuyor.'}
                      </Text>
                    </View>
                  ) : (
                    diagnosticsLogs
                      .filter(l => {
                        if (diagnosticsFilter === 'ERROR') return l.level === 'ERROR' || l.level === 'FATAL';
                        if (diagnosticsFilter === 'WARN') return l.level === 'WARN';
                        return true;
                      })
                      .map(log => {
                        const isExpanded = expandedLogId === log.id;
                        const isErr = log.level === 'ERROR' || log.level === 'FATAL';
                        const isWarn = log.level === 'WARN';
                        const badgeBg = isErr ? '#3d1616' : isWarn ? '#36220f' : '#102534';
                        const badgeColor = isErr ? '#fca5a5' : isWarn ? '#f0b484' : '#7dd3fc';

                        return (
                          <TouchableOpacity
                            key={log.id}
                            style={[
                              styles.diagCard,
                              {
                                borderColor: isErr ? '#542020' : isWarn ? '#4d3018' : '#203244',
                              }
                            ]}
                            onPress={() => {
                              triggerHaptic();
                              setExpandedLogId(isExpanded ? null : log.id);
                            }}
                            activeOpacity={0.75}
                          >
                            {/* Log Header Row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ backgroundColor: badgeBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ color: badgeColor, fontSize: 10, fontWeight: '800' }}>{log.level}</Text>
                                </View>
                                <Text style={{ color: '#a9dfca', fontSize: 11, fontWeight: '600' }}>[{log.tag}]</Text>
                              </View>
                              <Text style={{ color: '#68778d', fontSize: 11 }}>{log.timeStr}</Text>
                            </View>

                            {/* Log Message */}
                            <Text style={{ color: '#f5f3f0', fontSize: 13, fontWeight: '500', lineHeight: 18 }}>
                              {log.message}
                            </Text>

                            {/* Expandable Indicator */}
                            {(log.stack || (log.breadcrumbs && log.breadcrumbs.length > 0) || log.details) && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, gap: 4 }}>
                                <Text style={{ color: '#68778d', fontSize: 11 }}>{isExpanded ? 'Gizle' : 'Detayları Gör'}</Text>
                                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color="#68778d" />
                              </View>
                            )}

                            {/* Expanded Details */}
                            {isExpanded && (
                              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1c2d3e' }}>
                                {log.details && (
                                  <View style={{ marginBottom: 8 }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', marginBottom: 2 }}>DETAYLAR:</Text>
                                    <Text style={{ color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}>
                                      {JSON.stringify(log.details, null, 2)}
                                    </Text>
                                  </View>
                                )}

                                {log.breadcrumbs && log.breadcrumbs.length > 0 && (
                                  <View style={{ marginBottom: 8 }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', marginBottom: 3 }}>SON EYLEMLER (BREADCRUMBS):</Text>
                                    {log.breadcrumbs.map((b, bi) => (
                                      <Text key={bi} style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace', marginBottom: 1 }}>
                                        {b}
                                      </Text>
                                    ))}
                                  </View>
                                )}

                                {log.stack && (
                                  <View>
                                    <Text style={{ color: '#fca5a5', fontSize: 10, fontWeight: '700', marginBottom: 2 }}>STACK TRACE:</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                      <Text style={{ color: '#fca5a5', fontSize: 10, fontFamily: 'monospace' }}>
                                        {log.stack}
                                      </Text>
                                    </ScrollView>
                                  </View>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })
                  )}
                </>
              )}

              {/* SUB PAGE 10: SIFIRLA */}
              {settingsSubPage === 'reset' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="refresh-outline" size={16} color="#ff9696" />
                    <Text style={[styles.settingGroupTitle, { color: '#ff9696' }]}>VERİLERİ SIFIRLAMA</Text>
                  </View>
                  <View style={styles.resetCard}>
                    <Text style={styles.resetCardText}>
                      ⚠️ Bu işlem tüm ilaç kayıtlarınızı, geçmişinizi ve kişisel ayarlarınızı cihazdan tamamen siler ve ilk kurulum haline döndürür. Bu işlem geri alınamaz.
                    </Text>
                    <TouchableOpacity style={styles.resetBtn} onPress={resetAllData}>
                      <Ionicons name="trash-outline" size={18} color="#ff9696" />
                      <Text style={styles.resetBtnText}>Tüm Verileri ve Ayarları Sıfırla</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={styles.bottomNav}>
          {[
            { id: 'Bugün' as const, label: t.tabToday, icon: 'calendar' },
            { id: 'İlaçlarım' as const, label: t.tabMedicines, icon: 'medkit' },
            { id: 'Geçmiş' as const, label: t.tabHistory, icon: 'time' },
            { id: 'Ayarlar' as const, label: t.tabSettings, icon: 'settings' },
          ].map(tabItem => (
            <TouchableOpacity
              key={tabItem.id}
              style={styles.navItem}
              onPress={() => {
                if (tabItem.id === 'Ayarlar' && tab === 'Ayarlar') {
                  setSettingsSubPage('main');
                }
                logger.breadcrumb(`Sekme değiştirildi: ${tabItem.id}`);
                setTab(tabItem.id);
              }}
            >
              <Ionicons name={tabItem.icon as any} size={22} color={tab === tabItem.id ? '#a9dfca' : '#adb3bf'} />
              <Text style={[styles.navLabel, tab === tabItem.id && styles.navLabelActive]}>{tabItem.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toast Notification */}
        {toastText && (
          <View style={styles.toast}>
            <Text style={styles.toastText} numberOfLines={2}>{toastText}</Text>
            {previousState && (
              <TouchableOpacity onPress={() => { setDoses(previousState.map(d => normalizeDoseDay(d))); setToastText(null); }}>
                <Text style={styles.toastUndo}>{t.undo}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Add / Edit Modal */}
        <Modal visible={editorOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditorOpen(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditorOpen(false)}>
                <Ionicons name="close" size={26} color="#f5f3f0" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingId ? t.modalEditTitle : t.modalAddTitle}</Text>
              <TouchableOpacity onPress={saveDose}>
                <Text style={styles.modalSaveBtn}>{t.save}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              {/* Scan Barcode / Karekod Banner Button */}
              <TouchableOpacity
                style={styles.scanBarcodeBtn}
                onPress={() => {
                  triggerHaptic();
                  setScannerOpen(true);
                }}
              >
                <View style={styles.scanBarcodeIconCircle}>
                  <Ionicons name="camera" size={18} color="#081624" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scanBarcodeBtnTitle}>Karekod / Kutu Tara (ITS)</Text>
                  <Text style={styles.scanBarcodeBtnSub}>Kutudaki DataMatrix karekoddan adı ve SKT'yi otomatik doldur</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#a9dfca" />
              </TouchableOpacity>

              {/* Scanned Barcode Info Badge if available */}
              {currentGTIN && (
                <View style={styles.scannedInfoCard}>
                  <Ionicons name="shield-checkmark" size={16} color="#34d399" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.scannedInfoTitle}>ITS Karekod Eşleşti</Text>
                    <Text style={styles.scannedInfoSub}>
                      Barkod: {currentGTIN} {currentExpiryDate ? `· SKT: ${currentExpiryDate}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.scannedClearBtn}
                    onPress={() => {
                      setCurrentGTIN(null);
                      setCurrentExpiryDate(null);
                      setCurrentBatchNo(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Name */}
              <Text style={styles.inputLabel}>İlaç Adı</Text>
              <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="Örn. Coraspin" placeholderTextColor="#667" />

              {/* Amount & Quick Chips */}
              <Text style={styles.inputLabel}>Doz Miktarı</Text>
              <TextInput style={styles.textInput} value={amount} onChangeText={setAmount} placeholder="Örn. 1 tablet veya 1.5 tablet" placeholderTextColor="#667" />
              <View style={styles.quickRow}>
                {['0.5 tablet', '1 tablet', '1.5 tablet', '2 tablet'].map(amt => (
                  <TouchableOpacity key={amt} style={[styles.quickChip, amount === amt && styles.quickChipActive]} onPress={() => setAmount(amt)}>
                    <Text style={[styles.quickChipText, amount === amt && styles.quickChipTextActive]}>{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form & Meal */}
              <Text style={styles.inputLabel}>İlaç Formu</Text>
              <View style={styles.selectorGrid}>
                {(['tablet', 'kapsul', 'damla', 'surup'] as const).map(f => (
                  <TouchableOpacity key={f} style={[styles.selectorBtn, formType === f && styles.selectorBtnActive]} onPress={() => setFormType(f)}>
                    <Text style={[styles.selectorBtnText, formType === f && styles.selectorBtnTextActive]}>{formLabels[f]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Açlık / Tokluk</Text>
              <View style={styles.selectorGrid}>
                {(['tok', 'ac', 'yemekle', 'farketmez'] as const).map(m => (
                  <TouchableOpacity key={m} style={[styles.selectorBtn, mealCondition === m && styles.selectorBtnActive]} onPress={() => setMealCondition(m)}>
                    <Text style={[styles.selectorBtnText, mealCondition === m && styles.selectorBtnTextActive]}>{mealLabels[m]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Professional Time Selection Section */}
              <View style={styles.timeSectionBox}>
                <View style={styles.timeSectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeSectionTitle}>Alım Günündeki Doz Sayısı & Saatleri</Text>
                    <Text style={styles.timeSectionSub}>Hızlı öğün saatlerini veya +/- 15 dk butonlarını kullanabilirsiniz</Text>
                  </View>
                  <TouchableOpacity style={styles.addSlotMiniBtn} onPress={addDoseSlot}>
                    <Ionicons name="add-circle" size={16} color="#a9dfca" />
                    <Text style={styles.addSlotMiniBtnText}>+ Saat Ekle</Text>
                  </TouchableOpacity>
                </View>

                {/* Dose count selector chips */}
                <View style={styles.doseCountSelectorRow}>
                  {[
                    { count: 1, label: '1 Doz (Tek Sefer)' },
                    { count: 2, label: '2 Doz (Sabah/Akşam)' },
                    { count: 3, label: '3 Doz (Günde 3)' },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.count}
                      style={[styles.doseCountChip, times.length === item.count && styles.doseCountChipActive]}
                      onPress={() => handleDoseCountChange(item.count)}
                    >
                      <Text style={[styles.doseCountChipText, times.length === item.count && styles.doseCountChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Time Slots Cards */}
                {times.map((slotTime, idx) => {
                  const hour = parseInt(slotTime.split(':')[0] || '9', 10);
                  let mealHint = 'Sabah';
                  if (hour >= 5 && hour < 11) mealHint = 'Sabah';
                  else if (hour >= 11 && hour < 16) mealHint = 'Öğle';
                  else if (hour >= 16 && hour < 22) mealHint = 'Akşam';
                  else mealHint = 'Gece';

                  return (
                    <View key={idx} style={styles.timeSlotCard}>
                      <View style={styles.timeSlotCardHeader}>
                        <View style={styles.timeSlotBadge}>
                          <Ionicons name="time" size={12} color="#a9dfca" />
                          <Text style={styles.timeSlotBadgeText}>{idx + 1}. Doz · {mealHint}</Text>
                        </View>
                        {times.length > 1 && (
                          <TouchableOpacity onPress={() => removeDoseSlot(idx)} style={styles.removeSlotBtn}>
                            <Ionicons name="trash-outline" size={13} color="#ff9696" />
                            <Text style={styles.removeSlotBtnText}>Kaldır</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Dual Clock Picker (Numatör & Kolay Fokus) */}
                      <TimeSlotPicker
                        slotTime={slotTime}
                        onChange={val => setSlotTime(idx, val)}
                        onStep={delta => stepSlotMinutes(idx, delta)}
                      />

                      {/* Quick Meal Preset Chips */}
                      <View style={styles.slotPresetsRow}>
                        {[
                          { label: '08:00 Sabah', time: '08:00' },
                          { label: '13:00 Öğle', time: '13:00' },
                          { label: '19:00 Akşam', time: '19:00' },
                          { label: '22:30 Gece', time: '22:30' },
                        ].map(p => (
                          <TouchableOpacity
                            key={p.time}
                            style={[styles.slotPresetChip, slotTime === p.time && styles.slotPresetChipActive]}
                            onPress={() => setSlotTime(idx, p.time)}
                          >
                            <Text style={[styles.slotPresetChipText, slotTime === p.time && styles.slotPresetChipTextActive]}>
                              {p.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Schedule & Cycle */}
              <Text style={styles.inputLabel}>Kullanım Düzeni & Döngü</Text>
              <View style={styles.selectorGrid}>
                {[
                  { id: 'everyday' as const, label: 'Her gün' },
                  { id: 'alternate' as const, label: 'Gün aşırı' },
                  { id: 'cycle' as const, label: 'Al / Ara Döngüsü' },
                  { id: 'variable' as const, label: 'Değişken Doz' },
                ].map(opt => (
                  <TouchableOpacity key={opt.id} style={[styles.selectorBtn, frequencyType === opt.id && styles.selectorBtnActive]} onPress={() => setFrequencyType(opt.id)}>
                    <Text style={[styles.selectorBtnText, frequencyType === opt.id && styles.selectorBtnTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cycle config */}
              {frequencyType === 'cycle' && (
                <View style={styles.cycleBox}>
                  <Text style={styles.cycleBoxTitle}>Alım & Ara Verme Döngüsü</Text>
                  <View style={styles.presetRow}>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => applyCyclePreset(3, amount, 4, '0 (Ara)', 'cycle')}>
                      <Text style={styles.presetBtnText}>3 gün al / 4 gün ara</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => applyCyclePreset(5, amount, 2, '0 (Ara)', 'cycle')}>
                      <Text style={styles.presetBtnText}>5 gün al / 2 gün ara</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.twoColRow}>
                    <View style={styles.col}>
                      <Text style={styles.timeInputLabel}>Alım Gün Sayısı</Text>
                      <TextInput
                        style={styles.textInput}
                        value={cyclePhase1Days}
                        onChangeText={v => setCyclePhase1Days(v.replace(/[^0-9]/g, ''))}
                        placeholder="1"
                        placeholderTextColor="#667"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.timeInputLabel}>Ara Gün Sayısı</Text>
                      <TextInput
                        style={styles.textInput}
                        value={cyclePhase2Days}
                        onChangeText={v => setCyclePhase2Days(v.replace(/[^0-9]/g, ''))}
                        placeholder="1"
                        placeholderTextColor="#667"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Variable cycle config */}
              {frequencyType === 'variable' && (
                <View style={styles.cycleBox}>
                  <Text style={styles.cycleBoxTitle}>Değişken / Kademeli Doz Döngüsü</Text>
                  <View style={styles.presetRow}>
                    <TouchableOpacity style={[styles.presetBtn, styles.presetBtnHighlight]} onPress={() => applyCyclePreset(4, '1.5 tablet', 3, '1 tablet', 'variable')}>
                      <Text style={styles.presetBtnHighlightText}>⭐ 4 gün 1.5 doz / 3 gün 1 doz</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.phaseCard}>
                    <Text style={styles.phaseCardBadge}>1. AŞAMA</Text>
                    <View style={styles.twoColRow}>
                      <View style={styles.col}>
                        <Text style={styles.timeInputLabel}>Gün Sayısı</Text>
                        <TextInput
                          style={styles.textInput}
                          value={cyclePhase1Days}
                          onChangeText={v => setCyclePhase1Days(v.replace(/[^0-9]/g, ''))}
                          placeholder="1"
                          placeholderTextColor="#667"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.col}>
                        <Text style={styles.timeInputLabel}>Doz Miktarı</Text>
                        <TextInput style={styles.textInput} value={cyclePhase1Amount} onChangeText={setCyclePhase1Amount} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.phaseCard}>
                    <Text style={styles.phaseCardBadge}>2. AŞAMA</Text>
                    <View style={styles.twoColRow}>
                      <View style={styles.col}>
                        <Text style={styles.timeInputLabel}>Gün Sayısı</Text>
                        <TextInput
                          style={styles.textInput}
                          value={cyclePhase2Days}
                          onChangeText={v => setCyclePhase2Days(v.replace(/[^0-9]/g, ''))}
                          placeholder="1"
                          placeholderTextColor="#667"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.col}>
                        <Text style={styles.timeInputLabel}>Doz Miktarı</Text>
                        <TextInput style={styles.textInput} value={cyclePhase2Amount} onChangeText={setCyclePhase2Amount} />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Duration & Treatment Period */}
              <Text style={styles.inputLabel}>Tedavi / Kullanım Süresi</Text>
              <View style={styles.selectorGrid}>
                <TouchableOpacity
                  style={[styles.selectorBtn, durationMode === 'continuous' && styles.selectorBtnActive]}
                  onPress={() => setDurationMode('continuous')}
                >
                  <Text style={[styles.selectorBtnText, durationMode === 'continuous' && styles.selectorBtnTextActive]}>
                    Sürekli (Kronik)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectorBtn, durationMode === 'days' && styles.selectorBtnActive]}
                  onPress={() => setDurationMode('days')}
                >
                  <Text style={[styles.selectorBtnText, durationMode === 'days' && styles.selectorBtnTextActive]}>
                    Süreli Tedavi (Kür)
                  </Text>
                </TouchableOpacity>
              </View>

              {durationMode === 'days' && (
                <View style={styles.cycleBox}>
                  <Text style={styles.cycleBoxTitle}>Tedavi Süresi & Bitiş Takvimi</Text>
                  <View style={styles.presetRow}>
                    {[
                      { days: '5', label: '5 Gün' },
                      { days: '7', label: '7 Gün (Antibiyotik)' },
                      { days: '10', label: '10 Gün' },
                      { days: '14', label: '14 Gün (2 Hafta)' },
                      { days: '30', label: '30 Gün (1 Kutu)' },
                    ].map(p => (
                      <TouchableOpacity
                        key={p.days}
                        style={[styles.presetBtn, durationDays === p.days && styles.presetBtnHighlight]}
                        onPress={() => setDurationDays(p.days)}
                      >
                        <Text style={[styles.presetBtnText, durationDays === p.days && styles.presetBtnHighlightText]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={styles.col}>
                      <Text style={styles.timeInputLabel}>Toplam Tedavi Günü</Text>
                      <TextInput
                        style={styles.textInput}
                        value={durationDays}
                        onChangeText={v => setDurationDays(v.replace(/[^0-9]/g, ''))}
                        placeholder="7"
                        placeholderTextColor="#667"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.timeInputLabel}>Başlangıç Tarihi</Text>
                      <TextInput
                        style={styles.textInput}
                        value={startDate}
                        onChangeText={setStartDate}
                        placeholder={today}
                        placeholderTextColor="#667"
                      />
                    </View>
                  </View>

                  <View style={styles.durationSummaryBanner}>
                    <Ionicons name="calendar-outline" size={16} color="#a9dfca" />
                    <Text style={styles.durationSummaryBannerText}>
                      {startDate} tarihinde başlar · {calculateEndDate(startDate, Number(durationDays) || 7)} tarihinde son doz ({durationDays || 7} gün).
                    </Text>
                  </View>
                </View>
              )}

              {/* Stock & Box */}
              <Text style={styles.inputLabel}>Kutu & Stok Takibi</Text>
              <View style={styles.twoColRow}>
                <View style={styles.col}>
                  <Text style={styles.timeInputLabel}>Kalan Stok (adet)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={stock}
                    onChangeText={v => setStock(v.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor="#667"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.timeInputLabel}>Uyarı Eşiği</Text>
                  <TextInput
                    style={styles.textInput}
                    value={stockThreshold}
                    onChangeText={v => setStockThreshold(v.replace(/[^0-9]/g, ''))}
                    placeholder="5"
                    placeholderTextColor="#667"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.refillBtn}
                onPress={() => {
                  setStock(s => String((Number(s) || 0) + 30));
                  Alert.alert('Kutu Eklendi', '+30 tablet stoğa eklendi.');
                }}
              >
                <Ionicons name="refresh" size={16} color="#a9dfca" />
                <Text style={styles.refillBtnText}>+30 Kutu Yenile</Text>
              </TouchableOpacity>

              {/* Delete if editing */}
              {editingId && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDose(editingId)}>
                  <Ionicons name="trash-outline" size={18} color="#ff9696" />
                  <Text style={styles.deleteBtnText}>İlacı Sil</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* ITS Camera Scanner Modal */}
        <CameraScannerModal
          visible={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanResult={handleScanResult}
          learnedMeds={learnedMeds}
        />
      </View>
    </SafeAreaView>
  </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#081624' },
  container: { flex: 1, backgroundColor: '#081624' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#f5f3f0' },
  headerSubtitle: { fontSize: 13, color: '#adb3bf', marginTop: 4 },
  progressBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#152332', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  progressText: { fontSize: 12, color: '#adb3bf' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#a9dfca', justifyContent: 'center', alignItems: 'center' },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Hero Card
  heroCard: { backgroundColor: '#152332', borderRadius: 16, padding: 20, alignItems: 'center', marginVertical: 12 },
  heroEyebrow: { color: '#a9dfca', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  heroTime: { fontSize: 64, fontWeight: '700', color: '#f5f3f0', marginVertical: 4 },
  heroName: { fontSize: 26, fontWeight: '700', color: '#f5f3f0' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginVertical: 10 },
  chipMeal: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#142d2a', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: '#234842' },
  chipMealText: { color: '#a9dfca', fontSize: 11, fontWeight: '600' },
  chipForm: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a2938', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  chipFormText: { color: '#f5f3f0', fontSize: 11, fontWeight: '500' },
  chipCycle: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#143532', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  chipCycleText: { color: '#a9dfca', fontSize: 11, fontWeight: '600' },
  chipStock: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a2938', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  chipStockText: { color: '#adb3bf', fontSize: 11, fontWeight: '500' },
  chipStockLow: { backgroundColor: '#332214', borderColor: '#5c3e24', borderWidth: 1 },
  chipStockLowText: { color: '#f0b484', fontWeight: '700' },
  heroAmount: { fontSize: 14, color: '#adb3bf', marginTop: 4, marginBottom: 16 },
  takeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#a9dfca', width: '100%', height: 52, borderRadius: 12 },
  takeBtnText: { color: '#092326', fontSize: 18, fontWeight: '700' },
  heroSecondaryActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 12 },
  heroSecBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#3a4655' },
  heroSecBtnText: { color: '#adb3bf', fontSize: 13, fontWeight: '500' },

  // Off-Cycle Box
  offCycleBox: { backgroundColor: '#111e2b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#233446', marginVertical: 12 },
  offCycleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  offCycleHeaderText: { color: '#a9dfca', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  offCycleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#162738', padding: 10, borderRadius: 8, marginTop: 6 },
  offCycleItemName: { color: '#f5f3f0', fontSize: 14, fontWeight: '600' },
  offCycleItemSub: { color: '#adb3bf', fontSize: 11, marginTop: 2 },
  offBadge: { backgroundColor: '#23374a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  offBadgeText: { color: '#adb3bf', fontSize: 11, fontWeight: '600' },

  // Remaining & List
  sectionHeader: { marginTop: 16, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#23313f' },
  sectionTitle: { color: '#adb3bf', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  doseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a2736', gap: 12 },
  doseRowTime: { color: '#f5f3f0', fontSize: 16, fontWeight: '600', width: 50 },
  doseRowMain: { flex: 1 },
  doseRowName: { color: '#f5f3f0', fontSize: 15, fontWeight: '600' },
  doseRowSub: { color: '#adb3bf', fontSize: 12, marginTop: 2 },
  quickTakeBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#234842', justifyContent: 'center', alignItems: 'center' },
  quietEmpty: { color: '#adb3bf', fontSize: 13, paddingVertical: 12 },

  // Taken Toggle
  takenToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, marginTop: 10 },
  takenToggleText: { color: '#adb3bf', fontSize: 14, flex: 1 },
  takenList: { backgroundColor: '#101d29', borderRadius: 10, paddingHorizontal: 12 },

  // Meds Cards
  medsHeader: { marginVertical: 12 },
  medCard: { backgroundColor: '#152332', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#203244' },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  medCardTime: { color: '#a9dfca', fontSize: 14, fontWeight: '600' },
  medCardBadges: { flexDirection: 'row', gap: 6 },
  cycleTag: { backgroundColor: '#143532', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cycleTagText: { color: '#a9dfca', fontSize: 10, fontWeight: '600' },
  cycleTagOff: { backgroundColor: '#232c37' },
  cycleTagOffText: { color: '#adb3bf' },
  stockPill: { backgroundColor: '#1a2938', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stockPillText: { color: '#adb3bf', fontSize: 10, fontWeight: '600' },
  stockPillLow: { backgroundColor: '#332214' },
  stockPillLowText: { color: '#f0b484', fontWeight: '700' },
  medCardName: { color: '#f5f3f0', fontSize: 16, fontWeight: '600' },
  medCardSub: { color: '#adb3bf', fontSize: 12, marginTop: 3 },
  fullAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a2a3a', height: 48, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#2e4155' },
  fullAddBtnText: { color: '#f5f3f0', fontSize: 14, fontWeight: '600' },

  // Adherence History Card
  adherenceCard: { backgroundColor: '#152332', borderRadius: 14, padding: 16, marginBottom: 20 },
  adherencePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adherencePillText: { color: '#a9dfca', fontSize: 15, fontWeight: '700' },
  adherenceSub: { color: '#adb3bf', fontSize: 12, marginTop: 4, marginBottom: 14 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  weekPill: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, marginHorizontal: 2, backgroundColor: '#101d29' },
  weekPillActive: { backgroundColor: '#163832', borderWidth: 1, borderColor: '#a9dfca' },
  weekPillLabel: { color: '#adb3bf', fontSize: 10 },
  weekPillNum: { color: '#f5f3f0', fontSize: 14, fontWeight: '700', marginVertical: 3 },
  weekDot: { width: 5, height: 5, borderRadius: 2.5 },
  dotComplete: { backgroundColor: '#a9dfca' },
  dotToday: { borderWidth: 1, borderColor: '#a9dfca' },

  // Settings List Menu & Navigation
  settingsSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  settingsBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#152332',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#203244',
  },
  settingsBackBtnText: {
    color: '#a9dfca',
    fontSize: 13,
    fontWeight: '700',
  },
  settingsSubHeaderTitle: {
    color: '#f5f3f0',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  menuListCard: {
    backgroundColor: '#152332',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#203244',
  },
  menuListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuItemTitle: {
    color: '#f5f3f0',
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemSub: {
    color: '#8e9eaf',
    fontSize: 12,
    marginTop: 2,
  },
  menuListDivider: {
    height: 1,
    backgroundColor: '#1c2d3e',
    marginLeft: 64,
  },
  resetCard: {
    backgroundColor: '#1f1618',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4d2026',
  },
  resetCardText: {
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },

  // Settings
  settingsContainer: { paddingTop: 10 },
  settingGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  settingGroupTitle: { color: '#a9dfca', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  settingCard: { backgroundColor: '#152332', borderRadius: 12, padding: 16, marginBottom: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingTitle: { color: '#f5f3f0', fontSize: 15, fontWeight: '600' },
  settingSub: { color: '#adb3bf', fontSize: 12, marginTop: 2 },
  settingDivider: { height: 1, backgroundColor: '#203244', marginVertical: 14 },
  profileInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#101d29', borderRadius: 8, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#203244', marginTop: 10 },
  profileInput: { flex: 1, color: '#f5f3f0', fontSize: 14, fontWeight: '600' },
  selectedPillBadge: { backgroundColor: '#143532', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#215c52' },
  selectedPillBadgeText: { color: '#a9dfca', fontSize: 11, fontWeight: '700' },
  chipSelector: { flexDirection: 'row', gap: 6, marginTop: 10 },
  choiceChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#101d29', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#203244' },
  choiceChipActive: { backgroundColor: '#163832', borderColor: '#a9dfca' },
  choiceChipText: { color: '#adb3bf', fontSize: 11, fontWeight: '600' },
  choiceChipTextActive: { color: '#a9dfca', fontWeight: '700' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#5c2d33', marginTop: 8, marginBottom: 20 },
  resetBtnText: { color: '#ff9696', fontSize: 14, fontWeight: '600' },
  permBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#332617', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#664d26' },
  permBannerText: { color: '#f0b484', fontSize: 12, flex: 1, marginLeft: 8, marginRight: 8 },
  permBannerBtn: { backgroundColor: '#f0b484', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  permBannerBtnText: { color: '#241708', fontSize: 12, fontWeight: '700' },
  testNotificationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#a9dfca', height: 46, borderRadius: 10, marginTop: 14 },
  testNotificationBtnText: { color: '#081624', fontSize: 14, fontWeight: '700' },
  notifPreviewCard: { backgroundColor: '#101d29', borderRadius: 10, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#203244' },
  notifPreviewHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  notifPreviewTag: { color: '#a9dfca', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  previewSoundBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#182836', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#23384c' },
  previewSoundBadgeText: { color: '#a9dfca', fontSize: 10, fontWeight: '600' },
  notifPreviewContent: { flexDirection: 'row', alignItems: 'center' },
  notifPreviewIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#143532', alignItems: 'center', justifyContent: 'center' },
  notifPreviewTitle: { color: '#f5f3f0', fontSize: 14, fontWeight: '600' },
  notifPreviewBody: { color: '#adb3bf', fontSize: 12, marginTop: 2 },

  // Sound section styles
  soundSection: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#203244' },
  soundSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  soundSectionTitle: { color: '#a9dfca', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  testSoundHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#183335', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#2d5a52' },
  testSoundHeaderBtnText: { color: '#a9dfca', fontSize: 11, fontWeight: '700' },
  soundOptionsList: { gap: 8 },
  soundOptionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#101d29', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#203244' },
  soundOptionCardActive: { borderColor: '#a9dfca', backgroundColor: '#122634' },
  soundOptionIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#182b3a', alignItems: 'center', justifyContent: 'center' },
  soundOptionIconCircleActive: { backgroundColor: '#a9dfca' },
  soundOptionTitle: { color: '#f5f3f0', fontSize: 13, fontWeight: '600' },
  soundOptionTitleActive: { color: '#ffffff' },
  soundOptionBadge: { backgroundColor: '#1f3040', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  soundOptionBadgeActive: { backgroundColor: '#17403a' },
  soundOptionBadgeText: { color: '#adb3bf', fontSize: 10, fontWeight: '600' },
  soundOptionBadgeTextActive: { color: '#a9dfca' },
  soundOptionSub: { color: '#8892a0', fontSize: 11, marginTop: 2 },

  deviceSoundActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#122533',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#26564f',
  },
  deviceSoundActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#a9dfca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceSoundActionTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  deviceSoundActionSub: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  deviceSoundTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0c1822',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1d3244',
  },
  deviceSoundTipText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },

  // Language Options
  languageOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  languageOptionCardActive: {},
  languageOptionTitle: {
    color: '#f5f3f0',
    fontSize: 16,
    fontWeight: '600',
  },
  languageOptionSub: {
    color: '#8e9fac',
    fontSize: 12,
    marginTop: 3,
  },
  languageDefaultBadge: {
    backgroundColor: 'rgba(169, 223, 202, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  languageDefaultBadgeText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty Card
  emptyCard: { backgroundColor: '#152332', borderRadius: 14, padding: 24, alignItems: 'center', marginVertical: 12 },
  emptyCardTitle: { color: '#f5f3f0', fontSize: 18, fontWeight: '700', marginTop: 10 },
  emptyCardSub: { color: '#adb3bf', fontSize: 13, marginTop: 4 },

  // Bottom Navigation
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 75, flexDirection: 'row', backgroundColor: '#081624', borderTopWidth: 1, borderTopColor: '#23313f', paddingBottom: Platform.OS === 'ios' ? 15 : 5 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: '#adb3bf', fontSize: 11, marginTop: 4 },
  navLabelActive: { color: '#a9dfca', fontWeight: '600' },

  // Toast
  toast: { position: 'absolute', bottom: 85, left: 16, right: 16, backgroundColor: '#193c37', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#48655f' },
  toastText: { color: '#f5f3f0', fontSize: 13, flex: 1, marginRight: 8 },
  toastUndo: { color: '#a9dfca', fontSize: 13, fontWeight: '700' },

  // Floating Push Banner
  pushNotificationBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 14,
    right: 14,
    zIndex: 9999,
    backgroundColor: '#152535',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#a9dfca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  pushBannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pushBannerAppRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pushBannerAppName: { color: '#a9dfca', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  pushBannerTitle: { color: '#f5f3f0', fontSize: 16, fontWeight: '700' },
  pushBannerBody: { color: '#adb3bf', fontSize: 13, marginTop: 4, marginBottom: 12 },
  pushBannerActions: { flexDirection: 'row', gap: 10 },
  pushBannerActionTake: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#a9dfca', height: 38, borderRadius: 8 },
  pushBannerActionTakeText: { color: '#081624', fontSize: 13, fontWeight: '700' },
  pushBannerActionSnooze: { flex: 1.1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#213244', height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#33485c' },
  pushBannerActionSnoozeText: { color: '#f5f3f0', fontSize: 13, fontWeight: '600' },
  pushBannerActionSkip: { paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#2b161f', height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#5c2234' },
  pushBannerActionSkipText: { color: '#f87171', fontSize: 13, fontWeight: '600' },
  notifRepeatNagBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#112926', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#1d4d42' },
  notifRepeatNagBadgeText: { color: '#a9dfca', fontSize: 11, fontWeight: '600' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#081624' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#203244' },
  modalTitle: { color: '#f5f3f0', fontSize: 17, fontWeight: '700' },
  modalSaveBtn: { color: '#a9dfca', fontSize: 16, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 60 },
  inputLabel: { color: '#adb3bf', fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  textInput: { backgroundColor: '#13212f', borderWidth: 1, borderColor: '#28394a', borderRadius: 8, padding: 12, color: '#f5f3f0', fontSize: 15 },
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  quickChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#101d29', borderWidth: 1, borderColor: '#28394a' },
  quickChipActive: { backgroundColor: '#163832', borderColor: '#a9dfca' },
  quickChipText: { color: '#adb3bf', fontSize: 11 },
  quickChipTextActive: { color: '#a9dfca', fontWeight: '600' },
  selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selectorBtn: { flex: 1, minWidth: '45%', backgroundColor: '#13212f', borderWidth: 1, borderColor: '#28394a', paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  selectorBtnActive: { backgroundColor: '#163832', borderColor: '#a9dfca' },
  selectorBtnText: { color: '#adb3bf', fontSize: 12 },
  selectorBtnTextActive: { color: '#a9dfca', fontWeight: '600' },
  timePickersRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  timeInputCol: { flex: 1 },
  timeInputLabel: { color: '#adb3bf', fontSize: 11, marginBottom: 4 },
  timeInput: { backgroundColor: '#13212f', borderWidth: 1, borderColor: '#28394a', borderRadius: 8, padding: 10, color: '#f5f3f0', fontSize: 15, textAlign: 'center' },
  cycleBox: { backgroundColor: '#101d29', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#23374d', marginTop: 8 },
  cycleBoxTitle: { color: '#a9dfca', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  presetRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  presetBtn: { backgroundColor: '#152535', borderWidth: 1, borderColor: '#28394a', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  presetBtnHighlight: { borderColor: '#355a50', backgroundColor: '#173b37' },
  presetBtnText: { color: '#adb3bf', fontSize: 11 },
  presetBtnHighlightText: { color: '#cbf5e5', fontSize: 11, fontWeight: '700' },
  twoColRow: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  phaseCard: { backgroundColor: '#132230', borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#233547' },
  phaseCardBadge: { color: '#a9dfca', fontSize: 10, fontWeight: '700', marginBottom: 6 },
  refillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#234842', backgroundColor: '#142d2a', marginTop: 10 },
  refillBtnText: { color: '#a9dfca', fontSize: 13, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 8, borderWidth: 1, borderColor: '#5c2d33', marginTop: 24 },
  deleteBtnText: { color: '#ff9696', fontSize: 14, fontWeight: '600' },

  // Professional Time Section Styles
  timeSectionBox: { backgroundColor: '#101d29', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#23374d', marginTop: 14 },
  timeSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  timeSectionTitle: { color: '#f5f3f0', fontSize: 14, fontWeight: '700' },
  timeSectionSub: { color: '#adb3bf', fontSize: 11, marginTop: 2 },
  addSlotMiniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#163832', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#a9dfca' },
  addSlotMiniBtnText: { color: '#a9dfca', fontSize: 12, fontWeight: '700' },
  doseCountSelectorRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  doseCountChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#13212f', borderWidth: 1, borderColor: '#28394a' },
  doseCountChipActive: { backgroundColor: '#163832', borderColor: '#a9dfca' },
  doseCountChipText: { color: '#adb3bf', fontSize: 11 },
  doseCountChipTextActive: { color: '#a9dfca', fontWeight: '700' },
  timeSlotCard: { backgroundColor: '#152535', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#283c50' },
  timeSlotCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timeSlotBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#163832', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  timeSlotBadgeText: { color: '#a9dfca', fontSize: 11, fontWeight: '700' },
  removeSlotBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2 },
  removeSlotBtnText: { color: '#ff9696', fontSize: 11 },
  timeStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  stepBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#1b2d3e', height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#2e455c' },
  stepBtnText: { color: '#a9dfca', fontSize: 12, fontWeight: '600' },
  dualClockContainer: {
    flex: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clockBox: {
    flex: 1,
    height: 48,
    backgroundColor: '#0a1420',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#243b52',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  clockBoxFocused: {
    borderColor: '#a9dfca',
    backgroundColor: '#112929',
    shadowColor: '#a9dfca',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  clockBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#64748b',
    marginBottom: -2,
  },
  clockBoxLabelFocused: {
    color: '#a9dfca',
  },
  clockDigitInput: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 38,
    height: 28,
    padding: 0,
    letterSpacing: 1,
  },
  clockSeparator: {
    color: '#a9dfca',
    fontSize: 22,
    fontWeight: '900',
    marginHorizontal: 1,
    paddingBottom: 2,
  },
  slotPresetsRow: { flexDirection: 'row', gap: 6 },
  slotPresetChip: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6, backgroundColor: '#101d29', borderWidth: 1, borderColor: '#25374a' },
  slotPresetChipActive: { backgroundColor: '#163832', borderColor: '#a9dfca' },
  slotPresetChipText: { color: '#94a3b8', fontSize: 10 },
  slotPresetChipTextActive: { color: '#cbf5e5', fontWeight: '700' },

  // Duration Badges & Boxes
  durationSummaryBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#122533', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#224055' },
  durationSummaryBannerText: { color: '#cbd5e1', fontSize: 12, flex: 1 },
  chipDuration: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#13332d', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#276156' },
  chipDurationExpired: { backgroundColor: '#202832', borderColor: '#334155' },
  chipDurationText: { color: '#a9dfca', fontSize: 10, fontWeight: '700' },
  durationTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#13332d', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  durationTagExpired: { backgroundColor: '#1e293b' },
  durationTagText: { color: '#a9dfca', fontSize: 10, fontWeight: '700' },
  durationTagTextExpired: { color: '#94a3b8' },
  medCardDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  medCardDurationText: { color: '#a9dfca', fontSize: 11 },
  completedBox: { backgroundColor: '#10221c', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#224c3d', marginTop: 14 },
  completedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  completedHeaderText: { color: '#34d399', fontSize: 12, fontWeight: '700' },
  completedItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#17362b' },
  completedItemName: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  completedItemSub: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  completedBadge: { backgroundColor: '#163b2f', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#34d399' },
  completedBadgeText: { color: '#34d399', fontSize: 10, fontWeight: '700' },

  // Reliability & Device Protection Styles
  reliabilityStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c2226',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#194943',
  },
  reliabilityStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  reliabilityStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  reliabilityStatusText: {
    color: '#d1fae5',
    fontSize: 12,
    fontWeight: '600',
  },
  reliabilityStatusAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reliabilityStatusActionText: {
    color: '#a9dfca',
    fontSize: 11,
    fontWeight: '700',
  },
  reliabilityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1d2f42',
  },
  reliabilityBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#12332e',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#246156',
  },
  reliabilityBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  reliabilityBadgeActiveText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  reliabilityVersionText: {
    color: '#64748b',
    fontSize: 11,
  },
  reliabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reliabilityItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#122533',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#224055',
  },
  reliabilityActionBtn: {
    backgroundColor: '#163832',
    borderWidth: 1,
    borderColor: '#a9dfca',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  reliabilityActionBtnText: {
    color: '#a9dfca',
    fontSize: 11,
    fontWeight: '700',
  },
  reliabilityStatusPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#12332e',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#246156',
  },
  reliabilityStatusPillActiveText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  reliabilityTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#a9dfca',
    height: 46,
    borderRadius: 10,
    marginTop: 14,
  },
  reliabilityTestBtnText: {
    color: '#081624',
    fontSize: 13,
    fontWeight: '700',
  },
  scanBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#122938',
    borderWidth: 1.5,
    borderColor: '#245163',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanBarcodeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#a9dfca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBarcodeBtnTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  scanBarcodeBtnSub: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  scannedInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12332e',
    borderWidth: 1,
    borderColor: '#246156',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  scannedInfoTitle: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  scannedInfoSub: {
    color: '#a9dfca',
    fontSize: 11,
    marginTop: 2,
  },
  scannedClearBtn: {
    padding: 4,
  },
  syncCard: {
    backgroundColor: '#12202e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e384f',
    padding: 16,
    marginBottom: 16,
  },
  syncCardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  syncStatusSuccess: {
    backgroundColor: '#0c2820',
    borderWidth: 1,
    borderColor: '#1e5e4a',
  },
  syncStatusError: {
    backgroundColor: '#2e1218',
    borderWidth: 1,
    borderColor: '#6b2533',
  },
  syncStatusNeutral: {
    backgroundColor: '#102838',
    borderWidth: 1,
    borderColor: '#1d4865',
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  syncActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  syncPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#a9dfca',
    height: 44,
    borderRadius: 10,
  },
  syncPrimaryBtnText: {
    color: '#081624',
    fontSize: 13,
    fontWeight: '700',
  },
  syncSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#172c3d',
    borderWidth: 1,
    borderColor: '#244763',
    height: 44,
    borderRadius: 10,
  },
  syncSecondaryBtnText: {
    color: '#a9dfca',
    fontSize: 13,
    fontWeight: '600',
  },
  backupExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#172c3d',
    borderWidth: 1,
    borderColor: '#244763',
    height: 46,
    borderRadius: 10,
    marginTop: 4,
  },
  backupExportBtnText: {
    color: '#a9dfca',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Diagnostics Styles
  diagActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  diagActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  diagTestBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagTestBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  diagCard: {
    backgroundColor: '#152332',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#203244',
  },
});
