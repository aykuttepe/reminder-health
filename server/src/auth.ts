import { RutinDatabase } from './db.js';
import { digest, secret, randomUUID, generateRecoveryKey, normalizeRecoveryKey, HttpError } from './identity.js';

export function normalizeEmail(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim().toLowerCase();
  if (!clean) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) {
    throw new HttpError(400, 'Geçersiz e-posta adresi biçimi.');
  }
  return clean;
}

export class AuthService {
  constructor(public db: RutinDatabase) {}

  limit(key: string, max = 15) {
    const now = Date.now(), k = digest(key);
    this.db.sql.prepare('DELETE FROM rate_limits WHERE expires_at<?').run(now);
    this.db.sql.prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(k, now + 900000);
    const row = this.db.sql.prepare('SELECT count FROM rate_limits WHERE key=?').get(k) as any;
    if (row && row.count > max) throw new HttpError(429, 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');
  }

  createUser(name: string, email?: string) {
    if (!name.trim()) throw new Error('Hesap adı gerekli.');
    const cleanEmail = normalizeEmail(email);
    if (cleanEmail) {
      const existing = this.db.sql.prepare('SELECT id FROM users WHERE email=?').get(cleanEmail);
      if (existing) throw new HttpError(409, 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.');
    }
    const id = randomUUID(), code = secret(), recovery = generateRecoveryKey();
    const cleanName = name.trim();
    this.db.sql.prepare('INSERT INTO users(id,name,email,sync_hash,recovery_hash,created_at) VALUES(?,?,?,?,?,?)')
      .run(id, cleanName, cleanEmail, digest(code), digest(normalizeRecoveryKey(recovery)), Date.now());
    this.db.upsertSetting(id, 'userName', cleanName);
    return { userId: id, name: cleanName, email: cleanEmail, syncCode: code, recoveryKey: recovery };
  }

  updateEmail(userId: string, email: string) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new HttpError(400, 'Geçerli bir e-posta adresi girin.');
    const existing = this.db.sql.prepare('SELECT id FROM users WHERE email=? AND id!=?').get(cleanEmail, userId);
    if (existing) throw new HttpError(409, 'Bu e-posta adresi başka bir hesap tarafından kullanılıyor.');
    const user = this.db.sql.prepare('SELECT id, name FROM users WHERE id=?').get(userId) as any;
    if (!user) throw new HttpError(404, 'Hesap bulunamadı.');
    this.db.sql.prepare('UPDATE users SET email=? WHERE id=?').run(cleanEmail, userId);
    return { userId, name: user.name, email: cleanEmail };
  }

  rotateCode(userId: string) {
    const code = secret(), recovery = generateRecoveryKey();
    return this.db.transaction(() => {
      const user = this.db.sql.prepare('SELECT id, name FROM users WHERE id=?').get(userId) as any;
      if (!user) throw new Error('Hesap bulunamadı.');
      this.db.sql.prepare('UPDATE users SET sync_hash=?, recovery_hash=? WHERE id=?')
        .run(digest(code), digest(normalizeRecoveryKey(recovery)), userId);
      this.db.sql.prepare('DELETE FROM devices WHERE user_id=?').run(userId);
      return { userId, name: user.name, syncCode: code, recoveryKey: recovery };
    });
  }

  login(body: any, ip: string) {
    this.limit(`login-ip:${ip}`, 30);
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    this.limit(`login-code:${code}`);
    if (!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new HttpError(401, 'Eşitleme kodu geçersiz.');
    const user = this.db.sql.prepare('SELECT id,name,email,is_legacy_owner FROM users WHERE sync_hash=?').get(digest(code)) as any;
    if (!user) throw new HttpError(401, 'Eşitleme kodu geçersiz.');
    if (typeof body.deviceId !== 'string' || body.deviceId.length < 8 || body.deviceId.length > 64) {
      throw new HttpError(400, 'Geçersiz cihaz kimliği.');
    }
    if (!['web', 'native'].includes(body.kind)) throw new HttpError(400, 'Geçersiz cihaz türü.');
    const token = secret(), csrf = digest(`csrf:${token}`), now = Date.now(), expiresAt = now + 90 * 86400000;
    this.db.transaction(() => {
      this.db.sql.prepare('DELETE FROM devices WHERE (user_id=? AND installation_id=? AND kind=?) OR expires_at<?')
        .run(user.id, body.deviceId, body.kind, now);
      this.db.sql.prepare('INSERT INTO devices VALUES(?,?,?,?,?,?,?,?,?)')
        .run(randomUUID(), user.id, body.deviceId, String(body.deviceName || body.kind).slice(0, 80), digest(token), digest(csrf), body.kind, expiresAt, now);
    });
    return { token, csrf, expiresAt, user: { id: user.id, name: user.name, email: user.email || null, legacyOwner: !!user.is_legacy_owner } };
  }

  recoverWithKey(body: any, ip: string) {
    this.limit(`recover-ip:${ip}`, 15);
    const rawKey = typeof body?.recoveryKey === 'string' ? body.recoveryKey.trim() : '';
    const normalized = normalizeRecoveryKey(rawKey);
    this.limit(`recover-key:${normalized}`, 5);
    if (!/^[2-9A-HJ-NP-Z]{16}$/.test(normalized)) throw new HttpError(401, 'Kurtarma anahtarı biçimi geçersiz.');

    const user = this.db.sql.prepare('SELECT id,name,email,is_legacy_owner FROM users WHERE recovery_hash=?').get(digest(normalized)) as any;
    if (!user) throw new HttpError(401, 'Kurtarma anahtarı geçersiz.');

    if (typeof body.deviceId !== 'string' || body.deviceId.length < 8 || body.deviceId.length > 64) {
      throw new HttpError(400, 'Geçersiz cihaz kimliği.');
    }
    if (!['web', 'native'].includes(body.kind)) throw new HttpError(400, 'Geçersiz cihaz türü.');

    const newSyncCode = secret();
    const newRecoveryKey = generateRecoveryKey();
    const token = secret();
    const csrf = digest(`csrf:${token}`);
    const now = Date.now();
    const expiresAt = now + 90 * 86400000;

    this.db.transaction(() => {
      this.db.sql.prepare('UPDATE users SET sync_hash=?, recovery_hash=? WHERE id=?')
        .run(digest(newSyncCode), digest(normalizeRecoveryKey(newRecoveryKey)), user.id);
      this.db.sql.prepare('DELETE FROM devices WHERE user_id=?').run(user.id);
      this.db.sql.prepare('INSERT INTO devices VALUES(?,?,?,?,?,?,?,?,?)')
        .run(randomUUID(), user.id, body.deviceId, String(body.deviceName || body.kind).slice(0, 80), digest(token), digest(csrf), body.kind, expiresAt, now);
    });

    return {
      token,
      csrf,
      expiresAt,
      user: { id: user.id, name: user.name, email: user.email || null, legacyOwner: !!user.is_legacy_owner },
      newSyncCode,
      newRecoveryKey,
    };
  }

  session(token: string, kind: 'web' | 'native') {
    const row = this.db.sql.prepare('SELECT devices.*,users.name AS user_name,users.email AS user_email,users.is_legacy_owner FROM devices JOIN users ON users.id=devices.user_id WHERE session_hash=? AND kind=? AND expires_at>?')
      .get(digest(token), kind, Date.now()) as any;
    if (!row) throw new HttpError(401, 'Oturum sona erdi. Eşitleme koduyla tekrar bağlanın.');
    this.db.sql.prepare('UPDATE devices SET last_seen_at=? WHERE id=?').run(Date.now(), row.id);
    return row;
  }

  refreshCsrf(id: string) {
    const csrf = secret();
    this.db.sql.prepare('UPDATE devices SET csrf_hash=? WHERE id=?').run(digest(csrf), id);
    return csrf;
  }
}
