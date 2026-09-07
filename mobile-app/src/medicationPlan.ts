export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export type MealCondition = 'tok' | 'ac' | 'yemekle' | 'farketmez';
export type MedicineForm = 'tablet' | 'kapsul' | 'damla' | 'surup';
export type FrequencyType = 'everyday' | 'alternate' | 'cycle' | 'variable';

export type Dose = {
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
  durationMode?: 'continuous' | 'days';
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  statusDate?: string;
  dailyStatuses?: Record<string, Record<string, Dose['status']>>;
  slotStatuses?: Record<string, 'pending' | 'taken' | 'skipped'>;
  gtin?: string;
  expiryDate?: string;
  updatedAt?: number;
  deletedAt?: number;
};

export type DurationInfo = {
  isExpired: boolean;
  hasStarted: boolean;
  isContinuous: boolean;
  currentDay: number;
  totalDays: number;
  daysRemaining: number;
  badgeText: string;
};

export function calculateEndDate(startDateStr: string, days: number): string {
  const parts = (startDateStr || localDateKey()).split('-').map(Number);
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  d.setDate(d.getDate() + Math.max(1, days) - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDurationInfo(dose: Dose, targetDateStr = localDateKey()): DurationInfo {
  const hasStarted = !dose.startDate || targetDateStr >= dose.startDate;
  if (!dose.durationMode || dose.durationMode === 'continuous') {
    return {
      isExpired: false,
      hasStarted,
      isContinuous: true,
      currentDay: 1,
      totalDays: 0,
      daysRemaining: 0,
      badgeText: 'Sürekli Kullanım',
    };
  }

  const totalDays = Math.max(1, dose.durationDays || 7);
  const diffDays = getCalendarDayDiff(dose.startDate || dose.cycleStartDate || localDateKey(), targetDateStr);
  const currentDay = diffDays + 1;
  const isExpired = currentDay > totalDays;
  const daysRemaining = Math.max(0, totalDays - currentDay + 1);

  return {
    isExpired,
    hasStarted,
    isContinuous: false,
    currentDay,
    totalDays,
    daysRemaining,
    badgeText: !hasStarted ? 'Henüz Başlamadı' : isExpired
      ? 'Tedavi Tamamlandı'
      : `Tedavi: ${currentDay}/${totalDays}. Gün (Kalan: ${daysRemaining} gün)`,
  };
}

export function adjustTimeMinutes(timeStr: string, deltaMinutes: number): string {
  const [hStr, mStr] = (timeStr || '09:00').split(':');
  let h = parseInt(hStr, 10) || 0;
  let m = parseInt(mStr, 10) || 0;
  let totalMin = h * 60 + m + deltaMinutes;
  while (totalMin < 0) totalMin += 24 * 60;
  totalMin = totalMin % (24 * 60);
  const newH = Math.floor(totalMin / 60);
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export type CycleInfo = {
  isActiveToday: boolean;
  todayAmount: string;
  phaseLabel: string;
  phaseType: 'active' | 'off';
  currentDayInPhase: number;
  totalDaysInPhase: number;
};

export type ScheduledSlot = {
  slotId: string;
  doseId: number;
  dose: Dose;
  time: string;
  status: 'pending' | 'taken' | 'skipped';
  todayAmount: string;
  cycleInfo: CycleInfo;
  durationInfo: DurationInfo;
};

export function parseDoseAmount(amountStr?: string): number {
  if (!amountStr) return 1;
  const normalized = String(amountStr).replace(',', '.');
  const match = normalized.match(/(\d+(\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    if (!isNaN(num) && num > 0) return num;
  }
  return 1;
}

export function formatStock(val?: number): string {
  if (val === undefined) return '0';
  if (Number.isInteger(val)) return String(val);
  return val.toFixed(1).replace('.', ',');
}

export function getCalendarDayDiff(startStr: string, endStr: string): number {
  const sParts = (startStr || localDateKey()).split('-').map(Number);
  const eParts = endStr.split('-').map(Number);
  const d1 = new Date(sParts[0], (sParts[1] || 1) - 1, sParts[2] || 1);
  const d2 = new Date(eParts[0], (eParts[1] || 1) - 1, eParts[2] || 1);
  return Math.round((Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate()) - Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate())) / 86400000);
}

export function getCycleInfo(dose: Dose, targetDateStr = localDateKey()): CycleInfo {
  if (dose.cycleStartDate && targetDateStr < dose.cycleStartDate) {
    return { isActiveToday: false, todayAmount: '0', phaseLabel: 'Henüz Başlamadı', phaseType: 'off', currentDayInPhase: 0, totalDaysInPhase: 0 };
  }
  const freq = dose.frequencyType || 'everyday';
  if (freq === 'everyday') {
    return {
      isActiveToday: true,
      todayAmount: dose.amount,
      phaseLabel: 'Her gün',
      phaseType: 'active',
      currentDayInPhase: 1,
      totalDaysInPhase: 1,
    };
  }

  const diffDays = getCalendarDayDiff(dose.cycleStartDate || localDateKey(), targetDateStr);

  if (freq === 'alternate') {
    const isOdd = diffDays % 2 === 1;
    if (!isOdd) {
      return {
        isActiveToday: true,
        todayAmount: dose.amount,
        phaseLabel: 'Gün aşırı · Alım günü',
        phaseType: 'active',
        currentDayInPhase: 1,
        totalDaysInPhase: 1,
      };
    } else {
      return {
        isActiveToday: false,
        todayAmount: '0',
        phaseLabel: 'Gün aşırı · Ara günü',
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
        phaseLabel: `Alım günü (${dayInCycle + 1}/${p1Days})`,
        phaseType: 'active',
        currentDayInPhase: dayInCycle + 1,
        totalDaysInPhase: p1Days,
      };
    } else {
      const offDay = dayInCycle - p1Days + 1;
      return {
        isActiveToday: false,
        todayAmount: '0',
        phaseLabel: `Ara günü (${offDay}/${p2Days})`,
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
        phaseLabel: `1. Aşama (${dayInCycle + 1}/${p1Days} gün) · ${p1Amount}`,
        phaseType: 'active',
        currentDayInPhase: dayInCycle + 1,
        totalDaysInPhase: p1Days,
      };
    } else {
      const p2Day = dayInCycle - p1Days + 1;
      const isOff = p2Amount === '0' || p2Amount.toLowerCase().includes('ara');
      return {
        isActiveToday: !isOff,
        todayAmount: isOff ? '0' : p2Amount,
        phaseLabel: isOff ? `Ara günü (${p2Day}/${p2Days})` : `2. Aşama (${p2Day}/${p2Days} gün) · ${p2Amount}`,
        phaseType: isOff ? 'off' : 'active',
        currentDayInPhase: p2Day,
        totalDaysInPhase: p2Days,
      };
    }
  }

  return {
    isActiveToday: true,
    todayAmount: dose.amount,
    phaseLabel: 'Her gün',
    phaseType: 'active',
    currentDayInPhase: 1,
    totalDaysInPhase: 1,
  };
}


export function slotStatus(dose: Dose, time: string, date = localDateKey()): Dose['status'] {
  if (dose.statusDate !== date) return dose.dailyStatuses?.[date]?.[time] ?? 'pending';
  return dose.slotStatuses?.[time] ?? (time === dose.time ? dose.status : 'pending');
}

// Old undated records retain their status on the migration day only.
export function normalizeDoseDay(dose: Dose, date = localDateKey()): Dose {
  dose = { ...dose,
    cycleStartDate: dose.cycleStartDate ?? (dose.frequencyType && dose.frequencyType !== 'everyday' ? dose.startDate ?? date : undefined),
    startDate: dose.startDate ?? (dose.durationMode === 'days' ? dose.cycleStartDate ?? date : undefined) };
  if (!dose.statusDate) return { ...dose, statusDate: date };
  if (dose.statusDate === date) return dose;
  const previous = Object.fromEntries((dose.times?.length ? dose.times : [dose.time]).map(time => [time, slotStatus(dose, time, dose.statusDate)]));
  return { ...dose, dailyStatuses: { ...dose.dailyStatuses, [dose.statusDate]: previous },
    statusDate: date, status: 'pending', slotStatuses: {}, snooze: undefined };

}

export function isDoseActive(dose: Dose, date: string): boolean {
  const duration = getDurationInfo(dose, date);
  return !dose.paused && duration.hasStarted && !duration.isExpired && getCycleInfo(dose, date).isActiveToday;
}

export function updateDoseSlot(dose: Dose, time: string, date: string, status: Dose['status']): Dose {
  const current = normalizeDoseDay(dose);
  const previous = slotStatus(current, time, date);
  const amount = parseDoseAmount(getCycleInfo(current, date).todayAmount);
  const delta = (previous === 'taken' ? amount : 0) - (status === 'taken' ? amount : 0);
  const stock = Math.max(0, Math.round(((current.stock ?? 0) + delta) * 10) / 10);
  if (date !== current.statusDate) {
    return { ...current, stock, dailyStatuses: { ...current.dailyStatuses,
      [date]: { ...current.dailyStatuses?.[date], [time]: status } } };
  }
  const statuses = { ...current.slotStatuses, [time]: status };
  const allTimes = current.times?.length ? current.times : [current.time];
  return { ...current, stock, slotStatuses: statuses, snooze: undefined,
    status: allTimes.every(t => (statuses[t] ?? slotStatus(current, t, date)) === 'taken') ? 'taken' : 'pending' };
}
