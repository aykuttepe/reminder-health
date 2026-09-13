import {newId, migrateDoseIds, switchAccount, finishSwitch, assertAccount, accountKey, type Session, type Snapshot} from './account';
import {login, recover, registerAccount, updateUserEmail, getStoredSyncCode, getSession, logout, authRequest, localStore, isSameServer} from './authClient';
import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Bell, CalendarDots, Pill, ClockCounterClockwise, GearSix, Check, CheckCircle, Clock, Prohibit, CaretRight, ClipboardText, Plus, ArrowLeft, PencilSimple, X, Moon, ShieldCheck, ArrowCounterClockwise, Trash, TrendUp, ForkKnife, Drop, Flask, Package, Warning, ArrowsClockwise, SpeakerHigh, SpeakerSlash, User, Eye, EyeSlash, Play, Shield, SlidersHorizontal, Barcode, Camera, CloudArrowUp, WifiHigh, DownloadSimple, UploadSimple, Bug, Globe, Phone, FirstAid, ShareNetwork, Buildings } from '@phosphor-icons/react';
import { BottomSheet, KeyboardInput, MobileScroll, useKeyboard, useKeyboardInsets } from './mobile';
import { parseITSKarekod } from './itsParser';
import { findMedicineByGTIN, type CatalogMedicine } from './data/medCatalog';
import {
  DEFAULT_SYNC_SERVER_URL,
  restoreServerUrl,
  checkServerHealth,
  syncWithServer,
  smartMergeDoses,
  createBackupPayload,
  validateBackupJSON,
  type SyncDose,
} from './syncManager';
import { webLogger, type LogEntry, type LogLevel } from './logger';
import { WebErrorBoundary } from './components/ErrorBoundary';
import { getTranslations, type Language } from './i18n/translations';

type Tab = 'Bugün' | 'İlaçlarım' | 'Geçmiş' | 'Ayarlar';
type SettingsSubPage =
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
type MealCondition = 'tok' | 'ac' | 'yemekle' | 'farketmez';
type MedicineForm = 'tablet' | 'kapsul' | 'damla' | 'surup';
type FrequencyType = 'everyday' | 'alternate' | 'cycle' | 'variable';

type Dose = {
  id: string | number;
  name: string;
  amount: string;
  time: string;
  times?: string[];
  slotAmounts?: Record<string, string>;
  status: 'pending' | 'taken' | 'skipped';
  paused?: boolean;
  snooze?: number;
  mealCondition?: MealCondition;
  form?: MedicineForm;
  instructions?: string;
  stock?: number;
  stockThreshold?: number;
  defaultStock?: number;
  frequencyType?: FrequencyType;
  cyclePhase1Days?: number;
  cyclePhase1Amount?: string;
  cyclePhase2Days?: number;
  cyclePhase2Amount?: string;
  cycleStartDate?: string;
  slotStatuses?: Record<string, 'pending' | 'taken' | 'skipped'>;
  gtin?: string;
  expiryDate?: string;
  updatedAt?: number;
  deletedAt?: number;
};

type CycleInfo = {
  isActiveToday: boolean;
  todayAmount: string;
  phaseLabel: string;
  phaseType: 'active' | 'off';
  currentDayInPhase: number;
  totalDaysInPhase: number;
};

function parseDoseAmount(amountStr?: string): number {
  if (!amountStr) return 1;
  const normalized = String(amountStr).replace(',', '.');
  const match = normalized.match(/(\d+(\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    if (!isNaN(num) && num > 0) return num;
  }
  return 1;
}

function formatStock(val?: number): string {
  if (val === undefined) return '0';
  if (Number.isInteger(val)) return String(val);
  return val.toFixed(1).replace('.', ',');
}

function getCalendarDayDiff(startStr: string, endStr: string): number {
  const sParts = (startStr || '2026-09-01').split('-').map(Number);
  const eParts = endStr.split('-').map(Number);
  const d1 = new Date(sParts[0], (sParts[1] || 1) - 1, sParts[2] || 1);
  const d2 = new Date(eParts[0], (eParts[1] || 1) - 1, eParts[2] || 1);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

function getCycleInfo(dose: Dose, targetDateStr = '2026-09-06', lang: 'tr' | 'en' = 'tr'): CycleInfo {
  const isEn = lang === 'en';
  const freq = dose.frequencyType || 'everyday';
  if (freq === 'everyday') {
    return {
      isActiveToday: true,
      todayAmount: dose.amount,
      phaseLabel: isEn ? 'Every day' : 'Her gün',
      phaseType: 'active',
      currentDayInPhase: 1,
      totalDaysInPhase: 1,
    };
  }

  const diffDays = getCalendarDayDiff(dose.cycleStartDate || '2026-09-01', targetDateStr);

  if (freq === 'alternate') {
    const isOdd = diffDays % 2 === 1;
    if (!isOdd) {
      return {
        isActiveToday: true,
        todayAmount: dose.amount,
        phaseLabel: isEn ? 'Alternate days · Dose day' : 'Gün aşırı · Alım günü',
        phaseType: 'active',
        currentDayInPhase: 1,
        totalDaysInPhase: 1,
      };
    } else {
      return {
        isActiveToday: false,
        todayAmount: '0',
        phaseLabel: isEn ? 'Alternate days · Rest day' : 'Gün aşırı · Ara günü',
        phaseType: 'off',
        currentDayInPhase: 1,
        totalDaysInPhase: 1,
      };
    }
  }

  if (freq === 'cycle') {
    const p1Days = Math.max(1, dose.cyclePhase1Days || 3);
    const p2Days = Math.max(1, dose.cyclePhase2Days || 4);
    const cycleLen = p1Days + p2Days;
    const dayInCycle = diffDays % cycleLen;

    if (dayInCycle < p1Days) {
      return {
        isActiveToday: true,
        todayAmount: dose.amount,
        phaseLabel: isEn ? `Dose day (${dayInCycle + 1}/${p1Days})` : `Alım günü (${dayInCycle + 1}/${p1Days})`,
        phaseType: 'active',
        currentDayInPhase: dayInCycle + 1,
        totalDaysInPhase: p1Days,
      };
    } else {
      const offDay = dayInCycle - p1Days + 1;
      return {
        isActiveToday: false,
        todayAmount: '0',
        phaseLabel: isEn ? `Rest day (${offDay}/${p2Days})` : `Ara günü (${offDay}/${p2Days})`,
        phaseType: 'off',
        currentDayInPhase: offDay,
        totalDaysInPhase: p2Days,
      };
    }
  }

  if (freq === 'variable') {
    const p1Days = Math.max(1, dose.cyclePhase1Days || 4);
    const p1Amount = dose.cyclePhase1Amount || dose.amount || '1.5 tablet';
    const p2Days = Math.max(1, dose.cyclePhase2Days || 3);
    const p2Amount = dose.cyclePhase2Amount || '1 tablet';
    const cycleLen = p1Days + p2Days;
    const dayInCycle = diffDays % cycleLen;

    if (dayInCycle < p1Days) {
      return {
        isActiveToday: true,
        todayAmount: p1Amount,
        phaseLabel: isEn ? `Phase 1 (${dayInCycle + 1}/${p1Days} days) · ${p1Amount}` : `1. Aşama (${dayInCycle + 1}/${p1Days} gün) · ${p1Amount}`,
        phaseType: 'active',
        currentDayInPhase: dayInCycle + 1,
        totalDaysInPhase: p1Days,
      };
    } else {
      const p2Day = dayInCycle - p1Days + 1;
      const isOff = p2Amount === '0' || p2Amount.toLowerCase().includes('ara') || p2Amount.toLowerCase().includes('rest');
      return {
        isActiveToday: !isOff,
        todayAmount: isOff ? '0' : p2Amount,
        phaseLabel: isOff ? (isEn ? `Rest day (${p2Day}/${p2Days})` : `Ara günü (${p2Day}/${p2Days})`) : (isEn ? `Phase 2 (${p2Day}/${p2Days} days) · ${p2Amount}` : `2. Aşama (${p2Day}/${p2Days} gün) · ${p2Amount}`),
        phaseType: isOff ? 'off' : 'active',
        currentDayInPhase: p2Day,
        totalDaysInPhase: p2Days,
      };
    }
  }

  return {
    isActiveToday: true,
    todayAmount: dose.amount,
    phaseLabel: isEn ? 'Every day' : 'Her gün',
    phaseType: 'active',
    currentDayInPhase: 1,
    totalDaysInPhase: 1,
  };
}

function calculateEndDate(startDateStr: string, days: number): string {
  const parts = (startDateStr || '2026-09-06').split('-').map(Number);
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  d.setDate(d.getDate() + Math.max(0, days - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface StockProjection {
  currentStock: number;
  dailyConsumption: number;
  daysRemaining: number;
  runOutDate: string;
  runOutDateFormatted: string;
  statusTier: 'critical' | 'low' | 'good';
  isOutOfStock: boolean;
  boxSize: number;
  threshold: number;
  progressPercent: number;
}

function calculateStockProjection(
  dose: Dose,
  today = '2026-09-06',
  language: 'tr' | 'en' = 'tr'
): StockProjection {
  const stock = Math.max(0, dose.stock ?? 0);
  const threshold = Math.max(1, dose.stockThreshold ?? 5);
  const boxSize = Math.max(1, (dose as any).defaultStock ?? 30);
  const isEn = language === 'en';

  let baseDaily = 0;
  const effectiveTimes = dose.times && dose.times.length > 0 ? dose.times : [dose.time || '09:00'];
  for (const t of effectiveTimes) {
    const amtStr = dose.slotAmounts?.[t]?.trim() || dose.amount;
    baseDaily += parseDoseAmount(amtStr);
  }

  let dailyConsumption = baseDaily;
  const freq = dose.frequencyType;
  if (freq === 'alternate') {
    dailyConsumption = baseDaily / 2;
  } else if (freq === 'cycle') {
    const p1Days = Math.max(1, dose.cyclePhase1Days || 3);
    const p2Days = Math.max(1, dose.cyclePhase2Days || 4);
    dailyConsumption = (baseDaily * p1Days) / (p1Days + p2Days);
  } else if (freq === 'variable') {
    const p1Days = Math.max(1, dose.cyclePhase1Days || 4);
    const p1Amount = parseDoseAmount(dose.cyclePhase1Amount || dose.amount);
    const p2Days = Math.max(1, dose.cyclePhase2Days || 3);
    const p2Amount = parseDoseAmount(dose.cyclePhase2Amount);
    dailyConsumption = (p1Amount * p1Days + p2Amount * p2Days) / (p1Days + p2Days);
  }

  if (dailyConsumption <= 0) dailyConsumption = 1;

  const isOutOfStock = stock <= 0;
  const daysRemaining = isOutOfStock ? 0 : Math.floor(stock / dailyConsumption);
  const runOutDate = isOutOfStock ? today : calculateEndDate(today, daysRemaining);

  let runOutDateFormatted = '';
  if (isOutOfStock) {
    runOutDateFormatted = isEn ? 'Out of stock' : 'Stok tükendi';
  } else {
    try {
      const parts = runOutDate.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      runOutDateFormatted = d.toLocaleDateString(isEn ? 'en-US' : 'tr-TR', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
      });
    } catch {
      runOutDateFormatted = runOutDate;
    }
  }

  let statusTier: 'critical' | 'low' | 'good' = 'good';
  if (isOutOfStock || daysRemaining <= 7 || stock <= threshold) {
    statusTier = 'critical';
  } else if (daysRemaining <= 14 || stock <= threshold * 1.5) {
    statusTier = 'low';
  } else {
    statusTier = 'good';
  }

  const maxRefDays = Math.max(30, Math.ceil(boxSize / dailyConsumption));
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysRemaining / maxRefDays) * 100)));

  return {
    currentStock: stock,
    dailyConsumption: Math.round(dailyConsumption * 100) / 100,
    daysRemaining,
    runOutDate,
    runOutDateFormatted,
    statusTier,
    isOutOfStock,
    boxSize,
    threshold,
    progressPercent,
  };
}

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

const formIcons = {
  tablet: Pill,
  kapsul: Pill,
  damla: Drop,
  surup: Flask,
};

type PastDayRecord = {
  dayNum: number;
  label: string;
  dateStr: string;
  isToday?: boolean;
  doses?: { id: string | number; name: string; time: string; amount: string; status: 'taken' | 'skipped' }[];
};

const initial: Dose[] = [];

const pastWeekHistory: PastDayRecord[] = [
  { dayNum: 31, label: 'Pzt', dateStr: '31 Ağustos 2026, Pazartesi', doses: [] },
  { dayNum: 1, label: 'Sal', dateStr: '1 Eylül 2026, Salı', doses: [] },
  { dayNum: 2, label: 'Çar', dateStr: '2 Eylül 2026, Çarşamba', doses: [] },
  { dayNum: 3, label: 'Per', dateStr: '3 Eylül 2026, Perşembe', doses: [] },
  { dayNum: 4, label: 'Cum', dateStr: '4 Eylül 2026, Cuma', doses: [] },
  { dayNum: 5, label: 'Cmt', dateStr: '5 Eylül 2026, Cumartesi', doses: [] },
  { dayNum: 6, label: 'Paz', dateStr: '6 Eylül 2026, Pazar', isToday: true },
];

/**
 * DualTimeInput Component for web prototype:
 * - inputMode="numeric" & pattern="[0-9]*" (Numeric Keypad / Numatör)
 * - Separate large SAAT and DAKİKA touch boxes
 * - Automatic focus and select-on-tap
 * - Auto-advances to minute after 2 digits in hour
 */
function DualTimeInput({
  value,
  onChange,
  label,
  onStep,
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
  onStep?: (deltaMinutes: number) => void;
}) {
  const [h = '08', m = '00'] = (value || '08:00').split(':');
  const [hour, setHour] = useState(h);
  const [minute, setMinute] = useState(m);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const [curH = '08', curM = '00'] = (value || '08:00').split(':');
    setHour(curH);
    setMinute(curM);
  }, [value]);

  const handleHourChange = (newH: string) => {
    const clean = newH.replace(/[^0-9]/g, '').slice(0, 2);
    setHour(clean);
    if (clean.length === 2) {
      let num = parseInt(clean, 10);
      if (num > 23) num = 23;
      const formatted = String(num).padStart(2, '0');
      setHour(formatted);
      onChange(`${formatted}:${(minute || '00').padStart(2, '0')}`);
      minuteInputRef.current?.focus();
      minuteInputRef.current?.select();
    } else if (clean.length === 1 && parseInt(clean, 10) >= 3) {
      const formatted = `0${clean}`;
      setHour(formatted);
      onChange(`${formatted}:${(minute || '00').padStart(2, '0')}`);
      minuteInputRef.current?.focus();
      minuteInputRef.current?.select();
    } else if (clean.length === 1) {
      onChange(`${clean.padStart(2, '0')}:${(minute || '00').padStart(2, '0')}`);
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(hour, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 23) num = 23;
    const formattedH = String(num).padStart(2, '0');
    const formattedM = (minute || '00').padStart(2, '0');
    setHour(formattedH);
    onChange(`${formattedH}:${formattedM}`);
  };

  const handleMinuteChange = (newM: string) => {
    const clean = newM.replace(/[^0-9]/g, '').slice(0, 2);
    setMinute(clean);
    if (clean.length === 2) {
      let num = parseInt(clean, 10);
      if (num > 59) num = 59;
      const formattedM = String(num).padStart(2, '0');
      setMinute(formattedM);
      onChange(`${(hour || '00').padStart(2, '0')}:${formattedM}`);
    } else if (clean.length === 1 && parseInt(clean, 10) >= 6) {
      const formattedM = `0${clean}`;
      setMinute(formattedM);
      onChange(`${(hour || '00').padStart(2, '0')}:${formattedM}`);
    } else if (clean.length === 1) {
      onChange(`${(hour || '00').padStart(2, '0')}:${clean.padStart(2, '0')}`);
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minute, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    const formattedM = String(num).padStart(2, '0');
    const formattedH = (hour || '00').padStart(2, '0');
    setMinute(formattedM);
    onChange(`${formattedH}:${formattedM}`);
  };

  return (
    <div className="dual-time-slot-card">
      <div className="dual-time-header">
        <span className="dual-time-label">{label}</span>
        {onStep && (
          <div className="dual-time-stepper-row">
            <button
              type="button"
              className="time-step-mini-btn"
              onClick={() => onStep(-15)}
              title="-15 dakika"
            >
              -15 dk
            </button>
            <button
              type="button"
              className="time-step-mini-btn"
              onClick={() => onStep(15)}
              title="+15 dakika"
            >
              +15 dk
            </button>
          </div>
        )}
      </div>

      <div className="dual-time-input-group">
        <div className="time-digit-box">
          <span className="time-box-sub">SAAT</span>
          <KeyboardInput
            value={hour}
            onChange={e => handleHourChange(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={handleHourBlur}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            className="time-digit-input"
            placeholder="08"
          />
        </div>

        <span className="time-colon-separator">:</span>

        <div className="time-digit-box">
          <span className="time-box-sub">DAKİKA</span>
          <KeyboardInput
            ref={minuteInputRef}
            value={minute}
            onChange={e => handleMinuteChange(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={handleMinuteBlur}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            className="time-digit-input"
            placeholder="00"
          />
        </div>
      </div>
    </div>
  );
}

const tabs = [{name:'Bugün',icon:CalendarDots},{name:'İlaçlarım',icon:Pill},{name:'Geçmiş',icon:ClockCounterClockwise},{name:'Ayarlar',icon:GearSix}] as const;
const countSuffix = (count: number) => ({0:'ı',1:'i',2:'si',3:'ü',4:'ü',5:'i',6:'sı',7:'si',8:'i',9:'u'}[count % 10] ?? 'i');
const statusText = (d: Dose) => d.status === 'taken' ? 'Alındı' : d.status === 'skipped' ? 'Atlandı' : d.snooze ? `${d.snooze} dk sonra hatırlat` : 'Bekliyor';

const STORAGE_KEY_DOSES = 'rutin_doses';
const STORAGE_KEY_SETTINGS = 'rutin_settings';
const STORAGE_KEY_LEARNED_MEDS = 'rutin_learned_meds_v1';
const STORAGE_KEY_SYNC_CONFIG = 'rutin_sync_config';
const STORAGE_KEY_LANGUAGE = 'reminder_health_language_v1';
if (typeof window !== 'undefined') {
  const pending = localStorage.getItem('reminder_pending_switch_v2');
  if (pending) {
    const {snapshot,key} = JSON.parse(pending);
    localStorage.setItem(STORAGE_KEY_DOSES,JSON.stringify(snapshot.doses));
    localStorage.setItem(STORAGE_KEY_LEARNED_MEDS,JSON.stringify(snapshot.learnedMeds));
    localStorage.setItem(STORAGE_KEY_SETTINGS,JSON.stringify(snapshot.settings));
    localStorage.setItem('reminder_bound_account_v2',key);
    localStorage.removeItem('reminder_pending_switch_v2');
  }
}


function loadStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'tr';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    if (saved === 'tr' || saved === 'en') return saved;
  } catch (e) {
    console.error('Failed to load language', e);
  }
  return 'tr';
}

function loadStoredDoses(): Dose[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DOSES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filter out legacy seed items (İlaç A, B, C, D)
        return parsed.filter(d => !((d.id >= 1 && d.id <= 4) && ['İlaç A', 'İlaç B', 'İlaç C', 'İlaç D'].includes(d.name)));
      }
    }
  } catch (e) {
    console.error('Failed to load doses from localStorage', e);
  }
  return [];
}

export type SoundType = 'default' | 'alarm' | 'gentle' | 'chime' | 'system_custom';

export type PrototypeSettings = {
  userName: string;
  notifications: boolean;
  soundEnabled: boolean;
  soundType: SoundType;
  snoozeMinutes: number;
  leadTimeMinutes: number;
  defaultStockThreshold: number;
  stockAlertsEnabled: boolean;
  hideDoseAmount: boolean;
  privateMode: boolean;
  largeText: boolean;
  autoCollapseTaken: boolean;
  hapticsEnabled: boolean;
  repeatNagEnabled: boolean;
  repeatNagCount: number;
  batteryExemptionEnabled: boolean;
  exactAlarmEnabled: boolean;
  autoRescheduleOnBoot: boolean;
  wakeScreenOnAlarm: boolean;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorHospital?: string;
  doctorPhone?: string;
  doctorNextAppointment?: string;
  doctorAppointmentTime?: string;
  doctorApptLeadOptions?: string[];
  doctorBloodTestDate?: string;
  doctorNotes?: string;
  appointments?: AppointmentItem[];
};

export interface AppointmentItem {
  id: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  phone?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm, default "13:00"
  leadOptions: string[]; // ['3d', '2d', '1d', '0d']
  hasBloodTest: boolean;
  bloodTestDate?: string; // YYYY-MM-DD
  bloodTestTime?: string; // HH:mm, default "08:30"
  bloodTestFasting?: boolean;
  bloodTestNotes?: string;
  notes?: string;
  completed?: boolean;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_SETTINGS: PrototypeSettings = {
  userName: '',
  doctorName: '',
  doctorSpecialty: '',
  doctorHospital: '',
  doctorPhone: '',
  doctorNextAppointment: '',
  doctorAppointmentTime: '13:00',
  doctorApptLeadOptions: ['1d', '0d'],
  doctorBloodTestDate: '',
  doctorNotes: '',
  appointments: [],
  notifications: true,
  soundEnabled: true,
  soundType: 'default',
  snoozeMinutes: 10,
  leadTimeMinutes: 0,
  defaultStockThreshold: 5,
  stockAlertsEnabled: true,
  hideDoseAmount: false,
  privateMode: false,
  largeText: false,
  autoCollapseTaken: false,
  hapticsEnabled: true,
  repeatNagEnabled: true,
  repeatNagCount: 5,
  batteryExemptionEnabled: true,
  exactAlarmEnabled: true,
  autoRescheduleOnBoot: true,
  wakeScreenOnAlarm: true,
};

const SOUND_OPTIONS: { type: SoundType; title: string; desc: string; freq: string }[] = [
  { type: 'default', title: 'Melodik Çan', desc: 'Sakin ve uyumlu melodik üçlü tını', freq: 'C5-E5-G5' },
  { type: 'alarm', title: 'Alarm Tipi', desc: 'Dikkat çekici çift darbeli net uyarı', freq: '880 Hz' },
  { type: 'gentle', title: 'Nazik Yükseliş', desc: 'Yumuşak ve dinlendirici harmonik ses', freq: '440-554 Hz' },
  { type: 'chime', title: 'Kristal Zil', desc: 'Net, yüksek frekanslı parlak zil', freq: '1046 Hz' },
  { type: 'system_custom', title: 'Cihaz Sistem Sesi', desc: 'Telefonunuzun kendi ses ayarlarından seçtiğiniz melodi', freq: 'Cihazdan' },
];

function playPreviewSound(soundType: SoundType) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (soundType === 'default') {
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);
        gain.gain.setValueAtTime(0.2, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.36);
      });
    } else if (soundType === 'alarm') {
      [0, 0.2].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now + offset);
        gain.gain.setValueAtTime(0.25, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } else if (soundType === 'gentle') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.3);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } else if (soundType === 'chime') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.82);
    } else if (soundType === 'system_custom') {
      // Pleasant dual chime simulating phone system tone (587.33Hz D5 -> 880Hz A5)
      [587.33, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.24, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.46);
      });
    }
  } catch (err) {
    console.warn('Audio playback error', err);
  }
}

function loadStoredSettings(): PrototypeSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
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
      parsed.appointments = initialAppointments;
      if (hasStoredAppointments && initialAppointments.length === 0) {
        parsed.doctorNextAppointment = '';
        parsed.doctorBloodTestDate = '';
        parsed.doctorName = '';
        parsed.doctorSpecialty = '';
        parsed.doctorHospital = '';
        parsed.doctorPhone = '';
        parsed.doctorNotes = '';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

function InnerPrototype() {
  const today = new Date().toISOString().slice(0, 10);
  const [language, setLanguage] = useState<Language>(loadStoredLanguage);
  const t = getTranslations(language);

  const updateLanguage = (newLang: Language) => {
    setLanguage(newLang);
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, newLang);
      webLogger.info('Settings', `Language changed: ${newLang}`);
    } catch (e) {
      console.error('Failed to save language', e);
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

  const getTabLabel = (tName: Tab) => {
    switch (tName) {
      case 'Bugün': return t.tabToday;
      case 'İlaçlarım': return t.tabMedicines;
      case 'Geçmiş': return t.tabHistory;
      case 'Ayarlar': return t.tabSettings;
    }
  };

  const [tab, setTab] = useState<Tab>('Bugün');
  const [medsSubTab, setMedsSubTab] = useState<'plan' | 'stock'>('plan');
  const [stockFilter, setStockFilter] = useState<'all' | 'critical' | 'low' | 'good'>('all');
  const [settingsSubPage, setSettingsSubPage] = useState<SettingsSubPage>('main');
  const [doses, setDoses] = useState<Dose[]>(loadStoredDoses);
  const [storedSettings] = useState<PrototypeSettings>(loadStoredSettings);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<number>(6);
  const [expanded, setExpanded] = useState(false);
  const [editor, setEditor] = useState<Partial<Dose> | null>(null);

  // Diagnostics & Logger State
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<LogEntry[]>(() => webLogger.getLogs());
  const [diagnosticsFilter, setDiagnosticsFilter] = useState<'ALL' | 'ERROR' | 'WARN'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('1 tablet');
  const [time, setTime] = useState('09:00');
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [slotAmounts, setSlotAmounts] = useState<Record<string, string>>({});
  const [doseCount, setDoseCount] = useState<number>(1);
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
  const [cycleStartDate, setCycleStartDate] = useState<string>('2026-09-01');
  const [error, setError] = useState('');
  const [snoozing, setSnoozing] = useState<Dose | null>(null);
  const [toast, setToast] = useState<{ text: string; previous?: Dose[] } | null>(null);
  
  // Scanner & ITS Karekod states
  const [learnedMeds, setLearnedMeds] = useState<Record<string, Partial<CatalogMedicine>>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEARNED_MEDS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentGTIN, setCurrentGTIN] = useState<string | null>(null);
  const [currentExpiryDate, setCurrentExpiryDate] = useState<string | null>(null);
  const [currentBatchNo, setCurrentBatchNo] = useState<string | null>(null);
  
  // Settings states
  const [userName, setUserName] = useState<string>(storedSettings.userName);
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [doctorName, setDoctorName] = useState<string>(storedSettings.doctorName || '');
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>(storedSettings.doctorSpecialty || '');
  const [doctorHospital, setDoctorHospital] = useState<string>(storedSettings.doctorHospital || '');
  const [doctorPhone, setDoctorPhone] = useState<string>(storedSettings.doctorPhone || '');
  const [doctorNextAppointment, setDoctorNextAppointment] = useState<string>(storedSettings.doctorNextAppointment || '');
  const [doctorAppointmentTime, setDoctorAppointmentTime] = useState<string>(storedSettings.doctorAppointmentTime === '09:00' ? '13:00' : (storedSettings.doctorAppointmentTime || '13:00'));
  const [doctorApptLeadOptions, setDoctorApptLeadOptions] = useState<string[]>(storedSettings.doctorApptLeadOptions || ['1d', '0d']);
  const [doctorBloodTestDate, setDoctorBloodTestDate] = useState<string>(storedSettings.doctorBloodTestDate || '');
  const [doctorNotes, setDoctorNotes] = useState<string>(storedSettings.doctorNotes || '');
  const [appointments, setAppointments] = useState<AppointmentItem[]>(() => {
    if (storedSettings.appointments !== undefined && Array.isArray(storedSettings.appointments)) {
      return storedSettings.appointments;
    }
    if (storedSettings.appointments === undefined && storedSettings.doctorNextAppointment) {
      return [{
        id: 'appt-legacy-1',
        doctorName: storedSettings.doctorName || '',
        specialty: storedSettings.doctorSpecialty || 'Göz',
        hospital: storedSettings.doctorHospital || '',
        phone: storedSettings.doctorPhone || '',
        date: storedSettings.doctorNextAppointment,
        time: storedSettings.doctorAppointmentTime === '09:00' ? '13:00' : (storedSettings.doctorAppointmentTime || '13:00'),
        leadOptions: storedSettings.doctorApptLeadOptions || ['1d', '0d'],
        hasBloodTest: !!storedSettings.doctorBloodTestDate,
        bloodTestDate: storedSettings.doctorBloodTestDate || '',
        bloodTestFasting: true,
        bloodTestTime: '08:30',
        bloodTestNotes: storedSettings.doctorNotes || '',
        notes: storedSettings.doctorNotes || '',
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
    }
    return [];
  });
  const [appointmentEditorOpen, setAppointmentEditorOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentItem | null>(null);

  const handleOpenAppointmentEditor = (appt?: AppointmentItem) => {
    setEditingAppointment(appt || null);
    setAppointmentEditorOpen(true);
  };

  const handleSaveAppointment = (saved: AppointmentItem) => {
    const exists = appointments.some(a => a.id === saved.id);
    let updated: AppointmentItem[];
    if (exists) {
      updated = appointments.map(a => a.id === saved.id ? saved : a);
    } else {
      updated = [...appointments, saved];
    }
    setAppointments(updated);
    const active = updated.filter(a => !a.completed).sort((a, b) => (a.date + ' ' + (a.time || '13:00')).localeCompare(b.date + ' ' + (b.time || '13:00')))[0] || updated[0];
    if (active) {
      setDoctorName(active.doctorName || '');
      setDoctorSpecialty(active.specialty || '');
      setDoctorHospital(active.hospital || '');
      setDoctorPhone(active.phone || '');
      setDoctorNextAppointment(active.date || '');
      setDoctorAppointmentTime(active.time || '13:00');
      setDoctorApptLeadOptions(active.leadOptions || ['1d', '0d']);
      setDoctorBloodTestDate(active.hasBloodTest ? (active.bloodTestDate || '') : '');
      setDoctorNotes(active.notes || '');
    }
    setAppointmentEditorOpen(false);
    setEditingAppointment(null);
    setToast({ text: exists ? (language === 'en' ? 'Appointment updated' : 'Randevu güncellendi') : (language === 'en' ? 'Appointment added' : 'Yeni randevu eklendi') });
    syncProfileSettings({ appointments: updated });
  };

  const handleDeleteAppointment = (id: string) => {
    const updated = appointments.filter(a => a.id !== id);
    setAppointments(updated);
    const active = updated.filter(a => !a.completed).sort((a, b) => (a.date + ' ' + (a.time || '13:00')).localeCompare(b.date + ' ' + (b.time || '13:00')))[0];
    const newDocName = active?.doctorName || '';
    const newDocSpecialty = active?.specialty || '';
    const newDocHospital = active?.hospital || '';
    const newDocPhone = active?.phone || '';
    const newNextAppt = active?.date || '';
    const newApptTime = active?.time || '13:00';
    const newLeadOptions = active?.leadOptions || ['1d', '0d'];
    const newBloodDate = active?.hasBloodTest ? (active?.bloodTestDate || '') : '';
    const newNotes = active?.notes || '';

    setDoctorName(newDocName);
    setDoctorSpecialty(newDocSpecialty);
    setDoctorHospital(newDocHospital);
    setDoctorPhone(newDocPhone);
    setDoctorNextAppointment(newNextAppt);
    setDoctorAppointmentTime(newApptTime);
    setDoctorApptLeadOptions(newLeadOptions);
    setDoctorBloodTestDate(newBloodDate);
    setDoctorNotes(newNotes);

    setToast({ text: language === 'en' ? 'Appointment deleted' : 'Randevu silindi' });
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
  };

  const handleToggleCompleteAppointment = (id: string) => {
    const updated = appointments.map(a => a.id === id ? { ...a, completed: !a.completed, updatedAt: Date.now() } : a);
    setAppointments(updated);
    const active = updated.filter(a => !a.completed).sort((a, b) => (a.date + ' ' + (a.time || '13:00')).localeCompare(b.date + ' ' + (b.time || '13:00')))[0];
    const newDocName = active?.doctorName || '';
    const newDocSpecialty = active?.specialty || '';
    const newDocHospital = active?.hospital || '';
    const newDocPhone = active?.phone || '';
    const newNextAppt = active?.date || '';
    const newApptTime = active?.time || '13:00';
    const newLeadOptions = active?.leadOptions || ['1d', '0d'];
    const newBloodDate = active?.hasBloodTest ? (active?.bloodTestDate || '') : '';
    const newNotes = active?.notes || '';

    setDoctorName(newDocName);
    setDoctorSpecialty(newDocSpecialty);
    setDoctorHospital(newDocHospital);
    setDoctorPhone(newDocPhone);
    setDoctorNextAppointment(newNextAppt);
    setDoctorAppointmentTime(newApptTime);
    setDoctorApptLeadOptions(newLeadOptions);
    setDoctorBloodTestDate(newBloodDate);
    setDoctorNotes(newNotes);

    setToast({ text: language === 'en' ? 'Appointment status updated' : 'Randevu durumu güncellendi' });
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
  };

  const [privateMode, setPrivateMode] = useState<boolean>(storedSettings.privateMode);
  const [largeText, setLargeText] = useState<boolean>(storedSettings.largeText);
  const [notifications, setNotifications] = useState<boolean>(storedSettings.notifications);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(storedSettings.soundEnabled);
  const [soundType, setSoundType] = useState<SoundType>(storedSettings.soundType);
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(storedSettings.snoozeMinutes);
  const [leadTimeMinutes, setLeadTimeMinutes] = useState<number>(storedSettings.leadTimeMinutes);
  const [defaultStockThreshold, setDefaultStockThreshold] = useState<number>(storedSettings.defaultStockThreshold);
  const [stockAlertsEnabled, setStockAlertsEnabled] = useState<boolean>(storedSettings.stockAlertsEnabled);
  const [hideDoseAmount, setHideDoseAmount] = useState<boolean>(storedSettings.hideDoseAmount);
  const [autoCollapseTaken, setAutoCollapseTaken] = useState<boolean>(storedSettings.autoCollapseTaken);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(storedSettings.hapticsEnabled);
  const [repeatNagEnabled, setRepeatNagEnabled] = useState<boolean>(storedSettings.repeatNagEnabled ?? true);
  const [repeatNagCount, setRepeatNagCount] = useState<number>(storedSettings.repeatNagCount ?? 5);
  const [batteryExemptionEnabled, setBatteryExemptionEnabled] = useState<boolean>(storedSettings.batteryExemptionEnabled ?? true);
  const [exactAlarmEnabled, setExactAlarmEnabled] = useState<boolean>(storedSettings.exactAlarmEnabled ?? true);
  const [autoRescheduleOnBoot, setAutoRescheduleOnBoot] = useState<boolean>(storedSettings.autoRescheduleOnBoot ?? true);
  const [wakeScreenOnAlarm, setWakeScreenOnAlarm] = useState<boolean>(storedSettings.wakeScreenOnAlarm ?? true);
  const [activeSimulatedNotification, setActiveSimulatedNotification] = useState<{
    title: string;
    body: string;
    doseId?: string | number;
    time?: string;
    isRepeat?: boolean;
  } | null>(null);
  
  // Sync & Cloud states
  const [serverUrl, setServerUrl] = useState<string>(() => {
    try {
      const hostedOrigin = document.querySelector<HTMLMetaElement>('meta[name="reminder-api-origin"]')?.content;
      if (hostedOrigin) return hostedOrigin;
      const cfg = localStorage.getItem(STORAGE_KEY_SYNC_CONFIG);
      return restoreServerUrl(cfg ? JSON.parse(cfg)?.serverUrl : undefined);
    } catch { return DEFAULT_SYNC_SERVER_URL; }
  });
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
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    try {
      const cfg = localStorage.getItem(STORAGE_KEY_SYNC_CONFIG);
      return cfg ? !!JSON.parse(cfg).autoSync : false;
    } catch { return false; }
  });
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => {
    try {
      const cfg = localStorage.getItem(STORAGE_KEY_SYNC_CONFIG);
      return cfg ? JSON.parse(cfg).lastSyncAt || null : null;
    } catch { return null; }
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'testing' | 'syncing' | 'connected' | 'error'>('idle');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const keyboard = useKeyboard();
  const { bottomInset } = useKeyboardInsets();

  useEffect(() => {
    webLogger.init();
    const unsub = webLogger.subscribe(() => {
      setDiagnosticsLogs(webLogger.getLogs());
    });
    setDiagnosticsLogs(webLogger.getLogs());
    webLogger.info('System', 'Web prototip başlatıldı (Reminder Health v0.2.3)');
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SYNC_CONFIG,
        JSON.stringify({
          serverUrl,
          autoSync,
          lastSyncAt,
        })
      );
    } catch (e) {
      console.error('Failed to save sync config to localStorage', e);
    }
  }, [serverUrl, autoSync, lastSyncAt]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOSES, JSON.stringify(doses));
    } catch (e) {
      console.error('Failed to save doses to localStorage', e);
    }
  }, [doses]);

  useEffect(() => {
    try {
      const currentSettings: PrototypeSettings = {
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
        appointments,
        notifications,
        soundEnabled,
        soundType,
        snoozeMinutes,
        leadTimeMinutes,
        defaultStockThreshold,
        stockAlertsEnabled,
        hideDoseAmount,
        privateMode,
        largeText,
        autoCollapseTaken,
        hapticsEnabled,
        repeatNagEnabled,
        repeatNagCount,
        batteryExemptionEnabled,
        exactAlarmEnabled,
        autoRescheduleOnBoot,
        wakeScreenOnAlarm,
      };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(currentSettings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }, [
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
    appointments,
    notifications,
    soundEnabled,
    soundType,
    snoozeMinutes,
    leadTimeMinutes,
    defaultStockThreshold,
    stockAlertsEnabled,
    hideDoseAmount,
    privateMode,
    largeText,
    autoCollapseTaken,
    hapticsEnabled,
    repeatNagEnabled,
    repeatNagCount,
    batteryExemptionEnabled,
    exactAlarmEnabled,
    autoRescheduleOnBoot,
    wakeScreenOnAlarm,
  ]);

  type ScheduledSlot = {
    slotId: string;
    doseId: string | number;
    dose: Dose;
    time: string;
    status: 'pending' | 'taken' | 'skipped';
    todayAmount: string;
    cycleInfo: CycleInfo;
  };

  const unpausedDoses = doses.filter(d => !d.paused && !d.deletedAt);
  const offCycleDoses = unpausedDoses.filter(d => !getCycleInfo(d, '2026-09-06', language).isActiveToday);
  const activeTodayDoses = unpausedDoses.filter(d => getCycleInfo(d, '2026-09-06', language).isActiveToday);

  const todaySlots: ScheduledSlot[] = [];
  activeTodayDoses.forEach(d => {
    const info = getCycleInfo(d, '2026-09-06', language);
    const dTimes = d.times && d.times.length > 0 ? d.times : [d.time];
    dTimes.forEach(t => {
      const status = d.slotStatuses?.[t] ?? (t === d.time ? d.status : 'pending');
      todaySlots.push({
        slotId: `${d.id}_${t}`,
        doseId: d.id,
        dose: d,
        time: t,
        status,
        todayAmount: (d.slotAmounts?.[t]?.trim()) ? d.slotAmounts[t].trim() : info.todayAmount,
        cycleInfo: info,
      });
    });
  });
  todaySlots.sort((a, b) => a.time.localeCompare(b.time));

  const pendingSlots = todaySlots.filter(s => s.status === 'pending');
  const nextSlot = pendingSlots[0];
  const takenSlots = todaySlots.filter(s => s.status === 'taken');
  const recordedSlots = todaySlots.filter(s => s.status !== 'pending');

  const totalWeeklyTaken = takenSlots.length;
  const totalWeeklyTotal = todaySlots.length;
  const weeklyAdherence = totalWeeklyTotal > 0 ? Math.round((totalWeeklyTaken / totalWeeklyTotal) * 100) : 100;

  const change = (id: string | number, patch: Partial<Dose>, text: string) => {
    const previous = doses;
    setDoses(ds => ds.map(d => d.id === id ? {...d,...patch} : d));
    setToast({text,previous});
  };

  const takeSlot = (slot: ScheduledSlot) => {
    const { dose, time: slotTime, todayAmount } = slot;
    const deduct = parseDoseAmount(todayAmount);
    const currentStock = dose.stock ?? 10;
    const newStock = Math.max(0, Math.round((currentStock - deduct) * 10) / 10);
    const isCritical = newStock <= (dose.stockThreshold ?? 5);

    const prevStatuses = dose.slotStatuses ?? {};
    const updatedStatuses = { ...prevStatuses, [slotTime]: 'taken' as const };
    const allTimes = dose.times && dose.times.length > 0 ? dose.times : [dose.time];
    const allTaken = allTimes.every(t => (updatedStatuses[t] ?? (t === dose.time ? dose.status : 'pending')) === 'taken');

    change(
      dose.id,
      {
        status: allTaken ? 'taken' : dose.status,
        slotStatuses: updatedStatuses,
        snooze: undefined,
        stock: newStock,
      },
      `${dose.name} (${slotTime}) alındı · ${todayAmount} · Kalan: ${formatStock(newStock)} adet ${isCritical ? '⚠️ (Eczaneden yenileyin!)' : ''}`
    );
  };

  const skipSlot = (slot: ScheduledSlot) => {
    const { dose, time: slotTime } = slot;
    const prevStatuses = dose.slotStatuses ?? {};
    const updatedStatuses = { ...prevStatuses, [slotTime]: 'skipped' as const };
    change(
      dose.id,
      {
        slotStatuses: updatedStatuses,
        snooze: undefined,
      },
      `${dose.name} (${slotTime}) atlandı olarak kaydedildi`
    );
  };

  const revertSlot = (slot: ScheduledSlot) => {
    const { dose, time: slotTime, todayAmount } = slot;
    const deduct = parseDoseAmount(todayAmount);
    const currentStock = dose.stock ?? 0;
    const restoredStock = slot.status === 'taken' ? Math.round((currentStock + deduct) * 10) / 10 : currentStock;
    const prevStatuses = dose.slotStatuses ?? {};
    const updatedStatuses = { ...prevStatuses, [slotTime]: 'pending' as const };
    change(
      dose.id,
      {
        status: 'pending',
        slotStatuses: updatedStatuses,
        stock: restoredStock,
      },
      `${dose.name} (${slotTime}) kaydı geri alındı${slot.status === 'taken' ? ` · Stok iade edildi (${formatStock(restoredStock)})` : ''}`
    );
  };

  const takeNextDose = () => {
    if (!nextSlot) return;
    takeSlot(nextSlot);
  };

  const deleteMedicine = (id: string | number) => {
    keyboard.hide();
    const previous = doses;
    const target = doses.find(d => d.id === id);
    webLogger.breadcrumb(`İlaç silindi: ${target?.name ?? id}`);
    setDoses(ds => ds.map(d => d.id === id ? { ...d, deletedAt: Date.now(), updatedAt: Date.now() } : d));
    closeEditor();
    setTab('İlaçlarım');
    setToast({ text: `${target?.name ?? 'İlaç'} silindi`, previous });
  };

  const navigate = (nextTab: Tab) => {
    keyboard.hide();
    webLogger.breadcrumb(`Sekme değiştirildi: ${nextTab}`);
    setTab(nextTab);
    setSettingsSubPage('main');
    if (nextTab === 'Geçmiş') {
      setSelectedHistoryDate(6);
    }
    setEditor(null);
    setToast(null);
  };

  const openEditor = (dose?: Dose) => {
    keyboard.hide();
    setEditor(dose ?? {});
    setName(dose?.name ?? '');
    setAmount(dose?.amount ?? '1 tablet');
    const medTimes = dose?.times && dose.times.length > 0 ? dose.times : [dose?.time ?? '09:00'];
    setTimes(medTimes);
    setDoseCount(medTimes.length);
    setSlotAmounts(dose?.slotAmounts ? { ...dose.slotAmounts } : {});
    setTime(medTimes[0] ?? '09:00');
    setMealCondition(dose?.mealCondition ?? 'tok');
    setFormType(dose?.form ?? 'tablet');
    setInstructions(dose?.instructions ?? '');
    setStock(String(dose?.stock ?? 30));
    setStockThreshold(String(dose?.stockThreshold ?? 5));
    setFrequencyType(dose?.frequencyType ?? 'everyday');
    setCyclePhase1Days(String(dose?.cyclePhase1Days ?? (dose?.frequencyType === 'cycle' ? 3 : 4)));
    setCyclePhase1Amount(dose?.cyclePhase1Amount ?? (dose?.amount ?? '1.5 tablet'));
    setCyclePhase2Days(String(dose?.cyclePhase2Days ?? (dose?.frequencyType === 'cycle' ? 4 : 3)));
    setCyclePhase2Amount(dose?.cyclePhase2Amount ?? (dose?.frequencyType === 'cycle' ? '0 (Ara)' : '1 tablet'));
    setCycleStartDate(dose?.cycleStartDate ?? '2026-09-01');
    setCurrentGTIN(dose?.gtin ?? null);
    setCurrentExpiryDate(dose?.expiryDate ?? null);
    setCurrentBatchNo(null);
    setError('');
    setToast(null);
  };

  const handleBarcodeScanned = (scannedString: string) => {
    keyboard.hide();
    const parsed = parseITSKarekod(scannedString);
    if (!parsed) {
      setError('Geçerli bir ITS Karekod veya Barkod bulunamadı.');
      setScannerOpen(false);
      return;
    }

    setCurrentGTIN(parsed.gtin);
    if (parsed.expiryDate) {
      setCurrentExpiryDate(parsed.expiryDate);
    }
    if (parsed.batchNo) {
      setCurrentBatchNo(parsed.batchNo);
    }

    const foundMed = findMedicineByGTIN(parsed.gtin, learnedMeds);
    if (foundMed) {
      setName(foundMed.name);
      setAmount(foundMed.amount);
      setFormType(foundMed.form);
      setMealCondition(foundMed.mealCondition);
      if (foundMed.instructions) {
        setInstructions(foundMed.instructions);
      }
      if (foundMed.defaultStock) {
        setStock(String(foundMed.defaultStock));
      }
      if (foundMed.stockThreshold) {
        setStockThreshold(String(foundMed.stockThreshold));
      }
    }

    setScannerOpen(false);
  };

  const handleDoseCountChange = (count: number) => {
    setDoseCount(count);
    const defaults = ['08:00', '14:00', '20:00'];
    const newTimes = [...times];
    while (newTimes.length < count) {
      newTimes.push(defaults[newTimes.length] || '12:00');
    }
    setTimes(newTimes.slice(0, count));
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...times];
    updated[index] = val;
    setTimes(updated);
    if (index === 0) setTime(val);
  };

  const stepTime = (index: number, delta: number) => {
    const current = times[index] || '08:00';
    const [h = '8', m = '0'] = current.split(':');
    let total = parseInt(h, 10) * 60 + parseInt(m, 10) + delta;
    while (total < 0) total += 24 * 60;
    total = total % (24 * 60);
    const newH = String(Math.floor(total / 60)).padStart(2, '0');
    const newM = String(total % 60).padStart(2, '0');
    handleTimeChange(index, `${newH}:${newM}`);
  };

  const applyCyclePreset = (p1Days: number, p1Amt: string, p2Days: number, p2Amt: string, type: FrequencyType) => {
    setFrequencyType(type);
    setCyclePhase1Days(String(p1Days));
    setCyclePhase1Amount(p1Amt);
    setCyclePhase2Days(String(p2Days));
    setCyclePhase2Amount(p2Amt);
    if (type === 'variable') {
      setAmount(p1Amt);
    }
  };

  const closeEditor = () => {
    keyboard.hide();
    setEditor(null);
    setCurrentGTIN(null);
    setCurrentExpiryDate(null);
    setCurrentBatchNo(null);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    keyboard.hide();
    const effectiveTimes = times.slice(0, doseCount);
    const hasInvalidTime = effectiveTimes.some(t => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.trim()));
    if (!name.trim() || !amount.trim() || hasInvalidTime) {
      setError('İlaç adı, doz ve tüm saatleri (09:00 gibi) eksiksiz gir.');
      return;
    }
    const previous = doses;
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
      time: effectiveTimes[0],
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
      cycleStartDate,
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
      try {
        localStorage.setItem(STORAGE_KEY_LEARNED_MEDS, JSON.stringify(updatedLearned));
      } catch (e) {
        console.error('Failed to save learned meds', e);
      }
    }

    if (editor?.id) setDoses(ds => ds.map(d => d.id === editor.id ? {...d,...patch} : d));
    else setDoses(ds => [...ds,{id:newId(),...patch,status:'pending',slotStatuses:{}}]);
    closeEditor(); setTab('İlaçlarım'); setToast({text:editor?.id ? 'İlaç güncellendi' : 'İlaç planına eklendi',previous});
  };

  // Sync Action Handlers

  const accountSnapshot = (): Snapshot => ({doses, learnedMeds, settings: {userName, doctorName, doctorSpecialty, doctorHospital, doctorPhone, doctorNextAppointment, doctorAppointmentTime, doctorApptLeadOptions, doctorBloodTestDate, doctorNotes, appointments: JSON.stringify(appointments), notifications, soundEnabled, soundType, snoozeMinutes}});
  const bindAccount = async (next: Session) => {
    switchingAccount.current = true;
    try {
      const before = doses;
      const snapshot = await switchAccount(localStore, serverUrl, next.user, accountSnapshot());
      await finishSwitch(localStore, {doses:STORAGE_KEY_DOSES, learned:STORAGE_KEY_LEARNED_MEDS, settings:STORAGE_KEY_SETTINGS});
      
      setDoses(snapshot.doses);
      setLearnedMeds(snapshot.learnedMeds);
      setUserName(snapshot.settings.userName || '');
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
      if (snapshot.settings.appointments) {
        try {
          const appts = typeof snapshot.settings.appointments === 'string'
            ? JSON.parse(snapshot.settings.appointments)
            : snapshot.settings.appointments;
          if (Array.isArray(appts)) setAppointments(appts);
        } catch {}
      }
      setNotifications(snapshot.settings.notifications ?? true);
      setSoundEnabled(snapshot.settings.soundEnabled ?? true);
      setSoundType(snapshot.settings.soundType || 'default');
      setSnoozeMinutes(snapshot.settings.snoozeMinutes ?? 10);
      setToast(null);
      setLastSyncAt(null);
      setSession(next);
    } finally { switchingAccount.current = false; }
  };
  const handleRegister = async () => {
    keyboard.hide();
    setAuthBusy(true);
    try {
      const res = await registerAccount(serverUrl, userName || 'Aykut', authEmail.trim() || undefined);
      await bindAccount(res);
      setActiveSyncCode(res.syncCode);
      setRecoveredCredentials({ syncCode: res.syncCode, recoveryKey: res.recoveryKey });
      setSyncStatusMsg(`${res.user.name} için yeni eşitleme kodu oluşturuldu`);
      setSyncStatus('connected');
    } catch (err: any) {
      setSyncStatusMsg(err.message || 'Hesap oluşturulamadı.');
      setSyncStatus('error');
    } finally {
      setAuthBusy(false);
    }
  };
  const handleUpdateEmail = async () => {
    if (!authEmail.trim()) return;
    keyboard.hide();
    setAuthBusy(true);
    try {
      const res = await updateUserEmail(serverUrl, authEmail.trim(), session || undefined);
      if (session) {
        setSession({ ...session, user: { ...session.user, email: res.email } });
      }
      setEditingEmail(false);
      setToast({ text: t.syncEmailSaved });
      setTimeout(() => setToast(null), 2500);
      setSyncStatusMsg(t.syncEmailSaved);
    } catch (err: any) {
      setSyncStatusMsg(err.message || 'E-posta kaydedilemedi');
      setSyncStatus('error');
    } finally {
      setAuthBusy(false);
    }
  };
  const handleLogin = async () => {
    keyboard.hide();
    setAuthBusy(true);
    try {
      const next = await login(serverUrl, syncCode);
      const code = syncCode;
      setSyncCode('');
      await bindAccount(next);
      setActiveSyncCode(code);
      setSyncStatusMsg(`${next.user.name} hesabına bağlandı`);
      setSyncStatus('connected');
    } catch (err:any) { setSyncStatusMsg(err.message || 'Bağlantı başarısız.'); setSyncStatus('error'); }
    finally { setAuthBusy(false); }
  };
  const handleRecover = async () => {
    keyboard.hide();
    setAuthBusy(true);
    try {
      const res = await recover(serverUrl, recoveryKey);
      setRecoveryKey('');
      setRecoveryMode(false);
      await bindAccount(res);
      setActiveSyncCode(res.newSyncCode);
      setRecoveredCredentials({ syncCode: res.newSyncCode, recoveryKey: res.newRecoveryKey });
      setSyncStatusMsg(`${res.user.name} hesabı kurtarıldı`);
      setSyncStatus('connected');
    } catch (err: any) {
      setSyncStatusMsg(err.message || 'Kurtarma başarısız.');
      setSyncStatus('error');
    } finally {
      setAuthBusy(false);
    }
  };
  const handleLogout = async () => {
    keyboard.hide();
    setAuthBusy(true);
    try { if(session) await logout(serverUrl, session); }
    catch { setSyncStatusMsg('Sunucuya ulaşılamadı. Oturumu kapatmak için bağlantıyı kontrol edin.'); return; }
    finally { setAuthBusy(false); }
    setSession(null); setActiveSyncCode(null); setSyncCode(''); setSyncStatusMsg('Bağlantı kapatıldı. Yerel kayıtlar bu cihazda korunuyor.');
  };
  useEffect(() => {
    let active = true;
    setSession(null);
    getSession(serverUrl).then(async next => {
      if(active) {
        setAuthBusy(true);
        try {
          await bindAccount(next);
          const savedCode = getStoredSyncCode();
          if (active) setActiveSyncCode(savedCode);
        } finally {setAuthBusy(false);}
      }
    }).catch(() => {});
    return () => {active=false;};
  }, [serverUrl]);

  const handleTestConnection = async () => {
    keyboard.hide();
    setSyncStatus('testing');
    setSyncStatusMsg('Sunucuya bağlanılıyor...');
    const result = await checkServerHealth(serverUrl);
    if (result.ok) {
      setSyncStatus('connected');
      setSyncStatusMsg(`Sunucu Çevrimiçi (v${result.version} · ${result.latencyMs}ms)`);
      setToast({ text: 'Sunucu bağlantısı başarılı' });
    } else {
      setSyncStatus('error');
      setSyncStatusMsg(`Bağlanılamadı: ${result.error}`);
      setToast({ text: 'Bağlantı başarısız' });
    }
  };

  const handleSyncNow = async () => {
    keyboard.hide();
    webLogger.breadcrumb(`Sunucu eşitlemesi başlatıldı: ${serverUrl}`);
    setSyncStatus('syncing');
    setSyncStatusMsg('Eşitleniyor...');
    try {
      if (!session) throw new Error('Önce kişisel eşitleme kodunuzla bağlanın.');
      await assertAccount(localStore, serverUrl, session.user);
      const currentSession = await getSession(serverUrl);
      if (currentSession.user.id !== session.user.id) throw new Error('Hesap değişti; yeniden bağlanın.');
      const payloadSettings: Record<string, any> = {
        notifications,
        soundEnabled,
        soundType,
        snoozeMinutes,
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

      const response = await authRequest(serverUrl, '/api/sync', {
        doses: doses.map(d => ({ ...d, updatedAt: d.updatedAt || Date.now() })),
        learnedMeds,
        settings: payloadSettings,
      }, currentSession);

      if (response.success) {
        const merged = smartMergeDoses(doses as SyncDose[], response.doses);
        setDoses(merged);
        if (response.learnedMeds) {
          setLearnedMeds(prev => ({ ...prev, ...response.learnedMeds }));
        }
        if (response.settings) {
          if (response.settings.userName) setUserName(response.settings.userName);
          if (response.settings.appointments !== undefined) {
            try {
              const appts = typeof response.settings.appointments === 'string'
                ? JSON.parse(response.settings.appointments)
                : response.settings.appointments;
              if (Array.isArray(appts)) {
                setAppointments(appts);
                const active = appts.filter(a => !a.completed).sort((a, b) => (a.date + ' ' + (a.time || '13:00')).localeCompare(b.date + ' ' + (b.time || '13:00')))[0];
                if (active) {
                  setDoctorName(active.doctorName || '');
                  setDoctorSpecialty(active.specialty || '');
                  setDoctorHospital(active.hospital || '');
                  setDoctorPhone(active.phone || '');
                  setDoctorNextAppointment(active.date || '');
                  setDoctorAppointmentTime(active.time || '13:00');
                  setDoctorApptLeadOptions(active.leadOptions || ['1d', '0d']);
                  setDoctorBloodTestDate(active.hasBloodTest ? (active.bloodTestDate || '') : '');
                  setDoctorNotes(active.notes || '');
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
        }
        const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncAt(nowStr);
        setSyncStatus('connected');
        const activeCount = response.doses.filter((d: SyncDose) => !d.deletedAt).length;
        setSyncStatusMsg(`Eşitlendi (${activeCount} aktif ilaç)`);
        setToast({ text: 'Eşitleme tamamlandı' });
        webLogger.info('Sync', `Sunucu ile eşitlendi (${activeCount} aktif ilaç)`);
      } else {
        setSyncStatus('error');
        setSyncStatusMsg(response.message || 'Eşitleme başarısız');
        webLogger.warn('Sync', `Sunucu yanıtı başarısız: ${response.message}`, { serverUrl });
      }
    } catch (err: any) {
      setSyncStatus('error');
      setSyncStatusMsg(err.message || 'Bağlantı hatası');
      setToast({ text: 'Eşitleme başarısız oldu' });
      webLogger.error('Sync', 'Sunucu bağlantı hatası', err, { serverUrl });
    }
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
  }> | unknown) => {
    if (session) {
      const isObj = overrides && typeof overrides === 'object' && !('nativeEvent' in overrides);
      const o = isObj ? (overrides as any) : {};
      const activeUserName = (o.userName !== undefined ? o.userName : userName).trim();
      const activeDocName = (o.doctorName !== undefined ? o.doctorName : doctorName).trim();
      const activeDocSpecialty = (o.doctorSpecialty !== undefined ? o.doctorSpecialty : doctorSpecialty).trim();
      const activeDocHospital = (o.doctorHospital !== undefined ? o.doctorHospital : doctorHospital).trim();
      const activeDocPhone = (o.doctorPhone !== undefined ? o.doctorPhone : doctorPhone).trim();
      const activeNextAppt = o.doctorNextAppointment !== undefined ? o.doctorNextAppointment : doctorNextAppointment;
      const activeApptTime = o.doctorAppointmentTime !== undefined ? o.doctorAppointmentTime : doctorAppointmentTime;
      const activeLeadOpts = o.doctorApptLeadOptions !== undefined ? o.doctorApptLeadOptions : doctorApptLeadOptions;
      const activeBloodDate = o.doctorBloodTestDate !== undefined ? o.doctorBloodTestDate : doctorBloodTestDate;
      const activeNotes = (o.doctorNotes !== undefined ? o.doctorNotes : doctorNotes).trim();
      const activeAppts = o.appointments !== undefined ? o.appointments : appointments;
      authRequest(serverUrl, '/api/sync', {
        settings: {
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
        }
      }, session).catch(() => {});
    }
  };

  const handleShareMedList = () => {
    const activeMeds = doses.filter(d => !d.paused);
    let text = `📋 ${t.doctorShareSubject}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    if (userName.trim()) text += `👤 ${language === 'en' ? 'Patient' : 'Hasta'}: ${userName.trim()}\n`;
    if (doctorName.trim()) text += `👨‍⚕️ ${t.doctorNameLabel}: ${doctorName.trim()}\n`;
    if (doctorSpecialty.trim()) text += `🩺 ${t.doctorSpecialtyLabel}: ${doctorSpecialty.trim()}\n`;
    if (doctorHospital.trim()) text += `🏥 ${t.doctorHospitalLabel}: ${doctorHospital.trim()}\n`;
    text += `📅 ${language === 'en' ? 'Date' : 'Tarih'}: ${today}\n\n`;

    text += `💊 ${t.doctorShareActiveMeds} (${activeMeds.length}):\n`;
    if (activeMeds.length === 0) {
      text += `  • ${t.doctorShareNoMeds}\n`;
    } else {
      activeMeds.forEach((m, idx) => {
        const times = Array.isArray(m.times) && m.times.length > 0 ? m.times.join(', ') : (m.time || '-');
        const stockInfo = m.stock !== undefined ? ` [${language === 'en' ? 'Stock' : 'Stok'}: ${m.stock}]` : '';
        text += `${idx + 1}. ${m.name} (${m.amount || '1 doz'})\n`;
        text += `   ⏰ ${times}${stockInfo}\n`;
        if (m.instructions) text += `   ℹ️ ${m.instructions}\n`;
      });
    }

    if (doctorNextAppointment) {
      const timePart = doctorAppointmentTime ? ` (${doctorAppointmentTime})` : '';
      text += `\n🗓️ ${t.doctorAppointmentLabel}: ${doctorNextAppointment}${timePart}\n`;
    }
    if (doctorBloodTestDate) {
      text += `🧪 ${t.doctorBloodTestLabel}: ${doctorBloodTestDate}\n`;
    }
    if (doctorNotes.trim()) {
      text += `\n📝 ${t.doctorNotesSection}:\n${doctorNotes.trim()}\n`;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setToast({ text: t.doctorShareSubject + ' panoya kopyalandı' });
      }).catch(() => {
        setToast({ text: 'Paylaşım panoya kopyalanamadı' });
      });
    } else {
      setToast({ text: t.doctorShareSubject + ' hazırlandı' });
    }
  };

  const handleExportBackup = () => {
    keyboard.hide();
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
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reminder_health_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ text: 'Yedek JSON dosyası indirildi' });
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateBackupJSON(content);
      if (!validation.valid || !validation.data) {
        alert(validation.error || 'Geçersiz yedekleme dosyası.');
        return;
      }
      const data = validation.data;
      if (!session || (data.version === 2 ? data.ownerId !== session.user.id : !session.user.legacyOwner)) { alert('Bu yedeğin hesabına kodla bağlanın.'); return; }
      if (confirm(`Yedek dosyasından ${data.doses.length} ilaç ve ayarlar geri yüklensin mi?`)) {
        setDoses(migrateDoseIds(data.doses, session.user.id));
        if (data.learnedMeds) setLearnedMeds(data.learnedMeds);
        if (data.settings?.userName) setUserName(data.settings.userName);
        setToast({ text: `Yedekten ${data.doses.length} ilaç geri yüklendi` });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const medicineRow = (dose: Dose) => {
    const FormIcon = formIcons[dose.form ?? 'tablet'] ?? Pill;
    const meal = mealLabels[dose.mealCondition ?? 'tok'];
    const isLow = (dose.stock ?? 10) <= (dose.stockThreshold ?? 5);
    const medTimes = dose.times && dose.times.length > 0 ? dose.times : [dose.time];
    const cycleInfo = getCycleInfo(dose, '2026-09-06');

    let regimenSummary = 'Her gün';
    if (dose.frequencyType === 'alternate') regimenSummary = 'Gün aşırı';
    else if (dose.frequencyType === 'cycle') regimenSummary = `${dose.cyclePhase1Days || 3} gün al / ${dose.cyclePhase2Days || 4} gün ara`;
    else if (dose.frequencyType === 'variable') regimenSummary = `${dose.cyclePhase1Days || 4} gün ${dose.cyclePhase1Amount || '1.5 tablet'} / ${dose.cyclePhase2Days || 3} gün ${dose.cyclePhase2Amount || '1 tablet'}`;

    return (
      <button
        className="dose-row medicine-row"
        key={dose.id}
        onClick={() => openEditor(dose)}
        aria-label={`${dose.name} düzenle`}
      >
        <span className="row-time">{medTimes.join(', ')}</span>
        <span className="row-main">
          <strong>{dose.name}</strong>
          <small>
            {dose.amount} · {meal} · {regimenSummary}
            {dose.expiryDate ? ` · SKT: ${dose.expiryDate}` : ''}
            {dose.stock !== undefined ? ` · ${formatStock(dose.stock)} adet kaldı${isLow ? ' ⚠️' : ''}` : ''}
            {dose.instructions ? ` · ${dose.instructions}` : ''}
            {dose.paused ? ' · Duraklatıldı' : ''}
          </small>
        </span>
        <div className="row-actions-edit">
          <span className={`cycle-tag ${cycleInfo.phaseType === 'off' ? 'off' : ''}`} title={cycleInfo.phaseLabel}>
            {cycleInfo.phaseType === 'off' ? 'Ara gününde' : cycleInfo.phaseLabel}
          </span>
          <span className={`stock-pill ${isLow ? 'low' : ''}`} title={`Kalan stok: ${formatStock(dose.stock)} adet`}>
            {isLow ? <Warning size={13} weight="bold"/> : <Package size={13}/>}
            <span>{formatStock(dose.stock)}</span>
          </span>
          <span className="row-form-tag" title={formLabels[dose.form ?? 'tablet']}><FormIcon size={16}/></span>
          <PencilSimple size={20}/>
        </div>
      </button>
    );
  };

  const slotRow = (slot: ScheduledSlot) => {
    const isLow = (slot.dose.stock ?? 10) <= (slot.dose.stockThreshold ?? 5);
    const meal = mealLabels[slot.dose.mealCondition ?? 'tok'];
    return (
      <button
        className="dose-row"
        key={slot.slotId}
        onClick={() => slot.status !== 'pending' ? revertSlot(slot) : setSnoozing(slot.dose)}
        aria-label={`${slot.dose.name}, ${slot.status === 'taken' ? 'Alındı' : slot.status === 'skipped' ? 'Atlandı' : 'Bekliyor'}${slot.status !== 'pending' ? ', kaydı geri al' : ''}`}
      >
        <span className="row-time">{slot.time}</span>
        <span className="row-main">
          <strong>{slot.dose.name}</strong>
          <small>
            {slot.todayAmount} · {meal}
            {slot.dose.frequencyType && slot.dose.frequencyType !== 'everyday' ? ` · ${slot.cycleInfo.phaseLabel}` : ''}
            {slot.dose.stock !== undefined ? ` · ${formatStock(slot.dose.stock)} adet kaldı${isLow ? ' ⚠️' : ''}` : ''}
            {slot.dose.instructions ? ` · ${slot.dose.instructions}` : ''}
          </small>
        </span>
        <span className={`status ${slot.status}`}>
          {slot.status === 'taken' ? <CheckCircle size={20}/> : slot.status === 'skipped' ? <Prohibit size={20}/> : <Clock size={20}/>}
          <span>{slot.status === 'taken' ? 'Alındı' : slot.status === 'skipped' ? 'Atlandı' : slot.dose.snooze ? `${slot.dose.snooze} dk sonra` : 'Bekliyor'}</span>
        </span>
      </button>
    );
  };

  const resetAllData = () => {
    keyboard.hide();
    try {
      localStorage.removeItem(STORAGE_KEY_DOSES);
      localStorage.removeItem(STORAGE_KEY_SETTINGS);
      localStorage.removeItem(STORAGE_KEY_LEARNED_MEDS);
    } catch (e) {
      console.error('Failed to reset storage', e);
    }
    setDoses(initial);
    setLearnedMeds({});
    setUserName(DEFAULT_SETTINGS.userName);
    setDoctorName(DEFAULT_SETTINGS.doctorName || '');
    setDoctorSpecialty(DEFAULT_SETTINGS.doctorSpecialty || '');
    setDoctorHospital(DEFAULT_SETTINGS.doctorHospital || '');
    setDoctorPhone(DEFAULT_SETTINGS.doctorPhone || '');
    setDoctorNextAppointment(DEFAULT_SETTINGS.doctorNextAppointment || '');
    setDoctorNotes(DEFAULT_SETTINGS.doctorNotes || '');
    setPrivateMode(DEFAULT_SETTINGS.privateMode);
    setLargeText(DEFAULT_SETTINGS.largeText);
    setNotifications(DEFAULT_SETTINGS.notifications);
    setSoundEnabled(DEFAULT_SETTINGS.soundEnabled);
    setSoundType(DEFAULT_SETTINGS.soundType);
    setSnoozeMinutes(DEFAULT_SETTINGS.snoozeMinutes);
    setLeadTimeMinutes(DEFAULT_SETTINGS.leadTimeMinutes);
    setDefaultStockThreshold(DEFAULT_SETTINGS.defaultStockThreshold);
    setStockAlertsEnabled(DEFAULT_SETTINGS.stockAlertsEnabled);
    setHideDoseAmount(DEFAULT_SETTINGS.hideDoseAmount);
    setAutoCollapseTaken(DEFAULT_SETTINGS.autoCollapseTaken);
    setHapticsEnabled(DEFAULT_SETTINGS.hapticsEnabled);
    setRepeatNagEnabled(DEFAULT_SETTINGS.repeatNagEnabled);
    setRepeatNagCount(DEFAULT_SETTINGS.repeatNagCount);
    setBatteryExemptionEnabled(DEFAULT_SETTINGS.batteryExemptionEnabled);
    setExactAlarmEnabled(DEFAULT_SETTINGS.exactAlarmEnabled);
    setAutoRescheduleOnBoot(DEFAULT_SETTINGS.autoRescheduleOnBoot);
    setWakeScreenOnAlarm(DEFAULT_SETTINGS.wakeScreenOnAlarm);
    setActiveSimulatedNotification(null);
    setToast({ text: 'Tüm veriler ve ayarlar varsayılana sıfırlandı' });
  };

  return <div className={`reminder-app${largeText ? ' large-text' : ''}`}>
    {activeSimulatedNotification && (
      <div className="simulated-push-banner" role="alert">
        <div className="simulated-push-header">
          <div className="simulated-push-app">
            <Bell size={13} weight="fill" />
            <span>{activeSimulatedNotification.isRepeat ? '⚠️ REMINDER HEALTH · TEKRAR UYARISI (+3 DK)' : 'REMINDER HEALTH · BİLDİRİM'}</span>
          </div>
          <button
            type="button"
            className="simulated-push-close"
            onClick={() => setActiveSimulatedNotification(null)}
            aria-label="Kapat"
          >
            <X size={14} />
          </button>
        </div>
        <div className="simulated-push-title">{activeSimulatedNotification.title}</div>
        <div className="simulated-push-body">
          {activeSimulatedNotification.body.split('\n').map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
        <div className="simulated-push-actions">
          <button
            type="button"
            className="sim-action-btn take"
            onClick={() => {
              const targetSlot = (activeSimulatedNotification.doseId && activeSimulatedNotification.time)
                ? (todaySlots.find(s => s.doseId === activeSimulatedNotification.doseId && s.time === activeSimulatedNotification.time) ?? todaySlots[0])
                : todaySlots[0];
              if (targetSlot) {
                takeSlot(targetSlot);
              }
              setActiveSimulatedNotification(null);
              setToast({ text: '✅ İlaç alındı olarak işaretlendi' });
            }}
          >
            <Check size={14} weight="bold" />
            <span>İlaç İçildi</span>
          </button>
          <button
            type="button"
            className="sim-action-btn snooze"
            onClick={() => {
              const targetSlot = (activeSimulatedNotification.doseId && activeSimulatedNotification.time)
                ? (todaySlots.find(s => s.doseId === activeSimulatedNotification.doseId && s.time === activeSimulatedNotification.time) ?? todaySlots[0])
                : todaySlots[0];
              if (targetSlot) {
                change(targetSlot.dose.id, { snooze: 3 }, `⏱️ ${targetSlot.dose.name} (${targetSlot.time}) 3 dakika ertelendi`);
                // Web prototipi için 8 saniye sonra erteleme uyarısını tekrar tetikle
                setTimeout(() => {
                  setDoses(currentDoses => {
                    const d = currentDoses.find(x => x.id === targetSlot.dose.id);
                    const s = d?.slotStatuses?.[targetSlot.time] ?? d?.status;
                    if (s === 'taken' || s === 'skipped') {
                      return currentDoses; // Already taken, do not pop simulated notification!
                    }
                    setActiveSimulatedNotification({
                      title: `⏱️ Erteleme: ${targetSlot.dose.name} Vakti`,
                      body: `3 dakikalık erteleme süresi doldu.\nLütfen ilacınızı alınız ve onaylayınız.`,
                      doseId: targetSlot.dose.id,
                      time: targetSlot.time,
                      isRepeat: true,
                    });
                    setToast({ text: `⏱️ Erteleme süresi doldu: ${targetSlot.dose.name} tekrar uyarılıyor` });
                    return currentDoses;
                  });
                }, 8000);
              } else {
                setToast({ text: '⏱️ Hatırlatıcı 3 dakika ertelendi' });
              }
              setActiveSimulatedNotification(null);
            }}
          >
            <Clock size={14} />
            <span>3 Dk Ertele</span>
          </button>
          <button
            type="button"
            className="sim-action-btn skip"
            onClick={() => {
              const targetSlot = (activeSimulatedNotification.doseId && activeSimulatedNotification.time)
                ? (todaySlots.find(s => s.doseId === activeSimulatedNotification.doseId && s.time === activeSimulatedNotification.time) ?? todaySlots[0])
                : todaySlots[0];
              if (targetSlot) {
                skipSlot(targetSlot);
              }
              setActiveSimulatedNotification(null);
              setToast({ text: '❌ İlaç atlandı olarak işaretlendi' });
            }}
          >
            <Prohibit size={14} />
            <span>Atla</span>
          </button>
        </div>
      </div>
    )}
    <MobileScroll className="app-screen" key={editor ? 'editor' : tab}>
      <main className={`screen-content ${editor ? 'editor-screen' : ''}`}>
        {editor ? <>
          <header className="edit-header"><button className="icon-button" onClick={closeEditor} aria-label="Geri"><ArrowLeft size={24}/></button><h1>{editor.id ? 'İlacı düzenle' : 'İlaç ekle'}</h1></header>
          <p className="intro">Kendi kullanım planını ekle.</p>
          <form id="medicine-form" onSubmit={save} className="med-form">
            {/* Scan Barcode / Karekod Button */}
            <button
              type="button"
              className="scan-barcode-web-btn"
              onClick={() => {
                keyboard.hide();
                setScannerOpen(true);
              }}
            >
              <div className="scan-icon-circle">
                <Camera size={20} weight="bold" />
              </div>
              <div className="scan-btn-text">
                <strong>Karekod / Kutu Tara (ITS)</strong>
                <small>Kutudaki DataMatrix karekoddan adı ve SKT'yi otomatik doldur</small>
              </div>
              <CaretRight size={18} color="#a9dfca" style={{ marginLeft: 'auto' }} />
            </button>

            {/* Scanned Barcode Info Badge */}
            {currentGTIN && (
              <div className="scanned-badge-card">
                <ShieldCheck size={20} color="#34d399" weight="fill" />
                <div className="scanned-badge-info">
                  <strong>ITS Karekod Eşleşti</strong>
                  <span>Barkod: {currentGTIN} {currentExpiryDate ? `· SKT: ${currentExpiryDate}` : ''}</span>
                </div>
                <button
                  type="button"
                  className="scanned-badge-clear"
                  onClick={() => {
                    setCurrentGTIN(null);
                    setCurrentExpiryDate(null);
                    setCurrentBatchNo(null);
                  }}
                  aria-label="Karekod bilgisini temizle"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <label>İlaç adı<KeyboardInput autoComplete="off" value={name} onChange={e=>setName(e.target.value)} placeholder="İlaç adı" maxLength={60}/></label>
            <div className="dose-input-group">
              <label>
                Doz miktarı
                <KeyboardInput value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Örn. 1 tablet veya 1.5 tablet" maxLength={40}/>
              </label>
              <div className="amount-quick-chips">
                {['0.5 tablet', '1 tablet', '1.5 tablet', '2 tablet'].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    className={`mini-amount-btn ${amount === amt ? 'active' : ''}`}
                    onClick={() => {
                      setAmount(amt);
                      if (frequencyType === 'variable') setCyclePhase1Amount(amt);
                    }}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field-group">
              <span className="group-label">İlaç Formu</span>
              <div className="chip-selector">
                {(['tablet', 'kapsul', 'damla', 'surup'] as const).map(f => {
                  const Icon = formIcons[f];
                  return (
                    <button
                      key={f}
                      type="button"
                      className={`chip-btn ${formType === f ? 'active' : ''}`}
                      onClick={() => setFormType(f)}
                    >
                      <Icon size={16} />
                      <span>{formLabels[f]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-field-group">
              <span className="group-label">Açlık / Tokluk Durumu</span>
              <div className="chip-selector">
                {(['tok', 'ac', 'yemekle', 'farketmez'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`chip-btn ${mealCondition === m ? 'active' : ''}`}
                    onClick={() => setMealCondition(m)}
                  >
                    <ForkKnife size={15} />
                    <span>{mealLabels[m]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Günlük Doz Sıklığı */}
            <div className="form-field-group">
              <span className="group-label">Günlük Doz Sıklığı</span>
              <div className="chip-selector">
                {[1, 2, 3].map(count => (
                  <button
                    key={count}
                    type="button"
                    className={`chip-btn ${doseCount === count ? 'active' : ''}`}
                    onClick={() => handleDoseCountChange(count)}
                  >
                    <Clock size={16} />
                    <span>Günde {count} Kez</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dinamik Saat Girişleri (Numatör & Kolay Fokus) */}
            <div className="time-slots-grid">
              {Array.from({ length: doseCount }).map((_, idx) => {
                const currentTime = times[idx] ?? (idx === 0 ? '08:00' : idx === 1 ? '14:00' : '20:00');
                return (
                  <div key={idx} className="time-slot-card-box" style={{ background: '#0e1823', padding: '10px', borderRadius: '10px', border: '1px solid #1a2836', marginBottom: '8px' }}>
                    <DualTimeInput
                      label={doseCount === 1 ? 'Hatırlatma saati' : `${idx + 1}. Doz saati`}
                      value={currentTime}
                      onChange={val => handleTimeChange(idx, val)}
                      onStep={delta => stepTime(idx, delta)}
                    />
                    {doseCount > 1 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '11px', color: '#8899a8' }}>{t.slotAmountLabel}</span>
                          {slotAmounts[currentTime]?.trim() && (
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', color: '#ff9696', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                              onClick={() => setSlotAmounts(prev => { const n = { ...prev }; delete n[currentTime]; return n; })}
                            >
                              {language === 'en' ? 'Reset' : 'Sıfırla'}
                            </button>
                          )}
                        </div>
                        <KeyboardInput
                          value={slotAmounts[currentTime] ?? ''}
                          onChange={e => setSlotAmounts(prev => ({ ...prev, [currentTime]: e.target.value }))}
                          placeholder={amount ? `${amount} (${language === 'en' ? 'default' : 'varsayılan'})` : t.slotAmountPlaceholder}
                          maxLength={30}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Kullanım Düzeni & Döngü */}
            <div className="form-field-group">
              <span className="group-label">Kullanım Düzeni & Döngü</span>
              <div className="chip-selector cycle-type-selector">
                {[
                  { type: 'everyday' as const, label: 'Her gün', icon: CalendarDots },
                  { type: 'alternate' as const, label: 'Gün aşırı', icon: ClockCounterClockwise },
                  { type: 'cycle' as const, label: 'Al / Ara Döngüsü', icon: ArrowsClockwise },
                  { type: 'variable' as const, label: 'Değişken Doz', icon: TrendUp },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      className={`chip-btn ${frequencyType === opt.type ? 'active' : ''}`}
                      onClick={() => setFrequencyType(opt.type)}
                    >
                      <Icon size={16} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alım & Ara Döngüsü (Örn: 3 gün al / 4 gün ara) */}
            {frequencyType === 'cycle' && (
              <div className="cycle-config-box">
                <div className="cycle-config-header">
                  <ArrowsClockwise size={18} />
                  <div>
                    <strong>Alım ve Ara Verme Döngüsü</strong>
                    <small>Örn: 3 gün ilaç alımı, ardından 4 gün ara verme.</small>
                  </div>
                </div>
                <div className="cycle-presets">
                  <span className="preset-label">Hızlı Şablonlar:</span>
                  <div className="preset-chips">
                    <button
                      type="button"
                      className={`preset-chip ${Number(cyclePhase1Days) === 3 && Number(cyclePhase2Days) === 4 ? 'active' : ''}`}
                      onClick={() => applyCyclePreset(3, amount, 4, '0 (Ara)', 'cycle')}
                    >
                      3 gün al / 4 gün ara
                    </button>
                    <button
                      type="button"
                      className={`preset-chip ${Number(cyclePhase1Days) === 5 && Number(cyclePhase2Days) === 2 ? 'active' : ''}`}
                      onClick={() => applyCyclePreset(5, amount, 2, '0 (Ara)', 'cycle')}
                    >
                      5 gün al / 2 gün ara
                    </button>
                    <button
                      type="button"
                      className={`preset-chip ${Number(cyclePhase1Days) === 21 && Number(cyclePhase2Days) === 7 ? 'active' : ''}`}
                      onClick={() => applyCyclePreset(21, amount, 7, '0 (Ara)', 'cycle')}
                    >
                      21 gün al / 7 gün ara
                    </button>
                  </div>
                </div>
                <div className="cycle-inputs-grid">
                  <label>
                    Alım gün sayısı
                    <KeyboardInput
                      value={cyclePhase1Days}
                      onChange={e => setCyclePhase1Days(e.target.value.replace(/[^0-9]/g, ''))}
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="3"
                    />
                  </label>
                  <label>
                    Ara gün sayısı
                    <KeyboardInput
                      value={cyclePhase2Days}
                      onChange={e => setCyclePhase2Days(e.target.value.replace(/[^0-9]/g, ''))}
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="4"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Değişken Doz Döngüsü (Örn: 4 gün 1.5 doz / 3 gün 1 doz) */}
            {frequencyType === 'variable' && (
              <div className="cycle-config-box variable">
                <div className="cycle-config-header">
                  <TrendUp size={18} />
                  <div>
                    <strong>Değişken Doz Döngüsü</strong>
                    <small>Farklı günlerde farklı doz miktarı alım planı.</small>
                  </div>
                </div>
                <div className="cycle-presets">
                  <span className="preset-label">Hızlı Şablonlar:</span>
                  <div className="preset-chips">
                    <button
                      type="button"
                      className={`preset-chip featured ${Number(cyclePhase1Days) === 4 && cyclePhase1Amount === '1.5 tablet' && Number(cyclePhase2Days) === 3 && cyclePhase2Amount === '1 tablet' ? 'active' : ''}`}
                      onClick={() => applyCyclePreset(4, '1.5 tablet', 3, '1 tablet', 'variable')}
                    >
                      ⭐ 4 gün 1.5 doz / 3 gün 1 doz
                    </button>
                    <button
                      type="button"
                      className={`preset-chip ${Number(cyclePhase1Days) === 5 && cyclePhase1Amount === '1 tablet' && Number(cyclePhase2Days) === 2 && cyclePhase2Amount === '0.5 tablet' ? 'active' : ''}`}
                      onClick={() => applyCyclePreset(5, '1 tablet', 2, '0.5 tablet', 'variable')}
                    >
                      5 gün 1 doz / 2 gün yarım
                    </button>
                    <button
                      type="button"
                      className={`preset-chip ${Number(cyclePhase1Days) === 7 && cyclePhase1Amount === '2 tablet' && Number(cyclePhase2Days) === 7 && cyclePhase2Amount === '1 tablet' ? 'active' : ''}`}
                      onClick={() => applyCyclePreset(7, '2 tablet', 7, '1 tablet', 'variable')}
                    >
                      7 gün 2 tablet / 7 gün 1 tablet
                    </button>
                  </div>
                </div>
                <div className="cycle-phases-container">
                  <div className="phase-card">
                    <span className="phase-badge">1. AŞAMA</span>
                    <div className="phase-fields">
                      <label>
                        Gün süresi
                        <KeyboardInput
                          value={cyclePhase1Days}
                          onChange={e => setCyclePhase1Days(e.target.value.replace(/[^0-9]/g, ''))}
                          inputMode="numeric"
                          maxLength={3}
                          placeholder="4"
                        />
                      </label>
                      <label>
                        Doz miktarı
                        <KeyboardInput
                          value={cyclePhase1Amount}
                          onChange={e => setCyclePhase1Amount(e.target.value)}
                          placeholder="1.5 tablet"
                          maxLength={30}
                        />
                      </label>
                    </div>
                    <div className="quick-dose-row">
                      {['0.5 tablet', '1 tablet', '1.5 tablet', '2 tablet'].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          className={`mini-chip ${cyclePhase1Amount === amt ? 'active' : ''}`}
                          onClick={() => setCyclePhase1Amount(amt)}
                        >
                          {amt.replace(' tablet', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="phase-card">
                    <span className="phase-badge">2. AŞAMA</span>
                    <div className="phase-fields">
                      <label>
                        Gün süresi
                        <KeyboardInput
                          value={cyclePhase2Days}
                          onChange={e => setCyclePhase2Days(e.target.value.replace(/[^0-9]/g, ''))}
                          inputMode="numeric"
                          maxLength={3}
                          placeholder="3"
                        />
                      </label>
                      <label>
                        Doz miktarı
                        <KeyboardInput
                          value={cyclePhase2Amount}
                          onChange={e => setCyclePhase2Amount(e.target.value)}
                          placeholder="1 tablet"
                          maxLength={30}
                        />
                      </label>
                    </div>
                    <div className="quick-dose-row">
                      {['0 (Ara)', '0.5 tablet', '1 tablet', '1.5 tablet'].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          className={`mini-chip ${cyclePhase2Amount === amt ? 'active' : ''}`}
                          onClick={() => setCyclePhase2Amount(amt)}
                        >
                          {amt.replace(' tablet', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <label>Kullanım talimatı / Doktor notu (İsteğe bağlı)<KeyboardInput value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Örn. Kahvaltıdan 30 dk sonra, bol suyla" maxLength={60}/></label>

            <div className="stock-editor-section">
              <span className="group-label">Kutu & Stok Takibi</span>
              <div className="stock-inputs-row">
                <label>
                  Kalan stok (adet)
                  <KeyboardInput
                    value={stock}
                    onChange={e => setStock(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="30"
                    inputMode="numeric"
                    maxLength={4}
                  />
                </label>
                <label>
                  Uyarı eşiği
                  <KeyboardInput
                    value={stockThreshold}
                    onChange={e => setStockThreshold(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="5"
                    inputMode="numeric"
                    maxLength={3}
                  />
                </label>
              </div>
              <div className="refill-actions">
                <button
                  type="button"
                  className="secondary refill-btn"
                  onClick={() => { const newStock = (parseInt(stock, 10) || 0) + 30; setStock(String(newStock)); setToast({ text: `Kutu stoğuna +30 adet eklendi (Toplam: ${newStock})` }); }}
                >
                  <ArrowsClockwise size={16} />
                  <span>+30 Kutu Yenile</span>
                </button>
                <button
                  type="button"
                  className="secondary refill-btn"
                  onClick={() => { setStock(s => s + 10); setToast({ text: `Kutu stoğuna +10 adet eklendi (Toplam: ${stock + 10})` }); }}
                >
                  <Plus size={16} />
                  <span>+10 Ekle</span>
                </button>
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {editor.id && (
              <div className="editor-secondary-actions">
                <button className="secondary full" type="button" onClick={()=>{change(editor.id!,{paused:!editor.paused},editor.paused ? 'Plan devam ediyor' : 'Plan duraklatıldı'); closeEditor();}}>{editor.paused ? 'Planı devam ettir' : 'Planı duraklat'}</button>
                <button className="secondary danger full" type="button" onClick={()=>deleteMedicine(editor.id!)}><Trash size={18}/><span>İlacı sil</span></button>
              </div>
            )}
          </form>
        </> : <>
          <header className="page-header"><div><h1>{getTabLabel(tab)}</h1><p>{tab === 'Bugün' || tab === 'Geçmiş' ? (language === 'en' ? 'September 6, 2026, Sunday' : '6 Eylül 2026, Pazar') : tab === 'İlaçlarım' ? (language === 'en' ? 'Your medication plan, all in one place.' : 'Kullanım planın, bir arada.') : (userName ? (language === 'en' ? `Hello ${userName}, a routine tailored to you.` : `Merhaba ${userName}, sana uygun bir rutin.`) : (language === 'en' ? 'A routine tailored to you.' : 'Sana uygun bir rutin.'))}</p></div>
            {tab==='Bugün' && <span className="progress"><CheckCircle size={17}/><span>{language === 'en' ? `${takenSlots.length} of ${todaySlots.length} doses taken` : `${todaySlots.length} dozdan ${takenSlots.length}’${countSuffix(takenSlots.length)} alındı`}</span></span>}
            {tab==='İlaçlarım' && <button className="icon-button add-button" aria-label={t.addFirstMedicine} onClick={()=>openEditor()}><Plus size={24}/></button>}
          </header>
          {tab === 'Bugün' && <>

            {(() => {
              const activeAppts = appointments.filter(a => !a.completed && a.date)
                .sort((a, b) => (a.date + ' ' + (a.time || '13:00')).localeCompare(b.date + ' ' + (b.time || '13:00')));
              const isEn = language === 'en';

              if (activeAppts.length === 0) {
                return (
                  <div
                    className="proto-appointment-banner empty"
                    onClick={() => handleOpenAppointmentEditor()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#101d29',
                      border: '1px dashed rgba(169, 223, 202, 0.25)',
                      borderRadius: '12px',
                      padding: '12px',
                      marginBottom: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '18px', background: 'rgba(169, 223, 202, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a9dfca', flexShrink: 0 }}>
                        <CalendarDots size={20} weight="bold" />
                      </div>
                      <div>
                        <div style={{ color: '#f5f3f0', fontSize: '13px', fontWeight: 700 }}>
                          {isEn ? 'No Upcoming Appointments' : 'Yaklaşan Randevu Yok'}
                        </div>
                        <div style={{ color: '#adb3bf', fontSize: '11px', marginTop: '2px' }}>
                          {isEn ? 'Tap to add doctor & lab reminders' : 'Doktor kontrol ve tahlil hatırlatıcısı ekle'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(169, 223, 202, 0.15)', color: '#a9dfca', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(169, 223, 202, 0.3)' }}>
                      <Plus size={12} weight="bold" />
                      <span>{isEn ? 'Add' : 'Randevu Ekle'}</span>
                    </div>
                  </div>
                );
              }

              const primaryAppt: AppointmentItem = activeAppts[0] || {
                id: 'legacy',
                doctorName: doctorName || '',
                specialty: doctorSpecialty || '',
                hospital: doctorHospital || '',
                date: doctorNextAppointment,
                time: doctorAppointmentTime || '13:00',
                hasBloodTest: !!doctorBloodTestDate,
                bloodTestDate: doctorBloodTestDate,
                bloodTestFasting: true,
                bloodTestTime: '08:30',
                bloodTestNotes: doctorNotes || '',
                leadOptions: ['1d', '0d'],
                createdAt: 0,
                updatedAt: 0,
              };

              const diff = Math.round((new Date(primaryAppt.date).getTime() - new Date(today).getTime()) / 86400000);
              let badgeText = '';
              let badgeBg = 'rgba(52, 211, 153, 0.15)';
              let badgeColor = '#34d399';
              if (diff === 0) {
                badgeText = isEn ? 'Today' : 'Bugün';
                badgeBg = 'rgba(251, 191, 36, 0.2)';
                badgeColor = '#fbbf24';
              } else if (diff === 1) {
                badgeText = isEn ? 'Tomorrow' : 'Yarın';
                badgeBg = 'rgba(52, 211, 153, 0.2)';
                badgeColor = '#34d399';
              } else if (diff > 1) {
                badgeText = isEn ? `in ${diff} days` : `${diff} gün kaldı`;
                badgeBg = 'rgba(56, 189, 248, 0.18)';
                badgeColor = '#38bdf8';
              } else {
                badgeText = isEn ? `${Math.abs(diff)} days ago` : `${Math.abs(diff)} gün önce`;
                badgeBg = 'rgba(148, 163, 184, 0.15)';
                badgeColor = '#94a3b8';
              }

              const docTitle = primaryAppt.doctorName && primaryAppt.doctorName.trim()
                ? primaryAppt.doctorName.trim()
                : (primaryAppt.specialty && primaryAppt.specialty.trim()
                    ? `${primaryAppt.specialty.trim()} ${isEn ? 'Appointment' : 'Randevusu'}`
                    : (isEn ? 'Doctor Appointment' : 'Doktor Randevusu'));
              const hospText = primaryAppt.hospital && primaryAppt.hospital.trim()
                ? ` • ${primaryAppt.hospital.trim()}`
                : (primaryAppt.specialty && primaryAppt.specialty.trim() && primaryAppt.doctorName
                    ? ` • ${primaryAppt.specialty.trim()}`
                    : '');

              return (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', padding: '0 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CalendarDots size={13} weight="bold" color="#a9dfca" />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#a9dfca', letterSpacing: '0.04em' }}>
                        {isEn ? 'UPCOMING APPOINTMENTS' : 'YAKLAŞAN RANDEVULAR'}
                      </span>
                      {activeAppts.length > 1 && (
                        <span style={{ background: 'rgba(169, 223, 202, 0.2)', color: '#a9dfca', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px' }}>
                          {activeAppts.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAppointmentEditor()}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(169, 223, 202, 0.12)', border: '1px solid rgba(169, 223, 202, 0.25)', borderRadius: '6px', padding: '3px 8px', color: '#a9dfca', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Plus size={12} weight="bold" />
                      <span>{isEn ? 'Add' : 'Randevu Ekle'}</span>
                    </button>
                  </div>

                  <div
                    className="proto-appointment-banner"
                    onClick={() => {
                      setTab('Ayarlar');
                      setSettingsSubPage('profile');
                    }}
                    style={{
                      background: '#101d29',
                      border: '1px solid rgba(169, 223, 202, 0.25)',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, marginRight: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '18px', background: 'rgba(169, 223, 202, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a9dfca', flexShrink: 0 }}>
                          <CalendarDots size={20} weight="bold" />
                        </div>
                        <div>
                          <div style={{ color: '#f5f3f0', fontSize: '14px', fontWeight: 700 }}>{docTitle}</div>
                          {hospText && <div style={{ color: '#a9dfca', fontSize: '12px', fontWeight: 500, marginTop: '1px' }}>{hospText}</div>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span style={{ color: '#adb3bf', fontSize: '12px' }}>{primaryAppt.date}</span>
                            <span style={{ background: 'rgba(169, 223, 202, 0.15)', color: '#a9dfca', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(169, 223, 202, 0.3)' }}>
                              ⏰ {primaryAppt.time || '13:00'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', background: badgeBg, color: badgeColor, fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                        <span>{badgeText}</span>
                        <CaretRight size={12} weight="bold" />
                      </div>
                    </div>

                    {primaryAppt.hasBloodTest && primaryAppt.bloodTestDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(167, 139, 250, 0.2)', color: '#c4b5fd', fontSize: '11.5px', fontWeight: 600 }}>
                        <Flask size={14} weight="fill" />
                        <span>
                          {primaryAppt.bloodTestDate} {primaryAppt.bloodTestFasting ? (isEn ? '(Aç Karnına Tahlil)' : '(Aç Karnına Tahlil)') : (isEn ? '(Kan Tahlili)' : '(Kan Tahlili)')}
                        </span>
                        {primaryAppt.bloodTestTime && (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>⏰ {primaryAppt.bloodTestTime}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {activeAppts.length > 1 && (
                    <div
                      onClick={() => {
                        setTab('Ayarlar');
                        setSettingsSubPage('profile');
                      }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px', padding: '6px', borderRadius: '8px', background: 'rgba(16, 29, 41, 0.7)', border: '1px solid rgba(169, 223, 202, 0.15)', color: '#a9dfca', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <span>+{activeAppts.length - 1} {isEn ? 'more appointment in Settings' : 'diğer randevu (Ayarlarda Gör)'}</span>
                      <CaretRight size={12} />
                    </div>
                  )}
                </div>
              );
            })()}

            {nextSlot ? <section className="next-dose" aria-label="Sıradaki ilaç">
              <p className="eyebrow">{t.nextDose.toUpperCase()}</p>
              <div className="hero-time">{nextSlot.time}</div>
              <h2 className="hero-name">{nextSlot.dose.name}</h2>
              <div className="hero-clinical-chips">
                <span className="clinical-chip meal">
                  <ForkKnife size={14} weight="bold" />
                  <span>{getMealLabel(nextSlot.dose.mealCondition)}</span>
                </span>
                <span className="clinical-chip form">
                  {(() => {
                    const Icon = formIcons[nextSlot.dose.form ?? 'tablet'] ?? Pill;
                    return <Icon size={14} weight="bold" />;
                  })()}
                  <span>{getFormLabel(nextSlot.dose.form)}</span>
                </span>
                {nextSlot.dose.frequencyType && nextSlot.dose.frequencyType !== 'everyday' && (
                  <span className="clinical-chip cycle">
                    <ArrowsClockwise size={14} weight="bold" />
                    <span>{nextSlot.cycleInfo.phaseLabel}</span>
                  </span>
                )}
                {nextSlot.dose.stock !== undefined && (
                  <span className={`clinical-chip stock ${nextSlot.dose.stock <= (nextSlot.dose.stockThreshold ?? 5) ? 'low' : ''}`}>
                    {nextSlot.dose.stock <= (nextSlot.dose.stockThreshold ?? 5) ? <Warning size={14} weight="bold"/> : <Package size={14} />}
                    <span>{formatStock(nextSlot.dose.stock)} {language === 'en' ? (nextSlot.dose.stock === 1 ? 'unit' : 'units') : 'adet'}{nextSlot.dose.stock <= (nextSlot.dose.stockThreshold ?? 5) ? (language === 'en' ? ' (Low!)' : ' (Azaldı!)') : ''}</span>
                  </span>
                )}
              </div>
              <p className="dose-description">
                <strong>{nextSlot.todayAmount}</strong>
                {nextSlot.dose.instructions ? ` · ${nextSlot.dose.instructions}` : (language === 'en' ? ' · As scheduled' : ' · Kullanım planına göre')}
              </p>
              {nextSlot.dose.snooze && <p className="snooze-note"><Bell size={16}/>{language === 'en' ? `Will remind again in ${nextSlot.dose.snooze} minutes` : `${nextSlot.dose.snooze} dakika sonra tekrar hatırlatılacak`}</p>}
              <button className="primary take-button" onClick={takeNextDose}><Check size={34}/><span>{t.take}</span></button>
              <div className="secondary-actions">
                <button className="secondary" onClick={()=>setSnoozing(nextSlot.dose)}><Bell size={22}/><span>{t.snooze}</span></button>
                <button className="secondary" onClick={()=>skipSlot(nextSlot)}><Prohibit size={23}/>{t.skip}</button>
              </div>
            </section> : <section className="complete-state"><CheckCircle size={60} weight="light"/><h2>{todaySlots.length ? t.allDone : t.noMedsTodayTitle}</h2><p>{todaySlots.length ? (language === 'en' ? `${takenSlots.length} taken, ${recordedSlots.length-takenSlots.length} skipped.` : `${takenSlots.length} alındı, ${recordedSlots.length-takenSlots.length} atlandı.`) : t.noMedsTodayDesc}</p><button className="primary" onClick={()=>todaySlots.length ? navigate('Geçmiş') : openEditor()}>{todaySlots.length ? (language === 'en' ? 'View history' : 'Kayıtları gör') : t.addFirstMedicine}</button></section>}

            {offCycleDoses.length > 0 && (
              <div className="off-cycle-section">
                <div className="off-cycle-header">
                  <ArrowsClockwise size={17} weight="bold" />
                  <span>Bugün Ara Gününde ({offCycleDoses.length} İlaç)</span>
                </div>
                <div className="off-cycle-cards">
                  {offCycleDoses.map(d => {
                    const info = getCycleInfo(d, '2026-09-06');
                    return (
                      <div key={d.id} className="off-cycle-card">
                        <div className="off-cycle-main">
                          <strong>{d.name}</strong>
                          <small>{info.phaseLabel} · Bugün ilaç alımı gerekmiyor</small>
                        </div>
                        <span className="off-cycle-badge">Dinlenme</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <section className="remaining"><h3>Günün kalanında</h3>{pendingSlots.slice(1).length ? pendingSlots.slice(1).map(s=>slotRow(s)) : <p className="quiet-empty">Başka planlı doz bulunmuyor.</p>}
              <button className="recorded-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><ClipboardText size={29} weight="light"/><span><strong>Alınanlar</strong><small>{takenSlots.length} kayıt</small></span><CaretRight className={expanded ? 'rotated' : ''} size={23}/></button>
              {expanded && <div className="taken-list">{takenSlots.map(s=>slotRow(s))}{!takenSlots.length && <p className="quiet-empty">Henüz alınan doz kaydı yok.</p>}<p className="microcopy">Kaydı geri almak için satıra dokun.</p></div>}
            </section>
          </>}
          {tab === 'İlaçlarım' && <section className="tab-content">
            <div className="meds-subtab-bar">
              <button
                type="button"
                className={`meds-subtab-btn ${medsSubTab === 'plan' ? 'active' : ''}`}
                onClick={() => setMedsSubTab('plan')}
              >
                <CalendarDots size={16} />
                <span>{t.subTabPlan}</span>
              </button>
              <button
                type="button"
                className={`meds-subtab-btn ${medsSubTab === 'stock' ? 'active' : ''}`}
                onClick={() => setMedsSubTab('stock')}
              >
                <Package size={16} />
                <span>{t.subTabStock}</span>
                {(() => {
                  const crit = doses.filter(d => !d.deletedAt && calculateStockProjection(d, '2026-09-06', language).statusTier === 'critical').length;
                  return crit > 0 ? <span className="subtab-crit-badge">{crit}</span> : null;
                })()}
              </button>
            </div>

            {medsSubTab === 'stock' ? (
              <div className="stock-inventory-view-web">
                {(() => {
                  const activeDoses = doses.filter(d => !d.deletedAt);
                  const projections = activeDoses.map(d => ({ dose: d, proj: calculateStockProjection(d, '2026-09-06', language) }));
                  const critCount = projections.filter(p => p.proj.statusTier === 'critical').length;
                  const lowCount = projections.filter(p => p.proj.statusTier === 'low').length;
                  const goodCount = projections.filter(p => p.proj.statusTier === 'good').length;

                  const filtered = stockFilter === 'all' ? projections : projections.filter(p => p.proj.statusTier === stockFilter);

                  return (
                    <>
                      <div className="stock-triage-row-web">
                        <button
                          type="button"
                          className={`stock-triage-card-web crit ${stockFilter === 'critical' ? 'active' : ''}`}
                          onClick={() => setStockFilter(f => f === 'critical' ? 'all' : 'critical')}
                        >
                          <div className="triage-num crit">{critCount}</div>
                          <div className="triage-lbl">{t.stockTriageCritical}</div>
                          <small>≤ 7 {language === 'en' ? 'days' : 'gün'}</small>
                        </button>

                        <button
                          type="button"
                          className={`stock-triage-card-web low ${stockFilter === 'low' ? 'active' : ''}`}
                          onClick={() => setStockFilter(f => f === 'low' ? 'all' : 'low')}
                        >
                          <div className="triage-num low">{lowCount}</div>
                          <div className="triage-lbl">{t.stockTriageLow}</div>
                          <small>8-14 {language === 'en' ? 'days' : 'gün'}</small>
                        </button>

                        <button
                          type="button"
                          className={`stock-triage-card-web good ${stockFilter === 'good' ? 'active' : ''}`}
                          onClick={() => setStockFilter(f => f === 'good' ? 'all' : 'good')}
                        >
                          <div className="triage-num good">{goodCount}</div>
                          <div className="triage-lbl">{t.stockTriageGood}</div>
                          <small>&gt; 14 {language === 'en' ? 'days' : 'gün'}</small>
                        </button>
                      </div>

                      <div className="stock-chips-row-web">
                        {[
                          { id: 'all', label: t.stockFilterAll },
                          { id: 'critical', label: t.stockFilterCritical },
                          { id: 'low', label: t.stockFilterLow },
                          { id: 'good', label: t.stockFilterGood },
                        ].map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className={`stock-filter-chip-web ${stockFilter === c.id ? 'active' : ''}`}
                            onClick={() => setStockFilter(c.id as any)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>

                      <div className="stock-cards-list-web">
                        {filtered.length === 0 ? (
                          <div className="quiet-empty">{t.stockEmptyDesc}</div>
                        ) : (
                          filtered.map(({ dose, proj }) => {
                            const isCrit = proj.statusTier === 'critical';
                            const isL = proj.statusTier === 'low';
                            const tierClass = isCrit ? 'crit' : isL ? 'low' : 'good';

                            return (
                              <div key={dose.id} className={`stock-card-web ${tierClass}`}>
                                <div className="stock-card-head" onClick={() => openEditor(dose)}>
                                  <div>
                                    <strong className="stock-med-name">{dose.name}</strong>
                                    <div className="stock-med-meta">{t.stockDailyConsumption}: {proj.dailyConsumption} {dose.form || t.stockUnitPiece}</div>
                                  </div>
                                  <span className={`stock-days-pill ${tierClass}`}>
                                    {proj.isOutOfStock ? t.stockRunOut : `${proj.daysRemaining} ${t.stockDaysLeft}`}
                                  </span>
                                </div>

                                <div className="stock-runout-row" onClick={() => openEditor(dose)}>
                                  <CalendarDots size={13} />
                                  <span>{t.stockRunOutDate}: <strong className={`runout-date ${tierClass}`}>{proj.runOutDateFormatted}</strong></span>
                                </div>

                                <div className="stock-bar-track" onClick={() => openEditor(dose)}>
                                  <div className={`stock-bar-fill ${tierClass}`} style={{ width: `${Math.max(4, proj.progressPercent)}%` }} />
                                </div>

                                <div className="stock-card-actions">
                                  <div className="stock-stepper-web">
                                    <button
                                      type="button"
                                      disabled={proj.currentStock <= 0}
                                      onClick={() => {
                                        const cur = Math.max(0, dose.stock ?? 0);
                                        const next = Math.max(0, cur - 1);
                                        setDoses(ds => ds.map(d => d.id === dose.id ? { ...d, stock: next, updatedAt: Date.now() } : d));
                                      }}
                                    >
                                      -
                                    </button>
                                    <span className="stepper-val">{proj.currentStock} <small>{t.stockUnitPiece}</small></span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur = Math.max(0, dose.stock ?? 0);
                                        setDoses(ds => ds.map(d => d.id === dose.id ? { ...d, stock: cur + 1, updatedAt: Date.now() } : d));
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    className="stock-add-box-btn"
                                    onClick={() => {
                                      const cur = Math.max(0, dose.stock ?? 0);
                                      setDoses(ds => ds.map(d => d.id === dose.id ? { ...d, stock: cur + proj.boxSize, updatedAt: Date.now() } : d));
                                      setToast({ text: `${dose.name}: +${proj.boxSize} ${t.stockUnitPiece} eklendi` });
                                    }}
                                  >
                                    <Package size={14} />
                                    <span>{t.stockAddBox} (+{proj.boxSize})</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <>
                <div className="section-label"><span>GÜNLÜK PLAN</span><span>{doses.filter(d => !d.deletedAt).length} ilaç</span></div>
                <div className="medicine-list">{doses.filter(d => !d.deletedAt).map(d=>medicineRow(d))}</div>
                <button className="secondary full" onClick={()=>openEditor()}><Plus size={22}/>Yeni ilaç ekle</button>
                <p className="microcopy">Düzenlemek veya duraklatmak için ilaca dokun.</p>
              </>
            )}
          </section>}
          {tab === 'Geçmiş' && <section className="tab-content">
            <div className="history-weekly-card">
              <div className="adherence-header">
                <div className="adherence-pill"><TrendUp size={18} weight="bold"/><span>%{weeklyAdherence} Haftalık Uyum</span></div>
                <span className="adherence-stats">{totalWeeklyTaken} / {totalWeeklyTotal} doz alındı</span>
              </div>
              <div className="week-strip" role="tablist" aria-label="Haftanın günleri">
                {pastWeekHistory.map(item => {
                  const isSelected = selectedHistoryDate === item.dayNum;
                  const isComplete = item.isToday ? (todaySlots.length > 0 && takenSlots.length === todaySlots.length) : item.doses?.every(d => d.status === 'taken');
                  const isPartial = item.isToday ? (takenSlots.length < todaySlots.length && recordedSlots.length > takenSlots.length) : item.doses?.some(d => d.status === 'skipped');
                  return (
                    <button
                      key={item.dayNum}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`week-pill ${isSelected ? 'active' : ''} ${item.isToday ? 'today' : ''}`}
                      onClick={() => setSelectedHistoryDate(item.dayNum)}
                    >
                      <span className="week-pill-label">{item.label}</span>
                      <span className="week-pill-num">{item.dayNum}</span>
                      <span className={`week-pill-dot ${isComplete ? 'dot-mint' : isPartial ? 'dot-amber' : item.isToday ? 'dot-today' : 'dot-mint'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedHistoryDate === 6 ? <>
              <div className="day-section-title">
                <h3>Bugünün kayıtları</h3>
                <span className="mint-tag">Canlı takip</span>
              </div>
              <div className="history-summary"><CheckCircle size={27}/><div><strong>{takenSlots.length} doz alındı</strong><small>{recordedSlots.length-takenSlots.length} atlandı · {pendingSlots.length} bekliyor</small></div></div>
              {recordedSlots.map(s=>slotRow(s))}
              {!recordedSlots.length && <p className="quiet-empty">Henüz kayıt yok. İşaretlediğin dozlar burada görünecek.</p>}
              <p className="microcopy">Yanlış bir kayıt mı? Satıra dokunarak geri al.</p>
            </> : (() => {
              const pastDay = pastWeekHistory.find(d => d.dayNum === selectedHistoryDate);
              const dayTaken = pastDay?.doses?.filter(d => d.status === 'taken') ?? [];
              const daySkipped = pastDay?.doses?.filter(d => d.status === 'skipped') ?? [];
              return <>
                <div className="day-section-title">
                  <h3>{pastDay?.dateStr}</h3>
                  <span className="history-tag">Arşiv</span>
                </div>
                <div className="history-summary"><CheckCircle size={27}/><div><strong>{dayTaken.length} doz alındı</strong><small>{daySkipped.length} atlandı · 0 bekliyor</small></div></div>
                {pastDay?.doses?.map(d => (
                  <div className="dose-row readonly" key={d.id}>
                    <span className="row-time">{d.time}</span>
                    <span className="row-main"><strong>{d.name}</strong><small>{d.amount} · Günlük doz</small></span>
                    <span className={`status ${d.status}`}>
                      {d.status === 'taken' ? <CheckCircle size={20}/> : <Prohibit size={20}/>}
                      <span>{d.status === 'taken' ? 'Alındı' : 'Atlandı'}</span>
                    </span>
                  </div>
                ))}
                <p className="microcopy">Geçmiş gün kayıtları kilitlidir ve arşivlenmiştir.</p>
              </>;
            })()}

            <div className="info-note"><Clock size={19}/><p>Kayıtlar kendi bildirimine dayanır. İşaretlenmeyen dozlar otomatik olarak atlandı sayılmaz.</p></div>
          </section>}
          {tab === 'Ayarlar' && <section className="tab-content settings">
                {settingsSubPage !== 'main' && (
                  <div className="settings-sub-header">
                    <button type="button" className="settings-back-btn" onClick={() => setSettingsSubPage('main')}>
                      <ArrowLeft size={16} weight="bold" />
                      <span>{t.tabSettings}</span>
                    </button>
                    <h3 className="settings-sub-title">
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
                    </h3>
                  </div>
                )}

                {settingsSubPage === 'main' && (
                  <>
                    <div className="theme-row"><Moon size={24}/><div><strong>{language === 'en' ? 'Dark theme' : 'Gece görünümü'}</strong><small>{language === 'en' ? 'Calm, dark and legible.' : 'Sakin, koyu ve okunaklı.'}</small></div><span className="mint-label">{language === 'en' ? 'Active' : 'Etkin'}</span></div>

                    <div className="settings-menu-list">
                      {/* 1. Kullanıcı Profili */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('profile')}>
                        <div className="settings-menu-icon" style={{ background: '#182b3a', color: 'var(--mint)' }}>
                          <User size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">{t.settingsProfile}</span>
                          <span className="settings-menu-desc">{userName ? (doctorName ? `${userName} • ${doctorName}` : `${language === 'en' ? 'Name:' : 'Hitap:'} ${userName}`) : (doctorName ? doctorName : t.settingsProfileDesc)}</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* Dil / Language */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('language')}>
                        <div className="settings-menu-icon" style={{ background: '#13352c', color: '#5eead4' }}>
                          <Globe size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">{t.settingsLanguage}</span>
                          <span className="settings-menu-desc">{language === 'tr' ? 'Türkçe (Varsayılan)' : 'English'}</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 2. Ses ve Bildirimler */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('notifications')}>
                        <div className="settings-menu-icon" style={{ background: '#183335', color: 'var(--mint)' }}>
                          <SpeakerHigh size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">Ses & Bildirimler</span>
                          <span className="settings-menu-desc">{notifications ? (soundEnabled ? 'Sesli bildirimler açık' : 'Sessiz mod') : 'Bildirimler kapalı'}</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 3. Hatırlatıcı & Erteleme */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('reminders')}>
                        <div className="settings-menu-icon" style={{ background: '#262f3a', color: 'var(--mint)' }}>
                          <Clock size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">Hatırlatıcı & Erteleme</span>
                          <span className="settings-menu-desc">{`${snoozeMinutes} dk erteleme · ${leadTimeMinutes ? `${leadTimeMinutes} dk önce` : 'Vaktinde'}`}</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 4. Güvenilirlik & Arka Plan */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('reliability')}>
                        <div className="settings-menu-icon" style={{ background: '#1b342b', color: '#34d399' }}>
                          <Shield size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">Güvenilirlik & Arka Plan</span>
                          <span className="settings-menu-desc">Pil optimizasyonu, hassas alarm & izinler</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 5. Stok & Envanter */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('stock')}>
                        <div className="settings-menu-icon" style={{ background: '#2a2838', color: '#c4b5fd' }}>
                          <Package size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">Stok & Envanter</span>
                          <span className="settings-menu-desc">{`Kritik eşik: ${defaultStockThreshold} doz · ${stockAlertsEnabled ? 'Uyarılar aktif' : 'Kapalı'}`}</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 6. Görünüm & Gizlilik */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('privacy')}>
                        <div className="settings-menu-icon" style={{ background: '#1d2c38', color: '#7dd3fc' }}>
                          <EyeSlash size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">Görünüm & Gizlilik</span>
                          <span className="settings-menu-desc">{privateMode ? 'Gizlilik modu aktif' : 'Standart görünüm'}</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 7. Deneyim & Dokunsal */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('experience')}>
                        <div className="settings-menu-icon" style={{ background: '#2d2538', color: '#f472b6' }}>
                          <SlidersHorizontal size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">Deneyim & Titreşim</span>
                          <span className="settings-menu-desc">Doz daraltma ve dokunsal titreşim</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 8. Senkronizasyon & Yedekleme */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('sync')}>
                        <div className="settings-menu-icon" style={{ background: '#173347', color: '#38bdf8' }}>
                          <CloudArrowUp size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title">Senkronizasyon & Yedekleme</span>
                          <span className="settings-menu-desc">
                            {lastSyncAt ? `Son eşitleme: ${lastSyncAt}` : 'Bulut eşitleme & JSON yedek'}
                          </span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 9. Hata & Tanılama Günlüğü */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('diagnostics')}>
                        <div className="settings-menu-icon" style={{ background: '#281a17', color: '#f0b484' }}>
                          <Bug size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Hata & Tanılama Günlüğü
                            {diagnosticsLogs.some(l => l.level === 'ERROR' || l.level === 'FATAL') && (
                              <span style={{ background: '#4c1d1d', color: '#fca5a5', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                {diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length} Hata
                              </span>
                            )}
                          </span>
                          <span className="settings-menu-desc">Sistem logları, yakalanan hatalar ve kaza raporları</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" />
                      </button>

                      {/* 10. Verileri Sıfırla */}
                      <button type="button" className="settings-menu-item" onClick={() => setSettingsSubPage('reset')}>
                        <div className="settings-menu-icon" style={{ background: '#361c22', color: '#ff9696' }}>
                          <ArrowCounterClockwise size={22} weight="bold" />
                        </div>
                        <div className="settings-menu-text">
                          <span className="settings-menu-title" style={{ color: '#ff9696' }}>Verileri Sıfırla</span>
                          <span className="settings-menu-desc">İlk kurulum ayarlarına ve varsayılan plana dön</span>
                        </div>
                        <CaretRight size={18} className="settings-menu-arrow" style={{ color: '#ff9696' }} />
                      </button>
                    </div>

                    <div className="info-note"><ShieldCheck size={22}/><p>Bu bir etkileşimli prototip. İlaç planınız ve tercihleriniz bu tarayıcıda yerel olarak güvenle saklanır.</p></div>

                    <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '8px', fontSize: '12px', color: '#68778d' }}>
                      <span style={{ fontWeight: 600, color: 'var(--mint)' }}>Reminder Health v0.2.13 (Web Prototip)</span>
                      <span style={{ display: 'block', fontSize: '11px', marginTop: '2px' }}>Karekod & Senkronizasyon · Çoklu Randevu & Tahlil</span>
                    </div>
                  </>
                )}

                {/* SUB PAGE 1: KULLANICI & HEKİM PROFİLİ */}
                {settingsSubPage === 'profile' && (
                  <div className="profile-detail-view">
                      {/* 1. Kullanıcı Bilgisi */}
                      <div className="settings-section-head">
                        <User size={18} weight="bold" className="settings-section-icon" />
                        <h4>{t.profileUserSection}</h4>
                      </div>
                      <div className="settings-detail-card">
                        <div className="profile-edit-field">
                          <label>{t.userNameLabel}</label>
                          <small>{t.userNameDesc}</small>
                          <div className="profile-input-box">
                            <User size={18} className="field-icon" />
                            <KeyboardInput
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              placeholder={t.userNamePlaceholder}
                              onBlur={syncProfileSettings}
                            />
                            {userName.trim() && (
                              <button
                                type="button"
                                className="profile-mini-save"
                                onClick={() => {
                                  syncProfileSettings();
                                  setToast({ text: `İsim "${userName}" olarak güncellendi` });
                                }}
                              >
                                <Check size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. Takip Eden Hekim & Klinik */}
                      <div className="settings-section-head" style={{ marginTop: '20px' }}>
                        <FirstAid size={18} weight="bold" className="settings-section-icon" />
                        <h4>{t.profileDoctorSection}</h4>
                      </div>
                      <div className="settings-detail-card">
                        <div className="profile-edit-field">
                          <label>{t.doctorNameLabel}</label>
                          <div className="profile-input-box">
                            <User size={18} className="field-icon" />
                            <KeyboardInput
                              value={doctorName}
                              onChange={(e) => setDoctorName(e.target.value)}
                              placeholder={t.doctorNamePlaceholder}
                              onBlur={syncProfileSettings}
                            />
                          </div>
                        </div>

                        <div className="profile-edit-field" style={{ marginTop: '12px' }}>
                          <label>{t.doctorSpecialtyLabel}</label>
                          <div className="profile-input-box">
                            <Pill size={18} className="field-icon" />
                            <KeyboardInput
                              value={doctorSpecialty}
                              onChange={(e) => setDoctorSpecialty(e.target.value)}
                              placeholder={t.doctorSpecialtyPlaceholder}
                              onBlur={syncProfileSettings}
                            />
                          </div>
                        </div>

                        <div className="profile-edit-field" style={{ marginTop: '12px' }}>
                          <label>{t.doctorHospitalLabel}</label>
                          <div className="profile-input-box">
                            <Buildings size={18} className="field-icon" />
                            <KeyboardInput
                              value={doctorHospital}
                              onChange={(e) => setDoctorHospital(e.target.value)}
                              placeholder={t.doctorHospitalPlaceholder}
                              onBlur={syncProfileSettings}
                            />
                          </div>
                        </div>

                        <div className="profile-edit-field" style={{ marginTop: '12px' }}>
                          <label>{t.doctorPhoneLabel}</label>
                          <div className="profile-input-box">
                            <Phone size={18} className="field-icon" />
                            <KeyboardInput
                              value={doctorPhone}
                              onChange={(e) => setDoctorPhone(e.target.value)}
                              placeholder={t.doctorPhonePlaceholder}
                              type="tel"
                              onBlur={syncProfileSettings}
                            />
                          </div>
                          {doctorPhone.trim() && (
                            <a
                              href={`tel:${doctorPhone.replace(/[^0-9+]/g, '')}`}
                              className="doctor-call-button"
                            >
                              <Phone size={16} weight="fill" />
                              <span>{language === 'en' ? `Call ${doctorName || 'Doctor'}` : `${doctorName || 'Doktor'}'u Ara`}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* 3. Randevular & Tahliller (Çoklu Randevu Yönetimi) */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarDots size={18} weight="bold" className="settings-section-icon" />
                          <h4 style={{ margin: 0 }}>{language === 'en' ? 'APPOINTMENTS & LAB TESTS' : 'RANDEVULAR VE TAHLİLLER'}</h4>
                          {appointments.length > 0 && (
                            <span style={{ background: 'rgba(169, 223, 202, 0.2)', color: '#a9dfca', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>
                              {appointments.length}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenAppointmentEditor()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(169, 223, 202, 0.15)',
                            border: '1px solid rgba(169, 223, 202, 0.3)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            color: '#a9dfca',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={14} weight="bold" />
                          <span>{language === 'en' ? 'Add Appointment' : 'Yeni Randevu Ekle'}</span>
                        </button>
                      </div>

                      {appointments.length === 0 ? (
                        <div
                          onClick={() => handleOpenAppointmentEditor()}
                          style={{
                            background: '#101d29',
                            border: '1px dashed rgba(169, 223, 202, 0.25)',
                            borderRadius: '12px',
                            padding: '20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <CalendarDots size={28} color="#a9dfca" weight="bold" />
                          <div style={{ color: '#f5f3f0', fontSize: '14px', fontWeight: 600 }}>
                            {language === 'en' ? 'No Appointments Added' : 'Kayıtlı Randevu Bulunmuyor'}
                          </div>
                          <div style={{ color: '#adb3bf', fontSize: '12px', maxWidth: '280px' }}>
                            {language === 'en'
                              ? 'Tap here to add doctor appointments and fasting lab reminders.'
                              : 'Doktor randevusu ve aç karnına kan verme hatırlatıcısı eklemek için dokunun.'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--mint)', color: '#081624', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, marginTop: '4px' }}>
                            <Plus size={14} weight="bold" />
                            <span>{language === 'en' ? 'Add Appointment' : 'Randevu Ekle'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="appointment-list-section">
                          {appointments.map(appt => {
                            const diff = Math.round((new Date(appt.date).getTime() - new Date(today).getTime()) / 86400000);
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
                              <div
                                key={appt.id}
                                className={`appointment-item-card ${appt.completed ? 'completed' : ''}`}
                              >
                                <div className="appointment-item-head">
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      {appt.specialty && (
                                        <span className="appointment-specialty-tag">{appt.specialty}</span>
                                      )}
                                      <span style={{ color: '#f5f3f0', fontSize: '14px', fontWeight: 700 }}>
                                        {appt.doctorName || (language === 'en' ? 'Doctor Appointment' : 'Doktor Randevusu')}
                                      </span>
                                    </div>
                                    {appt.hospital && (
                                      <div style={{ color: '#adb3bf', fontSize: '12px', marginTop: '3px' }}>
                                        🏥 {appt.hospital}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ background: bBg, color: bColor, padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                                    {bText}
                                  </div>
                                </div>

                                {/* Tarih ve Saat */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f5f3f0', fontSize: '13px', fontWeight: 600 }}>
                                    <CalendarDots size={14} color="#a9dfca" weight="bold" />
                                    <span>{appt.date}</span>
                                  </div>
                                  <span style={{ background: 'rgba(169, 223, 202, 0.15)', color: '#a9dfca', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(169, 223, 202, 0.3)' }}>
                                    ⏰ {appt.time || '13:00'}
                                  </span>
                                </div>

                                {/* Randevu İçi Tahlil / Kan Verme Kartı */}
                                {appt.hasBloodTest && appt.bloodTestDate && (
                                  <div className="appointment-blood-badge-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <Flask size={14} weight="fill" color="#c4b5fd" />
                                      <span style={{ color: '#c4b5fd', fontSize: '12px', fontWeight: 700 }}>
                                        {language === 'en' ? 'Fasting Lab Test' : 'Aç Karnına Kan Verme'}
                                      </span>
                                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                        • {appt.bloodTestDate} ({appt.bloodTestTime || '08:30'})
                                      </span>
                                    </div>
                                    {appt.bloodTestNotes && (
                                      <div style={{ color: '#e2e8f0', fontSize: '11px', fontStyle: 'italic', marginTop: '2px' }}>
                                        💬 {appt.bloodTestNotes}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Notlar */}
                                {appt.notes && (
                                  <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                                    📝 {appt.notes}
                                  </div>
                                )}

                                {/* Kart Aksiyonları */}
                                <div className="appointment-actions-row">
                                  {appt.phone && (
                                    <a
                                      href={`tel:${appt.phone.replace(/[^0-9+]/g, '')}`}
                                      className="appointment-action-btn call"
                                    >
                                      <Phone size={12} weight="fill" />
                                      <span>{language === 'en' ? 'Call' : 'Ara'}</span>
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    className="appointment-action-btn edit"
                                    onClick={() => handleOpenAppointmentEditor(appt)}
                                  >
                                    <PencilSimple size={12} weight="bold" />
                                    <span>{language === 'en' ? 'Edit' : 'Düzenle'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`appointment-action-btn ${appt.completed ? 'reopen' : 'complete'}`}
                                    onClick={() => handleToggleCompleteAppointment(appt.id)}
                                  >
                                    <Check size={12} weight="bold" />
                                    <span>{appt.completed ? (language === 'en' ? 'Reopen' : 'Tekrar Aç') : (language === 'en' ? 'Complete' : 'Tamamlandı')}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="appointment-action-btn delete"
                                    onClick={() => handleDeleteAppointment(appt.id)}
                                    title={language === 'en' ? 'Delete' : 'Sil'}
                                  >
                                    <Trash size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 4. Doktor Notları */}
                      <div className="settings-section-head" style={{ marginTop: '20px' }}>
                        <ClipboardText size={18} weight="bold" className="settings-section-icon" />
                        <h4>{t.doctorNotesSection}</h4>
                      </div>
                      <div className="settings-detail-card">
                        <textarea
                          className="profile-notes-textarea"
                          rows={3}
                          value={doctorNotes}
                          onChange={(e) => setDoctorNotes(e.target.value)}
                          placeholder={t.doctorNotesPlaceholder}
                          onBlur={syncProfileSettings}
                        />
                      </div>

                      {/* 5. Butonlar */}
                      <div className="profile-action-group">
                        <button
                          type="button"
                          className="profile-action-btn share-btn"
                          onClick={handleShareMedList}
                        >
                          <ShareNetwork size={18} weight="bold" />
                          <span>{t.doctorShareMedList}</span>
                        </button>

                        <button
                          type="button"
                          className="profile-action-btn save-btn"
                          onClick={() => {
                            syncProfileSettings();
                            setToast({ text: t.profileSavedToast });
                          }}
                        >
                          <CheckCircle size={18} weight="bold" />
                          <span>{language === 'en' ? 'Save Profile Details' : 'Bilgileri Kaydet'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                {/* SUB PAGE: DİL / LANGUAGE */}
                {settingsSubPage === 'language' && (
                  <div className="settings-detail-card">
                    <div className="settings-section-head">
                      <Globe size={18} weight="bold" className="settings-section-icon" />
                      <h4>{t.languageTitle}</h4>
                    </div>

                    <div className="language-options-list">
                      <button
                        type="button"
                        className={`language-option-btn ${language === 'tr' ? 'active' : ''}`}
                        onClick={() => updateLanguage('tr')}
                      >
                        <div className="language-option-info">
                          <div className="language-option-head">
                            <span className="language-option-name">Türkçe</span>
                            <span className="language-default-tag">Varsayılan</span>
                          </div>
                          <span className="language-option-desc">Uygulama arayüzü ve bildirimler Türkçe görüntülenir</span>
                        </div>
                        <div className={`language-radio ${language === 'tr' ? 'checked' : ''}`}>
                          {language === 'tr' && <Check size={14} weight="bold" />}
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`language-option-btn ${language === 'en' ? 'active' : ''}`}
                        onClick={() => updateLanguage('en')}
                      >
                        <div className="language-option-info">
                          <div className="language-option-head">
                            <span className="language-option-name">English</span>
                          </div>
                          <span className="language-option-desc">App interface and notifications will be displayed in English</span>
                        </div>
                        <div className={`language-radio ${language === 'en' ? 'checked' : ''}`}>
                          {language === 'en' && <Check size={14} weight="bold" />}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB PAGE 2: SES VE BİLDİRİMLER */}
                {settingsSubPage === 'notifications' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><SpeakerHigh size={18} /> Ses & Bildirimler</h3>
                    
                    <button className="setting-row" role="switch" aria-checked={notifications} onClick={() => setNotifications(!notifications)}>
                      <span><strong>Hatırlatıcı Bildirimler</strong><small>İlaç vaktiniz geldiğinde sistem bildirimi gönder</small></span>
                      <span className={`switch ${notifications ? 'on' : ''}`}><span/></span>
                    </button>

                    <button className="setting-row" role="switch" aria-checked={soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)}>
                      <span><strong>Bildirim Sesi</strong><small>Bildirim geldiğinde seçilen melodiyi çal</small></span>
                      <span className={`switch ${soundEnabled ? 'on' : ''}`}><span/></span>
                    </button>

                    <div className="sound-selection-area">
                      <span className="sub-label">BİLDİRİM SESİ SEÇİMİ</span>
                      <div className="sound-cards-grid">
                        {SOUND_OPTIONS.map((opt) => {
                          const isSelected = soundType === opt.type;
                          return (
                            <div
                              key={opt.type}
                              className={`sound-card ${isSelected ? 'active' : ''}`}
                              onClick={() => {
                                setSoundType(opt.type);
                                if (soundEnabled) playPreviewSound(opt.type);
                              }}
                            >
                              <div className="sound-card-header">
                                <span className="sound-card-title">{opt.title}</span>
                                {isSelected && <CheckCircle size={16} weight="fill" className="mint-text" />}
                              </div>
                              <p className="sound-card-desc">{opt.desc}</p>
                              <div className="sound-card-footer">
                                <span className="sound-tag">{opt.freq}</span>
                                <button
                                  type="button"
                                  className="listen-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playPreviewSound(opt.type);
                                    if (!soundEnabled) {
                                      setToast({ text: `${opt.title} sesi çalındı (Bildirim sesi şu an kapalı)` });
                                    }
                                  }}
                                >
                                  <Play size={11} weight="fill" />
                                  <span>Dinle</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB PAGE 3: HATIRLATICI & ERTELEME */}
                {settingsSubPage === 'reminders' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><Clock size={18} /> Hatırlatıcı & Erteleme</h3>
                    
                    <div className="setting-card">
                      <span className="sub-label">VARSAYILAN ERTELEME SÜRESİ</span>
                      <div className="choice-chip-row" style={{ marginTop: 8 }}>
                        {[5, 10, 15, 30].map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`chip-btn ${snoozeMinutes === m ? 'active' : ''}`}
                            onClick={() => {
                              setSnoozeMinutes(m);
                              setToast({ text: `Erteleme süresi ${m} dakika olarak ayarlandı` });
                            }}
                          >
                            {m} dk
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="setting-card" style={{ marginTop: 12 }}>
                      <span className="sub-label">ÖNCEDEN HATIRLATMA</span>
                      <div className="choice-chip-row" style={{ marginTop: 8 }}>
                        {[0, 5, 10, 15].map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`chip-btn ${leadTimeMinutes === m ? 'active' : ''}`}
                            onClick={() => {
                              setLeadTimeMinutes(m);
                              setToast({ text: m === 0 ? 'Önceden hatırlatma kapatıldı (Tam vaktinde)' : `${m} dakika önceden hatırlatılacak` });
                            }}
                          >
                            {m === 0 ? 'Vaktinde' : `${m} dk önce`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <button className="setting-row" role="switch" aria-checked={repeatNagEnabled} onClick={() => setRepeatNagEnabled(!repeatNagEnabled)}>
                        <span><strong>Israrcı Tekrar Uyarısı</strong><small>İlaç alınana kadar her 3 dakikada bir uyar</small></span>
                        <span className={`switch ${repeatNagEnabled ? 'on' : ''}`}><span/></span>
                      </button>

                      {repeatNagEnabled && (
                        <div className="setting-card" style={{ marginTop: 10 }}>
                          <span className="sub-label">MAKSİMUM TEKRAR SAYISI</span>
                          <div className="choice-chip-row" style={{ marginTop: 8 }}>
                            {[
                              { count: 3, label: '3 Tekrar (9 dk)' },
                              { count: 5, label: '5 Tekrar (15 dk)' },
                              { count: 10, label: '10 Tekrar (30 dk)' },
                            ].map((opt) => (
                              <button
                                key={opt.count}
                                type="button"
                                className={`chip-btn ${repeatNagCount === opt.count ? 'active' : ''}`}
                                onClick={() => {
                                  setRepeatNagCount(opt.count);
                                  setToast({ text: `Tekrar uyarısı: ${opt.label}` });
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUB PAGE 4: CİHAZ GÜVENİLİRLİĞİ & ALARM KORUMASI */}
                {settingsSubPage === 'reliability' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><Shield size={18} /> Cihaz Güvenilirliği & Alarm Koruması</h3>

                    <div className="reliability-proto-card">
                      <div className="reliability-proto-header">
                        <div className="reliability-proto-badge">
                          <CheckCircle size={14} weight="fill" />
                          <span>{batteryExemptionEnabled && exactAlarmEnabled ? 'Arka Plan Koruması Tam' : 'Kısmi Koruma'}</span>
                        </div>
                        <span className="reliability-proto-version">Android 14+ / iOS Uyumlu</span>
                      </div>

                      {/* 1. Pil Optimizasyonu Muafiyeti */}
                      <div className="reliability-proto-item">
                        <div className="reliability-item-text">
                          <strong>Pil Optimizasyonu Muafiyeti</strong>
                          <small>Telefon Doze (derin uyku) modundayken alarmların gecikmesini veya atlanmasını engeller</small>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={batteryExemptionEnabled}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          onClick={() => {
                            const next = !batteryExemptionEnabled;
                            setBatteryExemptionEnabled(next);
                            setToast({ text: next ? '⚡ Pil optimizasyon muafiyeti devrede' : 'Pil muafiyeti kapatıldı' });
                          }}
                        >
                          <span className={`switch ${batteryExemptionEnabled ? 'on' : ''}`}><span/></span>
                        </button>
                      </div>

                      {/* 2. Hassas Alarm İzni (Exact Alarm) */}
                      <div className="reliability-proto-item">
                        <div className="reliability-item-text">
                          <strong>Hassas Alarm İzni (Exact Alarm)</strong>
                          <small>İlaç zamanlayıcılarının saniyesi saniyesine ve yüksek öncelikli çalması için sistem alarm izni</small>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={exactAlarmEnabled}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          onClick={() => {
                            const next = !exactAlarmEnabled;
                            setExactAlarmEnabled(next);
                            setToast({ text: next ? '⏰ Hassas alarm zamanlayıcısı devrede' : 'Hassas alarm kapatıldı' });
                          }}
                        >
                          <span className={`switch ${exactAlarmEnabled ? 'on' : ''}`}><span/></span>
                        </button>
                      </div>

                      {/* 3. Yeniden Başlatma Koruması (Boot) */}
                      <div className="reliability-proto-item">
                        <div className="reliability-item-text">
                          <strong>Yeniden Başlatma Koruması (Boot)</strong>
                          <small>Telefon kapatılıp açıldığında aktif tüm günlük ilaç alarmları otomatik baştan kurulur</small>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={autoRescheduleOnBoot}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          onClick={() => {
                            const next = !autoRescheduleOnBoot;
                            setAutoRescheduleOnBoot(next);
                            setToast({ text: next ? '🔄 Yeniden başlatma koruması devrede' : 'Yeniden başlatma koruması kapatıldı' });
                          }}
                        >
                          <span className={`switch ${autoRescheduleOnBoot ? 'on' : ''}`}><span/></span>
                        </button>
                      </div>

                      {/* 4. Ekran Kapalıyken Uyandırma (Wake Screen) */}
                      <div className="reliability-proto-item">
                        <div className="reliability-item-text">
                          <strong>Ekran Kapalıyken Uyandır</strong>
                          <small>Alarm saatinde telefon kilitliyse ekranı aydınlatıp tam ekran ilaç uyarısını gösterir</small>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={wakeScreenOnAlarm}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          onClick={() => {
                            const next = !wakeScreenOnAlarm;
                            setWakeScreenOnAlarm(next);
                            setToast({ text: next ? '💡 Ekran uyandırma aktif' : 'Ekran uyandırma kapatıldı' });
                          }}
                        >
                          <span className={`switch ${wakeScreenOnAlarm ? 'on' : ''}`}><span/></span>
                        </button>
                      </div>

                      {/* 5. Üretici Özel Koruması */}
                      <div className="reliability-proto-item">
                        <div className="reliability-item-text">
                          <strong>Üretici Arka Plan Ayarları</strong>
                          <small>Xiaomi (MIUI), Samsung (OneUI) veya Huawei cihazlarda "Otomatik Başlatma" ve serbest arka plan</small>
                        </div>
                        <button
                          type="button"
                          className="reliability-action-btn"
                          onClick={() => setToast({ text: '⚙️ Xiaomi/Samsung otomatik başlatma izinleri kontrol edildi' })}
                        >
                          İzinleri Aç
                        </button>
                      </div>

                      {/* 6. Canlı Alarm & Kilit Ekranı Test Butonu */}
                      <button
                        type="button"
                        className="reliability-test-btn"
                        onClick={() => {
                          if (soundEnabled) playPreviewSound(soundType);
                          const sampleDose = nextSlot?.dose ?? doses[0] ?? {
                            id: 999,
                            name: 'Coraspin',
                            amount: '100 mg',
                            time: '09:00',
                          };
                          setToast({ text: '⏱️ Canlı alarm testi: 3 saniye sonra bildirim ve alarm çalacak!' });
                          setTimeout(() => {
                            setActiveSimulatedNotification({
                              title: privateMode ? '⏰ İlaç Vakti' : `🚨 Canlı Alarm: ${sampleDose.name} (${sampleDose.amount})`,
                              body: 'Arka plan alarm servisi ve uyandırma başarıyla devrede!',
                              doseId: sampleDose.id,
                              time: sampleDose.time,
                              isRepeat: false,
                            });
                          }, 3000);
                        }}
                      >
                        <Play size={15} weight="fill" />
                        <span>Canlı Alarm ve Uyandırmayı Test Et (3 Sn)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB PAGE 5: STOK & ENVANTER */}
                {settingsSubPage === 'stock' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><Package size={18} /> Stok & Envanter</h3>

                    <button className="setting-row" role="switch" aria-checked={stockAlertsEnabled} onClick={() => setStockAlertsEnabled(!stockAlertsEnabled)}>
                      <span><strong>Stok Takibi & Kritik Uyarılar</strong><small>İlaç azaldığında uyarı bildirimi göster</small></span>
                      <span className={`switch ${stockAlertsEnabled ? 'on' : ''}`}><span/></span>
                    </button>

                    <div className="setting-card" style={{ marginTop: 12 }}>
                      <span className="sub-label">VARSAYILAN KRİTİK STOK EŞİĞİ</span>
                      <div className="choice-chip-row" style={{ marginTop: 8 }}>
                        {[3, 5, 7, 10].map((th) => (
                          <button
                            key={th}
                            type="button"
                            className={`chip-btn ${defaultStockThreshold === th ? 'active' : ''}`}
                            onClick={() => {
                              setDefaultStockThreshold(th);
                              setToast({ text: `Kritik stok eşiği ${th} adet olarak ayarlandı` });
                            }}
                          >
                            {th} adet
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB PAGE 6: GÖRÜNÜM & GİZLİLİK */}
                {settingsSubPage === 'privacy' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><EyeSlash size={18} /> Görünüm & Gizlilik</h3>

                    <button className="setting-row" role="switch" aria-checked={privateMode} onClick={() => setPrivateMode(!privateMode)}>
                      <span><strong>İlaç Adını Gizle (Gizli Mod)</strong><small>Kilit ekranında ilaç adı yerine "İlaç vakti" yazar</small></span>
                      <span className={`switch ${privateMode ? 'on' : ''}`}><span/></span>
                    </button>

                    <button className="setting-row" role="switch" aria-checked={hideDoseAmount} onClick={() => setHideDoseAmount(!hideDoseAmount)}>
                      <span><strong>Doz Miktarını Gizle</strong><small>Bildirimde 1 tablet gibi miktarları gizle</small></span>
                      <span className={`switch ${hideDoseAmount ? 'on' : ''}`}><span/></span>
                    </button>

                    <button className="setting-row" role="switch" aria-checked={largeText} onClick={() => setLargeText(!largeText)}>
                      <span><strong>Büyük Yazı Tipi</strong><small>Destekleyici metinleri büyüt</small></span>
                      <span className={`switch ${largeText ? 'on' : ''}`}><span/></span>
                    </button>

                    {/* Kilit Ekranı Canlı Bildirim Önizleme Kartı */}
                    <div className="lockscreen-card">
                      <div className="lockscreen-header">
                        <div className="flex-row items-center gap-6">
                          <Bell size={16} className="mint-text" />
                          <span className="lockscreen-app-name">Reminder Health · Kilit Ekranı Önizlemesi</span>
                        </div>
                        <span className="lockscreen-sound-badge">
                          {soundEnabled ? SOUND_OPTIONS.find(s => s.type === soundType)?.title : 'Sessiz'}
                        </span>
                      </div>
                      <div className="lockscreen-body">
                        <strong>
                          {notifications ? (
                            privateMode ? 'İlaç vaktiniz geldi' : `${nextSlot?.dose.name ?? 'Örnek İlaç'} Vakti (${hideDoseAmount ? 'Planlı doz' : (nextSlot?.dose.amount ?? '1 doz')})`
                          ) : 'Hatırlatmalar kapalı'}
                        </strong>
                        <p className="lockscreen-detail-line">
                          💊 Doz: {hideDoseAmount ? 'Planlı doz' : (nextSlot?.dose.amount ?? '1 doz')} · {nextSlot?.dose.mealCondition ? (mealLabels[nextSlot.dose.mealCondition] ?? 'Zamanında') : 'Zamanında'}
                        </p>
                        <p className="lockscreen-detail-line">
                          ℹ️ Talimat: {nextSlot?.dose.instructions || 'Kullanım talimatına göre alınız.'}
                        </p>
                        <p className="lockscreen-detail-line">
                          📦 Kalan Stok: {nextSlot?.dose.stock !== undefined ? `${nextSlot.dose.stock} adet` : 'Belirtilmedi'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="test-notify-btn"
                        onClick={() => {
                          if (soundEnabled) playPreviewSound(soundType);
                          const sampleDose = nextSlot?.dose ?? doses[0] ?? {
                            id: 999,
                            name: 'Örnek İlaç',
                            amount: '1 doz',
                            time: '09:00',
                          };
                          setActiveSimulatedNotification({
                            title: privateMode ? '⏰ İlaç Vakti' : `⏰ ${sampleDose.name} Vakti (${sampleDose.amount})`,
                            body: privateMode ? 'Planlı ilacınızı alma zamanı geldi.' : '💊 İlacınızı alınız.',
                            doseId: sampleDose.id,
                            time: sampleDose.time,
                            isRepeat: false,
                          });
                          setToast({
                            text: notifications ? '🔔 Test: Bildirim kartı indirildi' : 'Hatırlatmalar kapalı'
                          });
                        }}
                      >
                        <Play size={13} weight="fill" />
                        <span>Önizleme Bildirimi Tetikle</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB PAGE 7: DENEYİM & TİTREŞİM */}
                {settingsSubPage === 'experience' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><SlidersHorizontal size={18} /> Deneyim & Titreşim</h3>

                    <button className="setting-row" role="switch" aria-checked={autoCollapseTaken} onClick={() => setAutoCollapseTaken(!autoCollapseTaken)}>
                      <span><strong>Alınan Dozları Daralt</strong><small>Alındı olarak işaretlenen ilaçları listede kompakt göster</small></span>
                      <span className={`switch ${autoCollapseTaken ? 'on' : ''}`}><span/></span>
                    </button>

                    <button className="setting-row" role="switch" aria-checked={hapticsEnabled} onClick={() => setHapticsEnabled(!hapticsEnabled)}>
                      <span><strong>Dokunsal Titreşim (Haptik)</strong><small>Butonlara basıldığında hafif titreşim geribildirimi</small></span>
                      <span className={`switch ${hapticsEnabled ? 'on' : ''}`}><span/></span>
                    </button>
                  </div>
                )}

                {/* SUB PAGE 8: SENKRONİZASYON & YEDEKLEME */}
                {settingsSubPage === 'sync' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><CloudArrowUp size={18} style={{ color: '#38bdf8' }} /> Bulut Eşitleme (Senkronizasyon)</h3>

                    <div className="sync-card-web">
                      <p className="sync-card-desc-web">
                        Verilerinizi cihazlarınız arasında çift yönlü ve güvenli (Smart Merge) senkronize edin.
                      </p>

                      {session ? <div>
                        <p className="sync-card-desc-web">{t.syncConnectedAccount}: <strong style={{ color: '#34d399' }}>{session.user.name}</strong></p>
                        
                        <div style={{ background: '#071626', padding: 8, borderRadius: 6, margin: '8px 0', border: '1px solid #1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>
                              ✉️ {t.syncEmailLabel}: <strong style={{ color: session.user.email ? '#38bdf8' : '#64748b' }}>{session.user.email || 'Belirtilmedi'}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => { setAuthEmail(session.user.email || ''); setEditingEmail(!editingEmail); }}
                              style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                            >
                              {editingEmail ? t.cancel : (session.user.email ? 'Değiştir' : '+ Ekle')}
                            </button>
                          </div>
                          {editingEmail && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              <KeyboardInput type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder={t.syncEmailPlaceholder} style={{ flex: 1, height: 32, fontSize: 11 }} />
                              <button type="button" className="sync-primary-btn-web" style={{ padding: '0 10px', height: 32, fontSize: 11 }} onClick={handleUpdateEmail} disabled={authBusy || !authEmail.trim()}>
                                {authBusy ? '...' : t.syncUpdateEmail}
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {activeSyncCode && (
                          <div style={{ background: '#071626', padding: 10, borderRadius: 8, margin: '10px 0', border: '1px solid #1e293b' }}>
                            <div style={{ color: '#a9dfca', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                              📱 2. CİHAZ İÇİN EŞİTLEME KODUNUZ:
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#030c14', padding: '6px 8px', borderRadius: 4, gap: 6 }}>
                              <code style={{ flex: 1, wordBreak: 'break-all', fontSize: 11, color: '#f8fafc' }}>{activeSyncCode}</code>
                              <button
                                type="button"
                                style={{ background: '#38bdf8', color: '#04101e', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}
                                onClick={() => { navigator.clipboard?.writeText(activeSyncCode); setToast({ text: t.syncCopied }); setTimeout(() => setToast(null), 2500); }}
                              >
                                {t.syncCopy}
                              </button>
                            </div>
                            <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
                              İkinci telefonunuza bu kodu girerek aynı hesaba anında bağlayabilirsiniz.
                            </div>
                          </div>
                        )}

                        <button className="sync-secondary-btn-web" onClick={handleLogout} disabled={authBusy || syncStatus === 'syncing'}>{t.syncDisconnect}</button>
                      </div> : recoveryMode ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label className="sync-card-desc-web">{t.syncRecoveryKeyLabel}
                          <KeyboardInput type="text" value={recoveryKey} onChange={e=>setRecoveryKey(e.target.value)} autoComplete="off" placeholder={t.syncRecoveryKeyPlaceholder} />
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="sync-primary-btn-web" style={{ flex: 1 }} onClick={handleRecover} disabled={authBusy || !recoveryKey.trim()}>{authBusy ? 'Kurtarılıyor…' : t.syncRecoverBtn}</button>
                          <button type="button" className="sync-secondary-btn-web" onClick={() => { setRecoveryMode(false); setRecoveryKey(''); }} disabled={authBusy}>Vazgeç</button>
                        </div>
                      </div> : <div>
                        <div style={{ background: '#071b2e', padding: 12, borderRadius: 8, border: '1px solid #38bdf8', marginBottom: 12 }}>
                          <div style={{ color: '#38bdf8', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>✨ İLK KURULUM (1. CİHAZ)</div>
                          <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 8px 0' }}>
                            E-posta adresinizi girin ve yeni bir eşitleme kodu oluşturarak başlayın.
                          </p>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: 10, marginBottom: 4 }}>{t.syncEmailLabel}</label>
                            <KeyboardInput type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder={t.syncEmailPlaceholder} style={{ width: '100%', height: 32, fontSize: 11 }} />
                          </div>
                          <button type="button" className="sync-primary-btn-web" style={{ width: '100%' }} onClick={handleRegister} disabled={authBusy}>
                            {authBusy ? 'Oluşturuluyor…' : '✨ Yeni Eşitleme Kodu Oluştur'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                          <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
                          <span style={{ color: '#64748b', fontSize: 10, fontWeight: 700, margin: '0 8px' }}>VEYA 2. CİHAZI BAĞLA</span>
                          <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <label className="sync-card-desc-web">{t.syncCodeLabel}
                            <KeyboardInput type="password" value={syncCode} onChange={e=>setSyncCode(e.target.value)} autoComplete="off" placeholder="1. cihazdaki kodu girin" />
                          </label>
                          <button className="sync-primary-btn-web" onClick={handleLogin} disabled={authBusy || !syncCode.trim()}>{authBusy ? 'Bağlanıyor…' : t.syncConnectBtn}</button>
                          <button type="button" style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 12, cursor: 'pointer', padding: '4px 0', textAlign: 'left' }} onClick={() => setRecoveryMode(true)} disabled={authBusy}>🔑 {t.syncForgotCode}</button>
                        </div>
                      </div>}

                      {recoveredCredentials && (
                        <div style={{ background: '#0c2238', border: '1px solid #38bdf8', borderRadius: 8, padding: 12, marginTop: 12, color: '#e2e8f0', fontSize: 12 }}>
                          <h4 style={{ margin: '0 0 6px 0', color: '#38bdf8', fontSize: 14 }}>{t.syncNewCredentialsTitle}</h4>
                          <p style={{ margin: '0 0 10px 0', color: '#94a3b8', fontSize: 11 }}>{t.syncNewCredentialsWarning}</p>
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ color: '#a9dfca', fontWeight: 600, marginBottom: 2 }}>{t.syncNewSyncCode}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#071626', padding: '6px 8px', borderRadius: 4 }}>
                              <code style={{ flex: 1, wordBreak: 'break-all', fontSize: 11, color: '#f1f5f9' }}>{recoveredCredentials.syncCode}</code>
                              <button type="button" style={{ background: '#38bdf8', color: '#04101e', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontWeight: 600, fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(recoveredCredentials.syncCode); setToast({ text: t.syncCopied }); setTimeout(() => setToast(null), 2500); }}>{t.syncCopy}</button>
                            </div>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ color: '#a9dfca', fontWeight: 600, marginBottom: 2 }}>{t.syncNewRecoveryKey}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#071626', padding: '6px 8px', borderRadius: 4 }}>
                              <code style={{ flex: 1, wordBreak: 'break-all', fontSize: 11, color: '#f1f5f9', letterSpacing: 1 }}>{recoveredCredentials.recoveryKey}</code>
                              <button type="button" style={{ background: '#38bdf8', color: '#04101e', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontWeight: 600, fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(recoveredCredentials.recoveryKey); setToast({ text: t.syncCopied }); setTimeout(() => setToast(null), 2500); }}>{t.syncCopy}</button>
                            </div>
                          </div>
                          <button type="button" className="sync-primary-btn-web" style={{ width: '100%' }} onClick={() => setRecoveredCredentials(null)}>Tamam</button>
                        </div>
                      )}

                      {syncStatusMsg && (
                        <div className={`sync-status-badge-web ${syncStatus}`}>
                          {syncStatus === 'connected' ? <CheckCircle size={16} color="#34d399" weight="fill" /> :
                           syncStatus === 'error' ? <Warning size={16} color="#f87171" weight="bold" /> :
                           <ArrowsClockwise size={16} color="#38bdf8" className={syncStatus === 'syncing' ? 'spin' : ''} />}
                          <span>{syncStatusMsg}</span>
                        </div>
                      )}

                      <div className="sync-buttons-row-web">
                        <button
                          type="button"
                          className="sync-secondary-btn-web"
                          onClick={handleTestConnection}
                          disabled={authBusy || syncStatus === 'testing' || syncStatus === 'syncing'}
                        >
                          <WifiHigh size={16} />
                          <span>{syncStatus === 'testing' ? 'Bağlanıyor...' : 'Bağlantıyı Test Et'}</span>
                        </button>

                        <button
                          type="button"
                          className="sync-primary-btn-web"
                          onClick={handleSyncNow}
                          disabled={!session || authBusy || syncStatus === 'testing' || syncStatus === 'syncing'}
                        >
                          <ArrowsClockwise size={16} className={syncStatus === 'syncing' ? 'spin' : ''} />
                          <span>{syncStatus === 'syncing' ? 'Eşitleniyor...' : 'Şimdi Eşitle'}</span>
                        </button>
                      </div>
                    </div>

                    <h3 className="settings-group-title"><SlidersHorizontal size={18} /> Otomatik Eşitleme</h3>
                    <button className="setting-row" role="switch" aria-checked={false} disabled>
                      <span><strong>Otomatik Senkronizasyon</strong><small>Şimdilik Şimdi Eşitle düğmesini kullanın; otomatik eşitleme yakında</small></span>
                      <span className={`switch ${autoSync ? 'on' : ''}`}><span/></span>
                    </button>
                    {lastSyncAt && (
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 16px 8px' }}>
                        🕒 Son başarılı eşitleme: {lastSyncAt}
                      </p>
                    )}

                    <h3 className="settings-group-title"><DownloadSimple size={18} /> Çevrimdışı JSON Yedekleme</h3>
                    <div className="sync-card-web">
                      <p className="sync-card-desc-web">
                        Sunucunuz olmasa dahi tüm ilaçlarınızı, kullanım geçmişinizi ve ayarlarınızı .json dosyası olarak bilgisayarınıza kaydedebilir veya geri yükleyebilirsiniz.
                      </p>

                      <div className="sync-buttons-row-web">
                        <button type="button" className="sync-secondary-btn-web" onClick={handleExportBackup}>
                          <DownloadSimple size={16} />
                          <span>Yedeği İndir (.json)</span>
                        </button>

                        <button type="button" className="sync-secondary-btn-web" onClick={() => fileInputRef.current?.click()}>
                          <UploadSimple size={16} />
                          <span>Yedekten Yükle (.json)</span>
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        style={{ display: 'none' }}
                        onChange={handleImportFileChange}
                      />
                    </div>
                  </div>
                )}

                {/* SUB PAGE 9: HATA & TANILAMA GÜNLÜĞÜ */}
                {settingsSubPage === 'diagnostics' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><Bug size={18} style={{ color: '#f0b484' }} /> Hata & Tanılama Günlüğü</h3>

                    {/* Summary & Toolbar Card */}
                    <div className="diag-card-web">
                      <div className="diag-header-web">
                        <div>
                          <strong style={{ color: '#f5f3f0', fontSize: '13px' }}>Sistem Sağlık Durumu</strong>
                          <p style={{ color: '#94a3b8', fontSize: '11.5px', margin: '2px 0 0 0' }}>
                            {diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length > 0
                              ? `${diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length} hata kaydı mevcut`
                              : 'Sistem kararlı, aktif hata yok'}
                          </p>
                        </div>
                        <div className={`diag-status-badge-web ${diagnosticsLogs.some(l => l.level === 'ERROR' || l.level === 'FATAL') ? 'error' : 'ok'}`}>
                          {diagnosticsLogs.length} / 100 Kayıt
                        </div>
                      </div>

                      <div className="diag-actions-row-web">
                        <button
                          type="button"
                          className="diag-action-btn-web primary"
                          onClick={() => {
                            const text = webLogger.exportLogsAsText();
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(text);
                              setToast({ text: 'Tanılama günlüğü panoya kopyalandı' });
                            }
                          }}
                        >
                          <UploadSimple size={15} />
                          <span>Günlüğü Kopyala</span>
                        </button>

                        <button
                          type="button"
                          className="diag-action-btn-web danger"
                          onClick={() => {
                            if (window.confirm('Tüm hata ve tanılama kayıtları silinsin mi?')) {
                              webLogger.clearLogs();
                              setToast({ text: 'Tanılama günlüğü temizlendi' });
                            }
                          }}
                        >
                          <Trash size={15} />
                          <span>Temizle</span>
                        </button>
                      </div>

                      {/* Test Error Generation */}
                      <div className="diag-simulation-box-web">
                        <span className="diag-sim-label-web">Hata Test & Simülasyonu:</span>
                        <div className="diag-sim-buttons-web">
                          <button
                            type="button"
                            className="diag-sim-btn-web warn"
                            onClick={() => {
                              webLogger.warn('Test', 'Kullanıcı tarafından test uyarısı üretildi.', { source: 'WebDiagnosticsUI' });
                              setToast({ text: '⚠️ Test uyarısı günlüğe eklendi' });
                            }}
                          >
                            ⚠️ Test Uyarısı (WARN)
                          </button>
                          <button
                            type="button"
                            className="diag-sim-btn-web error"
                            onClick={() => {
                              try {
                                throw new Error('Kullanıcı kontrollü web test hatası (Simüle Edilmiş)');
                              } catch (err) {
                                webLogger.error('Test', 'Simüle edilmiş hata yakalandı.', err, { origin: 'WebManualTrigger' });
                              }
                              setToast({ text: '💥 Test hatası yakalandı ve kaydedildi' });
                            }}
                          >
                            💥 Test Hatası (ERROR)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="diag-filters-web">
                      {(['ALL', 'ERROR', 'WARN'] as const).map(f => {
                        const count = f === 'ALL'
                          ? diagnosticsLogs.length
                          : f === 'ERROR'
                          ? diagnosticsLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length
                          : diagnosticsLogs.filter(l => l.level === 'WARN').length;
                        return (
                          <button
                            key={f}
                            type="button"
                            className={`diag-filter-chip-web ${diagnosticsFilter === f ? 'active' : ''}`}
                            onClick={() => setDiagnosticsFilter(f)}
                          >
                            {f === 'ALL' ? 'Tümü' : f === 'ERROR' ? 'Hatalar' : 'Uyarılar'} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Log list */}
                    {diagnosticsLogs
                      .filter(l => {
                        if (diagnosticsFilter === 'ERROR') return l.level === 'ERROR' || l.level === 'FATAL';
                        if (diagnosticsFilter === 'WARN') return l.level === 'WARN';
                        return true;
                      })
                      .length === 0 ? (
                      <div className="diag-empty-web">
                        <CheckCircle size={36} color="var(--mint)" />
                        <strong>Tertemiz!</strong>
                        <p>{diagnosticsFilter === 'ALL' ? 'Henüz kaydedilmiş bir sistem günlüğü bulunmuyor.' : 'Seçili filtreye uygun kayıt yok.'}</p>
                      </div>
                    ) : (
                      <div className="diag-logs-list-web">
                        {diagnosticsLogs
                          .filter(l => {
                            if (diagnosticsFilter === 'ERROR') return l.level === 'ERROR' || l.level === 'FATAL';
                            if (diagnosticsFilter === 'WARN') return l.level === 'WARN';
                            return true;
                          })
                          .map(log => {
                            const isExpanded = expandedLogId === log.id;
                            const isErr = log.level === 'ERROR' || log.level === 'FATAL';
                            const isWarn = log.level === 'WARN';

                            return (
                              <div
                                key={log.id}
                                className={`diag-log-item-web ${isErr ? 'err' : isWarn ? 'warn' : 'info'}`}
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              >
                                <div className="diag-log-item-header-web">
                                  <div className="diag-log-item-tag-web">
                                    <span className={`diag-level-pill-web ${log.level.toLowerCase()}`}>{log.level}</span>
                                    <span className="diag-tag-name-web">[{log.tag}]</span>
                                  </div>
                                  <span className="diag-time-str-web">{log.timeStr}</span>
                                </div>
                                <div className="diag-log-message-web">{log.message}</div>

                                {(log.stack || (log.breadcrumbs && log.breadcrumbs.length > 0) || log.details) && (
                                  <div className="diag-toggle-detail-web">
                                    <small>{isExpanded ? 'Detayları Gizle ▲' : 'Detayları Gör ▼'}</small>
                                  </div>
                                )}

                                {isExpanded && (
                                  <div className="diag-expanded-details-web">
                                    {log.details && (
                                      <div className="diag-detail-block-web">
                                        <small>DETAYLAR:</small>
                                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                      </div>
                                    )}
                                    {log.breadcrumbs && log.breadcrumbs.length > 0 && (
                                      <div className="diag-detail-block-web">
                                        <small>SON AYAK İZLERİ (BREADCRUMBS):</small>
                                        <div className="diag-breadcrumbs-trail-web">
                                          {log.breadcrumbs.map((b, bi) => (
                                            <div key={bi} className="diag-breadcrumb-line-web">{b}</div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.stack && (
                                      <div className="diag-detail-block-web">
                                        <small style={{ color: '#fca5a5' }}>STACK TRACE:</small>
                                        <pre className="diag-stack-pre-web">{log.stack}</pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB PAGE 10: VERİLERİ SIFIRLA */}
                {settingsSubPage === 'reset' && (
                  <div className="settings-group" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                    <h3 className="settings-group-title"><ArrowCounterClockwise size={18} style={{ color: '#ff9696' }} /> Verileri Sıfırla</h3>

                    <div className="reset-warning-card" style={{ background: '#20161a', border: '1px solid #4a2128', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                      <div className="flex-row items-center gap-6" style={{ marginBottom: 6 }}>
                        <Warning size={16} style={{ color: '#ff9696' }} weight="bold" />
                        <strong style={{ color: '#ff9696', fontSize: 13 }}>Dikkat: Geri Alınamaz İşlem</strong>
                      </div>
                      <p style={{ color: '#fca5a5', fontSize: 12, lineHeight: 1.4, margin: 0 }}>
                        Bu işlem kaydedilen tüm özel ilaçlarınızı, kullanım geçmişinizi ve ayarlarınızı silerek ilk açılış durumuna döndürür.
                      </p>
                    </div>

                    <button className="secondary full reset-button" type="button" onClick={resetAllData}>
                      <ArrowCounterClockwise size={18} />
                      <span>Fabrika Ayarlarına ve İlk Plana Sıfırla</span>
                    </button>
                  </div>
                )}
          </section>}
        </>}
      </main>
    </MobileScroll>
    {editor && <div className="editor-save" style={{bottom:bottomInset+12}}><button className="primary" type="submit" form="medicine-form"><Check size={24}/>{t.save}</button></div>}
    {!editor && <nav className="bottom-tabs" aria-label="Ana menü" style={{bottom:bottomInset}}>{tabs.map(({name:label,icon:Icon})=><button key={label} className={tab===label?'active':''} aria-current={tab===label?'page':undefined} onClick={()=>navigate(label)}><Icon size={29} weight="regular"/><span>{getTabLabel(label)}</span></button>)}</nav>}
    {toast && <div className="toast" role="status" style={{bottom:bottomInset+86}}><span>{toast.text}</span>{toast.previous && <button onClick={()=>{setDoses(toast.previous!);setToast(null);}}>{t.undo}</button>}<button className="toast-close" onClick={()=>setToast(null)} aria-label="Bildirimi kapat"><X size={16}/></button></div>}
    <BottomSheet open={!!snoozing} onOpenChange={open=>{if(!open)setSnoozing(null);}} title={t.snooze} description={language === 'en' ? `Choose a snooze duration for ${snoozing?.name ?? 'medicine'}.` : `${snoozing?.name ?? 'İlaç'} için bir süre seç. Kullanım saati değişmez.`} snap={0.49}>
      <div className="snooze-options">{[5,10,15,30].map(minutes=><button key={minutes} className="secondary full" onClick={()=>{if(snoozing)change(snoozing.id,{snooze:minutes},`${minutes} ${language === 'en' ? 'min selected · preview' : 'dakika seçildi · önizleme'}`);setSnoozing(null);}}><Clock size={20}/>{minutes} {language === 'en' ? 'minutes later' : 'dakika sonra'}<CaretRight size={18}/></button>)}<button className="text-button" onClick={()=>setSnoozing(null)}>{t.cancel}</button></div>
    </BottomSheet>

    {scannerOpen && (
      <div className="scanner-modal-overlay">
        <div className="scanner-modal-content">
          <div className="scanner-modal-header">
            <button
              type="button"
              className="icon-button"
              onClick={() => setScannerOpen(false)}
              aria-label="Kapat"
            >
              <X size={22} />
            </button>
            <div className="scanner-header-title">
              <strong>ITS KAREKOD TARAYICI</strong>
              <small>GS1 DataMatrix & Barkod</small>
            </div>
            <div style={{ width: 36 }} />
          </div>

          <div className="scanner-viewfinder-container">
            <div className="scanner-viewfinder-frame">
              <div className="viewfinder-corner tl" />
              <div className="viewfinder-corner tr" />
              <div className="viewfinder-corner bl" />
              <div className="viewfinder-corner br" />
              <div className="viewfinder-laser" />
              <Barcode size={64} color="rgba(169, 223, 202, 0.4)" weight="thin" />
            </div>
            <p className="scanner-hint">
              İlaç kutusunun üzerindeki karekodu veya barkodu çerçeve içerisine hizalayınız.
            </p>
          </div>

          <div className="scanner-presets-section">
            <span className="scanner-presets-title">Veya test etmek için örnek bir ilaç seçin:</span>
            <div className="scanner-presets-grid">
              {[
                {
                  name: 'Prograf 1 mg (ITS Karekod)',
                  code: '010869904389033821PRO1234567891727093010LOT99',
                  desc: 'GTIN: 08699043890338 · SKT: 2027-09-30',
                },
                {
                  name: 'Warfmadin 5 mg (ITS Karekod)',
                  code: '010869980901885321WARF123456781726113010LOT88',
                  desc: 'GTIN: 08699809018853 · SKT: 2026-11-30',
                },
                {
                  name: 'Coraspin 100 mg (ITS Karekod)',
                  code: '0108699546011122211234567890121727043010BATCH01',
                  desc: 'GTIN: 08699546011122 · SKT: 2027-04-30',
                },
                {
                  name: 'Parol 500 mg (ITS Karekod)',
                  code: '0108699508010071219876543210981726083110LOT44',
                  desc: 'GTIN: 08699508010071 · SKT: 2026-08-31',
                },
                {
                  name: 'Nexium 40 mg (ITS Karekod)',
                  code: '010869978601008421ABC123XYZ4561726123110NEX01',
                  desc: 'GTIN: 08699786010084 · SKT: 2026-12-31',
                },
                {
                  name: 'Beloc ZOK 50 mg (EAN-13 Barkod)',
                  code: '8699786030044',
                  desc: 'GTIN: 08699786030044 · Standart 1D Barkod',
                },
              ].map(preset => (
                <button
                  key={preset.code}
                  type="button"
                  className="scanner-preset-pill"
                  onClick={() => handleBarcodeScanned(preset.code)}
                >
                  <Pill size={18} color="var(--mint)" weight="fill" />
                  <div style={{ textAlign: 'left' }}>
                    <div>{preset.name}</div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 'normal' }}>{preset.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {appointmentEditorOpen && (
      <AppointmentEditorWebModal
        open={appointmentEditorOpen}
        appointment={editingAppointment}
        onClose={() => {
          setAppointmentEditorOpen(false);
          setEditingAppointment(null);
        }}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        lang={language}
      />
    )}
  </div>;
}

function AppointmentEditorWebModal({
  open,
  appointment,
  onClose,
  onSave,
  onDelete,
  lang = 'tr',
}: {
  open: boolean;
  appointment: AppointmentItem | null;
  onClose: () => void;
  onSave: (saved: AppointmentItem) => void;
  onDelete?: (id: string) => void;
  lang?: 'tr' | 'en';
}) {
  const isEn = lang === 'en';
  const todayStr = new Date().toISOString().slice(0, 10);

  const [doctorName, setDoctorName] = useState(appointment?.doctorName || '');
  const [specialty, setSpecialty] = useState(appointment?.specialty || (isEn ? 'Internal Med' : 'Dahiliye'));
  const [hospital, setHospital] = useState(appointment?.hospital || '');
  const [phone, setPhone] = useState(appointment?.phone || '');
  const [date, setDate] = useState(appointment?.date || '');
  const [time, setTime] = useState(appointment?.time === '09:00' ? '13:00' : (appointment?.time || '13:00'));
  const [leadOptions, setLeadOptions] = useState<string[]>(appointment?.leadOptions || ['1d', '0d']);
  const [notes, setNotes] = useState(appointment?.notes || '');

  // Integrated Blood Test
  const [hasBloodTest, setHasBloodTest] = useState(!!appointment?.hasBloodTest);
  const [bloodTestDate, setBloodTestDate] = useState(appointment?.bloodTestDate || '');
  const [bloodTestTime, setBloodTestTime] = useState(appointment?.bloodTestTime || '08:30');
  const [bloodTestFasting, setBloodTestFasting] = useState(appointment?.bloodTestFasting !== undefined ? appointment.bloodTestFasting : true);
  const [bloodTestNotes, setBloodTestNotes] = useState(appointment?.bloodTestNotes || '');

  const popularSpecialties = isEn
    ? ['Internal Med', 'Ophthalmology', 'Cardiology', 'Neurology', 'ENT', 'Orthopedics', 'Endocrinology', 'Dental']
    : ['Dahiliye', 'Göz', 'Kardiyoloji', 'Nöroloji', 'KBB', 'Ortopedi', 'Endokrinoloji', 'Diş'];

  const handleToggleBloodTest = (val: boolean) => {
    setHasBloodTest(val);
    if (val && !bloodTestDate) {
      if (date) {
        const [y, m, d] = date.split('-').map(Number);
        const target = new Date(y, m - 1, d - 3);
        setBloodTestDate(target.toISOString().slice(0, 10));
      } else {
        setBloodTestDate(todayStr);
      }
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (hasBloodTest && !bloodTestDate && newDate) {
      const [y, m, d] = newDate.split('-').map(Number);
      const target = new Date(y, m - 1, d - 3);
      setBloodTestDate(target.toISOString().slice(0, 10));
    }
  };

  const handleQuickDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const newDate = d.toISOString().slice(0, 10);
    handleDateChange(newDate);
  };

  const handleQuickBloodOffset = (daysBefore: number) => {
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      const target = new Date(y, m - 1, d - daysBefore);
      setBloodTestDate(target.toISOString().slice(0, 10));
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setBloodTestDate(d.toISOString().slice(0, 10));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      alert(isEn ? 'Please select an appointment date.' : 'Lütfen randevu tarihini seçiniz.');
      return;
    }
    if (hasBloodTest && !bloodTestDate) {
      alert(isEn ? 'Please select a lab test date or toggle it off.' : 'Lütfen kan tahlili tarihini seçiniz veya seçeneği kapatınız.');
      return;
    }

    const saved: AppointmentItem = {
      id: appointment?.id || `appt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      doctorName: doctorName.trim(),
      specialty: specialty.trim(),
      hospital: hospital.trim(),
      phone: phone.trim(),
      date,
      time: time || '13:00',
      leadOptions: leadOptions.length > 0 ? leadOptions : ['1d', '0d'],
      hasBloodTest,
      bloodTestDate: hasBloodTest ? bloodTestDate : undefined,
      bloodTestTime: hasBloodTest ? (bloodTestTime || '08:30') : undefined,
      bloodTestFasting: hasBloodTest ? bloodTestFasting : undefined,
      bloodTestNotes: hasBloodTest && bloodTestNotes.trim() ? bloodTestNotes.trim() : undefined,
      notes: notes.trim() || undefined,
      completed: appointment?.completed || false,
      createdAt: appointment?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(saved);
  };

  return (
    <div className="appointment-modal-overlay">
      <div className="appointment-modal-header">
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={isEn ? 'Close' : 'Kapat'}
        >
          <X size={22} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <strong style={{ display: 'block', fontSize: '13px', letterSpacing: '0.8px', color: 'var(--mint)' }}>
            {appointment ? (isEn ? 'EDIT APPOINTMENT' : 'RANDEVUYU DÜZENLE') : (isEn ? 'NEW APPOINTMENT' : 'YENİ RANDEVU EKLE')}
          </strong>
          <small style={{ color: '#94a3b8', fontSize: '10.5px' }}>
            {isEn ? 'Doctor visit & lab preparation' : 'Doktor kontrolü ve tahlil hazırlığı'}
          </small>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          style={{ background: 'transparent', border: 'none', color: 'var(--mint)', cursor: 'pointer', padding: '4px' }}
          title={isEn ? 'Save' : 'Kaydet'}
        >
          <Check size={24} weight="bold" />
        </button>
      </div>

      <form className="appointment-modal-body" onSubmit={handleSubmit}>
        {/* Uzmanlık / Branş */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#adb3bf', marginBottom: '6px' }}>
            {isEn ? 'Specialty / Department' : 'Uzmanlık / Branş'}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {popularSpecialties.map(spec => (
              <button
                key={spec}
                type="button"
                className={`filter-chip ${specialty === spec ? 'active' : ''}`}
                style={{ fontSize: '11px', padding: '5px 10px' }}
                onClick={() => setSpecialty(spec)}
              >
                {specialty === spec ? '✓ ' : ''}{spec}
              </button>
            ))}
          </div>
          <div className="profile-input-box">
            <Pill size={18} className="field-icon" />
            <input
              type="text"
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              placeholder={isEn ? 'e.g. Ophthalmology, Cardiology' : 'Örn. Göz, Kardiyoloji'}
            />
          </div>
        </div>

        {/* Doktor Adı */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#adb3bf', marginBottom: '6px' }}>
            {isEn ? 'Doctor Name' : 'Doktor Adı / Ünvanı'}
          </label>
          <div className="profile-input-box">
            <User size={18} className="field-icon" />
            <input
              type="text"
              value={doctorName}
              onChange={e => setDoctorName(e.target.value)}
              placeholder={isEn ? 'e.g. Dr. John Smith' : 'Örn. Prof. Dr. Ahmet Yılmaz'}
            />
          </div>
        </div>

        {/* Hastane / Klinik */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#adb3bf', marginBottom: '6px' }}>
            {isEn ? 'Hospital / Clinic' : 'Hastane / Klinik'}
          </label>
          <div className="profile-input-box">
            <Buildings size={18} className="field-icon" />
            <input
              type="text"
              value={hospital}
              onChange={e => setHospital(e.target.value)}
              placeholder={isEn ? 'e.g. City Hospital, Clinic' : 'Örn. Şehir Hastanesi, Acıbadem'}
            />
          </div>
        </div>

        {/* Telefon */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#adb3bf', marginBottom: '6px' }}>
            {isEn ? 'Phone / Contact' : 'İletişim / Telefon'}
          </label>
          <div className="profile-input-box">
            <Phone size={18} className="field-icon" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={isEn ? 'e.g. +90 532 123 45 67' : 'Örn. 0532 123 45 67'}
            />
          </div>
        </div>

        {/* Randevu Tarihi ve Saati */}
        <div style={{ background: '#101d29', padding: '12px', borderRadius: '12px', border: '1px solid #1c2e40' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--mint)', marginBottom: '8px' }}>
            📅 {isEn ? 'Appointment Date & Time' : 'Randevu Tarihi ve Saati'}
          </label>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="date"
                className="appointment-date-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={date}
                onChange={e => handleDateChange(e.target.value)}
                required
              />
            </div>
            <div style={{ width: '110px' }}>
              <input
                type="time"
                className="appointment-date-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Date Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <button
              type="button"
              className="filter-chip"
              style={{ fontSize: '10.5px', padding: '4px 8px' }}
              onClick={() => handleQuickDateOffset(0)}
            >
              {isEn ? 'Today' : 'Bugün'}
            </button>
            <button
              type="button"
              className="filter-chip"
              style={{ fontSize: '10.5px', padding: '4px 8px' }}
              onClick={() => handleQuickDateOffset(1)}
            >
              {isEn ? 'Tomorrow' : 'Yarın'}
            </button>
            <button
              type="button"
              className="filter-chip"
              style={{ fontSize: '10.5px', padding: '4px 8px' }}
              onClick={() => handleQuickDateOffset(3)}
            >
              +3 {isEn ? 'days' : 'gün'}
            </button>
            <button
              type="button"
              className="filter-chip"
              style={{ fontSize: '10.5px', padding: '4px 8px' }}
              onClick={() => handleQuickDateOffset(7)}
            >
              +1 {isEn ? 'week' : 'hafta'}
            </button>
            <button
              type="button"
              className="filter-chip"
              style={{ fontSize: '10.5px', padding: '4px 8px' }}
              onClick={() => handleQuickDateOffset(30)}
            >
              +1 {isEn ? 'month' : 'ay'}
            </button>
          </div>

          {/* Quick Time Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['08:30', '09:00', '10:30', '11:00', '13:00', '14:30', '15:30', '16:00'].map(tPreset => (
              <button
                key={tPreset}
                type="button"
                className={`filter-chip ${time === tPreset ? 'active' : ''}`}
                style={{ fontSize: '10.5px', padding: '3px 7px' }}
                onClick={() => setTime(tPreset)}
              >
                ⏰ {tPreset}
              </button>
            ))}
          </div>

          {/* Erken Hatırlatma Çipleri */}
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #1a2938' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#8e9fac', marginBottom: '6px' }}>
              🔔 {isEn ? 'Early Reminders' : 'Önceden Hatırlatmalar'}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: '3d', label: isEn ? '3 days before' : '3 gün önce' },
                { id: '2d', label: isEn ? '2 days before' : '2 gün önce' },
                { id: '1d', label: isEn ? '1 day before' : '1 gün önce' },
                { id: '0d', label: isEn ? 'Day of (05:00 AM)' : 'Randevu günü (05:00)' },
              ].map(opt => {
                const active = leadOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`filter-chip ${active ? 'active' : ''}`}
                    style={{ fontSize: '10.5px', padding: '4px 8px' }}
                    onClick={() => {
                      if (active) setLeadOptions(leadOptions.filter(x => x !== opt.id));
                      else setLeadOptions([...leadOptions, opt.id]);
                    }}
                  >
                    {active ? '✓ ' : '+ '}{opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Randevu İçi Aç Karnına Kan Tahlili Bölümü */}
        <div style={{
          background: hasBloodTest ? 'rgba(167, 139, 250, 0.08)' : '#101d29',
          border: hasBloodTest ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid #1c2e40',
          borderRadius: '12px',
          padding: '12px',
          transition: 'all 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flask size={20} weight={hasBloodTest ? 'fill' : 'bold'} color={hasBloodTest ? '#c4b5fd' : '#8e9fac'} />
              <div>
                <strong style={{ display: 'block', fontSize: '13px', color: hasBloodTest ? '#c4b5fd' : '#f5f3f0' }}>
                  {isEn ? 'Fasting Lab / Blood Test' : 'Aç Karnına Kan Tahlili'}
                </strong>
                <small style={{ color: '#8e9fac', fontSize: '11px' }}>
                  {isEn ? 'Reminder before appointment' : 'Randevu öncesi tetkik ve açlık hatırlatıcısı'}
                </small>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasBloodTest}
                onChange={e => handleToggleBloodTest(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#a78bfa', cursor: 'pointer' }}
              />
            </label>
          </div>

          {hasBloodTest && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(167, 139, 250, 0.2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Quick offset chips */}
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#c4b5fd', marginBottom: '6px' }}>
                  {isEn ? 'Quick date relative to appointment:' : 'Randevuya göre tahlil günü:'}
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="filter-chip"
                    style={{ fontSize: '10.5px', padding: '4px 8px' }}
                    onClick={() => handleQuickBloodOffset(3)}
                  >
                    3 {isEn ? 'days before' : 'gün önce (Önerilen)'}
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    style={{ fontSize: '10.5px', padding: '4px 8px' }}
                    onClick={() => handleQuickBloodOffset(2)}
                  >
                    2 {isEn ? 'days before' : 'gün önce'}
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    style={{ fontSize: '10.5px', padding: '4px 8px' }}
                    onClick={() => handleQuickBloodOffset(1)}
                  >
                    1 {isEn ? 'day before' : 'gün önce'}
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    style={{ fontSize: '10.5px', padding: '4px 8px' }}
                    onClick={() => handleQuickBloodOffset(0)}
                  >
                    {isEn ? 'Same morning' : 'Aynı sabah'}
                  </button>
                </div>
              </div>

              {/* Tahlil Tarihi ve Saati */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#adb3bf', marginBottom: '4px' }}>
                    {isEn ? 'Lab Date' : 'Tahlil Tarihi'}
                  </label>
                  <input
                    type="date"
                    className="appointment-date-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={bloodTestDate}
                    onChange={e => setBloodTestDate(e.target.value)}
                    required={hasBloodTest}
                  />
                </div>
                <div style={{ width: '110px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#adb3bf', marginBottom: '4px' }}>
                    {isEn ? 'Lab Time' : 'Tahlil Saati'}
                  </label>
                  <input
                    type="time"
                    className="appointment-date-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    value={bloodTestTime}
                    onChange={e => setBloodTestTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Aç Karnına Onayı */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(167, 139, 250, 0.1)', padding: '8px 10px', borderRadius: '8px' }}>
                <input
                  type="checkbox"
                  checked={bloodTestFasting}
                  onChange={e => setBloodTestFasting(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#a78bfa', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                  {isEn ? 'Must be fasting (Do not eat/drink before test)' : 'Aç karnına gidilecek (Sabah açlık bildirimi gönderilir)'}
                </span>
              </label>

              {/* Tahlil Notu */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#adb3bf', marginBottom: '4px' }}>
                  {isEn ? 'Lab Notes / Instructions' : 'Tahlil Talimatı / Özel Not'}
                </label>
                <input
                  type="text"
                  className="appointment-date-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={bloodTestNotes}
                  onChange={e => setBloodTestNotes(e.target.value)}
                  placeholder={isEn ? 'e.g. Only water allowed until 08:30' : 'Örn: Sabah 08:30\'a kadar su hariç bir şey yiyip içmeyiniz'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Genel Notlar */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#adb3bf', marginBottom: '6px' }}>
            {isEn ? 'Appointment Notes / Questions for Doctor' : 'Randevu Notları / Doktora Sorulacaklar'}
          </label>
          <textarea
            className="profile-notes-textarea"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={isEn ? 'Write questions or reminders for your doctor visit...' : 'Doktorunuza sormak istediklerinizi veya kontrol notlarınızı buraya yazabilirsiniz...'}
          />
        </div>

        {/* Submit & Cancel & Delete */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            type="submit"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'var(--mint)',
              color: '#081624',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Check size={18} weight="bold" />
            <span>{isEn ? 'Save Appointment' : 'Randevuyu Kaydet'}</span>
          </button>

          {appointment && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm(isEn ? 'Delete this appointment?' : 'Bu randevuyu silmek istediğinize emin misiniz?')) {
                  onDelete(appointment.id);
                  onClose();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: '#361c22',
                color: '#ff9696',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                border: '1px solid #5c2428',
                cursor: 'pointer'
              }}
            >
              <Trash size={16} />
              <span>{isEn ? 'Delete' : 'Sil'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#152332',
              color: '#adb3bf',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #203244',
              cursor: 'pointer'
            }}
          >
            {isEn ? 'Cancel' : 'İptal'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Prototype() {
  return (
    <WebErrorBoundary>
      <InnerPrototype />
    </WebErrorBoundary>
  );
}
