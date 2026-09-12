const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup(now = '2026-09-07T12:00:00', platform = 'android') {
  let clock = new Date(now).getTime();
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const pending = new Map();
  const operations = [];
  const enums = new Proxy({}, { get: (_, key) => key });
  const native = {
    AndroidImportance: enums, AndroidAudioUsage: enums, AndroidNotificationPriority: enums,
    SchedulableTriggerInputTypes: enums, setNotificationHandler() {},
    async scheduleNotificationAsync(request) {
      await Promise.resolve();
      operations.push(['schedule', request.identifier]);
      pending.set(request.identifier, structuredClone(request));
      return request.identifier;
    },
    async getAllScheduledNotificationsAsync() { await Promise.resolve(); return [...pending.values()]; },
    async cancelScheduledNotificationAsync(id) { await Promise.resolve(); operations.push(['cancel', id]); pending.delete(id); },
    async getPresentedNotificationsAsync() { return []; },
    async dismissNotificationAsync() {},
    async cancelAllScheduledNotificationsAsync() { throw new Error('Global cancellation must not be used'); },
  };
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(__dirname, '../src', file);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, { exports, Date: Clock, console, setTimeout, clearTimeout,
      require(name) {
        if (name === 'expo-notifications') return native;
        if (name === 'react-native') return { Platform: { OS: platform }, Vibration: { vibrate() {} }, Linking: {} };
        return load(name + '.ts');
      },
    }, { filename });
    return exports;
  }
  return { ...load('notifications.ts'), ...load('medicationPlan.ts'), pending, operations, native,
    setClock(value) { clock = new Date(value).getTime(); }, now: () => new Clock() };
}
const dose = (patch = {}) => ({ id: 1, name: 'İlaç A', amount: '1 tablet', time: '14:00',
  status: 'pending', statusDate: '2026-09-07', stock: 20, ...patch });
const options = { enabled: true, privateMode: false, repeatNagEnabled: true, repeatNagCount: 3 };
const dayRequests = (requests, day) => requests.filter(r => r.content.data.date === day);

test('partial scheduling reports only confirmed alarms and retries missing requests', async () => {
  const api = setup();
  const schedule = api.native.scheduleNotificationAsync;
  let attempts = 0;
  api.native.scheduleNotificationAsync = async request => {
    if (++attempts === 3) throw new Error('Simulated OS quota');
    return schedule(request);
  };
  const expected = api.buildMedicationSchedule([dose()], options, api.now()).length;
  const partial = await api.syncMedicationNotifications([dose()], options);
  assert.equal(partial.count, 2);
  assert.equal(api.pending.size, 2);
  assert.equal(partial.incompleteCount, expected - 2);
  assert.equal(partial.refreshAfter, null);
  assert.equal(attempts, 3);

  api.native.scheduleNotificationAsync = schedule;
  api.operations.length = 0;
  const complete = await api.syncMedicationNotifications([dose()], options);
  assert.equal(complete.count, expected);
  assert.equal(complete.incompleteCount, 0);
  assert.ok(complete.refreshAfter);
  assert.equal(api.operations.filter(([op]) => op === 'schedule').length, expected - 2);
});

test('a failed first alarm never reports a ready plan', async () => {
  const api = setup();
  api.native.scheduleNotificationAsync = async () => { throw new Error('Simulated permission failure'); };
  const summary = await api.syncMedicationNotifications([dose()], options);
  assert.equal(summary.count, 0);
  assert.ok(summary.incompleteCount > 0);
  assert.equal(summary.refreshAfter, null);
  assert.equal(api.pending.size, 0);
});

test('unchanged alarms after a failure remain counted and are not rescheduled', async () => {
  const api = setup();
  const complete = await api.syncMedicationNotifications([dose()], options);
  api.pending.delete(api.pending.keys().next().value);
  api.native.scheduleNotificationAsync = async () => { throw new Error('Simulated OS quota'); };
  const summary = await api.syncMedicationNotifications([dose()], options);
  assert.equal(summary.count, complete.count - 1);
  assert.equal(summary.count, api.pending.size);
  assert.equal(summary.incompleteCount, 1);
  assert.equal(summary.refreshAfter, null);
});

test('expired and paused medicines produce no alarms', () => {
  const api = setup();
  for (const patch of [{ paused: true }, { durationMode: 'days', startDate: '2026-09-01', durationDays: 2 }]) {
    assert.equal(api.buildMedicationSchedule([dose(patch)], options, api.now()).length, 0);
  }
});

test('alternate/cycle plans skip off days and retain the next active day', () => {
  const api = setup();
  for (const frequencyType of ['alternate', 'cycle']) {
    const requests = api.buildMedicationSchedule([dose({ frequencyType, cycleStartDate: '2026-09-06', cyclePhase1Days: 1, cyclePhase2Days: 1 })], options, api.now());
    assert.equal(dayRequests(requests, '2026-09-07').length, 0);
    assert.equal(dayRequests(requests, '2026-09-08').length, 4);
  }
});

test('future start and finite end are respected, including the last treatment day', () => {
  const api = setup();
  const requests = api.buildMedicationSchedule([dose({ durationMode: 'days', startDate: '2026-09-09', durationDays: 2 })], options, api.now());
  assert.deepEqual([...new Set(requests.map(r => r.content.data.date))], ['2026-09-09', '2026-09-10']);
  assert.equal(dayRequests(api.buildMedicationSchedule([dose({ startDate: '2026-09-09' })], options, api.now()), '2026-09-07').length, 0);
});

test('variable plans use the amount for the actual scheduled day', () => {
  const api = setup();
  const requests = api.buildMedicationSchedule([dose({ frequencyType: 'variable', cycleStartDate: '2026-09-06', cyclePhase1Days: 1, cyclePhase1Amount: '1.5 tablet', cyclePhase2Days: 1, cyclePhase2Amount: '2 tablet' })], options, api.now());
  assert.match(dayRequests(requests, '2026-09-07')[0].content.body, /2 tablet/);
  assert.match(dayRequests(requests, '2026-09-08')[0].content.body, /1.5 tablet/);
});

test('default calculations follow the local calendar; midnight resets status and preserves history', () => {
  const api = setup('2026-09-07T23:59:00');
  let d = api.normalizeDoseDay(dose({ status: 'taken', slotStatuses: { '14:00': 'taken' } }));
  api.setClock('2026-09-08T00:01:00');
  d = api.normalizeDoseDay(d);
  assert.equal(api.slotStatus(d, '14:00'), 'pending');
  assert.equal(api.slotStatus(d, '14:00', '2026-09-07'), 'taken');
  assert.equal(d.stock, 20);
  assert.equal(api.getDurationInfo(dose({ durationMode: 'days', startDate: '2026-09-07', durationDays: 1 })).isExpired, true);
});

test('today confirmation leaves tomorrow scheduled and repeated confirmation does not reduce stock twice', () => {
  const api = setup();
  let d = api.updateDoseSlot(dose({ amount: '1.5 tablet' }), '14:00', '2026-09-07', 'taken');
  d = api.updateDoseSlot(d, '14:00', '2026-09-07', 'taken');
  assert.equal(d.stock, 18.5);
  const requests = api.buildMedicationSchedule([d], options, api.now());
  assert.equal(dayRequests(requests, '2026-09-07').length, 0);
  assert.equal(dayRequests(requests, '2026-09-08').length, 4);
});

test('early reminders and repeat reminders cross midnight with the original dose date intact', () => {
  const api = setup('2026-09-07T23:50:00');
  const early = api.buildMedicationSchedule([dose({ time: '00:05', startDate: '2026-09-08' })], { ...options, leadTimeMinutes: 10 }, api.now());
  assert.equal(new Date(early[0].content.data.fireAt).getDate(), 7);
  assert.equal(new Date(early[0].content.data.fireAt).getHours(), 23);
  assert.equal(early[0].content.data.date, '2026-09-08');
  const midnight = api.buildMedicationSchedule([dose({ time: '23:59' })], options, api.now());
  const repeat = dayRequests(midnight, '2026-09-07')[1];
  assert.equal(new Date(repeat.content.data.fireAt).getDate(), 8);
  assert.equal(new Date(repeat.content.data.fireAt).getMinutes(), 2);
});

test('snooze survives resync and targets the selected second slot', async () => {
  const api = setup();
  const d = dose({ time: '09:00', times: ['09:00', '14:00'] });
  await api.syncMedicationNotifications([d], options);
  await api.cancelDoseRepeatNotifications(d.id, '14:00');
  await api.snoozeNotification({ ...d, time: '14:00' }, 3);
  await api.syncMedicationNotifications([{ ...d, snooze: 3 }], options);
  const snoozes = [...api.pending.values()].filter(r => r.content.data.isSnooze);
  assert.equal(snoozes.length, 1);
  assert.equal(snoozes[0].content.data.time, '14:00');
  assert.equal(snoozes[0].content.data.fireAt, api.now().getTime() + 180000);
  const repeatToday = [...api.pending.values()].filter(r => r.content.data.date === '2026-09-07' && r.content.data.time === '14:00' && !r.content.data.isSnooze);
  assert.equal(repeatToday.length, 0);
});

test('confirmation, pause, deletion and disabling notifications remove a snooze', async () => {
  for (const action of ['taken', 'paused', 'deleted', 'disabled']) {
    const api = setup();
    await api.snoozeNotification(dose(), 3);
    const d = action === 'taken' ? dose({ status: 'taken' }) : dose({ paused: action === 'paused' });
    await api.syncMedicationNotifications(action === 'deleted' ? [] : [d], { ...options, enabled: action !== 'disabled' });
    assert.equal([...api.pending.values()].filter(r => r.content.data.isSnooze).length, 0, action);
  }
});

test('repeat cancellation preserves daily primary and future dates', async () => {
  const api = setup();
  await api.syncMedicationNotifications([dose()], options);
  await api.cancelDoseRepeatNotifications(1, '14:00');
  assert.equal(api.pending.has('dose-1-2026-09-07-14:00-main'), true);
  assert.equal(api.pending.has('dose-1-2026-09-07-14:00-repeat-1'), false);
  assert.equal(api.pending.has('dose-1-2026-09-08-14:00-repeat-1'), true);
});

test('concurrent reconciliations are serialized and unchanged alarms are not rescheduled', async () => {
  const api = setup();
  await Promise.all([api.syncMedicationNotifications([dose()], options), api.syncMedicationNotifications([dose({ paused: true })], options)]);
  assert.equal(api.pending.size, 0);
  await api.syncMedicationNotifications([dose()], options);
  api.operations.length = 0;
  await api.syncMedicationNotifications([dose()], options);
  assert.equal(api.operations.length, 0);
});

test('bounded queue reports when the plan must be refreshed and preserves unrelated requests', async () => {
  const api = setup('2026-09-07T12:00:00', 'ios');
  api.pending.set('unrelated', { identifier: 'unrelated', content: { data: {} } });
  const summary = await api.syncMedicationNotifications([dose(), dose({ id: 2 })], options);
  assert.equal(api.pending.size, 60);
  assert.ok(summary.refreshAfter);
  await api.syncMedicationNotifications([], { ...options, enabled: false });
  assert.equal(api.pending.size, 1);
  assert.equal(api.pending.has('unrelated'), true);
});

test('invalid or duplicate times never create malformed/duplicate alarms', () => {
  const api = setup();
  const requests = api.buildMedicationSchedule([dose({ times: ['14:00', '14:00', '25:90', 'abc'] })], options, api.now());
  assert.equal(dayRequests(requests, '2026-09-07').length, 4);
  assert.equal(new Set(requests.map(r => r.identifier)).size, requests.length);
});

test('snooze keeps its deadline when privacy changes and is removed if its slot is deleted', async () => {
  const api = setup();
  const d = dose({ times: ['14:00', '20:00'] });
  await api.snoozeNotification(d, 3);
  const deadline = api.now().getTime() + 180000;
  await api.syncMedicationNotifications([d], { ...options, privateMode: true });
  const snooze = [...api.pending.values()].find(r => r.content.data.isSnooze);
  assert.ok(snooze);
  assert.equal(snooze.content.data.fireAt, deadline);
  assert.doesNotMatch(snooze.content.body, /İlaç A/);
  await api.syncMedicationNotifications([dose({ time: '20:00', times: ['20:00'] })], options);
  assert.equal([...api.pending.values()].some(r => r.content.data.isSnooze), false);
});

test('after midnight, confirming a previous-day repeat does not complete today', () => {
  const api = setup('2026-09-08T00:02:00');
  const d = api.updateDoseSlot(dose({ time: '23:59' }), '23:59', '2026-09-07', 'taken');
  assert.equal(api.slotStatus(d, '23:59', '2026-09-07'), 'taken');
  assert.equal(api.slotStatus(d, '23:59', '2026-09-08'), 'pending');
  assert.equal(d.stock, 19);
  const requests = api.buildMedicationSchedule([d], options, api.now());
  assert.equal(dayRequests(requests, '2026-09-07').length, 0);
  assert.equal(dayRequests(requests, '2026-09-08').length, 4);
});

test('undated legacy records migrate once and plan anchors do not drift on later days', () => {
  const api = setup();
  let d = api.normalizeDoseDay(dose({ statusDate: undefined, frequencyType: 'alternate', durationMode: 'days' }));
  assert.equal(d.cycleStartDate, '2026-09-07');
  assert.equal(d.startDate, '2026-09-07');
  api.setClock('2026-09-08T12:00:00');
  d = api.normalizeDoseDay(d);
  assert.equal(d.cycleStartDate, '2026-09-07');
  assert.equal(api.getCycleInfo(d).isActiveToday, false);
});

test('calendar-day differences do not depend on daylight-saving day lengths', () => {
  const api = setup();
  assert.equal(api.getCalendarDayDiff('2026-03-07', '2026-03-09'), 2);
  assert.equal(api.getCalendarDayDiff('2026-10-31', '2026-11-02'), 2);
  assert.equal(api.getCalendarDayDiff('2026-09-09', '2026-09-07'), -2);
});
