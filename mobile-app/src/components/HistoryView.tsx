import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DayAdherence,
  DaySummary,
  HISTORY_WINDOW_DAYS,
  HistorySlot,
  addDaysToKey,
  adherenceOverDays,
  historyWindowEnd,
  localDateKey,
  monthGridKeys,
} from '../medicationPlan';

import { COLORS, MIN_TOUCH, RADII, SPACING, TYPE } from '../theme';

export interface HistoryDayStatus {
  summary: DaySummary;
  adherence: DayAdherence;
}

type HistoryMode = 'week' | 'month';
type VisibleMonth = { year: number; month: number };

/** A known Monday; the seven days after it give localized Monday-first weekday labels. */
const WEEKDAY_LABEL_MONDAY = new Date(2024, 0, 1);
// Seven columns share the card width; beyond this "Cum" is cut and the day cells overflow.
const MONTH_GRID_MAX_FONT_SCALE = 1.4;

export interface HistoryViewProps {
  selectedHistoryDate: string;
  setSelectedHistoryDate: (date: string) => void;
  historySlots: HistorySlot[];
  onRevertRecord: (slot: HistorySlot) => void;
  /** Records a dose that was planned that day but never marked. */
  onRecordSlot: (slot: HistorySlot, status: 'taken' | 'skipped') => void;
  /** Summary and dot state of one day. */
  getDay: (date: string) => HistoryDayStatus;
  /** Earliest tracked day; navigation stops there. Null when nothing has been tracked yet. */
  firstTrackedDay: string | null;
  today: string;
  language: 'tr' | 'en';
  dateFromKey: (key: string) => Date;
}

function monthOf(key: string): VisibleMonth {
  const [year, month] = key.split('-').map(Number);
  return { year, month: month - 1 };
}

function monthStartKey({ year, month }: VisibleMonth): string {
  return localDateKey(new Date(year, month, 1));
}

function shiftMonth({ year, month }: VisibleMonth, delta: number): VisibleMonth {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function adherenceText(range: { taken: number; due: number }, isEn: boolean, emptyText: string): string {
  if (range.due === 0) return emptyText;
  const percent = Math.round((range.taken / range.due) * 100);
  return isEn
    ? `${percent}% · ${range.taken} / ${range.due} doses taken`
    : `%${percent} · ${range.taken} / ${range.due} doz alındı`;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  selectedHistoryDate,
  setSelectedHistoryDate,
  historySlots,
  onRevertRecord,
  onRecordSlot,
  getDay,
  firstTrackedDay,
  today,
  language,
  dateFromKey,
}) => {
  const isEn = language === 'en';
  const locale = isEn ? 'en-US' : 'tr-TR';
  const [mode, setMode] = useState<HistoryMode>('week');
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(() => monthOf(selectedHistoryDate));

  // The week strip follows the selected day, so a day picked in the month view opens its week.
  const windowEnd = historyWindowEnd(selectedHistoryDate, today);
  const windowStart = addDaysToKey(windowEnd, -(HISTORY_WINDOW_DAYS - 1));
  const isLatestWindow = windowEnd === today;
  const weekDays = useMemo(() => Array.from({ length: HISTORY_WINDOW_DAYS }, (_, index) => {
    const date = addDaysToKey(windowStart, index);
    return { date, ...getDay(date) };
  }), [windowStart, getDay]);
  const weekAdherence = adherenceOverDays(weekDays, today);
  const selectedDaySummary = getDay(selectedHistoryDate).summary;

  const monthRows = useMemo(() => monthGridKeys(visibleMonth.year, visibleMonth.month), [visibleMonth]);
  const monthDays = useMemo(() => monthRows.flat()
    .filter((date): date is string => date !== null && date <= today)
    .map((date) => ({ date, ...getDay(date) })), [monthRows, today, getDay]);
  const monthAdherence = adherenceOverDays(monthDays, today);
  const monthStatus = useMemo(() => new Map(monthDays.map((day) => [day.date, day])), [monthDays]);

  const canGoBackWeek = firstTrackedDay !== null && windowStart > firstTrackedDay;
  const canGoBackMonth = firstTrackedDay !== null && monthStartKey(visibleMonth) > firstTrackedDay;
  const canGoForwardMonth = monthStartKey(shiftMonth(visibleMonth, 1)) <= today;

  const formatDay = (key: string, options: Intl.DateTimeFormatOptions) =>
    dateFromKey(key).toLocaleDateString(locale, options);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(WEEKDAY_LABEL_MONDAY);
    date.setDate(date.getDate() + index);
    return date.toLocaleDateString(locale, { weekday: 'short' });
  });
  const rangeTitle = isLatestWindow
    ? (isEn ? 'Last 7 Days' : 'Son 7 Gün')
    : `${formatDay(windowStart, { day: 'numeric', month: 'short' })} – ${formatDay(windowEnd, { day: 'numeric', month: 'short' })}`;
  const monthTitle = new Date(visibleMonth.year, visibleMonth.month, 1)
    .toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const selectMode = (next: HistoryMode) => {
    if (next === 'month') setVisibleMonth(monthOf(selectedHistoryDate));
    setMode(next);
  };
  const dayLabel = (date: string, summary: DaySummary) => `${formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${summary.total === 0
    ? (isEn ? 'no doses planned' : 'planlı doz yok')
    : isEn
    ? `${summary.taken} of ${summary.total} taken`
    : `${summary.total} dozun ${summary.taken} tanesi alındı`}`;

  const navButton = (direction: 'back' | 'forward', enabled: boolean, onPress: () => void, label: string) => (
    <TouchableOpacity
      style={[styles.navBtn, !enabled && styles.navBtnDisabled]}
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
    >
      <Ionicons name={direction === 'back' ? 'chevron-back' : 'chevron-forward'} size={20} color={enabled ? COLORS.accent : COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View>
      <View style={styles.modeRow} accessibilityRole="tablist">
        {([['week', isEn ? 'Week' : 'Hafta'], ['month', isEn ? 'Month' : 'Ay']] as const).map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.modeBtn, mode === value && styles.modeBtnActive]}
            onPress={() => selectMode(value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === value }}
          >
            <Text style={[styles.modeBtnText, mode === value && styles.modeBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.adherenceCard}>
        <View style={styles.cardHeader}>
          {navButton('back',
            mode === 'week' ? canGoBackWeek : canGoBackMonth,
            () => (mode === 'week'
              ? setSelectedHistoryDate(addDaysToKey(windowEnd, -HISTORY_WINDOW_DAYS))
              : setVisibleMonth(shiftMonth(visibleMonth, -1))),
            mode === 'week' ? (isEn ? 'Previous week' : 'Önceki hafta') : (isEn ? 'Previous month' : 'Önceki ay'))}
          <View style={styles.cardHeaderText}>
            <View style={styles.adherencePill}>
              <Ionicons name={mode === 'week' ? 'trending-up' : 'calendar-outline'} size={16} color={COLORS.accent} />
              <Text style={styles.adherencePillText}>{mode === 'week' ? rangeTitle : monthTitle}</Text>
            </View>
            <Text style={styles.adherenceSub}>
              {mode === 'week'
                ? adherenceText(weekAdherence, isEn, isLatestWindow
                  ? (isEn ? 'No doses due in the last 7 days.' : 'Son 7 günde takip edilecek doz yok.')
                  : (isEn ? 'No doses due in this week.' : 'Bu haftada takip edilecek doz yok.'))
                : adherenceText(monthAdherence, isEn, isEn ? 'No doses due in this month.' : 'Bu ayda takip edilecek doz yok.')}
            </Text>
          </View>
          {navButton('forward',
            mode === 'week' ? !isLatestWindow : canGoForwardMonth,
            () => (mode === 'week'
              ? setSelectedHistoryDate(addDaysToKey(windowEnd, HISTORY_WINDOW_DAYS))
              : setVisibleMonth(shiftMonth(visibleMonth, 1))),
            mode === 'week' ? (isEn ? 'Next week' : 'Sonraki hafta') : (isEn ? 'Next month' : 'Sonraki ay'))}
        </View>

        {mode === 'week' ? (
          <View style={styles.weekStrip}>
            {weekDays.map((day) => {
              const selected = selectedHistoryDate === day.date;
              return (
                <TouchableOpacity
                  key={day.date}
                  style={[styles.weekPill, selected && styles.weekPillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={dayLabel(day.date, day.summary)}
                  onPress={() => setSelectedHistoryDate(day.date)}
                >
                  <Text style={[styles.weekPillLabel, selected && styles.weekPillTextActive]}>{formatDay(day.date, { weekday: 'short' })}</Text>
                  <Text style={[styles.weekPillNum, selected && styles.weekPillTextActive]}>{dateFromKey(day.date).getDate()}</Text>
                  <View style={[styles.weekDot, dotStyles[day.adherence], selected && styles.weekDotOnAccent]} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View>
            <View style={styles.monthRow}>
              {weekdayLabels.map((label) => (
                <Text key={label} style={styles.monthWeekday} numberOfLines={1} maxFontSizeMultiplier={MONTH_GRID_MAX_FONT_SCALE}>{label}</Text>
              ))}
            </View>
            {monthRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.monthRow}>
                {row.map((date, cellIndex) => {
                  if (date === null) return <View key={`empty-${cellIndex}`} style={styles.monthCell} />;
                  const status = monthStatus.get(date);
                  const selected = selectedHistoryDate === date;
                  const future = date > today;
                  return (
                    <TouchableOpacity
                      key={date}
                      style={[styles.monthCell, selected && styles.weekPillActive]}
                      disabled={future}
                      onPress={() => setSelectedHistoryDate(date)}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: future }}
                      accessibilityLabel={status ? dayLabel(date, status.summary) : formatDay(date, { day: 'numeric', month: 'long' })}
                    >
                      <Text style={[styles.monthDayNum, future && styles.monthDayFuture, selected && styles.weekPillTextActive]} maxFontSizeMultiplier={MONTH_GRID_MAX_FONT_SCALE}>
                        {dateFromKey(date).getDate()}
                      </Text>
                      <View style={[styles.weekDot, status ? dotStyles[status.adherence] : dotStyles.blank, selected && status && styles.weekDotOnAccent]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={styles.legendRow}>
          {([
            ['complete', isEn ? 'All taken' : 'Tamamı'],
            ['partial', isEn ? 'Partly' : 'Kısmen'],
            ['missed', isEn ? 'Missed' : 'Kaçırıldı'],
            ['skipped', isEn ? 'Skipped' : 'Atlandı'],
          ] as const).map(([state, label]) => (
            <View key={state} style={styles.legendItem}>
              <View style={[styles.weekDot, dotStyles[state]]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        {selectedHistoryDate === today
          ? language === 'en'
            ? "Today's Records"
            : 'Bugünün Kayıtları'
          : dateFromKey(selectedHistoryDate).toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
      </Text>
      {selectedDaySummary.total > 0 && (
        <Text style={styles.daySummary}>
          {[
            language === 'en'
              ? `Taken ${selectedDaySummary.taken} / ${selectedDaySummary.total}`
              : `Alınan ${selectedDaySummary.taken} / ${selectedDaySummary.total}`,
            selectedDaySummary.skipped > 0
              ? (language === 'en' ? `Skipped ${selectedDaySummary.skipped}` : `Atlanan ${selectedDaySummary.skipped}`)
              : null,
            selectedDaySummary.unrecorded > 0
              ? selectedHistoryDate === today
                ? (language === 'en' ? `Pending ${selectedDaySummary.unrecorded}` : `Bekleyen ${selectedDaySummary.unrecorded}`)
                : (language === 'en' ? `Not recorded ${selectedDaySummary.unrecorded}` : `Kaydedilmedi ${selectedDaySummary.unrecorded}`)
              : null,
          ].filter(Boolean).join(' · ')}
        </Text>
      )}

      {historySlots.some((slot) => slot.status !== 'pending') && (
        <Text style={styles.listHint}>
          {language === 'en'
            ? 'Tap a record to correct it.'
            : 'Bir kaydı düzeltmek için üzerine dokunun.'}
        </Text>
      )}

      {historySlots.length > 0 ? (
        <View style={styles.listCard}>
        {historySlots.map((slot, idx) => slot.status === 'pending' ? (
          <View key={slot.slotId} style={[styles.doseRow, idx > 0 && styles.rowDivider]} testID={`record-history-${slot.slotId}`}>
            <Text style={styles.doseRowTime}>{slot.time}</Text>
            <View style={styles.doseRowMain}>
              <Text style={styles.doseRowName}>{slot.dose.name}</Text>
              <Text style={styles.doseRowSub}>
                {slot.todayAmount} · {language === 'en' ? 'Not recorded' : 'Kaydedilmedi'}
              </Text>
              <View style={styles.recordActions}>
                <TouchableOpacity
                  style={[styles.recordBtn, styles.recordBtnTaken]}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.dose.name}, ${slot.time}, ${language === 'en' ? 'Mark as taken' : 'Aldım olarak işaretle'}`}
                  onPress={() => onRecordSlot(slot, 'taken')}
                >
                  <Text style={styles.recordBtnTakenText}>{language === 'en' ? 'Taken' : 'Aldım'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recordBtn, styles.recordBtnSkipped]}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.dose.name}, ${slot.time}, ${language === 'en' ? 'Mark as skipped' : 'Atladım olarak işaretle'}`}
                  onPress={() => onRecordSlot(slot, 'skipped')}
                >
                  <Text style={styles.recordBtnSkippedText}>{language === 'en' ? 'Skipped' : 'Atladım'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Ionicons name="ellipse-outline" size={20} color={COLORS.textSecondary} />
          </View>
        ) : (
          <TouchableOpacity key={slot.slotId} style={[styles.doseRow, idx > 0 && styles.rowDivider]}
            testID={`revert-history-${slot.slotId}`} accessibilityRole="button"
            accessibilityLabel={`${slot.dose.name}, ${slot.time}, ${language === 'en' ? 'Correct record' : 'Kaydı düzelt'}`}
            onPress={() => onRevertRecord(slot)}>
            <Text style={styles.doseRowTime}>{slot.time}</Text>
            <View style={styles.doseRowMain}>
              <Text style={styles.doseRowName}>{slot.dose.name}</Text>
              <Text style={styles.doseRowSub}>
                {slot.todayAmount} ·{' '}
                {slot.status === 'taken'
                  ? language === 'en'
                    ? 'Taken'
                    : 'Alındı'
                  : language === 'en'
                  ? 'Skipped'
                  : 'Atlandı'}
              </Text>
            </View>
            <View style={styles.rowTrailing}>
              <Ionicons
                name={slot.status === 'taken' ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={slot.status === 'taken' ? COLORS.success : COLORS.textMuted}
              />
              <View style={styles.correctChip}>
                <Ionicons name="create-outline" size={12} color={COLORS.textSecondary} />
                <Text style={styles.correctChipText}>{language === 'en' ? 'Correct' : 'Düzelt'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        </View>
      ) : (
        <Text style={styles.quietEmpty}>
          {/* Today's unmarked doses live on the Today tab, so "no records" alone read as if nothing was planned. */}
          {selectedHistoryDate === today && selectedDaySummary.unrecorded > 0
            ? (isEn ? "Today's pending doses are on the Today tab." : 'Bugünün bekleyen dozları Bugün sekmesinde.')
            : (isEn ? 'No records yet.' : 'Henüz kayıt bulunmuyor.')}
        </Text>
      )}
    </View>
  );
};

// Dot per day: sage all taken, amber partly, red missed (forgotten), grey all skipped on purpose,
// hollow ring while today is still open.
const dotStyles = StyleSheet.create({
  none: { backgroundColor: COLORS.surfaceMuted },
  complete: { backgroundColor: COLORS.success },
  partial: { backgroundColor: COLORS.amber },
  missed: { backgroundColor: COLORS.danger },
  skipped: { backgroundColor: COLORS.textMuted },
  open: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.accent },
  // Month cells before the first tracked day or with no data keep the dot's space without a mark.
  blank: { backgroundColor: 'transparent' },
});

const styles = StyleSheet.create({
  adherenceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.card,
    marginBottom: SPACING.xl,
  },
  modeRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADII.button,
    padding: 3,
    marginBottom: SPACING.md,
  },
  modeBtn: {
    minHeight: 40,
    minWidth: 88,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.button - 3,
  },
  modeBtnActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtnText: {
    color: COLORS.textSecondary,
    fontSize: TYPE.bodySmall,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: COLORS.accent,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  cardHeaderText: {
    flex: 1,
    alignItems: 'center',
  },
  navBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  navBtnDisabled: {
    borderColor: COLORS.surfaceMuted,
    backgroundColor: COLORS.surfaceMuted,
  },
  monthRow: {
    flexDirection: 'row',
    gap: SPACING.xxs,
    marginBottom: SPACING.xxs,
  },
  monthWeekday: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: TYPE.micro,
    fontWeight: '500',
  },
  monthCell: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.sm,
  },
  monthDayNum: {
    color: COLORS.text,
    fontSize: TYPE.bodySmall,
    fontWeight: '600',
    marginBottom: 4,
  },
  monthDayFuture: {
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  adherencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adherencePillText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  adherenceSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  weekStrip: {
    flexDirection: 'row',
    gap: SPACING.xxs,
  },
  weekPill: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADII.button,
  },
  weekPillActive: {
    backgroundColor: COLORS.accent,
  },
  weekPillTextActive: {
    color: COLORS.onAccent,
  },
  weekDotOnAccent: {
    borderWidth: 1.5,
    borderColor: COLORS.onAccent,
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  weekPillLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  weekPillNum: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 4,
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 6,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  daySummary: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPE.heading,
    fontWeight: '700',
    marginBottom: SPACING.xxs,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.card,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    minHeight: 64,
    gap: SPACING.md,
  },
  doseRowTime: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    width: 50,
  },
  doseRowMain: {
    flex: 1,
  },
  doseRowName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  doseRowSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  recordBtn: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.button,
    borderWidth: 1,
  },
  recordBtnTaken: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  recordBtnTakenText: {
    color: COLORS.onAccent,
    fontSize: 13,
    fontWeight: '600',
  },
  recordBtnSkipped: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.borderStrong,
  },
  recordBtnSkippedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  rowTrailing: {
    alignItems: 'center',
    gap: 4,
  },
  correctChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  correctChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  listHint: {
    color: COLORS.textSecondary,
    fontSize: TYPE.caption,
    marginBottom: SPACING.sm,
  },
  quietEmpty: {
    color: COLORS.textSecondary,
    fontSize: 13,
    paddingVertical: 12,
  },
});
