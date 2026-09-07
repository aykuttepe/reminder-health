import { RutinDatabase } from './db.js';

export interface ServerSyncPayload {
  clientVersion?: string;
  since?: number;
  doses?: any[];
  learnedMeds?: Record<string, any>;
  settings?: Record<string, any>;
}

export class SyncService {
  constructor(private db: RutinDatabase) {}

  public processSync(payload: ServerSyncPayload) {
    const serverTime = Date.now();
    const incomingDoses = Array.isArray(payload.doses) ? payload.doses : [];
    const incomingLearned = payload.learnedMeds || {};
    const incomingSettings = payload.settings || {};

    // 1. Sunucudaki mevcut dozları al
    const serverRows = this.db.getAllDoses();
    const serverDosesMap = new Map<number, any>();
    for (const r of serverRows) {
      try {
        const parsed = JSON.parse(r.data);
        serverDosesMap.set(r.id, {
          ...parsed,
          updatedAt: r.updated_at,
          deletedAt: r.deleted_at || undefined,
        });
      } catch {
        serverDosesMap.set(r.id, {
          id: r.id,
          name: r.name,
          updatedAt: r.updated_at,
          deletedAt: r.deleted_at || undefined,
        });
      }
    }

    // 2. Dozları Smart Merge ile birleştir
    for (const clientDose of incomingDoses) {
      if (!clientDose || typeof clientDose.id !== 'number') continue;
      const serverDose = serverDosesMap.get(clientDose.id);

      if (!serverDose) {
        // Sunucuda yok, istemciden ekle
        const cTime = clientDose.updatedAt || clientDose.deletedAt || serverTime;
        this.db.upsertDose(
          clientDose.id,
          clientDose.name || 'İlaç',
          JSON.stringify(clientDose),
          cTime,
          clientDose.deletedAt || null
        );
        serverDosesMap.set(clientDose.id, clientDose);
        continue;
      }

      const clientTime = Math.max(clientDose.updatedAt || 0, clientDose.deletedAt || 0);
      const serverDoseTime = Math.max(serverDose.updatedAt || 0, serverDose.deletedAt || 0);

      // Silinme durumu kontrolü
      if (clientDose.deletedAt && !serverDose.deletedAt) {
        if (clientTime >= serverDoseTime) {
          serverDose.deletedAt = clientDose.deletedAt;
          this.db.upsertDose(clientDose.id, clientDose.name, JSON.stringify(clientDose), clientTime, clientDose.deletedAt);
          continue;
        }
      } else if (!clientDose.deletedAt && serverDose.deletedAt) {
        if (serverDoseTime >= clientTime) {
          // Sunucudaki silme daha yeni
          continue;
        }
      }

      // İkisi de aktif; Last-Write-Wins
      const base = clientTime >= serverDoseTime ? { ...clientDose } : { ...serverDose };
      const older = clientTime >= serverDoseTime ? serverDose : clientDose;

      // Slot statülerini derinlemesine birleştir (alındı bilgisi korunur)
      const mergedSlotStatuses = {
        ...(older.slotStatuses || {}),
        ...(base.slotStatuses || {}),
      };
      if (older.slotStatuses) {
        for (const [k, v] of Object.entries(older.slotStatuses)) {
          if (v === 'taken') mergedSlotStatuses[k] = 'taken';
        }
      }
      base.slotStatuses = mergedSlotStatuses;

      const mergedDailyStatuses = {
        ...(older.dailyStatuses || {}),
        ...(base.dailyStatuses || {}),
      };
      base.dailyStatuses = mergedDailyStatuses;

      const finalTime = Math.max(clientTime, serverDoseTime);
      base.updatedAt = finalTime;
      this.db.upsertDose(base.id, base.name, JSON.stringify(base), finalTime, base.deletedAt || null);
      serverDosesMap.set(base.id, base);
    }

    // 3. Öğrenilen ilaçları birleştir
    const serverLearned = this.db.getAllLearnedMeds();
    for (const [gtin, clientMed] of Object.entries(incomingLearned)) {
      const existing = serverLearned[gtin];
      if (!existing) {
        this.db.upsertLearnedMed(gtin, (clientMed as any).name || 'İlaç', JSON.stringify(clientMed), serverTime);
        serverLearned[gtin] = clientMed;
      } else {
        const merged = { ...existing, ...(clientMed as any) };
        this.db.upsertLearnedMed(gtin, merged.name || 'İlaç', JSON.stringify(merged), serverTime);
        serverLearned[gtin] = merged;
      }
    }

    // 4. Ayarları güncelle
    for (const [k, v] of Object.entries(incomingSettings)) {
      this.db.upsertSetting(k, JSON.stringify(v), serverTime);
    }

    // 5. İstemciye güncel durumu dön (aktif + silinmiş tombstones)
    const allCurrentRows = this.db.getAllDoses();
    const finalDoses: any[] = [];
    for (const r of allCurrentRows) {
      try {
        const parsed = JSON.parse(r.data);
        finalDoses.push({
          ...parsed,
          updatedAt: r.updated_at,
          deletedAt: r.deleted_at || undefined,
        });
      } catch {
        finalDoses.push({
          id: r.id,
          name: r.name,
          updatedAt: r.updated_at,
          deletedAt: r.deleted_at || undefined,
        });
      }
    }

    return {
      success: true,
      serverTime,
      doses: finalDoses,
      learnedMeds: this.db.getAllLearnedMeds(),
      settings: this.db.getAllSettings(),
      message: 'Senkronizasyon başarıyla tamamlandı',
    };
  }

  public getFullBackup() {
    const dosesRows = this.db.getAllDoses();
    const doses = dosesRows.map(r => {
      try {
        const parsed = JSON.parse(r.data);
        return { ...parsed, updatedAt: r.updated_at, deletedAt: r.deleted_at || undefined };
      } catch {
        return { id: r.id, name: r.name, updatedAt: r.updated_at, deletedAt: r.deleted_at || undefined };
      }
    });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      doses,
      learnedMeds: this.db.getAllLearnedMeds(),
      settings: this.db.getAllSettings(),
    };
  }

  public restoreFullBackup(backupData: any) {
    if (!backupData || backupData.version !== 1 || !Array.isArray(backupData.doses)) {
      throw new Error('Geçersiz yedek verisi. version: 1 ve doses dizisi zorunludur.');
    }
    this.db.wipeAndRestore(backupData.doses, backupData.learnedMeds || {}, backupData.settings || {});
    return { success: true, message: 'Yedek başarıyla geri yüklendi', count: backupData.doses.length };
  }
}
