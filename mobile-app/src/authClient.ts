import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';
import {newId,type Session} from './account';
export const localStore=AsyncStorage;
const key='reminder_session_v2';
function base(url:string){return new URL(url).origin;}
export async function authRequest(url:string,endpoint:string,body?:any,session?:Session):Promise<any>{
  const origin=base(url),stored=await SecureStore.getItemAsync(key);
  const saved=stored?JSON.parse(stored):null;
  const token=session?.token||(saved?.origin===origin?saved.session.token:(saved?.session?.token?saved.session.token:undefined));
  if(saved&&saved.origin!==origin&&saved.session?.token){
    saved.origin=origin;
    SecureStore.setItemAsync(key,JSON.stringify(saved),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}).catch(()=>{});
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const res=await fetch(`${origin}${endpoint}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Bağlantı başarısız.');return data;
  }finally{clearTimeout(timer);}
}
const codeKey='reminder_sync_code_v2';
export async function getStoredSyncCode():Promise<string|null>{return await SecureStore.getItemAsync(codeKey);}
export async function saveSyncCode(code:string):Promise<void>{await SecureStore.setItemAsync(codeKey,code,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}
export async function clearStoredSyncCode():Promise<void>{await SecureStore.deleteItemAsync(codeKey);}

export async function registerAccount(url:string,name?:string,email?:string):Promise<{session:Session;syncCode:string;recoveryKey:string}>{
  let deviceId=await SecureStore.getItemAsync('reminder_device_v2');
  if(!deviceId){deviceId=newId();await SecureStore.setItemAsync('reminder_device_v2',deviceId);}
  const res=await authRequest(url,'/auth/register',{name,email,deviceId,deviceName:Platform.OS,kind:'native'});
  const session:Session={user:res.user,token:res.token,csrf:res.csrf};
  await SecureStore.setItemAsync(key,JSON.stringify({origin:base(url),session}),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
  await saveSyncCode(res.syncCode);
  return {session,syncCode:res.syncCode,recoveryKey:res.recoveryKey};
}
export async function updateUserEmail(url:string,email:string,session?:Session):Promise<{success:boolean;email:string;user:any}>{
  const res = await authRequest(url,'/auth/update-email',{email},session);
  if (res.user) {
    const origin = base(url);
    const stored = await SecureStore.getItemAsync(key);
    if (stored) {
      const saved = JSON.parse(stored);
      if (saved?.origin === origin && saved.session) {
        saved.session.user = { ...saved.session.user, email: res.email };
        await SecureStore.setItemAsync(key, JSON.stringify(saved), {keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
      }
    }
  }
  return res;
}
export async function login(url:string,code:string):Promise<Session>{
  let deviceId=await SecureStore.getItemAsync('reminder_device_v2');
  if(!deviceId){deviceId=newId();await SecureStore.setItemAsync('reminder_device_v2',deviceId);}
  const session=await authRequest(url,'/auth/login',{code,deviceId,deviceName:Platform.OS,kind:'native'});
  await SecureStore.setItemAsync(key,JSON.stringify({origin:base(url),session}),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
  await saveSyncCode(code);
  return session;
}
export async function recover(url:string,recoveryKey:string):Promise<{session:Session;newSyncCode:string;newRecoveryKey:string}>{
  let deviceId=await SecureStore.getItemAsync('reminder_device_v2');
  if(!deviceId){deviceId=newId();await SecureStore.setItemAsync('reminder_device_v2',deviceId);}
  const res=await authRequest(url,'/auth/recover',{recoveryKey,deviceId,deviceName:Platform.OS,kind:'native'});
  const session:Session={user:res.user,token:res.token,csrf:res.csrf};
  await SecureStore.setItemAsync(key,JSON.stringify({origin:base(url),session}),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
  await saveSyncCode(res.newSyncCode);
  return {session,newSyncCode:res.newSyncCode,newRecoveryKey:res.newRecoveryKey};
}
export async function getSession(url:string):Promise<Session>{
  const result=await authRequest(url,'/auth/session');
  return result;
}
export async function logout(url:string,session:Session){
  try{return await authRequest(url,'/auth/logout',{},session);}finally{await SecureStore.deleteItemAsync(key);await clearStoredSyncCode();}
}

