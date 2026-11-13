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
const { addDaysToKey, historyWindowEnd, monthGridKeys, firstTrackedDay } = load('medicationPlan');

test('addDaysToKey crosses month and year boundaries', () => {
  assert.equal(addDaysToKey('2026-11-01', -1), '2026-10-31');
  assert.equal(addDaysToKey('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysToKey('2024-02-28', 1), '2024-02-29');
});

test('historyWindowEnd keeps the newest window ending today and steps back in whole weeks', () => {
  const today = '2026-11-14';
  for (const day of ['2026-11-14', '2026-11-11', '2026-11-08']) assert.equal(historyWindowEnd(day, today), today);
  assert.equal(historyWindowEnd('2026-11-07', today), '2026-11-07');
  assert.equal(historyWindowEnd('2026-11-01', today), '2026-11-07');
  assert.equal(historyWindowEnd('2026-10-31', today), '2026-10-31');
  // A day after today (clock moved back) still maps to the latest window.
  assert.equal(historyWindowEnd('2026-11-20', today), today);
});

test('monthGridKeys starts weeks on Monday and pads with null', () => {
  const rows = monthGridKeys(2026, 10); // November 2026 starts on a Sunday
  assert.equal(rows[0].length, 7);
  // Arrays come from the vm sandbox (another realm), so compare their JSON form.
  assert.equal(JSON.stringify(rows[0]), JSON.stringify([null, null, null, null, null, null, '2026-11-01']));
  const days = rows.flat().filter(Boolean);
  assert.equal(days.length, 30);
  assert.equal(days.at(-1), '2026-11-30');
  assert.equal(rows.flat().length % 7, 0);
  const feb = monthGridKeys(2027, 1); // February 2027 starts on a Monday
  assert.equal(feb[0][0], '2027-02-01');
});

test('firstTrackedDay is the earliest status or record across medicines, deleted ones included', () => {
  assert.equal(firstTrackedDay([]), null);
  assert.equal(firstTrackedDay([{ id: 'a' }]), null);
  const doses = [
    { id: 'a', statusDate: '2026-11-10', dailyStatuses: { '2026-11-02': { '09:00': 'taken' } } },
    { id: 'b', deletedAt: 1, doseRecords: { '2026-09-09': { '07:42': { status: 'taken', updatedAt: 1, stockDebited: 1 } } } },
  ];
  assert.equal(firstTrackedDay(doses), '2026-09-09');
});
