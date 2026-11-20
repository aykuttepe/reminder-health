package com.aykuttepe.rutin

import android.app.AlarmManager
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Small bridge for facts JavaScript cannot read on its own: which store build this is (the Gradle
 * product flavor, "github" or "play") and whether Android lets the app ring alarms on the minute.
 */
class RutinNativeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "RutinNative"

  override fun getConstants(): Map<String, Any> = mapOf(
    "channel" to BuildConfig.FLAVOR,
    "manufacturer" to Build.MANUFACTURER.lowercase(),
  )

  // Android 12+ can deny exact alarms; reminders then arrive late. Older versions always allow them.
  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(true)
      return
    }
    val alarmManager = reactApplicationContext.getSystemService(AlarmManager::class.java)
    promise.resolve(alarmManager?.canScheduleExactAlarms() ?: true)
  }

  /**
   * Opens the maker's auto-start / app-launch screen. Honor, Huawei, Xiaomi, Oppo and Vivo stop a
   * swiped-away app completely unless it is allowed there: Android then drops its scheduled alarms and
   * refuses to start it for an alarm, so reminders never arrive while the app is closed. These screens
   * have no public intent, so known activities are tried in order; the app's own details page is the
   * fallback. Resolves "vendor" or "details".
   */
  @ReactMethod
  fun openAutoStartSettings(promise: Promise) {
    for (component in AUTO_START_COMPONENTS) {
      val intent = Intent().setComponent(component).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        reactApplicationContext.startActivity(intent)
        promise.resolve("vendor")
        return
      } catch (error: Exception) {
        // Missing on this phone or not exported: try the next known screen.
        Log.d(TAG, "Auto-start screen unavailable: ${component.flattenToShortString()}", error)
      }
    }
    try {
      reactApplicationContext.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${reactApplicationContext.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
      promise.resolve("details")
    } catch (error: Exception) {
      promise.reject("E_SETTINGS", "Could not open app settings", error)
    }
  }

  private companion object {
    const val TAG = "RutinNative"

    // Order matters: newer screens first. Honor's MagicOS moved from com.huawei.* to com.hihonor.*.
    val AUTO_START_COMPONENTS = listOf(
      ComponentName("com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
      ComponentName("com.hihonor.systemmanager", "com.hihonor.systemmanager.appcontrol.activity.StartupAppControlActivity"),
      ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
      ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity"),
      ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
      ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
      ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
      ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
      ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
      ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
      ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
      ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"),
      ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"),
    )
  }
}
