import { slotStatus, updateDoseSlot, type Dose } from './medicationPlan';

export type DoseUndo = {
  doseId: Dose['id']; date: string; time: string;
  previous: Dose['status']; applied: Dose['status']; updatedAt: number;
};

export function changeDoseRecord(doses: Dose[], doseId: Dose['id'], date: string,
  time: string, status: Dose['status']): { doses: Dose[]; undo?: DoseUndo } {
  const dose = doses.find(item => item.id === doseId && !item.deletedAt);
  if (!dose || slotStatus(dose, time, date) === status) return { doses };
  const updated = updateDoseSlot(dose, time, date, status);
  return { doses: doses.map(item => item.id === doseId ? updated : item),
    undo: { doseId, date, time, previous: slotStatus(dose, time, date), applied: status,
      updatedAt: updated.doseRecords![date][time].updatedAt } };
}

export function undoDoseRecord(doses: Dose[], undo: DoseUndo): Dose[] {
  const dose = doses.find(item => item.id === undo.doseId && !item.deletedAt);
  const record = dose?.doseRecords?.[undo.date]?.[undo.time];
  if (!dose || record?.updatedAt !== undo.updatedAt || record.status !== undo.applied) return doses;
  return doses.map(item => item.id === undo.doseId
    ? updateDoseSlot(item, undo.time, undo.date, undo.previous) : item);
}
