package com.itmarti.reminder

import android.app.AlarmManager
import android.os.Build
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

  override fun getConstants(): Map<String, Any> = mapOf("channel" to BuildConfig.FLAVOR)

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
}
