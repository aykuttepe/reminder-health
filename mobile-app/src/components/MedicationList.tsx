import React from 'react';
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
} from '../medicationPlan';
import { Translations } from '../i18n/translations';

export interface MedicationListProps {
  doses: Dose[];
  today: string;
  language: 'tr' | 'en';
  t: Translations;
  openEditor: (dose?: Dose) => void;
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
  getMealLabel,
  formatStock,
  getCycleInfo,
  getDurationInfo,
  calculateEndDate,
}) => {
  const activeDoses = doses.filter((d) => !d.deletedAt);

  return (
    <View>
      <View style={styles.medsHeader}>
        <Text style={styles.sectionTitle}>
          {language === 'en'
            ? `DAILY PLAN (${activeDoses.length} Meds)`
            : `GÜNLÜK PLAN (${activeDoses.length} İlaç)`}
        </Text>
      </View>

      {activeDoses.length === 0 ? (
        <View style={[styles.emptyCard, { marginHorizontal: 0, marginBottom: 16 }]}>
          <Ionicons name="medkit-outline" size={48} color="#a9dfca" />
          <Text style={styles.emptyCardTitle}>{t.noMedsRecordedTitle}</Text>
          <Text style={styles.emptyCardSub}>{t.noMedsRecordedDesc}</Text>
        </View>
      ) : (
        activeDoses.map((dose) => {
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
            <TouchableOpacity key={dose.id} style={styles.medCard} onPress={() => openEditor(dose)}>
              <View style={styles.medCardHeader}>
                <Text style={styles.medCardTime}>{medTimes.join(', ')}</Text>
                <View style={styles.medCardBadges}>
                  {!durationInfo.isContinuous && (
                    <View style={[styles.durationTag, durationInfo.isExpired && styles.durationTagExpired]}>
                      <Ionicons
                        name={durationInfo.isExpired ? 'checkmark-circle' : 'hourglass-outline'}
                        size={10}
                        color={durationInfo.isExpired ? '#94a3b8' : '#a9dfca'}
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
              <Text style={styles.medCardName}>{dose.name}</Text>
              <Text style={styles.medCardSub}>
                {dose.amount} · {getMealLabel(dose.mealCondition)} · {regimenText}
                {dose.instructions ? ` · ${dose.instructions}` : ''}
              </Text>
              {!durationInfo.isContinuous && (
                <View style={styles.medCardDurationRow}>
                  <Ionicons name="calendar-outline" size={11} color="#a9dfca" />
                  <Text style={styles.medCardDurationText}>
                    {dose.startDate} - {dose.endDate || calculateEndDate(dose.startDate || today, dose.durationDays || 7)} (
                    {language === 'en' ? `${dose.durationDays}-Day Treatment` : `${dose.durationDays} Günlük Tedavi`})
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}

      <TouchableOpacity style={styles.fullAddBtn} onPress={() => openEditor()}>
        <Ionicons name="add" size={20} color="#f5f3f0" />
        <Text style={styles.fullAddBtnText}>{t.addMedicine}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  medsHeader: {
    marginVertical: 12,
  },
  sectionTitle: {
    color: '#adb3bf',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: '#152332',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyCardTitle: {
    color: '#f5f3f0',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyCardSub: {
    color: '#adb3bf',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  medCard: {
    backgroundColor: '#152332',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#203244',
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  medCardTime: {
    color: '#a9dfca',
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
    backgroundColor: '#13332d',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationTagExpired: {
    backgroundColor: '#1e293b',
  },
  durationTagText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '700',
  },
  durationTagTextExpired: {
    color: '#94a3b8',
  },
  cycleTag: {
    backgroundColor: '#143532',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cycleTagText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '600',
  },
  cycleTagOff: {
    backgroundColor: '#232c37',
  },
  cycleTagOffText: {
    color: '#adb3bf',
  },
  stockPill: {
    backgroundColor: '#1a2938',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockPillText: {
    color: '#adb3bf',
    fontSize: 10,
    fontWeight: '600',
  },
  stockPillLow: {
    backgroundColor: '#332214',
  },
  stockPillLowText: {
    color: '#f0b484',
    fontWeight: '700',
  },
  medCardName: {
    color: '#f5f3f0',
    fontSize: 16,
    fontWeight: '600',
  },
  medCardSub: {
    color: '#adb3bf',
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
    color: '#a9dfca',
    fontSize: 11,
  },
  fullAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a2a3a',
    height: 48,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2e4155',
  },
  fullAddBtnText: {
    color: '#f5f3f0',
    fontSize: 14,
    fontWeight: '600',
  },
});
