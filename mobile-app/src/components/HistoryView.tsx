import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DayAdherence, DaySummary, HistorySlot } from '../medicationPlan';

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
          <Ionicons name="trending-up" size={16} color="#a9dfca" />
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
              <Text style={styles.weekPillLabel}>{day.label}</Text>
              <Text style={styles.weekPillNum}>{day.dayNum}</Text>
              <View style={[styles.weekDot, dotStyles[day.adherence]]} />
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
        historySlots.map((slot) => slot.status === 'pending' ? (
          <View key={slot.slotId} style={styles.doseRow} testID={`record-history-${slot.slotId}`}>
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
            <Ionicons name="ellipse-outline" size={20} color="#adb3bf" />
          </View>
        ) : (
          <TouchableOpacity key={slot.slotId} style={styles.doseRow}
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
                color={slot.status === 'taken' ? '#a9dfca' : '#e6ba93'}
              />
              <View style={styles.correctChip}>
                <Ionicons name="create-outline" size={12} color="#adb3bf" />
                <Text style={styles.correctChipText}>{language === 'en' ? 'Correct' : 'Düzelt'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.quietEmpty}>
          {language === 'en' ? 'No records yet.' : 'Henüz kayıt bulunmuyor.'}
        </Text>
      )}
    </View>
  );
};

// Dot per day: mint all taken, amber partly, red missed, hollow ring while today is still open.
const dotStyles = StyleSheet.create({
  none: { backgroundColor: '#2a3a4a' },
  complete: { backgroundColor: '#a9dfca' },
  partial: { backgroundColor: '#e6ba93' },
  missed: { backgroundColor: '#ff9696' },
  open: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#a9dfca' },
});

const styles = StyleSheet.create({
  adherenceCard: {
    backgroundColor: '#152332',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  adherencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adherencePillText: {
    color: '#a9dfca',
    fontSize: 15,
    fontWeight: '700',
  },
  adherenceSub: {
    color: '#adb3bf',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekPill: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#192838',
    width: 44,
  },
  weekPillActive: {
    backgroundColor: '#1a3c36',
    borderWidth: 1,
    borderColor: '#a9dfca',
  },
  weekPillLabel: {
    color: '#adb3bf',
    fontSize: 11,
    fontWeight: '500',
  },
  weekPillNum: {
    color: '#f5f3f0',
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
    color: '#8899a8',
    fontSize: 11,
  },
  daySummary: {
    color: '#adb3bf',
    fontSize: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#adb3bf',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2736',
    gap: 12,
  },
  doseRowTime: {
    color: '#f5f3f0',
    fontSize: 16,
    fontWeight: '600',
    width: 50,
  },
  doseRowMain: {
    flex: 1,
  },
  doseRowName: {
    color: '#f5f3f0',
    fontSize: 15,
    fontWeight: '600',
  },
  doseRowSub: {
    color: '#adb3bf',
    fontSize: 12,
    marginTop: 2,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  recordBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  recordBtnTaken: {
    backgroundColor: '#1a3c36',
    borderColor: '#a9dfca',
  },
  recordBtnTakenText: {
    color: '#a9dfca',
    fontSize: 13,
    fontWeight: '600',
  },
  recordBtnSkipped: {
    backgroundColor: '#2a2320',
    borderColor: '#e6ba93',
  },
  recordBtnSkippedText: {
    color: '#e6ba93',
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
    color: '#adb3bf',
    fontSize: 11,
    fontWeight: '500',
  },
  listHint: {
    color: '#8899a8',
    fontSize: 12,
    marginBottom: 6,
  },
  quietEmpty: {
    color: '#adb3bf',
    fontSize: 13,
    paddingVertical: 12,
  },
});
