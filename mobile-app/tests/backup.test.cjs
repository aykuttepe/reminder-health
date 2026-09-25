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
const {
  buildBackupFile, parseBackup, summarizeBackup, settingsForRestore, prepareRestoredDoses,
  isBackupForeignToAccount, backupFileName, MAX_BACKUP_CHARS,
} = load('backup');
// Objects created inside the vm context carry its prototypes; compare plain copies.
const plain = value => JSON.parse(JSON.stringify(value));

const appointment = { id: 'appt-1', doctorName: 'Dr. A', specialty: 'Göz', hospital: 'H', date: '2026-10-01',
  time: '13:00', leadOptions: ['1d'], hasBloodTest: false, createdAt: 1, updatedAt: 1 };
const doses = [
  { id: 'a', name: 'Test A', amount: '1 tablet', time: '09:00', times: ['09:00', '21:00'], status: 'pending', stock: 12,
    dailyStatuses: { '2026-09-20': { '09:00': 'taken' } }, updatedAt: 100 },
  { id: 'b', name: 'Deleted B', amount: '1 tablet', time: '08:00', status: 'pending', updatedAt: 50, deletedAt: 60 },
];
const settings = {
  userName: 'Ayşe', notifications: true, soundType: 'chime', snoozeMinutes: 10, doctorApptLeadOptions: ['1d', '0d'],
  appointments: JSON.stringify([appointment]),
};

test('an exported backup restores medicines, history, appointments and settings unchanged', () => {
  const file = buildBackupFile({ ownerId: 'user-1', appVersion: '1.2.6', language: 'tr', doses, settings,
    learnedMeds: { '869': { name: 'X' } }, now: new Date('2026-09-26T08:00:00Z') });
  const result = parseBackup(JSON.stringify(file, null, 2));
  assert.equal(result.ok, true);
  const { backup } = result;
  assert.equal(backup.version, 3);
  assert.equal(backup.ownerId, 'user-1');
  assert.equal(backup.language, 'tr');
  assert.equal(backup.hasAppointments, true);
  assert.deepEqual(plain(backup.doses), doses);
  assert.deepEqual(plain(backup.learnedMeds), { '869': { name: 'X' } });
  assert.deepEqual(JSON.parse(backup.settings.appointments), [appointment]);
  assert.equal(backup.settings.userName, 'Ayşe');
  assert.deepEqual(plain(summarizeBackup(backup)), { medicines: 1, appointments: 1, exportedAt: '2026-09-26T08:00:00.000Z' });
});

test('a backup with appointments replaces the current ones on restore', () => {
  const { backup } = parseBackup(JSON.stringify(buildBackupFile({ doses, settings, learnedMeds: {} })));
  assert.deepEqual(JSON.parse(settingsForRestore(backup, '[]').appointments), [appointment]);
});

test('permission toggles from 1.2.6 backups are ignored', () => {
  const { backup } = parseBackup(JSON.stringify({ version: 3, doses: [],
    settings: { exactAlarmEnabled: false, batteryExemptionEnabled: false, wakeScreenOnAlarm: false } }));
  assert.deepEqual(plain(backup.settings), {});
});

test('an old backup without appointments keeps the current appointments', () => {
  const legacy = { version: 1, exportedAt: '2026-01-01T00:00:00Z', doses, settings: { userName: 'Ali' } };
  const { backup } = parseBackup(JSON.stringify(legacy));
  assert.equal(backup.hasAppointments, false);
  assert.equal(summarizeBackup(backup).appointments, null);
  const current = JSON.stringify([appointment]);
  assert.equal(settingsForRestore(backup, current).appointments, current);
});

test('appointments exported as an array by older builds are accepted', () => {
  const { backup } = parseBackup(JSON.stringify({ version: 2, doses: [], settings: { appointments: [appointment] } }));
  assert.deepEqual(JSON.parse(backup.settings.appointments), [appointment]);
});

test('settings with unknown keys or wrong types are dropped, not applied', () => {
  const { backup } = parseBackup(JSON.stringify({ version: 3, doses: [], settings: {
    userName: 42, snoozeMinutes: 'ten', soundType: 'siren', hapticsEnabled: false, injected: 'x',
    doctorApptLeadOptions: ['1d', 3],
  } }));
  assert.deepEqual(plain(backup.settings), { hapticsEnabled: false });
});

test('invalid files are rejected with a specific reason and nothing to apply', () => {
  const cases = [
    ['{ not json', 'invalid-json'],
    ['[]', 'not-object'],
    [JSON.stringify({ version: 9, doses: [] }), 'unsupported-version'],
    [JSON.stringify({ version: 3 }), 'missing-doses'],
    [JSON.stringify({ version: 3, doses: [doses[0], { id: 'x', time: '09:00' }] }), 'invalid-dose'],
    [JSON.stringify({ version: 3, doses: [], settings: { appointments: '{bad' } }), 'invalid-appointments'],
    [JSON.stringify({ version: 3, doses: [], settings: { appointments: [{ id: 1 }] } }), 'invalid-appointments'],
    ['x'.repeat(MAX_BACKUP_CHARS + 1), 'too-large'],
  ];
  for (const [text, error] of cases) {
    const result = parseBackup(text);
    assert.equal(result.ok, false, error);
    assert.equal(result.error, error);
  }
  assert.equal(parseBackup(JSON.stringify({ version: 3, doses: [doses[0], { id: 'x', time: '09:00' }] })).detail, '2');
});

test('a byte order mark added by a file app does not break parsing', () => {
  assert.equal(parseBackup('﻿' + JSON.stringify({ version: 3, doses: [] })).ok, true);
});

test('a backup from another account is refused only while signed in to a different account', () => {
  assert.equal(isBackupForeignToAccount('user-1', 'user-2'), true);
  assert.equal(isBackupForeignToAccount('user-1', 'user-1'), false);
  assert.equal(isBackupForeignToAccount('user-1', undefined), false);
  assert.equal(isBackupForeignToAccount(undefined, 'user-2'), false);
});

test('restored medicines win the next sync while deletions keep their timestamps', () => {
  const [active, deleted] = prepareRestoredDoses(doses, 5000);
  assert.equal(active.updatedAt, 5000);
  assert.deepEqual(plain(active.dailyStatuses), doses[0].dailyStatuses);
  assert.equal(deleted.updatedAt, 50);
  assert.equal(deleted.deletedAt, 60);
  assert.equal(doses[0].updatedAt, 100, 'input is not mutated');
});

test('backup file names carry the local date and time to the minute', () => {
  assert.equal(backupFileName(new Date(2026, 8, 6, 7, 5)), 'reminder-health-yedek-2026-09-06-0705.json');
});
