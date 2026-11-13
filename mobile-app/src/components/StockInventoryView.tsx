import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Dose,
  MealCondition,
  calculateStockProjection,
} from '../medicationPlan';
import { Translations } from '../i18n/translations';
import { useResponsive } from '../useResponsive';

import { COLORS, RADII } from '../theme';
export interface StockInventoryViewProps {
  doses: Dose[];
  today: string;
  language: 'tr' | 'en';
  t: Translations;
  openEditor: (dose: Dose) => void;
  onUpdateStock: (id: string | number, newStock: number) => void;
  getMealLabel?: (cond?: MealCondition) => string;
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  doses,
  today,
  language,
  t,
  openEditor,
  onUpdateStock,
}) => {
  const { isTablet } = useResponsive();
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'good'>('all');

  const activeDoses = useMemo(() => doses.filter(d => !d.deletedAt), [doses]);

  // Compute projections for all active doses
  const projectionsWithDose = useMemo(() => {
    return activeDoses.map(dose => ({
      dose,
      projection: calculateStockProjection(dose, today, language),
    }));
  }, [activeDoses, today, language]);

  // Triage counts (Critical: <=7d, Low: <=14d, Good: >14d)
  const criticalCount = useMemo(
    () => projectionsWithDose.filter(p => p.projection.statusTier === 'critical').length,
    [projectionsWithDose]
  );
  const lowCount = useMemo(
    () => projectionsWithDose.filter(p => p.projection.statusTier === 'low').length,
    [projectionsWithDose]
  );
  const goodCount = useMemo(
    () => projectionsWithDose.filter(p => p.projection.statusTier === 'good').length,
    [projectionsWithDose]
  );

  // Filtered list
  const filteredList = useMemo(() => {
    if (filter === 'all') return projectionsWithDose;
    return projectionsWithDose.filter(p => p.projection.statusTier === filter);
  }, [projectionsWithDose, filter]);

  const handleAdjustStock = (dose: Dose, delta: number) => {
    const current = Math.max(0, dose.stock ?? 0);
    const next = Math.max(0, current + delta);
    onUpdateStock(dose.id, next);
  };

  const handleAddBox = (dose: Dose, boxSize: number) => {
    const current = Math.max(0, dose.stock ?? 0);
    onUpdateStock(dose.id, current + boxSize);
  };

  if (activeDoses.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="cube-outline" size={48} color={COLORS.accent} />
        <Text style={styles.emptyCardTitle}>{t.stockEmptyTitle}</Text>
        <Text style={styles.emptyCardSub}>{t.stockEmptyDesc}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Triage Overview Deck */}
      <View style={styles.triageRow}>
        <TouchableOpacity
          style={[
            styles.triageCard,
            styles.triageCardCritical,
            filter === 'critical' && styles.triageCardActiveCritical,
          ]}
          onPress={() => setFilter(f => (f === 'critical' ? 'all' : 'critical'))}
          activeOpacity={0.7}
        >
          <View style={styles.triageHeader}>
            <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.triageCountCritical}>{criticalCount}</Text>
          </View>
          <Text style={styles.triageLabelCritical}>{t.stockTriageCritical}</Text>
          <Text style={styles.triageSub}>≤ 7 {language === 'en' ? 'days' : 'gün'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.triageCard,
            styles.triageCardLow,
            filter === 'low' && styles.triageCardActiveLow,
          ]}
          onPress={() => setFilter(f => (f === 'low' ? 'all' : 'low'))}
          activeOpacity={0.7}
        >
          <View style={styles.triageHeader}>
            <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.triageCountLow}>{lowCount}</Text>
          </View>
          <Text style={styles.triageLabelLow}>{t.stockTriageLow}</Text>
          <Text style={styles.triageSub}>8-14 {language === 'en' ? 'days' : 'gün'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.triageCard,
            styles.triageCardGood,
            filter === 'good' && styles.triageCardActiveGood,
          ]}
          onPress={() => setFilter(f => (f === 'good' ? 'all' : 'good'))}
          activeOpacity={0.7}
        >
          <View style={styles.triageHeader}>
            <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.triageCountGood}>{goodCount}</Text>
          </View>
          <Text style={styles.triageLabelGood}>{t.stockTriageGood}</Text>
          <Text style={styles.triageSub}>&gt; 14 {language === 'en' ? 'days' : 'gün'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(
          [
            { id: 'all', label: t.stockFilterAll },
            { id: 'critical', label: t.stockFilterCritical },
            { id: 'low', label: t.stockFilterLow },
            { id: 'good', label: t.stockFilterGood },
          ] as const
        ).map(chip => (
          <TouchableOpacity
            key={chip.id}
            style={[styles.filterChip, filter === chip.id && styles.filterChipActive]}
            onPress={() => setFilter(chip.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === chip.id && styles.filterChipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Medication Stock Cards */}
      <View style={isTablet ? styles.tabletGrid : undefined}>
        {filteredList.map(({ dose, projection }) => {
          const isCritical = projection.statusTier === 'critical';
          const isLow = projection.statusTier === 'low';

          const tierColor = isCritical ? COLORS.danger : isLow ? COLORS.warning : COLORS.success;
          const tierBg = isCritical ? COLORS.dangerSoft : isLow ? COLORS.warningSoft : COLORS.accentSoft;
          const tierBorder = isCritical ? COLORS.dangerBorder : isLow ? COLORS.warningBorder : COLORS.successBorder;

          return (
            <View key={dose.id} style={[styles.stockCard, isTablet && styles.stockCardTablet]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openEditor(dose)}
                style={styles.cardMainTap}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.medName} numberOfLines={1}>
                      {dose.name}
                    </Text>
                    <Text style={styles.medMeta}>
                      {t.stockDailyConsumption}: {projection.dailyConsumption}{' '}
                      {dose.form || t.stockUnitPiece}
                    </Text>
                  </View>

                  {/* Days remaining badge */}
                  <View
                    style={[
                      styles.daysBadge,
                      { backgroundColor: tierBg, borderColor: tierBorder },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: tierColor }]} />
                    <Text style={[styles.daysBadgeText, { color: tierColor }]}>
                      {projection.isOutOfStock
                        ? t.stockRunOut
                        : `${projection.daysRemaining} ${t.stockDaysLeft}`}
                    </Text>
                  </View>
                </View>

                {/* Run-out estimation */}
                <View style={styles.runOutRow}>
                  <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.runOutText}>
                    {t.stockRunOutDate}:{' '}
                    <Text style={{ color: tierColor, fontWeight: '600' }}>
                      {projection.runOutDateFormatted}
                    </Text>
                  </Text>
                </View>

                {/* Visual Stock Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(4, projection.progressPercent)}%`,
                        backgroundColor: tierColor,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Quick Actions Row */}
              <View style={styles.actionsRow}>
                {/* Stepper (- / count / +) */}
                <View style={styles.stepperBox}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleAdjustStock(dose, -1)}
                    disabled={projection.currentStock <= 0}
                  >
                    <Ionicons
                      name="remove"
                      size={16}
                      color={projection.currentStock <= 0 ? COLORS.textMuted : COLORS.text}
                    />
                  </TouchableOpacity>

                  <View style={styles.stepperValueBox}>
                    <Text style={styles.stepperValueText}>
                      {projection.currentStock}
                    </Text>
                    <Text style={styles.stepperUnitText}>
                      {t.stockUnitPiece}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleAdjustStock(dose, 1)}
                  >
                    <Ionicons name="add" size={16} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {/* +1 Box Quick Button */}
                <TouchableOpacity
                  style={styles.addBoxBtn}
                  onPress={() => handleAddBox(dose, projection.boxSize)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cube" size={14} color={COLORS.onAccent} />
                  <Text style={styles.addBoxBtnText}>
                    {t.stockAddBox} (+{projection.boxSize})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  triageRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  triageCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  triageCardCritical: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.dangerBorder,
  },
  triageCardActiveCritical: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
  },
  triageCardLow: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.warningBorder,
  },
  triageCardActiveLow: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningSoft,
  },
  triageCardGood: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.successBorder,
  },
  triageCardActiveGood: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.accentSoft,
  },
  triageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  triageCountCritical: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: '800',
  },
  triageCountLow: {
    color: COLORS.warning,
    fontSize: 18,
    fontWeight: '800',
  },
  triageCountGood: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: '800',
  },
  triageLabelCritical: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  triageLabelLow: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  triageLabelGood: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  triageSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.onAccent,
    fontWeight: '700',
  },
  tabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stockCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stockCardTablet: {
    width: '48.8%',
    marginBottom: 0,
  },
  cardMainTap: {
    padding: 14,
    paddingBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  medName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  medMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  runOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  runOutText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
    flexWrap: 'wrap',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: 8,
  },
  stepperValueText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  stepperUnitText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  addBoxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADII.button,
  },
  addBoxBtnText: {
    color: COLORS.onAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginVertical: 16,
  },
  emptyCardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyCardSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});
