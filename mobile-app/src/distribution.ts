import { NativeModules, Platform } from 'react-native';

export type DistributionChannel = 'github' | 'play' | 'unknown';

// RutinNativeModule.kt (Android only); absent on iOS and in web previews.
const rutinNative: { channel?: unknown; canScheduleExactAlarms?: () => Promise<boolean> } | undefined =
  NativeModules.RutinNative;

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
