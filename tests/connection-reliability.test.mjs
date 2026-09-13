import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from '../mobile-app/node_modules/typescript/lib/typescript.js';
import * as web from '../src/syncManager.ts';
import * as native from '../mobile-app/src/syncManager.ts';

for (const [platform, api] of Object.entries({web, native})) {
  test(`${platform}: only the exact old cloud origin migrates`, () => {
    assert.equal(api.restoreServerUrl(api.LEGACY_CLOUD_SERVER_URL + '/api/'), api.DEFAULT_SYNC_SERVER_URL);
    for (const url of ['https://another.workers.dev', api.LEGACY_CLOUD_SERVER_URL + '.evil.example']) {
      assert.equal(api.isLegacyServerOrigin(url), false);
      assert.equal(api.restoreServerUrl(url), url);
    }
  });

  test(`${platform}: timeout covers an unresponsive transport and never replays a write`, async t => {
    let calls = 0, signal;
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
      calls++; signal = options.signal;
      return new Promise(() => {}); // Even a transport ignoring abort must settle the UI.
    });
    await assert.rejects(api.requestServerJson(api.DEFAULT_SYNC_SERVER_URL + '/auth/login', {method:'POST'}, 10),
      error => error.code === 'timeout' && error.endpoint === '/auth/login' && /zaman aşımına/.test(error.message));
    assert.equal(calls, 1);
    assert.equal(signal.aborted, true);
  });

  test(`${platform}: stalled body also obeys the deadline`, async t => {
    t.mock.method(globalThis, 'fetch', async () => ({ok:true, status:200, text:() => new Promise(() => {})}));
    await assert.rejects(api.requestServerJson(api.DEFAULT_SYNC_SERVER_URL + '/api/sync', {method:'POST'}, 10),
      error => error.code === 'timeout');
  });

  test(`${platform}: distinguishes invalid credentials, gateway HTML and transport errors`, async t => {
    const url = api.DEFAULT_SYNC_SERVER_URL + '/auth/login';
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({error:'Eşitleme kodu geçersiz.'}, {status:401}));
    await assert.rejects(api.requestServerJson(url), error => error.status === 401 && /kodu geçersiz/.test(error.message));
    fetchMock.mock.mockImplementation(async () => new Response('<html>unavailable</html>', {status:503}));
    await assert.rejects(api.requestServerJson(url), error => error.status === 503 && !error.message.includes('<html>'));
    fetchMock.mock.mockImplementation(async () => {throw new TypeError('Network request failed');});
    await assert.rejects(api.requestServerJson(url), error => error.code === 'network' && error.endpoint === '/auth/login');
    assert.equal(fetchMock.mock.callCount(), 3);
  });
}

function nativeAuth(initial) {
  const data = new Map(Object.entries(initial));
  const secure = {
    getItemAsync: async key => data.get(key) ?? null,
    setItemAsync: async (key, value) => {data.set(key, value);},
    deleteItemAsync: async key => {data.delete(key);},
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('mobile-app/src/authClient.ts','utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const mocks = {'./syncManager':native,'./account':{newId:()=>'test-device'},
    'react-native':{Platform:{OS:'android'}},'expo-secure-store':secure,'@react-native-async-storage/async-storage':{}};
  vm.runInNewContext(source, {exports, URL, require:name=> {
    if (!(name in mocks)) throw Error(name);
    return mocks[name];
  }});
  return {api:exports, data};
}

test('native: cloud token migrates only after matching account verification; failures preserve credentials', async t => {
  const user = {id:'same-user',name:'Test',legacyOwner:false};
  const session = {user,token:'test-token'};
  const saved = JSON.stringify({origin:native.LEGACY_CLOUD_SERVER_URL,session});
  const {api,data} = nativeAuth({reminder_session_v2:saved, reminder_sync_code_v2:'test-code'});
  const responses = [{status:503,body:{error:'unavailable'}},{status:200,body:{user:{...user,id:'other-user'}}},{status:200,body:{user}}];
  t.mock.method(globalThis,'fetch',async (url,options) => {
    assert.equal(new URL(url).origin,native.DEFAULT_SYNC_SERVER_URL);
    assert.equal(options.headers.Authorization,'Bearer test-token');
    const response = responses.shift();
    return Response.json(response.body,{status:response.status});
  });
  await assert.rejects(api.logout(native.DEFAULT_SYNC_SERVER_URL,session));
  assert.equal(data.get('reminder_session_v2'),saved);
  assert.equal(data.get('reminder_sync_code_v2'),'test-code');
  await assert.rejects(api.getSession(native.DEFAULT_SYNC_SERVER_URL), /hesap doğrulanamadı/);
  assert.equal(data.get('reminder_session_v2'),saved);
  await api.getSession(native.DEFAULT_SYNC_SERVER_URL);
  const migrated = JSON.parse(data.get('reminder_session_v2'));
  assert.equal(migrated.origin,native.DEFAULT_SYNC_SERVER_URL);
  assert.deepEqual(migrated.session,session);
});
