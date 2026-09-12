import type {Session} from './account';
import {newId} from './account';
export const localStore={getItem:async(key:string)=>localStorage.getItem(key),setItem:async(key:string,value:string)=>{localStorage.setItem(key,value);}};
function base(url:string){return new URL(url).origin;}
export function isSameServer(url:string){try{return base(url)===window.location.origin;}catch{return false;}}
export async function authRequest(url:string,endpoint:string,body?:any,session?:Session):Promise<any>{
  if(!isSameServer(url))throw new Error('Web eşitlemesi için uygulamayı sunucu adresinden açın.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const res=await fetch(`${base(url)}${endpoint}`,{method:body===undefined?'GET':'POST',credentials:'include',headers:{'Content-Type':'application/json',...(body===undefined?{}:{'X-CSRF-Token':session?.csrf||'login'})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Bağlantı başarısız.');return data;
  }finally{clearTimeout(timer);}
}
const codeKey='reminder_sync_code_v2';
export function getStoredSyncCode():string|null{return localStorage.getItem(codeKey);}
export function saveSyncCode(code:string):void{localStorage.setItem(codeKey,code);}
export function clearStoredSyncCode():void{localStorage.removeItem(codeKey);}

export async function registerAccount(url:string,name?:string,email?:string):Promise<{user:any;csrf:string;expiresAt:number;syncCode:string;recoveryKey:string}>{
  let deviceId=localStorage.getItem('reminder_device_v2');if(!deviceId){deviceId=newId();localStorage.setItem('reminder_device_v2',deviceId);}
  const res=await authRequest(url,'/auth/register',{name,email,deviceId,deviceName:'Web',kind:'web'});
  saveSyncCode(res.syncCode);
  return res;
}
export async function updateUserEmail(url:string,email:string,session?:Session):Promise<{success:boolean;email:string;user:any}>{
  return authRequest(url,'/auth/update-email',{email},session);
}
export async function login(url:string,code:string):Promise<Session>{
  let deviceId=localStorage.getItem('reminder_device_v2');if(!deviceId){deviceId=newId();localStorage.setItem('reminder_device_v2',deviceId);}
  const res=await authRequest(url,'/auth/login',{code,deviceId,deviceName:'Web',kind:'web'});
  saveSyncCode(code);
  return res;
}
export async function recover(url:string,recoveryKey:string):Promise<{user:any;csrf:string;expiresAt:number;newSyncCode:string;newRecoveryKey:string}>{
  let deviceId=localStorage.getItem('reminder_device_v2');if(!deviceId){deviceId=newId();localStorage.setItem('reminder_device_v2',deviceId);}
  const res=await authRequest(url,'/auth/recover',{recoveryKey,deviceId,deviceName:'Web',kind:'web'});
  saveSyncCode(res.newSyncCode);
  return res;
}
export const getSession=(url:string):Promise<Session>=>authRequest(url,'/auth/session');
export const logout=async(url:string,session:Session)=>{
  try{return await authRequest(url,'/auth/logout',{},session);}finally{clearStoredSyncCode();}
};

