import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { RutinDatabase } from '../server/dist/db.js';
import { SyncService } from '../server/dist/syncService.js';

test('Server API Integration Test: sync, backup and restore endpoints', async (t) => {
  const testDbDir = path.resolve('scratch/test_db');
  fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, `test_${Date.now()}.sqlite`);

  const db = new RutinDatabase(testDbPath);
  await db.initAsync(testDbPath);
  const syncService = new SyncService(db);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const method = req.method?.toUpperCase() || 'GET';

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
    }

    if (url.pathname === '/api/sync' && method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        const payload = body ? JSON.parse(body) : {};
        const result = syncService.processSync(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }

    if (url.pathname === '/api/backup' && method === 'GET') {
      const backup = syncService.getFullBackup();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(backup));
    }

    if (url.pathname === '/api/restore' && method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        const payload = JSON.parse(body);
        const result = syncService.restoreFullBackup(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(() => {
    server.close();
    try {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    } catch {}
  });

  // 1. GET /health
  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok');

  // 2. POST /api/sync
  const syncPayload = {
    doses: [
      { id: 101, name: 'Parol', amount: '500 mg', time: '09:00', status: 'pending', updatedAt: 1000 },
      { id: 102, name: 'Coraspin', amount: '100 mg', time: '13:00', status: 'pending', updatedAt: 1000 },
    ],
    learnedMeds: {
      '08699508010071': { gtin: '08699508010071', name: 'Parol', amount: '500 mg' },
    },
    settings: { userName: 'TestUser' },
  };

  const syncRes = await fetch(`${baseUrl}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(syncPayload),
  });
  assert.equal(syncRes.status, 200);
  const syncData = await syncRes.json();
  assert.equal(syncData.success, true);
  assert.equal(syncData.doses.length, 2);
  assert.equal(syncData.learnedMeds['08699508010071']?.name, 'Parol');

  // 3. GET /api/backup
  const backupRes = await fetch(`${baseUrl}/api/backup`);
  assert.equal(backupRes.status, 200);
  const backupData = await backupRes.json();
  assert.equal(backupData.version, 1);
  assert.equal(backupData.doses.length, 2);

  // 4. POST /api/restore
  const restorePayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    doses: [
      { id: 201, name: 'Arveles', amount: '25 mg', time: '14:00', status: 'pending', updatedAt: 2000 },
    ],
    learnedMeds: {},
    settings: {},
  };

  const restoreRes = await fetch(`${baseUrl}/api/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(restorePayload),
  });
  assert.equal(restoreRes.status, 200);
  const restoreData = await restoreRes.json();
  assert.equal(restoreData.success, true);

  // Verify backup now only has the restored dose
  const afterBackupRes = await fetch(`${baseUrl}/api/backup`);
  const afterBackupData = await afterBackupRes.json();
  assert.equal(afterBackupData.doses.length, 1);
  assert.equal(afterBackupData.doses[0].name, 'Arveles');
});
