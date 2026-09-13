import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES_SHORT_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_NAMES_SHORT_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_NAMES_FULL_TR = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi',
];

const DAY_NAMES_FULL_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatLocalizedDate(dateStr?: string, lang: 'tr' | 'en' = 'tr'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (lang === 'en') {
    const dayName = DAY_NAMES_FULL_EN[d.getDay()];
    const monthName = MONTH_NAMES_EN[parts[1] - 1];
    return `${parts[2]} ${monthName} ${parts[0]}, ${dayName}`;
  }
  const dayName = DAY_NAMES_FULL_TR[d.getDay()];
  const monthName = MONTH_NAMES_TR[parts[1] - 1];
  return `${parts[2]} ${monthName} ${parts[0]}, ${dayName}`;
}

export function formatTurkishDate(dateStr?: string, lang: 'tr' | 'en' = 'tr'): string {
  return formatLocalizedDate(dateStr, lang);
}

export function formatTurkishDateShort(dateStr?: string, lang: 'tr' | 'en' = 'tr'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return dateStr;
  }
  const monthName = (lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_TR)[parts[1] - 1];
  return `${parts[2]} ${monthName} ${parts[0]}`;
}

interface CalendarModalProps {
  visible: boolean;
  selectedDate?: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
  title?: string;
  lang?: 'tr' | 'en';
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  selectedDate,
  onSelect,
  onClose,
  title,
  lang = 'tr',
}) => {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600 || width >= 768;

  const isEn = lang === 'en';
  const modalTitle = title || (isEn ? 'Select Date' : 'Tarih Seçin');
  const monthNames = isEn ? MONTH_NAMES_EN : MONTH_NAMES_TR;
  const dayNamesShort = isEn ? DAY_NAMES_SHORT_EN : DAY_NAMES_SHORT_TR;
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const initialDate = selectedDate || todayKey;

  const [currentSelected, setCurrentSelected] = useState<string>(initialDate);
  const [viewYear, setViewYear] = useState<number>(() => {
    const parts = initialDate.split('-').map(Number);
    return !isNaN(parts[0]) ? parts[0] : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const parts = initialDate.split('-').map(Number);
    return !isNaN(parts[1]) ? parts[1] - 1 : new Date().getMonth();
  });

  useEffect(() => {
    if (visible) {
      const target = selectedDate || todayKey;
      setCurrentSelected(target);
      const parts = target.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setViewYear(parts[0]);
        setViewMonth(parts[1] - 1);
      }
    }
  }, [visible, selectedDate, todayKey]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleApplyPreset = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const key = toDateKey(d);
    setCurrentSelected(key);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleConfirm = () => {
    onSelect(currentSelected);
    onClose();
  };

  // Ayın günleri matrisi
  const calendarCells = useMemo(() => {
    // 1. günün haftanın hangi günü olduğu (Pazartesi=0, ..., Pazar=6)
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const startDayIndex = firstDay === 0 ? 6 : firstDay - 1;

    // Ayın kaç gün çektiği
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Önceki ayın son günleri
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      dateKey: string;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Önceki aydan taşan günler
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const key = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateKey: key,
        isToday: key === todayKey,
        isSelected: key === currentSelected,
      });
    }

    // Aktif ayın günleri
    for (let day = 1; day <= totalDays; day++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        isCurrentMonth: true,
        dateKey: key,
        isToday: key === todayKey,
        isSelected: key === currentSelected,
      });
    }

    // Sonraki aydan kalan boşlukları doldur
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const key = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        isCurrentMonth: false,
        dateKey: key,
        isToday: key === todayKey,
        isSelected: key === currentSelected,
      });
    }

    return cells;
  }, [viewYear, viewMonth, currentSelected, todayKey]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, isTablet && styles.backdropTablet]}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetContainer, isTablet && styles.sheetContainerTablet]}>
              {/* Tutamaç Barı */}
              {!isTablet && <View style={styles.dragHandle} />}

              {/* Başlık & Kapat Butonu */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <Ionicons name="calendar" size={20} color="#34d399" />
                  <Text style={styles.sheetTitle}>{modalTitle}</Text>
                </View>
                <TouchableOpacity style={styles.closeIconBtn} onPress={onClose}>
                  <Ionicons name="close" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Hızlı Seçim Butonları */}
              <View style={styles.presetsRow}>
                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    currentSelected === todayKey && styles.presetChipActive,
                  ]}
                  onPress={() => handleApplyPreset(0)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      currentSelected === todayKey && styles.presetChipTextActive,
                    ]}
                  >
                    {isEn ? 'Today' : 'Bugün'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handleApplyPreset(1)}
                >
                  <Text style={styles.presetChipText}>{isEn ? 'Tomorrow' : 'Yarın'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handleApplyPreset(7)}
                >
                  <Text style={styles.presetChipText}>{isEn ? '+1 Week' : '+1 Hafta'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handleApplyPreset(-1)}
                >
                  <Text style={styles.presetChipText}>{isEn ? 'Yesterday' : 'Dün'}</Text>
                </TouchableOpacity>
              </View>

              {/* Ay ve Yıl Navigasyonu */}
              <View style={styles.monthNavRow}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={handlePrevMonth}
                  accessibilityLabel={isEn ? 'Previous Month' : 'Önceki Ay'}
                >
                  <Ionicons name="chevron-back" size={20} color="#f5f3f0" />
                </TouchableOpacity>

                <View style={styles.monthYearBox}>
                  <Text style={styles.monthYearText}>
                    {monthNames[viewMonth]} {viewYear}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={handleNextMonth}
                  accessibilityLabel={isEn ? 'Next Month' : 'Sonraki Ay'}
                >
                  <Ionicons name="chevron-forward" size={20} color="#f5f3f0" />
                </TouchableOpacity>
              </View>

              {/* Haftanın Günleri Başlıkları */}
              <View style={styles.weekDaysRow}>
                {dayNamesShort.map((d, index) => (
                  <View key={d} style={styles.weekDayCol}>
                    <Text
                      style={[
                        styles.weekDayText,
                        (index === 5 || index === 6) && styles.weekendDayText,
                      ]}
                    >
                      {d}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Takvim Günleri Izgarası */}
              <View style={styles.gridContainer}>
                {calendarCells.map((cell, idx) => {
                  return (
                    <TouchableOpacity
                      key={`${cell.dateKey}-${idx}`}
                      style={[
                        styles.dayCell,
                        cell.isSelected && styles.dayCellSelected,
                        cell.isToday && !cell.isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => {
                        setCurrentSelected(cell.dateKey);
                        const parts = cell.dateKey.split('-').map(Number);
                        if (parts[1] - 1 !== viewMonth) {
                          setViewMonth(parts[1] - 1);
                          setViewYear(parts[0]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !cell.isCurrentMonth && styles.dayTextDimmed,
                          cell.isToday && styles.dayTextToday,
                          cell.isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Seçili Tarih Özeti Banner'ı */}
              <View style={styles.selectedBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#34d399" />
                <Text style={styles.selectedBannerText} numberOfLines={1}>
                  {formatLocalizedDate(currentSelected, lang)}
                </Text>
              </View>

              {/* Aksiyon Butonları */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>{isEn ? 'Cancel' : 'Vazgeç'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                  <Text style={styles.confirmBtnText}>{isEn ? 'Select Date' : 'Tarihi Seç'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 20, 0.75)',
    justifyContent: 'flex-end',
  },
  backdropTablet: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheetContainer: {
    backgroundColor: '#0f1c2c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e3852',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
  },
  sheetContainerTablet: {
    borderRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxWidth: 460,
    width: '100%',
    paddingBottom: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#2b4c6b',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#172e44',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f5f3f0',
  },
  closeIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#16283b',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#162a3f',
    borderWidth: 1,
    borderColor: '#244463',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: '#34d399',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  presetChipTextActive: {
    color: '#34d399',
    fontWeight: '700',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#172d42',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#244566',
  },
  monthYearBox: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#122335',
    borderWidth: 1,
    borderColor: '#1d3752',
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f5f3f0',
    letterSpacing: 0.3,
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#172a3c',
    marginBottom: 6,
  },
  weekDayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7e93a7',
    textTransform: 'uppercase',
  },
  weekendDayText: {
    color: '#94a3b8',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 10,
  },
  dayCellSelected: {
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  dayTextDimmed: {
    color: '#475e75',
    fontWeight: '400',
  },
  dayTextToday: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#0a1624',
    fontWeight: '800',
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  selectedBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a9dfca',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#16283b',
    borderWidth: 1,
    borderColor: '#24405d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#34d399',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#061320',
  },
});
