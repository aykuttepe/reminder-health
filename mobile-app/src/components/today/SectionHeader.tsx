import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MIN_TOUCH, RADII, SPACING, TYPE } from '../../theme';

interface SectionHeaderProps {
  title: string;
  count?: number;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shared section title with an optional count badge and trailing text action. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, count, icon, iconColor, actionLabel, onAction }) => (
  <View style={styles.row}>
    <View style={styles.titleWrap}>
      {icon && <Ionicons name={icon} size={18} color={iconColor ?? COLORS.textSecondary} />}
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      {count !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.3}>{count}</Text>
        </View>
      )}
    </View>
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.action} onPress={onAction} accessibilityRole="button">
        <Ionicons name="add" size={16} color={COLORS.accent} />
        <Text style={styles.actionText} numberOfLines={1}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPE.heading,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    minWidth: 24,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.accent,
    fontSize: TYPE.caption,
    fontWeight: '700',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: MIN_TOUCH,
    paddingHorizontal: SPACING.xxs,
    marginVertical: -SPACING.sm,
  },
  actionText: {
    color: COLORS.accent,
    fontSize: TYPE.bodySmall,
    fontWeight: '600',
  },
});
