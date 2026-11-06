import {validateState} from './storage.js';
import {BACKUP_JOURNAL} from './backup-transaction.js';
const PHOTO_USE='apartment-booking-manager:photo-use';
const BUSINESS='apartment-booking-manager:v1';

// Shared leases protect live views, exports and restores from startup collection.
export function withPhotoUse(action,locks=globalThis.navigator?.locks){
 return locks?locks.request(PHOTO_USE,{mode:'shared'},action):action();
}
export async function beginPhotoSession({storage=globalThis.localStorage,photos,locks=globalThis.navigator?.locks}={}){
 if(!locks)return ()=>{}; // No safe cross-view exclusion: never collect.
 try{
  await locks.request(PHOTO_USE,{ifAvailable:true},async lock=>{
   if(!lock||typeof photos?.ids!=='function'||storage.getItem(BACKUP_JOURNAL)!==null)return;
   const before=storage.getItem(BUSINESS);if(before===null)return;
   let state;
   try{state=validateState(JSON.parse(before));}catch{return;}
   if(state.apartments.some(a=>a.photoId!==undefined&&(typeof a.photoId!=='string'||!a.photoId)))return;
   const referenced=new Set(state.apartments.map(a=>a.photoId).filter(Boolean));
   for(const id of await photos.ids()){
    if(storage.getItem(BUSINESS)!==before||storage.getItem(BACKUP_JOURNAL)!==null)return;
    if(typeof id==='string'&&!referenced.has(id))await photos.remove(id);
   }
  });
 }catch{/* A cleanup failure must not prevent opening intact business data. */}
 let release,held;
 const lifetime=new Promise(resolve=>{release=resolve;});
 await new Promise((resolve,reject)=>{
  held=locks.request(PHOTO_USE,{mode:'shared'},async()=>{resolve();await lifetime;});held.catch(reject);
 });
 return async()=>{release();await held;};
}
