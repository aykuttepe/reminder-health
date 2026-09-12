import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { v5, validate } from 'uuid';
export { randomUUID };
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');

const RECOVERY_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function generateRecoveryKey(): string {
  const bytes = randomBytes(16);
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    let block = '';
    for (let j = 0; j < 4; j++) {
      block += RECOVERY_CHARS[bytes[i * 4 + j] % RECOVERY_CHARS.length];
    }
    parts.push(block);
  }
  return parts.join('-');
}

export function normalizeRecoveryKey(key: string): string {
  return key.replace(/[\s-]+/g, '').toUpperCase();
}

export function doseId(userId: string, id: unknown): string {
  if (typeof id === 'string' && validate(id)) return id.toLowerCase();
  if ((typeof id === 'number' && Number.isSafeInteger(id) && id >= 0) || (typeof id === 'string' && /^\d+$/.test(id))) {
    return v5(`legacy-dose:${id}`, userId);
  }
  throw new Error('Geçersiz ilaç kimliği');
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
