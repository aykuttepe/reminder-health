import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync, backup } from 'node:sqlite';
import { doseId, randomUUID } from './identity.js';
import { seedMedCatalog } from './catalogSeed.js';

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
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS med_catalog (
        gtin TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount TEXT,
        form TEXT,
        meal_condition TEXT,
        instructions TEXT,
        active_ingredient TEXT,
        default_stock INTEGER,
        stock_threshold INTEGER,
        full_name TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_med_catalog_name ON med_catalog(name);
    `);
    seedMedCatalog(this.sql);
    const version = Number((this.sql.prepare('PRAGMA user_version').get() as any).user_version);
    if (version > 4) throw new Error('Veritabanı sürümü bu uygulamadan yeni.');
    if (version === 4) return;
    const legacy = this.sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='doses'").get();
    if ((legacy || version >= 2) && dbPath !== ':memory:') {
      this.backupPath = `${dbPath}.pre-users-${Date.now()}.backup`;
      await backup(this.sql, this.backupPath);
      fs.chmodSync(this.backupPath, 0o600);
    }
    if (version >= 2 && version <= 3) {
      this.transaction(() => {
        const cols = (this.sql.prepare('PRAGMA table_info(users)').all() as any[]).map(c => c.name);
        if (!cols.includes('recovery_hash')) {
          this.sql.exec('ALTER TABLE users ADD COLUMN recovery_hash TEXT;');
        }
        this.sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_recovery_hash ON users(recovery_hash) WHERE recovery_hash IS NOT NULL;');
        if (!cols.includes('email')) {
          this.sql.exec('ALTER TABLE users ADD COLUMN email TEXT;');
        }
        this.sql.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;');
        this.sql.exec('PRAGMA user_version=4;');
      });
      return;
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
      this.sql.exec("DELETE FROM settings WHERE key NOT IN ('userName','notifications','soundEnabled','soundType','snoozeMinutes','leadTimeMinutes','privateMode','stockAlertsEnabled','defaultStockThreshold','hideDoseAmount','autoCollapseTaken','hapticsEnabled','language','doctorName','doctorSpecialty','doctorHospital','doctorPhone','doctorNextAppointment','doctorNotes','doctorAppointmentTime','doctorApptLeadOptions','doctorBloodTestDate','appointments'); PRAGMA user_version=4;");
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
  findCatalogMedicine(gtin: string): any {
    if (!gtin) return null;
    const cleanGTIN = gtin.trim().padStart(14, '0');
    const row: any = this.sql.prepare('SELECT * FROM med_catalog WHERE gtin=?').get(cleanGTIN);
    if (!row) return null;
    return {
      gtin: row.gtin,
      name: row.name,
      amount: row.amount || '1 tablet',
      form: row.form || 'tablet',
      mealCondition: row.meal_condition || 'tok',
      instructions: row.instructions || '',
      activeIngredient: row.active_ingredient || '',
      defaultStock: row.default_stock || 30,
      stockThreshold: row.stock_threshold || 5,
      fullName: row.full_name || row.name,
    };
  }
  searchCatalog(query: string, limit = 25): any[] {
    if (!query || !query.trim()) return [];
    const q = `%${query.trim()}%`;
    const rows: any[] = this.sql.prepare(
      'SELECT * FROM med_catalog WHERE name LIKE ? OR active_ingredient LIKE ? OR full_name LIKE ? LIMIT ?'
    ).all(q, q, q, limit);
    return rows.map((r: any) => ({
      gtin: r.gtin,
      name: r.name,
      amount: r.amount || '1 tablet',
      form: r.form || 'tablet',
      mealCondition: r.meal_condition || 'tok',
      instructions: r.instructions || '',
      activeIngredient: r.active_ingredient || '',
      defaultStock: r.default_stock || 30,
      stockThreshold: r.stock_threshold || 5,
      fullName: r.full_name || r.name,
    }));
  }
  close() { this.sql?.close(); }
}
