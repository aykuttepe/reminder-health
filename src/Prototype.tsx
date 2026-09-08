import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Bell, CalendarDots, Pill, ClockCounterClockwise, GearSix, Check, CheckCircle, Clock, Prohibit, CaretRight, ClipboardText, Plus, ArrowLeft, PencilSimple, X, Moon, ShieldCheck, ArrowCounterClockwise, Trash, TrendUp, ForkKnife, Drop, Flask, Package, Warning, ArrowsClockwise, SpeakerHigh, SpeakerSlash, User, Eye, EyeSlash, Play, Shield, SlidersHorizontal, Barcode, Camera, CloudArrowUp, WifiHigh, DownloadSimple, UploadSimple, Bug, Globe } from '@phosphor-icons/react';
import { BottomSheet, KeyboardInput, MobileScroll, useKeyboard, useKeyboardInsets } from './mobile';
import { parseITSKarekod } from './itsParser';
import { findMedicineByGTIN, type CatalogMedicine } from './data/medCatalog';
import {
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
  id: number;
  name: string;
  amount: string;
  time: string;
  times?: string[];
  status: 'pending' | 'taken' | 'skipped';
  paused?: boolean;
  snooze?: number;
  mealCondition?: MealCondition;
  form?: MedicineForm;
  instructions?: string;
  stock?: number;
  stockThreshold?: number;
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
  doses?: { id: number; name: string; time: string; amount: string; status: 'taken' | 'skipped' }[];
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
};

const DEFAULT_SETTINGS: PrototypeSettings = {
  userName: '',
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
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

function InnerPrototype() {
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
    doseId?: number;
    time?: string;
    isRepeat?: boolean;
  } | null>(null);
  
  // Sync & Cloud states
  const [serverUrl, setServerUrl] = useState<string>(() => {
    try {
      const cfg = localStorage.getItem(STORAGE_KEY_SYNC_CONFIG);
      return cfg ? JSON.parse(cfg).serverUrl || 'http://localhost:3000' : 'http://localhost:3000';
    } catch { return 'http://localhost:3000'; }
  });
  const [apiToken, setApiToken] = useState<string>(() => {
    try {
      const cfg = localStorage.getItem(STORAGE_KEY_SYNC_CONFIG);
      return cfg ? JSON.parse(cfg).apiToken || '' : '';
    } catch { return ''; }
  });
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
    webLogger.info('System', 'Web prototip başlatıldı (Reminder Health v0.2.1)');
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SYNC_CONFIG,
        JSON.stringify({
          serverUrl,
          apiToken,
          autoSync,
          lastSyncAt,
        })
      );
    } catch (e) {
      console.error('Failed to save sync config to localStorage', e);
    }
  }, [serverUrl, apiToken, autoSync, lastSyncAt]);

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
    doseId: number;
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
        todayAmount: info.todayAmount,
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

  const change = (id: number, patch: Partial<Dose>, text: string) => {
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

  const deleteMedicine = (id: number) => {
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
    const patch = {
      name: name.trim(),
      amount: amount.trim(),
      time: effectiveTimes[0],
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
    else setDoses(ds => [...ds,{id:Date.now(),...patch,status:'pending',slotStatuses:{}}]);
    closeEditor(); setTab('İlaçlarım'); setToast({text:editor?.id ? 'İlaç güncellendi' : 'İlaç planına eklendi',previous});
  };

  // Sync Action Handlers
  const handleTestConnection = async () => {
    keyboard.hide();
    setSyncStatus('testing');
    setSyncStatusMsg('Sunucuya bağlanılıyor...');
    const result = await checkServerHealth(serverUrl, apiToken);
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
      const response = await syncWithServer(serverUrl, apiToken, {
        doses: doses.map(d => ({ ...d, updatedAt: d.updatedAt || Date.now() })),
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
        setDoses(merged);
        if (response.learnedMeds) {
          setLearnedMeds(prev => ({ ...prev, ...response.learnedMeds }));
        }
        const nowStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncAt(nowStr);
        setSyncStatus('connected');
        const activeCount = response.doses.filter(d => !d.deletedAt).length;
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

  const handleExportBackup = () => {
    keyboard.hide();
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
      if (confirm(`Yedek dosyasından ${data.doses.length} ilaç ve ayarlar geri yüklensin mi?`)) {
        setDoses(data.doses);
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
              {Array.from({ length: doseCount }).map((_, idx) => (
                <DualTimeInput
                  key={idx}
                  label={doseCount === 1 ? 'Hatırlatma saati' : `${idx + 1}. Doz saati`}
                  value={times[idx] ?? (idx === 0 ? '08:00' : idx === 1 ? '14:00' : '20:00')}
                  onChange={val => handleTimeChange(idx, val)}
                  onStep={delta => stepTime(idx, delta)}
                />
              ))}
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
            <div className="reliability-status-pill" onClick={() => setTab('Ayarlar')}>
              <div className="status-pill-left">
                <span className="proto-dot-pulse" />
                <ShieldCheck size={14} weight="bold" />
                <span>{language === 'en' ? 'Alarms & 3-Min Repeat Fully Protected' : 'Alarmlar & 3 Dk Tekrarlar Tam Korumalı'}</span>
              </div>
              <span className="status-pill-action">{language === 'en' ? 'Battery / Permissions →' : 'Pil / İzinler →'}</span>
            </div>

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
            {(() => {
              const lowStockMeds = doses.filter(d => !d.paused && (d.stock ?? 10) <= (d.stockThreshold ?? 5));
              if (lowStockMeds.length === 0) return null;
              return (
                <div className="stock-alert-banner">
                  <Warning size={22} weight="bold" />
                  <div>
                    <strong>{lowStockMeds.length} ilacın stoğu azalıyor!</strong>
                    <small>{lowStockMeds.map(m => `${m.name} (${formatStock(m.stock)} kaldı)`).join(', ')} · Eczaneden yazdırmayı unutmayın.</small>
                  </div>
                </div>
              );
            })()}
            <div className="section-label"><span>GÜNLÜK PLAN</span><span>{doses.filter(d => !d.deletedAt).length} ilaç</span></div>
            <div className="medicine-list">{doses.filter(d => !d.deletedAt).map(d=>medicineRow(d))}</div>
            <button className="secondary full" onClick={()=>openEditor()}><Plus size={22}/>Yeni ilaç ekle</button>
            <p className="microcopy">Düzenlemek veya duraklatmak için ilaca dokun.</p>
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
                          <span className="settings-menu-desc">{userName ? `${language === 'en' ? 'Name:' : 'Hitap:'} ${userName}` : (language === 'en' ? 'Configure name & greeting preferences' : 'İsim ve hitap tercihlerini düzenleyin')}</span>
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
                            {lastSyncAt ? `Son eşitleme: ${lastSyncAt}` : 'Ubuntu sunucu eşitleme & JSON yedek'}
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
                      <span style={{ fontWeight: 600, color: 'var(--mint)' }}>Reminder Health v0.2.1 (Web Prototip)</span>
                      <span style={{ display: 'block', fontSize: '11px', marginTop: '2px' }}>Karekod & Senkronizasyon · Güncel Sürüm</span>
                    </div>
                  </>
                )}

                {/* SUB PAGE 1: KULLANICI PROFİLİ */}
                {settingsSubPage === 'profile' && (
                  <div className="profile-setting-card">
                    <div className="profile-icon"><User size={24} weight="bold" /></div>
                    <div className="profile-info">
                      {isEditingUserName ? (
                        <form onSubmit={(e) => { e.preventDefault(); setIsEditingUserName(false); }} className="profile-edit-form">
                          <KeyboardInput
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Adınız"
                            autoFocus
                          />
                          <button type="submit" className="profile-save-btn" aria-label="Kaydet"><Check size={16} /></button>
                        </form>
                      ) : (
                        <div className="profile-display" onClick={() => setIsEditingUserName(true)}>
                          <strong>{userName || 'Kullanıcı'}</strong>
                          <small>Hitap adınızı düzenlemek için dokunun</small>
                        </div>
                      )}
                    </div>
                    {!isEditingUserName && (
                      <button className="icon-button" onClick={() => setIsEditingUserName(true)} aria-label="Adı düzenle">
                        <PencilSimple size={18} />
                      </button>
                    )}
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
                    <h3 className="settings-group-title"><CloudArrowUp size={18} style={{ color: '#38bdf8' }} /> Ubuntu / Self-Hosted Eşitleme</h3>

                    <div className="sync-card-web">
                      <p className="sync-card-desc-web">
                        Kendi Ubuntu sunucunuzdaki veya yerel ağınızdaki Reminder Health REST API'si ile verilerinizi çift yönlü (Smart Merge) senkronize edin.
                      </p>

                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                        Sunucu Adresi (URL)
                        <KeyboardInput
                          value={serverUrl}
                          onChange={e => setServerUrl(e.target.value)}
                          placeholder="http://localhost:3000"
                        />
                      </label>

                      <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                        Erişim Anahtarı (API Token - Opsiyonel)
                        <KeyboardInput
                          type="password"
                          value={apiToken}
                          onChange={e => setApiToken(e.target.value)}
                          placeholder="Bearer token veya boş bırakın"
                        />
                      </label>

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
                          disabled={syncStatus === 'testing' || syncStatus === 'syncing'}
                        >
                          <WifiHigh size={16} />
                          <span>{syncStatus === 'testing' ? 'Bağlanıyor...' : 'Bağlantıyı Test Et'}</span>
                        </button>

                        <button
                          type="button"
                          className="sync-primary-btn-web"
                          onClick={handleSyncNow}
                          disabled={syncStatus === 'testing' || syncStatus === 'syncing'}
                        >
                          <ArrowsClockwise size={16} className={syncStatus === 'syncing' ? 'spin' : ''} />
                          <span>{syncStatus === 'syncing' ? 'Eşitleniyor...' : 'Şimdi Eşitle'}</span>
                        </button>
                      </div>
                    </div>

                    <h3 className="settings-group-title"><SlidersHorizontal size={18} /> Otomatik Eşitleme</h3>
                    <button className="setting-row" role="switch" aria-checked={autoSync} onClick={() => setAutoSync(!autoSync)}>
                      <span><strong>Otomatik Senkronizasyon</strong><small>Uygulama açıldığında veya değişiklik yapıldığında sunucuyla eşitler</small></span>
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
  </div>;
}

export default function Prototype() {
  return (
    <WebErrorBoundary>
      <InnerPrototype />
    </WebErrorBoundary>
  );
}
