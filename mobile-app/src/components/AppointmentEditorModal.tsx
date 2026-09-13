import React, { useState, useEffect } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppointmentItem } from '../medicationPlan';
import { formatLocalizedDate, toDateKey } from './CalendarModal';
import { useResponsive } from '../useResponsive';

const POPULAR_SPECIALTIES_TR = [
  'Dahiliye',
  'Göz',
  'Kardiyoloji',
  'Nöroloji',
  'KBB',
  'Ortopedi',
  'Endokrinoloji',
  'Cildiye',
  'Genel Cerrahi',
  'Göğüs',
  'Üroloji',
  'Diş',
];

const POPULAR_SPECIALTIES_EN = [
  'Internal Med',
  'Ophthalmology',
  'Cardiology',
  'Neurology',
  'ENT',
  'Orthopedics',
  'Endocrinology',
  'Dermatology',
  'General Surgery',
  'Pulmonology',
  'Urology',
  'Dental',
];

const TIME_PRESETS = ['08:30', '09:00', '10:30', '11:00', '13:00', '14:30', '15:30', '16:00'];
const BLOOD_TIME_PRESETS = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];

interface AppointmentEditorModalProps {
  visible: boolean;
  appointment: AppointmentItem | null;
  onClose: () => void;
  onSave: (saved: AppointmentItem) => void;
  onDelete?: (id: string) => void;
  onOpenCalendar?: (target: 'appointmentDate' | 'appointmentBloodTestDate', title: string) => void;
  externalSelectedDate?: { target: 'appointmentDate' | 'appointmentBloodTestDate'; date: string } | null;
  lang?: 'tr' | 'en';
}

export const AppointmentEditorModal: React.FC<AppointmentEditorModalProps> = ({
  visible,
  appointment,
  onClose,
  onSave,
  onDelete,
  onOpenCalendar,
  externalSelectedDate,
  lang = 'tr',
}) => {
  const { isTablet, modalMaxWidth } = useResponsive();
  const isEn = lang === 'en';
  const todayStr = toDateKey(new Date());

  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('Dahiliye');
  const [hospital, setHospital] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('13:00');
  const [leadOptions, setLeadOptions] = useState<string[]>(['1d', '0d']);
  const [notes, setNotes] = useState('');

  // Integrated Blood Test State
  const [hasBloodTest, setHasBloodTest] = useState(false);
  const [bloodTestDate, setBloodTestDate] = useState('');
  const [bloodTestTime, setBloodTestTime] = useState('08:30');
  const [bloodTestFasting, setBloodTestFasting] = useState(true);
  const [bloodTestNotes, setBloodTestNotes] = useState('');

  // Hydrate form when appointment changes or modal opens
  useEffect(() => {
    if (visible) {
      if (appointment) {
        setDoctorName(appointment.doctorName || '');
        setSpecialty(appointment.specialty || (isEn ? 'Internal Med' : 'Dahiliye'));
        setHospital(appointment.hospital || '');
        setPhone(appointment.phone || '');
        setDate(appointment.date || '');
        setTime(appointment.time === '09:00' ? '13:00' : (appointment.time || '13:00'));
        setLeadOptions(Array.isArray(appointment.leadOptions) ? appointment.leadOptions : ['1d', '0d']);
        setNotes(appointment.notes || '');
        setHasBloodTest(!!appointment.hasBloodTest);
        setBloodTestDate(appointment.bloodTestDate || '');
        setBloodTestTime(appointment.bloodTestTime || '08:30');
        setBloodTestFasting(appointment.bloodTestFasting !== undefined ? appointment.bloodTestFasting : true);
        setBloodTestNotes(appointment.bloodTestNotes || '');
      } else {
        // Defaults for new appointment
        setDoctorName('');
        setSpecialty(isEn ? 'Internal Med' : 'Dahiliye');
        setHospital('');
        setPhone('');
        setDate('');
        setTime('13:00');
        setLeadOptions(['1d', '0d']);
        setNotes('');
        setHasBloodTest(false);
        setBloodTestDate('');
        setBloodTestTime('08:30');
        setBloodTestFasting(true);
        setBloodTestNotes('');
      }
    }
  }, [visible, appointment, isEn]);

  // Handle external calendar selection response
  useEffect(() => {
    if (externalSelectedDate && visible) {
      if (externalSelectedDate.target === 'appointmentDate') {
        setDate(externalSelectedDate.date);
        // If blood test is active and has no date, suggest 3 days before
        if (hasBloodTest && !bloodTestDate) {
          const parts = externalSelectedDate.date.split('-').map(Number);
          const d = new Date(parts[0], parts[1] - 1, parts[2] - 3);
          setBloodTestDate(toDateKey(d));
        }
      } else if (externalSelectedDate.target === 'appointmentBloodTestDate') {
        setBloodTestDate(externalSelectedDate.date);
      }
    }
  }, [externalSelectedDate, visible, hasBloodTest, bloodTestDate]);

  const handleToggleBloodTest = (val: boolean) => {
    setHasBloodTest(val);
    if (val && !bloodTestDate) {
      if (date) {
        // Auto default to 3 days before appointment
        const parts = date.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2] - 3);
        setBloodTestDate(toDateKey(d));
      } else {
        setBloodTestDate(todayStr);
      }
    }
  };

  const handleSetRelativeDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const newDateStr = toDateKey(d);
    setDate(newDateStr);
    if (hasBloodTest) {
      const bDate = new Date(d);
      bDate.setDate(bDate.getDate() - 3);
      setBloodTestDate(toDateKey(bDate));
    }
  };

  const handleSetRelativeBloodDate = (daysBeforeAppt: number) => {
    if (!date) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      setBloodTestDate(toDateKey(d));
      return;
    }
    const parts = date.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] - daysBeforeAppt);
    setBloodTestDate(toDateKey(d));
  };

  const handleSave = () => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert(
        isEn ? 'Appointment Date Required' : 'Randevu Tarihi Gerekli',
        isEn ? 'Please select an appointment date.' : 'Lütfen randevu tarihini seçiniz.'
      );
      return;
    }

    if (hasBloodTest && (!bloodTestDate || !/^\d{4}-\d{2}-\d{2}$/.test(bloodTestDate))) {
      Alert.alert(
        isEn ? 'Lab Test Date Required' : 'Tahlil Tarihi Gerekli',
        isEn ? 'Please select a date for the fasting lab test.' : 'Lütfen kan tahlili tarihini seçiniz veya tahlil seçeneğini kapatınız.'
      );
      return;
    }

    const savedItem: AppointmentItem = {
      id: appointment?.id || `appt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      doctorName: doctorName.trim(),
      specialty: specialty.trim(),
      hospital: hospital.trim(),
      phone: phone.trim() || undefined,
      date,
      time: time || '13:00',
      leadOptions: leadOptions.length > 0 ? leadOptions : ['1d', '0d'],
      hasBloodTest,
      bloodTestDate: hasBloodTest ? bloodTestDate : undefined,
      bloodTestTime: hasBloodTest ? (bloodTestTime || '08:30') : undefined,
      bloodTestFasting: hasBloodTest ? bloodTestFasting : undefined,
      bloodTestNotes: hasBloodTest ? bloodTestNotes.trim() : undefined,
      notes: notes.trim() || undefined,
      completed: appointment?.completed || false,
      createdAt: appointment?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(savedItem);
  };

  const specialtiesList = isEn ? POPULAR_SPECIALTIES_EN : POPULAR_SPECIALTIES_TR;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, isTablet && { maxWidth: modalMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color="#f5f3f0" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {appointment ? (isEn ? 'Edit Appointment' : 'Randevuyu Düzenle') : (isEn ? 'New Appointment' : 'Yeni Randevu Ekle')}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerSaveBtn}>
            <Text style={styles.headerSaveBtnText}>{isEn ? 'Save' : 'Kaydet'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isTablet && { maxWidth: modalMaxWidth, alignSelf: 'center', width: '100%' }]}>
          {/* Branş / Uzmanlık */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{isEn ? 'Medical Specialty' : 'Tıbbi Branş / Uzmanlık'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specialtiesScroll}>
              {specialtiesList.map(s => {
                const isSelected = specialty === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.specialtyChip, isSelected && styles.specialtyChipActive]}
                    onPress={() => setSpecialty(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.specialtyChipText, isSelected && styles.specialtyChipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.inputBox}>
              <Ionicons name="fitness-outline" size={18} color="#a9dfca" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={specialty}
                onChangeText={setSpecialty}
                placeholder={isEn ? 'e.g. Ophthalmology, Internal Med' : 'Örn. Göz Hastalıkları, Dahiliye'}
                placeholderTextColor="#5c6e80"
              />
            </View>
          </View>

          {/* Doktor Adı */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{isEn ? 'Doctor Name' : 'Doktor Adı'}</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={18} color="#a9dfca" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder={isEn ? 'e.g. Dr. Jane Smith' : 'Örn. Uzm. Dr. Ahmet Yılmaz'}
                placeholderTextColor="#5c6e80"
              />
            </View>
          </View>

          {/* Hastane / Klinik */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{isEn ? 'Hospital / Clinic' : 'Hastane / Klinik'}</Text>
            <View style={styles.inputBox}>
              <Ionicons name="business-outline" size={18} color="#a9dfca" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={hospital}
                onChangeText={setHospital}
                placeholder={isEn ? 'e.g. City Hospital' : 'Örn. Şehir Hastanesi, Acıbadem'}
                placeholderTextColor="#5c6e80"
              />
            </View>
          </View>

          {/* İletişim Telefonu */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{isEn ? 'Phone (Optional)' : 'Randevu / Doktor Telefonu (İsteğe Bağlı)'}</Text>
            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={18} color="#a9dfca" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="0555 000 0000"
                placeholderTextColor="#5c6e80"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Randevu Tarihi */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{isEn ? 'Appointment Date *' : 'Randevu Tarihi *'}</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => onOpenCalendar?.('appointmentDate', isEn ? 'Select Appointment Date' : 'Randevu Tarihi Seçin')}
              activeOpacity={0.8}
            >
              <View style={styles.datePickerLeft}>
                <Ionicons name="calendar" size={20} color="#a9dfca" />
                <Text style={date ? styles.datePickerValueText : styles.datePickerPlaceholderText}>
                  {date ? formatLocalizedDate(date, lang) : (isEn ? 'Tap to choose date' : 'Tarih seçmek için dokunun')}
                </Text>
              </View>
              <View style={styles.datePickerBadge}>
                <Text style={styles.datePickerBadgeText}>{isEn ? 'Choose' : 'Seç'}</Text>
                <Ionicons name="chevron-forward" size={13} color="#a9dfca" />
              </View>
            </TouchableOpacity>

            {/* Hızlı Tarih Butonları */}
            <View style={styles.quickDateRow}>
              <TouchableOpacity style={styles.quickDateChip} onPress={() => handleSetRelativeDate(1)}>
                <Text style={styles.quickDateChipText}>{isEn ? 'Tomorrow' : 'Yarın'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDateChip} onPress={() => handleSetRelativeDate(7)}>
                <Text style={styles.quickDateChipText}>{isEn ? 'In 1 Week' : '1 Hafta Sonra'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDateChip} onPress={() => handleSetRelativeDate(30)}>
                <Text style={styles.quickDateChipText}>{isEn ? 'In 1 Month' : '1 Ay Sonra'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickDateChip} onPress={() => handleSetRelativeDate(90)}>
                <Text style={styles.quickDateChipText}>{isEn ? 'In 3 Months' : '3 Ay Sonra'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Randevu Saati */}
          <View style={styles.fieldSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.fieldLabel}>{isEn ? 'Appointment Time' : 'Randevu Saati'}</Text>
              <View style={styles.timeDisplayBadge}>
                <Ionicons name="time" size={14} color="#a9dfca" />
                <Text style={styles.timeDisplayText}>{time || '13:00'}</Text>
              </View>
            </View>
            <View style={styles.timePresetsRow}>
              {TIME_PRESETS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timePresetChip, time === t && styles.timePresetChipActive]}
                  onPress={() => setTime(t)}
                >
                  <Text style={[styles.timePresetChipText, time === t && styles.timePresetChipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Önceden Hatırlatma Seçenekleri */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{isEn ? 'Early Reminders' : 'Önceden Hatırlatma Bildirimleri'}</Text>
            <Text style={styles.fieldSub}>
              {isEn
                ? 'Device will send smart reminders leading up to your visit'
                : 'Randevudan önce cihazınıza otomatik bildirim gönderilir'}
            </Text>
            <View style={styles.leadChipsRow}>
              {[
                { id: '3d', label: isEn ? '3 Days Early' : '3 Gün Önce' },
                { id: '2d', label: isEn ? '2 Days Early' : '2 Gün Önce' },
                { id: '1d', label: isEn ? '1 Day Early' : '1 Gün Önce' },
                { id: '0d', label: isEn ? 'Appointment Morning (05:00)' : 'Randevu Günü (Sabah 05:00)' },
              ].map(opt => {
                const active = leadOptions.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.leadChip, active && styles.leadChipActive]}
                    onPress={() => {
                      if (active) {
                        setLeadOptions(leadOptions.filter(x => x !== opt.id));
                      } else {
                        setLeadOptions([...leadOptions, opt.id]);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'add-circle-outline'}
                      size={15}
                      color={active ? '#a9dfca' : '#94a3b8'}
                    />
                    <Text style={[styles.leadChipText, active && styles.leadChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ============================================================ */}
          {/* ENTEGRE KAN TAHLİLİ / TETKİK BÖLÜMÜ */}
          {/* ============================================================ */}
          <View style={styles.bloodTestCard}>
            <View style={styles.bloodTestHeaderRow}>
              <View style={styles.bloodTestHeaderLeft}>
                <View style={styles.bloodTestIconWrap}>
                  <Ionicons name="flask" size={18} color="#a78bfa" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bloodTestTitle}>
                    {isEn ? 'Fasting Blood / Lab Test' : 'Aç Karnına Kan Tahlili / Tetkik'}
                  </Text>
                  <Text style={styles.bloodTestSub}>
                    {isEn
                      ? 'Include lab prep reminder directly inside this appointment'
                      : 'Randevu öncesi tahlil uyarısını doğrudan bu randevuya bağla'}
                  </Text>
                </View>
              </View>
              <Switch
                value={hasBloodTest}
                onValueChange={handleToggleBloodTest}
                trackColor={{ true: '#a78bfa', false: '#3a4655' }}
              />
            </View>

            {hasBloodTest && (
              <View style={styles.bloodTestContent}>
                <View style={styles.bloodDivider} />

                {/* Tahlil Tarihi */}
                <Text style={styles.bloodFieldLabel}>{isEn ? 'Lab Test Date' : 'Tahlil / Kan Verme Tarihi'}</Text>
                <TouchableOpacity
                  style={styles.bloodDateBtn}
                  onPress={() => onOpenCalendar?.('appointmentBloodTestDate', isEn ? 'Select Lab Test Date' : 'Tahlil Tarihi Seçin')}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="flask-outline" size={18} color="#c4b5fd" />
                    <Text style={bloodTestDate ? styles.bloodDateText : styles.bloodPlaceholderText}>
                      {bloodTestDate ? formatLocalizedDate(bloodTestDate, lang) : (isEn ? 'Select test date' : 'Tahlil tarihi seçin')}
                    </Text>
                  </View>
                  <View style={styles.bloodChangeBadge}>
                    <Text style={styles.bloodChangeBadgeText}>{isEn ? 'Choose' : 'Seç'}</Text>
                    <Ionicons name="chevron-forward" size={12} color="#c4b5fd" />
                  </View>
                </TouchableOpacity>

                {/* Hızlı Tahlil Tarihi Seçenekleri */}
                <View style={styles.quickDateRow}>
                  <TouchableOpacity style={styles.bloodQuickChip} onPress={() => handleSetRelativeBloodDate(3)}>
                    <Text style={styles.bloodQuickChipText}>{isEn ? '3 Days Prior (Recommended)' : '3 Gün Önce (Önerilen)'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bloodQuickChip} onPress={() => handleSetRelativeBloodDate(2)}>
                    <Text style={styles.bloodQuickChipText}>{isEn ? '2 Days Prior' : '2 Gün Önce'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bloodQuickChip} onPress={() => handleSetRelativeBloodDate(0)}>
                    <Text style={styles.bloodQuickChipText}>{isEn ? 'Same Day' : 'Aynı Gün'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Tahlil Saati */}
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.bloodFieldLabel}>{isEn ? 'Test Time (Morning)' : 'Kan Verme Saati (Sabah)'}</Text>
                    <Text style={styles.bloodTimeBadgeText}>⏰ {bloodTestTime}</Text>
                  </View>
                  <View style={styles.timePresetsRow}>
                    {BLOOD_TIME_PRESETS.map(bt => (
                      <TouchableOpacity
                        key={bt}
                        style={[styles.bloodTimePresetChip, bloodTestTime === bt && styles.bloodTimePresetChipActive]}
                        onPress={() => setBloodTestTime(bt)}
                      >
                        <Text style={[styles.bloodTimePresetChipText, bloodTestTime === bt && styles.bloodTimePresetChipTextActive]}>
                          {bt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Aç Karnına Uyarısı Toggle */}
                <View style={styles.fastingToggleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: '#f5f3f0', fontSize: 13, fontWeight: '600' }}>
                      {isEn ? 'Fasting Required (8-10h)' : 'Aç Karnına Kan Verme (8-10 Saat)'}
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                      {isEn
                        ? 'Sends evening-before reminder to stop eating and morning alarm before test'
                        : 'Önceki akşam yemek yemeyi kesme ve tahlil sabahı aç gitme uyarısı gönderir'}
                    </Text>
                  </View>
                  <Switch
                    value={bloodTestFasting}
                    onValueChange={setBloodTestFasting}
                    trackColor={{ true: '#a78bfa', false: '#3a4655' }}
                  />
                </View>

                {/* Tahlil Notu */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.bloodFieldLabel}>{isEn ? 'Lab Notes / Instructions' : 'Tahlil Talimatı / Özel Not'}</Text>
                  <TextInput
                    style={styles.bloodNotesInput}
                    value={bloodTestNotes}
                    onChangeText={setBloodTestNotes}
                    placeholder={isEn ? 'e.g. Fasting blood sugar & thyroid panel, drink only water' : 'Örn. Açlık şekeri ve tiroid paneli, su dışında bir şey içilmeyecek'}
                    placeholderTextColor="#5c6e80"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Genel Randevu Notları */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>{isEn ? 'Appointment Notes / Prep' : 'Randevu Notları / Hazırlık'}</Text>
            <View style={[styles.inputBox, { height: 'auto', minHeight: 80, alignItems: 'flex-start', paddingVertical: 8 }]}>
              <Ionicons name="reader-outline" size={18} color="#a9dfca" style={[styles.inputIcon, { marginTop: 3 }]} />
              <TextInput
                style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder={isEn ? 'Questions for doctor, previous reports to bring...' : 'Doktora sorulacak sorular, yanına alınacak eski tahlil sonuçları...'}
                placeholderTextColor="#5c6e80"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Alt Butonlar */}
          <View style={styles.actionsRow}>
            {appointment && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  onDelete(appointment.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#ff8585" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{isEn ? 'Cancel' : 'Vazgeç'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={18} color="#081624" />
              <Text style={styles.saveBtnText}>
                {appointment ? (isEn ? 'Update Appointment' : 'Randevuyu Güncelle') : (isEn ? 'Save Appointment' : 'Randevuyu Kaydet')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#081624',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#172738',
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#f5f3f0',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSaveBtn: {
    backgroundColor: '#a9dfca',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerSaveBtnText: {
    color: '#081624',
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#adb3bf',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldSub: {
    color: '#8892a0',
    fontSize: 11,
    marginBottom: 8,
  },
  specialtiesScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  specialtyChip: {
    backgroundColor: '#12202e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#1e384f',
  },
  specialtyChipActive: {
    backgroundColor: '#173d34',
    borderColor: '#a9dfca',
  },
  specialtyChipText: {
    color: '#adb3bf',
    fontSize: 11,
    fontWeight: '600',
  },
  specialtyChipTextActive: {
    color: '#a9dfca',
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101d29',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#203244',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#f5f3f0',
    fontSize: 14,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#101d29',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#203244',
    paddingHorizontal: 14,
    height: 48,
  },
  datePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  datePickerValueText: {
    color: '#f5f3f0',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerPlaceholderText: {
    color: '#5c6e80',
    fontSize: 14,
  },
  datePickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(169, 223, 202, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  datePickerBadgeText: {
    color: '#a9dfca',
    fontSize: 11,
    fontWeight: '700',
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickDateChip: {
    backgroundColor: '#152535',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#243a4e',
  },
  quickDateChipText: {
    color: '#adb3bf',
    fontSize: 11,
    fontWeight: '500',
  },
  timeDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(169, 223, 202, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeDisplayText: {
    color: '#a9dfca',
    fontSize: 12,
    fontWeight: '700',
  },
  timePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  timePresetChip: {
    backgroundColor: '#101d29',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#203244',
  },
  timePresetChipActive: {
    backgroundColor: '#163832',
    borderColor: '#a9dfca',
  },
  timePresetChipText: {
    color: '#adb3bf',
    fontSize: 12,
    fontWeight: '600',
  },
  timePresetChipTextActive: {
    color: '#a9dfca',
    fontWeight: '700',
  },
  leadChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  leadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#101d29',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#203244',
  },
  leadChipActive: {
    backgroundColor: '#163832',
    borderColor: '#a9dfca',
  },
  leadChipText: {
    color: '#adb3bf',
    fontSize: 12,
    fontWeight: '500',
  },
  leadChipTextActive: {
    color: '#a9dfca',
    fontWeight: '700',
  },

  // In-Card Blood Test Section
  bloodTestCard: {
    backgroundColor: '#121829',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    padding: 14,
    marginBottom: 16,
  },
  bloodTestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bloodTestHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  bloodTestIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodTestTitle: {
    color: '#f5f3f0',
    fontSize: 14,
    fontWeight: '700',
  },
  bloodTestSub: {
    color: '#a78bfa',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  bloodTestContent: {
    marginTop: 10,
  },
  bloodDivider: {
    height: 1,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    marginVertical: 10,
  },
  bloodFieldLabel: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  bloodDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c111e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    paddingHorizontal: 12,
    height: 44,
  },
  bloodDateText: {
    color: '#f5f3f0',
    fontSize: 13,
    fontWeight: '600',
  },
  bloodPlaceholderText: {
    color: '#6b7280',
    fontSize: 13,
  },
  bloodChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bloodChangeBadgeText: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '700',
  },
  bloodQuickChip: {
    backgroundColor: '#1b1b36',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  bloodQuickChipText: {
    color: '#c4b5fd',
    fontSize: 10.5,
    fontWeight: '600',
  },
  bloodTimeBadgeText: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '700',
  },
  bloodTimePresetChip: {
    backgroundColor: '#0c111e',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  bloodTimePresetChipActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.25)',
    borderColor: '#a78bfa',
  },
  bloodTimePresetChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  bloodTimePresetChipTextActive: {
    color: '#c4b5fd',
    fontWeight: '700',
  },
  fastingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c111e',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  bloodNotesInput: {
    backgroundColor: '#0c111e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    color: '#f5f3f0',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#243a4e',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101d29',
  },
  cancelBtnText: {
    color: '#adb3bf',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#a9dfca',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#081624',
    fontSize: 14,
    fontWeight: '700',
  },
});
