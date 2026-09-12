let notificationIds: Record<string,string> = {};
export function setNotificationIdMap(map:Record<string,string>){ notificationIds=map; }
function notificationId(value:unknown):string|number|undefined {
 if(value===undefined)return undefined;
 return notificationIds[String(value)] ?? (typeof value==='number'?value:String(value));
}
import * as Notifications from 'expo-notifications';
import { Linking, Platform, Vibration } from 'react-native';

import { localDateKey, dateFromKey, getCycleInfo, isDoseActive, slotStatus, type Dose } from './medicationPlan';

export type NotificationDose = Omit<Dose, 'status'> & { status?: Dose['status'] };

// Scheduling and cancellation must not interleave across rapid state changes.
let notificationQueue: Promise<unknown> = Promise.resolve();
function serializeNotifications<T>(operation: () => Promise<T>): Promise<T> {
  const result = notificationQueue.then(operation);
  notificationQueue = result.catch(() => undefined);
  return result;
}

export type DoseStatusChecker = (doseId: string | number, timeStr?: string, date?: string) => boolean;
let isDoseConfirmedTaken: DoseStatusChecker | null = null;

export function registerDoseStatusChecker(checker: DoseStatusChecker | null): void {
  isDoseConfirmedTaken = checker;
}

export type ActiveNotificationPayload = {
  title: string;
  body: string;
  doseId?: string | number;
  time?: string;
  date?: string;
  isRepeat?: boolean;
  repeatIndex?: number;
};

export type NotificationSoundType = 'default' | 'alarm' | 'gentle' | 'chime' | 'system_custom' | 'silent';

export interface SoundProfileOption {
  id: NotificationSoundType;
  title: string;
  description: string;
  icon: string;
  badge: string;
}

export const NOTIFICATION_CATEGORY_MED_ACTIONS = 'medication-reminder-actions';
export const ACTION_TAKEN = 'ACTION_TAKEN';
export const ACTION_SNOOZE = 'ACTION_SNOOZE';
export const ACTION_SKIP = 'ACTION_SKIP';

export const NOTIFICATION_CATEGORY_APPOINTMENT_ACTIONS = 'appointment-reminder-actions';
export const ACTION_APPT_SNOOZE_1H = 'ACTION_APPT_SNOOZE_1H';
export const ACTION_APPT_SNOOZE_3H = 'ACTION_APPT_SNOOZE_3H';
export const ACTION_APPT_DONE = 'ACTION_APPT_DONE';

export const mealLabels: Record<string, string> = {
  tok: 'Tok karnına',
  ac: 'Aç karnına',
  yemekle: 'Yemekle birlikte',
  farketmez: 'Aç/tok fark etmez',
};

export const mealLabelsEn: Record<string, string> = {
  tok: 'After meal',
  ac: 'Before meal',
  yemekle: 'With meal',
  farketmez: 'With or without food',
};

export const formLabels: Record<string, string> = {
  tablet: 'Tablet',
  kapsul: 'Kapsül',
  damla: 'Damla',
  surup: 'Şurup',
};

export const formLabelsEn: Record<string, string> = {
  tablet: 'Tablet',
  kapsul: 'Capsule',
  damla: 'Drops',
  surup: 'Syrup',
};

export const SOUND_PROFILE_OPTIONS: SoundProfileOption[] = [
  {
    id: 'default',
    title: 'Varsayılan Sistem Sesi',
    description: 'Cihazın standart sistem bildirim melodisi',
    icon: 'notifications',
    badge: 'Sistem',
  },
  {
    id: 'alarm',
    title: 'Alarm & Zil Tonu',
    description: 'Belirgin ve yüksek öncelikli özel alarm melodisi',
    icon: 'alarm',
    badge: 'Alarm',
  },
  {
    id: 'gentle',
    title: 'Kibar Hatırlatıcı',
    description: 'Hafif, nazik ve dinlendirici melodik ton',
    icon: 'musical-notes',
    badge: 'Nazik',
  },
  {
    id: 'chime',
    title: 'Kristal Zil',
    description: 'Net ve parlak yüksek frekanslı zil sesi',
    icon: 'sparkles',
    badge: 'Çan',
  },
  {
    id: 'system_custom',
    title: 'Cihaz Sistem Sesi (Özel)',
    description: 'Telefonunuzun kendi ses kütüphanesinden seçtiğiniz melodi',
    icon: 'phone-portrait-outline',
    badge: 'Cihazdan',
  },
  {
    id: 'silent',
    title: 'Sessiz (Titreşim)',
    description: 'Yalnızca ritmik titreşim ile sessiz uyarı',
    icon: 'volume-mute',
    badge: 'Sessiz',
  },
];

export const SOUND_CHANNELS: Record<
  NotificationSoundType,
  {
    id: string;
    name: string;
    sound: string | null;
    importance: Notifications.AndroidImportance;
    audioUsage?: Notifications.AndroidAudioUsage;
    description: string;
  }
> = {
  default: {
    id: 'medication-channel-default-v2',
    name: 'İlaç Hatırlatıcı (Varsayılan Ses)',
    sound: 'default',
    importance: Notifications.AndroidImportance.MAX,
    audioUsage: Notifications.AndroidAudioUsage.NOTIFICATION,
    description: 'Standart sistem bildirim melodisi ile uyarı',
  },
  alarm: {
    id: 'medication-channel-alarm-v2',
    name: 'İlaç Hatırlatıcı (Alarm & Zil)',
    sound: 'med_alarm.wav',
    importance: Notifications.AndroidImportance.MAX,
    audioUsage: Notifications.AndroidAudioUsage.ALARM,
    description: 'Belirgin ve yüksek öncelikli alarm tonu',
  },
  gentle: {
    id: 'medication-channel-gentle-v2',
    name: 'İlaç Hatırlatıcı (Kibar Ton)',
    sound: 'med_gentle.wav',
    importance: Notifications.AndroidImportance.HIGH,
    audioUsage: Notifications.AndroidAudioUsage.NOTIFICATION_EVENT,
    description: 'Hafif ve nazik bildirim tonu',
  },
  chime: {
    id: 'medication-channel-chime-v2',
    name: 'İlaç Hatırlatıcı (Kristal Zil)',
    sound: 'med_chime.wav',
    importance: Notifications.AndroidImportance.MAX,
    audioUsage: Notifications.AndroidAudioUsage.NOTIFICATION,
    description: 'Net ve parlak kristal zil tonu',
  },
  system_custom: {
    id: 'medication-channel-custom-v2',
    name: 'İlaç Hatırlatıcı (Cihazdan Özel Ses)',
    sound: 'default',
    importance: Notifications.AndroidImportance.MAX,
    audioUsage: Notifications.AndroidAudioUsage.NOTIFICATION,
    description: 'Telefonun Android ayarlarından seçilen zil veya bildirim sesi',
  },
  silent: {
    id: 'medication-channel-silent-v2',
    name: 'İlaç Hatırlatıcı (Sessiz)',
    sound: null,
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Sessiz mod, yalnızca titreşim',
  },
};

export const URGENT_REPEAT_CHANNEL_ID = 'medication-channel-urgent-v2';

/**
 * Builds rich notification title and multiline body containing
 * medicine name, dosage, meal condition, instructions, and stock status.
 */
export function buildNotificationContent(
  dose: NotificationDose,
  options: {
    privateMode?: boolean;
    hideDoseAmount?: boolean;
    isRepeat?: boolean;
    repeatIndex?: number;
    timeStr?: string;
    lang?: 'tr' | 'en';
  }
): { title: string; body: string } {
  const { privateMode = false, hideDoseAmount = false, isRepeat = false, repeatIndex = 1, lang = 'tr' } = options;
  const isEn = lang === 'en';

  if (privateMode) {
    return {
      title: isRepeat
        ? (isEn ? '⚠️ WARNING: Medication Time (Pending Confirmation)' : '⚠️ UYARI: İlaç Vakti (Onay Bekliyor)')
        : (isEn ? '⏰ Medication Time' : '⏰ İlaç Vakti'),
      body: isRepeat
        ? (isEn ? 'Your scheduled medication has not been confirmed yet. Please take your medication.' : 'Planlı ilacınız henüz onaylanmadı. Lütfen ilacınızı alınız.')
        : (isEn ? 'It is time to take your scheduled medication.' : 'Planlı ilacınızı alma zamanı geldi.'),
    };
  }

  const title = isRepeat
    ? (isEn ? `⚠️ WARNING: ${dose.name} Not Taken Yet! (+${repeatIndex * 3} min)` : `⚠️ UYARI: ${dose.name} Henüz İçilmedi! (+${repeatIndex * 3} dk)`)
    : (isEn ? `⏰ ${dose.name} Time${hideDoseAmount ? '' : ` (${dose.amount})`}` : `⏰ ${dose.name} Vakti${hideDoseAmount ? '' : ` (${dose.amount})`}`);

  const lines: string[] = [];

  // Line 1: Dosage, meal timing & medicine form
  const mealsMap = isEn ? mealLabelsEn : mealLabels;
  const formsMap = isEn ? formLabelsEn : formLabels;
  const meal = dose.mealCondition ? (mealsMap[dose.mealCondition] ?? dose.mealCondition) : (isEn ? 'On time' : 'Zamanında');
  const form = dose.form ? (formsMap[dose.form] ?? dose.form) : '';
  const formStr = form ? ` (${form})` : '';
  const amountStr = hideDoseAmount ? (isEn ? 'Scheduled dose' : 'Planlı doz') : dose.amount;
  lines.push(isEn ? `💊 Dose: ${amountStr} · ${meal}${formStr}` : `💊 Doz: ${amountStr} · ${meal}${formStr}`);

  // Line 2: Clinical instructions / notes
  if (dose.instructions && dose.instructions.trim().length > 0) {
    lines.push(isEn ? `ℹ️ Instructions: ${dose.instructions.trim()}` : `ℹ️ Talimat: ${dose.instructions.trim()}`);
  }

  // Line 3: Stock status & critical threshold warning
  if (dose.stock !== undefined) {
    const threshold = dose.stockThreshold !== undefined ? dose.stockThreshold : 5;
    const isCritical = dose.stock <= threshold;
    const unitStr = isEn ? (dose.stock === 1 ? 'unit' : 'units') : 'adet';
    const critStr = isEn ? ' ⚠️ (Critical Level!)' : ' ⚠️ (Kritik Seviye!)';
    lines.push(isEn ? `📦 Remaining Stock: ${dose.stock} ${unitStr}${isCritical ? critStr : ''}` : `📦 Kalan Stok: ${dose.stock} adet${isCritical ? critStr : ''}`);
  }

  // Line 4: Call to action or 3-minute repeat persistent warning (always sound + vibration)
  if (isRepeat) {
    lines.push(isEn ? `⚠️ This medication has not been confirmed! You will be alerted every 3 minutes with sound and vibration until confirmed.` : `⚠️ Bu ilaç henüz onaylanmadı! Onaylanana kadar her 3 dakikada bir sesli ve titreşimli uyarılacaksınız.`);
  } else {
    lines.push(isEn ? `🔔 Please take it when it is time and confirm in the app.` : `🔔 Vakti geldiğinde alıp uygulamadan onaylayınız.`);
  }

  return {
    title,
    body: lines.join('\n'),
  };
}

/**
 * Opens Android system settings for this channel or app so the user
 * can select any device ringtone or system sound from their phone.
 */
export async function openChannelNotificationSettings(channelId?: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return true;
  }

  const packageName = 'com.itmarti.reminder';
  const targetChannelId = channelId ?? 'medication-channel-custom-v2';

  try {
    await Linking.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
      { key: 'android.provider.extra.CHANNEL_ID', value: targetChannelId },
    ]);
    return true;
  } catch {
    try {
      await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
      ]);
      return true;
    } catch {
      await Linking.openSettings();
      return true;
    }
  }
}

/**
 * Opens Android battery optimization exemption prompt/settings so the app
 * is not killed or throttled by Android Doze Mode during sleep.
 */
export async function openBatteryOptimizationSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return true;
  }

  const packageName = 'com.itmarti.reminder';
  try {
    await Linking.sendIntent('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', [
      { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
    ]);
    return true;
  } catch {
    try {
      await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      return true;
    } catch {
      await Linking.openSettings();
      return true;
    }
  }
}

/**
 * Opens Android 12+ Exact Alarm settings page so alarms can trigger
 * with exact-second accuracy.
 */
export async function openExactAlarmSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return true;
  }

  const packageName = 'com.itmarti.reminder';
  try {
    await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', [
      { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
    ]);
    return true;
  } catch {
    try {
      await Linking.sendIntent('android.settings.APPLICATION_DETAILS_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
      ]);
      return true;
    } catch {
      await Linking.openSettings();
      return true;
    }
  }
}

const createNotificationHandler = (shouldPlaySound: boolean) => async (notif: Notifications.Notification) => {
  try {
    const data = notif.request?.content?.data as any;
    const doseId = data?.doseId !== undefined ? notificationId(data.doseId) : undefined;
    const timeStr = data?.time as string | undefined;
    const isRepeat = data?.isRepeat as boolean | undefined;

    // If this is a repeat warning notification AND the dose is ALREADY taken or skipped:
    if (isRepeat && doseId !== undefined && isDoseConfirmedTaken && isDoseConfirmedTaken(doseId, timeStr, data?.date)) {
      try {
        await Notifications.dismissNotificationAsync(notif.request.identifier);
      } catch {}
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
        priority: Notifications.AndroidNotificationPriority.MIN,
      };
    }
  } catch {}

  return {
    shouldShowAlert: true,
    shouldPlaySound,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  };
};

// Initial setup for foreground notification presentation
try {
  Notifications.setNotificationHandler({
    handleNotification: createNotificationHandler(true),
  });
} catch {
  // safe fallback
}

export function updateNotificationHandler(
  soundEnabled: boolean,
  soundType: NotificationSoundType = 'default'
): void {
  const shouldPlaySound = soundEnabled && soundType !== 'silent';
  try {
    Notifications.setNotificationHandler({
      handleNotification: createNotificationHandler(shouldPlaySound),
    });
  } catch {
    // safe fallback
  }
}

export async function initNotifications(): Promise<void> {
  try {
    // 1. Register interactive notification category with Action buttons
    try {
      await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_MED_ACTIONS, [
        {
          identifier: ACTION_TAKEN,
          buttonTitle: '✅ İlaç İçildi',
          options: { opensAppToForeground: true },
        },
        {
          identifier: ACTION_SNOOZE,
          buttonTitle: '⏱️ 3 Dk Ertele',
          options: { opensAppToForeground: true },
        },
        {
          identifier: ACTION_SKIP,
          buttonTitle: '❌ Atla',
          options: { opensAppToForeground: true, isDestructive: true },
        },
      ]);

      await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_APPOINTMENT_ACTIONS, [
        {
          identifier: ACTION_APPT_DONE,
          buttonTitle: '✅ Anlaşıldı',
          options: { opensAppToForeground: false },
        },
      ]);
    } catch (e) {
      console.log('setNotificationCategoryAsync fallback:', e);
    }

    if (Platform.OS === 'android') {
      // 2. Clean up old v1 channels so Android removes any cached "default" sound states
      const oldChannelIds = [
        'medication-channel-default',
        'medication-channel-alarm',
        'medication-channel-gentle',
        'medication-channel-silent',
      ];
      for (const oldId of oldChannelIds) {
        try {
          await Notifications.deleteNotificationChannelAsync(oldId);
        } catch {}
      }

      // 3. Register fresh v2 channels with distinctive sound assets & custom channel
      for (const key of Object.keys(SOUND_CHANNELS) as NotificationSoundType[]) {
        const cfg = SOUND_CHANNELS[key];
        await Notifications.setNotificationChannelAsync(cfg.id, {
          name: cfg.name,
          importance: cfg.importance,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#059669',
          sound: cfg.sound ?? null,
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          description: cfg.description,
          audioAttributes: cfg.audioUsage
            ? {
                usage: cfg.audioUsage,
                contentType: Notifications.AndroidAudioContentType.SONIFICATION,
                flags: {
                  enforceAudibility: true,
                  requestHardwareAudioVideoSynchronization: false,
                },
              }
            : undefined,
        });
      }

      // 4. Register dedicated urgent repeating channel (plays via ALARM stream, always loud & vibrating)
      await Notifications.setNotificationChannelAsync(URGENT_REPEAT_CHANNEL_ID, {
        name: 'İlaç Israrcı Tekrar Uyarısı (Her 3 Dk Ses & Titreşim)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 800, 350, 800, 350, 800],
        lightColor: '#ef4444',
        sound: 'med_alarm.wav',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        description: 'İlaç onaylanana kadar her 3 dakikada bir çalan yüksek sesli ve güçlü titreşimli acil uyarı',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
      });
    }
  } catch (e) {
    console.log('initNotifications fallback:', e);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

export type NotificationActionResponse = {
  actionId: string;
  doseId?: string | number;
  timeStr?: string;
  date?: string;
  isRepeat?: boolean;
  isAppointment?: boolean;
  appointmentDate?: string;
  appointmentTime?: string;
  leadOption?: string;
  isBloodTest?: boolean;
  title?: string;
  body?: string;
};

export function addNotificationResponseListener(
  listener: (response: NotificationActionResponse) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(res => {
    try {
      const actionId = res.actionIdentifier;
      const data = res.notification.request.content.data as any;
      const doseId = data?.doseId !== undefined ? notificationId(data.doseId) : undefined;
      const timeStr = data?.time as string | undefined;
      const isRepeat = data?.isRepeat as boolean | undefined;

      listener({
        actionId,
        doseId,
        timeStr,
        date: data?.date,
        isRepeat,
        isAppointment: data?.isAppointment,
        appointmentDate: data?.appointmentDate,
        appointmentTime: data?.appointmentTime,
        leadOption: data?.leadOption,
        isBloodTest: data?.isBloodTest,
        title: res.notification.request.content.title ?? undefined,
        body: res.notification.request.content.body ?? undefined,
      });
    } catch (err) {
      console.log('Notification response listener error:', err);
    }
  });

  return () => {
    sub.remove();
  };
}

export function addNotificationReceivedListener(
  listener: (notification: { isRepeat?: boolean; doseId?: string | number; time?: string; date?: string; isAppointment?: boolean; title: string; body: string }) => void
): () => void {
  const sub = Notifications.addNotificationReceivedListener(notif => {
    try {
      const data = notif.request.content.data as any;
      listener({
        isRepeat: data?.isRepeat,
        doseId: data?.doseId !== undefined ? notificationId(data.doseId) : undefined,
        time: data?.time,
        date: data?.date,
        isAppointment: data?.isAppointment,
        title: notif.request.content.title ?? 'İlaç Vakti',
        body: notif.request.content.body ?? '',
      });
    } catch (err) {
      console.log('addNotificationReceivedListener error:', err);
    }
  });

  return () => {
    sub.remove();
  };
}

export async function playTestSound(
  soundType: NotificationSoundType,
  soundEnabled: boolean = true
): Promise<void> {
  const isSilent = !soundEnabled || soundType === 'silent';
  const channel = SOUND_CHANNELS[isSilent ? 'silent' : soundType];

  try {
    Vibration.vibrate([0, 200, 100, 200]);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: isSilent ? '🔕 Sessiz Hatırlatıcı Testi' : `🔔 Ses Testi: ${channel.name}`,
        body: isSilent
          ? 'Bildirim sesi sessize ayarlandı, yalnızca titreşim verildi.'
          : soundType === 'system_custom'
          ? 'Cihaz ayarlarından seçtiğiniz melodiyi çalar.'
          : `${channel.name} sesi test edildi.`,
        sound: isSilent ? undefined : (channel.sound ? channel.sound : 'default'),
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 200, 100, 200],
      },
      trigger: { channelId: channel.id },
    });
  } catch (err) {
    console.log('playTestSound fallback:', err);
  }
}

/**
 * Cancels all scheduled repeat warning notifications for a specific dose slot.
 * Also dismisses any already delivered notifications from the notification tray.
 * Called immediately when the dose is confirmed (taken or skipped).
 */
export function cancelDoseRepeatNotifications(doseId: string | number, timeStr?: string, date = localDateKey()): Promise<void> {
  return serializeNotifications(async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of scheduled) {
        const d = item.content?.data;
        if (d && (notificationId(d.doseId) === doseId || String(notificationId(d.doseId)) === String(doseId) || d.isTest)) {
          if (!timeStr || d.time === timeStr || d.isTest) {
            if ((d.isRepeat && (!d.date || d.date === date)) || d.isTest) {
              await Notifications.cancelScheduledNotificationAsync(item.identifier);
            }
          }
        }
      }

      // Dismiss active notifications currently sitting in the status bar/drawer
      try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        for (const item of presented) {
          const d = item.request?.content?.data;
          if (d && (notificationId(d.doseId) === doseId || String(notificationId(d.doseId)) === String(doseId) || d.isTest)) {
            if ((!timeStr || d.time === timeStr || d.isTest) && (!d.date || d.date === date)) {
              await Notifications.dismissNotificationAsync(item.request.identifier);
            }
          }
        }
      } catch {}
    } catch (err) {
      console.log('cancelDoseRepeatNotifications error:', err);
      throw err;
    }
  });
}

/**
 * Cancels and dismisses ALL repeat, snooze, and test warnings across all doses.
 * Used when all medicines for today have been completed.
 */
export function cancelAllRepeatNotifications(): Promise<void> {
  return serializeNotifications(async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of scheduled) {
        const d = item.content?.data;
        if ((d?.isRepeat && (!d.date || d.date === localDateKey())) || d?.isTest) {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
      }
      const presented = await Notifications.getPresentedNotificationsAsync();
      for (const item of presented) {
        const d = item.request?.content?.data;
        if (d?.isRepeat || item.request.identifier.includes('repeat') || item.request.identifier.includes('snooze') || item.request.identifier.includes('test-med')) {
          await Notifications.dismissNotificationAsync(item.request.identifier);
        }
      }
    } catch (err) {
      console.log('cancelAllRepeatNotifications error:', err);
    }
  });
}

export interface SyncNotificationOptions {
  enabled: boolean;
  privateMode: boolean;
  soundEnabled?: boolean;
  soundType?: NotificationSoundType;
  leadTimeMinutes?: number;
  hideDoseAmount?: boolean;
  repeatNagEnabled?: boolean;
  repeatNagCount?: number;
  lang?: 'tr' | 'en';
}

export type ScheduleSummary = { count: number; incompleteCount: number; refreshAfter: string | null };

/** Date-based plans cover the next 30 days, bounded by the pending request budget.
 * Refilled at launch, foreground, midnight and whenever the plan changes. */
export function buildMedicationSchedule(
  doses: NotificationDose[], options: SyncNotificationOptions, now = new Date(),
  snoozedSlots = new Set<string>(),
): Notifications.NotificationRequestInput[] {
  if (!options.enabled) return [];
  const requests: Notifications.NotificationRequestInput[] = [];
  const today = localDateKey(now);
  const isSilent = options.soundEnabled === false || options.soundType === 'silent';
  const channel = SOUND_CHANNELS[isSilent ? 'silent' : (options.soundType ?? 'default')];
  const repeats = options.repeatNagEnabled === false ? 0 : Math.max(1, Math.min(10, options.repeatNagCount ?? 5));
  // Include yesterday for repeats/snoozes that cross midnight, and tomorrow's lead time.
  for (let offset = -1; offset <= 30; offset++) {
    const day = dateFromKey(today);
    day.setDate(day.getDate() + offset);
    const date = localDateKey(day);
    for (const input of doses) {
      const dose: Dose = { ...input, status: input.status ?? 'pending' };
      if (!isDoseActive(dose, date)) continue;
      const amount = getCycleInfo(dose, date).todayAmount;
      for (const time of new Set(dose.times?.length ? dose.times : [dose.time])) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;
        if (slotStatus(dose, time, date) !== 'pending') continue;
        if (snoozedSlots.has(`${dose.id}|${date}|${time}`)) continue;
        const [hour, minute] = time.split(':').map(Number);
        const due = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
        // Repeat nag reminders (every 3 minutes) are only critical for the immediate window:
        // yesterday (for overnight crossing), today, and tomorrow (offset <= 1).
        // For future days (> 1), we schedule only the main dose reminder (repeatIndex === 0).
        // As time advances or when the app opens, the schedule automatically refreshes upcoming repeat nags.
        const maxRepeatForDay = offset <= 1 ? repeats : 0;
        for (let repeatIndex = 0; repeatIndex <= maxRepeatForDay; repeatIndex++) {
          // Repeat reminders are measured from the dose time, not its early heads-up.
          const fireAt = new Date(due.getTime() + (repeatIndex ? repeatIndex * 3 : -(options.leadTimeMinutes ?? 0)) * 60000);
          if (fireAt <= now) continue;
          const isRepeat = repeatIndex > 0;
          const content = buildNotificationContent({ ...dose, amount }, { ...options, isRepeat, repeatIndex, timeStr: time });
          requests.push({
            identifier: `dose-${dose.id}-${date}-${time}-${isRepeat ? `repeat-${repeatIndex}` : 'main'}`,
            content: {
              ...content,
              sound: isSilent ? undefined : (isRepeat ? (channel.sound ?? 'med_alarm.wav') : (channel.sound ?? 'default')),
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: isRepeat ? [0, 800, 350, 800, 350, 800] : [0, 500, 250, 500],
              categoryIdentifier: NOTIFICATION_CATEGORY_MED_ACTIONS,
              data: { doseId: dose.id, time, date, isRepeat, repeatIndex, fireAt: fireAt.getTime() },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt,
              channelId: isRepeat && !isSilent ? URGENT_REPEAT_CHANNEL_ID : channel.id },
          });
        }
      }
    }
  }
  return requests.sort((a, b) => Number(a.content.data?.fireAt) - Number(b.content.data?.fireAt));
}

export function syncMedicationNotifications(doses: NotificationDose[], options: SyncNotificationOptions): Promise<ScheduleSummary> {
  return serializeNotifications(async () => {
    const now = new Date();
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    if (!options.enabled) {
      for (const item of existing.filter(item => item.identifier.startsWith('test-med'))) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
      if (testTimer) { clearTimeout(testTimer); testTimer = null; }
    }
    const owned = existing.filter(item => item.identifier.startsWith('dose-'));
    const snoozes = owned.filter(item => {
      const data = item.content.data;
      if (!options.enabled || !data?.isSnooze) return false;
      const input = doses.find(d => d.id === notificationId(data.doseId));
      if (!input || typeof data.date !== 'string' || Number(data.fireAt) <= now.getTime()) return false;
      const dose: Dose = { ...input, status: input.status ?? 'pending' };
      return (dose.times?.length ? dose.times : [dose.time]).includes(String(data.time)) && isDoseActive(dose, data.date) && slotStatus(dose, String(data.time), data.date) === 'pending';
    });
    const snoozedSlots = new Set(snoozes.map(item => {
      const d = item.content.data!;
      return `${notificationId(d.doseId)}|${d.date}|${d.time}`;
    }));
    const planned = buildMedicationSchedule(doses, options, now, snoozedSlots);
    // Platform budget: iOS hard limit is 64 (we use 60).
    // Android AlarmManager has a system-wide hard ceiling of 500 concurrent alarms per UID.
    // Setting Android budget to 180 provides 1-2+ weeks of coverage with plenty of safety margin (>300 free slots),
    // preventing "Maximum limit of concurrent alarms 500 reached" crashes.
    const platformBudget = Platform.OS === 'ios' ? 60 : 180;
    const budget = Math.max(0, platformBudget - snoozes.length - (existing.length - owned.length));
    const desired = [
      ...snoozes.map(item => {
        const data = item.content.data!;
        const dose = doses.find(d => d.id === notificationId(data.doseId))!;
        return buildSnoozeRequest({ ...dose, time: String(data.time), statusDate: String(data.date),
          amount: getCycleInfo({ ...dose, status: dose.status ?? 'pending' }, String(data.date)).todayAmount }, Number(data.fireAt), options);
      }),
      ...planned.slice(0, budget),
    ];
    const keep = new Set(desired.map(r => r.identifier));
    for (const item of owned) {
      if (!keep.has(item.identifier)) {
        try {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        } catch {}
      }
    }
    // Proactively cancel any already-expired alarms (fireAt in the past) to free Android AlarmManager slots
    for (const item of existing) {
      const fireAt = Number(item.content?.data?.fireAt);
      if (fireAt && fireAt < now.getTime() - 60000 && !keep.has(item.identifier)) {
        try {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        } catch {}
      }
    }
    // Count unchanged requests too, including those after a failed scheduling attempt.
    const confirmed = new Set(desired.filter(request =>
      owned.some(item => item.identifier === request.identifier &&
        item.content.data?.planSignature === JSON.stringify(request.content))
    ).map(request => request.identifier));
    for (const request of desired) {
      // Compare our own signature: native APIs may normalize returned content/trigger values.
      const signature = JSON.stringify(request.content);
      if (confirmed.has(request.identifier)) continue;
      try {
        await Notifications.scheduleNotificationAsync({ ...request,
          content: { ...request.content, data: { ...request.content.data, planSignature: signature } },
        });
        confirmed.add(request.identifier);
      } catch (scheduleError) {
        console.warn('Notifications: Failed to schedule single alarm, quota or OS restriction:', scheduleError);
        break; // Stop scheduling further alarms to prevent cascade errors if system cap is reached
      }
    }
    const horizon = dateFromKey(localDateKey(now));
    horizon.setDate(horizon.getDate() + 30);
    const incompleteCount = desired.length - confirmed.size;
    return { count: confirmed.size, incompleteCount,
      refreshAfter: !incompleteCount && options.enabled && planned.length ? new Date(Number(planned[budget]?.content.data?.fireAt ?? horizon.getTime())).toISOString() : null };
  });
}

function buildSnoozeRequest(
  dose: NotificationDose, fireAt: number,
  options: { soundEnabled?: boolean; soundType?: NotificationSoundType; privateMode?: boolean; hideDoseAmount?: boolean } = {},
): Notifications.NotificationRequestInput {
  const isSilent = options.soundEnabled === false || options.soundType === 'silent';
  const channel = SOUND_CHANNELS[isSilent ? 'silent' : (options.soundType ?? 'default')];
  const content = buildNotificationContent(dose, { ...options, isRepeat: false, timeStr: dose.time });
  return {
    identifier: `dose-${dose.id}-${dose.statusDate ?? localDateKey()}-${dose.time}-snooze`,
    content: {
      title: `⏱️ Erteleme: ${content.title}`, body: content.body,
      sound: isSilent ? undefined : (channel.sound ?? 'med_alarm.wav'),
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 800, 350, 800, 350, 800],
      categoryIdentifier: NOTIFICATION_CATEGORY_MED_ACTIONS,
      data: { doseId: dose.id, time: dose.time, date: dose.statusDate ?? localDateKey(), fireAt, isRepeat: true, isSnooze: true },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt),
      channelId: isSilent ? SOUND_CHANNELS.silent.id : URGENT_REPEAT_CHANNEL_ID },
  };
}

export function snoozeNotification(
  dose: NotificationDose, minutes = 3,
  soundOptions?: { soundEnabled?: boolean; soundType?: NotificationSoundType; privateMode?: boolean; hideDoseAmount?: boolean },
): Promise<void> {
  return serializeNotifications(async () => {
    const fireAt = Date.now() + Math.max(10, minutes * 60) * 1000;
    await Notifications.scheduleNotificationAsync(buildSnoozeRequest(dose, fireAt, soundOptions));
  });
}

let testTimer: any = null;

export async function scheduleTestNotification(
  privateMode: boolean,
  firstDose: NotificationDose | undefined,
  onDeliver: (payload: ActiveNotificationPayload) => void,
  soundOptions?: {
    soundEnabled?: boolean;
    soundType?: NotificationSoundType;
    hideDoseAmount?: boolean;
    repeatNagEnabled?: boolean;
    lang?: 'tr' | 'en';
  }
): Promise<void> {
  if (testTimer) {
    clearTimeout(testTimer);
  }

  const soundEnabled = soundOptions?.soundEnabled ?? true;
  const soundType = soundOptions?.soundType ?? 'default';
  const hideDoseAmount = soundOptions?.hideDoseAmount ?? false;
  const repeatNagEnabled = soundOptions?.repeatNagEnabled ?? true;
  const lang = soundOptions?.lang ?? 'tr';
  const isSilent = !soundEnabled || soundType === 'silent';
  const channel = SOUND_CHANNELS[isSilent ? 'silent' : soundType];

  const mockDose: NotificationDose = firstDose ?? {
    id: 999,
    name: lang === 'en' ? 'Sample Medicine' : 'Örnek İlaç',
    amount: lang === 'en' ? '1 tablet' : '1 tablet',
    time: '09:00',
    mealCondition: 'tok',
    instructions: lang === 'en' ? 'Take according to directions.' : 'Kullanım talimatına göre alınız.',
    stock: 30,
    stockThreshold: 5,
    form: 'tablet',
  };

  const primaryContent = buildNotificationContent(mockDose, {
    privateMode,
    hideDoseAmount,
    isRepeat: false,
    timeStr: mockDose.time,
    lang,
  });

  // 1. Native OS-Level Primary Notification (3 seconds)
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'test-med-main',
      content: {
        title: primaryContent.title,
        body: primaryContent.body,
        sound: isSilent ? undefined : (channel.sound ? channel.sound : 'default'),
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        categoryIdentifier: NOTIFICATION_CATEGORY_MED_ACTIONS,
        data: { doseId: mockDose.id, time: mockDose.time, isRepeat: false, isTest: true },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        channelId: channel.id,
      },
    });

    // 2. If nagging enabled, schedule follow-up repeat notification (+180s = 3 minutes)
    // ALWAYS with high priority alarm sound and strong 3-pulse vibration!
    if (repeatNagEnabled) {
      const repeatContent = buildNotificationContent(mockDose, {
        privateMode,
        hideDoseAmount,
        isRepeat: true,
        repeatIndex: 1,
        timeStr: mockDose.time,
        lang,
      });

      const repeatSound = isSilent
        ? undefined
        : channel.sound
        ? channel.sound
        : 'med_alarm.wav';
      const targetRepeatChannel = isSilent
        ? SOUND_CHANNELS.silent.id
        : URGENT_REPEAT_CHANNEL_ID;

      await Notifications.scheduleNotificationAsync({
        identifier: 'test-med-repeat-1',
        content: {
          title: repeatContent.title,
          body: repeatContent.body,
          sound: repeatSound,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 800, 350, 800, 350, 800],
          categoryIdentifier: NOTIFICATION_CATEGORY_MED_ACTIONS,
          data: { doseId: mockDose.id, time: mockDose.time, isRepeat: true, repeatIndex: 1, isTest: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 180, // 3 minutes later
          channelId: targetRepeatChannel,
        },
      });
    }
  } catch (err) {
    console.log('Native test notification schedule fallback:', err);
  }

  // 3. In-app banner & vibration trigger
  testTimer = setTimeout(() => {
    try {
      Vibration.vibrate([0, 400, 200, 400]);
    } catch {}
    onDeliver({
      title: primaryContent.title,
      body: primaryContent.body,
      doseId: mockDose.id,
      time: mockDose.time,
      isRepeat: false,
    });
  }, 3000);
}

export interface DoctorAppointmentScheduleParams {
  appointmentDate?: string;
  appointmentTime?: string;
  leadOptions?: string[];
  bloodTestDate?: string;
  doctorName?: string;
  hospital?: string;
  lang?: 'tr' | 'en';
}

export function cancelDoctorAppointmentNotifications(): Promise<void> {
  return serializeNotifications(async () => {
    try {
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of existing) {
        if (item.identifier.startsWith('appt-')) {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
      }
    } catch (err) {
      console.log('cancelDoctorAppointmentNotifications fallback:', err);
    }
  });
}

export function snoozeDoctorAppointmentNotification(
  minutes = 60,
  title?: string,
  body?: string
): Promise<void> {
  return serializeNotifications(async () => {
    try {
      const fireAt = Date.now() + Math.max(10, minutes * 60) * 1000;
      await Notifications.scheduleNotificationAsync({
        identifier: `appt-snooze-${Date.now()}`,
        content: {
          title: title || '🗓️ Randevu Hatırlatması (Ertelendi)',
          body: body || 'Doktor randevunuz veya tahliliniz yaklaşıyor.',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 500, 250, 500],
          categoryIdentifier: NOTIFICATION_CATEGORY_APPOINTMENT_ACTIONS,
          data: {
            isAppointment: true,
            isSnooze: true,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
          channelId: SOUND_CHANNELS.default.id,
        },
      });
    } catch (err) {
      console.log('snoozeDoctorAppointmentNotification fallback:', err);
    }
  });
}

export function syncDoctorAppointmentNotifications(
  params: DoctorAppointmentScheduleParams
): Promise<void> {
  return serializeNotifications(async () => {
    try {
      // 1. Cancel previous appointment and lab reminders
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of existing) {
        if (item.identifier.startsWith('appt-')) {
          try {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          } catch {}
        }
      }

      const {
        appointmentDate,
        appointmentTime = '09:00',
        leadOptions = ['1d'],
        bloodTestDate,
        doctorName = '',
        hospital = '',
        lang = 'tr',
      } = params;

      const isEn = lang === 'en';
      const docLabel = doctorName.trim()
        ? (doctorName.startsWith('Dr') ? doctorName.trim() : `Dr. ${doctorName.trim()}`)
        : (isEn ? 'your doctor' : 'doktorunuz');
      const hospLabel = hospital.trim() ? ` (${hospital.trim()})` : '';

      // 2. Schedule multi-lead appointment reminders
      if (appointmentDate && /^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
        const [year, month, day] = appointmentDate.split('-').map(Number);
        const [hour = 9, minute = 0] = appointmentTime.split(':').map(Number);
        const appointmentDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);

        const effectiveLeads = Array.isArray(leadOptions) ? [...leadOptions] : ['1d', '0d'];
        if (!effectiveLeads.includes('0d') && !effectiveLeads.includes('same_day')) {
          effectiveLeads.push('0d');
        }

        for (const lead of effectiveLeads) {
          let triggerDate: Date | null = null;
          let title = '';
          let body = '';

          if (lead === '3d') {
            triggerDate = new Date(year, month - 1, day - 3, 20, 0, 0, 0);
            title = isEn ? '🗓️ Yaklaşan Randevu (3 Gün Kaldı)' : '🗓️ Yaklaşan Doktor Randevusu (3 Gün Kaldı)';
            body = isEn
              ? `In 3 days (${appointmentDate} ${appointmentTime}), you have an appointment with ${docLabel}${hospLabel}.`
              : `3 gün sonra (${appointmentDate} ${appointmentTime}) ${docLabel}${hospLabel} ile randevunuz var.`;
          } else if (lead === '2d') {
            triggerDate = new Date(year, month - 1, day - 2, 20, 0, 0, 0);
            title = isEn ? '🗓️ Yaklaşan Randevu (2 Gün Kaldı)' : '🗓️ Yaklaşan Doktor Randevusu (2 Gün Kaldı)';
            body = isEn
              ? `In 2 days (${appointmentDate} ${appointmentTime}), you have an appointment with ${docLabel}${hospLabel}.`
              : `2 gün sonra (${appointmentDate} ${appointmentTime}) ${docLabel}${hospLabel} ile randevunuz var.`;
          } else if (lead === '1d') {
            triggerDate = new Date(year, month - 1, day - 1, 20, 0, 0, 0);
            title = isEn ? '🗓️ Tomorrow: Doctor Appointment!' : '🗓️ Yarın Doktor Randevunuz Var!';
            body = isEn
              ? `Tomorrow at ${appointmentTime}, you have an appointment with ${docLabel}${hospLabel}. Don't forget your med list and lab results!`
              : `Yarın saat ${appointmentTime}'de ${docLabel}${hospLabel} ile randevunuz var. İlaç listenizi ve tahlil sonuçlarınızı yanınıza almayı unutmayın!`;
          } else if (lead === '0d' || lead === 'same_day') {
            // Randevu sabahı saat 05:00'te son onay bildirimi
            triggerDate = new Date(year, month - 1, day, 5, 0, 0, 0);
            title = isEn ? '🗓️ Today: Doctor Appointment!' : '🗓️ Bugün Doktor Randevunuz Var!';
            body = isEn
              ? `Today at ${appointmentTime}, you have an appointment with ${docLabel}${hospLabel}. Don't forget your med list and lab results!`
              : `Bugün saat ${appointmentTime}'de ${docLabel}${hospLabel} ile randevunuz var. İlaç listenizi ve tahlil sonuçlarınızı yanınıza almayı unutmayın!`;
          }

          if (triggerDate && triggerDate.getTime() > Date.now() + 15000) {
            try {
              await Notifications.scheduleNotificationAsync({
                identifier: `appt-lead-${lead}-${appointmentDate}`,
                content: {
                  title,
                  body,
                  sound: 'default',
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  vibrate: [0, 500, 250, 500],
                  categoryIdentifier: NOTIFICATION_CATEGORY_APPOINTMENT_ACTIONS,
                  data: {
                    isAppointment: true,
                    appointmentDate,
                    appointmentTime,
                    leadOption: lead,
                    doctorName,
                    hospital,
                  },
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: triggerDate,
                  channelId: SOUND_CHANNELS.default.id,
                },
              });
            } catch (err) {
              console.log(`Failed to schedule appt lead ${lead}:`, err);
            }
          }
        }
      }

      // 3. Schedule Blood Test (Aç karnına kan verme) reminder
      if (bloodTestDate && /^\d{4}-\d{2}-\d{2}$/.test(bloodTestDate)) {
        const [bYear, bMonth, bDay] = bloodTestDate.split('-').map(Number);
        // 08:00 AM on blood test day
        const bloodTriggerDate = new Date(bYear, bMonth - 1, bDay, 8, 0, 0, 0);

        if (bloodTriggerDate.getTime() > Date.now() + 15000) {
          const bTitle = isEn ? '🧪 Blood Test Reminder (Fasting)' : '🧪 Aç Karnına Kan Tahlili Hatırlatıcısı';
          const bBody = isEn
            ? `Today is your lab test day before your appointment with ${docLabel}! Please remember to go fasting.`
            : `${docLabel} randevunuz öncesinde bugün kan verme gününüz! Lütfen aç karnına tahlilinizi yaptırmayı unutmayın.`;

          try {
            await Notifications.scheduleNotificationAsync({
              identifier: `appt-blood-${bloodTestDate}`,
              content: {
                title: bTitle,
                body: bBody,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
                vibrate: [0, 500, 250, 500],
                categoryIdentifier: NOTIFICATION_CATEGORY_APPOINTMENT_ACTIONS,
                data: {
                  isAppointment: true,
                  isBloodTest: true,
                  bloodTestDate,
                  doctorName,
                  hospital,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: bloodTriggerDate,
                channelId: SOUND_CHANNELS.default.id,
              },
            });
          } catch (err) {
            console.log('Failed to schedule blood test reminder:', err);
          }
        }
      }
    } catch (outerErr) {
      console.log('syncDoctorAppointmentNotifications error:', outerErr);
    }
  });
}
