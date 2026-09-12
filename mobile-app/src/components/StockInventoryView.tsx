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
        <Ionicons name="cube-outline" size={48} color="#a9dfca" />
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
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
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
            <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
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
            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
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
      {filteredList.map(({ dose, projection }) => {
        const isCritical = projection.statusTier === 'critical';
        const isLow = projection.statusTier === 'low';

        const tierColor = isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
        const tierBg = isCritical ? '#2c1618' : isLow ? '#2c2314' : '#102622';
        const tierBorder = isCritical ? '#5c2428' : isLow ? '#5c431d' : '#1d4a3e';

        return (
          <View key={dose.id} style={styles.stockCard}>
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

                {/* Days Remaining Badge */}
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
                <Ionicons name="calendar-outline" size={13} color="#adb3bf" />
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
                    color={projection.currentStock <= 0 ? '#4b5563' : '#f5f3f0'}
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
                  <Ionicons name="add" size={16} color="#f5f3f0" />
                </TouchableOpacity>
              </View>

              {/* +1 Box Quick Button */}
              <TouchableOpacity
                style={styles.addBoxBtn}
                onPress={() => handleAddBox(dose, projection.boxSize)}
                activeOpacity={0.7}
              >
                <Ionicons name="cube" size={14} color="#081624" />
                <Text style={styles.addBoxBtnText}>
                  {t.stockAddBox} (+{projection.boxSize})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
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
    backgroundColor: '#152332',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#203244',
  },
  triageCardCritical: {
    backgroundColor: '#1c171a',
    borderColor: '#3d1f23',
  },
  triageCardActiveCritical: {
    borderColor: '#ef4444',
    backgroundColor: '#2c1618',
  },
  triageCardLow: {
    backgroundColor: '#1c1b18',
    borderColor: '#3d301f',
  },
  triageCardActiveLow: {
    borderColor: '#f59e0b',
    backgroundColor: '#2c2314',
  },
  triageCardGood: {
    backgroundColor: '#13211f',
    borderColor: '#193930',
  },
  triageCardActiveGood: {
    borderColor: '#10b981',
    backgroundColor: '#102622',
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
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '800',
  },
  triageCountLow: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '800',
  },
  triageCountGood: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '800',
  },
  triageLabelCritical: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '700',
  },
  triageLabelLow: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '700',
  },
  triageLabelGood: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '700',
  },
  triageSub: {
    color: '#94a3b8',
    fontSize: 10,
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
    backgroundColor: '#152332',
    borderWidth: 1,
    borderColor: '#203244',
  },
  filterChipActive: {
    backgroundColor: '#a9dfca',
    borderColor: '#a9dfca',
  },
  filterChipText: {
    color: '#adb3bf',
    fontSize: 11.5,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#081624',
    fontWeight: '700',
  },
  stockCard: {
    backgroundColor: '#152332',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#203244',
    marginBottom: 12,
    overflow: 'hidden',
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
    color: '#f5f3f0',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  medMeta: {
    color: '#adb3bf',
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
    color: '#adb3bf',
    fontSize: 12,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0d1822',
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
    backgroundColor: '#0d1a27',
    borderTopWidth: 1,
    borderTopColor: '#1a2938',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#152332',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#203244',
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
    color: '#f5f3f0',
    fontSize: 14,
    fontWeight: '700',
  },
  stepperUnitText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  addBoxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#a9dfca',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBoxBtnText: {
    color: '#081624',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#152332',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginVertical: 16,
  },
  emptyCardTitle: {
    color: '#f5f3f0',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyCardSub: {
    color: '#adb3bf',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});
