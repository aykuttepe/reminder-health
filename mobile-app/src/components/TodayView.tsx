import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Dose,
  ScheduledSlot,
  MealCondition,
  MedicineForm,
  CycleInfo,
  DurationInfo,
  type AppointmentItem,
} from '../medicationPlan';
import { Translations } from '../i18n/translations';
import { COLORS, MIN_TOUCH, RADII, SPACING, TYPE } from '../theme';
import { WeekStrip } from './today/WeekStrip';
import { DailyProgress } from './today/DailyProgress';
import { SectionHeader } from './today/SectionHeader';
import { PrimaryDoseCard, isStockLow, type DoseGuidance } from './today/PrimaryDoseCard';
import { AppointmentSummary } from './today/AppointmentSummary';

export interface TodayViewProps {
  pendingSlots: ScheduledSlot[];
  todaySlots: ScheduledSlot[];
  takenSlots: ScheduledSlot[];
  offCycleDoses: Dose[];
  completedDoses: Dose[];
  /** Warnings (notifications off, inexact alarms) shown under the progress bar. */
  notices?: React.ReactNode;
  takeSlot: (slot: ScheduledSlot) => void;
  snoozeDose: (dose: Dose, time: string, today: string, minutes: number) => void;
  skipSlot: (slot: ScheduledSlot) => void;
  onRevertRecord: (slot: ScheduledSlot) => void;
  triggerHaptic: () => void;
  openEditor: (dose?: Dose) => void;
  today: string;
  snoozeMinutes: number;
  language: 'tr' | 'en';
  t: Translations;
  expandedTaken: boolean;
  setExpandedTaken: React.Dispatch<React.SetStateAction<boolean>>;
  getSlotTimingText: (timeStr: string) => string;
  getMealLabel: (cond?: MealCondition) => string;
  getFormLabel: (form?: MedicineForm) => string;
  getOverdueGuidance: (slot: ScheduledSlot) => DoseGuidance | null;
  formatStock: (stock?: number) => string;
  getCycleInfo: (dose: Dose, date: string, lang?: 'tr' | 'en') => CycleInfo;
  getDurationInfo: (dose: Dose, date: string, lang?: 'tr' | 'en') => DurationInfo;
  appointments?: AppointmentItem[];
  onOpenAppointmentEditor?: (appt?: AppointmentItem) => void;
  onNavigateDoctorProfile?: () => void;
  showAppointmentCard?: boolean;
}

function fillCount(template: string, taken: number, total: number): string {
  return template.replace('{taken}', String(taken)).replace('{total}', String(total));
}

export const TodayView: React.FC<TodayViewProps> = ({
  pendingSlots,
  todaySlots,
  takenSlots,
  offCycleDoses,
  completedDoses,
  notices,
  takeSlot,
  snoozeDose,
  skipSlot,
  onRevertRecord,
  triggerHaptic,
  openEditor,
  appointments,
  onOpenAppointmentEditor,
  onNavigateDoctorProfile,
  showAppointmentCard = true,
  today,
  snoozeMinutes,
  language,
  t,
  expandedTaken,
  setExpandedTaken,
  getSlotTimingText,
  getMealLabel,
  getFormLabel,
  getOverdueGuidance,
  formatStock,
  getCycleInfo,
  getDurationInfo,
}) => {
  const isEn = language === 'en';
  const nextSlot = pendingSlots[0];
  const otherPending = pendingSlots.slice(1);
  const sameTimeSlots = nextSlot ? pendingSlots.filter((s) => s.time === nextSlot.time) : [];

  const stockText = (slot: ScheduledSlot) =>
    isEn ? `Low stock: ${formatStock(slot.dose.stock)}` : `Stok azaldı: ${formatStock(slot.dose.stock)}`;

  return (
    <>
      <WeekStrip today={today} language={language} accessibilityLabel={t.weekStripLabel} />

      <DailyProgress
        title={t.todayProgressTitle}
        countLabel={fillCount(t.todayProgressCount, takenSlots.length, todaySlots.length)}
        taken={takenSlots.length}
        total={todaySlots.length}
      />

      {notices}

      {/* Pending doses: the next one as the primary card, the rest as compact rows. */}
      <SectionHeader title={t.pendingDosesTitle} count={pendingSlots.length > 0 ? pendingSlots.length : undefined} />

      {nextSlot ? (
        <PrimaryDoseCard
          slot={nextSlot}
          language={language}
          t={t}
          timingText={getSlotTimingText(nextSlot.time)}
          mealLabel={getMealLabel(nextSlot.dose.mealCondition)}
          formLabel={getFormLabel(nextSlot.dose.form)}
          guidance={getOverdueGuidance(nextSlot)}
          stockText={stockText(nextSlot)}
          sameTimeCount={sameTimeSlots.length}
          onTake={() => takeSlot(nextSlot)}
          onTakeAllSameTime={() => {
            triggerHaptic();
            sameTimeSlots.forEach((s) => takeSlot(s));
          }}
          onSnooze={() => void snoozeDose(nextSlot.dose, nextSlot.time, today, snoozeMinutes)}
          onSkip={() => skipSlot(nextSlot)}
          onOptions={() => openEditor(nextSlot.dose)}
        />
      ) : todaySlots.length > 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={44} color={COLORS.success} />
          <Text style={styles.emptyTitle}>{t.allDone}</Text>
          <Text style={styles.emptySub}>
            {isEn
              ? `${takenSlots.length} doses taken, no pending doses.`
              : `${takenSlots.length} doz alındı, bekleyen doz yok.`}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="medical-outline" size={44} color={COLORS.accent} />
          <Text style={styles.emptyTitle}>{t.noMedsTodayTitle}</Text>
          <Text style={styles.emptySub}>{t.noMedsTodayDesc}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openEditor()} accessibilityRole="button">
            <Ionicons name="add" size={20} color={COLORS.onAccent} />
            <Text style={styles.primaryBtnText}>{t.addFirstMedicine}</Text>
          </TouchableOpacity>
        </View>
      )}

      {otherPending.length > 0 && (
        <View style={styles.listCard}>
          {otherPending.map((slot, idx) => (
            <View key={slot.slotId} style={[styles.row, idx > 0 && styles.rowDivider]}>
              <Text style={styles.rowTime} maxFontSizeMultiplier={1.4}>{slot.time}</Text>
              <View style={styles.rowMain}>
                <Text style={styles.rowName} numberOfLines={2}>{slot.dose.name}</Text>
                <Text style={styles.rowSub} numberOfLines={2}>
                  {slot.todayAmount} · {getMealLabel(slot.dose.mealCondition)}
                  {slot.dose.frequencyType && slot.dose.frequencyType !== 'everyday' ? ` · ${slot.cycleInfo.phaseLabel}` : ''}
                  {!slot.durationInfo.isContinuous ? ` · ${slot.durationInfo.badgeText}` : ''}
                </Text>
                {isStockLow(slot) && <Text style={styles.rowWarning} numberOfLines={1}>{stockText(slot)}</Text>}
              </View>
              <TouchableOpacity
                style={styles.rowAction}
                onPress={() => takeSlot(slot)}
                accessibilityRole="button"
                accessibilityLabel={`${slot.dose.name}, ${slot.time}, ${t.takeDone}`}
              >
                <View style={styles.rowCheck}>
                  <Ionicons name="checkmark" size={18} color={COLORS.accent} />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Taken doses, collapsible. Tapping a record opens the correction dialog. */}
      {takenSlots.length > 0 && (
        <View style={styles.takenWrap}>
          <TouchableOpacity
            style={styles.takenToggle}
            onPress={() => {
              triggerHaptic();
              setExpandedTaken((prev) => !prev);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: expandedTaken }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
            <Text style={styles.takenTitle} numberOfLines={1}>{t.takenDosesTitle}</Text>
            <View style={styles.takenBadge}>
              <Text style={styles.takenBadgeText}>{takenSlots.length}</Text>
            </View>
            <View style={styles.flexSpacer} />
            <Ionicons name={expandedTaken ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {expandedTaken && (
            <View style={styles.takenList}>
              <Text style={styles.listHint}>
                {isEn ? 'Tap a record to correct it.' : 'Bir kaydı düzeltmek için üzerine dokunun.'}
              </Text>
              {takenSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.slotId}
                  style={[styles.row, styles.rowDivider]}
                  testID={`revert-today-${slot.slotId}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.dose.name}, ${slot.time}, ${isEn ? 'Correct record' : 'Kaydı düzelt'}`}
                  onPress={() => onRevertRecord(slot)}
                >
                  <Text style={[styles.rowTime, styles.rowTimeDone]}>{slot.time}</Text>
                  <View style={styles.rowMain}>
                    <Text style={[styles.rowName, styles.rowNameDone]} numberOfLines={2}>{slot.dose.name}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {slot.todayAmount} · {getMealLabel(slot.dose.mealCondition)}
                    </Text>
                  </View>
                  <View style={styles.rowTrailing}>
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                    <Text style={styles.correctText}>{isEn ? 'Correct' : 'Düzelt'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {showAppointmentCard && (
        <AppointmentSummary
          appointments={appointments}
          today={today}
          language={language}
          triggerHaptic={triggerHaptic}
          onOpenAppointmentEditor={onOpenAppointmentEditor}
          onNavigateDoctorProfile={onNavigateDoctorProfile}
        />
      )}

      {offCycleDoses.length > 0 && (
        <View style={styles.infoCard}>
          <SectionHeader
            title={isEn ? 'Not scheduled today' : 'Bugün planlanmayanlar'}
            count={offCycleDoses.length}
            icon="sync-outline"
          />
          {offCycleDoses.map((d, idx) => {
            const info = getCycleInfo(d, today, language);
            const started = getDurationInfo(d, today, language).hasStarted;
            return (
              <View key={d.id} style={[styles.infoRow, idx > 0 && styles.rowDivider]}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowName} numberOfLines={2}>{d.name}</Text>
                  <Text style={styles.rowSub}>
                    {started ? info.phaseLabel : isEn ? 'Not started yet' : 'Henüz başlamadı'}
                    {' · '}
                    {isEn ? 'No dose today' : 'Bugün doz yok'}
                  </Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{isEn ? 'Off day' : 'Beklemede'}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {completedDoses.length > 0 && (
        <View style={styles.infoCard}>
          <SectionHeader
            title={isEn ? 'Completed treatments' : 'Tedavisi tamamlananlar'}
            count={completedDoses.length}
            icon="checkmark-done-outline"
            iconColor={COLORS.success}
          />
          {completedDoses.map((d, idx) => (
            <View key={d.id} style={[styles.infoRow, idx > 0 && styles.rowDivider]}>
              <View style={styles.rowMain}>
                <Text style={styles.rowName} numberOfLines={2}>{d.name}</Text>
                <Text style={styles.rowSub}>
                  {isEn ? `${d.durationDays}-day treatment completed` : `${d.durationDays} günlük tedavi tamamlandı`}
                  {' · '}
                  {d.startDate} – {d.endDate}
                </Text>
              </View>
              <View style={[styles.tag, styles.tagSuccess]}>
                <Text style={[styles.tagText, styles.tagSuccessText]}>{isEn ? 'Completed' : 'Tamamlandı'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: TYPE.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: TYPE.bodySmall,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    alignSelf: 'stretch',
    minHeight: 52,
    marginTop: SPACING.sm,
    borderRadius: RADII.button,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
  },
  primaryBtnText: {
    color: COLORS.onAccent,
    fontSize: TYPE.body + 1,
    fontWeight: '700',
  },
  listCard: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 64,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rowTime: {
    color: COLORS.text,
    fontSize: TYPE.heading,
    fontWeight: '700',
    minWidth: 52,
  },
  rowTimeDone: {
    color: COLORS.textMuted,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: COLORS.text,
    fontSize: TYPE.body,
    fontWeight: '600',
  },
  rowNameDone: {
    color: COLORS.textSecondary,
  },
  rowSub: {
    color: COLORS.textSecondary,
    fontSize: TYPE.caption + 1,
    marginTop: 2,
  },
  rowWarning: {
    color: COLORS.warning,
    fontSize: TYPE.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  rowAction: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -SPACING.xxs,
  },
  rowCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTrailing: {
    alignItems: 'center',
    gap: 2,
  },
  correctText: {
    color: COLORS.textSecondary,
    fontSize: TYPE.micro,
    fontWeight: '500',
  },
  takenWrap: {
    marginTop: SPACING.xl,
  },
  takenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: MIN_TOUCH,
  },
  takenTitle: {
    color: COLORS.text,
    fontSize: TYPE.heading,
    fontWeight: '700',
    flexShrink: 1,
  },
  takenBadge: {
    minWidth: 24,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
  },
  takenBadgeText: {
    color: COLORS.success,
    fontSize: TYPE.caption,
    fontWeight: '700',
  },
  flexSpacer: {
    flex: 1,
  },
  takenList: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.card,
  },
  listHint: {
    color: COLORS.textSecondary,
    fontSize: TYPE.caption,
    paddingVertical: SPACING.md,
  },
  infoCard: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.card,
    paddingBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted,
  },
  tagText: {
    color: COLORS.textSecondary,
    fontSize: TYPE.caption,
    fontWeight: '600',
  },
  tagSuccess: {
    backgroundColor: COLORS.successSoft,
  },
  tagSuccessText: {
    color: COLORS.success,
  },
});
