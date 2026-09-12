import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';

export interface CatalogItem {
  gtin: string;
  name: string;
  amount: string;
  form: string;
  mealCondition: string;
  instructions: string;
  activeIngredient: string;
  defaultStock: number;
  stockThreshold: number;
  fullName: string;
}

export function seedMedCatalog(sql: DatabaseSync): number {
  const countRow: any = sql.prepare('SELECT COUNT(*) as cnt FROM med_catalog').get();
  if (countRow && countRow.cnt > 0) {
    return countRow.cnt;
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidatePaths = [
    path.join(__dirname, 'catalogData.json.gz'),
    path.join(__dirname, '..', 'src', 'catalogData.json.gz'),
    path.join(process.cwd(), 'src', 'catalogData.json.gz'),
    path.join(process.cwd(), 'dist', 'catalogData.json.gz'),
    path.join(process.cwd(), 'server', 'src', 'catalogData.json.gz'),
    path.join(process.cwd(), 'server', 'dist', 'catalogData.json.gz'),
  ];

  let dataFilePath = candidatePaths.find(p => fs.existsSync(p));
  if (!dataFilePath) {
    return 0;
  }

  try {
    const gzBuf = fs.readFileSync(dataFilePath);
    const jsonStr = zlib.gunzipSync(gzBuf).toString('utf8');
    const items: CatalogItem[] = JSON.parse(jsonStr);

    sql.exec('BEGIN IMMEDIATE');
    const stmt = sql.prepare(`
      INSERT OR IGNORE INTO med_catalog (
        gtin, name, amount, form, meal_condition,
        instructions, active_ingredient, default_stock, stock_threshold, full_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of items) {
      stmt.run(
        it.gtin,
        it.name,
        it.amount || '1 tablet',
        it.form || 'tablet',
        it.mealCondition || 'farketmez',
        it.instructions || '',
        it.activeIngredient || '',
        it.defaultStock || 30,
        it.stockThreshold || 5,
        it.fullName || it.name
      );
    }
    sql.exec('COMMIT');
    return items.length;
  } catch (err) {
    try { sql.exec('ROLLBACK'); } catch {}
    return 0;
  }
}
