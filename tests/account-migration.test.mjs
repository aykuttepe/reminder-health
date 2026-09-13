import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from '../mobile-app/node_modules/typescript/lib/typescript.js';
import * as uuid from 'uuid';

const cloud = 'https://api.mytepeapi.com.tr';
const old = 'http://192.168.1.100:3050';
const user = {id:'d56ee3d9-9c65-4cc1-994c-ab694fd73a29',name:'Test',legacyOwner:false};
const snapshot = {doses:[{id:1,name:'Test',stock:12}],learnedMeds:{test:{}},settings:{language:'tr'}};
const bound = 'reminder_bound_account_v2';
function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, async getItem(k){return data.get(k) ?? null;}, async setItem(k,v){data.set(k,v);} };
}
function load(root, file, mocks = {}) {
  const filename = path.resolve(root,file);
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(filename,'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  vm.runInNewContext(source,{exports,URL,AbortController,setTimeout,clearTimeout,
    fetch:(...args)=>globalThis.fetch(...args),
    require(name) {
      if(name in mocks)return mocks[name];
      if(name==='uuid')return uuid;
      if(name==='expo-crypto')return {randomUUID:uuid.v4};
      return load(root,name+'.ts',mocks);
    }
  },{filename});
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
for (const root of ['src','mobile-app/src']) {
  const api=load(root,'account.ts');
  test(`${root}: custom-domain migration preserves the old cloud snapshot and account isolation`,async()=>{
    const previous=api.accountKey('https://rutin-api.tepe-aykut05.workers.dev',user.id);
    const store=storage({[bound]:previous});
    const result=await api.switchAccount(store,cloud,user,snapshot);
    assert.equal(result.doses[0].stock,12);
    assert.deepEqual(result.settings,snapshot.settings);
    assert.deepEqual(JSON.parse(await store.getItem(`reminder_vault:${previous}`)),snapshot);
    assert.equal(await store.getItem(bound),api.accountKey(cloud,user.id));
    await api.finishSwitch(store,{doses:'d',learned:'l',settings:'s'});
    assert.equal(JSON.parse(await store.getItem('d'))[0].stock,12);
  });
  test(`${root}: migration preserves records, legacy vault and restart journal`,async()=>{
    const oldKey=api.accountKey(old,user.id), next=api.accountKey(cloud,user.id);
    const store=storage({[bound]:oldKey});
    const result=await api.switchAccount(store,cloud,user,snapshot);
    assert.equal(result.doses[0].stock,12);
    assert.ok(uuid.validate(result.doses[0].id));
    assert.deepEqual(JSON.parse(await store.getItem(`reminder_vault:${oldKey}`)),snapshot);
    assert.deepEqual(JSON.parse(await store.getItem(`reminder_vault:${next}`)),plain(result));
    await api.finishSwitch(store,{doses:'d',learned:'l',settings:'s'});
    assert.deepEqual(JSON.parse(await store.getItem('d')),plain(result.doses));
    assert.equal(await store.getItem(bound),next);
    assert.equal(await store.getItem('reminder_pending_switch_v2'),'');
    assert.deepEqual(plain(await api.switchAccount(store,cloud,user,result)),plain(result));
  });
  test(`${root}: interrupted migration can recover all records`,async()=>{
    const store=storage({[bound]:api.accountKey(old,user.id)});
    const save=store.setItem;
    store.setItem=async(k,v)=>{if(k===`reminder_vault:${api.accountKey(cloud,user.id)}`)throw Error('disk interruption');await save(k,v);};
    await assert.rejects(api.switchAccount(store,cloud,user,snapshot),/disk interruption/);
    store.setItem=save;
    await api.finishSwitch(store,{doses:'d',learned:'l',settings:'s'});
    assert.equal(JSON.parse(await store.getItem('d'))[0].stock,12);
    assert.equal(await store.getItem(bound),api.accountKey(cloud,user.id));
  });
  test(`${root}: unrelated origins, accounts and unbound data cannot bypass isolation`,async()=>{
    for(const origin of ['https://unrelated.example','https://localhost.evil.example']) {
      await assert.rejects(api.assertAccount(storage({[bound]:api.accountKey(origin,user.id)}),cloud,user),/yeniden/);
    }
    await assert.rejects(api.assertAccount(storage(),cloud,user),/yeniden/);
    const store=storage({[bound]:api.accountKey(old,user.id)});
    await assert.rejects(api.assertAccount(store,'https://unrelated.example',user),/yeniden/);
    const other={...user,id:uuid.v4()};
    await assert.rejects(api.assertAccount(store,cloud,other),/yeniden/);
    const result=await api.switchAccount(store,cloud,other,snapshot);
    assert.deepEqual(plain(result.doses),[]);
  });
  test(`${root}: same account assertion accepts HTTP/private migration only to cloud`,async()=>{
    for(const origin of [old,'http://legacy.example:3050','https://10.0.0.2','https://[::1]','https://rutin-api.tepe-aykut05.workers.dev']){
      const store=storage({[bound]:api.accountKey(origin,user.id)});
      await api.assertAccount(store,cloud,user);
      assert.equal(await store.getItem(bound),api.accountKey(cloud,user.id));
    }
  });
}
test('native: token migration is scoped to cloud and persisted after verified session',async t=>{
  let saved={origin:old,session:{user,token:'test-token'}};
  const requests=[];
  let status=401;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    requests.push({url,options});
    return Response.json(status===200?{user}:{error:'expired'},{status});
  });
  const api=load('mobile-app/src','authClient.ts',{
    '@react-native-async-storage/async-storage':{},
    'react-native':{Platform:{OS:'android'}},
    'expo-secure-store':{getItemAsync:async()=>JSON.stringify(saved),setItemAsync:async(k,v)=>{saved=JSON.parse(v);}}
  });
  await assert.rejects(api.getSession(cloud),/expired/);
  assert.equal(saved.origin,old);
  assert.equal(requests.at(-1).options.headers.Authorization,'Bearer test-token');
  await assert.rejects(api.getSession('https://unrelated.example'),/expired/);
  assert.equal(requests.at(-1).options.headers.Authorization,undefined);
  status=200;
  await api.getSession(cloud);
  assert.equal(saved.origin,cloud);
});
