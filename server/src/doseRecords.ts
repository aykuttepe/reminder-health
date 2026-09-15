export type DoseRecord = {
  status: 'pending' | 'taken' | 'skipped';
  updatedAt: number;
  stockDebited: number;
};
export type DoseRecords = Record<string, Record<string, DoseRecord>>;

export function validDoseRecord(value: unknown): value is DoseRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as DoseRecord;
  return ['pending', 'taken', 'skipped'].includes(record.status) &&
    Number.isSafeInteger(record.updatedAt) && record.updatedAt > 0 &&
    Number.isFinite(record.stockDebited) && record.stockDebited >= 0;
}

// Explicit, dated corrections beat legacy taken-wins merging. Ties are deterministic.
export function mergeDoseRecords(a: DoseRecords = {}, b: DoseRecords = {}): DoseRecords {
  const result: DoseRecords = {};
  for (const source of [a, b]) {
    for (const [date, slots] of Object.entries(source)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slots || typeof slots !== 'object') continue;
      for (const [time, record] of Object.entries(slots)) {
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || !validDoseRecord(record)) continue;
        const existing = result[date]?.[time];
        const key = (r: DoseRecord) => `${r.status}:${r.stockDebited}`;
        if (!existing || record.updatedAt > existing.updatedAt ||
          (record.updatedAt === existing.updatedAt && key(record) > key(existing))) {
          (result[date] ??= {})[time] = { ...record };
        }
      }
    }
  }
  return result;
}

export function assertDoseRecords(value: unknown): asserts value is DoseRecords {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Geçersiz doz kayıtları.');
  for (const [date, slots] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !slots || typeof slots !== 'object' || Array.isArray(slots)) {
      throw new Error('Geçersiz doz kayıt tarihi.');
    }
    for (const [time, record] of Object.entries(slots)) {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || !validDoseRecord(record)) {
        throw new Error('Geçersiz doz kaydı.');
      }
    }
  }
}

type RecordOwner = {
  time?: string; times?: string[]; status?: string; statusDate?: string;
  slotStatuses?: Record<string, string>; dailyStatuses?: Record<string, Record<string, string>>;
  doseRecords?: DoseRecords;
};

export function materializeDoseRecords<T extends RecordOwner>(input: T): T {
  const result = { ...input, slotStatuses: { ...input.slotStatuses }, dailyStatuses: { ...input.dailyStatuses } };
  for (const [date, slots] of Object.entries(input.doseRecords ?? {})) {
    for (const [time, record] of Object.entries(slots)) {
      if (date === input.statusDate) result.slotStatuses[time] = record.status;
      else result.dailyStatuses[date] = { ...result.dailyStatuses[date], [time]: record.status };
    }
  }
  if (input.statusDate && input.doseRecords?.[input.statusDate]) {
    result.status = (input.times?.length ? input.times : [input.time ?? ''])
      .every(time => result.slotStatuses[time] === 'taken') ? 'taken' : 'pending';
  }
  return result;
}
