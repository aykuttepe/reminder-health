import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { RutinDatabase } from '../dist/db.js';
import { AuthService } from '../dist/auth.js';
import { SyncService } from '../dist/syncService.js';

async function fixture(t, version, hasRecovery) {
  const dir = mkdtempSync(join(tmpdir(), 'reminder-schema-test-'));
  const file = join(dir, 'test.sqlite');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const initial = new RutinDatabase(file);
  await initial.initAsync();
  const user = new AuthService(initial).createUser('Migration test');
  const saved = new SyncService(initial).processSync(user.userId, {
    doses: [{ id: 101, name: 'Test medicine', time: '09:00', status: 'pending', updatedAt: 1000 }],
    settings: { language: 'en' },
  });
  initial.close();
  const old = new DatabaseSync(file);
  old.exec(`
    PRAGMA foreign_keys=OFF;
    BEGIN;
    CREATE TABLE old_users (id TEXT PRIMARY KEY, name TEXT NOT NULL, sync_hash TEXT UNIQUE,
      ${hasRecovery ? 'recovery_hash TEXT UNIQUE,' : ''}
      is_legacy_owner INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
    INSERT INTO old_users SELECT id,name,sync_hash,${hasRecovery ? 'recovery_hash,' : ''}is_legacy_owner,created_at FROM users;
    DROP TABLE users;
    ALTER TABLE old_users RENAME TO users;
    PRAGMA user_version=${version};
    COMMIT;
  `);
  old.close();
  return { file, user, saved };
}

for (const [version, hasRecovery] of [[2, false], [3, false], [3, true]]) {
  test(`schema v${version} upgrade preserves data, authentication and uniqueness (recovery=${hasRecovery})`, async t => {
    const { file, user, saved } = await fixture(t, version, hasRecovery);
    const db = new RutinDatabase(file);
    try {
      await db.initAsync();
      assert.equal(db.sql.prepare('PRAGMA user_version').get().user_version, 4);
      assert.deepEqual(db.getAllDoses(user.userId), saved.doses);
      assert.equal(db.getAllSettings(user.userId).language, 'en');
      assert.deepEqual(db.sql.prepare('PRAGMA foreign_key_check').all(), []);
      const auth = new AuthService(db);
      assert.equal(auth.login({ code: user.syncCode, deviceId: 'migration-device', kind: 'native' }, 'test').user.id, user.userId);
      if (hasRecovery) {
        assert.equal(auth.recoverWithKey({ recoveryKey: user.recoveryKey, deviceId: 'recovery-device', kind: 'native' }, 'test').user.id, user.userId);
      }
      const other = auth.createUser('Other user');
      db.sql.prepare('UPDATE users SET recovery_hash=? WHERE id=?').run('unique-recovery', user.userId);
      assert.throws(() => db.sql.prepare('UPDATE users SET recovery_hash=? WHERE id=?').run('unique-recovery', other.userId), /UNIQUE/);
      auth.updateEmail(user.userId, 'owner@example.test');
      assert.throws(() => auth.updateEmail(other.userId, 'owner@example.test'));
      const backup = new DatabaseSync(db.backupPath, { readOnly: true });
      try {
        assert.equal(backup.prepare('PRAGMA user_version').get().user_version, version);
        assert.equal(backup.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
        assert.equal(backup.prepare('SELECT COUNT(*) AS count FROM doses').get().count, 1);
      } finally { backup.close(); }
    } finally { db.close(); }
    const reopened = new RutinDatabase(file);
    try {
      await reopened.initAsync();
      assert.equal(reopened.backupPath, null);
      assert.equal(reopened.getAllDoses(user.userId).length, 1);
    } finally { reopened.close(); }
  });
}
