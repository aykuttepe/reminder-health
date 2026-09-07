import path from 'node:path';
import fs from 'node:fs';

export interface DbDoseRow {
  id: number;
  name: string;
  data: string; // JSON string
  updated_at: number;
  deleted_at: number | null;
}

export interface DbLearnedRow {
  gtin: string;
  name: string;
  data: string; // JSON string
  updated_at: number;
}

export interface DbSettingsRow {
  key: string;
  value: string; // JSON string
  updated_at: number;
}

export class RutinDatabase {
  private db: any = null;
  private isNativeSqlite = false;
  private fallbackDataPath: string;

  constructor(dbPath?: string) {
    const targetPath = dbPath || process.env.DB_PATH || path.join(process.cwd(), 'data', 'rutin.sqlite');
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.fallbackDataPath = path.join(dir, 'rutin_fallback.json');

    try {
      // Node.js 22.5+ native sqlite
      const { DatabaseSync } = (globalThis as any).require ? (globalThis as any).require('node:sqlite') : null;
      if (DatabaseSync) {
        this.db = new DatabaseSync(targetPath);
        this.isNativeSqlite = true;
        this.initTables();
      }
    } catch {
      // In ES modules or if require not available, try dynamic import or fallback
    }
  }

  public async initAsync(dbPath?: string) {
    if (this.db) return;
    const targetPath = dbPath || process.env.DB_PATH || path.join(process.cwd(), 'data', 'rutin.sqlite');
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      const sqliteModule = await import('node:sqlite');
      if (sqliteModule && sqliteModule.DatabaseSync) {
        this.db = new sqliteModule.DatabaseSync(targetPath);
        this.isNativeSqlite = true;
        this.initTables();
        return;
      }
    } catch (e) {
      console.warn('Native node:sqlite not available, using robust JSON file database fallback.');
    }

    // Fallback JSON setup
    if (!fs.existsSync(this.fallbackDataPath)) {
      fs.writeFileSync(this.fallbackDataPath, JSON.stringify({ doses: [], learnedMeds: {}, settings: {} }, null, 2));
    }
  }

  private initTables() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS doses (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER DEFAULT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_doses_updated ON doses (updated_at);

      CREATE TABLE IF NOT EXISTS learned_meds (
        gtin TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  public getAllDoses(): DbDoseRow[] {
    if (this.isNativeSqlite && this.db) {
      const stmt = this.db.prepare('SELECT * FROM doses');
      return stmt.all() as DbDoseRow[];
    }
    const store = this.readFallback();
    return store.doses || [];
  }

  public getDosesSince(sinceTimestamp: number): DbDoseRow[] {
    if (this.isNativeSqlite && this.db) {
      const stmt = this.db.prepare('SELECT * FROM doses WHERE updated_at > ? OR (deleted_at IS NOT NULL AND deleted_at > ?)');
      return stmt.all(sinceTimestamp, sinceTimestamp) as DbDoseRow[];
    }
    const store = this.readFallback();
    return (store.doses || []).filter((d: any) =>
      d.updated_at > sinceTimestamp || (d.deleted_at && d.deleted_at > sinceTimestamp)
    );
  }

  public upsertDose(id: number, name: string, dataJson: string, updatedAt: number, deletedAt: number | null = null) {
    if (this.isNativeSqlite && this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO doses (id, name, data, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          data = excluded.data,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at
      `);
      stmt.run(id, name, dataJson, updatedAt, deletedAt);
      return;
    }

    const store = this.readFallback();
    const existingIdx = (store.doses || []).findIndex((d: any) => d.id === id);
    const row = { id, name, data: dataJson, updated_at: updatedAt, deleted_at: deletedAt };
    if (existingIdx !== -1) {
      store.doses[existingIdx] = row;
    } else {
      store.doses.push(row);
    }
    this.writeFallback(store);
  }

  public getAllLearnedMeds(): Record<string, any> {
    if (this.isNativeSqlite && this.db) {
      const stmt = this.db.prepare('SELECT * FROM learned_meds');
      const rows = stmt.all() as DbLearnedRow[];
      const res: Record<string, any> = {};
      for (const r of rows) {
        try {
          res[r.gtin] = JSON.parse(r.data);
        } catch {
          res[r.gtin] = { gtin: r.gtin, name: r.name };
        }
      }
      return res;
    }
    const store = this.readFallback();
    return store.learnedMeds || {};
  }

  public upsertLearnedMed(gtin: string, name: string, dataJson: string, updatedAt: number) {
    if (this.isNativeSqlite && this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO learned_meds (gtin, name, data, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(gtin) DO UPDATE SET
          name = excluded.name,
          data = excluded.data,
          updated_at = excluded.updated_at
      `);
      stmt.run(gtin, name, dataJson, updatedAt);
      return;
    }

    const store = this.readFallback();
    if (!store.learnedMeds) store.learnedMeds = {};
    try {
      store.learnedMeds[gtin] = JSON.parse(dataJson);
    } catch {
      store.learnedMeds[gtin] = { gtin, name };
    }
    this.writeFallback(store);
  }

  public getAllSettings(): Record<string, any> {
    if (this.isNativeSqlite && this.db) {
      const stmt = this.db.prepare('SELECT * FROM settings');
      const rows = stmt.all() as DbSettingsRow[];
      const res: Record<string, any> = {};
      for (const r of rows) {
        try {
          res[r.key] = JSON.parse(r.value);
        } catch {
          res[r.key] = r.value;
        }
      }
      return res;
    }
    const store = this.readFallback();
    return store.settings || {};
  }

  public upsertSetting(key: string, valueJson: string, updatedAt: number) {
    if (this.isNativeSqlite && this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `);
      stmt.run(key, valueJson, updatedAt);
      return;
    }
    const store = this.readFallback();
    if (!store.settings) store.settings = {};
    try {
      store.settings[key] = JSON.parse(valueJson);
    } catch {
      store.settings[key] = valueJson;
    }
    this.writeFallback(store);
  }

  public wipeAndRestore(doses: any[], learnedMeds: Record<string, any>, settings: Record<string, any>) {
    if (this.isNativeSqlite && this.db) {
      this.db.exec('DELETE FROM doses; DELETE FROM learned_meds; DELETE FROM settings;');
      for (const d of doses) {
        this.upsertDose(d.id, d.name || 'İlaç', JSON.stringify(d), d.updatedAt || Date.now(), d.deletedAt || null);
      }
      for (const [gtin, med] of Object.entries(learnedMeds)) {
        this.upsertLearnedMed(gtin, (med as any).name || 'İlaç', JSON.stringify(med), Date.now());
      }
      for (const [k, v] of Object.entries(settings)) {
        this.upsertSetting(k, JSON.stringify(v), Date.now());
      }
      return;
    }

    const store = {
      doses: doses.map(d => ({ id: d.id, name: d.name, data: JSON.stringify(d), updated_at: d.updatedAt || Date.now(), deleted_at: d.deletedAt || null })),
      learnedMeds,
      settings,
    };
    this.writeFallback(store);
  }

  private readFallback(): any {
    try {
      return JSON.parse(fs.readFileSync(this.fallbackDataPath, 'utf8'));
    } catch {
      return { doses: [], learnedMeds: {}, settings: {} };
    }
  }

  private writeFallback(data: any) {
    try {
      fs.writeFileSync(this.fallbackDataPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to write fallback data', e);
    }
  }
}
