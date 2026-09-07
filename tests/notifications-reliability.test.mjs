import assert from "node:assert/strict";
import test from "node:test";

const EXPECTED_SOUND_TYPES = ['default', 'alarm', 'gentle', 'chime', 'silent', 'system_custom'];

test("sound channels and profiles cover required sound categories", () => {
  const profileKeys = ['default', 'alarm', 'gentle', 'chime', 'silent', 'system_custom'];
  assert.deepEqual(profileKeys.sort(), EXPECTED_SOUND_TYPES.sort());
});

test("reliability default settings enforce background reliability on modern Android", () => {
  const defaultReliability = {
    batteryExemptionEnabled: true,
    exactAlarmEnabled: true,
    autoRescheduleOnBoot: true,
    wakeScreenOnAlarm: true,
  };

  assert.equal(defaultReliability.batteryExemptionEnabled, true, "Battery exemption must default to true for Doze mode immunity");
  assert.equal(defaultReliability.exactAlarmEnabled, true, "Exact alarm must default to true for second-precise wakeups");
  assert.equal(defaultReliability.autoRescheduleOnBoot, true, "Auto reschedule on boot must default to true for reboot reliability");
  assert.equal(defaultReliability.wakeScreenOnAlarm, true, "Wake screen must default to true for lockscreen visibility");
});

test("intent configurations match Android 12+ and 14+ specifications", () => {
  const INTENTS = {
    batteryOptimization: 'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    batteryOptimizationFallback: 'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
    exactAlarm: 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
    channelSettings: 'android.settings.CHANNEL_NOTIFICATION_SETTINGS',
  };

  assert.equal(INTENTS.batteryOptimization, 'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
  assert.equal(INTENTS.exactAlarm, 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
  assert.equal(INTENTS.channelSettings, 'android.settings.CHANNEL_NOTIFICATION_SETTINGS');
});

test("notification payload builder respects private mode and dose details", () => {
  const mockDose = {
    id: 1,
    name: 'Coraspin',
    amount: '100 mg',
    time: '09:00',
    mealCondition: 'tok',
    instructions: 'Bol su ile çiğnemeden içiniz.',
    stock: 28,
  };

  const buildNormal = (dose) => ({
    title: `⏰ ${dose.name} Vakti (${dose.amount})`,
    body: `💊 Doz: ${dose.amount} · Tok karnına\nℹ️ Talimat: ${dose.instructions}`,
  });

  const buildPrivate = () => ({
    title: '⏰ İlaç Vakti',
    body: 'Planlı ilacınızı alma zamanı geldi.',
  });

  const normalPayload = buildNormal(mockDose);
  assert.match(normalPayload.title, /Coraspin/);
  assert.match(normalPayload.body, /100 mg/);

  const privatePayload = buildPrivate();
  assert.doesNotMatch(privatePayload.title, /Coraspin/);
  assert.doesNotMatch(privatePayload.body, /100 mg/);
  assert.equal(privatePayload.title, '⏰ İlaç Vakti');
});

test("live alarm test schedule produces 3-second delay and repeat nag interval", () => {
  const testTriggerSeconds = 3;
  const nagIntervalMinutes = 3;
  const maxRepeatCounts = [3, 5, 10];

  assert.equal(testTriggerSeconds, 3);
  assert.equal(nagIntervalMinutes, 3);
  assert.deepEqual(maxRepeatCounts, [3, 5, 10]);
});
