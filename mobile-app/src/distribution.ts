import { NativeModules, Platform } from 'react-native';

export type DistributionChannel = 'github' | 'play' | 'unknown';

// RutinNativeModule.kt (Android only); absent on iOS and in web previews.
const rutinNative: {
  channel?: unknown;
  manufacturer?: unknown;
  canScheduleExactAlarms?: () => Promise<boolean>;
  openAutoStartSettings?: () => Promise<'vendor' | 'details'>;
} | undefined = NativeModules.RutinNative;

/** Lower-case Build.MANUFACTURER on Android (e.g. "honor", "samsung"); empty elsewhere. */
export const DEVICE_MANUFACTURER = typeof rutinNative?.manufacturer === 'string' ? rutinNative.manufacturer : '';

/** Honor and Huawei stop swiped-away apps unless "App launch" is set to manual, so they need explicit steps. */
export const NEEDS_APP_LAUNCH_SETUP = DEVICE_MANUFACTURER === 'honor' || DEVICE_MANUFACTURER === 'huawei';

export const DISTRIBUTION_CHANNEL: DistributionChannel =
  rutinNative?.channel === 'github' || rutinNative?.channel === 'play' ? rutinNative.channel : 'unknown';

/**
 * Store builds (Google Play, and any iOS build) must not update themselves from GitHub, must not use
 * permissions the store restricts, and keep scanned barcodes on the phone so the store's data-safety
 * answer can stay "no data collected".
 */
export const IS_STORE_BUILD = DISTRIBUTION_CHANNEL === 'play' || Platform.OS === 'ios';

/** False when Android would delay reminders because "Alarms & reminders" access is off. */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !rutinNative?.canScheduleExactAlarms) return true;
  try {
    return await rutinNative.canScheduleExactAlarms();
  } catch {
    // Unknown is treated as allowed so a bridge failure never nags the user.
    return true;
  }
}

/**
 * Opens the maker's auto-start screen (Honor/Huawei "App launch", Xiaomi "Autostart" ...) or, when the
 * phone has none, the app's details page. False only when nothing could be opened.
 */
export async function openAutoStartSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !rutinNative?.openAutoStartSettings) return false;
  try {
    await rutinNative.openAutoStartSettings();
    return true;
  } catch (error) {
    console.warn('openAutoStartSettings failed:', error);
    return false;
  }
}
