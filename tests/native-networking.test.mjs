import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from '../mobile-app/node_modules/typescript/lib/typescript.js';

function setup(platform = 'android') {
  const requests = [];
  const timers = new Map();
  let response = {status:200, body:{status:'ok',version:'2.0.0'}};
  class XHR {
    headers = {};
    open(method,url){this.method=method;this.url=url;}
    setRequestHeader(k,v){this.headers[k.toLowerCase()]=v;}
    getAllResponseHeaders(){return 'content-type: application/json\r\n';}
    send(body){
      requests.push({method:this.method,url:this.url,headers:this.headers,body});
      if(response.hang)return;
      this.status=response.status;
      this.statusText=response.status===200?'OK':'Service Unavailable';
      this.responseURL=this.url;
      this.responseText=JSON.stringify(response.body);
      queueMicrotask(()=>{this.readyState=4;this.onreadystatechange?.();this.onload();});
    }
    abort(){this.readyState=4;this.onreadystatechange?.();this.onabort?.();}
  }
  const expoFetch = ()=>{throw Error('fetch failed');};
  const context=vm.createContext({exports:{}, fetch:expoFetch, XMLHttpRequest:XHR,
    URL,AbortController,console,queueMicrotask,
    setTimeout(fn,ms){if(ms===15000){const id={};timers.set(id,fn);return id;}return setTimeout(fn,ms);},
    clearTimeout(id){if(!timers.delete(id))clearTimeout(id);}
  });
  context.module={exports:context.exports};
  vm.runInContext(fs.readFileSync('mobile-app/node_modules/whatwg-fetch/dist/fetch.umd.js','utf8'),context);
  const polyfill=context.exports;
  context.require=name=>{
    if(name==='react-native')return {Platform:{OS:platform}};
    if(name==='whatwg-fetch')return polyfill;
    throw Error(name);
  };
  function load(file){
    context.exports={};
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
    }).outputText;
    vm.runInContext(code,context,{filename:file});
    return context.exports;
  }
  load('mobile-app/src/networking.ts');
  return {context,expoFetch,requests,timers,load,setResponse(value){response=value;}};
}

test('native bootstrap reaches health over XHR when Expo fetch fails',async()=>{
  const env=setup();
  const sync=env.load('mobile-app/src/syncManager.ts');
  const result=await sync.checkServerHealth(sync.DEFAULT_SYNC_SERVER_URL);
  assert.equal(result.ok,true);
  assert.equal(result.version,'2.0.0');
  assert.equal(env.requests[0].url,sync.DEFAULT_SYNC_SERVER_URL+'/health');
  assert.equal(env.timers.size,0);
});

test('native transport preserves sync method, token and JSON without retrying writes',async()=>{
  const env=setup();
  env.setResponse({status:200,body:{success:true,doses:[]}});
  const sync=env.load('mobile-app/src/syncManager.ts');
  assert.equal((await sync.syncWithServer(sync.DEFAULT_SYNC_SERVER_URL,'test-token',{doses:[]})).success,true);
  assert.equal(env.requests.length,1);
  assert.equal(env.requests[0].method,'POST');
  assert.equal(env.requests[0].headers.authorization,'Bearer test-token');
  assert.deepEqual(JSON.parse(env.requests[0].body),{doses:[]});
});

test('native health timeout aborts XHR and clears its timer',async()=>{
  const env=setup();env.setResponse({hang:true});
  const sync=env.load('mobile-app/src/syncManager.ts');
  const pending=sync.checkServerHealth(sync.DEFAULT_SYNC_SERVER_URL);
  assert.equal(env.timers.size,1);
  [...env.timers.values()][0]();
  const result=await pending;
  assert.equal(result.ok,false);
  assert.equal(result.error,'Zaman aşımı (15 sn)');
  assert.equal(env.timers.size,0);
});

test('HTTP failures and unexpected JSON are not reported as healthy',async()=>{
  const env=setup();const sync=env.load('mobile-app/src/syncManager.ts');
  env.setResponse({status:503,body:{status:'error'}});
  assert.match((await sync.checkServerHealth(sync.DEFAULT_SYNC_SERVER_URL)).error,/HTTP 503/);
  env.setResponse({status:200,body:{status:'error'}});
  assert.equal((await sync.checkServerHealth(sync.DEFAULT_SYNC_SERVER_URL)).ok,false);
  assert.equal(env.timers.size,0);
});

test('web bootstrap preserves browser fetch',()=>{
  const env=setup('web');assert.equal(env.context.fetch,env.expoFetch);
});
