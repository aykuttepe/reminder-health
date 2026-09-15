import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RutinDatabase } from '../dist/db.js';
import { AuthService } from '../dist/auth.js';
import { SyncService } from '../dist/syncService.js';

test('explicit correction survives server storage, stale replays, and another account', async () => {
  const db = new RutinDatabase(':memory:');
  await db.initAsync();
  const auth = new AuthService(db); const sync = new SyncService(db);
  const first = auth.createUser('Undo test'); const other = auth.createUser('Other test');
  const taken = { id: '1', name: 'Test medicine', amount: '1 tablet', time: '09:00',
    statusDate: '2026-09-15', status: 'taken', stock: 29, updatedAt: 100,
    slotStatuses: { '09:00': 'taken' },
    doseRecords: { '2026-09-15': { '09:00': { status: 'taken', updatedAt: 100, stockDebited: 1 } } } };
  const saved = sync.processSync(first.userId, { doses: [taken] }).doses[0];
  const corrected = { ...saved, status: 'pending', stock: 30, updatedAt: 200,
    slotStatuses: { '09:00': 'pending' },
    doseRecords: { '2026-09-15': { '09:00': { status: 'pending', updatedAt: 200, stockDebited: 0 } } } };
  sync.processSync(first.userId, { doses: [corrected] });
  const replay = sync.processSync(first.userId, { doses: [saved] }).doses[0];
  assert.equal(replay.stock, 30);
  assert.equal(replay.slotStatuses['09:00'], 'pending');
  assert.equal(replay.doseRecords['2026-09-15']['09:00'].status, 'pending');
  assert.equal(sync.processSync(other.userId, {}).doses.length, 0);
  assert.throws(() => sync.processSync(first.userId, { doses: [{ ...corrected,
    doseRecords: { '2026-09-15': { '09:00': { status: 'pending', updatedAt: 300, stockDebited: -1 } } },
  }] }), /Geçersiz/);
});

test('server and native clients use the same record validation and merge rules', () => {
  assert.equal(fs.readFileSync(new URL('../src/doseRecords.ts', import.meta.url), 'utf8'),
    fs.readFileSync(new URL('../../mobile-app/src/doseRecords.ts', import.meta.url), 'utf8'));
});
