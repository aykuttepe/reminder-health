import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, SPACING, TYPE } from '../../theme';

const DAY_LABELS: Record<'tr' | 'en', readonly string[]> = {
  tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
const DAYS_IN_WEEK = 7;

interface WeekDay {
  key: string;
  dayOfMonth: number;
  label: string;
  isToday: boolean;
}

/** Monday-first week containing `todayKey` (YYYY-MM-DD, local calendar date). */
export function buildWeekDays(todayKey: string, language: 'tr' | 'en'): WeekDay[] {
  const [y, m, d] = todayKey.split('-').map(Number);
  const today = new Date(y, (m ?? 1) - 1, d ?? 1);
  const mondayOffset = (today.getDay() + 6) % DAYS_IN_WEEK;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { key, dayOfMonth: date.getDate(), label: DAY_LABELS[language][i], isToday: key === todayKey };
  });
}

interface WeekStripProps {
  today: string;
  language: 'tr' | 'en';
  accessibilityLabel: string;
}

/** Read-only week overview; today is highlighted with the accent fill. */
export const WeekStrip: React.FC<WeekStripProps> = ({ today, language, accessibilityLabel }) => {
  const days = buildWeekDays(today, language);
  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      {days.map((day) => (
        <View
          key={day.key}
          style={[styles.day, day.isToday && styles.dayActive]}
          accessibilityState={{ selected: day.isToday }}
        >
          <Text style={[styles.dayLabel, day.isToday && styles.textActive]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
            {day.label}
          </Text>
          <Text style={[styles.dayNumber, day.isToday && styles.textActive]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
            {day.dayOfMonth}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.xxs,
    marginBottom: SPACING.lg,
  },
  day: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADII.button,
  },
  dayActive: {
    backgroundColor: COLORS.accent,
  },
  dayLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPE.micro,
    fontWeight: '500',
  },
  dayNumber: {
    color: COLORS.text,
    fontSize: TYPE.heading,
    fontWeight: '600',
    marginTop: 2,
  },
  textActive: {
    color: COLORS.onAccent,
  },
});
