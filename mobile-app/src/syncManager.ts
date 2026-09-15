/**
 * Rutin Çevrimdışı Öncelikli (Offline-First) Akıllı Senkronizasyon ve Yedekleme Motoru.
 */

import { mergeDoseRecords, type DoseRecords } from './doseRecords.ts';

export interface SyncDose {
  id: string | number;
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
  doseRecords?: DoseRecords;
  gtin?: string;
  expiryDate?: string;
  updatedAt?: number; // Epoch ms timestamp
  deletedAt?: number; // Epoch ms timestamp if soft-deleted
}

export interface BackupPayload {
  version: 1 | 2;
  ownerId?: string;
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
  const map = new Map<string | number, SyncDose>();

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

    base.slotStatuses = older.statusDate === base.statusDate ? mergedSlotStatuses : base.slotStatuses;
    for (const day of Object.keys(older.dailyStatuses || {})) {
      const merged = {...older.dailyStatuses?.[day], ...base.dailyStatuses?.[day]};
      for (const [time, status] of Object.entries(older.dailyStatuses?.[day] || {})) if(status === 'taken') merged[time] = 'taken';
      mergedDailyStatuses[day] = merged;
    }
    base.dailyStatuses = mergedDailyStatuses;
    base.doseRecords = mergeDoseRecords(local.doseRecords, remote.doseRecords);
    for (const [date, slots] of Object.entries(base.doseRecords)) {
      for (const [time, record] of Object.entries(slots)) {
        if (date === base.statusDate) {
          base.slotStatuses = { ...base.slotStatuses, [time]: record.status };
        } else {
          base.dailyStatuses[date] = { ...base.dailyStatuses[date], [time]: record.status };
        }
      }
    }
    if (base.statusDate && base.slotStatuses) {
      base.status = (base.times?.length ? base.times : [base.time])
        .every(time => base.slotStatuses?.[time] === 'taken') ? 'taken' : 'pending';
    }
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
  ownerId?: string;
  doses: any[];
  settings?: Record<string, any>;
  learnedMeds?: Record<string, any>;
}): BackupPayload {
  return {
    version: params.ownerId ? 2 : 1,
    ...(params.ownerId ? {ownerId: params.ownerId} : {}),
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
    if (![1, 2].includes(parsed.version)) {
      return { valid: false, error: `Desteklenmeyen yedek sürümü: ${parsed.version}. Sürüm 1 ve 2 desteklenir.` };
    }
    if (!Array.isArray(parsed.doses)) {
      return { valid: false, error: 'Yedek dosyasında ilaç listesi ("doses") bulunamadı.' };
    }
    return { valid: true, data: parsed as BackupPayload };
  } catch (err: any) {
    return { valid: false, error: `JSON çözme hatası: ${err.message}` };
  }
}

export const DEFAULT_SYNC_SERVER_URL = 'https://api.mytepeapi.com.tr';
export const LEGACY_CLOUD_SERVER_URL = 'https://rutin-api.tepe-aykut05.workers.dev';

export class ServerConnectionError extends Error {
  code: 'timeout' | 'network' | 'http' | 'invalid-response';
  endpoint: string;
  status?: number;
  constructor(
    message: string,
    code: ServerConnectionError['code'],
    endpoint: string,
    status?: number,
  ) {
    super(message);
    this.name = 'ServerConnectionError';
    this.code = code;
    this.endpoint = endpoint;
    this.status = status;
  }
}

// A single deadline covers both transport and body parsing. Never replay writes:
// a timed-out login or sync may already have committed on the server.
export async function requestServerJson<T extends object = Record<string, unknown>>(
  url: string,
  options: Omit<RequestInit, 'signal'> = {},
  timeoutMs = 15000,
): Promise<T> {
  const endpoint = new URL(url).pathname;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ServerConnectionError(
        `Sunucu bağlantısı zaman aşımına uğradı (${timeoutMs / 1000} sn, ${endpoint}). İnternet bağlantısını ve sunucu adresini kontrol edin.`,
        'timeout', endpoint,
      ));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(url, {...options, signal: controller.signal});
      const text = await response.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch {
        throw new ServerConnectionError(
          `Sunucu geçerli JSON yanıtı vermedi (HTTP ${response.status}, ${endpoint}).`,
          response.ok ? 'invalid-response' : 'http', endpoint, response.status,
        );
      }
      if (!response.ok) {
        const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error : 'Sunucu isteği tamamlayamadı.';
        throw new ServerConnectionError(`${message} (HTTP ${response.status}, ${endpoint})`, 'http', endpoint, response.status);
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new ServerConnectionError(`Sunucu yanıtı beklenen biçimde değil (${endpoint}).`, 'invalid-response', endpoint);
      }
      return data as T;
    })()]);
  } catch (error) {
    if (error instanceof ServerConnectionError) throw error;
    throw new ServerConnectionError(
      `Sunucuya güvenli bağlantı kurulamadı (${endpoint}). İnternet bağlantısını ve sunucu adresini kontrol edin.`,
      'network', endpoint,
    );
  } finally {
    clearTimeout(timer);
  }
}


export function normalizeServerUrl(rawUrl: string): string {
  let clean = rawUrl.trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  clean = clean.replace(/\/api$/i, '');
  return clean;
}

// HTTP and private-network installations migrate to the managed cloud server.
export function isLegacyServerOrigin(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.origin === LEGACY_CLOUD_SERVER_URL) return true;
    const host = url.hostname.toLowerCase();
    if (url.protocol === 'http:') return true;
    if (url.protocol !== 'https:') return false;
    if (host === 'localhost' || host.endsWith('.localhost') || host === '[::1]') return true;
    const octets = host.split('.').map(Number);
    return octets.length === 4 && octets.every(n => Number.isInteger(n) && n >= 0 && n <= 255) &&
      (octets[0] === 10 || octets[0] === 127 ||
       (octets[0] === 192 && octets[1] === 168) ||
       (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
  } catch { return false; }
}

export function restoreServerUrl(savedUrl: unknown): string {
  if (typeof savedUrl !== 'string' || !savedUrl.trim()) return DEFAULT_SYNC_SERVER_URL;
  const normalized = normalizeServerUrl(savedUrl);
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:' || isLegacyServerOrigin(normalized)) return DEFAULT_SYNC_SERVER_URL;
    return normalized;
  } catch { return DEFAULT_SYNC_SERVER_URL; }
}

/**
 * Sunucu sağlık durumunu kontrol eder.
 */
export async function checkServerHealth(
  serverUrl: string,
  apiToken?: string
): Promise<{ ok: boolean; version?: string; latencyMs?: number; error?: string }> {
  const cleanUrl = normalizeServerUrl(serverUrl);
  if (!cleanUrl) return { ok: false, error: 'Sunucu adresi boş olamaz.' };
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const headers: Record<string, string> = {Accept: 'application/json'};
    if (apiToken?.trim()) headers.Authorization = `Bearer ${apiToken.trim()}`;
    const res = await fetch(`${cleanUrl}/health`, {
      method: 'GET', headers, signal: controller.signal,
    });
    if (!res.ok) {
      return {ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}: ${res.statusText}`};
    }
    const data = await res.json();
    if (data?.status !== 'ok') {
      return {ok: false, error: 'Sunucu beklenen sağlık yanıtını vermedi.'};
    }
    return {ok: true, version: data.version || '1.0.0', latencyMs: Date.now() - start};
  } catch (err: any) {
    return {ok: false, error: controller.signal.aborted || err?.name === 'AbortError'
      ? 'Zaman aşımı (15 sn)'
      : (err?.message || 'Bağlantı hatası')};
  } finally {
    clearTimeout(timeoutId);
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
  const cleanUrl = normalizeServerUrl(serverUrl);
  if (!cleanUrl) {
    throw new Error('Sunucu adresi boş olamaz.');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiToken?.trim()) {
    headers['Authorization'] = `Bearer ${apiToken.trim()}`;
  }

  return requestServerJson<SyncResponsePayload>(`${cleanUrl}/api/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}
