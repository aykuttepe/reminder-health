import {Keyboard} from 'react-native';
import {setNotificationIdMap} from './src/notifications';
import {newId, migrateDoseIds, switchAccount, finishSwitch, assertAccount, accountKey, type Session, type Snapshot} from './src/account';
import {login, recover, registerAccount, updateUserEmail, getStoredSyncCode, getSession, logout, authRequest, localStore} from './src/authClient';
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
  Linking,
} from 'react-native';
import { useResponsive } from './src/useResponsive';

const CAROUSEL_SPACING = 10;
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
  createNotificationResponseGate,
  takeLaunchNotificationResponse,
  type NotificationActionResponse,
  URGENT_REPEAT_CHANNEL_ID,
  NOTIFICATION_CATEGORY_MED_ACTIONS,
  ACTION_TAKEN,
  ACTION_SNOOZE,
  ACTION_SKIP,
  ACTION_APPT_SNOOZE_1H,
  ACTION_APPT_SNOOZE_3H,
  ACTION_APPT_DONE,
  syncDoctorAppointmentNotifications,
  snoozeDoctorAppointmentNotification,
  cancelDoctorAppointmentNotifications,
  NotificationSoundType,
  ActiveNotificationPayload,
} from './src/notifications';
import { CameraScannerModal } from './src/components/CameraScannerModal';
import { CalendarModal, formatLocalizedDate, formatTurkishDate } from './src/components/CalendarModal';
import { AppointmentEditorModal } from './src/components/AppointmentEditorModal';
import { TodayView } from './src/components/TodayView';
import { MedicationList } from './src/components/MedicationList';
import { HistoryView } from './src/components/HistoryView';
import { changeDoseRecord, undoDoseRecord } from './src/doseUndo';
import { CatalogMedicine } from './src/data/medCatalog';
import { checkForAppUpdates, UpdateCheckResult, CURRENT_APP_VERSION } from './src/updateChecker';
import {
  DEFAULT_SYNC_SERVER_URL,
  restoreServerUrl,
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
  formatStock, getCycleInfo, getCalendarDayDiff, buildHistorySlots,
  type MealCondition, type MedicineForm, type FrequencyType, type Dose, type ScheduledSlot, type AppointmentItem,
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
  lang = 'tr',
}: {
  slotTime: string;
  onChange: (time: string) => void;
  onStep: (deltaMinutes: number) => void;
  lang?: Language;
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
        <Text style={styles.stepBtnText}>{lang === 'en' ? '15 min' : '15 dk'}</Text>
      </TouchableOpacity>

      <View style={styles.dualClockContainer}>
        {/* Hour Input Block */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.clockBox, isHourFocused && styles.clockBoxFocused]}
          onPress={() => hourRef.current?.focus()}
        >
          <Text style={[styles.clockBoxLabel, isHourFocused && styles.clockBoxLabelFocused]}>
            {lang === 'en' ? 'HOUR' : 'SAAT'}
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
            {lang === 'en' ? 'MIN' : 'DAKİKA'}
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
        <Text style={styles.stepBtnText}>{lang === 'en' ? '15 min' : '15 dk'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MainApp() {
  const { isTablet, contentMaxWidth, tabBarMaxWidth, modalMaxWidth, carouselCardWidth } = useResponsive();
  const [tab, setTab] = useState<Tab>('Bugün');
  const [settingsSubPage, setSettingsSubPage] = useState<SettingsSubPage>('main');
  const [today, setToday] = useState(localDateKey);
  const [language, setLanguage] = useState<Language>('tr');
  const t = getTranslations(language);
  const [hydrated, setHydrated] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [scheduleInfo, setScheduleInfo] = useState<string | null>(null);
  const [doses, setDoses] = useState<Dose[]>(() => initialDoses.map(d => normalizeDoseDay(d)));
  const pastWeekHistory = Array.from({ length: 7 }, (_, index) => {
    const date = dateFromKey(today);
    date.setDate(date.getDate() - 6 + index);
    return {
      date: localDateKey(date),
      dayNum: date.getDate(),
      label: date.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', { weekday: 'short' }),
      isToday: index === 6,
    };
  });
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(localDateKey);
  const [expandedTaken, setExpandedTaken] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [heroCarouselIndex, setHeroCarouselIndex] = useState(0);

  // Diagnostics & Logger State
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<LogEntry[]>([]);
  const [diagnosticsFilter, setDiagnosticsFilter] = useState<'ALL' | 'ERROR' | 'WARN'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('1 tablet');
  const [doseCount, setDoseCount] = useState<number>(1);
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [slotAmounts, setSlotAmounts] = useState<Record<string, string>>({});
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
  const [undoAction, setUndoAction] = useState<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountEpoch = useRef(0);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ITS Barcode & Camera Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [learnedMeds, setLearnedMeds] = useState<Record<string, Partial<CatalogMedicine>>>({});
  const [currentGTIN, setCurrentGTIN] = useState<string | null>(null);
  const [currentExpiryDate, setCurrentExpiryDate] = useState<string | null>(null);
  const [currentBatchNo, setCurrentBatchNo] = useState<string | null>(null);

  // Update Checker State
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateCheckedOnce, setUpdateCheckedOnce] = useState(false);

  const handleCheckUpdate = async (isManual = true) => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const result = await checkForAppUpdates({ serverUrl });
      setUpdateInfo(result);
      setUpdateCheckedOnce(true);
      if (isManual) {
        if (result.updateAvailable) {
          showToast(language === 'en' ? `🚀 New update: v${result.latestVersion}` : `🚀 Yeni güncelleme: v${result.latestVersion}`);
        } else {
          showToast(language === 'en' ? `✓ You are on the latest version (v${CURRENT_APP_VERSION})` : `✓ En güncel sürümü kullanıyorsunuz (v${CURRENT_APP_VERSION})`);
        }
      }
    } catch {
      if (isManual) {
        showToast(language === 'en' ? 'Could not check updates.' : 'Güncellemeler denetlenemedi.');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    try {
      await Linking.openURL(updateInfo.downloadUrl);
    } catch {
      Alert.alert(
        language === 'en' ? 'Download Error' : 'İndirme Hatası',
        language === 'en' ? 'Could not open update download link.' : 'Güncelleme bağlantısı açılamadı.'
      );
    }
  };

  // Modern Calendar Modal State
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'startDate' | 'cycleStartDate' | 'doctorNextAppointment' | 'doctorBloodTestDate' | 'appointmentDate' | 'appointmentBloodTestDate'>('startDate');
  const [calendarTitle, setCalendarTitle] = useState('Tarih Seçin');
  const [calendarAppointmentTarget, setCalendarAppointmentTarget] = useState<{ target: 'appointmentDate' | 'appointmentBloodTestDate'; date: string } | null>(null);

  const openCalendarPicker = (target: 'startDate' | 'cycleStartDate' | 'doctorNextAppointment' | 'doctorBloodTestDate' | 'appointmentDate' | 'appointmentBloodTestDate', title: string) => {
    setCalendarTarget(target);
    setCalendarTitle(title);
    setCalendarOpen(true);
  };

  const handleDateSelected = (selectedDateStr: string) => {
    if (calendarTarget === 'startDate') {
      setStartDate(selectedDateStr);
    } else if (calendarTarget === 'cycleStartDate') {
      setCycleStartDate(selectedDateStr);
    } else if (calendarTarget === 'doctorNextAppointment') {
      setDoctorNextAppointment(selectedDateStr);
      syncProfileSettings({ doctorNextAppointment: selectedDateStr });
    } else if (calendarTarget === 'doctorBloodTestDate') {
      setDoctorBloodTestDate(selectedDateStr);
      syncProfileSettings({ doctorBloodTestDate: selectedDateStr });
    } else if (calendarTarget === 'appointmentDate') {
      setCalendarAppointmentTarget({ target: 'appointmentDate', date: selectedDateStr });
    } else if (calendarTarget === 'appointmentBloodTestDate') {
      setCalendarAppointmentTarget({ target: 'appointmentBloodTestDate', date: selectedDateStr });
    }
  };

  const handleScanResult = (result: {
    gtin: string;
    name?: string;
    amount?: string;
    form?: MedicineForm;
    mealCondition?: MealCondition;
    instructions?: string;
    defaultStock?: number;
    stockThreshold?: number;
    expiryDate?: string;
    batchNo?: string;
    raw: string;
  }) => {
    setCurrentGTIN(result.gtin);
    if (result.expiryDate) setCurrentExpiryDate(result.expiryDate);
    if (result.batchNo) setCurrentBatchNo(result.batchNo);

    if (result.name) {
      setName(result.name);
      showToast(language === 'en' ? `📦 ${result.name} auto-filled from barcode` : `📦 ${result.name} karekoddan otomatik tanımlandı`);

      // Çevrimdışı geleceğe yönelik olarak learnedMeds hafızasına kaydet
      const cleanG = result.gtin.trim().padStart(14, '0');
      const learnedItem: Partial<CatalogMedicine> = {
        gtin: cleanG,
        name: result.name,
        amount: result.amount || '1 tablet',
        form: result.form || 'tablet',
        mealCondition: result.mealCondition || 'tok',
        instructions: result.instructions || '',
        defaultStock: result.defaultStock ?? 30,
        stockThreshold: result.stockThreshold ?? 5,
      };
      setLearnedMeds(prev => {
        const updated = { ...prev, [cleanG]: learnedItem };
        AsyncStorage.setItem(STORAGE_KEY_LEARNED_MEDS, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } else {
      showToast(language === 'en' ? `🏷️ Barcode scanned (${result.gtin}). Please enter medication name.` : `🏷️ Barkod okundu (${result.gtin}). Lütfen ilaç adını yazınız.`);
    }

    if (result.amount) setAmount(result.amount);
    if (result.form) setFormType(result.form);
    if (result.mealCondition) setMealCondition(result.mealCondition);
    if (result.instructions) setInstructions(result.instructions);
    if (result.defaultStock) setStock(String(result.defaultStock));
    if (result.stockThreshold) setStockThreshold(String(result.stockThreshold));
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
    const oldTime = times[index];
    const updated = [...times];
    updated[index] = newTime;
    setTimes(updated);
    if (oldTime && oldTime !== newTime && slotAmounts[oldTime]) {
      setSlotAmounts(prev => {
        const next = { ...prev, [newTime]: prev[oldTime] };
        delete next[oldTime];
        return next;
      });
    }
  };

  const setSlotAmountForTime = (time: string, val: string) => {
    setSlotAmounts(prev => ({ ...prev, [time]: val }));
  };

  const stepSlotMinutes = (index: number, delta: number) => {
    const current = times[index] || '09:00';
    setSlotTime(index, adjustTimeMinutes(current, delta));
  };

  // Language & i18n
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

  const getSoundProfileInfo = (id: string) => {
    if (language === 'en') {
      switch (id) {
        case 'default':
          return {
            title: 'Default Sound',
            badge: 'Standard',
            description: 'Audible warning with standard notification chime',
          };
        case 'alarm':
          return {
            title: 'Alarm Tone (High Priority)',
            badge: 'Strong',
            description: 'Louder and more noticeable ringtone, ideal for heavy sleepers',
          };
        case 'gentle':
          return {
            title: 'Gentle Tone',
            badge: 'Soft',
            description: 'Mild and soothing chime, subtle alert',
          };
        case 'chime':
          return {
            title: 'Crystal Chime',
            badge: 'Clear',
            description: 'Vibrant, bright and modern crystal bell chime',
          };
        case 'system_custom':
          return {
            title: 'Device Sound (Custom)',
            badge: 'Device',
            description: 'Ringtone selected from your device audio library',
          };
        case 'silent':
          return {
            title: 'Silent (Vibration Only)',
            badge: 'Silent',
            description: 'Discrete alert with rhythmic vibration only',
          };
      }
    }
    const found = SOUND_PROFILE_OPTIONS.find(o => o.id === id);
    return {
      title: found?.title ?? id,
      badge: found?.badge ?? '',
      description: found?.description ?? '',
    };
  };

  const getLeadTimeLabel = (val: number) => {
    if (language === 'en') {
      switch (val) {
        case 0: return 'On time';
        case 5: return '5 min early';
        case 10: return '10 min early';
        case 15: return '15 min early';
        default: return `${val} min early`;
      }
    }
    switch (val) {
      case 0: return 'Vaktinde';
      case 5: return '5 Dk Önce';
      case 10: return '10 Dk Önce';
      case 15: return '15 Dk Önce';
      default: return `${val} Dk Önce`;
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
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [doctorHospital, setDoctorHospital] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorNextAppointment, setDoctorNextAppointment] = useState('');
  const [doctorAppointmentTime, setDoctorAppointmentTime] = useState('13:00');
  const [doctorApptLeadOptions, setDoctorApptLeadOptions] = useState<string[]>(['1d', '0d']);
  const [doctorBloodTestDate, setDoctorBloodTestDate] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [appointmentEditorOpen, setAppointmentEditorOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentItem | null>(null);
  const [snoozeMinutes, setSnoozeMinutes] = useState(15);
  const [leadTimeMinutes, setLeadTimeMinutes] = useState(0);
  const [defaultStockThreshold, setDefaultStockThreshold] = useState(5);
  const [stockAlertsEnabled, setStockAlertsEnabled] = useState(true);
  const [hideDoseAmount, setHideDoseAmount] = useState(false);
  const [autoCollapseTaken, setAutoCollapseTaken] = useState(false);
  const [showAppointmentCard, setShowAppointmentCard] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [repeatNagEnabled, setRepeatNagEnabled] = useState(true);
  const [repeatNagCount, setRepeatNagCount] = useState(5);
  const [batteryExemptionEnabled, setBatteryExemptionEnabled] = useState(true);
  const [exactAlarmEnabled, setExactAlarmEnabled] = useState(true);
  const [autoRescheduleOnBoot, setAutoRescheduleOnBoot] = useState(true);
  const [wakeScreenOnAlarm, setWakeScreenOnAlarm] = useState(true);

  // Sync & Backup States
  const [serverUrl, setServerUrl] = useState(DEFAULT_SYNC_SERVER_URL);
  const [syncCode, setSyncCode] = useState('');
  const [activeSyncCode, setActiveSyncCode] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveredCredentials, setRecoveredCredentials] = useState<{ syncCode: string; recoveryKey: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const switchingAccount = useRef(false);
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

  const mainScrollViewRef = useRef<ScrollView>(null);
  const heroCarouselRef = useRef<ScrollView>(null);

  const handleTabPress = (targetTab: Tab) => {
    logger.breadcrumb(`Sekme değiştirildi: ${targetTab}`);
    triggerHaptic();

    // Sekmeye tıklandığında alt menülerde/sayfalarda takılı kalmasın, doğrudan ana menü açılsın
    if (targetTab === 'Ayarlar') {
      setSettingsSubPage('main');
    } else if (targetTab === 'Geçmiş') {
      setSelectedHistoryDate(today);
    }

    // Açık düzenleyici/modal ve geçici durumlar temizlensin
    setEditorOpen(false);
    setScannerOpen(false);
    setCalendarOpen(false);

    // Sekmeyi güncelle ve sayfanın en başına kaydır
    setTab(targetTab);
    setTimeout(() => {
      mainScrollViewRef.current?.scrollTo({ y: 0, animated: tab === targetTab });
    }, 10);
  };

  const dosesRef = useRef(doses);
  dosesRef.current = doses;

  // Listeners are registered once; route them through a ref so actions use current settings.
  const notificationResponseHandler = useRef<(res: NotificationActionResponse) => void>(() => {});
  const [notificationResponseGate] = useState(() =>
    createNotificationResponseGate(res => notificationResponseHandler.current(res)));

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
      showToast(language === 'en' ? 'Reminders are turned off. Turn them on in Settings.' : 'Hatırlatmalar kapalı. Önce Ayarlar’dan açın.');
      return;
    }
    try {
      logger.breadcrumb(`Doz ertelendi: ${dose.name} (${time}) +${minutes}dk`);
      await cancelDoseRepeatNotifications(dose.id, time, date);
      await snoozeNotification({ ...dose, time, statusDate: date, amount: getCycleInfo(dose, date).todayAmount }, minutes, soundSettingsRef.current);
      setDoses(previous => previous.map(d => d.id === dose.id ? { ...d, snooze: minutes } : d));
      showToast(language === 'en' ? `⏱️ Reminder snoozed for ${minutes} minutes` : `⏱️ Hatırlatıcı ${minutes} dakika ertelendi`);
    } catch (error) {
      logger.error('Notifications', `Doz erteleme hatası: ${dose.name}`, error);
      console.error('Snooze failed', error);
      showToast(language === 'en' ? 'Failed to schedule snooze. Please try again.' : 'Erteleme kurulamadı. Lütfen tekrar deneyin.');
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
    logger.info('System', `Uygulama açıldı (Reminder Health v${CURRENT_APP_VERSION})`);
    return () => unsub();
  }, []);

  notificationResponseHandler.current = res => {
    const { actionId, doseId, timeStr, date, isAppointment } = res;
    if (isAppointment) {
      if (actionId === ACTION_APPT_DONE || !actionId) {
        showToast(language === 'en' ? '✅ Appointment reminder confirmed' : '✅ Randevu hatırlatması onaylandı');
      }
      return;
    }
    const dose = dosesRef.current.find(d => d.id === doseId);
    if (!dose) return;
    const time = timeStr || dose.time;
    const doseDate = date ?? localDateKey();
    if (!(dose.times?.length ? dose.times : [dose.time]).includes(time)) return;
    if (actionId === ACTION_TAKEN || actionId === ACTION_SKIP) {
      applyRecord(dose.id, time, doseDate, actionId === ACTION_TAKEN ? 'taken' : 'skipped');
    } else if (actionId === ACTION_SNOOZE) {
      void snoozeDose(dose, time, doseDate);
    }
  };

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

    const removeListener = addNotificationResponseListener(res => notificationResponseGate.push(res));

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
    localStore.getItem('reminder_notification_map_v2').then(raw => {if(raw) setNotificationIdMap(JSON.parse(raw));}).catch(()=>{});
    finishSwitch(localStore, {doses:STORAGE_KEY_DOSES, learned:STORAGE_KEY_LEARNED_MEDS, settings:STORAGE_KEY_SETTINGS}).then(() => Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_DOSES),
      AsyncStorage.getItem(STORAGE_KEY_SETTINGS),
      AsyncStorage.getItem(STORAGE_KEY_LEARNED_MEDS),
      AsyncStorage.getItem(STORAGE_KEY_SYNC_CONFIG),
      AsyncStorage.getItem(STORAGE_KEY_LANGUAGE),
    ]))
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
            const activeUrl = restoreServerUrl(parsed?.serverUrl);
            setServerUrl(activeUrl);
            if (parsed.autoSync !== undefined) setAutoSync(parsed.autoSync);
            if (parsed.lastSyncAt) setLastSyncAt(parsed.lastSyncAt);
            if (parsed?.serverUrl !== activeUrl) {
              AsyncStorage.setItem(
                STORAGE_KEY_SYNC_CONFIG,
                JSON.stringify({
                  serverUrl: activeUrl,
                  autoSync: parsed.autoSync,
                  lastSyncAt: parsed.lastSyncAt,
                })
              ).catch(() => {});
            }
          } catch {}
        }
        if (settingData) {
          const parsed = JSON.parse(settingData);
          if (parsed.privateMode !== undefined) setPrivateMode(parsed.privateMode);
          if (parsed.notifications !== undefined) setNotifications(parsed.notifications);
          if (parsed.soundEnabled !== undefined) setSoundEnabled(parsed.soundEnabled);
          if (parsed.soundType !== undefined) setSoundType(parsed.soundType);
          if (parsed.userName !== undefined) setUserName(parsed.userName);
          if (parsed.doctorName !== undefined) setDoctorName(parsed.doctorName);
          if (parsed.doctorSpecialty !== undefined) setDoctorSpecialty(parsed.doctorSpecialty);
          if (parsed.doctorHospital !== undefined) setDoctorHospital(parsed.doctorHospital);
          if (parsed.doctorPhone !== undefined) setDoctorPhone(parsed.doctorPhone);
          if (parsed.doctorNextAppointment !== undefined) setDoctorNextAppointment(parsed.doctorNextAppointment);
          if (parsed.doctorAppointmentTime !== undefined) {
            setDoctorAppointmentTime(parsed.doctorAppointmentTime === '09:00' ? '13:00' : parsed.doctorAppointmentTime);
          }
          if (parsed.doctorApptLeadOptions !== undefined && Array.isArray(parsed.doctorApptLeadOptions)) setDoctorApptLeadOptions(parsed.doctorApptLeadOptions);
          if (parsed.doctorBloodTestDate !== undefined) setDoctorBloodTestDate(parsed.doctorBloodTestDate);
          if (parsed.doctorNotes !== undefined) setDoctorNotes(parsed.doctorNotes);

          let initialAppointments: AppointmentItem[] = [];
          const hasStoredAppointments = parsed.appointments !== undefined;
          if (hasStoredAppointments) {
            try {
              const apptsParsed = typeof parsed.appointments === 'string' ? JSON.parse(parsed.appointments) : parsed.appointments;
              if (Array.isArray(apptsParsed)) {
                initialAppointments = apptsParsed;
              }
            } catch {}
          }
          if (!hasStoredAppointments && parsed.doctorNextAppointment) {
            // Seamlessly migrate legacy single-appointment user
            initialAppointments = [{
              id: 'appt-legacy-1',
              doctorName: parsed.doctorName || '',
              specialty: parsed.doctorSpecialty || 'Göz',
              hospital: parsed.doctorHospital || '',
              phone: parsed.doctorPhone || '',
              date: parsed.doctorNextAppointment,
              time: parsed.doctorAppointmentTime === '09:00' ? '13:00' : (parsed.doctorAppointmentTime || '13:00'),
              leadOptions: parsed.doctorApptLeadOptions || ['1d', '0d'],
              hasBloodTest: !!parsed.doctorBloodTestDate,
              bloodTestDate: parsed.doctorBloodTestDate || '',
              bloodTestFasting: true,
              bloodTestTime: '08:30',
              bloodTestNotes: parsed.doctorNotes || '',
              notes: parsed.doctorNotes || '',
              completed: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }];
          }
          setAppointments(initialAppointments);
          if (hasStoredAppointments && initialAppointments.length === 0) {
            setDoctorNextAppointment('');
            setDoctorBloodTestDate('');
            setDoctorName('');
            setDoctorSpecialty('');
            setDoctorHospital('');
            setDoctorPhone('');
            setDoctorNotes('');
          }
          if (parsed.snoozeMinutes !== undefined) setSnoozeMinutes(parsed.snoozeMinutes);
          if (parsed.leadTimeMinutes !== undefined) setLeadTimeMinutes(parsed.leadTimeMinutes);
          if (parsed.defaultStockThreshold !== undefined) setDefaultStockThreshold(parsed.defaultStockThreshold);
          if (parsed.stockAlertsEnabled !== undefined) setStockAlertsEnabled(parsed.stockAlertsEnabled);
          if (parsed.hideDoseAmount !== undefined) setHideDoseAmount(parsed.hideDoseAmount);
          if (parsed.autoCollapseTaken !== undefined) setAutoCollapseTaken(parsed.autoCollapseTaken);
          if (parsed.showAppointmentCard !== undefined) setShowAppointmentCard(parsed.showAppointmentCard);
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

  // Doses are loaded now: replay actions queued during launch, including the one that opened the app.
  useEffect(() => {
    if (!hydrated) return;
    const launchResponse = takeLaunchNotificationResponse();
    if (launchResponse) notificationResponseGate.push(launchResponse);
    notificationResponseGate.open();
  }, [hydrated]);

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
        autoSync,
        lastSyncAt,
      })
    ).catch(() => {});
  }, [hydrated, serverUrl, autoSync, lastSyncAt]);

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
        doctorName,
        doctorSpecialty,
        doctorHospital,
        doctorPhone,
        doctorNextAppointment,
        doctorAppointmentTime,
        doctorApptLeadOptions,
        appointments: JSON.stringify(appointments),
        doctorBloodTestDate,
        doctorNotes,
        snoozeMinutes,
        leadTimeMinutes,
        defaultStockThreshold,
        stockAlertsEnabled,
        hideDoseAmount,
        autoCollapseTaken,
        showAppointmentCard,
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
    appointments,
    privateMode,
    notifications,
    soundEnabled,
    soundType,
    userName,
    doctorName,
    doctorSpecialty,
    doctorHospital,
    doctorPhone,
    doctorNextAppointment,
    doctorAppointmentTime,
    doctorApptLeadOptions,
    doctorBloodTestDate,
    doctorNotes,
    snoozeMinutes,
    leadTimeMinutes,
    defaultStockThreshold,
    stockAlertsEnabled,
    hideDoseAmount,
    autoCollapseTaken,
    showAppointmentCard,
    hapticsEnabled,
    repeatNagEnabled,
    repeatNagCount,
    batteryExemptionEnabled,
    exactAlarmEnabled,
    autoRescheduleOnBoot,
    wakeScreenOnAlarm,
  ]);

  // Sync doctor appointment and lab test notifications
  useEffect(() => {
    if (!hydrated || hasNotificationPermission === null) return;
    void syncDoctorAppointmentNotifications({
      appointments,
      appointmentDate: doctorNextAppointment,
      appointmentTime: doctorAppointmentTime,
      leadOptions: doctorApptLeadOptions,
      bloodTestDate: doctorBloodTestDate,
      doctorName,
      hospital: doctorHospital,
      lang: language,
    });
  }, [
    hydrated,
    hasNotificationPermission,
    appointments,
    doctorNextAppointment,
    doctorAppointmentTime,
    doctorApptLeadOptions,
    doctorBloodTestDate,
    doctorName,
    doctorHospital,
    language,
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
      if (summary.incompleteCount > 0) {
        if (current) setScheduleInfo(language === 'en'
          ? `${summary.incompleteCount} reminders could not be scheduled (${summary.count} ready). Check notification and alarm permissions, then reopen the app to retry.`
          : `${summary.incompleteCount} hatırlatma planlanamadı (${summary.count} hazır). Bildirim ve alarm izinlerini kontrol edip yeniden denemek için uygulamayı tekrar açın.`);
        logger.warn('Notifications', 'Bildirim planı eksik kaldı', summary);
        return;
      }
      if (current) setScheduleInfo(summary.refreshAfter
        ? (language === 'en'
            ? `Reminder schedule ready until ${new Date(summary.refreshAfter).toLocaleString('en-US')}. Open the app before this date to automatically refresh.`
            : `Hatırlatma planı ${new Date(summary.refreshAfter).toLocaleString('tr-TR')} tarihine kadar hazır. Uygulamayı bu tarihten önce açın; plan otomatik yenilenir.`)
        : null);
      logger.info('Notifications', `Bildirim planı senkronize edildi (${summary.count} hatırlatma)`);
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
        todayAmount: (d.slotAmounts?.[t]?.trim()) ? d.slotAmounts[t].trim() : info.todayAmount,
        cycleInfo: info,
        durationInfo: durInfo,
      });
    });
  });
  todaySlots.sort((a, b) => a.time.localeCompare(b.time));

  const pendingSlots = todaySlots.filter(s => s.status === 'pending');
  const nextSlot = pendingSlots[0];
  const nextTime = nextSlot?.time;
  // All pending slots for today go into the swipeable carousel deck
  const carouselSlots = pendingSlots;
  const restOfDaySlots = pendingSlots.slice(1);

  const getSlotTimingText = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins > 0) {
      if (diffMins < 60) return language === 'en' ? `${diffMins} min later` : `${diffMins} dk sonra`;
      const hrs = Math.floor(diffMins / 60);
      const rem = diffMins % 60;
      return language === 'en' ? `${hrs}h ${rem > 0 ? `${rem}m ` : ''}later` : `${hrs} saat ${rem > 0 ? `${rem} dk ` : ''}sonra`;
    } else if (diffMins < -1) {
      const pastMins = Math.abs(diffMins);
      return language === 'en' ? `${pastMins} min overdue` : `${pastMins} dk gecikti`;
    } else {
      return language === 'en' ? 'Due now' : 'Vakti geldi';
    }
  };

  const getOverdueGuidance = (slot: ScheduledSlot) => {
    const [h, m] = slot.time.split(':').map(Number);
    const now = new Date();
    const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const diffMins = Math.round((now.getTime() - scheduledDate.getTime()) / 60000);

    if (diffMins < 20) return null;

    // Double-dose protection: is another dose of the same medication scheduled within 4 hours?
    const sameMedUpcoming = pendingSlots.find(s => {
      if (s.slotId === slot.slotId || String(s.doseId) !== String(slot.doseId)) return false;
      const [uh, um] = s.time.split(':').map(Number);
      const uDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), uh, um);
      const diffToUpcoming = Math.round((uDate.getTime() - now.getTime()) / 60000);
      return diffToUpcoming > 0 && diffToUpcoming <= 240;
    });

    if (sameMedUpcoming) {
      return {
        type: 'double_dose_warning',
        icon: 'warning',
        title: language === 'en' ? '⚠️ Double Dose Risk!' : '⚠️ Çift Doz Riski!',
        message: language === 'en'
          ? `Next dose is at ${sameMedUpcoming.time}. To prevent double-dosing, it is safer to skip this delayed dose.`
          : `Sonraki dozunuz saat ${sameMedUpcoming.time}'de. Çift doz etkisini önlemek için bu geciken dozu atlamanız önerilir.`,
      };
    }

    // Meal timing guidance:
    const meal = slot.dose.mealCondition;
    if (diffMins >= 45) {
      if (meal === 'tok') {
        return {
          type: 'meal_guidance',
          icon: 'restaurant',
          title: language === 'en' ? '🍽️ Meal Time Passed' : '🍽️ Öğün Saati Geçti',
          message: language === 'en'
            ? 'This med is for after meals. Take with a light snack or with your next meal; avoid taking on an empty stomach.'
            : 'Bu ilaç tok karnına alınmalıdır. Midenizi korumak için hafif bir atıştırmalıkla veya sonraki öğünle alınız.',
        };
      } else if (meal === 'ac') {
        return {
          type: 'meal_guidance',
          icon: 'hourglass',
          title: language === 'en' ? '⏳ Empty Stomach Needed' : '⏳ Aç Karnına Alınmalı',
          message: language === 'en'
            ? 'Must be taken on an empty stomach: at least 30-60 mins before eating or 2 hours after.'
            : 'Aç karnına alınmalıdır: Yemekten en az 30-60 dk önce veya yemekten 2 saat sonra alınız.',
        };
      } else if (meal === 'yemekle') {
        return {
          type: 'meal_guidance',
          icon: 'restaurant',
          title: language === 'en' ? '🍲 Take With Meal' : '🍲 Yemekle Alınmalı',
          message: language === 'en'
            ? 'Take along with food to ensure proper absorption and stomach comfort.'
            : 'İlacın emilimi ve mide konforu için yemeğin hemen yanında alınız.',
        };
      } else if (diffMins >= 90) {
        return {
          type: 'general_overdue',
          icon: 'time',
          title: language === 'en' ? '⏰ Missed / Overdue Dose' : '⏰ Unutulmuş / Gecikmiş Doz',
          message: language === 'en'
            ? 'If your next dose is far away, take it now. If your next dose is near, skip this one.'
            : 'Sonraki doza daha çok vakit varsa şimdi alabilir, sonraki doza yakınsanız bu dozu atlayabilirsiniz.',
        };
      }
    }

    return null;
  };

  const takenSlots = todaySlots.filter(s => s.status === 'taken');
  const recordedSlots = todaySlots.filter(s => s.status !== 'pending');
  // Past days also list doses that were never marked, so a reverted record stays correctable.
  const historySlots = buildHistorySlots(doses, selectedHistoryDate,
    { includeUnrecorded: selectedHistoryDate < today, lang: language });


  const showToast = (text: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastText(text);
    setUndoAction(() => undo ?? null);
    toastTimer.current = setTimeout(() => { setToastText(null); setUndoAction(null); }, undo ? 10000 : 4000);
  };

  const applyRecord = (doseId: Dose['id'], time: string, date: string, status: Dose['status'], offerUndo = true) => {
    if (switchingAccount.current) return;
    const dose = dosesRef.current.find(item => item.id === doseId && !item.deletedAt);
    if (!dose) return;
    const result = changeDoseRecord(dosesRef.current, doseId, date, time, status);
    if (!result.undo) return;
    triggerHaptic();
    dosesRef.current = result.doses;
    setDoses(result.doses);
    if (status !== 'pending') cancelDoseRepeatNotifications(doseId, time, date).catch(err => {
      logger.warn('Notifications', 'Tekrar bildirimi iptal edilemedi', { error: String(err) });
    });
    const token = result.undo;
    const epoch = accountEpoch.current;
    showToast(`${dose.name} (${time}) ${status === 'taken' ? (language === 'en' ? 'marked as taken' : 'alındı olarak işaretlendi') : status === 'skipped' ? (language === 'en' ? 'skipped' : 'atlandı') : (language === 'en' ? 'record reverted' : 'kaydı geri alındı')}`, offerUndo ? () => {
      if (accountEpoch.current !== epoch || switchingAccount.current) return;
      const next = undoDoseRecord(dosesRef.current, token);
      if (next === dosesRef.current) {
        showToast(language === 'en' ? 'This record changed. Check History.' : 'Bu kayıt değişmiş. Geçmiş ekranından kontrol edin.');
        return;
      }
      dosesRef.current = next;
      setDoses(next);
      showToast(language === 'en' ? 'Record reverted; stock corrected.' : 'Kayıt geri alındı; stok düzeltildi.');
    } : undefined);
  };
  const takeSlot = (slot: ScheduledSlot) => applyRecord(slot.doseId, slot.time, localDateKey(), 'taken');
  const skipSlot = (slot: ScheduledSlot) => applyRecord(slot.doseId, slot.time, localDateKey(), 'skipped');
  const confirmRevertRecord = (doseId: Dose['id'], time: string, date: string) => {
    const dose = dosesRef.current.find(item => item.id === doseId && !item.deletedAt);
    if (!dose || slotStatus(dose, time, date) === 'pending') return;
    const epoch = accountEpoch.current;
    const expected = dose.doseRecords?.[date]?.[time]?.updatedAt;
    const expectedStatus = slotStatus(dose, time, date);
    Keyboard.dismiss();
    Alert.alert(language === 'en' ? 'Marked by mistake' : 'Yanlış işaretledim',
      `${dose.name}\n${formatLocalizedDate(date, language)} · ${time}\n\n${language === 'en'
        ? 'This record will be reverted and stock corrected. This only changes the app record.'
        : 'Bu kayıt geri alınacak, stok düzeltilecek. Bu işlem yalnızca uygulamadaki kaydı değiştirir.'}`,
      [{ text: t.cancel, style: 'cancel' }, { text: language === 'en' ? 'Revert record' : 'Kaydı geri al', onPress: () => {
        if (epoch !== accountEpoch.current || switchingAccount.current) return;
        const latest = dosesRef.current.find(item => item.id === doseId && !item.deletedAt);
        if (!latest || slotStatus(latest, time, date) !== expectedStatus || latest.doseRecords?.[date]?.[time]?.updatedAt !== expected) {
          showToast(language === 'en' ? 'This record changed. Please check again.' : 'Bu kayıt değişmiş. Tekrar kontrol edin.');
          return;
        }
        applyRecord(doseId, time, date, 'pending', false);
      } }]);
  };

  const updateStock = (id: string | number, newStock: number) => {
    triggerHaptic();
    const clean = Math.max(0, newStock);
    const target = doses.find(d => d.id === id);
    if (target) {
      logger.breadcrumb(`Stok güncellendi: ${target.name} -> ${clean}`);
    }
    setDoses(ds => ds.map(d => d.id === id ? { ...d, stock: clean, updatedAt: Date.now() } : d));
  };

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
      setSlotAmounts(dose.slotAmounts ? { ...dose.slotAmounts } : {});
    } else {
      setEditingId(null);
      setName('');
      setAmount('1 tablet');
      setTimes(['09:00']);
      setSlotAmounts({});
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
      Alert.alert(
        language === 'en' ? 'Missing Information' : 'Eksik Bilgi',
        language === 'en' ? 'Please enter medication name.' : 'Lütfen ilaç adını giriniz.'
      );
      return;
    }
    const effectiveTimes = times.length > 0 ? times : ['09:00'];
    const cleanSlotAmounts: Record<string, string> = {};
    if (effectiveTimes.length > 1) {
      for (const t of effectiveTimes) {
        if (slotAmounts[t]?.trim()) {
          cleanSlotAmounts[t] = slotAmounts[t].trim();
        }
      }
    }
    const patch = {
      name: name.trim(),
      amount: amount.trim(),
      time: effectiveTimes[0] || '09:00',
      times: effectiveTimes,
      slotAmounts: Object.keys(cleanSlotAmounts).length > 0 ? cleanSlotAmounts : undefined,
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
      cycleStartDate: frequencyType !== 'everyday' ? (cycleStartDate || today) : undefined,
      durationMode,
      durationDays: durationMode === 'days' ? Math.max(1, Number(durationDays) || 7) : undefined,
      startDate: startDate || today,
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
      setDoses(ds => ds.map(d => d.id === editingId ? { ...d, ...patch, updatedAt: Date.now() } : d));
      showToast(language === 'en' ? 'Medication updated' : 'İlaç güncellendi');
    } else {
      logger.breadcrumb(`Yeni ilaç eklendi: ${name.trim()} (${amount.trim()})`);
      setDoses(ds => [...ds, { id: newId(), ...patch, status: 'pending', statusDate: today, slotStatuses: {} }]);
      showToast(language === 'en' ? 'New medication added' : 'Yeni ilaç eklendi');
    }
    setEditorOpen(false);
  };

  const deleteDose = (id: string | number) => {
    Alert.alert(
      t.confirmDeleteTitle,
      t.confirmDeleteDesc,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: () => {
            logger.breadcrumb(`İlaç silindi: id=${id}`);
            const deletedAt = Date.now();
            const epoch = accountEpoch.current;
            setDoses(ds => ds.map(d => d.id === id ? { ...d, deletedAt, updatedAt: deletedAt } : d));
            setEditorOpen(false);
            showToast(t.toastMedDeleted, () => {
              if (accountEpoch.current !== epoch || switchingAccount.current) return;
              setDoses(ds => ds.map(d => d.id === id && d.deletedAt === deletedAt
                ? { ...d, deletedAt: undefined, updatedAt: Date.now() } : d));
            });
          },
        },
      ]
    );
  };

  // Sync Action Handlers

  const accountSnapshot = (): Snapshot => ({
    doses,
    learnedMeds,
    settings: {
      userName,
      doctorName,
      doctorSpecialty,
      doctorHospital,
      doctorPhone,
      doctorNextAppointment,
      doctorAppointmentTime,
      doctorApptLeadOptions,
      doctorBloodTestDate,
      doctorNotes,
      notifications,
      soundEnabled,
      soundType,
      snoozeMinutes,
      leadTimeMinutes,
      defaultStockThreshold,
      stockAlertsEnabled,
      hideDoseAmount,
      autoCollapseTaken,
      showAppointmentCard,
      hapticsEnabled,
    }
  });

  const bindAccount = async (next: Session) => {
    switchingAccount.current = true;
    accountEpoch.current += 1;
    setToastText(null);
    setUndoAction(null);
    try {
      const before = doses;
      const snapshot = await switchAccount(localStore, serverUrl, next.user, accountSnapshot());
      await finishSwitch(localStore, {doses:STORAGE_KEY_DOSES, learned:STORAGE_KEY_LEARNED_MEDS, settings:STORAGE_KEY_SETTINGS});
      const oldMap = await localStore.getItem('reminder_notification_map_v2');
      const map = Object.fromEntries(before.filter(d => typeof d.id === 'number').map(d => [String(d.id), String(migrateDoseIds([d], next.user.id)[0].id)]));
      const oldAccount = await localStore.getItem('reminder_notification_account_v2');
      const ids = {...(oldAccount === next.user.id && oldMap ? JSON.parse(oldMap) : {}), ...map};
      setNotificationIdMap(ids);
      await localStore.setItem('reminder_notification_map_v2', JSON.stringify(ids));
      await localStore.setItem('reminder_notification_account_v2', next.user.id);
      setDoses(snapshot.doses);
      setLearnedMeds(snapshot.learnedMeds);
      const effectiveUserName = snapshot.settings.userName || (next.user?.name && next.user.name !== 'Kullanıcı' ? next.user.name : '');
      setUserName(effectiveUserName);
      setDoctorName(snapshot.settings.doctorName || '');
      setDoctorSpecialty(snapshot.settings.doctorSpecialty || '');
      setDoctorHospital(snapshot.settings.doctorHospital || '');
      setDoctorPhone(snapshot.settings.doctorPhone || '');
      setDoctorNextAppointment(snapshot.settings.doctorNextAppointment || '');
      setDoctorAppointmentTime(snapshot.settings.doctorAppointmentTime || '13:00');
      if (snapshot.settings.doctorApptLeadOptions) {
        try {
          const opts = typeof snapshot.settings.doctorApptLeadOptions === 'string'
            ? JSON.parse(snapshot.settings.doctorApptLeadOptions)
            : snapshot.settings.doctorApptLeadOptions;
          if (Array.isArray(opts)) setDoctorApptLeadOptions(opts);
        } catch {}
      }
      setDoctorBloodTestDate(snapshot.settings.doctorBloodTestDate || '');
      setDoctorNotes(snapshot.settings.doctorNotes || '');
      if (snapshot.settings.notifications !== undefined) setNotifications(snapshot.settings.notifications);
      if (snapshot.settings.soundEnabled !== undefined) setSoundEnabled(snapshot.settings.soundEnabled);
      if (snapshot.settings.soundType !== undefined) setSoundType(snapshot.settings.soundType);
      if (snapshot.settings.snoozeMinutes !== undefined) setSnoozeMinutes(snapshot.settings.snoozeMinutes);
      if (snapshot.settings.leadTimeMinutes !== undefined) setLeadTimeMinutes(snapshot.settings.leadTimeMinutes);
      if (snapshot.settings.defaultStockThreshold !== undefined) setDefaultStockThreshold(snapshot.settings.defaultStockThreshold);
      if (snapshot.settings.stockAlertsEnabled !== undefined) setStockAlertsEnabled(snapshot.settings.stockAlertsEnabled);
      if (snapshot.settings.hideDoseAmount !== undefined) setHideDoseAmount(snapshot.settings.hideDoseAmount);
      if (snapshot.settings.autoCollapseTaken !== undefined) setAutoCollapseTaken(snapshot.settings.autoCollapseTaken);
      if (snapshot.settings.showAppointmentCard !== undefined) setShowAppointmentCard(snapshot.settings.showAppointmentCard);
      if (snapshot.settings.hapticsEnabled !== undefined) setHapticsEnabled(snapshot.settings.hapticsEnabled);
      setUndoAction(null);
      setActiveBannerNotification(null);
      setLastSyncAt(null);
      setSession(next);
    } finally { switchingAccount.current = false; }
  };

  const syncWithServer = async (activeSession?: Session | null, showToastNotification = true) => {
    const s = activeSession || session;
    if (!s) {
      if (showToastNotification) throw new Error(language === 'en' ? 'Connect with your personal sync code first.' : 'Önce kişisel eşitleme kodunuzla bağlanın.');
      return;
    }
    setSyncStatus('syncing');
    setSyncStatusMsg(language === 'en' ? 'Syncing...' : 'Eşitleniyor...');
    const targetUrl = restoreServerUrl(serverUrl);
    if (targetUrl !== serverUrl) setServerUrl(targetUrl);
    try {
      const currentSession = await getSession(targetUrl);
      if (currentSession.user.id !== s.user.id) throw new Error(language === 'en' ? 'Account changed; please reconnect.' : 'Hesap değişti; yeniden bağlanın.');
      await assertAccount(localStore, targetUrl, currentSession.user);

      const payloadSettings: Record<string, any> = {
        notifications,
        soundEnabled,
        soundType,
        snoozeMinutes,
        leadTimeMinutes,
        defaultStockThreshold,
        stockAlertsEnabled,
        hideDoseAmount,
        autoCollapseTaken,
        showAppointmentCard,
        hapticsEnabled,
      };
      payloadSettings.userName = (userName || '').trim();
      payloadSettings.doctorName = (doctorName || '').trim();
      payloadSettings.doctorSpecialty = (doctorSpecialty || '').trim();
      payloadSettings.doctorHospital = (doctorHospital || '').trim();
      payloadSettings.doctorPhone = (doctorPhone || '').trim();
      payloadSettings.doctorNextAppointment = (doctorNextAppointment || '').trim();
      payloadSettings.doctorAppointmentTime = doctorAppointmentTime || '13:00';
      payloadSettings.doctorApptLeadOptions = JSON.stringify(doctorApptLeadOptions || ['1d', '0d']);
      payloadSettings.doctorBloodTestDate = (doctorBloodTestDate || '').trim();
      payloadSettings.doctorNotes = (doctorNotes || '').trim();
      payloadSettings.appointments = JSON.stringify(appointments || []);

      const response = await authRequest(targetUrl, '/api/sync', {
        doses: doses.map(d => ({ ...d, updatedAt: (d as any).updatedAt || Date.now() })),
        learnedMeds,
        settings: payloadSettings,
      }, currentSession);

      if (response.success) {
        const merged = smartMergeDoses(doses as SyncDose[], response.doses);
        setDoses(merged.map(d => normalizeDoseDay(d, today)));
        if (response.learnedMeds) {
          setLearnedMeds(prev => ({ ...prev, ...response.learnedMeds }));
        }
        if (response.settings) {
          if (response.settings.userName && typeof response.settings.userName === 'string') {
            setUserName(response.settings.userName);
          } else if (currentSession.user?.name && (!userName || !userName.trim())) {
            setUserName(currentSession.user.name);
          }
          if (response.settings.appointments !== undefined) {
            try {
              const appts = typeof response.settings.appointments === 'string'
                ? JSON.parse(response.settings.appointments)
                : response.settings.appointments;
              if (Array.isArray(appts)) {
                setAppointments(appts);
                const active = appts.filter(a => !a.completed);
                const primary = active[0] || appts[0];
                if (primary) {
                  setDoctorName(primary.doctorName || '');
                  setDoctorSpecialty(primary.specialty || '');
                  setDoctorHospital(primary.hospital || '');
                  setDoctorPhone(primary.phone || '');
                  setDoctorNextAppointment(primary.date || '');
                  setDoctorAppointmentTime(primary.time || '13:00');
                  setDoctorApptLeadOptions(primary.leadOptions || ['1d', '0d']);
                  setDoctorBloodTestDate(primary.bloodTestDate || '');
                  setDoctorNotes(primary.notes || primary.bloodTestNotes || '');
                } else {
                  setDoctorName('');
                  setDoctorSpecialty('');
                  setDoctorHospital('');
                  setDoctorPhone('');
                  setDoctorNextAppointment('');
                  setDoctorAppointmentTime('13:00');
                  setDoctorApptLeadOptions(['1d', '0d']);
                  setDoctorBloodTestDate('');
                  setDoctorNotes('');
                }
              }
            } catch {}
          } else {
            if (response.settings.doctorName !== undefined) setDoctorName(response.settings.doctorName);
            if (response.settings.doctorSpecialty !== undefined) setDoctorSpecialty(response.settings.doctorSpecialty);
            if (response.settings.doctorHospital !== undefined) setDoctorHospital(response.settings.doctorHospital);
            if (response.settings.doctorPhone !== undefined) setDoctorPhone(response.settings.doctorPhone);
            if (response.settings.doctorNextAppointment !== undefined) setDoctorNextAppointment(response.settings.doctorNextAppointment);
            if (response.settings.doctorAppointmentTime !== undefined) setDoctorAppointmentTime(response.settings.doctorAppointmentTime);
            if (response.settings.doctorApptLeadOptions !== undefined) {
              try {
                const opts = typeof response.settings.doctorApptLeadOptions === 'string'
                  ? JSON.parse(response.settings.doctorApptLeadOptions)
                  : response.settings.doctorApptLeadOptions;
                if (Array.isArray(opts) && opts.length > 0) setDoctorApptLeadOptions(opts);
              } catch {}
            }
            if (response.settings.doctorBloodTestDate !== undefined) setDoctorBloodTestDate(response.settings.doctorBloodTestDate);
            if (response.settings.doctorNotes !== undefined) setDoctorNotes(response.settings.doctorNotes);
          }
          if (response.settings.notifications !== undefined) setNotifications(response.settings.notifications);
          if (response.settings.soundEnabled !== undefined) setSoundEnabled(response.settings.soundEnabled);
          if (response.settings.soundType !== undefined) setSoundType(response.settings.soundType);
          if (response.settings.snoozeMinutes !== undefined) setSnoozeMinutes(response.settings.snoozeMinutes);
          if (response.settings.leadTimeMinutes !== undefined) setLeadTimeMinutes(response.settings.leadTimeMinutes);
          if (response.settings.defaultStockThreshold !== undefined) setDefaultStockThreshold(response.settings.defaultStockThreshold);
          if (response.settings.stockAlertsEnabled !== undefined) setStockAlertsEnabled(response.settings.stockAlertsEnabled);
          if (response.settings.hideDoseAmount !== undefined) setHideDoseAmount(response.settings.hideDoseAmount);
          if (response.settings.autoCollapseTaken !== undefined) setAutoCollapseTaken(response.settings.autoCollapseTaken);
          if (response.settings.showAppointmentCard !== undefined) setShowAppointmentCard(response.settings.showAppointmentCard);
          if (response.settings.hapticsEnabled !== undefined) setHapticsEnabled(response.settings.hapticsEnabled);
        } else if (currentSession.user?.name && (!userName || !userName.trim())) {
          setUserName(currentSession.user.name);
        }

        const nowStr = new Date().toLocaleTimeString(language === 'en' ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncAt(nowStr);
        setSyncStatus('connected');
        const activeCount = response.doses.filter((d: SyncDose) => !d.deletedAt).length;
        setSyncStatusMsg(language === 'en' ? `Synced (${activeCount} active medications)` : `Eşitlendi (${activeCount} aktif ilaç)`);
        if (showToastNotification) showToast(t.toastSyncSuccess);
        logger.info('Sync', `Sunucu ile başarıyla eşitlendi (${activeCount} aktif ilaç)`);
      } else {
        setSyncStatus('error');
        setSyncStatusMsg(response.message || (language === 'en' ? 'Sync failed' : 'Eşitleme başarısız'));
        logger.warn('Sync', `Sunucu eşitleme başarısız yanıt döndü: ${response.message}`, { serverUrl });
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncStatusMsg(err.message || (language === 'en' ? 'Connection error' : 'Bağlantı hatası'));
      if (showToastNotification) showToast(t.toastSyncFailed);
      logger.error('Sync', 'Sunucu eşitleme hatası', err, { serverUrl });
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    setAuthBusy(true);
    try {
      const res = await registerAccount(serverUrl, userName || 'Aykut', authEmail.trim() || undefined);
      await bindAccount(res.session);
      setActiveSyncCode(res.syncCode);
      setRecoveredCredentials({ syncCode: res.syncCode, recoveryKey: res.recoveryKey });
      setSyncStatusMsg(language === 'en' ? `New sync code created for ${res.session.user.name}` : `${res.session.user.name} için yeni eşitleme kodu oluşturuldu`);
      setSyncStatus('connected');
      try {
        await syncWithServer(res.session, false);
      } catch {}
    } catch (err: any) {
      setSyncStatusMsg(err.message || (language === 'en' ? 'Account could not be created.' : 'Hesap oluşturulamadı.'));
      setSyncStatus('error');
    } finally {
      setAuthBusy(false);
    }
  };
  const handleUpdateEmail = async () => {
    if (!authEmail.trim()) return;
    Keyboard.dismiss();
    setAuthBusy(true);
    try {
      const res = await updateUserEmail(serverUrl, authEmail.trim(), session || undefined);
      if (session) {
        setSession({ ...session, user: { ...session.user, email: res.email } });
      }
      setEditingEmail(false);
      showToast(t.syncEmailSaved);
      setSyncStatusMsg(t.syncEmailSaved);
    } catch (err: any) {
      setSyncStatusMsg(err.message || (language === 'en' ? 'Failed to save email' : 'E-posta kaydedilemedi'));
      setSyncStatus('error');
    } finally {
      setAuthBusy(false);
    }
  };
  const handleLogin = async () => {
    Keyboard.dismiss();
    setAuthBusy(true);
    try {
      const next = await login(serverUrl, syncCode);
      const code = syncCode;
      setSyncCode('');
      await bindAccount(next);
      setActiveSyncCode(code);
      setSyncStatusMsg(language === 'en' ? `Connected to ${next.user.name}'s account` : `${next.user.name} hesabına bağlandı`);
      setSyncStatus('connected');
      try {
        await syncWithServer(next, false);
      } catch (syncErr) {
        console.warn('Initial sync error after login', syncErr);
      }
    } catch (err: any) {
      setSyncStatusMsg(err.message || (language === 'en' ? 'Connection failed.' : 'Bağlantı başarısız.'));
      setSyncStatus('error');
    } finally {
      setAuthBusy(false);
    }
  };
  const handleRecover = async () => {
    Keyboard.dismiss();
    setAuthBusy(true);
    try {
      const res = await recover(serverUrl, recoveryKey);
      setRecoveryKey('');
      setRecoveryMode(false);
      await bindAccount(res.session);
      setActiveSyncCode(res.newSyncCode);
      setRecoveredCredentials({ syncCode: res.newSyncCode, recoveryKey: res.newRecoveryKey });
      setSyncStatusMsg(language === 'en' ? `Account recovered for ${res.session.user.name}` : `${res.session.user.name} hesabı kurtarıldı`);
      setSyncStatus('connected');
      try {
        await syncWithServer(res.session, false);
      } catch {}
    } catch (err: any) {
      setSyncStatusMsg(err.message || (language === 'en' ? 'Recovery failed.' : 'Kurtarma başarısız.'));
      setSyncStatus('error');
    } finally {
      setAuthBusy(false);
    }
  };
  const handleLogout = async () => {
    Keyboard.dismiss();
    setAuthBusy(true);
    try { if(session) await logout(serverUrl, session); }
    catch { setSyncStatusMsg(language === 'en' ? 'Server unreachable. Check connection to disconnect.' : 'Sunucuya ulaşılamadı. Oturumu kapatmak için bağlantıyı kontrol edin.'); return; }
    finally { setAuthBusy(false); }
    setSession(null); setActiveSyncCode(null); setSyncCode(''); setSyncStatusMsg(language === 'en' ? 'Connection closed. Local records are kept on this device.' : 'Bağlantı kapatıldı. Yerel kayıtlar bu cihazda korunuyor.');
  };
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    setSession(null);
    getSession(serverUrl).then(async next => {
      if(active) {
        setAuthBusy(true);
        try {
          await bindAccount(next);
          const savedCode = await getStoredSyncCode();
          if (active) setActiveSyncCode(savedCode);
        } finally {setAuthBusy(false);}
      }
    }).catch(() => {});
    return () => {active=false;};
  }, [serverUrl, hydrated]);

  const handleTestConnection = async () => {
    triggerHaptic();
    setSyncStatus('testing');
    setSyncStatusMsg(language === 'en' ? 'Connecting to server...' : 'Sunucuya bağlanılıyor...');
    const targetUrl = restoreServerUrl(serverUrl);
    if (targetUrl !== serverUrl) setServerUrl(targetUrl);
    const result = await checkServerHealth(targetUrl);
    if (result.ok) {
      setSyncStatus('connected');
      setSyncStatusMsg(language === 'en' ? `Server Online (v${result.version} · ${result.latencyMs}ms)` : `Sunucu Çevrimiçi (v${result.version} · ${result.latencyMs}ms)`);
      showToast(language === 'en' ? 'Server connection successful' : 'Sunucu bağlantısı başarılı');
    } else {
      setSyncStatus('error');
      setSyncStatusMsg(language === 'en' ? `Failed to connect: ${result.error}` : `Bağlanılamadı: ${result.error}`);
      showToast(language === 'en' ? 'Connection failed' : 'Bağlantı başarısız');
    }
  };

  const handleSyncNow = async () => {
    triggerHaptic();
    const targetUrl = restoreServerUrl(serverUrl);
    if (targetUrl !== serverUrl) setServerUrl(targetUrl);
    logger.breadcrumb(`Sunucu eşitlemesi başlatıldı: ${targetUrl}`);
    await syncWithServer(session, true);
  };

  const syncProfileSettings = (overrides?: Partial<{
    userName: string;
    doctorName: string;
    doctorSpecialty: string;
    doctorHospital: string;
    doctorPhone: string;
    doctorNextAppointment: string;
    doctorAppointmentTime: string;
    doctorApptLeadOptions: string[];
    doctorBloodTestDate: string;
    doctorNotes: string;
    appointments: AppointmentItem[];
  }>) => {
    if (session) {
      const activeUserName = (overrides?.userName !== undefined ? overrides.userName : userName).trim();
      const activeDocName = (overrides?.doctorName !== undefined ? overrides.doctorName : doctorName).trim();
      const activeDocSpecialty = (overrides?.doctorSpecialty !== undefined ? overrides.doctorSpecialty : doctorSpecialty).trim();
      const activeDocHospital = (overrides?.doctorHospital !== undefined ? overrides.doctorHospital : doctorHospital).trim();
      const activeDocPhone = (overrides?.doctorPhone !== undefined ? overrides.doctorPhone : doctorPhone).trim();
      const activeNextAppt = overrides?.doctorNextAppointment !== undefined ? overrides.doctorNextAppointment : doctorNextAppointment;
      const activeApptTime = overrides?.doctorAppointmentTime !== undefined ? overrides.doctorAppointmentTime : doctorAppointmentTime;
      const activeLeadOpts = overrides?.doctorApptLeadOptions !== undefined ? overrides.doctorApptLeadOptions : doctorApptLeadOptions;
      const activeBloodDate = overrides?.doctorBloodTestDate !== undefined ? overrides.doctorBloodTestDate : doctorBloodTestDate;
      const activeNotes = (overrides?.doctorNotes !== undefined ? overrides.doctorNotes : doctorNotes).trim();
      const activeAppts = overrides?.appointments !== undefined ? overrides.appointments : appointments;

      const payload: Record<string, any> = {
        userName: activeUserName,
        doctorName: activeDocName,
        doctorSpecialty: activeDocSpecialty,
        doctorHospital: activeDocHospital,
        doctorPhone: activeDocPhone,
        doctorNextAppointment: activeNextAppt,
        doctorAppointmentTime: activeApptTime,
        doctorApptLeadOptions: JSON.stringify(activeLeadOpts),
        doctorBloodTestDate: activeBloodDate,
        doctorNotes: activeNotes,
        appointments: JSON.stringify(activeAppts),
      };

      authRequest(serverUrl, '/api/sync', {
        settings: payload
      }, session).catch(() => {});
    }
  };

  const handleOpenAppointmentEditor = (appt?: AppointmentItem) => {
    triggerHaptic();
    setEditingAppointment(appt || null);
    setCalendarAppointmentTarget(null);
    setAppointmentEditorOpen(true);
  };

  const handleSaveAppointment = (saved: AppointmentItem) => {
    triggerHaptic();
    let updated: AppointmentItem[];
    const exists = appointments.some(a => a.id === saved.id);
    if (exists) {
      updated = appointments.map(a => a.id === saved.id ? saved : a);
    } else {
      updated = [...appointments, saved];
    }
    updated.sort((a, b) => (a.date + ' ' + (a.time || '13:00')).localeCompare(b.date + ' ' + (b.time || '13:00')));
    setAppointments(updated);

    const activeAppts = updated.filter(a => !a.completed);
    const primary = activeAppts[0] || updated[0];
    if (primary) {
      setDoctorName(primary.doctorName || '');
      setDoctorSpecialty(primary.specialty || '');
      setDoctorHospital(primary.hospital || '');
      setDoctorPhone(primary.phone || '');
      setDoctorNextAppointment(primary.date || '');
      setDoctorAppointmentTime(primary.time || '13:00');
      setDoctorApptLeadOptions(primary.leadOptions || ['1d', '0d']);
      setDoctorBloodTestDate(primary.bloodTestDate || '');
      setDoctorNotes(primary.notes || primary.bloodTestNotes || '');
    }

    syncProfileSettings({
      appointments: updated,
      doctorName: primary?.doctorName,
      doctorSpecialty: primary?.specialty,
      doctorHospital: primary?.hospital,
      doctorPhone: primary?.phone,
      doctorNextAppointment: primary?.date,
      doctorAppointmentTime: primary?.time,
      doctorApptLeadOptions: primary?.leadOptions,
      doctorBloodTestDate: primary?.bloodTestDate,
      doctorNotes: primary?.notes || primary?.bloodTestNotes,
    });

    setAppointmentEditorOpen(false);
    showToast(language === 'en' ? '✅ Appointment saved' : '✅ Randevu kaydedildi');
  };

  const handleDeleteAppointment = (id: string) => {
    triggerHaptic();
    Alert.alert(
      language === 'en' ? 'Delete Appointment' : 'Randevuyu Sil',
      language === 'en' ? 'Are you sure you want to delete this appointment?' : 'Bu randevuyu silmek istediğinize emin misiniz?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'en' ? 'Delete' : 'Sil',
          style: 'destructive',
          onPress: () => {
            const updated = appointments.filter(a => a.id !== id);
            setAppointments(updated);
            const activeAppts = updated.filter(a => !a.completed);
            const primary = activeAppts[0] || updated[0];

            const newDocName = primary?.doctorName || '';
            const newDocSpecialty = primary?.specialty || '';
            const newDocHospital = primary?.hospital || '';
            const newDocPhone = primary?.phone || '';
            const newNextAppt = primary?.date || '';
            const newApptTime = primary?.time || '13:00';
            const newLeadOptions = primary?.leadOptions || ['1d', '0d'];
            const newBloodDate = primary?.bloodTestDate || '';
            const newNotes = primary?.notes || primary?.bloodTestNotes || '';

            setDoctorName(newDocName);
            setDoctorSpecialty(newDocSpecialty);
            setDoctorHospital(newDocHospital);
            setDoctorPhone(newDocPhone);
            setDoctorNextAppointment(newNextAppt);
            setDoctorAppointmentTime(newApptTime);
            setDoctorApptLeadOptions(newLeadOptions);
            setDoctorBloodTestDate(newBloodDate);
            setDoctorNotes(newNotes);

            syncProfileSettings({
              appointments: updated,
              doctorName: newDocName,
              doctorSpecialty: newDocSpecialty,
              doctorHospital: newDocHospital,
              doctorPhone: newDocPhone,
              doctorNextAppointment: newNextAppt,
              doctorAppointmentTime: newApptTime,
              doctorApptLeadOptions: newLeadOptions,
              doctorBloodTestDate: newBloodDate,
              doctorNotes: newNotes,
            });

            void syncDoctorAppointmentNotifications({
              appointments: updated,
              appointmentDate: newNextAppt,
              appointmentTime: newApptTime,
              leadOptions: newLeadOptions,
              bloodTestDate: newBloodDate,
              doctorName: newDocName,
              hospital: newDocHospital,
              lang: language,
            });

            showToast(language === 'en' ? '🗑️ Appointment deleted' : '🗑️ Randevu silindi');
          },
        },
      ]
    );
  };

  const handleToggleCompleteAppointment = (id: string) => {
    triggerHaptic();
    const updated = appointments.map(a => a.id === id ? { ...a, completed: !a.completed, updatedAt: Date.now() } : a);
    setAppointments(updated);
    const activeAppts = updated.filter(a => !a.completed);
    const primary = activeAppts[0];

    const newDocName = primary?.doctorName || '';
    const newDocSpecialty = primary?.specialty || '';
    const newDocHospital = primary?.hospital || '';
    const newDocPhone = primary?.phone || '';
    const newNextAppt = primary?.date || '';
    const newApptTime = primary?.time || '13:00';
    const newLeadOptions = primary?.leadOptions || ['1d', '0d'];
    const newBloodDate = primary?.bloodTestDate || '';
    const newNotes = primary?.notes || primary?.bloodTestNotes || '';

    setDoctorName(newDocName);
    setDoctorSpecialty(newDocSpecialty);
    setDoctorHospital(newDocHospital);
    setDoctorPhone(newDocPhone);
    setDoctorNextAppointment(newNextAppt);
    setDoctorAppointmentTime(newApptTime);
    setDoctorApptLeadOptions(newLeadOptions);
    setDoctorBloodTestDate(newBloodDate);
    setDoctorNotes(newNotes);

    syncProfileSettings({
      appointments: updated,
      doctorName: newDocName,
      doctorSpecialty: newDocSpecialty,
      doctorHospital: newDocHospital,
      doctorPhone: newDocPhone,
      doctorNextAppointment: newNextAppt,
      doctorAppointmentTime: newApptTime,
      doctorApptLeadOptions: newLeadOptions,
      doctorBloodTestDate: newBloodDate,
      doctorNotes: newNotes,
    });

    void syncDoctorAppointmentNotifications({
      appointments: updated,
      appointmentDate: newNextAppt,
      appointmentTime: newApptTime,
      leadOptions: newLeadOptions,
      bloodTestDate: newBloodDate,
      doctorName: newDocName,
      hospital: newDocHospital,
      lang: language,
    });

    const target = updated.find(a => a.id === id);
    showToast(target?.completed
      ? (language === 'en' ? '✓ Appointment marked as completed' : '✓ Randevu tamamlandı olarak işaretlendi')
      : (language === 'en' ? 'Appointment reopened' : 'Randevu tekrar açıldı'));
  };

  const handleCallDoctor = () => {
    triggerHaptic();
    if (!doctorPhone.trim()) return;
    const cleanPhone = doctorPhone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
      Alert.alert(
        language === 'en' ? 'Invalid Phone' : 'Geçersiz Numara',
        language === 'en' ? 'Please enter a valid phone number.' : 'Lütfen geçerli bir telefon numarası girin.'
      );
      return;
    }
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert(
        language === 'en' ? 'Error' : 'Hata',
        language === 'en' ? 'Could not launch phone dialer.' : 'Arama başlatılamadı.'
      );
    });
  };

  const handleShareMedList = async () => {
    triggerHaptic();
    const activeMeds = doses.filter(d => !d.paused);
    const dateStr = formatLocalizedDate(today, language);

    let text = `📋 ${t.doctorShareSubject}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (userName.trim()) text += `👤 ${language === 'en' ? 'Patient' : 'Hasta'}: ${userName.trim()}\n`;
    if (doctorName.trim()) text += `👨‍⚕️ ${t.doctorNameLabel}: ${doctorName.trim()}\n`;
    if (doctorSpecialty.trim()) text += `🩺 ${t.doctorSpecialtyLabel}: ${doctorSpecialty.trim()}\n`;
    if (doctorHospital.trim()) text += `🏥 ${t.doctorHospitalLabel}: ${doctorHospital.trim()}\n`;
    text += `📅 ${language === 'en' ? 'Date' : 'Tarih'}: ${dateStr}\n\n`;

    text += `💊 ${t.doctorShareActiveMeds} (${activeMeds.length}):\n`;
    if (activeMeds.length === 0) {
      text += `  • ${t.doctorShareNoMeds}\n`;
    } else {
      activeMeds.forEach((m, idx) => {
        const mTimes = Array.isArray(m.times) && m.times.length > 0 ? m.times : [m.time || '-'];
        const timesStr = mTimes.map(t => m.slotAmounts?.[t] ? `${t} (${m.slotAmounts[t]})` : t).join(', ');
        const meal = getMealLabel(m.mealCondition);
        const stockInfo = m.stock !== undefined ? ` [${language === 'en' ? 'Stock' : 'Stok'}: ${m.stock}]` : '';
        text += `${idx + 1}. ${m.name} (${m.amount || '1 doz'})\n`;
        text += `   ⏰ ${timesStr} • ${meal}${stockInfo}\n`;
        if (m.instructions) text += `   ℹ️ ${m.instructions}\n`;
      });
    }

    if (doctorNextAppointment) {
      const timePart = doctorAppointmentTime ? ` (${doctorAppointmentTime})` : '';
      text += `\n🗓️ ${t.doctorAppointmentLabel}: ${formatLocalizedDate(doctorNextAppointment, language)}${timePart}\n`;
    }
    if (doctorBloodTestDate) {
      text += `🧪 ${t.doctorBloodTestLabel}: ${formatLocalizedDate(doctorBloodTestDate, language)}\n`;
    }
    if (doctorNotes.trim()) {
      text += `\n📝 ${t.doctorNotesSection}:\n${doctorNotes.trim()}\n`;
    }

    try {
      await Share.share({
        title: t.doctorShareSubject,
        message: text,
      });
    } catch (err) {
      console.error('Failed to share medication list', err);
    }
  };

  const handleExportBackup = async () => {
    triggerHaptic();
    const backup = createBackupPayload({
      ownerId: session?.user.id,
      doses,
      settings: {
        userName,
        doctorName,
        doctorSpecialty,
        doctorHospital,
        doctorPhone,
        doctorNextAppointment,
        doctorNotes,
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
        title: language === 'en' ? 'Reminder Health Backup' : 'Reminder Health İlaç Yedeklemesi',
        message: jsonStr,
      });
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Hata', language === 'en' ? 'Backup file could not be shared.' : 'Yedek dosyası paylaşılamadı.');
    }
  };

  const resetAllData = () => {
    Alert.alert(
      t.confirmResetTitle,
      t.confirmResetDesc,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'en' ? 'Reset' : 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            AsyncStorage.clear().catch(() => {});
            setDoses([]);
            setPrivateMode(true);
            setNotifications(true);
            setSoundEnabled(true);
            setSoundType('default');
            setUserName('');
            setDoctorName('');
            setDoctorSpecialty('');
            setDoctorHospital('');
            setDoctorPhone('');
            setDoctorNextAppointment('');
            setDoctorNotes('');
            setSnoozeMinutes(15);
            setLeadTimeMinutes(0);
            setDefaultStockThreshold(5);
            setStockAlertsEnabled(true);
            setHideDoseAmount(false);
            setAutoCollapseTaken(false);
            setShowAppointmentCard(true);
            setHapticsEnabled(true);
            showToast(t.toastResetSuccess);
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
                  {activeBannerNotification.isRepeat
                    ? (language === 'en' ? '⚠️ ROUTINE · REPEAT ALERT (+3 MIN)' : '⚠️ RUTİN · TEKRAR UYARISI (+3 DK)')
                    : (language === 'en' ? 'ROUTINE · NOTIFICATION' : 'RUTİN · BİLDİRİM')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveBannerNotification(null)}>
                <Ionicons name="close" size={16} color="#adb3bf" />
              </TouchableOpacity>
            </View>
            <Text style={styles.pushBannerTitle}>{activeBannerNotification.title}</Text>
            <Text style={styles.pushBannerBody}>{activeBannerNotification.body}</Text>
            {activeBannerNotification.isAppointment ? (
              <View style={styles.pushBannerActions}>
                <TouchableOpacity
                  style={styles.pushBannerActionTake}
                  onPress={() => {
                    triggerHaptic();
                    setActiveBannerNotification(null);
                    showToast(language === 'en' ? '✅ Appointment confirmed' : '✅ Randevu bildirimi onaylandı');
                  }}
                >
                  <Ionicons name="checkmark-circle" size={15} color="#081624" />
                  <Text style={styles.pushBannerActionTakeText}>{language === 'en' ? 'Tamam / Anlaşıldı' : 'Tamam / Anlaşıldı'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pushBannerActions}>
                <TouchableOpacity
                  style={styles.pushBannerActionTake}
                  onPress={() => {
                    triggerHaptic();
                    const targetDose = doses.find(d => d.id === activeBannerNotification.doseId);
                    const targetTime = activeBannerNotification.time || targetDose?.time;
                    if (targetDose) {
                      applyRecord(targetDose.id, targetTime || targetDose.time, activeBannerNotification.date ?? localDateKey(), 'taken');
                    }
                    setActiveBannerNotification(null);
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
                      applyRecord(targetDose.id, targetTime || targetDose.time, activeBannerNotification.date ?? localDateKey(), 'skipped');
                    }
                    setActiveBannerNotification(null);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={15} color="#f87171" />
                  <Text style={styles.pushBannerActionSkipText}>{t.skip}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {tab === 'Bugün' && t.tabToday}
              {tab === 'İlaçlarım' && t.tabMedicines}
              {tab === 'Geçmiş' && t.tabHistory}
              {tab === 'Ayarlar' && t.tabSettings}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
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
        <ScrollView
          ref={mainScrollViewRef}
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
        >
          {tab === 'Bugün' && (
            <TodayView
              carouselSlots={carouselSlots}
              todaySlots={todaySlots}
              takenSlots={takenSlots}
              offCycleDoses={offCycleDoses}
              completedDoses={completedDoses}
              restOfDaySlots={restOfDaySlots}
              heroCarouselIndex={heroCarouselIndex}
              setHeroCarouselIndex={setHeroCarouselIndex}
              heroCarouselRef={heroCarouselRef}
              takeSlot={takeSlot}
              snoozeDose={snoozeDose}
              skipSlot={skipSlot}
              onRevertRecord={(slot) => confirmRevertRecord(slot.doseId, slot.time, today)}
              triggerHaptic={triggerHaptic}
              openEditor={openEditor}
              onNavigateSettings={() => setTab('Ayarlar')}
              onNavigateDoctorProfile={() => {
                setTab('Ayarlar');
                setSettingsSubPage('profile');
              }}
              doctorNextAppointment={doctorNextAppointment}
              doctorAppointmentTime={doctorAppointmentTime}
              doctorName={doctorName}
              doctorHospital={doctorHospital}
              doctorSpecialty={doctorSpecialty}
              appointments={appointments}
              onOpenAppointmentEditor={handleOpenAppointmentEditor}
              showAppointmentCard={showAppointmentCard}
              today={today}
              snoozeMinutes={snoozeMinutes}
              language={language}
              t={t}
              expandedTaken={expandedTaken}
              setExpandedTaken={setExpandedTaken}
              getSlotTimingText={getSlotTimingText}
              getMealLabel={getMealLabel}
              getFormLabel={getFormLabel}
              getOverdueGuidance={getOverdueGuidance}
              formatStock={formatStock}
              getCycleInfo={getCycleInfo}
              getDurationInfo={getDurationInfo}
              CAROUSEL_CARD_WIDTH={carouselCardWidth}
              CAROUSEL_SPACING={CAROUSEL_SPACING}
            />
          )}

          {tab === 'İlaçlarım' && (
            <MedicationList
              doses={doses}
              today={today}
              language={language}
              t={t}
              openEditor={openEditor}
              onUpdateStock={updateStock}
              getMealLabel={getMealLabel}
              formatStock={formatStock}
              getCycleInfo={getCycleInfo}
              getDurationInfo={getDurationInfo}
              calculateEndDate={calculateEndDate}
            />
          )}

          {tab === 'Geçmiş' && (
            <HistoryView
              pastWeekHistory={pastWeekHistory}
              selectedHistoryDate={selectedHistoryDate}
              setSelectedHistoryDate={setSelectedHistoryDate}
              historySlots={historySlots}
              onRevertRecord={(slot) => confirmRevertRecord(slot.dose.id, slot.time, selectedHistoryDate)}
              onRecordSlot={(slot, status) => applyRecord(slot.dose.id, slot.time, selectedHistoryDate, status)}
              takenSlots={takenSlots}
              todaySlots={todaySlots}
              today={today}
              language={language}
              dateFromKey={dateFromKey}
            />
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
                        if (granted) showToast(language === 'en' ? 'Notification permission granted!' : 'Bildirim izni verildi!');
                        else Alert.alert(
                          language === 'en' ? 'Permission Denied' : 'İzin Reddedildi',
                          language === 'en' ? 'Please grant notification permissions in phone Settings.' : 'Telefonunuzun Ayarlar > Bildirimler menüsünden bildirim izni vermeniz gerekebilir.'
                        );
                      }}
                    >
                      <Ionicons name="warning-outline" size={20} color="#f0b484" />
                      <Text style={styles.permBannerText}>
                        {language === 'en' ? 'Notifications are disabled. Tap to enable dose reminders.' : 'Bildirim izni kapalı. Doz hatırlatıcıları için dokunun.'}
                      </Text>
                      <View style={styles.permBannerBtn}>
                        <Text style={styles.permBannerBtnText}>{language === 'en' ? 'Enable' : 'İzin Ver'}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="options-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>{language === 'en' ? 'SETTINGS CATEGORIES' : 'AYAR KATEGORİLERİ'}</Text>
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
                        <Text style={styles.menuItemTitle}>{t.settingsProfile}</Text>
                        <Text style={styles.menuItemSub}>
                          {userName
                            ? (doctorName ? `${userName} • ${doctorName}` : (language === 'en' ? `Name: ${userName}` : `Hitap: ${userName}`))
                            : (doctorName ? doctorName : t.settingsProfileDesc)}
                        </Text>
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
                        <Text style={styles.menuItemTitle}>{t.settingsNotifications}</Text>
                        <Text style={styles.menuItemSub}>
                          {notifications ? (soundEnabled ? (language === 'en' ? 'Sound notifications on' : 'Sesli bildirimler açık') : (language === 'en' ? 'Silent notifications' : 'Sessiz bildirim')) : (language === 'en' ? 'Notifications off' : 'Bildirimler kapalı')}
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
                        <Text style={styles.menuItemTitle}>{t.settingsReminders}</Text>
                        <Text style={styles.menuItemSub}>
                          {language === 'en' ? `${snoozeMinutes} min snooze · ${repeatNagEnabled ? `${repeatNagCount} repeats` : 'No repeats'}` : `${snoozeMinutes} dk erteleme · ${repeatNagEnabled ? `${repeatNagCount} tekrar` : 'Tekrarsız'}`}
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
                        <Text style={styles.menuItemTitle}>{t.settingsReliability}</Text>
                        <Text style={styles.menuItemSub}>{t.settingsReliabilityDesc}</Text>
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
                        <Text style={styles.menuItemTitle}>{t.settingsStock}</Text>
                        <Text style={styles.menuItemSub}>{language === 'en' ? `Threshold: ${defaultStockThreshold} doses · ${stockAlertsEnabled ? 'Alerts on' : 'Off'}` : `Kritik eşik: ${defaultStockThreshold} doz · ${stockAlertsEnabled ? 'Uyarılar aktif' : 'Kapalı'}`}</Text>
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
                        <Text style={styles.menuItemTitle}>{t.settingsPrivacy}</Text>
                        <Text style={styles.menuItemSub}>{privateMode ? (language === 'en' ? 'Privacy mode on (Med hidden)' : 'Gizlilik modu aktif (İlaç gizli)') : (language === 'en' ? 'Detailed notifications' : 'Detaylı bildirimler')}</Text>
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
                        <Text style={styles.menuItemTitle}>{t.settingsExperience}</Text>
                        <Text style={styles.menuItemSub}>{t.settingsExperienceDesc}</Text>
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
                        <Text style={styles.menuItemTitle}>{t.settingsSync}</Text>
                        <Text style={styles.menuItemSub}>
                          {lastSyncAt ? (language === 'en' ? `Last sync: ${lastSyncAt}` : `Son eşitleme: ${lastSyncAt}`) : t.settingsSyncDesc}
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
                          <Text style={styles.menuItemTitle}>{t.settingsDiagnostics}</Text>
                          {diagnosticsLogs.some(l => l.level === 'ERROR' || l.level === 'FATAL') && (
                            <View style={{ backgroundColor: '#4c1d1d', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: '#fca5a5', fontSize: 10, fontWeight: '700' }}>
                                {diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length} {language === 'en' ? 'Errors' : 'Hata'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.menuItemSub}>{t.settingsDiagnosticsDesc}</Text>
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
                        <Text style={[styles.menuItemTitle, { color: '#ff9696' }]}>{t.settingsReset}</Text>
                        <Text style={styles.menuItemSub}>{t.settingsResetDesc}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#ff9696" />
                    </TouchableOpacity>
                  </View>

                  {/* SÜRÜM & GÜNCELLEME KARTI */}
                  <View style={styles.updateCard}>
                    <View style={styles.updateHeaderRow}>
                      <View style={styles.updateIconBox}>
                        <Ionicons name="git-branch-outline" size={20} color="#a9dfca" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.updateTitle}>Rutin v{CURRENT_APP_VERSION}</Text>
                        <Text style={styles.updateSub}>
                          {language === 'en' ? 'GitHub Releases & Local Server' : 'GitHub Releases & Yerel Sunucu'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.checkUpdateBtn, checkingUpdate && { opacity: 0.6 }]}
                        onPress={() => handleCheckUpdate(true)}
                        disabled={checkingUpdate}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={checkingUpdate ? 'sync' : 'refresh-outline'} size={14} color="#081624" />
                        <Text style={styles.checkUpdateBtnText}>
                          {checkingUpdate
                            ? (language === 'en' ? 'Checking...' : 'Denetleniyor...')
                            : (language === 'en' ? 'Check Updates' : 'Güncellemeleri Denetle')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {updateInfo?.updateAvailable && (
                      <View style={styles.updateAlertBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="sparkles" size={18} color="#5eead4" />
                          <Text style={styles.updateAlertTitle}>
                            {language === 'en' ? `New Version Available: v${updateInfo.latestVersion}` : `Yeni Sürüm Mevcut: v${updateInfo.latestVersion}`}
                          </Text>
                        </View>
                        {!!updateInfo.releaseNotes && (
                          <Text style={styles.updateAlertNotes} numberOfLines={3}>
                            {updateInfo.releaseNotes}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={styles.downloadUpdateBtn}
                          onPress={handleDownloadUpdate}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="cloud-download-outline" size={18} color="#081624" />
                          <Text style={styles.downloadUpdateBtnText}>
                            {language === 'en' ? 'Download & Install Update' : 'İndir ve Güncellemeyi Yükle'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {updateCheckedOnce && !updateInfo?.updateAvailable && !checkingUpdate && (
                      <View style={styles.upToDateRow}>
                        <Ionicons name="checkmark-circle-outline" size={15} color="#34d399" />
                        <Text style={styles.upToDateText}>
                          {language === 'en' ? 'Your app is up to date.' : 'Uygulamanız en güncel sürümde.'}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* SUB PAGE 1: KULLANICI & HEKİM PROFİLİ */}
              {settingsSubPage === 'profile' && (() => {
                const appointmentDiff = doctorNextAppointment ? getCalendarDayDiff(today, doctorNextAppointment) : null;
                let badgeText = '';
                let badgeTextColor = '#34d399';
                let badgeBg = 'rgba(52, 211, 153, 0.15)';
                const timeSuffix = doctorAppointmentTime ? ` • ⏰ ${doctorAppointmentTime}` : '';

                if (appointmentDiff !== null) {
                  if (appointmentDiff === 0) {
                    badgeText = `${t.doctorAppointmentToday}${timeSuffix}`;
                    badgeTextColor = '#fbbf24';
                    badgeBg = 'rgba(251, 191, 36, 0.2)';
                  } else if (appointmentDiff === 1) {
                    badgeText = `${t.doctorAppointmentTomorrow} (${formatLocalizedDate(doctorNextAppointment, language)})${timeSuffix}`;
                    badgeTextColor = '#34d399';
                    badgeBg = 'rgba(52, 211, 153, 0.18)';
                  } else if (appointmentDiff > 1) {
                    badgeText = `${appointmentDiff} ${t.doctorAppointmentDaysLeft} (${formatLocalizedDate(doctorNextAppointment, language)})${timeSuffix}`;
                    badgeTextColor = '#38bdf8';
                    badgeBg = 'rgba(56, 189, 248, 0.18)';
                  } else {
                    badgeText = `${Math.abs(appointmentDiff)} ${t.doctorAppointmentDaysAgo} (${formatLocalizedDate(doctorNextAppointment, language)})${timeSuffix}`;
                    badgeTextColor = '#94a3b8';
                    badgeBg = 'rgba(148, 163, 184, 0.15)';
                  }
                }

                const bloodTestDiff = doctorBloodTestDate ? getCalendarDayDiff(today, doctorBloodTestDate) : null;
                let bloodBadgeText = '';
                let bloodBadgeTextColor = '#a78bfa';
                let bloodBadgeBg = 'rgba(167, 139, 250, 0.18)';

                if (bloodTestDiff !== null) {
                  if (bloodTestDiff === 0) {
                    bloodBadgeText = t.doctorBloodTestToday;
                    bloodBadgeTextColor = '#fbbf24';
                    bloodBadgeBg = 'rgba(251, 191, 36, 0.2)';
                  } else if (bloodTestDiff === 1) {
                    bloodBadgeText = `${t.doctorBloodTestTomorrow} (${formatLocalizedDate(doctorBloodTestDate, language)})`;
                    bloodBadgeTextColor = '#a78bfa';
                    bloodBadgeBg = 'rgba(167, 139, 250, 0.2)';
                  } else if (bloodTestDiff > 1) {
                    bloodBadgeText = `${bloodTestDiff} ${t.doctorBloodTestDaysLeft} (${formatLocalizedDate(doctorBloodTestDate, language)})`;
                    bloodBadgeTextColor = '#38bdf8';
                    bloodBadgeBg = 'rgba(56, 189, 248, 0.18)';
                  } else {
                    bloodBadgeText = `${Math.abs(bloodTestDiff)} ${t.doctorBloodTestDaysAgo} (${formatLocalizedDate(doctorBloodTestDate, language)})`;
                    bloodBadgeTextColor = '#94a3b8';
                    bloodBadgeBg = 'rgba(148, 163, 184, 0.15)';
                  }
                }

                return (
                  <>
                    {/* KULLANICI BİLGİSİ */}
                    <View style={styles.settingGroupHeader}>
                      <Ionicons name="person-circle-outline" size={16} color="#a9dfca" />
                      <Text style={styles.settingGroupTitle}>{t.profileUserSection}</Text>
                    </View>
                    <View style={styles.settingCard}>
                      <Text style={styles.settingTitle}>{t.userNameLabel}</Text>
                      <Text style={styles.settingSub}>{t.userNameDesc}</Text>
                      <View style={styles.profileInputRow}>
                        <Ionicons name="person-outline" size={16} color="#a9dfca" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.profileInput}
                          value={userName}
                          onChangeText={setUserName}
                          placeholder={t.userNamePlaceholder}
                          placeholderTextColor="#5c6e80"
                          maxLength={32}
                          onBlur={() => syncProfileSettings()}
                        />
                        {userName.trim().length > 0 && (
                          <TouchableOpacity onPress={() => {
                            showToast(language === 'en' ? `Name updated to "${userName}"` : `İsim "${userName}" olarak güncellendi`);
                            syncProfileSettings();
                          }}>
                            <Ionicons name="checkmark-circle" size={18} color="#a9dfca" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* TAKİP EDEN HEKİM & KLİNİK */}
                    <View style={styles.settingGroupHeader}>
                      <Ionicons name="medkit-outline" size={16} color="#a9dfca" />
                      <Text style={styles.settingGroupTitle}>{t.profileDoctorSection}</Text>
                    </View>
                    <View style={styles.settingCard}>
                      {/* Doktor Adı */}
                      <Text style={styles.profileFieldLabel}>{t.doctorNameLabel}</Text>
                      <View style={styles.profileInputRow}>
                        <Ionicons name="person-outline" size={16} color="#a9dfca" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.profileInput}
                          value={doctorName}
                          onChangeText={setDoctorName}
                          placeholder={t.doctorNamePlaceholder}
                          placeholderTextColor="#5c6e80"
                          maxLength={60}
                          onBlur={() => syncProfileSettings()}
                        />
                      </View>

                      {/* Branş / Uzmanlık */}
                      <Text style={styles.profileFieldLabel}>{t.doctorSpecialtyLabel}</Text>
                      <View style={styles.profileInputRow}>
                        <Ionicons name="fitness-outline" size={16} color="#a9dfca" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.profileInput}
                          value={doctorSpecialty}
                          onChangeText={setDoctorSpecialty}
                          placeholder={t.doctorSpecialtyPlaceholder}
                          placeholderTextColor="#5c6e80"
                          maxLength={60}
                          onBlur={() => syncProfileSettings()}
                        />
                      </View>

                      {/* Hastane / Klinik */}
                      <Text style={styles.profileFieldLabel}>{t.doctorHospitalLabel}</Text>
                      <View style={styles.profileInputRow}>
                        <Ionicons name="business-outline" size={16} color="#a9dfca" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.profileInput}
                          value={doctorHospital}
                          onChangeText={setDoctorHospital}
                          placeholder={t.doctorHospitalPlaceholder}
                          placeholderTextColor="#5c6e80"
                          maxLength={80}
                          onBlur={() => syncProfileSettings()}
                        />
                      </View>

                      {/* Telefon & Ara Butonu */}
                      <Text style={styles.profileFieldLabel}>{t.doctorPhoneLabel}</Text>
                      <View style={styles.profileInputRow}>
                        <Ionicons name="call-outline" size={16} color="#a9dfca" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.profileInput}
                          value={doctorPhone}
                          onChangeText={setDoctorPhone}
                          placeholder={t.doctorPhonePlaceholder}
                          placeholderTextColor="#5c6e80"
                          keyboardType="phone-pad"
                          maxLength={25}
                          onBlur={() => syncProfileSettings()}
                        />
                      </View>

                      {doctorPhone.trim().length > 0 && (
                        <TouchableOpacity
                          style={styles.doctorCallBtn}
                          onPress={handleCallDoctor}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={16} color="#081624" />
                          <Text style={styles.doctorCallBtnText}>
                            {language === 'en' ? `Call ${doctorName ? doctorName : 'Doctor'}` : `${doctorName ? doctorName : 'Doktor'}'u Ara`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* RANDEVULAR VE DOKTOR TAKİBİ */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8, paddingHorizontal: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calendar-outline" size={16} color="#a9dfca" />
                        <Text style={styles.settingGroupTitle}>
                          {language === 'en' ? 'APPOINTMENTS & LAB TESTS' : 'RANDEVULAR VE TAHLİLLER'}
                        </Text>
                        {appointments.length > 0 && (
                          <View style={{ backgroundColor: 'rgba(169, 223, 202, 0.2)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                            <Text style={{ color: '#a9dfca', fontSize: 10, fontWeight: '700' }}>{appointments.length}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(169, 223, 202, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(169, 223, 202, 0.3)' }}
                        onPress={() => handleOpenAppointmentEditor()}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={14} color="#a9dfca" />
                        <Text style={{ color: '#a9dfca', fontSize: 12, fontWeight: '700' }}>
                          {language === 'en' ? 'Add Appointment' : 'Yeni Randevu Ekle'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Bugün Sekmesinde Göster Toggle Card */}
                    <View style={[styles.settingCard, { marginBottom: 12 }]}>
                      <View style={styles.settingRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={styles.settingTitle}>
                            {language === 'en' ? 'Show on Today Tab' : 'Bugün Sekmesinde Göster'}
                          </Text>
                          <Text style={styles.settingSub}>
                            {language === 'en'
                              ? 'Display upcoming appointment card on the main screen'
                              : 'Ana ekranda (Bugün) randevu kartını göster'}
                          </Text>
                        </View>
                        <Switch
                          value={showAppointmentCard}
                          onValueChange={val => {
                            triggerHaptic();
                            setShowAppointmentCard(val);
                            showToast(val
                              ? (language === 'en' ? 'Appointment card enabled' : 'Randevu kartı açıldı')
                              : (language === 'en' ? 'Appointment card hidden' : 'Randevu kartı gizlendi'));
                          }}
                          trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                        />
                      </View>
                    </View>

                    {/* Randevu Kartları Listesi */}
                    {appointments.length === 0 ? (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#101d29',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 14,
                          borderWidth: 1,
                          borderColor: 'rgba(169, 223, 202, 0.2)',
                          borderStyle: 'dashed',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                        onPress={() => handleOpenAppointmentEditor()}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={28} color="#a9dfca" />
                        <Text style={{ color: '#f5f3f0', fontSize: 14, fontWeight: '600' }}>
                          {language === 'en' ? 'No Appointments Added' : 'Kayıtlı Randevu Bulunmuyor'}
                        </Text>
                        <Text style={{ color: '#adb3bf', fontSize: 12, textAlign: 'center' }}>
                          {language === 'en'
                            ? 'Tap here to add doctor appointments and fasting lab reminders.'
                            : 'Doktor randevusu ve aç karnına kan verme hatırlatıcısı eklemek için dokunun.'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#a9dfca', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginTop: 4 }}>
                          <Ionicons name="add" size={14} color="#081624" />
                          <Text style={{ color: '#081624', fontSize: 12, fontWeight: '700' }}>
                            {language === 'en' ? 'Add Appointment' : 'Randevu Ekle'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      appointments.map(appt => {
                        const diff = getCalendarDayDiff(today, appt.date);
                        let bText = '';
                        let bBg = 'rgba(52, 211, 153, 0.18)';
                        let bColor = '#34d399';
                        if (diff === 0) {
                          bText = language === 'en' ? 'Today' : 'Bugün';
                          bBg = 'rgba(251, 191, 36, 0.2)';
                          bColor = '#fbbf24';
                        } else if (diff === 1) {
                          bText = language === 'en' ? 'Tomorrow' : 'Yarın';
                          bBg = 'rgba(52, 211, 153, 0.2)';
                          bColor = '#34d399';
                        } else if (diff > 1) {
                          bText = language === 'en' ? `in ${diff} days` : `${diff} gün kaldı`;
                          bBg = 'rgba(56, 189, 248, 0.18)';
                          bColor = '#38bdf8';
                        } else {
                          bText = language === 'en' ? `${Math.abs(diff)} days ago` : `${Math.abs(diff)} gün önce`;
                          bBg = 'rgba(148, 163, 184, 0.15)';
                          bColor = '#94a3b8';
                        }

                        return (
                          <View
                            key={appt.id}
                            style={{
                              backgroundColor: appt.completed ? '#0c1520' : '#101d29',
                              borderRadius: 12,
                              padding: 14,
                              marginBottom: 12,
                              borderWidth: 1,
                              borderColor: appt.completed ? '#192634' : 'rgba(169, 223, 202, 0.25)',
                              opacity: appt.completed ? 0.7 : 1,
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  {appt.specialty ? (
                                    <View style={{ backgroundColor: 'rgba(169, 223, 202, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                      <Text style={{ color: '#a9dfca', fontSize: 11, fontWeight: '700' }}>{appt.specialty}</Text>
                                    </View>
                                  ) : null}
                                  <Text style={{ color: '#f5f3f0', fontSize: 14, fontWeight: '700' }}>
                                    {appt.doctorName || (language === 'en' ? 'Doctor Appointment' : 'Doktor Randevusu')}
                                  </Text>
                                </View>
                                {appt.hospital ? (
                                  <Text style={{ color: '#adb3bf', fontSize: 12, marginTop: 3 }}>
                                    🏥 {appt.hospital}
                                  </Text>
                                ) : null}
                              </View>
                              <View style={{ backgroundColor: bBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                <Text style={{ color: bColor, fontSize: 11, fontWeight: '700' }}>{bText}</Text>
                              </View>
                            </View>

                            {/* Tarih ve Saat */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="calendar-outline" size={14} color="#a9dfca" />
                                <Text style={{ color: '#f5f3f0', fontSize: 13, fontWeight: '600' }}>
                                  {formatLocalizedDate(appt.date, language)}
                                </Text>
                              </View>
                              <View style={{ backgroundColor: 'rgba(169, 223, 202, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(169, 223, 202, 0.3)' }}>
                                <Text style={{ color: '#a9dfca', fontSize: 11, fontWeight: '700' }}>
                                  ⏰ {appt.time || '13:00'}
                                </Text>
                              </View>
                            </View>

                            {/* Randevu İçi Tahlil / Kan Verme Bölümü */}
                            {appt.hasBloodTest && appt.bloodTestDate ? (
                              <View style={{
                                backgroundColor: 'rgba(167, 139, 250, 0.12)',
                                borderWidth: 1,
                                borderColor: 'rgba(167, 139, 250, 0.3)',
                                borderRadius: 8,
                                padding: 10,
                                marginTop: 10,
                              }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons name="flask" size={15} color="#c4b5fd" />
                                  <Text style={{ color: '#c4b5fd', fontSize: 12, fontWeight: '700' }}>
                                    {language === 'en' ? 'Fasting Lab Test' : 'Aç Karnına Kan Verme'}
                                  </Text>
                                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                                    • {formatLocalizedDate(appt.bloodTestDate, language)} ({appt.bloodTestTime || '08:30'})
                                  </Text>
                                </View>
                                {appt.bloodTestNotes ? (
                                  <Text style={{ color: '#e2e8f0', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                                    💬 {appt.bloodTestNotes}
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}

                            {/* Notlar */}
                            {appt.notes ? (
                              <Text style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 8 }}>
                                📝 {appt.notes}
                              </Text>
                            ) : null}

                            {/* Kart Aksiyonları: Arama, Düzenle, Tamamla, Sil */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1a2736' }}>
                              {appt.phone ? (
                                <TouchableOpacity
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(52, 211, 153, 0.15)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 }}
                                  onPress={() => {
                                    triggerHaptic();
                                    const clean = appt.phone?.replace(/[^0-9+]/g, '');
                                    if (clean) Linking.openURL(`tel:${clean}`).catch(() => {});
                                  }}
                                >
                                  <Ionicons name="call" size={13} color="#34d399" />
                                  <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '700' }}>{language === 'en' ? 'Call' : 'Ara'}</Text>
                                </TouchableOpacity>
                              ) : null}

                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#182b3a', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 }}
                                onPress={() => handleOpenAppointmentEditor(appt)}
                              >
                                <Ionicons name="pencil" size={13} color="#38bdf8" />
                                <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '600' }}>{language === 'en' ? 'Edit' : 'Düzenle'}</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: appt.completed ? '#1f3040' : '#143532', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 }}
                                onPress={() => handleToggleCompleteAppointment(appt.id)}
                              >
                                <Ionicons name={appt.completed ? 'refresh' : 'checkmark'} size={13} color={appt.completed ? '#94a3b8' : '#a9dfca'} />
                                <Text style={{ color: appt.completed ? '#94a3b8' : '#a9dfca', fontSize: 11, fontWeight: '600' }}>
                                  {appt.completed ? (language === 'en' ? 'Reopen' : 'Tekrar Aç') : (language === 'en' ? 'Complete' : 'Tamamlandı')}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{ padding: 5 }}
                                onPress={() => handleDeleteAppointment(appt.id)}
                              >
                                <Ionicons name="trash-outline" size={15} color="#ff9696" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}

                    {/* DOKTOR NOTLARI & TALİMATLAR */}
                    <View style={styles.settingGroupHeader}>
                      <Ionicons name="document-text-outline" size={16} color="#a9dfca" />
                      <Text style={styles.settingGroupTitle}>{t.doctorNotesSection}</Text>
                    </View>
                    <View style={styles.settingCard}>
                      <View style={[styles.profileInputRow, { height: 'auto', minHeight: 90, alignItems: 'flex-start', paddingVertical: 10 }]}>
                        <Ionicons name="reader-outline" size={16} color="#a9dfca" style={{ marginRight: 8, marginTop: 4 }} />
                        <TextInput
                          style={[styles.profileInput, { textAlignVertical: 'top', minHeight: 80 }]}
                          value={doctorNotes}
                          onChangeText={setDoctorNotes}
                          placeholder={t.doctorNotesPlaceholder}
                          placeholderTextColor="#5c6e80"
                          multiline
                          numberOfLines={4}
                          onBlur={() => syncProfileSettings()}
                        />
                      </View>
                    </View>

                    {/* EYLEMLER: PAYLAŞ & KAYDET */}
                    <View style={{ marginBottom: 30, gap: 10 }}>
                      <TouchableOpacity
                        style={[styles.profileActionBtn, styles.profileShareBtn]}
                        onPress={handleShareMedList}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="share-social-outline" size={18} color="#38bdf8" />
                        <Text style={styles.profileShareBtnText}>{t.doctorShareMedList}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.profileActionBtn, styles.profileSaveBtn]}
                        onPress={() => {
                          triggerHaptic();
                          showToast(t.profileSavedToast);
                          syncProfileSettings();
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#34d399" />
                        <Text style={styles.profileSaveBtnText}>
                          {language === 'en' ? 'Save Profile Details' : 'Bilgileri Kaydet'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}

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
                            <Text style={styles.languageDefaultBadgeText}>
                              {language === 'en' ? 'Default' : 'Varsayılan'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.languageOptionSub}>
                          {language === 'en' ? 'App interface and notifications displayed in Turkish' : 'Uygulama arayüzü ve bildirimler Türkçe görüntülenir'}
                        </Text>
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
                    <Text style={styles.settingGroupTitle}>{t.settingsNotifications.toUpperCase()}</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Notifications' : 'Bildirimler'}</Text>
                        <Text style={styles.settingSub}>{language === 'en' ? 'System reminders at dose times' : 'Doz zamanında sistem hatırlatıcıları'}</Text>
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
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Notification Sound' : 'Bildirim Sesi'}</Text>
                        <Text style={styles.settingSub}>{language === 'en' ? 'Play audible alert for dose reminders' : 'Doz hatırlatıcılarında sesli uyarı çal'}</Text>
                      </View>
                      <Switch
                        value={soundEnabled}
                        onValueChange={val => {
                          triggerHaptic();
                          setSoundEnabled(val);
                          showToast(val ? (language === 'en' ? '🔊 Notification sound turned on' : '🔊 Bildirim sesi açıldı') : (language === 'en' ? '🔕 Notification sound turned off (Silent mode)' : '🔕 Bildirim sesi kapatıldı (Sessiz mod)'));
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    {/* Ses Türü Seçenekleri */}
                    {soundEnabled && (
                      <View style={styles.soundSection}>
                        <View style={styles.soundSectionHeader}>
                          <Text style={styles.soundSectionTitle}>{language === 'en' ? 'SOUND & MELODY TYPE' : 'SES VE MELODİ TÜRÜ'}</Text>
                          <TouchableOpacity
                            style={styles.testSoundHeaderBtn}
                            onPress={() => {
                              triggerHaptic();
                              playTestSound(soundType, soundEnabled);
                              showToast(language === 'en' ? '🔊 Playing sound preview...' : '🔊 Bildirim sesi önizlemesi çalınıyor...');
                            }}
                          >
                            <Ionicons name="volume-high-outline" size={13} color="#a9dfca" />
                            <Text style={styles.testSoundHeaderBtnText}>{language === 'en' ? 'Play Sound' : 'Sesi Dinle'}</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.soundOptionsList}>
                          {SOUND_PROFILE_OPTIONS.map(opt => {
                            const isSelected = soundType === opt.id;
                            const soundInfo = getSoundProfileInfo(opt.id);
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[styles.soundOptionCard, isSelected && styles.soundOptionCardActive]}
                                onPress={() => {
                                  triggerHaptic();
                                  setSoundType(opt.id);
                                  playTestSound(opt.id, true);
                                  showToast(`🎵 ${soundInfo.title} ${language === 'en' ? 'selected' : 'seçildi'}`);
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
                                      {soundInfo.title}
                                    </Text>
                                    <View style={[styles.soundOptionBadge, isSelected && styles.soundOptionBadgeActive]}>
                                      <Text style={[styles.soundOptionBadgeText, isSelected && styles.soundOptionBadgeTextActive]}>
                                        {soundInfo.badge}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={styles.soundOptionSub}>{soundInfo.description}</Text>
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
                            showToast(language === 'en' ? '📱 Opening device sound settings...' : '📱 Cihaz ses ayarları açılıyor...');
                            await openChannelNotificationSettings(targetChannel);
                          }}
                        >
                          <View style={styles.deviceSoundActionIcon}>
                            <Ionicons name="phone-portrait-outline" size={20} color="#081624" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.deviceSoundActionTitle}>
                              {language === 'en' ? 'Select Custom Device Sound' : 'Cihazdan Özel Bildirim Sesi Seç'}
                            </Text>
                            <Text style={styles.deviceSoundActionSub}>
                              {language === 'en'
                                ? 'Open Android system screen to select one of your device ringtones'
                                : 'Android sistem ekranını açarak telefonunuzdaki dahili bildirim seslerinden birini seçin'}
                            </Text>
                          </View>
                          <Ionicons name="open-outline" size={18} color="#a9dfca" />
                        </TouchableOpacity>

                        <View style={styles.deviceSoundTipCard}>
                          <Ionicons name="information-circle-outline" size={16} color="#a9dfca" style={{ marginTop: 1 }} />
                          <Text style={styles.deviceSoundTipText}>
                            {language === 'en'
                              ? 'Tip: Tap the button above and select "Sound" on the Android screen to assign Samsung, Xiaomi, Pixel, or your own custom ringtone to this channel.'
                              : 'İpucu: Yukarıdaki butona dokunduğunuzda açılan Android ekranında "Ses" (Sound) seçeneğine tıklayarak telefonunuzdaki Samsung, Xiaomi, Pixel veya kendi yüklediğiniz zil seslerinden birini doğrudan bu kanala atayabilirsiniz.'}
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
                    <Text style={styles.settingGroupTitle}>{t.settingsReminders.toUpperCase()}</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Default Snooze Duration' : 'Varsayılan Erteleme Süresi'}</Text>
                        <View style={styles.selectedPillBadge}>
                          <Text style={styles.selectedPillBadgeText}>{snoozeMinutes} {language === 'en' ? 'Minutes' : 'Dakika'}</Text>
                        </View>
                      </View>
                      <Text style={styles.settingSub}>{language === 'en' ? 'Duration of snooze button in notifications' : 'Bildirimlerdeki erteleme butonunun süresi'}</Text>
                      <View style={styles.chipSelector}>
                        {SNOOZE_OPTIONS.map(mins => (
                          <TouchableOpacity
                            key={mins}
                            style={[styles.choiceChip, snoozeMinutes === mins && styles.choiceChipActive]}
                            onPress={() => {
                              triggerHaptic();
                              setSnoozeMinutes(mins);
                              showToast(language === 'en' ? `Snooze duration set to ${mins} minutes` : `Erteleme süresi ${mins} dakika yapıldı`);
                            }}
                          >
                            <Text style={[styles.choiceChipText, snoozeMinutes === mins && styles.choiceChipTextActive]}>
                              {mins} {language === 'en' ? 'min' : 'dk'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.settingDivider} />

                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Pre-Reminder (Early Alert)' : 'Ön Bildirim (Erken Uyarı)'}</Text>
                        <View style={styles.selectedPillBadge}>
                          <Text style={styles.selectedPillBadgeText}>
                            {getLeadTimeLabel(leadTimeMinutes)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.settingSub}>{language === 'en' ? 'Minutes before dose time to send a preparation alert' : 'Doz vaktinden kaç dakika önce hazırlık uyarısı verilsin?'}</Text>
                      <View style={styles.chipSelector}>
                        {LEAD_TIME_OPTIONS.map(opt => (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.choiceChip, leadTimeMinutes === opt.value && styles.choiceChipActive]}
                            onPress={() => {
                              triggerHaptic();
                              setLeadTimeMinutes(opt.value);
                              showToast(language === 'en' ? `Pre-reminder: ${getLeadTimeLabel(opt.value)}` : `Ön bildirim: ${opt.label}`);
                            }}
                          >
                            <Text style={[styles.choiceChipText, leadTimeMinutes === opt.value && styles.choiceChipTextActive]}>
                              {getLeadTimeLabel(opt.value)}
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
                          <Text style={styles.settingTitle}>{language === 'en' ? 'Persistent 3-Min Repeat Alert' : '3 Dakikada Bir Tekrar Uyarısı'}</Text>
                          <Text style={styles.settingSub}>
                            {language === 'en'
                              ? 'Sends persistent reminders every 3 minutes until dose is confirmed'
                              : 'İlaç onaylanana (içilene) kadar her 3 dakikada bir ısrarcı bildirim gönderir'}
                          </Text>
                        </View>
                        <Switch
                          value={repeatNagEnabled}
                          onValueChange={val => {
                            triggerHaptic();
                            setRepeatNagEnabled(val);
                            showToast(val ? (language === 'en' ? '3-minute persistent repeat enabled' : '3 dakikada bir ısrarcı bildirim açıldı') : (language === 'en' ? 'Repeat reminders disabled' : 'Tekrar bildirimleri kapatıldı'));
                          }}
                          trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                        />
                      </View>

                      {repeatNagEnabled && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={[styles.settingSub, { marginBottom: 6 }]}>{language === 'en' ? 'Maximum Repeat Count:' : 'Maksimum Tekrar Sayısı:'}</Text>
                          <View style={styles.chipSelector}>
                            {[
                              { count: 3, label: language === 'en' ? '3 Repeats (9 min)' : '3 Tekrar (9 dk)' },
                              { count: 5, label: language === 'en' ? '5 Repeats (15 min)' : '5 Tekrar (15 dk)' },
                              { count: 10, label: language === 'en' ? '10 Repeats (30 min)' : '10 Tekrar (30 dk)' },
                            ].map(opt => (
                              <TouchableOpacity
                                key={opt.count}
                                style={[styles.choiceChip, repeatNagCount === opt.count && styles.choiceChipActive]}
                                onPress={() => {
                                  triggerHaptic();
                                  setRepeatNagCount(opt.count);
                                  showToast(language === 'en' ? `Repeat alert: ${opt.label}` : `Tekrar uyarısı: ${opt.label}`);
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
                    <Text style={styles.settingGroupTitle}>{t.settingsReliability.toUpperCase()}</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View style={styles.reliabilityHeaderRow}>
                      <View style={batteryExemptionEnabled && exactAlarmEnabled ? styles.reliabilityBadgeActive : [styles.reliabilityBadgeActive, { backgroundColor: '#2d2516', borderColor: '#59441f' }]}>
                        <View style={[styles.reliabilityBadgeDot, (!batteryExemptionEnabled || !exactAlarmEnabled) && { backgroundColor: '#f0b484' }]} />
                        <Text style={[styles.reliabilityBadgeActiveText, (!batteryExemptionEnabled || !exactAlarmEnabled) && { color: '#f0b484' }]}>
                          {language === 'en'
                            ? (batteryExemptionEnabled && exactAlarmEnabled ? 'Full Background Protection' : 'Partial Protection')
                            : (batteryExemptionEnabled && exactAlarmEnabled ? 'Arka Plan Koruması Tam' : 'Kısmi Koruma')}
                        </Text>
                      </View>
                      <Text style={styles.reliabilityVersionText}>{language === 'en' ? 'Android 14+ / iOS Compatible' : 'Android 14+ / iOS Uyumlu'}</Text>
                    </View>

                    {/* 1. Pil Optimizasyonu Muafiyeti (Doze Mode) */}
                    <View style={styles.reliabilityItem}>
                      <View style={styles.reliabilityItemIconWrap}>
                        <Ionicons name="battery-charging" size={18} color="#a9dfca" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Battery Optimization Exemption' : 'Pil Optimizasyonu Muafiyeti'}</Text>
                        <Text style={styles.settingSub}>
                          {language === 'en'
                            ? 'Prevents alarms from being delayed or missed when phone is in deep sleep (Doze)'
                            : 'Telefon Doze (derin uyku) modundayken alarmların gecikmesini veya atlanmasını engeller'}
                        </Text>
                      </View>
                      <Switch
                        value={batteryExemptionEnabled}
                        onValueChange={async (val) => {
                          triggerHaptic();
                          setBatteryExemptionEnabled(val);
                          if (val) {
                            const ok = await openBatteryOptimizationSettings();
                            if (ok) showToast(language === 'en' ? '⚡ Battery settings opened. Select "No restrictions".' : '⚡ Pil ayarları açıldı. "Kısıtlama Yok" seçiniz.');
                          } else {
                            showToast(language === 'en' ? 'Battery exemption disabled (Standard mode)' : 'Pil muafiyeti kapatıldı (Standart mod)');
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
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Exact Alarm Permission' : 'Hassas Alarm İzni (Exact Alarm)'}</Text>
                        <Text style={styles.settingSub}>
                          {language === 'en'
                            ? 'System permission for timers to fire precisely on the second with high priority'
                            : 'İlaç zamanlayıcılarının saniyesi saniyesine ve yüksek öncelikli çalması için sistem alarm izni'}
                        </Text>
                      </View>
                      <Switch
                        value={exactAlarmEnabled}
                        onValueChange={async (val) => {
                          triggerHaptic();
                          setExactAlarmEnabled(val);
                          if (val) {
                            const ok = await openExactAlarmSettings();
                            if (ok) showToast(language === 'en' ? '⏰ Alarm permissions opened.' : '⏰ Alarm izinleri açıldı.');
                          } else {
                            showToast(language === 'en' ? 'Exact alarm disabled' : 'Hassas alarm kapatıldı');
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
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Auto Reschedule on Reboot (Boot)' : 'Yeniden Başlatma Koruması (Boot)'}</Text>
                        <Text style={styles.settingSub}>
                          {language === 'en'
                            ? 'When the phone restarts, all active daily medication alarms are automatically restored'
                            : 'Telefon kapatılıp açıldığında aktif tüm günlük ilaç alarmları işletim sistemince otomatik baştan kurulur'}
                        </Text>
                      </View>
                      <Switch
                        value={autoRescheduleOnBoot}
                        onValueChange={(val) => {
                          triggerHaptic();
                          setAutoRescheduleOnBoot(val);
                          showToast(val ? (language === 'en' ? '🔄 Reboot protection active' : '🔄 Yeniden başlatma koruması devrede') : (language === 'en' ? 'Reboot protection disabled' : 'Yeniden başlatma koruması kapatıldı'));
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
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Wake Screen on Alarm' : 'Ekran Kapalıyken Uyandır'}</Text>
                        <Text style={styles.settingSub}>
                          {language === 'en'
                            ? 'If phone is locked at alarm time, lights up screen and displays full-screen alert'
                            : 'Alarm saatinde telefon kilitliyse ekranı aydınlatıp tam ekran ilaç uyarısını gösterir'}
                        </Text>
                      </View>
                      <Switch
                        value={wakeScreenOnAlarm}
                        onValueChange={(val) => {
                          triggerHaptic();
                          setWakeScreenOnAlarm(val);
                          showToast(val ? (language === 'en' ? '💡 Screen wake active' : '💡 Ekran uyandırma aktif') : (language === 'en' ? 'Screen wake disabled' : 'Ekran uyandırma kapatıldı'));
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
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Manufacturer Background Settings' : 'Üretici Arka Plan Ayarları'}</Text>
                        <Text style={styles.settingSub}>
                          {language === 'en'
                            ? 'On Xiaomi (MIUI/HyperOS), Samsung (OneUI), or Huawei devices, grant "Auto-start" and unrestricted background'
                            : 'Xiaomi (MIUI/HyperOS), Samsung (OneUI) veya Huawei cihazlarda "Otomatik Başlatma" ve kısıtlamasız arka plan izni verin'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reliabilityActionBtn}
                        onPress={async () => {
                          triggerHaptic();
                          const ok = await openChannelNotificationSettings();
                          if (ok) showToast(language === 'en' ? '⚙️ Device and notification permissions opened.' : '⚙️ Cihaz ve bildirim izinleri açıldı.');
                        }}
                      >
                        <Text style={styles.reliabilityActionBtnText}>{language === 'en' ? 'Open Settings' : 'İzinleri Aç'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 6. Canlı Alarm & Titreşim Testi */}
                    <TouchableOpacity
                      style={styles.reliabilityTestBtn}
                      onPress={() => {
                        triggerHaptic();
                        showToast(language === 'en' ? '⏱️ Test alarm will sound in 5 seconds! You can lock your phone to test.' : '⏱️ 5 saniye sonra test alarmı çalacak! Telefonu kilitleyip deneyebilirsiniz.');
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
                      <Text style={styles.reliabilityTestBtnText}>{language === 'en' ? 'Test Live Alarm in 5s (Lock Screen)' : '5 Sn Sonra Canlı Alarmı Test Et (Kilit Ekranı)'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* SUB PAGE 5: STOK VE ENVANTER */}
              {settingsSubPage === 'stock' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="cube-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>{t.settingsStock.toUpperCase()}</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Default Low Stock Alert Threshold' : 'Varsayılan Kritik Stok Eşiği'}</Text>
                        <View style={styles.selectedPillBadge}>
                          <Text style={styles.selectedPillBadgeText}>{defaultStockThreshold} {language === 'en' ? 'Doses' : 'Doz'}</Text>
                        </View>
                      </View>
                      <Text style={styles.settingSub}>
                        {language === 'en' ? 'Low stock alert is shown when medication count falls below this threshold' : 'İlaç miktarı bu sayının altına inince eczane uyarısı verilir'}
                      </Text>
                      <View style={styles.chipSelector}>
                        {STOCK_THRESHOLD_OPTIONS.map(thresholdVal => (
                          <TouchableOpacity
                            key={thresholdVal}
                            style={[styles.choiceChip, defaultStockThreshold === thresholdVal && styles.choiceChipActive]}
                            onPress={() => {
                              triggerHaptic();
                              setDefaultStockThreshold(thresholdVal);
                              showToast(language === 'en' ? `Low stock alert threshold set to ${thresholdVal} doses` : `Kritik stok eşiği ${thresholdVal} doz olarak ayarlandı`);
                            }}
                          >
                            <Text style={[styles.choiceChipText, defaultStockThreshold === thresholdVal && styles.choiceChipTextActive]}>
                              {thresholdVal} {language === 'en' ? 'Doses' : 'Doz'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Low Stock Notification' : 'Kritik Stok Bildirimi'}</Text>
                        <Text style={styles.settingSub}>{language === 'en' ? 'Show device notification when stock runs low' : 'İlaç azaldığında cihaz uyarısı göster'}</Text>
                      </View>
                      <Switch
                        value={stockAlertsEnabled}
                        onValueChange={val => {
                          triggerHaptic();
                          setStockAlertsEnabled(val);
                          showToast(val ? (language === 'en' ? 'Stock alerts enabled' : 'Stok uyarıları açıldı') : (language === 'en' ? 'Stock alerts disabled' : 'Stok uyarıları kapatıldı'));
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
                    <Text style={styles.settingGroupTitle}>{t.settingsPrivacy.toUpperCase()}</Text>
                  </View>
                  <View style={styles.settingCard}>
                    <View style={styles.settingRow}>
                      <View>
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Hide Medication Name' : 'İlaç Adını Gizle'}</Text>
                        <Text style={styles.settingSub}>{language === 'en' ? 'Hide medication name on lock screen notifications' : 'Kilit ekranında ilacın adını sakla'}</Text>
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
                        <Text style={styles.settingTitle}>{language === 'en' ? 'Hide Dose Amount' : 'Doz Miktarını Gizle'}</Text>
                        <Text style={styles.settingSub}>{language === 'en' ? 'Hide quantity/unit details on lock screen' : 'Kilit ekranında kaç tablet/damla olduğu bilgisini sakla'}</Text>
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
                        <Text style={styles.notifPreviewTag}>{language === 'en' ? 'LOCK SCREEN NOTIFICATION PREVIEW' : 'KİLİT EKRANI BİLDİRİM ÖNİZLEMESİ'}</Text>
                        <View style={styles.previewSoundBadge}>
                          <Ionicons
                            name={soundEnabled && soundType !== 'silent' ? 'volume-medium' : 'volume-mute'}
                            size={12}
                            color={soundEnabled && soundType !== 'silent' ? '#a9dfca' : '#adb3bf'}
                          />
                          <Text style={styles.previewSoundBadgeText}>
                            {soundEnabled && soundType !== 'silent'
                              ? (soundType === 'alarm'
                                  ? (language === 'en' ? 'Alarm Tone' : 'Alarm Sesi')
                                  : soundType === 'gentle'
                                  ? (language === 'en' ? 'Gentle Tone' : 'Kibar Ton')
                                  : soundType === 'chime'
                                  ? (language === 'en' ? 'Crystal Chime' : 'Kristal Zil')
                                  : soundType === 'system_custom'
                                  ? (language === 'en' ? 'Device Sound' : 'Cihaz Sesi')
                                  : (language === 'en' ? 'System Sound' : 'Sistem Sesi'))
                              : (language === 'en' ? 'Silent' : 'Sessiz')}
                          </Text>
                        </View>
                      </View>
                      {(() => {
                        const sampleDose = doses[0] ?? {
                          id: 999,
                          name: language === 'en' ? 'Sample Medication' : 'Örnek İlaç',
                          amount: '1 tablet',
                          time: '09:00',
                          mealCondition: 'tok',
                          instructions: language === 'en' ? 'Take according to directions.' : 'Kullanım talimatına göre alınız.',
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
                                {notifications ? previewContent.title : (language === 'en' ? 'Reminders Off' : 'Hatırlatıcılar Kapalı')}
                              </Text>
                              <Text style={styles.notifPreviewBody}>
                                {notifications ? previewContent.body : (language === 'en' ? 'Dose notifications are currently turned off.' : 'Doz bildirimleri kapalı durumdadır.')}
                              </Text>
                              {notifications && repeatNagEnabled && (
                                <View style={styles.notifRepeatNagBadge}>
                                  <Ionicons name="repeat" size={12} color="#a9dfca" />
                                  <Text style={styles.notifRepeatNagBadgeText}>
                                    {language === 'en'
                                      ? `Repeats every 3 min until confirmed (${repeatNagCount} repeats)`
                                      : `Onaylanmazsa her 3 dk tekrarlanır (${repeatNagCount} tekrar)`}
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
                        showToast(language === 'en' ? '🔔 Test notification scheduled! It will arrive in 3 seconds.' : '🔔 Test bildirimi zamanlandı! 3 saniye sonra bildirim inecek.');
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
                      <Text style={styles.testNotificationBtnText}>{language === 'en' ? 'Send Test Notification in 3s' : '3 Sn Sonra Test Bildirimi Gönder'}</Text>
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
                          showToast(val
                            ? (language === 'en' ? 'Haptic feedback enabled' : 'Titreşimli geri bildirim açıldı')
                            : (language === 'en' ? 'Haptic feedback disabled' : 'Titreşim kapatıldı'));
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.settingTitle}>
                          {language === 'en' ? 'Upcoming Appointments Card' : 'Yaklaşan Randevu Kartı'}
                        </Text>
                        <Text style={styles.settingSub}>
                          {language === 'en'
                            ? 'Show upcoming appointment reminders on Today tab'
                            : 'Bugün sekmesinde yaklaşan randevu kartını göster'}
                        </Text>
                      </View>
                      <Switch
                        value={showAppointmentCard}
                        onValueChange={val => {
                          triggerHaptic();
                          setShowAppointmentCard(val);
                          showToast(val
                            ? (language === 'en' ? 'Appointment card enabled' : 'Randevu kartı açıldı')
                            : (language === 'en' ? 'Appointment card hidden' : 'Randevu kartı gizlendi'));
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
                    <Text style={[styles.settingGroupTitle, { color: '#38bdf8' }]}>
                      {language === 'en' ? 'CLOUD SYNCHRONIZATION' : 'BULUT EŞİTLEME (SENKRONİZASYON)'}
                    </Text>
                  </View>

                  <View style={styles.syncCard}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#071626',
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 8,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: '#1e293b',
                      gap: 8
                    }}>
                      <Ionicons name="cloud-done-outline" size={15} color="#38bdf8" />
                      <Text style={{ color: '#94a3b8', fontSize: 11, flex: 1 }}>
                        {language === 'en' ? 'Server: ' : 'Sunucu: '}
                        <Text style={{ color: '#38bdf8', fontWeight: '700' }}>Rutin Cloud (Cloudflare & Turso)</Text>
                      </Text>
                    </View>

                    <Text style={styles.syncCardDesc}>
                      {language === 'en'
                        ? 'Synchronize your data bi-directionally (Smart Merge) and securely across your devices.'
                        : 'Verilerinizi cihazlarınız arasında çift yönlü ve güvenli (Smart Merge) senkronize edin.'}
                    </Text>

                    {session ? (
                      <View>
                        <Text style={styles.syncCardDesc}>{t.syncConnectedAccount}: <Text style={{ color: '#34d399', fontWeight: '700' }}>{session.user.name}</Text></Text>
                        
                        <View style={{ backgroundColor: '#071626', padding: 10, borderRadius: 8, marginVertical: 6, borderWidth: 1, borderColor: '#1e293b' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                              ✉️ {t.syncEmailLabel}: <Text style={{ color: session.user.email ? '#38bdf8' : '#64748b', fontWeight: '600' }}>{session.user.email || (language === 'en' ? 'Not set' : 'Belirtilmedi')}</Text>
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setAuthEmail(session.user.email || '');
                                setEditingEmail(!editingEmail);
                              }}
                              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                            >
                              <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>
                                {editingEmail ? t.cancel : (session.user.email ? (language === 'en' ? 'Edit' : 'Değiştir') : (language === 'en' ? '+ Add' : '+ Ekle'))}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {editingEmail && (
                            <View style={{ marginTop: 8, gap: 6 }}>
                              <TextInput
                                style={[styles.textInput, { height: 38, fontSize: 12 }]}
                                value={authEmail}
                                onChangeText={setAuthEmail}
                                placeholder={t.syncEmailPlaceholder}
                                placeholderTextColor="#667"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoCorrect={false}
                              />
                              <TouchableOpacity
                                style={[styles.syncPrimaryBtn, { height: 36, marginTop: 4 }]}
                                onPress={handleUpdateEmail}
                                disabled={authBusy || !authEmail.trim()}
                              >
                                <Text style={[styles.syncPrimaryBtnText, { fontSize: 12 }]}>
                                  {authBusy ? '...' : t.syncUpdateEmail}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                        
                        {activeSyncCode && (
                          <View style={{ backgroundColor: '#071626', padding: 12, borderRadius: 8, marginVertical: 10, borderWidth: 1, borderColor: '#1e293b' }}>
                            <Text style={{ color: '#a9dfca', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                              {language === 'en' ? '📱 SYNC CODE FOR 2ND DEVICE:' : '📱 2. CİHAZ İÇİN EŞİTLEME KODUNUZ:'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#030c14', padding: 8, borderRadius: 6, gap: 8 }}>
                              <Text selectable style={{ color: '#f8fafc', fontSize: 11, flex: 1 }}>
                                {activeSyncCode}
                              </Text>
                              <TouchableOpacity
                                style={{ backgroundColor: '#38bdf8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 }}
                                onPress={() => Share.share({ message: language === 'en' ? `Reminder Sync Code: ${activeSyncCode}` : `Reminder Eşitleme Kodu: ${activeSyncCode}` })}
                              >
                                <Text style={{ color: '#04101e', fontSize: 11, fontWeight: '700' }}>{t.share}</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>
                              {language === 'en'
                                ? 'Enter this code on your second phone to link to the same account instantly.'
                                : 'İkinci telefonunuza bu kodu girerek aynı hesaba anında bağlayabilirsiniz.'}
                            </Text>
                          </View>
                        )}

                        <TouchableOpacity style={styles.syncSecondaryBtn} onPress={handleLogout} disabled={authBusy || syncStatus === 'syncing'}>
                          <Text style={styles.syncSecondaryBtnText}>{t.syncDisconnect}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : recoveryMode ? (
                      <View style={{ gap: 8 }}>
                        <Text style={styles.inputLabel}>{t.syncRecoveryKeyLabel}</Text>
                        <TextInput
                          style={styles.textInput}
                          value={recoveryKey}
                          onChangeText={setRecoveryKey}
                          placeholder={t.syncRecoveryKeyPlaceholder}
                          placeholderTextColor="#667"
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.syncPrimaryBtn, { flex: 1 }]}
                            onPress={handleRecover}
                            disabled={authBusy || !recoveryKey.trim()}
                          >
                            <Text style={styles.syncPrimaryBtnText}>
                              {authBusy ? (language === 'en' ? 'Recovering…' : 'Kurtarılıyor…') : t.syncRecoverBtn}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.syncSecondaryBtn}
                            onPress={() => { setRecoveryMode(false); setRecoveryKey(''); }}
                            disabled={authBusy}
                          >
                            <Text style={styles.syncSecondaryBtnText}>{t.cancel}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View>
                        <View style={{ backgroundColor: '#071b2e', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#38bdf8', marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Ionicons name="sparkles" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '700' }}>
                              {language === 'en' ? 'INITIAL SETUP (DEVICE 1)' : 'İLK KURULUM (1. CİHAZ)'}
                            </Text>
                          </View>
                          <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
                            {language === 'en'
                              ? 'Enter your email (optional) and generate a new sync code.'
                              : 'E-posta adresinizi girin ve yeni bir eşitleme kodu oluşturarak başlayın.'}
                          </Text>
                          <View style={{ marginBottom: 10 }}>
                            <Text style={[styles.inputLabel, { fontSize: 11, marginBottom: 4 }]}>{t.syncEmailLabel}</Text>
                            <TextInput
                              style={[styles.textInput, { height: 40, fontSize: 12 }]}
                              value={authEmail}
                              onChangeText={setAuthEmail}
                              placeholder={t.syncEmailPlaceholder}
                              placeholderTextColor="#667"
                              autoCapitalize="none"
                              keyboardType="email-address"
                              autoCorrect={false}
                            />
                          </View>
                          <TouchableOpacity
                            style={[styles.syncPrimaryBtn, { marginTop: 0 }]}
                            onPress={handleRegister}
                            disabled={authBusy}
                          >
                            <Ionicons name="key-outline" size={16} color="#081624" />
                            <Text style={styles.syncPrimaryBtnText}>
                              {authBusy
                                ? (language === 'en' ? 'Creating…' : 'Oluşturuluyor…')
                                : (language === 'en' ? '✨ Generate New Sync Code' : '✨ Yeni Eşitleme Kodu Oluştur')}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
                          <View style={{ flex: 1, height: 1, backgroundColor: '#1e293b' }} />
                          <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', marginHorizontal: 10 }}>
                            {language === 'en' ? 'OR CONNECT 2ND DEVICE' : 'VEYA 2. CİHAZI BAĞLA'}
                          </Text>
                          <View style={{ flex: 1, height: 1, backgroundColor: '#1e293b' }} />
                        </View>

                        <View style={{ gap: 8 }}>
                          <Text style={styles.inputLabel}>{t.syncCodeLabel}</Text>
                          <TextInput
                            style={styles.textInput}
                            value={syncCode}
                            onChangeText={setSyncCode}
                            placeholder={language === 'en' ? 'Enter code from 1st device here' : '1. cihazdaki kodu buraya girin'}
                            placeholderTextColor="#667"
                            autoCapitalize="none"
                            autoCorrect={false}
                            secureTextEntry
                          />
                          <TouchableOpacity
                            style={styles.syncPrimaryBtn}
                            onPress={handleLogin}
                            disabled={authBusy || !syncCode.trim()}
                          >
                            <Text style={styles.syncPrimaryBtnText}>
                              {authBusy ? (language === 'en' ? 'Connecting…' : 'Bağlanıyor…') : t.syncConnectBtn}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ paddingVertical: 6 }}
                            onPress={() => setRecoveryMode(true)}
                            disabled={authBusy}
                          >
                            <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '500' }}>🔑 {t.syncForgotCode}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {recoveredCredentials && (
                      <View style={{
                        backgroundColor: '#0c2238',
                        borderColor: '#38bdf8',
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 12,
                        marginTop: 12
                      }}>
                        <Text style={{ color: '#38bdf8', fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                          {t.syncNewCredentialsTitle}
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>
                          {t.syncNewCredentialsWarning}
                        </Text>
                        <View style={{ marginBottom: 8 }}>
                          <Text style={{ color: '#a9dfca', fontSize: 12, fontWeight: '600', marginBottom: 2 }}>
                            {t.syncNewSyncCode}
                          </Text>
                          <View style={{
                            backgroundColor: '#071626',
                            padding: 8,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <Text selectable style={{ color: '#f1f5f9', fontSize: 11, flex: 1, marginRight: 8 }}>
                              {recoveredCredentials.syncCode}
                            </Text>
                            <TouchableOpacity
                              style={{ backgroundColor: '#38bdf8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                              onPress={() => {
                                Share.share({
                                  message: language === 'en'
                                    ? `Sync Code: ${recoveredCredentials.syncCode}`
                                    : `Eşitleme Kodu: ${recoveredCredentials.syncCode}`
                                });
                              }}
                            >
                              <Text style={{ color: '#04101e', fontSize: 11, fontWeight: '700' }}>{t.share}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ color: '#a9dfca', fontSize: 12, fontWeight: '600', marginBottom: 2 }}>
                            {t.syncNewRecoveryKey}
                          </Text>
                          <View style={{
                            backgroundColor: '#071626',
                            padding: 8,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <Text selectable style={{ color: '#f1f5f9', fontSize: 11, letterSpacing: 1, flex: 1, marginRight: 8 }}>
                              {recoveredCredentials.recoveryKey}
                            </Text>
                            <TouchableOpacity
                              style={{ backgroundColor: '#38bdf8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                              onPress={() => {
                                Share.share({
                                  message: language === 'en'
                                    ? `Recovery Key: ${recoveredCredentials.recoveryKey}`
                                    : `Kurtarma Anahtarı: ${recoveredCredentials.recoveryKey}`
                                });
                              }}
                            >
                              <Text style={{ color: '#04101e', fontSize: 11, fontWeight: '700' }}>{t.share}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.syncPrimaryBtn, { marginTop: 0 }]}
                          onPress={() => setRecoveredCredentials(null)}
                        >
                          <Text style={styles.syncPrimaryBtnText}>{language === 'en' ? 'Done' : 'Tamam'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

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
                        disabled={authBusy || syncStatus === 'testing' || syncStatus === 'syncing'}
                      >
                        <Ionicons name="wifi-outline" size={16} color="#a9dfca" />
                        <Text style={styles.syncSecondaryBtnText}>
                          {syncStatus === 'testing'
                            ? (language === 'en' ? 'Connecting...' : 'Bağlanıyor...')
                            : (language === 'en' ? 'Test Connection' : 'Bağlantıyı Test Et')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.syncPrimaryBtn}
                        onPress={handleSyncNow}
                        disabled={!session || authBusy || syncStatus === 'testing' || syncStatus === 'syncing'}
                      >
                        <Ionicons name="sync-outline" size={16} color="#081624" />
                        <Text style={styles.syncPrimaryBtnText}>
                          {syncStatus === 'syncing'
                            ? (language === 'en' ? 'Syncing...' : 'Eşitleniyor...')
                            : (language === 'en' ? 'Sync Now' : 'Şimdi Eşitle')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="options-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>
                      {language === 'en' ? 'AUTO SYNC' : 'OTOMATİK EŞİTLEME'}
                    </Text>
                  </View>

                  <View style={styles.settingCard}>
                    <View style={styles.settingRow}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.settingTitle}>
                          {language === 'en' ? 'Automatic Synchronization' : 'Otomatik Senkronizasyon'}
                        </Text>
                        <Text style={styles.settingSub}>
                          {language === 'en' ? 'Use Sync Now button for now' : 'Şimdilik Şimdi Eşitle düğmesini kullanın'}
                        </Text>
                      </View>
                      <Switch
                        value={false}
                        disabled
                        onValueChange={val => {
                          triggerHaptic();
                          setAutoSync(val);
                          showToast(val
                            ? (language === 'en' ? 'Automatic sync enabled' : 'Otomatik eşitleme açıldı')
                            : (language === 'en' ? 'Automatic sync disabled' : 'Otomatik eşitleme kapatıldı'));
                        }}
                        trackColor={{ true: '#a9dfca', false: '#3a4655' }}
                      />
                    </View>
                    {lastSyncAt && (
                      <View style={styles.settingDivider}>
                        <Text style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 8 }}>
                          {language === 'en' ? '🕒 Last successful sync: ' : '🕒 Son başarılı eşitleme: '}{lastSyncAt}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="save-outline" size={16} color="#a9dfca" />
                    <Text style={styles.settingGroupTitle}>
                      {language === 'en' ? 'OFFLINE JSON BACKUP' : 'ÇEVRİMDIŞI JSON YEDEKLEME'}
                    </Text>
                  </View>

                  <View style={styles.syncCard}>
                    <Text style={styles.syncCardDesc}>
                      {language === 'en'
                        ? 'Even without a server, you can export and backup all your medications, history, and settings as a .json file on your phone.'
                        : 'Sunucunuz olmasa dahi telefonunuzdaki tüm ilaçları, kullanım geçmişini ve ayarları .json dosyası olarak telefonunuza kaydedebilir veya geri yükleyebilirsiniz.'}
                    </Text>

                    <TouchableOpacity style={styles.backupExportBtn} onPress={handleExportBackup}>
                      <Ionicons name="download-outline" size={18} color="#a9dfca" />
                      <Text style={styles.backupExportBtnText}>
                        {language === 'en' ? 'Export Backup (.json)' : 'Yedeği Dışa Aktar (.json)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* SUB PAGE 9: HATA & TANILAMA GÜNLÜĞÜ */}
              {settingsSubPage === 'diagnostics' && (
                <>
                  <View style={styles.settingGroupHeader}>
                    <Ionicons name="bug-outline" size={16} color="#f0b484" />
                    <Text style={[styles.settingGroupTitle, { color: '#f0b484' }]}>{t.settingsDiagnostics.toUpperCase()}</Text>
                  </View>

                  {/* Summary & Action Card */}
                  <View style={styles.settingCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.settingTitle}>{t.diagHealthStatus}</Text>
                        <Text style={styles.settingSub}>
                          {diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length > 0
                            ? `${diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length} ${t.diagErrorsCount}`
                            : t.diagAllOk}
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
                          {diagnosticsLogs.length} / 100 {t.diagRecordsCount}
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
                              title: language === 'en' ? 'Reminder Health Diagnostics Log' : 'Reminder Health Tanılama Günlüğü',
                              message: text,
                            });
                          } catch (err) {
                            Alert.alert(language === 'en' ? 'Share Failed' : 'Paylaşılamadı', language === 'en' ? 'Could not export logs.' : 'Günlük panoya aktarılamadı.');
                          }
                        }}
                      >
                        <Ionicons name="share-outline" size={16} color="#38bdf8" />
                        <Text style={[styles.diagActionBtnText, { color: '#38bdf8' }]}>{t.diagShareExport}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.diagActionBtn, { backgroundColor: '#2b171a', borderColor: '#522929' }]}
                        onPress={() => {
                          triggerHaptic();
                          Alert.alert(
                            language === 'en' ? 'Clear Logs' : 'Logları Temizle',
                            language === 'en' ? 'Are you sure you want to delete all diagnostic and error logs?' : 'Tüm hata ve tanılama kayıtları silinsin mi?',
                            [
                              { text: t.cancel, style: 'cancel' },
                              {
                                text: t.clear,
                                style: 'destructive',
                                onPress: () => {
                                  logger.clearLogs();
                                  showToast(language === 'en' ? 'Diagnostics log cleared' : 'Tanılama günlüğü temizlendi');
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ff9696" />
                        <Text style={[styles.diagActionBtnText, { color: '#ff9696' }]}>{t.diagClear}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Test Error Generation */}
                    <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#203244' }}>
                      <Text style={{ fontSize: 11.5, color: '#8e9eaf', marginBottom: 8, fontWeight: '600' }}>
                        {language === 'en' ? 'Error Testing & Diagnostics Simulation:' : 'Hata Test ve Tanılama Simülasyonu:'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.diagTestBtn, { backgroundColor: '#281a13', borderColor: '#573318' }]}
                          onPress={() => {
                            triggerHaptic();
                            logger.warn('Test', 'User simulated test warning.', { source: 'DiagnosticsUI' });
                            showToast(language === 'en' ? '⚠️ Test warning added to log' : '⚠️ Test uyarısı günlüğe eklendi');
                          }}
                        >
                          <Text style={[styles.diagTestBtnText, { color: '#f0b484' }]}>{t.diagSimulateWarn}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.diagTestBtn, { backgroundColor: '#33171a', borderColor: '#66282e' }]}
                          onPress={() => {
                            triggerHaptic();
                            try {
                              throw new Error('User controlled simulated test error');
                            } catch (e) {
                              logger.error('Test', 'Simulated error caught.', e, { origin: 'ManualTrigger' });
                            }
                            showToast(language === 'en' ? '💥 Test error caught and logged' : '💥 Test hatası yakalandı ve kaydedildi');
                          }}
                        >
                          <Text style={[styles.diagTestBtnText, { color: '#fca5a5' }]}>{t.diagSimulateError}</Text>
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
                            {f === 'ALL' ? t.diagFilterAll : f === 'ERROR' ? t.diagFilterErrors : t.diagFilterWarnings} ({count})
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
                        {t.diagCleanTitle}
                      </Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                        {diagnosticsFilter === 'ALL'
                          ? t.diagCleanDesc
                          : (language === 'en' ? 'No records match the selected filter.' : 'Seçili filtreye uygun kayıt bulunmuyor.')}
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
                                <Text style={{ color: '#68778d', fontSize: 11 }}>
                                  {isExpanded ? (language === 'en' ? 'Hide' : 'Gizle') : (language === 'en' ? 'View Details' : 'Detayları Gör')}
                                </Text>
                                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color="#68778d" />
                              </View>
                            )}

                            {/* Expanded Details */}
                            {isExpanded && (
                              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1c2d3e' }}>
                                {log.details && (
                                  <View style={{ marginBottom: 8 }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', marginBottom: 2 }}>{t.diagDetails}</Text>
                                    <Text style={{ color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}>
                                      {JSON.stringify(log.details, null, 2)}
                                    </Text>
                                  </View>
                                )}

                                {log.breadcrumbs && log.breadcrumbs.length > 0 && (
                                  <View style={{ marginBottom: 8 }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', marginBottom: 3 }}>{t.diagBreadcrumbs}</Text>
                                    {log.breadcrumbs.map((b, bi) => (
                                      <Text key={bi} style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace', marginBottom: 1 }}>
                                        {b}
                                      </Text>
                                    ))}
                                  </View>
                                )}

                                {log.stack && (
                                  <View>
                                    <Text style={{ color: '#fca5a5', fontSize: 10, fontWeight: '700', marginBottom: 2 }}>{t.diagStackTrace}</Text>
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
                    <Text style={[styles.settingGroupTitle, { color: '#ff9696' }]}>
                      {language === 'en' ? 'DATA RESET' : 'VERİLERİ SIFIRLAMA'}
                    </Text>
                  </View>
                  <View style={styles.resetCard}>
                    <Text style={styles.resetCardText}>
                      {language === 'en'
                        ? '⚠️ This action will permanently erase all medications, history, and custom settings from this device and return to initial setup. This cannot be undone.'
                        : '⚠️ Bu işlem tüm ilaç kayıtlarınızı, geçmişinizi ve kişisel ayarlarınızı cihazdan tamamen siler ve ilk kurulum haline döndürür. Bu işlem geri alınamaz.'}
                    </Text>
                    <TouchableOpacity style={styles.resetBtn} onPress={resetAllData}>
                      <Ionicons name="trash-outline" size={18} color="#ff9696" />
                      <Text style={styles.resetBtnText}>
                        {language === 'en' ? 'Reset All Data and Settings' : 'Tüm Verileri ve Ayarları Sıfırla'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={styles.bottomNav}>
          <View style={[styles.bottomNavInner, isTablet && { maxWidth: tabBarMaxWidth, alignSelf: 'center', width: '100%' }]}>
            {[
              { id: 'Bugün' as const, label: t.tabToday, icon: 'calendar' },
              { id: 'İlaçlarım' as const, label: t.tabMedicines, icon: 'medkit' },
              { id: 'Geçmiş' as const, label: t.tabHistory, icon: 'time' },
              { id: 'Ayarlar' as const, label: t.tabSettings, icon: 'settings' },
            ].map(tabItem => (
              <TouchableOpacity
                key={tabItem.id}
                style={styles.navItem}
                onPress={() => handleTabPress(tabItem.id)}
              >
                <Ionicons name={tabItem.icon as any} size={22} color={tab === tabItem.id ? '#a9dfca' : '#adb3bf'} />
                <Text style={[styles.navLabel, tab === tabItem.id && styles.navLabelActive]}>{tabItem.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Toast Notification */}
        {toastText && (
          <View style={styles.toast}>
            <Text style={styles.toastText} numberOfLines={2}>{toastText}</Text>
            {undoAction && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.undo} hitSlop={12} onPress={() => {
                const action = undoAction;
                if (toastTimer.current) clearTimeout(toastTimer.current);
                setToastText(null); setUndoAction(null); action();
              }}>
                <Text style={styles.toastUndo}>{t.undo}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Add / Edit Modal */}
        <Modal visible={editorOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditorOpen(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={[styles.modalHeader, isTablet && { maxWidth: modalMaxWidth, alignSelf: 'center', width: '100%' }]}>
              <TouchableOpacity onPress={() => setEditorOpen(false)}>
                <Ionicons name="close" size={26} color="#f5f3f0" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingId ? t.modalEditTitle : t.modalAddTitle}</Text>
              <TouchableOpacity onPress={saveDose}>
                <Text style={styles.modalSaveBtn}>{t.save}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={[styles.modalContent, isTablet && { maxWidth: modalMaxWidth, alignSelf: 'center', width: '100%' }]}>
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
                  <Text style={styles.scanBarcodeBtnTitle}>{t.scanBarcodeBanner}</Text>
                  <Text style={styles.scanBarcodeBtnSub}>{t.scanBarcodeDesc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#a9dfca" />
              </TouchableOpacity>

              {/* Scanned Barcode Info Badge if available */}
              {currentGTIN && (
                <View style={styles.scannedInfoCard}>
                  <Ionicons name="shield-checkmark" size={16} color="#34d399" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.scannedInfoTitle}>{t.itsMatched}</Text>
                    <Text style={styles.scannedInfoSub}>
                      {language === 'en' ? 'Barcode:' : 'Barkod:'} {currentGTIN} {currentExpiryDate ? `· ${language === 'en' ? 'EXP:' : 'SKT:'} ${currentExpiryDate}` : ''}
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
              <Text style={styles.inputLabel}>{t.medName}</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder={t.medNamePlaceholder}
                placeholderTextColor="#667"
              />

              {/* Amount & Quick Chips */}
              <Text style={styles.inputLabel}>{t.doseAmount}</Text>
              <TextInput
                style={styles.textInput}
                value={amount}
                onChangeText={setAmount}
                placeholder={t.doseAmountPlaceholder}
                placeholderTextColor="#667"
              />
              <View style={styles.quickRow}>
                {['0.5 tablet', '1 tablet', '1.5 tablet', '2 tablet'].map(amt => (
                  <TouchableOpacity key={amt} style={[styles.quickChip, amount === amt && styles.quickChipActive]} onPress={() => setAmount(amt)}>
                    <Text style={[styles.quickChipText, amount === amt && styles.quickChipTextActive]}>{amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form & Meal */}
              <Text style={styles.inputLabel}>{t.medForm}</Text>
              <View style={styles.selectorGrid}>
                {(['tablet', 'kapsul', 'damla', 'surup'] as const).map(f => (
                  <TouchableOpacity key={f} style={[styles.selectorBtn, formType === f && styles.selectorBtnActive]} onPress={() => setFormType(f)}>
                    <Text style={[styles.selectorBtnText, formType === f && styles.selectorBtnTextActive]}>{getFormLabel(f)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>{t.mealCondition}</Text>
              <View style={styles.selectorGrid}>
                {(['tok', 'ac', 'yemekle', 'farketmez'] as const).map(m => (
                  <TouchableOpacity key={m} style={[styles.selectorBtn, mealCondition === m && styles.selectorBtnActive]} onPress={() => setMealCondition(m)}>
                    <Text style={[styles.selectorBtnText, mealCondition === m && styles.selectorBtnTextActive]}>{getMealLabel(m)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Professional Time Selection Section */}
              <View style={styles.timeSectionBox}>
                <View style={styles.timeSectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeSectionTitle}>
                      {language === 'en' ? 'Dose Count & Times on Scheduled Days' : 'Alım Günündeki Doz Sayısı & Saatleri'}
                    </Text>
                    <Text style={styles.timeSectionSub}>
                      {language === 'en' ? 'Use quick meal times or +/- 15 min buttons' : 'Hızlı öğün saatlerini veya +/- 15 dk butonlarını kullanabilirsiniz'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.addSlotMiniBtn} onPress={addDoseSlot}>
                    <Ionicons name="add-circle" size={16} color="#a9dfca" />
                    <Text style={styles.addSlotMiniBtnText}>{t.addTime}</Text>
                  </TouchableOpacity>
                </View>

                {/* Dose count selector chips */}
                <View style={styles.doseCountSelectorRow}>
                  {[
                    { count: 1, label: language === 'en' ? '1 Dose (Single)' : '1 Doz (Tek Sefer)' },
                    { count: 2, label: language === 'en' ? '2 Doses (Morning/Evening)' : '2 Doz (Sabah/Akşam)' },
                    { count: 3, label: language === 'en' ? '3 Doses (3x Daily)' : '3 Doz (Günde 3)' },
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
                  let mealHint = language === 'en' ? 'Morning' : 'Sabah';
                  if (hour >= 5 && hour < 11) mealHint = language === 'en' ? 'Morning' : 'Sabah';
                  else if (hour >= 11 && hour < 16) mealHint = language === 'en' ? 'Noon' : 'Öğle';
                  else if (hour >= 16 && hour < 22) mealHint = language === 'en' ? 'Evening' : 'Akşam';
                  else mealHint = language === 'en' ? 'Night' : 'Gece';

                  return (
                    <View key={idx} style={styles.timeSlotCard}>
                      <View style={styles.timeSlotCardHeader}>
                        <View style={styles.timeSlotBadge}>
                          <Ionicons name="time" size={12} color="#a9dfca" />
                          <Text style={styles.timeSlotBadgeText}>
                            {language === 'en' ? `Dose ${idx + 1} · ${mealHint}` : `${idx + 1}. Doz · ${mealHint}`}
                          </Text>
                        </View>
                        {times.length > 1 && (
                          <TouchableOpacity onPress={() => removeDoseSlot(idx)} style={styles.removeSlotBtn}>
                            <Ionicons name="trash-outline" size={13} color="#ff9696" />
                            <Text style={styles.removeSlotBtnText}>{t.removeTime}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Dual Clock Picker (Numatör & Kolay Fokus) */}
                      <TimeSlotPicker
                        slotTime={slotTime}
                        onChange={val => setSlotTime(idx, val)}
                        onStep={delta => stepSlotMinutes(idx, delta)}
                        lang={language}
                      />

                      {/* Quick Meal Preset Chips */}
                      <View style={styles.slotPresetsRow}>
                        {[
                          { label: language === 'en' ? '08:00 Morning' : '08:00 Sabah', time: '08:00' },
                          { label: language === 'en' ? '13:00 Noon' : '13:00 Öğle', time: '13:00' },
                          { label: language === 'en' ? '19:00 Evening' : '19:00 Akşam', time: '19:00' },
                          { label: language === 'en' ? '22:30 Night' : '22:30 Gece', time: '22:30' },
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

                      {/* Saate Özel Doz Miktarı */}
                      {times.length > 1 && (
                        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1a2836' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={[styles.timeInputLabel, { marginBottom: 0 }]}>{t.slotAmountLabel}</Text>
                            {slotAmounts[slotTime]?.trim() ? (
                              <TouchableOpacity onPress={() => setSlotAmountForTime(slotTime, '')}>
                                <Text style={{ fontSize: 11, color: '#ff9696' }}>{language === 'en' ? 'Reset' : 'Varsayılana Dön'}</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                          <TextInput
                            style={[
                              styles.textInput,
                              {
                                backgroundColor: '#09141f',
                                borderColor: slotAmounts[slotTime]?.trim() ? '#46a382' : '#23374d',
                              },
                            ]}
                            value={slotAmounts[slotTime] ?? ''}
                            onChangeText={val => setSlotAmountForTime(slotTime, val)}
                            placeholder={amount ? `${amount} (${language === 'en' ? 'default' : 'varsayılan'})` : t.slotAmountPlaceholder}
                            placeholderTextColor="#667"
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Schedule & Cycle */}
              <Text style={styles.inputLabel}>
                {language === 'en' ? 'Schedule & Regimen' : 'Kullanım Düzeni & Döngü'}
              </Text>
              <View style={styles.selectorGrid}>
                {[
                  { id: 'everyday' as const, label: t.freqEveryday },
                  { id: 'alternate' as const, label: t.freqAlternate },
                  { id: 'cycle' as const, label: t.freqCycle },
                  { id: 'variable' as const, label: t.freqVariable },
                ].map(opt => (
                  <TouchableOpacity key={opt.id} style={[styles.selectorBtn, frequencyType === opt.id && styles.selectorBtnActive]} onPress={() => setFrequencyType(opt.id)}>
                    <Text style={[styles.selectorBtnText, frequencyType === opt.id && styles.selectorBtnTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cycle config */}
              {frequencyType === 'cycle' && (
                <View style={styles.cycleBox}>
                  <Text style={styles.cycleBoxTitle}>
                    {language === 'en' ? 'Take & Break Cycle' : 'Alım & Ara Verme Döngüsü'}
                  </Text>
                  <View style={styles.presetRow}>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => applyCyclePreset(3, amount, 4, language === 'en' ? '0 (Break)' : '0 (Ara)', 'cycle')}>
                      <Text style={styles.presetBtnText}>
                        {language === 'en' ? '3 days on / 4 days off' : '3 gün al / 4 gün ara'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => applyCyclePreset(5, amount, 2, language === 'en' ? '0 (Break)' : '0 (Ara)', 'cycle')}>
                      <Text style={styles.presetBtnText}>
                        {language === 'en' ? '5 days on / 2 days off' : '5 gün al / 2 gün ara'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.twoColRow}>
                    <View style={styles.col}>
                      <Text style={styles.timeInputLabel}>
                        {language === 'en' ? 'Dose Days' : 'Alım Gün Sayısı'}
                      </Text>
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
                      <Text style={styles.timeInputLabel}>
                        {language === 'en' ? 'Break Days' : 'Ara Gün Sayısı'}
                      </Text>
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
                  <Text style={styles.cycleBoxTitle}>
                    {language === 'en' ? 'Variable / Stepped Dose Cycle' : 'Değişken / Kademeli Doz Döngüsü'}
                  </Text>
                  <View style={styles.presetRow}>
                    <TouchableOpacity style={[styles.presetBtn, styles.presetBtnHighlight]} onPress={() => applyCyclePreset(4, '1.5 tablet', 3, '1 tablet', 'variable')}>
                      <Text style={styles.presetBtnHighlightText}>
                        {language === 'en' ? '⭐ 4 days 1.5 dose / 3 days 1 dose' : '⭐ 4 gün 1.5 doz / 3 gün 1 doz'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.phaseCard}>
                    <Text style={styles.phaseCardBadge}>
                      {language === 'en' ? 'PHASE 1' : '1. AŞAMA'}
                    </Text>
                    <View style={styles.twoColRow}>
                      <View style={styles.col}>
                        <Text style={styles.timeInputLabel}>
                          {language === 'en' ? 'Days' : 'Gün Sayısı'}
                        </Text>
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
                        <Text style={styles.timeInputLabel}>{t.doseAmount}</Text>
                        <TextInput style={styles.textInput} value={cyclePhase1Amount} onChangeText={setCyclePhase1Amount} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.phaseCard}>
                    <Text style={styles.phaseCardBadge}>
                      {language === 'en' ? 'PHASE 2' : '2. AŞAMA'}
                    </Text>
                    <View style={styles.twoColRow}>
                      <View style={styles.col}>
                        <Text style={styles.timeInputLabel}>
                          {language === 'en' ? 'Days' : 'Gün Sayısı'}
                        </Text>
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
                        <Text style={styles.timeInputLabel}>{t.doseAmount}</Text>
                        <TextInput style={styles.textInput} value={cyclePhase2Amount} onChangeText={setCyclePhase2Amount} />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Cycle Start Date Picker */}
              {frequencyType !== 'everyday' && (
                <View style={styles.datePickerCard}>
                  <View style={styles.datePickerInfo}>
                    <Text style={styles.datePickerLabel}>
                      {language === 'en' ? 'Cycle Start Date' : 'Döngü Başlangıç Tarihi'}
                    </Text>
                    <Text style={styles.datePickerHint}>
                      {language === 'en' ? 'Reference start date for day 1 of the cycle' : 'Döngünün 1. gününün referans başlangıç tarihi'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => openCalendarPicker('cycleStartDate', language === 'en' ? 'Cycle Start Date' : 'Döngü Başlangıç Tarihi')}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#34d399" />
                    <Text style={styles.datePickerBtnText}>{formatLocalizedDate(cycleStartDate, language)}</Text>
                    <View style={styles.datePickerChangeBadge}>
                      <Text style={styles.datePickerChangeBadgeText}>
                        {language === 'en' ? 'Change' : 'Değiştir'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Duration & Treatment Period */}
              <Text style={styles.inputLabel}>
                {language === 'en' ? 'Treatment / Usage Duration' : 'Tedavi / Kullanım Süresi'}
              </Text>
              <View style={styles.selectorGrid}>
                <TouchableOpacity
                  style={[styles.selectorBtn, durationMode === 'continuous' && styles.selectorBtnActive]}
                  onPress={() => setDurationMode('continuous')}
                >
                  <Text style={[styles.selectorBtnText, durationMode === 'continuous' && styles.selectorBtnTextActive]}>
                    {t.durationContinuous}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectorBtn, durationMode === 'days' && styles.selectorBtnActive]}
                  onPress={() => setDurationMode('days')}
                >
                  <Text style={[styles.selectorBtnText, durationMode === 'days' && styles.selectorBtnTextActive]}>
                    {t.durationDays}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Treatment Start Date Picker */}
              <View style={styles.datePickerCard}>
                <View style={styles.datePickerInfo}>
                  <Text style={styles.datePickerLabel}>
                    {language === 'en' ? 'Treatment Start Date' : 'Tedavi Başlangıç Tarihi'}
                  </Text>
                  <Text style={styles.datePickerHint}>
                    {language === 'en' ? 'First day medication starts' : 'İlacın kullanılmaya başlandığı ilk gün'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => openCalendarPicker('startDate', language === 'en' ? 'Treatment Start Date' : 'Tedavi Başlangıç Tarihi')}
                >
                  <Ionicons name="calendar-outline" size={18} color="#34d399" />
                  <Text style={styles.datePickerBtnText}>{formatLocalizedDate(startDate, language)}</Text>
                  <View style={styles.datePickerChangeBadge}>
                    <Text style={styles.datePickerChangeBadgeText}>
                      {language === 'en' ? 'Change' : 'Değiştir'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {durationMode === 'days' && (
                <View style={styles.cycleBox}>
                  <Text style={styles.cycleBoxTitle}>
                    {language === 'en' ? 'Treatment Duration & End Schedule' : 'Tedavi Süresi & Bitiş Takvimi'}
                  </Text>
                  <View style={styles.presetRow}>
                    {[
                      { days: '5', label: language === 'en' ? '5 Days' : '5 Gün' },
                      { days: '7', label: language === 'en' ? '7 Days (Antibiotic)' : '7 Gün (Antibiyotik)' },
                      { days: '10', label: language === 'en' ? '10 Days' : '10 Gün' },
                      { days: '14', label: language === 'en' ? '14 Days (2 Weeks)' : '14 Gün (2 Hafta)' },
                      { days: '30', label: language === 'en' ? '30 Days (1 Box)' : '30 Gün (1 Kutu)' },
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

                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.timeInputLabel}>
                      {language === 'en' ? 'Total Treatment Days' : 'Toplam Tedavi Günü'}
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={durationDays}
                      onChangeText={v => setDurationDays(v.replace(/[^0-9]/g, ''))}
                      placeholder="7"
                      placeholderTextColor="#667"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.durationSummaryBanner}>
                    <Ionicons name="calendar-outline" size={16} color="#a9dfca" />
                    <Text style={styles.durationSummaryBannerText}>
                      {language === 'en'
                        ? `Starts on ${formatLocalizedDate(startDate, language)} · Last dose on ${formatLocalizedDate(calculateEndDate(startDate, Number(durationDays) || 7), language)} (${durationDays || 7} days).`
                        : `${formatLocalizedDate(startDate, language)} tarihinde başlar · ${calculateEndDate(startDate, Number(durationDays) || 7)} tarihinde son doz (${durationDays || 7} gün).`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Stock & Box */}
              <Text style={styles.inputLabel}>{t.stockTracking}</Text>
              <View style={styles.twoColRow}>
                <View style={styles.col}>
                  <Text style={styles.timeInputLabel}>{t.stockRemainingLabel}</Text>
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
                  <Text style={styles.timeInputLabel}>{t.stockThresholdLabel}</Text>
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
                  Alert.alert(
                    language === 'en' ? 'Box Added' : 'Kutu Eklendi',
                    language === 'en' ? '+30 units added to stock.' : '+30 tablet stoğa eklendi.'
                  );
                }}
              >
                <Ionicons name="refresh" size={16} color="#a9dfca" />
                <Text style={styles.refillBtnText}>{t.refill30}</Text>
              </TouchableOpacity>

              {/* Delete if editing */}
              {editingId && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteDose(editingId)}>
                  <Ionicons name="trash-outline" size={18} color="#ff9696" />
                  <Text style={styles.deleteBtnText}>{t.delete}</Text>
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
          serverUrl={serverUrl}
          lang={language}
        />

        {/* Modern Calendar Picker Modal */}
        <CalendarModal
          visible={calendarOpen}
          selectedDate={calendarTarget === 'startDate' ? startDate : (calendarTarget === 'cycleStartDate' ? cycleStartDate : (doctorNextAppointment || today))}
          title={calendarTitle}
          onSelect={handleDateSelected}
          onClose={() => setCalendarOpen(false)}
          lang={language}
        />

        {/* Multi-Appointment & Lab Test Editor Modal */}
        <AppointmentEditorModal
          visible={appointmentEditorOpen}
          appointment={editingAppointment}
          onClose={() => setAppointmentEditorOpen(false)}
          onSave={handleSaveAppointment}
          onDelete={handleDeleteAppointment}
          onOpenCalendar={(target, title) => openCalendarPicker(target, title)}
          externalSelectedDate={calendarAppointmentTarget}
          lang={language}
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
  headerTitleCol: { flex: 1, minWidth: 0, marginRight: 12 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#f5f3f0' },
  headerSubtitle: { fontSize: 13, color: '#adb3bf', marginTop: 4 },
  progressBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#152332', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, flexShrink: 0 },
  progressText: { fontSize: 12, color: '#adb3bf' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#a9dfca', justifyContent: 'center', alignItems: 'center' },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Hero Card
  heroCard: { backgroundColor: '#152332', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', marginVertical: 6 },
  heroEyebrow: { color: '#a9dfca', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  heroTime: { fontSize: 32, fontWeight: '800', color: '#f5f3f0', marginVertical: 1 },
  heroName: { fontSize: 18, fontWeight: '700', color: '#f5f3f0', textAlign: 'center', lineHeight: 22 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginVertical: 4 },
  chipMeal: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#142d2a', paddingVertical: 2.5, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: '#234842' },
  chipMealText: { color: '#a9dfca', fontSize: 10.5, fontWeight: '600' },
  chipForm: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a2938', paddingVertical: 2.5, paddingHorizontal: 6, borderRadius: 8 },
  chipFormText: { color: '#f5f3f0', fontSize: 10.5, fontWeight: '500' },
  chipCycle: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#143532', paddingVertical: 2.5, paddingHorizontal: 6, borderRadius: 8 },
  chipCycleText: { color: '#a9dfca', fontSize: 10.5, fontWeight: '600' },
  chipStock: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a2938', paddingVertical: 2.5, paddingHorizontal: 6, borderRadius: 8 },
  chipStockText: { color: '#adb3bf', fontSize: 10.5, fontWeight: '500' },
  chipStockLow: { backgroundColor: '#332214', borderColor: '#5c3e24', borderWidth: 1 },
  chipStockLowText: { color: '#f0b484', fontWeight: '700' },
  heroAmount: { fontSize: 12, color: '#adb3bf', marginTop: 1, marginBottom: 6 },
  takeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#a9dfca', width: '100%', height: 40, borderRadius: 10 },
  takeBtnText: { color: '#092326', fontSize: 15, fontWeight: '700' },
  heroSecondaryActions: { flexDirection: 'row', gap: 6, width: '100%', marginTop: 6 },
  heroSecBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#3a4655' },
  heroSecBtnText: { color: '#adb3bf', fontSize: 11.5, fontWeight: '500' },

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
  profileFieldLabel: { color: '#adb3bf', fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 2 },
  doctorCallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#34d399', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12 },
  doctorCallBtnText: { color: '#081624', fontSize: 13, fontWeight: '700' },
  appointmentCard: { backgroundColor: '#101d29', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#203244', marginTop: 10 },
  appointmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appointmentDateText: { color: '#f5f3f0', fontSize: 14, fontWeight: '700' },
  appointmentPlaceholder: { color: '#5c6e80', fontSize: 14 },
  appointmentBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 10 },
  appointmentBadgeText: { fontSize: 12, fontWeight: '700' },
  profileActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 13, marginTop: 10 },
  profileSaveBtn: { backgroundColor: '#183832', borderWidth: 1, borderColor: '#34d399' },
  profileSaveBtnText: { color: '#34d399', fontSize: 14, fontWeight: '700' },
  profileShareBtn: { backgroundColor: '#182b3a', borderWidth: 1, borderColor: '#38bdf8' },
  profileShareBtnText: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },
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
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 75, backgroundColor: '#081624', borderTopWidth: 1, borderTopColor: '#23313f', paddingBottom: Platform.OS === 'ios' ? 15 : 5, justifyContent: 'center' },
  bottomNavInner: { flexDirection: 'row', flex: 1, justifyContent: 'space-around', alignItems: 'center' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: '#adb3bf', fontSize: 11, marginTop: 4 },
  navLabelActive: { color: '#a9dfca', fontWeight: '600' },

  // Toast
  toast: { position: 'absolute', bottom: 85, left: 16, right: 16, maxWidth: 560, alignSelf: 'center', backgroundColor: '#193c37', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#48655f' },
  toastText: { color: '#f5f3f0', fontSize: 13, flex: 1, marginRight: 8 },
  toastUndo: { color: '#a9dfca', fontSize: 13, fontWeight: '700' },

  // Floating Push Banner
  pushNotificationBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 14,
    right: 14,
    maxWidth: 600,
    alignSelf: 'center',
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

  // Date Picker Card Styles
  datePickerCard: {
    backgroundColor: '#101e2b',
    borderWidth: 1,
    borderColor: '#1d364d',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  datePickerInfo: {
    marginBottom: 8,
  },
  datePickerLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  datePickerHint: {
    color: '#8b9cb0',
    fontSize: 11.5,
    marginTop: 2,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16283b',
    borderWidth: 1,
    borderColor: '#244563',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  datePickerBtnText: {
    color: '#f5f3f0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  datePickerChangeBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  datePickerChangeBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },

  // Carousel Hero Styles
  carouselContainer: {
    marginVertical: 10,
  },
  carouselHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  carouselSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#132832',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1c4542',
  },
  carouselSessionBadgeText: {
    color: '#a9dfca',
    fontSize: 12,
    fontWeight: '700',
  },
  carouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#23384c',
  },
  carouselDotActive: {
    width: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a9dfca',
  },
  carouselCounterText: {
    color: '#adb3bf',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  carouselScrollContent: {
    paddingVertical: 2,
  },
  heroCarouselCard: {
    backgroundColor: '#152332',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#20354b',
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 2,
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#142d2a',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#234842',
  },
  timingBadgeText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '700',
  },
  timingBadgeOverdue: {
    backgroundColor: '#332214',
    borderColor: '#5c3e24',
  },
  timingBadgeTextOverdue: {
    color: '#f0b484',
  },
  cardPageBadge: {
    backgroundColor: '#1e3347',
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  cardPageBadgeText: {
    color: '#adb3bf',
    fontSize: 10,
    fontWeight: '600',
  },
  heroVisualPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#0f1c29',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    width: '100%',
    marginVertical: 3,
    borderWidth: 1,
    borderColor: '#1c2e42',
  },
  heroVisualFormText: {
    color: '#f5f3f0',
    fontSize: 11,
    fontWeight: '600',
  },
  heroInstructionText: {
    color: '#a9dfca',
    fontSize: 10.5,
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    marginBottom: 3,
  },
  takeAllSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#a9dfca',
    borderRadius: 10,
    height: 36,
    marginTop: 6,
  },
  takeAllSessionBtnText: {
    color: '#081624',
    fontSize: 13,
    fontWeight: '700',
  },

  // Overdue & Meal Guidance Box Styles
  guidanceBox: {
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 3,
    borderWidth: 1,
  },
  guidanceBoxWarning: {
    backgroundColor: '#261b11',
    borderColor: '#54361e',
  },
  guidanceBoxCritical: {
    backgroundColor: '#321414',
    borderColor: '#692525',
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  guidanceTitle: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  guidanceTitleWarning: {
    color: '#f0b484',
  },
  guidanceTitleCritical: {
    color: '#ff7675',
  },
  guidanceMessage: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 13,
    width: '100%',
  },

  updateCard: {
    backgroundColor: '#0f1f2e',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1e3347',
  },
  updateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#162e3d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f5f3f0',
  },
  updateSub: {
    fontSize: 11,
    color: '#7e90a6',
    marginTop: 2,
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#a9dfca',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  checkUpdateBtnText: {
    color: '#081624',
    fontSize: 12,
    fontWeight: '700',
  },
  updateAlertBox: {
    backgroundColor: '#122b30',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#1b4d45',
  },
  updateAlertTitle: {
    color: '#5eead4',
    fontSize: 13,
    fontWeight: '700',
  },
  updateAlertNotes: {
    color: '#c4d7d1',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  downloadUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5eead4',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  downloadUpdateBtnText: {
    color: '#081624',
    fontSize: 13,
    fontWeight: '700',
  },
  upToDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#172b3c',
  },
  upToDateText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '500',
  },
});
