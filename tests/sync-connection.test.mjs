import test from 'node:test';
import assert from 'node:assert/strict';
import * as web from '../src/syncManager.ts';
import * as mobile from '../mobile-app/src/syncManager.ts';

for (const [platform, sync] of Object.entries({ web, mobile })) {
  test(`${platform}: existing installations leave the conflicting legacy server`, () => {
    for (const saved of [undefined, null, '', 'http://localhost:3000',
      'http://192.168.1.50:3000', ' 192.168.1.100:3000/ ', 'http://192.168.1.100:3050', 'http://192.168.1.50:3050', 'http://localhost:3050']) {
      assert.equal(sync.restoreServerUrl(saved), 'https://api.mytepeapi.com.tr');
    }
    for (const custom of ['https://sync.example.com', 'https://custom-api.workers.dev']) {
      assert.equal(sync.restoreServerUrl(custom), custom);
    }
  });

  test(`${platform}: migrated and scheme-free addresses reach the correct endpoints`, async t => {
    const requests = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      requests.push({ url, options });
      return Response.json(url.endsWith('/health')
        ? { status: 'ok', version: '2.0.0' }
        : { success: true, doses: [], learnedMeds: {}, serverTime: 1 });
    });
    const restored = sync.restoreServerUrl('192.168.1.100:3000');
    assert.equal((await sync.checkServerHealth(restored)).ok, true);
    assert.equal((await sync.syncWithServer(restored, ' test-token ', { doses: [] })).success, true);
    assert.deepEqual(requests.map(r => r.url), [
      'https://api.mytepeapi.com.tr/health', 'https://api.mytepeapi.com.tr/api/sync',
    ]);
    assert.equal(requests[1].options.headers.Authorization, 'Bearer test-token');
    assert.equal(requests[1].options.method, 'POST');
  });
}
