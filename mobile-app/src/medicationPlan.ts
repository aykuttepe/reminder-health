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

export function getDurationInfo(dose: Dose, targetDateStr = localDateKey(), lang: 'tr' | 'en' = 'tr'): DurationInfo {
  const hasStarted = !dose.startDate || targetDateStr >= dose.startDate;
  if (!dose.durationMode || dose.durationMode === 'continuous') {
    return {
      isExpired: false,
      hasStarted,
      isContinuous: true,
      currentDay: 1,
      totalDays: 0,
      daysRemaining: 0,
      badgeText: !hasStarted
        ? (lang === 'en' ? 'Not Started Yet' : 'Henüz Başlamadı')
        : (lang === 'en' ? 'Continuous Use' : 'Sürekli Kullanım'),
    };
  }

  const totalDays = Math.max(1, dose.durationDays || 7);
  const diffDays = getCalendarDayDiff(dose.startDate || dose.cycleStartDate || localDateKey(), targetDateStr);
  const currentDay = diffDays + 1;
  const isExpired = currentDay > totalDays;
  const daysRemaining = Math.max(0, totalDays - currentDay + 1);

  let badgeText = '';
  if (!hasStarted) {
    badgeText = lang === 'en' ? 'Not Started Yet' : 'Henüz Başlamadı';
  } else if (isExpired) {
    badgeText = lang === 'en' ? 'Treatment Completed' : 'Tedavi Tamamlandı';
  } else {
    badgeText = lang === 'en'
      ? `Treatment: Day ${currentDay}/${totalDays} (${daysRemaining} days left)`
      : `Tedavi: ${currentDay}/${totalDays}. Gün (Kalan: ${daysRemaining} gün)`;
  }

  return {
    isExpired,
    hasStarted,
    isContinuous: false,
    currentDay,
    totalDays,
    daysRemaining,
    badgeText,
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
  doseId: string | number;
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

export function getCycleInfo(dose: Dose, targetDateStr = localDateKey(), lang: 'tr' | 'en' = 'tr'): CycleInfo {
  const isEn = lang === 'en';
  if (dose.cycleStartDate && targetDateStr < dose.cycleStartDate) {
    return { isActiveToday: false, todayAmount: '0', phaseLabel: isEn ? 'Not Started Yet' : 'Henüz Başlamadı', phaseType: 'off', currentDayInPhase: 0, totalDaysInPhase: 0 };
  }
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

  const diffDays = getCalendarDayDiff(dose.cycleStartDate || localDateKey(), targetDateStr);

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

export function getSlotAmount(dose: Dose, time: string, date = localDateKey()): string {
  if (dose.slotAmounts?.[time]?.trim()) {
    return dose.slotAmounts[time].trim();
  }
  return getCycleInfo(dose, date).todayAmount || dose.amount || '1 tablet';
}

export function updateDoseSlot(dose: Dose, time: string, date: string, status: Dose['status']): Dose {
  const current = {...normalizeDoseDay(dose), updatedAt: Date.now()};
  const previous = slotStatus(current, time, date);
  const slotAmtStr = (current.slotAmounts?.[time]?.trim())
    ? current.slotAmounts[time].trim()
    : getCycleInfo(current, date).todayAmount;
  const amount = parseDoseAmount(slotAmtStr);
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

export function calculateStockProjection(
  dose: Dose,
  today = localDateKey(),
  language: 'tr' | 'en' = 'tr'
): StockProjection {
  const stock = Math.max(0, dose.stock ?? 0);
  const threshold = Math.max(1, dose.stockThreshold ?? 5);
  const boxSize = Math.max(1, dose.defaultStock ?? 30);
  const isEn = language === 'en';

  // 1. Günlük tüketim hesaplaması
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

  // 2. Kalan gün ve tahmini bitiş tarihi
  const isOutOfStock = stock <= 0;
  const daysRemaining = isOutOfStock ? 0 : Math.floor(stock / dailyConsumption);
  const runOutDate = isOutOfStock ? today : calculateEndDate(today, daysRemaining);

  // 3. Formatlanmış tarih
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

  // 4. Durum seviyesi (Triage) - Kullanıcı tercihi: kritik <= 7 gün, azalıyor <= 14 gün
  let statusTier: 'critical' | 'low' | 'good' = 'good';
  if (isOutOfStock || daysRemaining <= 7 || stock <= threshold) {
    statusTier = 'critical';
  } else if (daysRemaining <= 14 || stock <= threshold * 1.5) {
    statusTier = 'low';
  } else {
    statusTier = 'good';
  }

  // 5. Doluluk yüzdesi (referans: 30 gün veya 1 kutu süresi)
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

