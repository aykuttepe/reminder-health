import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { RutinDatabase } from '../server/dist/db.js';
import { AuthService } from '../server/dist/auth.js';
import { SyncService } from '../server/dist/syncService.js';
import { createServer } from '../server/dist/app.js';
import { randomUUID } from 'node:crypto';
import { doseId } from '../server/dist/identity.js';

async function fixture(t) {
  const dir=mkdtempSync(path.join(os.tmpdir(),'reminder-auth-test-'));
  const db=new RutinDatabase(path.join(dir,'test.sqlite'));await db.initAsync();
  const auth=new AuthService(db),service=new SyncService(db);
  const a=auth.createUser('A'),b=auth.createUser('B');
  const server=createServer(db,{publicUrl:'http://127.0.0.1:3051',allowedOrigins:['http://127.0.0.1:3051']});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});});
  const call=async(route,body,headers={})=>{const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});return {r,data:await r.json()};};
  const login=async(user,kind='native')=>call('/auth/login',{code:user.syncCode,deviceId:randomUUID(),kind},kind==='web'?{Origin:'http://127.0.0.1:3051','X-CSRF-Token':'login'}:{});
  return {db,auth,service,a,b,call,login};
}
const medicine=(patch={})=>({id:101,name:'Test medicine',time:'09:00',amount:'1',status:'pending',updatedAt:1000,...patch});
test('tenant isolation covers sync, identical UUID/GTIN/setting keys, backup and restore',async t=>{
  const {a,b,call,login}=await fixture(t);
  const sa=(await login(a)).data,sb=(await login(b)).data;
  const ha={Authorization:`Bearer ${sa.token}`},hb={Authorization:`Bearer ${sb.token}`};
  const id=randomUUID();
  for(const [h,name] of [[ha,'A'],[hb,'B']]){
    const result=await call('/api/sync',{doses:[medicine({id,name})],learnedMeds:{'08699508010071':{name}},settings:{userName:name,apiToken:'must-not-persist'}},h);
    assert.equal(result.r.status,200);assert.equal(result.data.doses[0].name,name);assert.equal(result.data.settings.apiToken,undefined);
  }
  const backup=(await call('/api/backup',undefined,ha)).data;
  assert.equal(backup.ownerId,a.userId);assert.equal(backup.doses.length,1);
  assert.equal((await call('/api/restore',backup,hb)).r.status,403);
  assert.equal((await call('/api/restore',{...backup,doses:[]},ha)).r.status,200);
  assert.equal((await call('/api/sync',undefined,hb)).data.doses[0].name,'B');
  for(const route of ['/api/sync','/api/backup'])assert.equal((await call(route)).r.status,401);
  for(const k of ['user_id','userId'])assert.equal((await call('/api/sync',{[k]:b.userId,doses:[]},ha)).r.status,400);
});
test('doctor profile settings persist into sqlite settings table and sync across devices', async t => {
  const { a, call, login, db } = await fixture(t);
  const sa = (await login(a)).data;
  const ha = { Authorization: `Bearer ${sa.token}` };

  const doctorData = {
    userName: 'Aykut',
    doctorName: 'Prof. Dr. Ahmet Yılmaz',
    doctorSpecialty: 'Nefroloji',
    doctorHospital: 'Acıbadem Maslak',
    doctorPhone: '05321234567',
    doctorNextAppointment: '2026-09-25',
    doctorNotes: 'Tansiyon 14ü geçerse haber ver',
  };

  const syncRes = await call('/api/sync', { settings: doctorData }, ha);
  assert.equal(syncRes.r.status, 200);
  assert.equal(syncRes.data.settings.doctorName, doctorData.doctorName);
  assert.equal(syncRes.data.settings.doctorSpecialty, doctorData.doctorSpecialty);
  assert.equal(syncRes.data.settings.doctorHospital, doctorData.doctorHospital);
  assert.equal(syncRes.data.settings.doctorPhone, doctorData.doctorPhone);
  assert.equal(syncRes.data.settings.doctorNextAppointment, doctorData.doctorNextAppointment);
  assert.equal(syncRes.data.settings.doctorNotes, doctorData.doctorNotes);

  // Directly verify records in SQLite settings table:
  const dbSettings = db.getAllSettings(a.userId);
  assert.equal(dbSettings.doctorName, doctorData.doctorName);
  assert.equal(dbSettings.doctorSpecialty, doctorData.doctorSpecialty);
  assert.equal(dbSettings.doctorHospital, doctorData.doctorHospital);
  assert.equal(dbSettings.doctorPhone, doctorData.doctorPhone);
  assert.equal(dbSettings.doctorNextAppointment, doctorData.doctorNextAppointment);
  assert.equal(dbSettings.doctorNotes, doctorData.doctorNotes);

  // Verify second device gets them on empty sync:
  const secondDeviceRes = await call('/api/sync', undefined, ha);
  assert.equal(secondDeviceRes.data.settings.doctorName, doctorData.doctorName);
  assert.equal(secondDeviceRes.data.settings.doctorPhone, doctorData.doctorPhone);
});
test('same-user devices share UUID conversion, deep dated history and deletion',async t=>{
  const {a,b,service}=await fixture(t);
  const x=service.processSync(a.userId,{doses:[medicine({dailyStatuses:{'2026-09-01':{'09:00':'taken'}}})]});
  assert.equal(x.doses[0].id,doseId(a.userId,101));
  assert.notEqual(x.doses[0].id,doseId(b.userId,101));
  const y=service.processSync(a.userId,{doses:[medicine({updatedAt:2000,dailyStatuses:{'2026-09-01':{'20:00':'taken'}}})]});
  assert.deepEqual(y.doses[0].dailyStatuses['2026-09-01'],{'09:00':'taken','20:00':'taken'});
  service.processSync(a.userId,{doses:[medicine({updatedAt:3000,deletedAt:3000})]});
  assert.equal(service.processSync(a.userId,{doses:[medicine()]}).doses[0].deletedAt,3000);
});
test('web cookie is HttpOnly, tokens stay out of JSON, CSRF and origin are mandatory',async t=>{
  const {a,call,login}=await fixture(t);
  const {r,data}=await login(a,'web');assert.equal(r.status,200);assert.equal(data.token,undefined);
  assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);
  const Cookie=r.headers.get('set-cookie').split(';')[0],Origin='http://127.0.0.1:3051';
  assert.equal((await call('/api/sync',{}, {Cookie,Origin})).r.status,403);
  assert.equal((await call('/api/sync',{}, {Cookie,'X-CSRF-Token':data.csrf})).r.status,403);
  assert.equal((await call('/api/sync',{}, {Cookie,Origin:'http://evil.invalid','X-CSRF-Token':data.csrf})).r.status,403);
  assert.equal((await call('/api/sync',{}, {Cookie,Origin,'X-CSRF-Token':data.csrf})).r.status,200);
  const refreshed=await call('/auth/session',undefined,{Cookie,Origin});assert.equal(refreshed.data.csrf,data.csrf);
  assert.equal((await call('/auth/logout',{}, {Cookie,Origin,'X-CSRF-Token':data.csrf})).r.status,200);
  assert.equal((await call('/api/backup',undefined,{Cookie,Origin})).r.status,401);
});
test('code reset revokes every device and retains data; codes only stored as hashes',async t=>{
  const {a,db,auth,call,login,service}=await fixture(t);
  const one=(await login(a)).data,two=(await login(a)).data;
  service.processSync(a.userId,{doses:[medicine()]});
  const row=db.sql.prepare('SELECT * FROM users WHERE id=?').get(a.userId);assert.ok(!JSON.stringify(row).includes(a.syncCode));
  const reset=auth.rotateCode(a.userId);
  for(const token of [one.token,two.token])assert.equal((await call('/api/sync',undefined,{Authorization:`Bearer ${token}`})).r.status,401);
  assert.equal((await login(a)).r.status,401);
  const next=(await login(reset)).data;
  assert.equal((await call('/api/sync',undefined,{Authorization:`Bearer ${next.token}`})).data.doses.length,1);
  db.sql.prepare('UPDATE devices SET expires_at=0 WHERE user_id=?').run(a.userId);
  assert.equal((await call('/api/sync',undefined,{Authorization:`Bearer ${next.token}`})).r.status,401);
});
test('failed codes are rate limited and anonymous restore is rejected',async t=>{
  const {call}=await fixture(t);
  let result;
  for(let i=0;i<16;i++)result=await call('/auth/login',{code:'x'.repeat(43),deviceId:randomUUID(),kind:'native'});
  assert.equal(result.r.status,429);
  assert.equal((await call('/api/restore',{version:2,doses:[]})).r.status,401);
  assert.equal((await call('/health')).data.authRequired,true);
});
test('legacy migration backs up, assigns owner and atomically preserves old IDs and data',async t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'reminder-migration-test-')),file=path.join(dir,'old.sqlite');
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const old=new DatabaseSync(file);
  old.exec('CREATE TABLE doses(id INTEGER PRIMARY KEY,name TEXT,data TEXT,updated_at INTEGER,deleted_at INTEGER);CREATE TABLE learned_meds(gtin TEXT PRIMARY KEY,name TEXT,data TEXT,updated_at INTEGER);CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT,updated_at INTEGER);');
  old.prepare('INSERT INTO doses VALUES(?,?,?,?,?)').run(101,'Medicine',JSON.stringify(medicine()),1000,null);old.close();
  const db=new RutinDatabase(file);await db.initAsync();
  assert.ok(existsSync(db.backupPath));
  const owner=db.sql.prepare('SELECT id FROM users WHERE is_legacy_owner=1').get().id;
  assert.equal(db.getAllDoses(owner)[0].id,doseId(owner,101));
  const again=new RutinDatabase(file);await again.initAsync();assert.equal(again.getAllDoses(owner).length,1);assert.equal(again.backupPath,null);again.close();
});
test('catalog lookup resolves GTIN barcodes and text search without authentication', async t => {
  const { call } = await fixture(t);
  // 1. Known medicine lookup (Prograf 1 mg: 08699043890338)
  const resPrograf = await call('/api/catalog/08699043890338');
  assert.equal(resPrograf.r.status, 200);
  assert.equal(resPrograf.data.found, true);
  assert.equal(resPrograf.data.name, 'Prograf');
  assert.equal(resPrograf.data.amount, '1 mg');
  assert.equal(resPrograf.data.form, 'kapsul');

  // 2. Coraspin (08699546130238)
  const resCoraspin = await call('/api/catalog/08699546130238');
  assert.equal(resCoraspin.r.status, 200);
  assert.equal(resCoraspin.data.found, true);
  assert.equal(resCoraspin.data.name, 'Coraspin');

  // 3. Unknown barcode returns 404
  const resUnknown = await call('/api/catalog/08699999999999');
  assert.equal(resUnknown.r.status, 404);
  assert.equal(resUnknown.data.found, false);

  // 4. Text search
  const resSearch = await call('/api/catalog?q=prograf');
  assert.equal(resSearch.r.status, 200);
  assert.ok(resSearch.data.results.length > 0);
  assert.ok(resSearch.data.results.some(m => m.name.includes('Prograf')));

  // 5. Version endpoint
  const resVersion = await call('/api/version');
  assert.equal(resVersion.r.status, 200);
  assert.equal(resVersion.data.version, '0.2.3');
  assert.equal(resVersion.data.apkUrl, '/app-release.apk');
});


