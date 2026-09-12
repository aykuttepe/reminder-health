import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScheduledSlot } from '../medicationPlan';

export interface HistoryDay {
  date: string;
  label: string;
  dayNum: number;
  isToday: boolean;
}

export interface HistoryViewProps {
  pastWeekHistory: HistoryDay[];
  selectedHistoryDate: string;
  setSelectedHistoryDate: (date: string) => void;
  historySlots: Pick<ScheduledSlot, 'dose' | 'time' | 'status' | 'todayAmount' | 'slotId'>[];
  takenSlots: ScheduledSlot[];
  todaySlots: ScheduledSlot[];
  today: string;
  language: 'tr' | 'en';
  dateFromKey: (key: string) => Date;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  pastWeekHistory,
  selectedHistoryDate,
  setSelectedHistoryDate,
  historySlots,
  takenSlots,
  todaySlots,
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
          {language === 'en'
            ? `${takenSlots.length} / ${todaySlots.length} doses taken today`
            : `${takenSlots.length} / ${todaySlots.length} doz bugün alındı`}
        </Text>
        <View style={styles.weekStrip}>
          {pastWeekHistory.map((day) => (
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

      {historySlots.length > 0 ? (
        historySlots.map((slot) => (
          <View key={slot.slotId} style={styles.doseRow}>
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
            <Ionicons
              name={slot.status === 'taken' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={slot.status === 'taken' ? '#a9dfca' : '#e6ba93'}
            />
          </View>
        ))
      ) : (
        <Text style={styles.quietEmpty}>
          {language === 'en' ? 'No records yet.' : 'Henüz kayıt bulunmuyor.'}
        </Text>
      )}
    </View>
  );
};

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
  dotComplete: {
    backgroundColor: '#a9dfca',
  },
  dotToday: {
    backgroundColor: '#e6ba93',
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
  quietEmpty: {
    color: '#adb3bf',
    fontSize: 13,
    paddingVertical: 12,
  },
});
