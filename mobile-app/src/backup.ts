/**
 * Cihaz dışı yedek dosyası: oluşturma, doğrulama ve geri yüklemeye hazırlama.
 * Yedek dosyası dışarıdan gelen veridir; hiçbir alan doğrulanmadan uygulamaya uygulanmaz.
 */

import type { SyncDose } from './syncManager.ts';

export const BACKUP_APP_ID = 'reminder-health';
export const BACKUP_FORMAT_VERSION = 3;
const SUPPORTED_BACKUP_VERSIONS = [1, 2, 3];
// A decade of doses for a heavy user stays well below this; larger files are not ours.
export const MAX_BACKUP_CHARS = 5 * 1024 * 1024;
export const BACKUP_MIME_TYPE = 'application/json';

type SettingKind = 'boolean' | 'string' | 'number' | 'string[]';

// Mirrors the settings object persisted by App.tsx. Unknown keys and wrong types are dropped.
const SETTING_KINDS: Record<string, SettingKind> = {
  privateMode: 'boolean',
  notifications: 'boolean',
  soundEnabled: 'boolean',
  soundType: 'string',
  userName: 'string',
  doctorName: 'string',
  doctorSpecialty: 'string',
  doctorHospital: 'string',
  doctorPhone: 'string',
  doctorNextAppointment: 'string',
  doctorAppointmentTime: 'string',
  doctorApptLeadOptions: 'string[]',
  appointments: 'string',
  doctorBloodTestDate: 'string',
  doctorNotes: 'string',
  snoozeMinutes: 'number',
  leadTimeMinutes: 'number',
  defaultStockThreshold: 'number',
  stockAlertsEnabled: 'boolean',
  hideDoseAmount: 'boolean',
  autoCollapseTaken: 'boolean',
  showAppointmentCard: 'boolean',
  hapticsEnabled: 'boolean',
  repeatNagEnabled: 'boolean',
  repeatNagCount: 'number',
};

// Single-doctor profile fields from before appointments existed. The app no longer reads them, but
// keeps whatever is stored so a user's typed contact and notes are never silently dropped.
export const LEGACY_DOCTOR_SETTING_KEYS = [
  'doctorName', 'doctorSpecialty', 'doctorHospital', 'doctorPhone', 'doctorNextAppointment',
  'doctorAppointmentTime', 'doctorApptLeadOptions', 'doctorBloodTestDate', 'doctorNotes',
];

export function pickLegacyDoctorSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const key of LEGACY_DOCTOR_SETTING_KEYS) {
    if (settings[key] !== undefined) kept[key] = settings[key];
  }
  return kept;
}

const SOUND_TYPES = ['default', 'alarm', 'gentle', 'chime', 'system_custom', 'silent'];

export type BackupLanguage = 'tr' | 'en';

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  appVersion?: string;
  ownerId?: string;
  language?: BackupLanguage;
  doses: SyncDose[];
  settings: Record<string, unknown>;
  learnedMeds: Record<string, unknown>;
}

export interface RestorableBackup {
  version: number;
  exportedAt?: string;
  ownerId?: string;
  language?: BackupLanguage;
  doses: SyncDose[];
  settings: Record<string, unknown>;
  learnedMeds: Record<string, unknown>;
  /** Version 1 and 2 files never carried the appointment list. */
  hasAppointments: boolean;
}

export type BackupErrorCode =
  | 'too-large'
  | 'invalid-json'
  | 'not-object'
  | 'unsupported-version'
  | 'missing-doses'
  | 'invalid-dose'
  | 'invalid-appointments';

export type ParseBackupResult =
  | { ok: true; backup: RestorableBackup }
  | { ok: false; error: BackupErrorCode; detail?: string };

export interface BackupSummary {
  medicines: number;
  appointments: number | null;
  exportedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function matchesKind(value: unknown, kind: SettingKind): boolean {
  if (kind === 'string[]') return isStringArray(value);
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === kind;
}

function isValidDose(value: unknown): value is SyncDose {
  if (!isRecord(value)) return false;
  const idOk = typeof value.id === 'string' || typeof value.id === 'number';
  const timesOk = value.times === undefined || isStringArray(value.times);
  return idOk && typeof value.name === 'string' && typeof value.time === 'string' && timesOk;
}

function isValidAppointment(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.date === 'string';
}

/** Appointments are stored as a JSON string inside settings; older exports may hold an array. */
export function parseAppointmentList(value: unknown): unknown[] | null {
  let list = value;
  if (typeof value === 'string') {
    try { list = JSON.parse(value); } catch { return null; }
  }
  return Array.isArray(list) && list.every(isValidAppointment) ? list : null;
}

function sanitizeSettings(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, kind] of Object.entries(SETTING_KINDS)) {
    if (key === 'appointments') continue;
    const value = raw[key];
    if (value !== undefined && matchesKind(value, kind)) clean[key] = value;
  }
  if (typeof clean.soundType === 'string' && !SOUND_TYPES.includes(clean.soundType)) delete clean.soundType;
  return clean;
}

export function buildBackupFile(params: {
  ownerId?: string;
  appVersion?: string;
  language?: BackupLanguage;
  doses: SyncDose[];
  settings: Record<string, unknown>;
  learnedMeds: Record<string, unknown>;
  now?: Date;
}): BackupFile {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_FORMAT_VERSION,
    exportedAt: (params.now ?? new Date()).toISOString(),
    ...(params.appVersion ? { appVersion: params.appVersion } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.language ? { language: params.language } : {}),
    doses: params.doses,
    settings: params.settings,
    learnedMeds: params.learnedMeds,
  };
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `reminder-health-yedek-${stamp}.json`;
}

export function parseBackup(text: string): ParseBackupResult {
  if (text.length > MAX_BACKUP_CHARS) return { ok: false, error: 'too-large' };
  let parsed: unknown;
  try {
    // Some share targets prepend a BOM when saving text files.
    parsed = JSON.parse(text.replace(/^﻿/, ''));
  } catch (error) {
    return { ok: false, error: 'invalid-json', detail: error instanceof Error ? error.message : String(error) };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'not-object' };
  if (typeof parsed.version !== 'number' || !SUPPORTED_BACKUP_VERSIONS.includes(parsed.version)) {
    return { ok: false, error: 'unsupported-version', detail: String(parsed.version) };
  }
  if (!Array.isArray(parsed.doses)) return { ok: false, error: 'missing-doses' };
  const badDose = parsed.doses.findIndex(dose => !isValidDose(dose));
  if (badDose !== -1) return { ok: false, error: 'invalid-dose', detail: String(badDose + 1) };

  const rawSettings = isRecord(parsed.settings) ? parsed.settings : {};
  const settings = sanitizeSettings(rawSettings);
  const hasAppointments = rawSettings.appointments !== undefined;
  if (hasAppointments) {
    const appointments = parseAppointmentList(rawSettings.appointments);
    if (!appointments) return { ok: false, error: 'invalid-appointments' };
    settings.appointments = JSON.stringify(appointments);
  }

  return {
    ok: true,
    backup: {
      version: parsed.version,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
      ownerId: typeof parsed.ownerId === 'string' ? parsed.ownerId : undefined,
      language: parsed.language === 'tr' || parsed.language === 'en' ? parsed.language : undefined,
      doses: parsed.doses as SyncDose[],
      settings,
      learnedMeds: isRecord(parsed.learnedMeds) ? parsed.learnedMeds : {},
      hasAppointments,
    },
  };
}

/** A backup made while signed in to one account must not be poured into another account. */
export function isBackupForeignToAccount(backupOwnerId: string | undefined, sessionUserId: string | undefined): boolean {
  return Boolean(backupOwnerId && sessionUserId && backupOwnerId !== sessionUserId);
}

export function summarizeBackup(backup: RestorableBackup): BackupSummary {
  const appointments = backup.hasAppointments ? parseAppointmentList(backup.settings.appointments) : null;
  return {
    medicines: backup.doses.filter(dose => !dose.deletedAt).length,
    appointments: appointments ? appointments.length : null,
    exportedAt: backup.exportedAt,
  };
}

/**
 * Settings to apply on restore. When the file predates appointment export, the current
 * appointments (stored as a JSON string) are kept rather than wiped.
 */
export function settingsForRestore(backup: RestorableBackup, currentAppointments: string): Record<string, unknown> {
  const settings = { ...backup.settings };
  if (!backup.hasAppointments) settings.appointments = currentAppointments;
  return settings;
}

/**
 * Restoring is a deliberate "this is my data now" act, so active medicines get a fresh
 * timestamp and win the next sync. Tombstones keep theirs so deletions stay ordered.
 */
export function prepareRestoredDoses(doses: SyncDose[], now = Date.now()): SyncDose[] {
  return doses.map(dose => (dose.deletedAt ? { ...dose } : { ...dose, updatedAt: now }));
}
