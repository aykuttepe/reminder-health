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
const { localDateKey, updateDoseSlot, slotStatus, normalizeDoseDay } = load('medicationPlan');
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
