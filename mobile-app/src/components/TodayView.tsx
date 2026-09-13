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
  getCalendarDayDiff,
  type AppointmentItem,
} from '../medicationPlan';
import { Translations } from '../i18n/translations';
import { TodayCarousel } from './TodayCarousel';
import { formatLocalizedDate } from './CalendarModal';

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
  getCycleInfo: (dose: Dose, date: string, lang?: 'tr' | 'en') => CycleInfo;
  getDurationInfo: (dose: Dose, date: string, lang?: 'tr' | 'en') => DurationInfo;
  CAROUSEL_CARD_WIDTH: number;
  CAROUSEL_SPACING: number;
  appointments?: AppointmentItem[];
  onOpenAppointmentEditor?: (appt?: AppointmentItem) => void;
  doctorNextAppointment?: string;
  doctorAppointmentTime?: string;
  doctorName?: string;
  doctorHospital?: string;
  doctorSpecialty?: string;
  onNavigateDoctorProfile?: () => void;
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
  appointments,
  onOpenAppointmentEditor,
  doctorNextAppointment,
  doctorAppointmentTime,
  doctorName,
  doctorHospital,
  doctorSpecialty,
  onNavigateDoctorProfile,
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

      {/* Yaklaşan Doktor Randevusu Kartı ve Yönetimi */}
      {(() => {
        const activeAppts: AppointmentItem[] = (appointments && appointments.length > 0)
          ? appointments
              .filter(a => !a.completed && a.date)
              .sort((a, b) => (a.date + ' ' + (a.time || '13:00')).localeCompare(b.date + ' ' + (b.time || '13:00')))
          : (doctorNextAppointment ? [{
              id: 'default',
              doctorName: doctorName || '',
              specialty: doctorSpecialty || '',
              hospital: doctorHospital || '',
              date: doctorNextAppointment,
              time: doctorAppointmentTime || '13:00',
              leadOptions: ['1d', '0d'],
              hasBloodTest: false,
              createdAt: 0,
              updatedAt: 0,
            } as AppointmentItem] : []);

        const isEn = language === 'en';

        if (activeAppts.length === 0) {
          return (
            <TouchableOpacity
              style={styles.appointmentEmptyBanner}
              onPress={() => {
                triggerHaptic();
                if (onOpenAppointmentEditor) onOpenAppointmentEditor();
                else onNavigateDoctorProfile?.();
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.appointmentBannerIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color="#a9dfca" />
                </View>
                <View>
                  <Text style={{ color: '#f5f3f0', fontSize: 13, fontWeight: '600' }}>
                    {isEn ? 'No Upcoming Appointments' : 'Yaklaşan Randevu Yok'}
                  </Text>
                  <Text style={{ color: '#adb3bf', fontSize: 11, marginTop: 1 }}>
                    {isEn ? 'Tap to add doctor & lab reminders' : 'Doktor kontrol ve tahlil hatırlatıcısı ekle'}
                  </Text>
                </View>
              </View>
              <View style={styles.appointmentAddBtn}>
                <Ionicons name="add" size={14} color="#a9dfca" />
                <Text style={styles.appointmentAddBtnText}>{isEn ? 'Add' : 'Randevu Ekle'}</Text>
              </View>
            </TouchableOpacity>
          );
        }

        const primaryAppt = activeAppts[0];
        const diff = getCalendarDayDiff(today, primaryAppt.date);
        let badgeText = '';
        let badgeBg = 'rgba(52, 211, 153, 0.18)';
        let badgeColor = '#34d399';
        const timeText = primaryAppt.time || '13:00';

        if (diff === 0) {
          badgeText = isEn ? 'Today' : 'Bugün';
          badgeBg = 'rgba(251, 191, 36, 0.2)';
          badgeColor = '#fbbf24';
        } else if (diff === 1) {
          badgeText = isEn ? 'Tomorrow' : 'Yarın';
          badgeBg = 'rgba(52, 211, 153, 0.2)';
          badgeColor = '#34d399';
        } else if (diff > 1) {
          badgeText = isEn ? `in ${diff} days` : `${diff} gün kaldı`;
          badgeBg = 'rgba(56, 189, 248, 0.18)';
          badgeColor = '#38bdf8';
        } else {
          badgeText = isEn ? `${Math.abs(diff)} days ago` : `${Math.abs(diff)} gün önce`;
          badgeBg = 'rgba(148, 163, 184, 0.15)';
          badgeColor = '#94a3b8';
        }

        const docTitle = primaryAppt.doctorName && primaryAppt.doctorName.trim()
          ? primaryAppt.doctorName.trim()
          : (primaryAppt.specialty && primaryAppt.specialty.trim()
              ? `${primaryAppt.specialty.trim()} ${isEn ? 'Appointment' : 'Randevusu'}`
              : (isEn ? 'Doctor Appointment' : 'Doktor Randevusu'));

        const hospitalText = primaryAppt.hospital && primaryAppt.hospital.trim()
          ? ` • ${primaryAppt.hospital.trim()}`
          : (primaryAppt.specialty && primaryAppt.specialty.trim() && primaryAppt.doctorName
              ? ` • ${primaryAppt.specialty.trim()}`
              : '');

        return (
          <View style={{ marginBottom: 12 }}>
            <View style={styles.appointmentSectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar" size={13} color="#a9dfca" />
                <Text style={styles.appointmentSectionTitle}>
                  {isEn ? 'UPCOMING APPOINTMENTS' : 'YAKLAŞAN RANDEVULAR'}
                </Text>
                {activeAppts.length > 1 && (
                  <View style={styles.appointmentCountBadge}>
                    <Text style={styles.appointmentCountBadgeText}>{activeAppts.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.appointmentAddBtn}
                onPress={() => {
                  triggerHaptic();
                  if (onOpenAppointmentEditor) onOpenAppointmentEditor();
                  else onNavigateDoctorProfile?.();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={13} color="#a9dfca" />
                <Text style={styles.appointmentAddBtnText}>{isEn ? 'Add' : 'Randevu Ekle'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.appointmentBanner}
              onPress={() => {
                triggerHaptic();
                onNavigateDoctorProfile?.();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.appointmentTopRow}>
                <View style={styles.appointmentBannerLeft}>
                  <View style={styles.appointmentBannerIconWrap}>
                    <Ionicons name="calendar" size={18} color="#a9dfca" />
                  </View>
                  <View style={styles.appointmentBannerContent}>
                    <Text style={styles.appointmentBannerTitle} numberOfLines={1} ellipsizeMode="tail">
                      {docTitle}
                    </Text>
                    {hospitalText ? (
                      <Text style={styles.appointmentBannerSub} numberOfLines={1} ellipsizeMode="tail">
                        {hospitalText}
                      </Text>
                    ) : null}
                    <View style={styles.appointmentDateRow}>
                      <Text style={styles.appointmentBannerDate} numberOfLines={1} ellipsizeMode="tail">
                        {formatLocalizedDate(primaryAppt.date, language)}
                      </Text>
                      <View style={styles.appointmentBannerTimeBadge}>
                        <Text style={styles.appointmentBannerTimeText}>⏰ {timeText}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[styles.appointmentBannerDaysBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.appointmentBannerDaysText, { color: badgeColor }]}>{badgeText}</Text>
                  <Ionicons name="chevron-forward" size={12} color={badgeColor} style={{ marginLeft: 3 }} />
                </View>
              </View>

              {/* Randevu İçi Tahlil / Kan Verme Bilgisi */}
              {primaryAppt.hasBloodTest && primaryAppt.bloodTestDate ? (
                <View style={styles.appointmentBloodRow}>
                  <Ionicons name="flask-outline" size={13} color="#c4b5fd" />
                  <Text style={styles.appointmentBloodText} numberOfLines={1} ellipsizeMode="tail">
                    {formatLocalizedDate(primaryAppt.bloodTestDate, language)}
                    {primaryAppt.bloodTestFasting ? (isEn ? ' (Aç Karnına Tahlil)' : ' (Aç Karnına Tahlil)') : (isEn ? ' (Kan Tahlili)' : ' (Kan Tahlili)')}
                  </Text>
                  {primaryAppt.bloodTestTime ? (
                    <Text style={styles.appointmentBloodTimeText}>⏰ {primaryAppt.bloodTestTime}</Text>
                  ) : null}
                </View>
              ) : null}
            </TouchableOpacity>

            {/* Ek randevu varsa gösterge şeridi */}
            {activeAppts.length > 1 && (
              <TouchableOpacity
                style={styles.appointmentMoreChip}
                onPress={() => {
                  triggerHaptic();
                  onNavigateDoctorProfile?.();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                <Text style={styles.appointmentMoreText}>
                  {isEn
                    ? `+${activeAppts.length - 1} more: ${formatLocalizedDate(activeAppts[1].date, language)} (${activeAppts[1].specialty || activeAppts[1].doctorName || 'Doctor'})`
                    : `+${activeAppts.length - 1} randevu daha: ${formatLocalizedDate(activeAppts[1].date, language)} (${activeAppts[1].specialty || activeAppts[1].doctorName || 'Hekim'})`}
                </Text>
                <Ionicons name="chevron-forward" size={10} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        );
      })()}

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
  appointmentBanner: {
    backgroundColor: '#101d29',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(169, 223, 202, 0.25)',
  },
  appointmentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  appointmentBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  appointmentBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(169, 223, 202, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  appointmentBannerContent: {
    flex: 1,
    minWidth: 0,
  },
  appointmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appointmentBannerTitle: {
    color: '#f5f3f0',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  appointmentBannerSub: {
    color: '#a9dfca',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 2,
  },
  appointmentDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  appointmentBannerDate: {
    color: '#adb3bf',
    fontSize: 12,
    flexShrink: 1,
  },
  appointmentBannerTimeBadge: {
    backgroundColor: 'rgba(169, 223, 202, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(169, 223, 202, 0.3)',
    flexShrink: 0,
  },
  appointmentBannerTimeText: {
    color: '#a9dfca',
    fontSize: 11,
    fontWeight: '700',
  },
  appointmentBannerDaysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  appointmentBannerDaysText: {
    fontSize: 11,
    fontWeight: '700',
  },
  appointmentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  appointmentSectionTitle: {
    color: '#a9dfca',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  appointmentCountBadge: {
    backgroundColor: 'rgba(169, 223, 202, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  appointmentCountBadgeText: {
    color: '#a9dfca',
    fontSize: 10,
    fontWeight: '700',
  },
  appointmentAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(169, 223, 202, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(169, 223, 202, 0.3)',
  },
  appointmentAddBtnText: {
    color: '#a9dfca',
    fontSize: 11,
    fontWeight: '700',
  },
  appointmentBloodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 139, 250, 0.25)',
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  appointmentBloodText: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  appointmentBloodTimeText: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  appointmentMoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
  },
  appointmentMoreText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  appointmentEmptyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#101d29',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(169, 223, 202, 0.2)',
    borderStyle: 'dashed',
  },
});
