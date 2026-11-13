import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, SPACING, TYPE } from '../../theme';

/** Above this many doses the bar becomes one continuous fill so segments stay legible. */
const MAX_SEGMENTS = 12;
const BAR_HEIGHT = 8;

interface DailyProgressProps {
  title: string;
  countLabel: string;
  taken: number;
  total: number;
}

export const DailyProgress: React.FC<DailyProgressProps> = ({ title, countLabel, taken, total }) => {
  if (total <= 0) return null;
  const clampedTaken = Math.min(Math.max(taken, 0), total);
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${title}, ${countLabel}`}
      accessibilityValue={{ min: 0, max: total, now: clampedTaken }}
    >
      <View style={styles.headRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.count} numberOfLines={1}>{countLabel}</Text>
      </View>
      {total <= MAX_SEGMENTS ? (
        <View style={styles.segments}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[styles.segment, i < clampedTaken && styles.segmentDone]} />
          ))}
        </View>
      ) : (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(clampedTaken / total) * 100}%` }]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.xl,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPE.body,
    fontWeight: '600',
    flexShrink: 1,
  },
  count: {
    color: COLORS.textSecondary,
    fontSize: TYPE.bodySmall,
  },
  segments: {
    flexDirection: 'row',
    gap: SPACING.xxs,
  },
  segment: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceAlt,
  },
  segmentDone: {
    backgroundColor: COLORS.accent,
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
});
