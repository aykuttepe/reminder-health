import test from 'node:test';
import assert from 'node:assert/strict';
import { RutinDatabase } from '../dist/db.js';
import { AuthService } from '../dist/auth.js';
import { SyncService } from '../dist/syncService.js';

test('multi-tenant sync, device management, and recovery flow', async () => {
  const db = new RutinDatabase(':memory:');
  await db.initAsync();
  const auth = new AuthService(db);
  const sync = new SyncService(db);

  // 1. Create User 1 and User 2
  const u1 = auth.createUser('Aykut');
  assert.ok(u1.userId);
  assert.equal(u1.name, 'Aykut');
  assert.equal(u1.syncCode.length, 43);
  assert.match(u1.recoveryKey, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);

  const u2 = auth.createUser('Deneme');
  assert.ok(u2.userId);
  assert.notEqual(u1.userId, u2.userId);

  // 2. Connect Device 1 for User 1
  const dev1 = auth.login({
    code: u1.syncCode,
    deviceId: '11111111-1111-1111-1111-111111111111',
    deviceName: 'iPhone 15',
    kind: 'native',
  }, '127.0.0.1');
  assert.ok(dev1.token);
  assert.equal(dev1.user.id, u1.userId);

  // 3. Connect Device 2 for User 1 (same account, second device)
  const dev2 = auth.login({
    code: u1.syncCode,
    deviceId: '22222222-2222-2222-2222-222222222222',
    deviceName: 'Pixel 10',
    kind: 'native',
  }, '127.0.0.1');
  assert.ok(dev2.token);
  assert.notEqual(dev1.token, dev2.token);
  assert.equal(dev2.user.id, u1.userId);

  // 4. Device 1 pushes a medication
  const sync1 = sync.processSync(u1.userId, {
    doses: [
      {
        id: '1',
        name: 'Parol 500mg',
        amount: '1 tablet',
        time: '09:00',
        status: 'pending',
        updatedAt: 1000,
      }
    ],
    settings: { userName: 'Aykut', snoozeMinutes: 15 },
  });
  assert.equal(sync1.success, true);
  assert.equal(sync1.doses.length, 1);
  const u1DoseId = sync1.doses[0].id;
  assert.match(u1DoseId, /^[0-9a-f-]{36}$/i);

  // 5. Device 2 syncs and marks dose as taken, adds second dose
  const sync2 = sync.processSync(u1.userId, {
    doses: [
      {
        id: u1DoseId,
        name: 'Parol 500mg',
        amount: '1 tablet',
        time: '09:00',
        status: 'taken',
        slotStatuses: { '09:00': 'taken' },
        updatedAt: 2000,
      },
      {
        id: '2',
        name: 'Aspirin 100mg',
        amount: '1 tablet',
        time: '20:00',
        status: 'pending',
        updatedAt: 2000,
      }
    ],
  });
  assert.equal(sync2.doses.length, 2);
  const aspirin = sync2.doses.find(d => d.name === 'Aspirin 100mg');
  assert.ok(aspirin);

  // 6. Verify User 2 data isolation
  const u2Sync = sync.processSync(u2.userId, {});
  assert.equal(u2Sync.doses.length, 0, 'User 2 must have zero doses from User 1');
  assert.deepEqual(u2Sync.settings, { userName: 'Deneme' }, 'User 2 must not see User 1 settings');

  // 7. Test Recovery Key flow
  const recoveryResult = auth.recoverWithKey({
    recoveryKey: u1.recoveryKey.toLowerCase().replace(/-/g, ' '),
    deviceId: '33333333-3333-3333-3333-333333333333',
    deviceName: 'MacBook Pro',
    kind: 'native',
  }, '127.0.0.1');

  assert.ok(recoveryResult.token);
  assert.equal(recoveryResult.user.id, u1.userId);
  assert.notEqual(recoveryResult.newSyncCode, u1.syncCode);
  assert.notEqual(recoveryResult.newRecoveryKey, u1.recoveryKey);

  // 8. Verify old sessions were invalidated
  assert.throws(() => {
    auth.session(dev1.token, 'native');
  }, /Oturum sona erdi/);

  assert.throws(() => {
    auth.session(dev2.token, 'native');
  }, /Oturum sona erdi/);

  // 9. Verify old syncCode is rejected
  assert.throws(() => {
    auth.login({
      code: u1.syncCode,
      deviceId: '44444444-4444-4444-4444-444444444444',
      kind: 'native',
    }, '127.0.0.1');
  }, /Eşitleme kodu geçersiz/);

  // 10. Verify new syncCode works
  const newDev = auth.login({
    code: recoveryResult.newSyncCode,
    deviceId: '44444444-4444-4444-4444-444444444444',
    deviceName: 'New Device',
    kind: 'native',
  }, '127.0.0.1');
  assert.equal(newDev.user.id, u1.userId);

  // 11. Verify User 1 data is still intact
  const u1DosesAfterRecovery = db.getAllDoses(u1.userId);
  assert.equal(u1DosesAfterRecovery.length, 2);

  // 12. Admin rotate code
  const rotated = auth.rotateCode(u1.userId);
  assert.ok(rotated.syncCode);
  assert.ok(rotated.recoveryKey);
  assert.notEqual(rotated.syncCode, recoveryResult.newSyncCode);

  // 13. Test unique email support
  const userWithEmail = auth.createUser('Aykut Test', 'aykut@example.com');
  assert.equal(userWithEmail.email, 'aykut@example.com');

  // Reject duplicate email
  assert.throws(() => {
    auth.createUser('Another User', 'AYKUT@example.com');
  }, /Bu e-posta adresiyle kayıtlı bir hesap zaten var/);

  // Reject invalid email format
  assert.throws(() => {
    auth.createUser('Invalid User', 'not-an-email');
  }, /Geçersiz e-posta adresi biçimi/);

  // Update email
  const updatedEmail = auth.updateEmail(u1.userId, 'aykut.personal@example.com');
  assert.equal(updatedEmail.email, 'aykut.personal@example.com');

  // Reject duplicate on update
  assert.throws(() => {
    auth.updateEmail(u2.userId, 'aykut.personal@example.com');
  }, /Bu e-posta adresi başka bir hesap tarafından kullanılıyor/);

  db.close();
});
