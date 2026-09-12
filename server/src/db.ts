import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync, backup } from 'node:sqlite';
import { doseId, randomUUID } from './identity.js';

export class RutinDatabase {
  public sql!: DatabaseSync;
  public backupPath: string | null = null;
  constructor(private dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'rutin.sqlite')) {}
  async initAsync(dbPath = this.dbPath) {
    if (this.sql) return;
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.sql = new DatabaseSync(dbPath);
    this.sql.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const version = Number((this.sql.prepare('PRAGMA user_version').get() as any).user_version);
    if (version > 4) throw new Error('Veritabanı sürümü bu uygulamadan yeni.');
    if (version >= 2 && version <= 3) {
      const cols = (this.sql.prepare('PRAGMA table_info(users)').all() as any[]).map(c => c.name);
      if (!cols.includes('recovery_hash')) {
        this.sql.exec('ALTER TABLE users ADD COLUMN recovery_hash TEXT UNIQUE;');
      }
      if (!cols.includes('email')) {
        this.sql.exec('ALTER TABLE users ADD COLUMN email TEXT;');
        this.sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;');
      }
      this.sql.exec('PRAGMA user_version=4;');
      return;
    }
    if (version === 4) return;
    const legacy = (this.sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='doses'").get());
    if (legacy && dbPath !== ':memory:') {
      this.backupPath = `${dbPath}.pre-users-${Date.now()}.backup`;
      await backup(this.sql, this.backupPath);
      fs.chmodSync(this.backupPath, 0o600);
    }
    this.transaction(() => {
      if (legacy) this.sql.exec('ALTER TABLE doses RENAME TO legacy_doses; ALTER TABLE learned_meds RENAME TO legacy_learned_meds; ALTER TABLE settings RENAME TO legacy_settings; DROP INDEX IF EXISTS idx_doses_updated;');
      this.sql.exec(`
        CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, sync_hash TEXT UNIQUE,
          recovery_hash TEXT UNIQUE, is_legacy_owner INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
        CREATE TABLE devices (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
          installation_id TEXT NOT NULL, name TEXT NOT NULL, session_hash TEXT UNIQUE NOT NULL,
          csrf_hash TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('web','native')),
          expires_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL);
        CREATE INDEX devices_user ON devices(user_id);
        CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
        CREATE TABLE doses (user_id TEXT NOT NULL REFERENCES users(id), id TEXT NOT NULL,
          name TEXT NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER,
          PRIMARY KEY(user_id,id));
        CREATE INDEX idx_doses_updated ON doses(user_id,updated_at);
        CREATE TABLE learned_meds (user_id TEXT NOT NULL REFERENCES users(id), gtin TEXT NOT NULL,
          name TEXT NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,gtin));
        CREATE TABLE settings (user_id TEXT NOT NULL REFERENCES users(id), key TEXT NOT NULL,
          value TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,key));
      `);
      const owner = randomUUID();
      this.sql.prepare('INSERT INTO users(id,name,is_legacy_owner,created_at) VALUES(?,?,1,?)').run(owner, 'Mevcut kayıtların sahibi', Date.now());
      if (legacy) {
        for (const row of this.sql.prepare('SELECT * FROM legacy_doses').all() as any[]) {
          const data = JSON.parse(row.data); // Abort the entire migration rather than lose damaged records.
          data.id = doseId(owner, row.id);
          this.saveDose(owner, { ...data, name: row.name, updatedAt: row.updated_at, deletedAt: row.deleted_at });
        }
        this.sql.prepare('INSERT INTO learned_meds SELECT ?,gtin,name,data,updated_at FROM legacy_learned_meds').run(owner);
        this.sql.prepare('INSERT INTO settings SELECT ?,key,value,updated_at FROM legacy_settings').run(owner);
        this.sql.exec('DROP TABLE legacy_doses; DROP TABLE legacy_learned_meds; DROP TABLE legacy_settings;');
      }
      // Never retain old credentials in backups of application settings.
      this.sql.exec("DELETE FROM settings WHERE key NOT IN ('userName','notifications','soundEnabled','soundType','snoozeMinutes','leadTimeMinutes','privateMode','stockAlertsEnabled','defaultStockThreshold','hideDoseAmount','autoCollapseTaken','hapticsEnabled','language'); PRAGMA user_version=4;");
    });
  }
  transaction<T>(fn: () => T): T {
    this.sql.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.sql.exec('COMMIT'); return result; }
    catch (err) { this.sql.exec('ROLLBACK'); throw err; }
  }
  getAllDoses(userId: string): any[] {
    return this.sql.prepare('SELECT * FROM doses WHERE user_id=?').all(userId).map((r: any) => ({ ...JSON.parse(r.data), id: r.id, updatedAt: r.updated_at, deletedAt: r.deleted_at || undefined }));
  }
  saveDose(userId: string, dose: any) {
    this.sql.prepare(`INSERT INTO doses VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET name=excluded.name,data=excluded.data,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at`)
      .run(userId, dose.id, dose.name, JSON.stringify(dose), dose.updatedAt, dose.deletedAt || null);
  }
  getAllLearnedMeds(userId: string): Record<string, any> {
    return Object.fromEntries(this.sql.prepare('SELECT gtin,data FROM learned_meds WHERE user_id=?').all(userId).map((r: any) => [r.gtin, JSON.parse(r.data)]));
  }
  upsertLearnedMed(userId: string, gtin: string, med: any) {
    this.sql.prepare(`INSERT INTO learned_meds VALUES(?,?,?,?,?) ON CONFLICT(user_id,gtin) DO UPDATE SET name=excluded.name,data=excluded.data,updated_at=excluded.updated_at`)
      .run(userId, gtin, med.name || 'İlaç', JSON.stringify(med), Date.now());
  }
  getAllSettings(userId: string): Record<string, any> {
    const settings = Object.fromEntries(this.sql.prepare('SELECT key,value FROM settings WHERE user_id=?').all(userId).map((r: any) => [r.key, JSON.parse(r.value)]));
    if (!settings.userName) {
      const user = this.sql.prepare('SELECT name FROM users WHERE id=?').get(userId) as any;
      if (user?.name) settings.userName = user.name;
    }
    return settings;
  }
  upsertSetting(userId: string, key: string, value: any) {
    this.sql.prepare(`INSERT INTO settings VALUES(?,?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).run(userId, key, JSON.stringify(value), Date.now());
  }
  clearUserData(userId: string) {
    for (const table of ['doses','learned_meds','settings']) this.sql.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(userId);
  }
  close() { this.sql?.close(); }
}
