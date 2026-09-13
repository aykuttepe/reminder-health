import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { RutinDatabase } from './db.js';
import { AuthService } from './auth.js';
import { SyncService } from './syncService.js';
import { digest, HttpError } from './identity.js';
export function createServer(db: RutinDatabase, options: {publicUrl?:string;allowedOrigins?:string[];webRoot?:string}={}) {
  const publicUrl = new URL(options.publicUrl || process.env.PUBLIC_URL || 'http://192.168.1.100:3050');
  const defaultAllowed = [publicUrl.origin, 'http://localhost:5173', 'http://localhost:4173', 'http://terminal.local:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'];
  const allowed = new Set(options.allowedOrigins || (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s=>s.trim()).filter(Boolean) : defaultAllowed));
  if ([...allowed].some(o => o === '*' || new URL(o).origin !== o)) throw new Error('ALLOWED_ORIGINS tam origin adresleri içermelidir.');
  const webRoot = path.resolve(options.webRoot || process.env.WEB_ROOT || '../dist/client');
  const auth = new AuthService(db), sync = new SyncService(db);
  const cookie = (token: string, age: number) => `reminder_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${publicUrl.protocol === 'https:' ? '; Secure' : ''}`;
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
    const send = (status: number, data: any) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const origin = req.headers.origin;
      if (origin && !allowed.has(origin)) throw new HttpError(403, 'Bu web adresine izin verilmiyor. Uygulamayı eşitleme sunucusundan açın.');
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Vary', 'Origin'); }
      const url = new URL(req.url || '/', publicUrl), method = req.method || 'GET';
      if (method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token' }); return res.end(); }
      if (url.pathname === '/health' && method === 'GET') return send(200, { status: 'ok', version: '2.0.0', authRequired: true });
      if (url.pathname === '/api/version' && method === 'GET') {
        const vFile = path.join(webRoot, 'version.json');
        if (fs.existsSync(vFile)) {
          try {
            const content = JSON.parse(fs.readFileSync(vFile, 'utf-8'));
            return send(200, {
              version: content.version || '0.2.5',
              apkUrl: content.apkUrl || '/app-release.apk',
              appName: content.appName || 'Rutin',
              releaseNotes: content.releaseNotes || 'v0.2.5 güncellemesi mevcut.',
              publishedAt: content.publishedAt || new Date().toISOString(),
            });
          } catch {}
        }
        return send(200, {
          version: process.env.APP_VERSION || '0.2.5',
          apkUrl: '/app-release.apk',
          appName: 'Rutin',
          releaseNotes: 'v0.2.5: Randevu sabahı saat 05:00 bildirimi ve sade onay.',
          publishedAt: new Date().toISOString(),
        });
      }
      if (url.pathname.startsWith('/api/catalog/') && method === 'GET') {
        const rawGtin = decodeURIComponent(url.pathname.slice('/api/catalog/'.length)).trim();
        const med = db.findCatalogMedicine(rawGtin);
        if (med) return send(200, { found: true, ...med });
        return send(404, { found: false, error: 'İlaç bulunamadı.' });
      }
      if (url.pathname === '/api/catalog' && method === 'GET') {
        const q = url.searchParams.get('q') || '';
        if (!q.trim()) return send(200, { results: [] });
        return send(200, { results: db.searchCatalog(q.trim(), 25) });
      }
      const readBody = async () => {
        if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'JSON gerekli.');
        let size = 0; const chunks: Buffer[] = [];
        for await (const chunk of req) { size += chunk.length; if (size > 10 * 1024 * 1024) throw new HttpError(413, 'İstek çok büyük.'); chunks.push(Buffer.from(chunk)); }
        try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw new HttpError(400, 'Geçersiz JSON.'); }
      };
      if (url.pathname === '/auth/register' && method === 'POST') {
        const body = await readBody();
        if ((body.kind === 'web' && !origin) || (body.kind === 'native' && origin)) throw new HttpError(403, 'Geçersiz istemci.');
        if (body.kind === 'web' && req.headers['x-csrf-token'] !== 'register' && req.headers['x-csrf-token'] !== 'login') throw new HttpError(403, 'CSRF doğrulaması gerekli.');
        const ip = req.socket.remoteAddress || 'unknown';
        auth.limit(`register-ip:${ip}`, 10);
        const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'Kullanıcı';
        const created = auth.createUser(name, body?.email);
        const session = auth.login({
          code: created.syncCode,
          deviceId: body.deviceId,
          deviceName: body.deviceName,
          kind: body.kind,
        }, ip);
        if (body.kind === 'web') {
          res.setHeader('Set-Cookie', cookie(session.token, 90 * 86400));
          return send(200, {
            user: session.user,
            csrf: session.csrf,
            expiresAt: session.expiresAt,
            syncCode: created.syncCode,
            recoveryKey: created.recoveryKey,
          });
        }
        return send(200, {
          ...session,
          syncCode: created.syncCode,
          recoveryKey: created.recoveryKey,
        });
      }
      if ((url.pathname === '/auth/login' || url.pathname === '/auth/connect') && method === 'POST') {
        const body = await readBody();
        if ((body.kind === 'web' && !origin) || (body.kind === 'native' && origin)) throw new HttpError(403, 'Geçersiz istemci.');
        if (body.kind === 'web' && req.headers['x-csrf-token'] !== 'login') throw new HttpError(403, 'CSRF doğrulaması gerekli.');
        const session = auth.login(body, req.socket.remoteAddress || 'unknown');
        if (body.kind === 'web') { res.setHeader('Set-Cookie', cookie(session.token, 90 * 86400)); return send(200, { user: session.user, csrf: session.csrf, expiresAt: session.expiresAt }); }
        return send(200, session);
      }
      if (url.pathname === '/auth/recover' && method === 'POST') {
        const body = await readBody();
        if ((body.kind === 'web' && !origin) || (body.kind === 'native' && origin)) throw new HttpError(403, 'Geçersiz istemci.');
        if (body.kind === 'web' && req.headers['x-csrf-token'] !== 'recover' && req.headers['x-csrf-token'] !== 'login') throw new HttpError(403, 'CSRF doğrulaması gerekli.');
        const session = auth.recoverWithKey(body, req.socket.remoteAddress || 'unknown');
        if (body.kind === 'web') {
          res.setHeader('Set-Cookie', cookie(session.token, 90 * 86400));
          return send(200, { user: session.user, csrf: session.csrf, expiresAt: session.expiresAt, newSyncCode: session.newSyncCode, newRecoveryKey: session.newRecoveryKey });
        }
        return send(200, session);
      }
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
        let token = '', kind: 'web' | 'native' = 'web';
        if (req.headers.authorization) {
          if (origin || !req.headers.authorization.startsWith('Bearer ')) throw new HttpError(403, 'Geçersiz istemci.');
          token = req.headers.authorization.slice(7); kind = 'native';
        } else token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('reminder_session='))?.slice(17) || '';
        if (!token) throw new HttpError(401, 'Uygulamayı güncelleyin ve kişisel eşitleme kodunuzla bağlanın.');
        const session=auth.session(token,kind);
        if(kind==='web'&&method!=='GET'&&(!origin||digest(String(req.headers['x-csrf-token']||''))!==session.csrf_hash))throw new HttpError(403,'CSRF doğrulaması başarısız.');
        if(url.pathname==='/auth/session'&&method==='GET')return send(200,{user:{id:session.user_id,name:session.user_name,email:session.user_email||null,legacyOwner:!!session.is_legacy_owner},...(kind==='web'?{csrf:digest(`csrf:${token}`)}:{})});
        if(url.pathname==='/auth/update-email'&&method==='POST'){
          const body = await readBody();
          const updated = auth.updateEmail(session.user_id, body?.email);
          return send(200, { success: true, email: updated.email, user: { id: session.user_id, name: updated.name, email: updated.email, legacyOwner: !!session.is_legacy_owner } });
        }
        if(url.pathname==='/auth/logout'&&method==='POST'){
          db.sql.prepare('DELETE FROM devices WHERE id=?').run(session.id);
          if(kind==='web')res.setHeader('Set-Cookie',cookie('',0));return send(200,{success:true});
        }
        if(url.pathname==='/api/sync'&&method==='GET')return send(200,sync.processSync(session.user_id,{}));
        if(url.pathname==='/api/sync'&&method==='POST')return send(200,sync.processSync(session.user_id,await readBody()));
        if(url.pathname==='/api/backup'&&method==='GET')return send(200,sync.getFullBackup(session.user_id));
        if(url.pathname==='/api/restore'&&method==='POST')return send(200,sync.restoreFullBackup(session.user_id,await readBody()));
        throw new HttpError(404,'Uç nokta bulunamadı.');
      }
      if(method!=='GET'&&method!=='HEAD')throw new HttpError(405,'İşlem desteklenmiyor.');
      // Serve the browser app from the API origin: no cross-site HTTP cookies.
      let file=path.resolve(webRoot,`.${decodeURIComponent(url.pathname)}`);
      if(file!==webRoot&&!file.startsWith(webRoot+path.sep))throw new HttpError(404,'Bulunamadı.');
      if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){
        if(path.extname(url.pathname))throw new HttpError(404,'Bulunamadı.');file=path.join(webRoot,'index.html');
      }
      if(!fs.existsSync(file))throw new HttpError(404,'Web derlemesi henüz kurulmamış.');
      const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.apk':'application/vnd.android.package-archive'};
      res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
      if(path.extname(file)==='.apk'){
        res.setHeader('Content-Length', String(fs.statSync(file).size));
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(file)}"`);
      }
      if(method==='HEAD')return res.end();
      if(path.extname(file)==='.html')return res.end(fs.readFileSync(file,'utf8').replace('<head>',`<head><meta name="reminder-api-origin" content="${publicUrl.origin}">`));
      fs.createReadStream(file).pipe(res);
    }catch(err){if(!res.headersSent)send(err instanceof HttpError?err.status:500,{error:err instanceof HttpError?err.message:'İşlem tamamlanamadı.'});else res.end();}
  });
}
