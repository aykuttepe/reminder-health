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
  CycleInfo,
  DurationInfo,
  calculateStockProjection,
} from '../medicationPlan';
import { Translations } from '../i18n/translations';
import { StockInventoryView } from './StockInventoryView';
import { useResponsive } from '../useResponsive';

import { COLORS, RADII } from '../theme';
import { SectionHeader } from './today/SectionHeader';
export interface MedicationListProps {
  doses: Dose[];
  today: string;
  language: 'tr' | 'en';
  t: Translations;
  openEditor: (dose?: Dose) => void;
  onUpdateStock: (id: string | number, newStock: number) => void;
  getMealLabel: (cond?: MealCondition) => string;
  formatStock: (stock?: number) => string;
  getCycleInfo: (dose: Dose, date: string, lang?: 'tr' | 'en') => CycleInfo;
  getDurationInfo: (dose: Dose, date: string, lang?: 'tr' | 'en') => DurationInfo;
  calculateEndDate: (start: string, days: number) => string;
}

export const MedicationList: React.FC<MedicationListProps> = ({
  doses,
  today,
  language,
  t,
  openEditor,
  onUpdateStock,
  getMealLabel,
  formatStock,
  getCycleInfo,
  getDurationInfo,
  calculateEndDate,
}) => {
  const { isTablet } = useResponsive();
  const [subTab, setSubTab] = useState<'plan' | 'stock'>('plan');
  const activeDoses = doses.filter((d) => !d.deletedAt);

  const criticalCount = useMemo(() => {
    return activeDoses.filter(
      (d) => calculateStockProjection(d, today, language).statusTier === 'critical'
    ).length;
  }, [activeDoses, today, language]);

  return (
    <View>
      {/* Segmented Switch: Tedavi Planı / Stok & Envanter */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'plan' && styles.segmentBtnActive]}
          onPress={() => setSubTab('plan')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={subTab === 'plan' ? COLORS.onAccent : COLORS.textSecondary}
          />
          <Text
            style={[styles.segmentText, subTab === 'plan' && styles.segmentTextActive]}
          >
            {t.subTabPlan}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'stock' && styles.segmentBtnActive]}
          onPress={() => setSubTab('stock')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="cube-outline"
            size={15}
            color={subTab === 'stock' ? COLORS.onAccent : COLORS.textSecondary}
          />
          <Text
            style={[styles.segmentText, subTab === 'stock' && styles.segmentTextActive]}
          >
            {t.subTabStock}
          </Text>
          {criticalCount > 0 && (
            <View style={styles.segmentBadge}>
              <Text style={styles.segmentBadgeText}>{criticalCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {subTab === 'stock' ? (
        <StockInventoryView
          doses={doses}
          today={today}
          language={language}
          t={t}
          openEditor={(d) => openEditor(d)}
          onUpdateStock={onUpdateStock}
          getMealLabel={getMealLabel}
        />
      ) : (
        <>
          <View style={styles.medsHeader}>
            <SectionHeader
              title={language === 'en' ? 'Daily plan' : 'Günlük plan'}
              count={activeDoses.length}
            />
          </View>

      {activeDoses.length === 0 ? (
        <View style={[styles.emptyCard, { marginHorizontal: 0, marginBottom: 16 }]}>
          <Ionicons name="medkit-outline" size={48} color={COLORS.accent} />
          <Text style={styles.emptyCardTitle}>{t.noMedsRecordedTitle}</Text>
          <Text style={styles.emptyCardSub}>{t.noMedsRecordedDesc}</Text>
        </View>
      ) : (
        <View style={isTablet ? styles.tabletGrid : undefined}>
          {activeDoses.map((dose) => {
            const cycleInfo = getCycleInfo(dose, today, language);
            const durationInfo = getDurationInfo(dose, today, language);
            const medTimes = dose.times && dose.times.length > 0 ? dose.times : [dose.time];
            const isLow = (dose.stock ?? 10) <= (dose.stockThreshold ?? 5);

            let regimenText = language === 'en' ? 'Every day' : 'Her gün';
            if (dose.frequencyType === 'alternate') {
              regimenText = language === 'en' ? 'Alternate days' : 'Gün aşırı';
            } else if (dose.frequencyType === 'cycle') {
              regimenText =
                language === 'en'
                  ? `${dose.cyclePhase1Days || 3}d on / ${dose.cyclePhase2Days || 4}d off`
                  : `${dose.cyclePhase1Days || 3} gün al / ${dose.cyclePhase2Days || 4} gün ara`;
            } else if (dose.frequencyType === 'variable') {
              regimenText =
                language === 'en'
                  ? `${dose.cyclePhase1Days || 4}d ${dose.cyclePhase1Amount || '1.5 tab'} / ${dose.cyclePhase2Days || 3}d ${dose.cyclePhase2Amount || '1 tab'}`
                  : `${dose.cyclePhase1Days || 4} gün ${dose.cyclePhase1Amount || '1.5 tab'} / ${dose.cyclePhase2Days || 3} gün ${dose.cyclePhase2Amount || '1 tab'}`;
            }

            return (
              <TouchableOpacity key={dose.id} style={[styles.medCard, isTablet && styles.medCardTablet]} onPress={() => openEditor(dose)}>
                <View style={styles.medCardHeader}>
                  <Text style={styles.medCardTime}>{medTimes.map(t => dose.slotAmounts?.[t] ? `${t} (${dose.slotAmounts[t]})` : t).join(', ')}</Text>
                  <View style={styles.medCardBadges}>
                    {!durationInfo.isContinuous && (
                      <View style={[styles.durationTag, durationInfo.isExpired && styles.durationTagExpired]}>
                        <Ionicons
                          name={durationInfo.isExpired ? 'checkmark-circle' : 'hourglass-outline'}
                          size={10}
                          color={durationInfo.isExpired ? COLORS.textSecondary : COLORS.accent}
                        />
                        <Text style={[styles.durationTagText, durationInfo.isExpired && styles.durationTagTextExpired]}>
                          {durationInfo.badgeText}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.cycleTag, cycleInfo.phaseType === 'off' && styles.cycleTagOff]}>
                      <Text style={[styles.cycleTagText, cycleInfo.phaseType === 'off' && styles.cycleTagOffText]}>
                        {cycleInfo.phaseType === 'off'
                          ? language === 'en'
                            ? 'Rest day'
                            : 'Ara gününde'
                          : cycleInfo.phaseLabel}
                      </Text>
                    </View>
                    <View style={[styles.stockPill, isLow && styles.stockPillLow]}>
                      <Text style={[styles.stockPillText, isLow && styles.stockPillLowText]}>
                        {formatStock(dose.stock)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.medCardNameRow}>
                  <Text style={styles.medCardName}>{dose.name}</Text>
                  {dose.muted && (
                    <View
                      style={styles.mutedPill}
                      accessible
                      accessibilityLabel={language === 'en' ? 'Reminders muted' : 'Bildirimler sessizde'}
                    >
                      <Ionicons name="notifications-off-outline" size={12} color={COLORS.warning} />
                      <Text style={styles.mutedPillText}>{language === 'en' ? 'Muted' : 'Sessiz'}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.medCardSub}>
                  {dose.amount} · {getMealLabel(dose.mealCondition)} · {regimenText}
                  {dose.instructions ? ` · ${dose.instructions}` : ''}
                </Text>
                {!durationInfo.isContinuous && (
                  <View style={styles.medCardDurationRow}>
                    <Ionicons name="calendar-outline" size={11} color={COLORS.accent} />
                    <Text style={styles.medCardDurationText}>
                      {dose.startDate} - {dose.endDate || calculateEndDate(dose.startDate || today, dose.durationDays || 7)} (
                      {language === 'en' ? `${dose.durationDays}-Day Treatment` : `${dose.durationDays} Günlük Tedavi`})
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.fullAddBtn} onPress={() => openEditor()}>
        <Ionicons name="add" size={20} color={COLORS.text} />
        <Text style={styles.fullAddBtnText}>{t.addMedicine}</Text>
      </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  medsHeader: {
    marginVertical: 12,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyCardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyCardSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  tabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  medCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.card,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  medCardTablet: {
    width: '48.8%',
    marginBottom: 0,
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  medCardTime: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  medCardBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  durationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationTagExpired: {
    backgroundColor: COLORS.surfaceMuted,
  },
  durationTagText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  durationTagTextExpired: {
    color: COLORS.textSecondary,
  },
  cycleTag: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cycleTagText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  cycleTagOff: {
    backgroundColor: COLORS.surfaceMuted,
  },
  cycleTagOffText: {
    color: COLORS.textSecondary,
  },
  stockPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockPillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  stockPillLow: {
    backgroundColor: COLORS.warningSoft,
  },
  stockPillLowText: {
    color: COLORS.warning,
    fontWeight: '700',
  },
  medCardNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  mutedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  mutedPillText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  medCardName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  medCardSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  medCardDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  medCardDurationText: {
    color: COLORS.accent,
    fontSize: 11,
  },
  fullAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    height: 48,
    borderRadius: RADII.button,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  fullAddBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADII.button,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.accent,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.onAccent,
    fontWeight: '700',
  },
  segmentBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },
});
