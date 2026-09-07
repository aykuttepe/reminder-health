import http from 'node:http';
import { RutinDatabase } from './db.js';
import { SyncService } from './syncService.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const API_TOKEN = (process.env.API_TOKEN || '').trim();

const db = new RutinDatabase();
await db.initAsync();
const syncService = new SyncService(db);

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(json);
}

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req: http.IncomingMessage): boolean {
  if (!API_TOKEN) return true; // Token konfigüre edilmemişse açık
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return token === API_TOKEN;
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method?.toUpperCase() || 'GET';

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  // 1. Healthcheck (Auth gerektirmez)
  if (pathname === '/health' && method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      version: '1.0.0',
      timestamp: Date.now(),
      authRequired: !!API_TOKEN,
    });
  }

  // Yetkilendirme Kontrolü
  if (!isAuthorized(req)) {
    return sendJson(res, 401, {
      error: 'Yetkisiz erişim: Geçersiz veya eksik Bearer token.',
    });
  }

  try {
    // 2. GET /api/sync
    if (pathname === '/api/sync' && method === 'GET') {
      const result = syncService.processSync({});
      return sendJson(res, 200, result);
    }

    // 3. POST /api/sync
    if (pathname === '/api/sync' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = syncService.processSync(body);
      return sendJson(res, 200, result);
    }

    // 4. GET /api/backup
    if (pathname === '/api/backup' && method === 'GET') {
      const backup = syncService.getFullBackup();
      return sendJson(res, 200, backup);
    }

    // 5. POST /api/restore
    if (pathname === '/api/restore' && method === 'POST') {
      const body = await parseJsonBody(req);
      const result = syncService.restoreFullBackup(body);
      return sendJson(res, 200, result);
    }

    // 404 Not Found
    return sendJson(res, 404, { error: `Bilinmeyen uç nokta: ${method} ${pathname}` });
  } catch (err: any) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: err.message || 'Sunucu hatası' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[Rutin Sync Server] Çalışıyor: http://${HOST}:${PORT}`);
  if (API_TOKEN) {
    console.log(`[Rutin Sync Server] Güvenlik: Bearer Token aktif.`);
  } else {
    console.log(`[Rutin Sync Server] Güvenlik: Token tanımlanmadı (Açık mod).`);
  }
});
