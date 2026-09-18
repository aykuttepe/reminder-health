import { assertDoseRecords, mergeDoseRecords, materializeDoseRecords } from './doseRecords.js';
import { RutinDatabase } from './db.js';
import { doseId, HttpError } from './identity.js';
const settingKeys = new Set(['userName','notifications','soundEnabled','soundType','snoozeMinutes','leadTimeMinutes','privateMode','stockAlertsEnabled','defaultStockThreshold','hideDoseAmount','autoCollapseTaken','hapticsEnabled','language','doctorName','doctorSpecialty','doctorHospital','doctorPhone','doctorNextAppointment','doctorNotes','doctorAppointmentTime','doctorApptLeadOptions','doctorBloodTestDate','appointments']);
const doseKeys = new Set(['id','name','amount','time','times','slotAmounts','status','paused','muted','snooze','mealCondition','form','instructions','stock','stockThreshold','defaultStock','frequencyType','cyclePhase1Days','cyclePhase1Amount','cyclePhase2Days','cyclePhase2Amount','cycleStartDate','durationMode','durationDays','startDate','endDate','statusDate','slotStatuses','dailyStatuses','doseRecords','gtin','expiryDate','updatedAt','deletedAt']);
function record(value: any) { return !!value && typeof value === 'object' && !Array.isArray(value); }
export class SyncService {
  constructor(private db: RutinDatabase) {}
  private validate(userId: string, payload: any) {
    if (!record(payload) || ['userId','user_id','deviceId','device_id'].some(k => k in payload)) throw new HttpError(400, 'Hesap kimliği oturumdan belirlenir.');
    if (payload.ownerId && payload.ownerId !== userId) throw new HttpError(403, 'Yedek başka bir hesaba ait.');
    if (payload.doses !== undefined && !Array.isArray(payload.doses)) throw new HttpError(400, 'Geçersiz ilaç listesi.');
    if (payload.doses?.length > 10000) throw new HttpError(400, 'Çok fazla kayıt.');
    const doses = (payload.doses || []).map((d: any) => {
      if (!record(d) || ['userId','user_id'].some(k => k in d) || typeof d.name !== 'string' || !d.name.trim()) throw new HttpError(400, 'Geçersiz ilaç kaydı.');
      let id: string;
      try { id = doseId(userId, d.id); } catch { throw new HttpError(400, 'Geçersiz ilaç kimliği.'); }
      for (const key of ['updatedAt','deletedAt']) if (d[key] != null && (!Number.isSafeInteger(d[key]) || d[key] < 0)) throw new HttpError(400, 'Geçersiz kayıt zamanı.');
      if (d.doseRecords !== undefined) {
        try { assertDoseRecords(d.doseRecords); } catch { throw new HttpError(400, 'Geçersiz doz kayıtları.'); }
      }
      const clean = Object.fromEntries(Object.entries(d).filter(([k]) => doseKeys.has(k)));
      return { ...clean, id, updatedAt: d.updatedAt || Date.now() } as any;
    });
    if (payload.learnedMeds !== undefined && !record(payload.learnedMeds)) throw new HttpError(400, 'Geçersiz katalog.');
    const learned = payload.learnedMeds || {};
    for (const [gtin, med] of Object.entries(learned)) if (!/^\d{14}$/.test(gtin) || !record(med) || typeof (med as any).name !== 'string') throw new HttpError(400, 'Geçersiz barkod kaydı.');
    if (payload.settings !== undefined && !record(payload.settings)) throw new HttpError(400, 'Geçersiz ayarlar.');
    const settings = Object.fromEntries(Object.entries(payload.settings || {}).filter(([k]) => settingKeys.has(k)));
    return { doses, learned, settings };
  }
  processSync(userId: string, payload: any) {
    const { doses, learned, settings } = this.validate(userId, payload);
    return this.db.transaction(() => {
      const current = new Map(this.db.getAllDoses(userId).map(d => [d.id,d]));
      for (const incoming of doses) {
        const existing = current.get(incoming.id);
        let merged = incoming;
        if (existing) {
          const incomingTime = Math.max(incoming.updatedAt || 0, incoming.deletedAt || 0);
          const existingTime = Math.max(existing.updatedAt || 0, existing.deletedAt || 0);
          // Deterministic ties prefer deletion, then the server's current record.
          const newest = incomingTime > existingTime || (incomingTime === existingTime && incoming.deletedAt && !existing.deletedAt) ? incoming : existing;
          const older = newest === incoming ? existing : incoming;
          merged = { ...newest, updatedAt: Math.max(incomingTime, existingTime) };
          if (!merged.deletedAt) {
            const combine = (a: any = {}, b: any = {}) => {
              const result = { ...a, ...b };
              for (const [k,v] of Object.entries(a)) if (v === 'taken') result[k] = 'taken';
              return result;
            };
            // Only merge undated slots if both belong to the same calendar day.
            merged.slotStatuses = older.statusDate === newest.statusDate ? combine(older.slotStatuses, newest.slotStatuses) : newest.slotStatuses;
            merged.dailyStatuses = { ...older.dailyStatuses, ...newest.dailyStatuses };
            for (const day of Object.keys(older.dailyStatuses || {})) merged.dailyStatuses[day] = combine(older.dailyStatuses[day], newest.dailyStatuses?.[day]);
            merged.doseRecords = mergeDoseRecords(older.doseRecords, newest.doseRecords);
          }
        }
        if (!merged.deletedAt && merged.doseRecords) merged = materializeDoseRecords(merged);
        this.db.saveDose(userId, merged); current.set(merged.id, merged);
      }
      const existingLearned = this.db.getAllLearnedMeds(userId);
      for (const [gtin, med] of Object.entries(learned)) {
        const safe = Object.fromEntries(Object.entries(med as any).filter(([k]) => ['gtin','name','amount','form','mealCondition','instructions','defaultStock','stockThreshold'].includes(k)));
        this.db.upsertLearnedMed(userId, gtin, { ...existingLearned[gtin], ...safe });
      }
      for (const [key,value] of Object.entries(settings)) {
        if (key === 'userName') {
          if (typeof value === 'string' && value.trim()) {
            const cleanName = value.trim();
            this.db.upsertSetting(userId, key, cleanName);
            this.db.sql.prepare('UPDATE users SET name=? WHERE id=?').run(cleanName, userId);
          }
          continue;
        }
        this.db.upsertSetting(userId, key, value);
      }
      return { success: true, serverTime: Date.now(), doses: this.db.getAllDoses(userId), learnedMeds: this.db.getAllLearnedMeds(userId), settings: this.db.getAllSettings(userId) };
    });
  }
  getFullBackup(userId: string) {
    return { version: 2, ownerId: userId, exportedAt: new Date().toISOString(), doses: this.db.getAllDoses(userId), learnedMeds: this.db.getAllLearnedMeds(userId), settings: this.db.getAllSettings(userId) };
  }
  restoreFullBackup(userId: string, payload: any) {
    if (![1,2].includes(payload?.version) || !Array.isArray(payload?.doses)) throw new HttpError(400,'Geçersiz yedek.');
    if (payload.version === 1 && !(this.db.sql.prepare('SELECT is_legacy_owner FROM users WHERE id=?').get(userId) as any)?.is_legacy_owner) throw new HttpError(403,'Eski yedek yalnızca mevcut kayıtların sahibine aktarılabilir.');
    if (payload.version === 2 && payload.ownerId !== userId) throw new HttpError(403,'Yedek başka bir hesaba ait.');
    const { doses, learned, settings } = this.validate(userId,payload);
    return this.db.transaction(() => {
      this.db.clearUserData(userId);
      for (const dose of doses) this.db.saveDose(userId,dose);
      for (const [gtin,med] of Object.entries(learned)) this.db.upsertLearnedMed(userId,gtin,med);
      for (const [key,value] of Object.entries(settings)) this.db.upsertSetting(userId,key,value);
      return { success: true, count: doses.length };
    });
  }
}
