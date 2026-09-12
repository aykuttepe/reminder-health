import { v5, validate, v4 } from 'uuid';
export const newId = () => v4();
export function migrateDoseIds<T extends {id:string|number}>(doses:T[],userId:string):T[] {
  return doses.map(d=>({...d,id:typeof d.id==='string'&&validate(d.id)?d.id:v5(`legacy-dose:${d.id}`,userId)}));
}
export type Account = {id:string;name:string;email?:string|null;legacyOwner:boolean};
export type Session = {user:Account;csrf?:string;token?:string};
export type Snapshot = {doses:any[];learnedMeds:Record<string,any>;settings:Record<string,any>};
export interface Store {getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>}
export const emptySnapshot=():Snapshot=>({doses:[],learnedMeds:{},settings:{}});
export const accountKey=(url:string,id:string)=>`${new URL(url).origin}|${id}`;
// All account switches are journaled before changing the UI. Legacy data is retained separately.
export async function switchAccount(store:Store,url:string,account:Account,current:Snapshot):Promise<Snapshot>{
  const next=accountKey(url,account.id), previous=await store.getItem('reminder_bound_account_v2');
  if(previous===next)return {...current,doses:migrateDoseIds(current.doses,account.id)};
  if(previous)await store.setItem(`reminder_vault:${previous}`,JSON.stringify(current));
  else if(!(await store.getItem('reminder_legacy_snapshot_v2')))await store.setItem('reminder_legacy_snapshot_v2',JSON.stringify(current));
  const saved=await store.getItem(`reminder_vault:${next}`);
  const legacyClaim=await store.getItem('reminder_legacy_claim_v2');
  const legacy=account.legacyOwner&&!legacyClaim?await store.getItem('reminder_legacy_snapshot_v2'):null;
  const selected:Snapshot=saved?JSON.parse(saved):legacy?JSON.parse(legacy):emptySnapshot();
  const result={...selected,doses:migrateDoseIds(selected.doses,account.id)};
  // The pending snapshot lets startup recover if the process closes during a switch.
  await store.setItem('reminder_pending_switch_v2',JSON.stringify({key:next,snapshot:result}));
  await store.setItem(`reminder_vault:${next}`,JSON.stringify(result));
  if(legacy)await store.setItem('reminder_legacy_claim_v2',next);
  await store.setItem('reminder_bound_account_v2',next);
  return result;
}
export async function assertAccount(store:Store,url:string,account:Account){
  if(await store.getItem('reminder_bound_account_v2')!==accountKey(url,account.id))throw new Error('Hesabınıza yeniden bağlanın.');
}
export async function finishSwitch(store:Store,keys:{doses:string;learned:string;settings:string}){
  const pending=await store.getItem('reminder_pending_switch_v2');if(!pending)return;
  const {snapshot,key}=JSON.parse(pending);
  await store.setItem(keys.doses,JSON.stringify(snapshot.doses));
  await store.setItem(keys.learned,JSON.stringify(snapshot.learnedMeds));
  await store.setItem(keys.settings,JSON.stringify(snapshot.settings));
  await store.setItem('reminder_bound_account_v2',key);
  await store.setItem('reminder_pending_switch_v2','');
}
