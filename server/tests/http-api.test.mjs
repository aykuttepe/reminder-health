import test from 'node:test';
import assert from 'node:assert/strict';
import { RutinDatabase } from '../dist/db.js';
import { AuthService } from '../dist/auth.js';
import { createServer } from '../dist/app.js';

test('HTTP API endpoints for connect, recover, session, sync and logout', async () => {
  const db = new RutinDatabase(':memory:');
  await db.initAsync();
  const auth = new AuthService(db);
  const user = auth.createUser('Test User');

  const server = createServer(db, {
    publicUrl: 'http://127.0.0.1:3999',
    allowedOrigins: ['http://127.0.0.1:3999', 'http://localhost:5173']
  });

  await new Promise((resolve) => server.listen(3999, '127.0.0.1', resolve));
  const baseUrl = 'http://127.0.0.1:3999';

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.authRequired, true);

    // 1b. Register new user directly from app
    const registerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'App User',
        deviceId: '77777777-7777-7777-7777-777777777777',
        deviceName: 'Pixel 10',
        kind: 'native',
      }),
    });
    assert.equal(registerRes.status, 200);
    const regData = await registerRes.json();
    assert.ok(regData.token);
    assert.ok(regData.syncCode);
    assert.ok(regData.recoveryKey);
    assert.equal(regData.user.name, 'App User');

    // 2. Connect native device
    const connectRes = await fetch(`${baseUrl}/auth/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: user.syncCode,
        deviceId: '99999999-9999-9999-9999-999999999999',
        deviceName: 'Test Phone',
        kind: 'native',
      }),
    });
    assert.equal(connectRes.status, 200);
    const connectData = await connectRes.json();
    assert.ok(connectData.token);
    assert.equal(connectData.user.name, 'Test User');

    // 3. Authenticated session check
    const sessionRes = await fetch(`${baseUrl}/auth/session`, {
      headers: { Authorization: `Bearer ${connectData.token}` },
    });
    assert.equal(sessionRes.status, 200);
    const sessionData = await sessionRes.json();
    assert.equal(sessionData.user.id, user.userId);

    // 4. Sync data
    const syncRes = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${connectData.token}`,
      },
      body: JSON.stringify({
        doses: [{ id: '1', name: 'Aspirin', amount: '1', time: '10:00', status: 'pending', updatedAt: 1000 }],
        settings: { userName: 'Test User' },
      }),
    });
    assert.equal(syncRes.status, 200);
    const syncData = await syncRes.json();
    assert.equal(syncData.success, true);
    assert.equal(syncData.doses.length, 1);

    // 5. Recover with key
    const recoverRes = await fetch(`${baseUrl}/auth/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recoveryKey: user.recoveryKey,
        deviceId: '88888888-8888-8888-8888-888888888888',
        deviceName: 'Recovered Phone',
        kind: 'native',
      }),
    });
    assert.equal(recoverRes.status, 200);
    const recoverData = await recoverRes.json();
    assert.ok(recoverData.token);
    assert.ok(recoverData.newSyncCode);
    assert.ok(recoverData.newRecoveryKey);

    // 6. Old token must now be 401
    const oldSessionRes = await fetch(`${baseUrl}/auth/session`, {
      headers: { Authorization: `Bearer ${connectData.token}` },
    });
    assert.equal(oldSessionRes.status, 401);

    // 7. New token works
    const newSessionRes = await fetch(`${baseUrl}/auth/session`, {
      headers: { Authorization: `Bearer ${recoverData.token}` },
    });
    assert.equal(newSessionRes.status, 200);

    // 8. Logout
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${recoverData.token}` },
    });
    assert.equal(logoutRes.status, 200);

    // 9. Session after logout is 401
    const postLogoutRes = await fetch(`${baseUrl}/auth/session`, {
      headers: { Authorization: `Bearer ${recoverData.token}` },
    });
    assert.equal(postLogoutRes.status, 401);

  } finally {
    server.close();
    db.close();
  }
});
