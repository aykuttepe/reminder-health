import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ScheduledSlot, MedicineForm } from '../../medicationPlan';
import type { Translations } from '../../i18n/translations';
import { COLORS, MIN_TOUCH, RADII, SPACING, TYPE } from '../../theme';

const OVERDUE_GRACE_MS = 60_000;
const DEFAULT_STOCK_THRESHOLD = 5;
const ICON_BOX = 44;
const PRIMARY_BUTTON_HEIGHT = 52;

export interface DoseGuidance {
  type: string;
  icon: string;
  title: string;
  message: string;
}

/** True once a slot's time is more than a minute in the past (local clock). */
export function isSlotOverdue(time: string, now: Date = new Date()): boolean {
  const [h, m] = time.split(':').map(Number);
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  return target.getTime() - now.getTime() < -OVERDUE_GRACE_MS;
}

export function formIconName(form?: MedicineForm): React.ComponentProps<typeof MaterialCommunityIcons>['name'] {
  if (form === 'damla') return 'eyedropper';
  if (form === 'surup') return 'bottle-tonic-plus-outline';
  return 'pill';
}

export function isStockLow(slot: ScheduledSlot): boolean {
  return slot.dose.stock !== undefined && slot.dose.stock <= (slot.dose.stockThreshold ?? DEFAULT_STOCK_THRESHOLD);
}

interface PrimaryDoseCardProps {
  slot: ScheduledSlot;
  language: 'tr' | 'en';
  t: Translations;
  timingText: string;
  mealLabel: string;
  formLabel: string;
  guidance: DoseGuidance | null;
  stockText: string;
  sameTimeCount: number;
  onTake: () => void;
  onTakeAllSameTime: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onOptions: () => void;
}

interface MetaItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  tone?: 'warning';
}

export const PrimaryDoseCard: React.FC<PrimaryDoseCardProps> = ({
  slot,
  language,
  t,
  timingText,
  mealLabel,
  formLabel,
  guidance,
  stockText,
  sameTimeCount,
  onTake,
  onTakeAllSameTime,
  onSnooze,
  onSkip,
  onOptions,
}) => {
  const overdue = isSlotOverdue(slot.time);
  const { dose } = slot;
  const meta: MetaItem[] = [
    { icon: 'restaurant-outline', text: mealLabel },
    {
      icon: 'calendar-clear-outline',
      text: dose.frequencyType && dose.frequencyType !== 'everyday' ? slot.cycleInfo.phaseLabel : t.everyDay,
    },
  ];
  if (!slot.durationInfo.isContinuous) meta.push({ icon: 'hourglass-outline', text: slot.durationInfo.badgeText });
  if (isStockLow(slot)) meta.push({ icon: 'cube-outline', text: stockText, tone: 'warning' });

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name={formIconName(dose.form)} size={22} color={COLORS.accent} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.name} numberOfLines={2}>{dose.name}</Text>
          <Text style={styles.formLine} numberOfLines={1}>{formLabel} · {slot.todayAmount}</Text>
        </View>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onOptions}
          accessibilityRole="button"
          accessibilityLabel={`${dose.name}, ${t.doseOptions}`}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.timeRow}>
        <Text style={styles.time} maxFontSizeMultiplier={1.4}>{slot.time}</Text>
        <View style={[styles.timingTag, overdue && styles.timingTagOverdue]}>
          <Ionicons
            name={overdue ? 'alert-circle-outline' : 'time-outline'}
            size={14}
            color={overdue ? COLORS.warning : COLORS.textSecondary}
          />
          <Text style={[styles.timingText, overdue && styles.timingTextOverdue]} numberOfLines={1}>
            {timingText}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {meta.map((item) => (
          <View key={`${item.icon}-${item.text}`} style={styles.metaItem}>
            <Ionicons name={item.icon} size={15} color={item.tone === 'warning' ? COLORS.warning : COLORS.textSecondary} />
            <Text style={[styles.metaText, item.tone === 'warning' && styles.metaTextWarning]} numberOfLines={2}>
              {item.text}
            </Text>
          </View>
        ))}
      </View>

      {Boolean(dose.instructions) && (
        <View style={styles.metaItem}>
          <Ionicons name="chatbubble-ellipses-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.metaText} numberOfLines={2}>{dose.instructions}</Text>
        </View>
      )}

      {guidance && (
        <View style={[styles.guidance, guidance.type === 'double_dose_warning' && styles.guidanceCritical]}>
          <Text
            style={[styles.guidanceTitle, guidance.type === 'double_dose_warning' && styles.guidanceTitleCritical]}
            numberOfLines={2}
          >
            {guidance.title}
          </Text>
          <Text style={styles.guidanceMessage}>{guidance.message}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.takeBtn}
        onPress={onTake}
        accessibilityRole="button"
        accessibilityLabel={`${dose.name}, ${t.takeDone}`}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark" size={20} color={COLORS.onAccent} />
        <Text style={styles.takeBtnText} numberOfLines={1}>{t.takeDone}</Text>
      </TouchableOpacity>

      {sameTimeCount > 1 && (
        <TouchableOpacity style={styles.takeAllBtn} onPress={onTakeAllSameTime} accessibilityRole="button">
          <Ionicons name="checkmark-done" size={18} color={COLORS.accent} />
          <Text style={styles.takeAllText} numberOfLines={2}>
            {language === 'en'
              ? `Take all ${sameTimeCount} at ${slot.time}`
              : `Bu saatteki tüm ilaçları al (${sameTimeCount})`}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.secondaryRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onSnooze} accessibilityRole="button">
          <Ionicons name="alarm-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.secondaryText} numberOfLines={1}>{t.snooze}</Text>
        </TouchableOpacity>
        <View style={styles.secondaryDivider} />
        <TouchableOpacity style={styles.secondaryBtn} onPress={onSkip} accessibilityRole="button">
          <Ionicons name="play-skip-forward-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.secondaryText} numberOfLines={1}>{t.skipDose}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.card,
    gap: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: RADII.button,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: COLORS.text,
    fontSize: TYPE.title,
    fontWeight: '700',
  },
  formLine: {
    color: COLORS.textSecondary,
    fontSize: TYPE.bodySmall,
    marginTop: 2,
  },
  menuBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    marginRight: -SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  time: {
    color: COLORS.text,
    fontSize: TYPE.display,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  timingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
    paddingVertical: SPACING.xxs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceMuted,
    flexShrink: 1,
  },
  timingTagOverdue: {
    backgroundColor: COLORS.warningSoft,
  },
  timingText: {
    color: COLORS.textSecondary,
    fontSize: TYPE.caption,
    fontWeight: '600',
    flexShrink: 1,
  },
  timingTextOverdue: {
    color: COLORS.warning,
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
  metaTextWarning: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  guidance: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: RADII.button,
    padding: SPACING.md,
    gap: SPACING.xxs,
  },
  guidanceCritical: {
    backgroundColor: COLORS.dangerSoft,
  },
  guidanceTitle: {
    color: COLORS.warning,
    fontSize: TYPE.bodySmall,
    fontWeight: '700',
  },
  guidanceTitleCritical: {
    color: COLORS.danger,
  },
  guidanceMessage: {
    color: COLORS.text,
    fontSize: TYPE.caption + 1,
    lineHeight: 18,
  },
  takeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: RADII.button,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
  },
  takeBtnText: {
    color: COLORS.onAccent,
    fontSize: TYPE.body + 1,
    fontWeight: '700',
  },
  takeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: MIN_TOUCH,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    paddingHorizontal: SPACING.md,
  },
  takeAllText: {
    color: COLORS.accent,
    fontSize: TYPE.bodySmall,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -SPACING.xxs,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    minHeight: MIN_TOUCH,
  },
  secondaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  secondaryText: {
    color: COLORS.textSecondary,
    fontSize: TYPE.bodySmall,
    fontWeight: '600',
    flexShrink: 1,
  },
});
