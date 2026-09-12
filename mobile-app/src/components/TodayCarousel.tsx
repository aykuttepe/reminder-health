import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Dose,
  ScheduledSlot,
  MealCondition,
  MedicineForm,
} from '../medicationPlan';
import { Translations } from '../i18n/translations';

export interface TodayCarouselProps {
  carouselSlots: ScheduledSlot[];
  heroCarouselIndex: number;
  setHeroCarouselIndex: (idx: number) => void;
  heroCarouselRef: React.RefObject<ScrollView | null>;
  takeSlot: (slot: ScheduledSlot) => void;
  snoozeDose: (dose: Dose, time: string, today: string, minutes: number) => void;
  skipSlot: (slot: ScheduledSlot) => void;
  triggerHaptic: () => void;
  today: string;
  snoozeMinutes: number;
  language: 'tr' | 'en';
  t: Translations;
  getSlotTimingText: (timeStr: string) => string;
  getMealLabel: (cond?: MealCondition) => string;
  getFormLabel: (form?: MedicineForm) => string;
  getOverdueGuidance: (slot: ScheduledSlot) => { type: string; icon: string; title: string; message: string } | null;
  formatStock: (stock?: number) => string;
  CAROUSEL_CARD_WIDTH: number;
  CAROUSEL_SPACING: number;
}

export const TodayCarousel: React.FC<TodayCarouselProps> = ({
  carouselSlots,
  heroCarouselIndex,
  setHeroCarouselIndex,
  heroCarouselRef,
  takeSlot,
  snoozeDose,
  skipSlot,
  triggerHaptic,
  today,
  snoozeMinutes,
  language,
  t,
  getSlotTimingText,
  getMealLabel,
  getFormLabel,
  getOverdueGuidance,
  formatStock,
  CAROUSEL_CARD_WIDTH,
  CAROUSEL_SPACING,
}) => {
  if (carouselSlots.length === 0) return null;

  const handleTakeWithAutoAdvance = (slot: ScheduledSlot, currentIndex: number) => {
    takeSlot(slot);
    // Auto-advance to the next card if more than 1 medication is in the deck
    if (carouselSlots.length > 1) {
      const nextIdx = currentIndex < carouselSlots.length - 1 ? currentIndex : Math.max(0, currentIndex - 1);
      setHeroCarouselIndex(nextIdx);
      setTimeout(() => {
        heroCarouselRef.current?.scrollTo({
          x: nextIdx * (CAROUSEL_CARD_WIDTH + CAROUSEL_SPACING),
          animated: true,
        });
      }, 150);
    }
  };

  return (
    <View style={styles.carouselContainer}>
      {/* Multi-med Session Header & Pagination Dots */}
      {carouselSlots.length > 1 && (
        <View style={styles.carouselHeaderRow}>
          <View style={styles.carouselSessionBadge}>
            <Ionicons name="layers-outline" size={12} color="#a9dfca" />
            <Text style={styles.carouselSessionBadgeText}>
              {language === 'en'
                ? `${carouselSlots.length} Pending Meds`
                : `Bugünün Dozları (${carouselSlots.length} İlaç)`}
            </Text>
          </View>
          <View style={styles.carouselDotsRow}>
            {carouselSlots.map((_, dotIdx) => (
              <TouchableOpacity
                key={dotIdx}
                onPress={() => {
                  heroCarouselRef.current?.scrollTo({
                    x: dotIdx * (CAROUSEL_CARD_WIDTH + CAROUSEL_SPACING),
                    animated: true,
                  });
                  setHeroCarouselIndex(dotIdx);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                style={[
                  styles.carouselDot,
                  dotIdx === Math.min(heroCarouselIndex, carouselSlots.length - 1) && styles.carouselDotActive,
                ]}
              />
            ))}
            <Text style={styles.carouselCounterText}>
              {Math.min(heroCarouselIndex, carouselSlots.length - 1) + 1}/{carouselSlots.length}
            </Text>
          </View>
        </View>
      )}

      {/* Horizontal Scrollable Cards */}
      <ScrollView
        ref={heroCarouselRef}
        horizontal
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_SPACING}
        decelerationRate="fast"
        snapToAlignment="start"
        contentContainerStyle={[
          styles.carouselScrollContent,
          carouselSlots.length === 1 && { width: '100%' },
        ]}
        onMomentumScrollEnd={(e) => {
          const offset = e.nativeEvent.contentOffset.x;
          const newIdx = Math.round(offset / (CAROUSEL_CARD_WIDTH + CAROUSEL_SPACING));
          setHeroCarouselIndex(newIdx);
        }}
      >
        {carouselSlots.map((slot, idx) => {
          const isOverdue = (() => {
            const [h, m] = slot.time.split(':').map(Number);
            const now = new Date();
            const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
            return target.getTime() - now.getTime() < -60000;
          })();

          return (
            <View
              key={slot.slotId}
              style={[
                styles.heroCarouselCard,
                {
                  width: carouselSlots.length > 1 ? CAROUSEL_CARD_WIDTH : '100%',
                  marginRight: carouselSlots.length > 1 ? (idx === carouselSlots.length - 1 ? 0 : CAROUSEL_SPACING) : 0,
                },
              ]}
            >
              {/* Top Card Info Row */}
              <View style={styles.heroTopRow}>
                <View style={[styles.timingBadge, isOverdue && styles.timingBadgeOverdue]}>
                  <Ionicons
                    name={isOverdue ? 'alert-circle' : 'time-outline'}
                    size={10}
                    color={isOverdue ? '#f0b484' : '#a9dfca'}
                  />
                  <Text style={[styles.timingBadgeText, isOverdue && styles.timingBadgeTextOverdue]}>
                    {getSlotTimingText(slot.time)}
                  </Text>
                </View>
                {carouselSlots.length > 1 && (
                  <View style={styles.cardPageBadge}>
                    <Text style={styles.cardPageBadgeText}>
                      {idx + 1} / {carouselSlots.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Time & Name */}
              <Text style={styles.heroTime}>{slot.time}</Text>
              <Text style={styles.heroName} numberOfLines={2}>
                {slot.dose.name}
              </Text>

              {/* Form & Pill Graphic Box */}
              <View style={styles.heroVisualPillBox}>
                <MaterialCommunityIcons
                  name={
                    slot.dose.form === 'kapsul'
                      ? 'pill'
                      : slot.dose.form === 'damla'
                      ? 'eyedropper'
                      : slot.dose.form === 'surup'
                      ? 'bottle-tonic-plus'
                      : 'pill'
                  }
                  size={15}
                  color="#a9dfca"
                />
                <Text style={styles.heroVisualFormText}>
                  {getFormLabel(slot.dose.form)} · {slot.todayAmount}
                </Text>
              </View>

              {/* Chips Row: Meal, Cycle, Duration, Stock */}
              <View style={styles.chipsRow}>
                <View style={styles.chipMeal}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={10} color="#a9dfca" />
                  <Text style={styles.chipMealText}>{getMealLabel(slot.dose.mealCondition)}</Text>
                </View>
                {slot.dose.frequencyType && slot.dose.frequencyType !== 'everyday' && (
                  <View style={styles.chipCycle}>
                    <Ionicons name="sync" size={10} color="#a9dfca" />
                    <Text style={styles.chipCycleText}>{slot.cycleInfo.phaseLabel}</Text>
                  </View>
                )}
                {!slot.durationInfo.isContinuous && (
                  <View style={[styles.chipDuration, slot.durationInfo.isExpired && styles.chipDurationExpired]}>
                    <Ionicons name="hourglass-outline" size={10} color="#a9dfca" />
                    <Text style={styles.chipDurationText}>{slot.durationInfo.badgeText}</Text>
                  </View>
                )}
                {slot.dose.stock !== undefined && (
                  <View style={[styles.chipStock, slot.dose.stock <= (slot.dose.stockThreshold ?? 5) && styles.chipStockLow]}>
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={10}
                      color={slot.dose.stock <= (slot.dose.stockThreshold ?? 5) ? '#f0b484' : '#adb3bf'}
                    />
                    <Text style={[styles.chipStockText, slot.dose.stock <= (slot.dose.stockThreshold ?? 5) && styles.chipStockLowText]}>
                      {slot.dose.stock <= (slot.dose.stockThreshold ?? 5)
                        ? (language === 'en' ? `Low: ${formatStock(slot.dose.stock)}` : `Kritik: ${formatStock(slot.dose.stock)}`)
                        : `${formatStock(slot.dose.stock)} ${language === 'en' ? 'units' : 'adet'}`}
                    </Text>
                  </View>
                )}
              </View>

              {/* User Instruction Note if exists */}
              {Boolean(slot.dose.instructions) && (
                <Text style={styles.heroInstructionText} numberOfLines={1}>
                  💬 {slot.dose.instructions}
                </Text>
              )}

              {/* Smart Overdue & Meal Guidance Box */}
              {(() => {
                const guidance = getOverdueGuidance(slot);
                if (!guidance) return null;
                return (
                  <View
                    style={[
                      styles.guidanceBox,
                      guidance.type === 'double_dose_warning' ? styles.guidanceBoxCritical : styles.guidanceBoxWarning,
                    ]}
                  >
                    <View style={styles.guidanceHeader}>
                      <Ionicons
                        name={guidance.icon as any}
                        size={11}
                        color={guidance.type === 'double_dose_warning' ? '#ff7675' : '#f0b484'}
                      />
                      <Text
                        style={[
                          styles.guidanceTitle,
                          guidance.type === 'double_dose_warning' ? styles.guidanceTitleCritical : styles.guidanceTitleWarning,
                        ]}
                      >
                        {guidance.title}
                      </Text>
                    </View>
                    <Text style={styles.guidanceMessage} numberOfLines={2}>
                      {guidance.message}
                    </Text>
                  </View>
                );
              })()}

              {/* Primary Action Button with Auto-Advance */}
              <TouchableOpacity style={styles.takeBtn} onPress={() => handleTakeWithAutoAdvance(slot, idx)}>
                <Ionicons name="checkmark" size={18} color="#092326" />
                <Text style={styles.takeBtnText}>
                  {isOverdue ? (language === 'en' ? 'Take Now (Late)' : 'Şimdi Al (Geç)') : t.take}
                </Text>
              </TouchableOpacity>

              {/* Secondary Actions */}
              <View style={styles.heroSecondaryActions}>
                <TouchableOpacity
                  style={styles.heroSecBtn}
                  onPress={() => void snoozeDose(slot.dose, slot.time, today, snoozeMinutes)}
                >
                  <Ionicons name="alarm-outline" size={13} color="#adb3bf" />
                  <Text style={styles.heroSecBtnText}>{t.snooze}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroSecBtn} onPress={() => skipSlot(slot)}>
                  <Ionicons name="close-circle-outline" size={13} color="#adb3bf" />
                  <Text style={styles.heroSecBtnText}>
                    {isOverdue ? (language === 'en' ? 'Skip Dose' : 'Dozu Atla') : t.skip}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bulk-take button for same-time session */}
      {(() => {
        const activeSlot = carouselSlots[Math.min(heroCarouselIndex, carouselSlots.length - 1)];
        if (!activeSlot) return null;
        const sameTimeSlots = carouselSlots.filter((s) => s.time === activeSlot.time);
        if (sameTimeSlots.length <= 1) return null;
        return (
          <TouchableOpacity
            style={styles.takeAllSessionBtn}
            onPress={() => {
              triggerHaptic();
              sameTimeSlots.forEach((s) => takeSlot(s));
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={16} color="#081624" />
            <Text style={styles.takeAllSessionBtnText}>
              {language === 'en'
                ? `Take ${sameTimeSlots.length} Meds at ${activeSlot.time}`
                : `Bu Saatteki (${activeSlot.time}) ${sameTimeSlots.length} İlacı Birlikte Al`}
            </Text>
          </TouchableOpacity>
        );
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    marginVertical: 6,
  },
  carouselHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  carouselSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#132832',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1c4542',
  },
  carouselSessionBadgeText: {
    color: '#a9dfca',
    fontSize: 11,
    fontWeight: '700',
  },
  carouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#23384c',
  },
  carouselDotActive: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a9dfca',
  },
  carouselCounterText: {
    color: '#adb3bf',
    fontSize: 10.5,
    fontWeight: '600',
    marginLeft: 3,
  },
  carouselScrollContent: {
    paddingVertical: 2,
  },
  heroCarouselCard: {
    backgroundColor: '#152332',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#20354b',
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 2,
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#142d2a',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#234842',
  },
  timingBadgeText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '700',
  },
  timingBadgeOverdue: {
    backgroundColor: '#332214',
    borderColor: '#5c3e24',
  },
  timingBadgeTextOverdue: {
    color: '#f0b484',
  },
  cardPageBadge: {
    backgroundColor: '#1e3347',
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  cardPageBadgeText: {
    color: '#adb3bf',
    fontSize: 10,
    fontWeight: '600',
  },
  heroTime: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f5f3f0',
    marginVertical: 1,
    letterSpacing: -0.5,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f5f3f0',
    textAlign: 'center',
    lineHeight: 20,
    width: '100%',
  },
  heroVisualPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#0f1c29',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    width: '100%',
    marginVertical: 3,
    borderWidth: 1,
    borderColor: '#1c2e42',
  },
  heroVisualFormText: {
    color: '#f5f3f0',
    fontSize: 11,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginVertical: 3,
    width: '100%',
  },
  chipMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#142d2a',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#234842',
  },
  chipMealText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '600',
  },
  chipCycle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#143532',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
  },
  chipCycleText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '600',
  },
  chipDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#13332d',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#276156',
  },
  chipDurationExpired: {
    backgroundColor: '#202832',
    borderColor: '#334155',
  },
  chipDurationText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '700',
  },
  chipStock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#1a2938',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 6,
  },
  chipStockText: {
    color: '#adb3bf',
    fontSize: 10,
    fontWeight: '500',
  },
  chipStockLow: {
    backgroundColor: '#332214',
    borderColor: '#5c3e24',
    borderWidth: 1,
  },
  chipStockLowText: {
    color: '#f0b484',
    fontWeight: '700',
  },
  heroInstructionText: {
    color: '#a9dfca',
    fontSize: 10.5,
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    marginBottom: 3,
  },
  takeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#a9dfca',
    width: '100%',
    height: 38,
    borderRadius: 10,
  },
  takeBtnText: {
    color: '#092326',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSecondaryActions: {
    flexDirection: 'row',
    gap: 5,
    width: '100%',
    marginTop: 5,
  },
  heroSecBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3.5,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a4655',
  },
  heroSecBtnText: {
    color: '#adb3bf',
    fontSize: 11,
    fontWeight: '500',
  },
  takeAllSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#a9dfca',
    borderRadius: 10,
    height: 36,
    marginTop: 6,
  },
  takeAllSessionBtnText: {
    color: '#081624',
    fontSize: 13,
    fontWeight: '700',
  },
  guidanceBox: {
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 3,
    borderWidth: 1,
  },
  guidanceBoxWarning: {
    backgroundColor: '#261b11',
    borderColor: '#54361e',
  },
  guidanceBoxCritical: {
    backgroundColor: '#321414',
    borderColor: '#692525',
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  guidanceTitle: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  guidanceTitleWarning: {
    color: '#f0b484',
  },
  guidanceTitleCritical: {
    color: '#ff7675',
  },
  guidanceMessage: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 13,
    width: '100%',
  },
});
