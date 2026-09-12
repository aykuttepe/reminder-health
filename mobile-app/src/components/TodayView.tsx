import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Dose,
  ScheduledSlot,
  MealCondition,
  MedicineForm,
  CycleInfo,
  DurationInfo,
} from '../medicationPlan';
import { Translations } from '../i18n/translations';
import { TodayCarousel } from './TodayCarousel';

export interface TodayViewProps {
  carouselSlots: ScheduledSlot[];
  todaySlots: ScheduledSlot[];
  takenSlots: ScheduledSlot[];
  offCycleDoses: Dose[];
  completedDoses: Dose[];
  restOfDaySlots: ScheduledSlot[];
  heroCarouselIndex: number;
  setHeroCarouselIndex: (idx: number) => void;
  heroCarouselRef: React.RefObject<ScrollView | null>;
  takeSlot: (slot: ScheduledSlot) => void;
  snoozeDose: (dose: Dose, time: string, today: string, minutes: number) => void;
  skipSlot: (slot: ScheduledSlot) => void;
  triggerHaptic: () => void;
  openEditor: (dose?: Dose) => void;
  onNavigateSettings: () => void;
  today: string;
  snoozeMinutes: number;
  language: 'tr' | 'en';
  t: Translations;
  expandedTaken: boolean;
  setExpandedTaken: React.Dispatch<React.SetStateAction<boolean>>;
  getSlotTimingText: (timeStr: string) => string;
  getMealLabel: (cond?: MealCondition) => string;
  getFormLabel: (form?: MedicineForm) => string;
  getOverdueGuidance: (slot: ScheduledSlot) => { type: string; icon: string; title: string; message: string } | null;
  formatStock: (stock?: number) => string;
  getCycleInfo: (dose: Dose, date: string, lang?: string) => CycleInfo;
  getDurationInfo: (dose: Dose, date: string, lang?: string) => DurationInfo;
  CAROUSEL_CARD_WIDTH: number;
  CAROUSEL_SPACING: number;
}

export const TodayView: React.FC<TodayViewProps> = ({
  carouselSlots,
  todaySlots,
  takenSlots,
  offCycleDoses,
  completedDoses,
  restOfDaySlots,
  heroCarouselIndex,
  setHeroCarouselIndex,
  heroCarouselRef,
  takeSlot,
  snoozeDose,
  skipSlot,
  triggerHaptic,
  openEditor,
  onNavigateSettings,
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
  CAROUSEL_CARD_WIDTH,
  CAROUSEL_SPACING,
}) => {
  return (
    <>
      {/* Cihaz Güvenilirliği & Alarm Koruma Durumu */}
      <TouchableOpacity
        style={styles.reliabilityStatusBanner}
        onPress={() => {
          triggerHaptic();
          onNavigateSettings();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.reliabilityStatusLeft}>
          <View style={styles.reliabilityStatusDot} />
          <Ionicons name="shield-checkmark" size={14} color="#a9dfca" />
          <Text style={styles.reliabilityStatusText}>
            {language === 'en'
              ? 'Alarms & 3-Min Repeats Fully Protected'
              : 'Alarmlar & 3 Dk Tekrarlar Tam Korumalı'}
          </Text>
        </View>
        <View style={styles.reliabilityStatusAction}>
          <Text style={styles.reliabilityStatusActionText}>
            {language === 'en' ? 'Battery / Permissions' : 'Pil / İzinler'}
          </Text>
          <Ionicons name="chevron-forward" size={12} color="#a9dfca" />
        </View>
      </TouchableOpacity>

      {/* Next Dose Hero Carousel */}
      {carouselSlots.length > 0 ? (
        <TodayCarousel
          carouselSlots={carouselSlots}
          heroCarouselIndex={heroCarouselIndex}
          setHeroCarouselIndex={setHeroCarouselIndex}
          heroCarouselRef={heroCarouselRef}
          takeSlot={takeSlot}
          snoozeDose={snoozeDose}
          skipSlot={skipSlot}
          triggerHaptic={triggerHaptic}
          today={today}
          snoozeMinutes={snoozeMinutes}
          language={language}
          t={t}
          getSlotTimingText={getSlotTimingText}
          getMealLabel={getMealLabel}
          getFormLabel={getFormLabel}
          getOverdueGuidance={getOverdueGuidance}
          formatStock={formatStock}
          CAROUSEL_CARD_WIDTH={CAROUSEL_CARD_WIDTH}
          CAROUSEL_SPACING={CAROUSEL_SPACING}
        />
      ) : todaySlots.length > 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle" size={54} color="#a9dfca" />
          <Text style={styles.emptyCardTitle}>{t.allDone}</Text>
          <Text style={styles.emptyCardSub}>
            {language === 'en'
              ? `${takenSlots.length} doses taken, no pending doses.`
              : `${takenSlots.length} doz alındı, bekleyen doz yok.`}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="medical-outline" size={54} color="#a9dfca" />
          <Text style={styles.emptyCardTitle}>{t.noMedsTodayTitle}</Text>
          <Text style={styles.emptyCardSub}>{t.noMedsTodayDesc}</Text>
          <TouchableOpacity style={[styles.takeBtn, { marginTop: 18 }]} onPress={() => openEditor()}>
            <Ionicons name="add" size={24} color="#092326" />
            <Text style={styles.takeBtnText}>{t.addFirstMedicine}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Off-cycle section */}
      {offCycleDoses.length > 0 && (
        <View style={styles.offCycleBox}>
          <View style={styles.offCycleHeader}>
            <Ionicons name="sync" size={16} color="#a9dfca" />
            <Text style={styles.offCycleHeaderText}>
              {language === 'en'
                ? `Not Scheduled Today (${offCycleDoses.length} Meds)`
                : `Bugün Planlanmayanlar (${offCycleDoses.length} İlaç)`}
            </Text>
          </View>
          {offCycleDoses.map((d) => {
            const info = getCycleInfo(d, today, language);
            return (
              <View key={d.id} style={styles.offCycleItem}>
                <View>
                  <Text style={styles.offCycleItemName}>{d.name}</Text>
                  <Text style={styles.offCycleItemSub}>
                    {getDurationInfo(d, today, language).hasStarted
                      ? info.phaseLabel
                      : language === 'en'
                      ? 'Not Started Yet'
                      : 'Henüz Başlamadı'}{' '}
                    · {language === 'en' ? 'No dose today' : 'Bugün doz yok'}
                  </Text>
                </View>
                <View style={styles.offBadge}>
                  <Text style={styles.offBadgeText}>{language === 'en' ? 'Off Day' : 'Beklemede'}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Completed treatment section */}
      {completedDoses.length > 0 && (
        <View style={styles.completedBox}>
          <View style={styles.completedHeader}>
            <Ionicons name="checkmark-done-circle" size={16} color="#34d399" />
            <Text style={styles.completedHeaderText}>
              {language === 'en'
                ? `Completed Treatments (${completedDoses.length} Meds)`
                : `Tedavisi Tamamlananlar (${completedDoses.length} İlaç)`}
            </Text>
          </View>
          {completedDoses.map((d) => (
            <View key={d.id} style={styles.completedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.completedItemName}>{d.name}</Text>
                <Text style={styles.completedItemSub}>
                  {language === 'en'
                    ? `${d.durationDays}-Day Treatment Completed`
                    : `${d.durationDays} Günlük Tedavi Tamamlandı`}{' '}
                  · {d.startDate} - {d.endDate}
                </Text>
              </View>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>{language === 'en' ? 'Completed' : 'Tamamlandı'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Remaining doses */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t.restOfDay}</Text>
      </View>
      {restOfDaySlots.length > 0 ? (
        restOfDaySlots.map((slot) => (
          <View key={slot.slotId} style={styles.doseRow}>
            <Text style={styles.doseRowTime}>{slot.time}</Text>
            <View style={styles.doseRowMain}>
              <Text style={styles.doseRowName}>{slot.dose.name}</Text>
              <Text style={styles.doseRowSub}>
                {slot.todayAmount} · {getMealLabel(slot.dose.mealCondition)}
                {slot.dose.frequencyType && slot.dose.frequencyType !== 'everyday' ? ` · ${slot.cycleInfo.phaseLabel}` : ''}
                {!slot.durationInfo.isContinuous ? ` · ${slot.durationInfo.badgeText}` : ''}
                {slot.dose.instructions ? ` · ${slot.dose.instructions}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.quickTakeBtn} onPress={() => takeSlot(slot)}>
              <Ionicons name="checkmark" size={18} color="#a9dfca" />
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <Text style={styles.quietEmpty}>
          {language === 'en' ? 'No other scheduled doses.' : 'Başka planlı doz bulunmuyor.'}
        </Text>
      )}

      {/* Taken doses toggle */}
      {takenSlots.length > 0 && (
        <TouchableOpacity
          style={styles.takenToggle}
          onPress={() => {
            triggerHaptic();
            setExpandedTaken((prev) => !prev);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={expandedTaken ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color="#adb3bf"
          />
          <Text style={styles.takenToggleText}>
            {language === 'en'
              ? `Taken Doses (${takenSlots.length})`
              : `Alınan Dozlar (${takenSlots.length})`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Taken doses list */}
      {expandedTaken && takenSlots.length > 0 && (
        <View style={styles.takenList}>
          {takenSlots.map((slot) => (
            <View key={slot.slotId} style={styles.doseRow}>
              <Text style={[styles.doseRowTime, { color: '#627282' }]}>{slot.time}</Text>
              <View style={styles.doseRowMain}>
                <Text style={[styles.doseRowName, { color: '#8899a8', textDecorationLine: 'line-through' }]}>
                  {slot.dose.name}
                </Text>
                <Text style={styles.doseRowSub}>
                  {slot.todayAmount} · {getMealLabel(slot.dose.mealCondition)} · {language === 'en' ? 'Taken' : 'Alındı'}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#a9dfca" />
            </View>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  reliabilityStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d2422',
    borderWidth: 1,
    borderColor: '#194c44',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  reliabilityStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  reliabilityStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  reliabilityStatusText: {
    color: '#a9dfca',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  reliabilityStatusAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 6,
  },
  reliabilityStatusActionText: {
    color: '#a9dfca',
    fontSize: 10.5,
    fontWeight: '600',
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
  takeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#a9dfca',
    width: '100%',
    height: 40,
    borderRadius: 10,
  },
  takeBtnText: {
    color: '#092326',
    fontSize: 15,
    fontWeight: '700',
  },
  offCycleBox: {
    backgroundColor: '#111e2b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#233446',
    marginVertical: 12,
  },
  offCycleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  offCycleHeaderText: {
    color: '#a9dfca',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  offCycleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#162738',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  offCycleItemName: {
    color: '#f5f3f0',
    fontSize: 14,
    fontWeight: '600',
  },
  offCycleItemSub: {
    color: '#adb3bf',
    fontSize: 11,
    marginTop: 2,
  },
  offBadge: {
    backgroundColor: '#23374a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  offBadgeText: {
    color: '#adb3bf',
    fontSize: 11,
    fontWeight: '600',
  },
  completedBox: {
    backgroundColor: '#10221c',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#224c3d',
    marginTop: 14,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  completedHeaderText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#17362b',
  },
  completedItemName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  completedItemSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  completedBadge: {
    backgroundColor: '#16382c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#23313f',
  },
  sectionTitle: {
    color: '#adb3bf',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2736',
    gap: 12,
  },
  doseRowTime: {
    color: '#f5f3f0',
    fontSize: 16,
    fontWeight: '600',
    width: 50,
  },
  doseRowMain: {
    flex: 1,
  },
  doseRowName: {
    color: '#f5f3f0',
    fontSize: 15,
    fontWeight: '600',
  },
  doseRowSub: {
    color: '#adb3bf',
    fontSize: 12,
    marginTop: 2,
  },
  quickTakeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#234842',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quietEmpty: {
    color: '#adb3bf',
    fontSize: 13,
    paddingVertical: 12,
  },
  takenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
  },
  takenToggleText: {
    color: '#adb3bf',
    fontSize: 14,
    flex: 1,
  },
  takenList: {
    backgroundColor: '#101d29',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
});
