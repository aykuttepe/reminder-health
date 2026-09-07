/**
 * Rutin Çevrimdışı Öncelikli (Offline-First) Akıllı Senkronizasyon ve Yedekleme Motoru.
 */

export interface SyncDose {
  id: number;
  name: string;
  amount: string;
  time: string;
  times?: string[];
  status: 'pending' | 'taken' | 'skipped';
  paused?: boolean;
  snooze?: number;
  mealCondition?: 'tok' | 'ac' | 'yemekle' | 'farketmez';
  form?: 'tablet' | 'kapsul' | 'damla' | 'surup';
  instructions?: string;
  stock?: number;
  stockThreshold?: number;
  frequencyType?: 'everyday' | 'alternate' | 'cycle' | 'variable';
  cyclePhase1Days?: number;
  cyclePhase1Amount?: string;
  cyclePhase2Days?: number;
  cyclePhase2Amount?: string;
  cycleStartDate?: string;
  durationMode?: 'continuous' | 'days';
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  statusDate?: string;
  slotStatuses?: Record<string, 'pending' | 'taken' | 'skipped'>;
  dailyStatuses?: Record<string, Record<string, 'pending' | 'taken' | 'skipped'>>;
  gtin?: string;
  expiryDate?: string;
  updatedAt?: number; // Epoch ms timestamp
  deletedAt?: number; // Epoch ms timestamp if soft-deleted
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  doses: SyncDose[];
  settings?: Record<string, any>;
  learnedMeds?: Record<string, any>;
}

export interface SyncRequestPayload {
  clientVersion?: string;
  since?: number;
  doses?: SyncDose[];
  learnedMeds?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface SyncResponsePayload {
  success: boolean;
  serverTime: number;
  doses: SyncDose[];
  learnedMeds: Record<string, any>;
  settings?: Record<string, any>;
  message?: string;
}

/**
 * İki cihaz/kaynak arasındaki doz listelerini Last-Write-Wins (LWW)
 * ve derin slot/durum birleştirmesi ile çakışmasız harmanlar.
 */
export function smartMergeDoses(
  localDoses: SyncDose[],
  remoteDoses: SyncDose[]
): SyncDose[] {
  const map = new Map<number, SyncDose>();

  // 1. Önce yerel dozları haritaya ekle
  for (const dose of localDoses) {
    map.set(dose.id, { ...dose });
  }

  // 2. Uzak dozları LWW ve derin slot mantığı ile birleştir
  for (const remote of remoteDoses) {
    const local = map.get(remote.id);

    if (!local) {
      // Yerelde hiç yoksa direkt ekle
      map.set(remote.id, { ...remote });
      continue;
    }

    const localTime = Math.max(local.updatedAt || 0, local.deletedAt || 0);
    const remoteTime = Math.max(remote.updatedAt || 0, remote.deletedAt || 0);

    // Silinme (Tombstone) kontrolü:
    if (local.deletedAt && !remote.deletedAt) {
      if (localTime >= remoteTime) {
        // Yerel silme daha yeni veya eşitse silinmiş kalır
        map.set(remote.id, { ...local });
        continue;
      }
    } else if (!local.deletedAt && remote.deletedAt) {
      if (remoteTime >= localTime) {
        // Uzak silme daha yeni veya eşitse silinmiş olur
        map.set(remote.id, { ...remote });
        continue;
      }
    } else if (local.deletedAt && remote.deletedAt) {
      // İkisi de silinmişse en yenisini koru
      map.set(remote.id, remoteTime > localTime ? { ...remote } : { ...local });
      continue;
    }

    // İkisi de aktif; ana veride daha yeni olan kazanır (Last-Write-Wins)
    const base = remoteTime > localTime ? { ...remote } : { ...local };
    const older = remoteTime > localTime ? local : remote;

    // Slot statülerini derinlemesine birleştir (alındı bilgisi asla kaybolmasın)
    const mergedSlotStatuses: Record<string, 'pending' | 'taken' | 'skipped'> = {
      ...(older.slotStatuses || {}),
      ...(base.slotStatuses || {}),
    };
    // Eğer bir tarafta 'taken' işaretlenmişse 'pending' olan ezmesin
    if (older.slotStatuses) {
      for (const [slotKey, st] of Object.entries(older.slotStatuses)) {
        if (st === 'taken' && mergedSlotStatuses[slotKey] !== 'taken') {
          mergedSlotStatuses[slotKey] = 'taken';
        }
      }
    }

    // Daily statuses derin birleştirmesi
    const mergedDailyStatuses: Record<string, Record<string, 'pending' | 'taken' | 'skipped'>> = {
      ...(older.dailyStatuses || {}),
      ...(base.dailyStatuses || {}),
    };

    base.slotStatuses = mergedSlotStatuses;
    base.dailyStatuses = mergedDailyStatuses;
    map.set(base.id, base);
  }

  return Array.from(map.values());
}

/**
 * Öğrenilen GTIN ilaç kayıtlarını birleştirir.
 */
export function smartMergeLearnedMeds(
  local: Record<string, any> = {},
  remote: Record<string, any> = {}
): Record<string, any> {
  const merged: Record<string, any> = { ...local };
  for (const [gtin, med] of Object.entries(remote)) {
    if (!merged[gtin]) {
      merged[gtin] = med;
    } else {
      merged[gtin] = { ...merged[gtin], ...med };
    }
  }
  return merged;
}

/**
 * Tam yedekleme JSON objesi üretir.
 */
export function createBackupPayload(params: {
  doses: any[];
  settings?: Record<string, any>;
  learnedMeds?: Record<string, any>;
}): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    doses: params.doses || [],
    settings: params.settings || {},
    learnedMeds: params.learnedMeds || {},
  };
}

/**
 * Yüklenen JSON dosyasını doğrular ve ayrıştırır.
 */
export function validateBackupJSON(jsonStr: string): {
  valid: boolean;
  data?: BackupPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Dosya geçerli bir JSON objesi değil.' };
    }
    if (parsed.version !== 1) {
      return { valid: false, error: `Desteklenmeyen yedek sürümü: ${parsed.version}. Yalnızca Sürüm 1 desteklenir.` };
    }
    if (!Array.isArray(parsed.doses)) {
      return { valid: false, error: 'Yedek dosyasında ilaç listesi ("doses") bulunamadı.' };
    }
    return { valid: true, data: parsed as BackupPayload };
  } catch (err: any) {
    return { valid: false, error: `JSON çözme hatası: ${err.message}` };
  }
}

/**
 * Sunucu sağlık durumunu kontrol eder.
 */
export async function checkServerHealth(
  serverUrl: string,
  apiToken?: string
): Promise<{ ok: boolean; version?: string; latencyMs?: number; error?: string }> {
  const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
  const start = Date.now();
  try {
    const headers: Record<string, string> = {};
    if (apiToken?.trim()) {
      headers['Authorization'] = `Bearer ${apiToken.trim()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${cleanUrl}/health`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { ok: false, latencyMs, error: `HTTP ${res.status}: ${res.statusText}` };
    }
    const data = await res.json();
    return { ok: true, version: data.version || '1.0.0', latencyMs };
  } catch (err: any) {
    return { ok: false, error: err.name === 'AbortError' ? 'Zaman aşımı (6 sn)' : (err.message || 'Bağlantı hatası') };
  }
}

/**
 * Sunucu ile iki yönlü senkronizasyon yürütür.
 */
export async function syncWithServer(
  serverUrl: string,
  apiToken: string | undefined,
  payload: SyncRequestPayload
): Promise<SyncResponsePayload> {
  const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiToken?.trim()) {
    headers['Authorization'] = `Bearer ${apiToken.trim()}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const res = await fetch(`${cleanUrl}/api/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Sunucu Hatası (${res.status}): ${errText || res.statusText}`);
  }

  return await res.json();
}
