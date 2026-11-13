import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DayAdherence, DaySummary, HistorySlot } from '../medicationPlan';

import { COLORS, MIN_TOUCH, RADII, SPACING, TYPE } from '../theme';
export interface HistoryDay {
  date: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  summary: DaySummary;
  adherence: DayAdherence;
}

export interface HistoryViewProps {
  pastWeekHistory: HistoryDay[];
  selectedHistoryDate: string;
  setSelectedHistoryDate: (date: string) => void;
  historySlots: HistorySlot[];
  onRevertRecord: (slot: HistorySlot) => void;
  /** Records a dose that was planned that day but never marked. */
  onRecordSlot: (slot: HistorySlot, status: 'taken' | 'skipped') => void;
  /** Taken versus due doses over the strip's seven days; today's unmarked doses are not due. */
  weekAdherence: { taken: number; due: number };
  selectedDaySummary: DaySummary;
  today: string;
  language: 'tr' | 'en';
  dateFromKey: (key: string) => Date;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  pastWeekHistory,
  selectedHistoryDate,
  setSelectedHistoryDate,
  historySlots,
  onRevertRecord,
  onRecordSlot,
  weekAdherence,
  selectedDaySummary,
  today,
  language,
  dateFromKey,
}) => {
  return (
    <View>
      <View style={styles.adherenceCard}>
        <View style={styles.adherencePill}>
          <Ionicons name="trending-up" size={16} color={COLORS.accent} />
          <Text style={styles.adherencePillText}>{language === 'en' ? 'Last 7 Days' : 'Son 7 Gün'}</Text>
        </View>
        <Text style={styles.adherenceSub}>
          {weekAdherence.due === 0
            ? language === 'en'
              ? 'No doses due in the last 7 days.'
              : 'Son 7 günde takip edilecek doz yok.'
            : language === 'en'
            ? `${Math.round((weekAdherence.taken / weekAdherence.due) * 100)}% · ${weekAdherence.taken} / ${weekAdherence.due} doses taken`
            : `%${Math.round((weekAdherence.taken / weekAdherence.due) * 100)} · ${weekAdherence.taken} / ${weekAdherence.due} doz alındı`}
        </Text>
        <View style={styles.weekStrip}>
          {pastWeekHistory.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={[styles.weekPill, selectedHistoryDate === day.date && styles.weekPillActive]}
              accessibilityRole="button"
              accessibilityLabel={`${day.label} ${day.dayNum}, ${day.summary.total === 0
                ? (language === 'en' ? 'no doses planned' : 'planlı doz yok')
                : language === 'en'
                ? `${day.summary.taken} of ${day.summary.total} taken`
                : `${day.summary.total} dozun ${day.summary.taken} tanesi alındı`}`}
              onPress={() => setSelectedHistoryDate(day.date)}
            >
              <Text style={[styles.weekPillLabel, selectedHistoryDate === day.date && styles.weekPillTextActive]}>{day.label}</Text>
              <Text style={[styles.weekPillNum, selectedHistoryDate === day.date && styles.weekPillTextActive]}>{day.dayNum}</Text>
              <View style={[styles.weekDot, dotStyles[day.adherence], selectedHistoryDate === day.date && styles.weekDotOnAccent]} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.legendRow}>
          {([
            ['complete', language === 'en' ? 'All taken' : 'Tamamı'],
            ['partial', language === 'en' ? 'Partly' : 'Kısmen'],
            ['missed', language === 'en' ? 'Missed' : 'Kaçırıldı'],
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
                color={slot.status === 'taken' ? COLORS.success : COLORS.amber}
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
          {language === 'en' ? 'No records yet.' : 'Henüz kayıt bulunmuyor.'}
        </Text>
      )}
    </View>
  );
};

// Dot per day: sage all taken, amber partly, red missed, hollow ring while today is still open.
const dotStyles = StyleSheet.create({
  none: { backgroundColor: COLORS.surfaceMuted },
  complete: { backgroundColor: COLORS.success },
  partial: { backgroundColor: COLORS.amber },
  missed: { backgroundColor: COLORS.danger },
  open: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.accent },
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
    marginBottom: 14,
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
    gap: 14,
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
