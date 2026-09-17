const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  const filename = path.resolve(__dirname, '../src', file.replace(/\.ts$/, '') + '.ts');
  if (cache.has(filename)) return cache.get(filename);
  const exports = {}; cache.set(filename, exports);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, Date, console, require: load }, { filename });
  return exports;
}
const { localDateKey, updateDoseSlot, slotStatus, normalizeDoseDay, buildHistorySlots, summarizeDay, dayAdherence, adherenceOverDays } = load('medicationPlan');
const { changeDoseRecord, undoDoseRecord } = load('doseUndo');
const { smartMergeDoses } = load('syncManager');
const today = localDateKey();
const fixture = (patch = {}) => ({ id: 'a', name: 'Test A', amount: '1 tablet', time: '09:00',
  times: ['09:00', '18:00'], status: 'pending', statusDate: today, stock: 30, ...patch });

test('undo touches only the selected dose and slot, preserving later edits and new records', () => {
  const a = changeDoseRecord([fixture(), fixture({ id: 'b' })], 'a', today, '09:00', 'taken');
  const later = changeDoseRecord(a.doses, 'a', today, '18:00', 'taken').doses;
  later[0] = { ...later[0], name: 'Edited name' };
  later[1] = { ...later[1], stock: 47 };
  later.push(fixture({ id: 'c' }));
  const result = undoDoseRecord(later, a.undo);
  assert.equal(result[0].stock, 29);
  assert.equal(result[0].name, 'Edited name');
  assert.equal(slotStatus(result[0], '18:00', today), 'taken');
  assert.equal(slotStatus(result[0], '09:00', today), 'pending');
  assert.equal(result[1], later[1]); assert.equal(result[2], later[2]);
  assert.equal(undoDoseRecord(result, a.undo), result);
});

test('changed slot and deleted dose invalidate a stale undo', () => {
  const a = changeDoseRecord([fixture()], 'a', today, '09:00', 'taken');
  const changed = changeDoseRecord(a.doses, 'a', today, '09:00', 'skipped').doses;
  assert.equal(undoDoseRecord(changed, a.undo), changed);
  const deleted = [{ ...a.doses[0], deletedAt: Date.now() }];
  assert.equal(undoDoseRecord(deleted, a.undo), deleted);
});

test('refund uses actual deduction even after dosage edits, zero stock and partial stock', () => {
  for (const stock of [0, 0.5, 30]) {
    const taken = updateDoseSlot(fixture({ stock, amount: '2 tablet' }), '09:00', today, 'taken');
    const edited = { ...taken, amount: '5 tablet', stock: taken.stock + 10 };
    const reverted = updateDoseSlot(edited, '09:00', today, 'pending');
    assert.equal(reverted.stock, stock + 10);
    assert.equal(updateDoseSlot(reverted, '09:00', today, 'pending'), reverted);
  }
});

test('yesterday correction survives midnight without resetting today or snooze', () => {
  const date = new Date(); date.setDate(date.getDate() - 1);
  const yesterday = localDateKey(date);
  const a = changeDoseRecord([fixture({ statusDate: yesterday })], 'a', yesterday, '09:00', 'taken');
  const current = updateDoseSlot(normalizeDoseDay(a.doses[0], today), '18:00', today, 'taken');
  const result = undoDoseRecord([{ ...current, snooze: 5 }], a.undo)[0];
  assert.equal(slotStatus(result, '09:00', yesterday), 'pending');
  assert.equal(slotStatus(result, '18:00', today), 'taken');
  assert.equal(result.statusDate, today); assert.equal(result.snooze, 5);
  assert.equal(result.stock, 29);
});

test('legacy taken records can be corrected without migration or schema reset', () => {
  const old = fixture({ status: 'taken', stock: 29, slotStatuses: { '09:00': 'taken' } });
  const result = updateDoseSlot(old, '09:00', today, 'pending');
  assert.equal(result.stock, 30); assert.equal(slotStatus(result, '09:00', today), 'pending');
});

test('explicit undo survives stale taken sync in both merge directions and JSON roundtrip', () => {
  const taken = changeDoseRecord([fixture()], 'a', today, '09:00', 'taken');
  const reverted = JSON.parse(JSON.stringify(undoDoseRecord(taken.doses, taken.undo)));
  for (const merged of [smartMergeDoses(reverted, taken.doses), smartMergeDoses(taken.doses, reverted)]) {
    assert.equal(slotStatus(merged[0], '09:00', today), 'pending');
    assert.equal(merged[0].slotStatuses['09:00'], 'pending');
    assert.equal(merged[0].stock, 30);
  }
});

const historyDose = (patch = {}) => ({ id: 'h1', name: 'Geçmiş İlacı', amount: '1 tablet',
  time: '09:00', times: ['09:00', '21:00'], status: 'pending', statusDate: '2026-09-15', stock: 30, ...patch });

test('reverting yesterday keeps the dose listed as unrecorded so it can be corrected', () => {
  const taken = updateDoseSlot(historyDose(), '09:00', '2026-09-15', 'taken');
  const reverted = updateDoseSlot(taken, '09:00', '2026-09-15', 'pending');
  assert.equal(slotStatus(reverted, '09:00', '2026-09-15'), 'pending');

  const past = buildHistorySlots([reverted], '2026-09-15', { includeUnrecorded: true });
  assert.deepEqual(past.map(slot => [slot.time, slot.status]), [['09:00', 'pending'], ['21:00', 'pending']]);
  assert.equal(past[0].todayAmount, '1 tablet');

  // Today's screen already lists pending doses, so History must not duplicate them.
  assert.deepEqual(buildHistorySlots([reverted], '2026-09-15').map(slot => slot.time), []);
});

test('history lists recorded slots and hides unrecorded ones for inactive medicines', () => {
  const recorded = updateDoseSlot(historyDose(), '21:00', '2026-09-15', 'skipped');
  const rows = buildHistorySlots([recorded], '2026-09-15', { includeUnrecorded: true });
  assert.deepEqual(rows.map(slot => [slot.time, slot.status]), [['09:00', 'pending'], ['21:00', 'skipped']]);

  // A deleted medicine no longer accepts records, so it is marked deleted after the fact.
  for (const patch of [{ paused: true }, { durationMode: 'days', startDate: '2026-09-01', durationDays: 2 },
    { frequencyType: 'alternate', cycleStartDate: '2026-09-14' }, { deletedAfterRecord: true }]) {
    const { deletedAfterRecord, ...dosePatch } = patch;
    const marked = updateDoseSlot(historyDose(dosePatch), '21:00', '2026-09-15', 'skipped');
    const inactive = deletedAfterRecord ? { ...marked, deletedAt: Date.now() } : marked;
    const listed = buildHistorySlots([inactive], '2026-09-15', { includeUnrecorded: true });
    assert.deepEqual(listed.map(slot => [slot.time, slot.status]), [['21:00', 'skipped']],
      `unrecorded slots must stay hidden for ${JSON.stringify(patch)}`);
  }
});

test('history keeps slot amounts and legacy records that are no longer in the plan', () => {
  // Legacy per-day statuses apply to days other than the dose's own statusDate.
  const dose = historyDose({ times: ['09:00'], slotAmounts: { '09:00': '2 tablet' },
    statusDate: '2026-09-16', dailyStatuses: { '2026-09-15': { '13:00': 'taken' } } });
  const rows = buildHistorySlots([dose], '2026-09-15', { includeUnrecorded: true });
  assert.deepEqual(rows.map(slot => [slot.time, slot.status, slot.todayAmount]),
    [['09:00', 'pending', '2 tablet'], ['13:00', 'taken', '1 tablet']]);
});

test('days before a back-dated medicine was tracked are not listed as unrecorded', () => {
  const added = historyDose({ startDate: '2026-09-01', statusDate: '2026-09-15' });
  assert.deepEqual(buildHistorySlots([added], '2026-09-14', { includeUnrecorded: true }), []);
  assert.equal(buildHistorySlots([added], '2026-09-15', { includeUnrecorded: true }).length, 2);
  // Once the app rolled over from an earlier day, that day is tracked too.
  const rolled = normalizeDoseDay(historyDose({ startDate: '2026-09-01', statusDate: '2026-09-13' }), '2026-09-15');
  assert.equal(buildHistorySlots([rolled], '2026-09-13', { includeUnrecorded: true }).length, 2);
  assert.deepEqual(buildHistorySlots([rolled], '2026-09-12', { includeUnrecorded: true }), []);
});

test('day summary and adherence state reflect taken, skipped and unmarked doses', () => {
  const taken = updateDoseSlot(historyDose(), '09:00', '2026-09-15', 'taken');
  const both = updateDoseSlot(taken, '21:00', '2026-09-15', 'skipped');
  // Results come from the vm realm; spread them so strict equality compares values only.
  assert.deepEqual({ ...summarizeDay([taken], '2026-09-15') }, { total: 2, taken: 1, skipped: 0, unrecorded: 1 });
  assert.deepEqual({ ...summarizeDay([both], '2026-09-15') }, { total: 2, taken: 1, skipped: 1, unrecorded: 0 });

  const day = (patch) => ({ total: 2, taken: 0, skipped: 0, unrecorded: 0, ...patch });
  assert.equal(dayAdherence(day({ total: 0 }), false), 'none');
  assert.equal(dayAdherence(day({ taken: 2 }), false), 'complete');
  assert.equal(dayAdherence(day({ taken: 1, unrecorded: 1 }), true), 'open');
  assert.equal(dayAdherence(day({ taken: 1, unrecorded: 1 }), false), 'partial');
  assert.equal(dayAdherence(day({ skipped: 2 }), false), 'missed');
  assert.equal(dayAdherence(day({ unrecorded: 2 }), true), 'open');
});

test('multi-day adherence does not count today\'s unmarked doses as missed', () => {
  const yesterday = updateDoseSlot(historyDose({ statusDate: '2026-09-14' }), '09:00', '2026-09-14', 'taken');
  const today = normalizeDoseDay(updateDoseSlot(yesterday, '09:00', '2026-09-15', 'taken'), '2026-09-15');
  // 14th: one of two taken; 15th: one taken and 21:00 still open.
  const days = ['2026-09-14', '2026-09-15'].map(date => ({ date, summary: summarizeDay([today], date) }));
  assert.deepEqual({ ...adherenceOverDays(days, '2026-09-15') }, { taken: 2, due: 3 });
});
