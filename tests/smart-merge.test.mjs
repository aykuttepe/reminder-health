import test from 'node:test';
import assert from 'node:assert/strict';
import {
  smartMergeDoses,
  smartMergeLearnedMeds,
  validateBackupJSON,
  createBackupPayload,
} from '../src/syncManager.ts';

test('smartMergeDoses: adds new remote doses and keeps existing local ones', () => {
  const localDoses = [
    { id: 1, name: 'Parol', amount: '500 mg', time: '09:00', status: 'pending', updatedAt: 1000 },
  ];
  const remoteDoses = [
    { id: 2, name: 'Coraspin', amount: '100 mg', time: '12:00', status: 'pending', updatedAt: 1100 },
  ];

  const merged = smartMergeDoses(localDoses, remoteDoses);
  assert.equal(merged.length, 2);
  const names = merged.map(d => d.name).sort();
  assert.deepEqual(names, ['Coraspin', 'Parol']);
});

test('smartMergeDoses: resolves conflict using Last-Write-Wins (LWW) based on updatedAt', () => {
  // Scenario A: Local is newer
  const localNewer = [
    { id: 1, name: 'Arveles (Updated Local)', amount: '25 mg', time: '08:00', status: 'pending', updatedAt: 2000 },
  ];
  const remoteOlder = [
    { id: 1, name: 'Arveles (Older Remote)', amount: '25 mg', time: '08:00', status: 'pending', updatedAt: 1000 },
  ];
  const mergedLocalWins = smartMergeDoses(localNewer, remoteOlder);
  assert.equal(mergedLocalWins.length, 1);
  assert.equal(mergedLocalWins[0].name, 'Arveles (Updated Local)');

  // Scenario B: Remote is newer
  const localOlder = [
    { id: 1, name: 'Arveles (Older Local)', amount: '25 mg', time: '08:00', status: 'pending', updatedAt: 1000 },
  ];
  const remoteNewer = [
    { id: 1, name: 'Arveles (Newer Remote)', amount: '25 mg', time: '08:00', status: 'pending', updatedAt: 3000 },
  ];
  const mergedRemoteWins = smartMergeDoses(localOlder, remoteNewer);
  assert.equal(mergedRemoteWins.length, 1);
  assert.equal(mergedRemoteWins[0].name, 'Arveles (Newer Remote)');
});

test('smartMergeDoses: deep merges slot statuses across different devices', () => {
  // Device A marked 08:00 dose as taken
  const deviceA = [
    {
      id: 1,
      name: 'Nexium',
      amount: '40 mg',
      time: '08:00',
      times: ['08:00', '20:00'],
      status: 'taken',
      slotStatuses: { '08:00': 'taken' },
      updatedAt: 1500,
    },
  ];
  // Device B later marked 20:00 dose as taken
  const deviceB = [
    {
      id: 1,
      name: 'Nexium',
      amount: '40 mg',
      time: '08:00',
      times: ['08:00', '20:00'],
      status: 'taken',
      slotStatuses: { '20:00': 'taken' },
      updatedAt: 2000,
    },
  ];

  const merged = smartMergeDoses(deviceA, deviceB);
  assert.equal(merged.length, 1);
  // Both slots must be preserved as taken!
  assert.equal(merged[0].slotStatuses?.['08:00'], 'taken');
  assert.equal(merged[0].slotStatuses?.['20:00'], 'taken');
});

test('smartMergeDoses: respects tombstone deletion so deleted medicines do not resurrect', () => {
  const localActive = [
    { id: 1, name: 'Euthyrox', amount: '50 mcg', time: '07:00', status: 'pending', updatedAt: 1000 },
    { id: 2, name: 'Glifor', amount: '1000 mg', time: '12:00', status: 'pending', updatedAt: 1000 },
  ];
  // Remote deleted Euthyrox at timestamp 2000
  const remoteWithDeletion = [
    { id: 1, name: 'Euthyrox', amount: '50 mcg', time: '07:00', status: 'pending', updatedAt: 2000, deletedAt: 2000 },
    { id: 2, name: 'Glifor', amount: '1000 mg', time: '12:00', status: 'pending', updatedAt: 1000 },
  ];

  const merged = smartMergeDoses(localActive, remoteWithDeletion);
  // Euthyrox should NOT be present in active doses
  const activeNames = merged.filter(d => !d.deletedAt).map(d => d.name);
  assert.deepEqual(activeNames, ['Glifor']);
});

test('smartMergeLearnedMeds: combines catalog entries from multiple devices', () => {
  const localLearned = {
    '08699546011122': { gtin: '08699546011122', name: 'Coraspin', amount: '100 mg' },
  };
  const remoteLearned = {
    '08699508010071': { gtin: '08699508010071', name: 'Parol', amount: '500 mg' },
  };

  const merged = smartMergeLearnedMeds(localLearned, remoteLearned);
  assert.equal(Object.keys(merged).length, 2);
  assert.equal(merged['08699546011122']?.name, 'Coraspin');
  assert.equal(merged['08699508010071']?.name, 'Parol');
});

test('validateBackupJSON and createBackupPayload: correctly creates and validates full backup JSON', () => {
  const doses = [{ id: 1, name: 'Parol', amount: '500 mg', time: '09:00', status: 'pending' }];
  const settings = { userName: 'Ahmet', privateMode: false };
  const learnedMeds = { '08699508010071': { gtin: '08699508010071', name: 'Parol' } };

  const payload = createBackupPayload({ doses, settings, learnedMeds });
  assert.equal(payload.version, 1);
  assert.ok(payload.exportedAt);

  const validation = validateBackupJSON(JSON.stringify(payload));
  assert.equal(validation.valid, true);
  assert.equal(validation.data?.doses.length, 1);
  assert.equal(validation.data?.settings?.userName, 'Ahmet');

  // Invalid JSON test
  const invalidValidation = validateBackupJSON('{"version": 99}');
  assert.equal(invalidValidation.valid, false);
});
