import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCalendarDayDiff, type AppointmentItem } from '../../medicationPlan';
import { formatLocalizedDate } from '../CalendarModal';
import { COLORS, MIN_TOUCH, RADII, SPACING, TYPE } from '../../theme';
import { SectionHeader } from './SectionHeader';

/** Appointments saved without a time are treated as early afternoon, matching the reminder planner. */
const DEFAULT_APPOINTMENT_TIME = '13:00';

interface AppointmentSummaryProps {
  appointments?: AppointmentItem[];
  today: string;
  language: 'tr' | 'en';
  triggerHaptic: () => void;
  onOpenAppointmentEditor?: (appt?: AppointmentItem) => void;
  onNavigateDoctorProfile?: () => void;
}

interface DayBadge {
  text: string;
  bg: string;
  fg: string;
}

/** Relative-day badge shared by the Today summary and the profile appointment list. */
export function appointmentDayBadge(diff: number, isEn: boolean): DayBadge {
  if (diff === 0) return { text: isEn ? 'Today' : 'Bugün', bg: COLORS.warningSoft, fg: COLORS.warning };
  if (diff === 1) return { text: isEn ? 'Tomorrow' : 'Yarın', bg: COLORS.accentSoft, fg: COLORS.accent };
  if (diff > 1) return { text: isEn ? `in ${diff} days` : `${diff} gün kaldı`, bg: COLORS.surfaceMuted, fg: COLORS.textSecondary };
  return {
    text: isEn ? `${Math.abs(diff)} days ago` : `${Math.abs(diff)} gün önce`,
    bg: COLORS.surfaceMuted,
    fg: COLORS.textMuted,
  };
}

function appointmentTitle(appt: AppointmentItem, isEn: boolean): string {
  if (appt.doctorName?.trim()) return appt.doctorName.trim();
  if (appt.specialty?.trim()) return `${appt.specialty.trim()} ${isEn ? 'Appointment' : 'Randevusu'}`;
  return isEn ? 'Doctor Appointment' : 'Doktor Randevusu';
}

function appointmentSubtitle(appt: AppointmentItem): string {
  if (appt.hospital?.trim()) return appt.hospital.trim();
  if (appt.specialty?.trim() && appt.doctorName) return appt.specialty.trim();
  return '';
}

/** Next open doctor appointment on the Today screen, or a prompt to add one. */
export const AppointmentSummary: React.FC<AppointmentSummaryProps> = ({
  appointments,
  today,
  language,
  triggerHaptic,
  onOpenAppointmentEditor,
  onNavigateDoctorProfile,
}) => {
  const isEn = language === 'en';
  const activeAppts = (appointments ?? [])
    .filter((a) => !a.completed && a.date)
    .sort((a, b) =>
      `${a.date} ${a.time || DEFAULT_APPOINTMENT_TIME}`.localeCompare(`${b.date} ${b.time || DEFAULT_APPOINTMENT_TIME}`),
    );

  const openEditor = () => {
    triggerHaptic();
    if (onOpenAppointmentEditor) onOpenAppointmentEditor();
    else onNavigateDoctorProfile?.();
  };
  const openProfile = () => {
    triggerHaptic();
    onNavigateDoctorProfile?.();
  };

  if (activeAppts.length === 0) {
    return (
      <TouchableOpacity style={styles.emptyCard} onPress={openEditor} activeOpacity={0.8} accessibilityRole="button">
        <View style={styles.iconBox}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={2}>
            {isEn ? 'No Upcoming Appointments' : 'Yaklaşan Randevu Yok'}
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {isEn ? 'Tap to add doctor & lab reminders' : 'Doktor kontrol ve tahlil hatırlatıcısı ekle'}
          </Text>
        </View>
        <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
      </TouchableOpacity>
    );
  }

  const primary = activeAppts[0];
  const badge = appointmentDayBadge(getCalendarDayDiff(today, primary.date), isEn);
  const subtitle = appointmentSubtitle(primary);
  const next = activeAppts[1];

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title={isEn ? 'Upcoming appointments' : 'Yaklaşan randevular'}
        count={activeAppts.length > 1 ? activeAppts.length : undefined}
        actionLabel={isEn ? 'Add' : 'Randevu ekle'}
        onAction={openEditor}
      />

      <TouchableOpacity style={styles.card} onPress={openProfile} activeOpacity={0.8} accessibilityRole="button">
        <View style={styles.topRow}>
          <View style={styles.iconBox}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>{appointmentTitle(primary, isEn)}</Text>
            {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          <View style={[styles.dayBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.dayBadgeText, { color: badge.fg }]} numberOfLines={1}>{badge.text}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-clear-outline" size={15} color={COLORS.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{formatLocalizedDate(primary.date, language)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{primary.time || DEFAULT_APPOINTMENT_TIME}</Text>
          </View>
        </View>

        {primary.hasBloodTest && primary.bloodTestDate ? (
          <View style={styles.bloodRow}>
            <Ionicons name="flask-outline" size={15} color={COLORS.purple} />
            <Text style={styles.bloodText} numberOfLines={2}>
              {formatLocalizedDate(primary.bloodTestDate, language)}
              {primary.bloodTestFasting
                ? (isEn ? ' · Fasting blood test' : ' · Aç karnına tahlil')
                : (isEn ? ' · Blood test' : ' · Kan tahlili')}
              {primary.bloodTestTime ? ` · ${primary.bloodTestTime}` : ''}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {next && (
        <TouchableOpacity style={styles.moreRow} onPress={openProfile} activeOpacity={0.7} accessibilityRole="button">
          <Text style={styles.moreText} numberOfLines={2}>
            {isEn
              ? `+${activeAppts.length - 1} more: ${formatLocalizedDate(next.date, language)} (${next.specialty || next.doctorName || 'Doctor'})`
              : `+${activeAppts.length - 1} randevu daha: ${formatLocalizedDate(next.date, language)} (${next.specialty || next.doctorName || 'Hekim'})`}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACING.xl,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    padding: SPACING.card,
    borderRadius: RADII.card,
    backgroundColor: COLORS.surfaceAlt,
  },
  card: {
    padding: SPACING.card,
    borderRadius: RADII.card,
    backgroundColor: COLORS.surfaceAlt,
    gap: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADII.button,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPE.body,
    fontWeight: '700',
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: TYPE.caption + 1,
    marginTop: 2,
  },
  dayBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.sm,
    flexShrink: 0,
  },
  dayBadgeText: {
    fontSize: TYPE.caption,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: SPACING.lg,
    rowGap: SPACING.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 1,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: TYPE.bodySmall,
    flexShrink: 1,
  },
  bloodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bloodText: {
    color: COLORS.text,
    fontSize: TYPE.caption + 1,
    flex: 1,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: SPACING.xxs,
  },
  moreText: {
    color: COLORS.textSecondary,
    fontSize: TYPE.caption + 1,
    flex: 1,
  },
});
