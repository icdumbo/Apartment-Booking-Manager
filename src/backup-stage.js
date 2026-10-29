const STAGE_LOCK='apartment-booking-manager:backup-stage';
export async function cleanupBackupStages(indexedDB=globalThis.indexedDB,locks=globalThis.navigator?.locks){
 if(!indexedDB||!locks)return;await locks.request(STAGE_LOCK,{ifAvailable:true},async lock=>{if(!lock)return;await new Promise(resolve=>{const r=indexedDB.deleteDatabase('apartment-booking-manager:backup-stage');r.onsuccess=r.onerror=r.onblocked=()=>resolve();});});
}
// Transient import images live in IndexedDB, not one aggregate WebView byte buffer.
export function createBackupStage(indexedDB=globalThis.indexedDB){
 if(!indexedDB){const blobs=new Map();return {async put(id,blob){blobs.set(id,blob);return {size:blob.size,read:async()=>blobs.get(id)};},async clear(){blobs.clear();}};}
 const session=crypto.randomUUID(),keys=[];let connection,held,release;
 async function hold(){const locks=globalThis.navigator?.locks;if(!locks)return;if(!held)held=new Promise((resolve,reject)=>{const done=new Promise(r=>{release=r;});locks.request(STAGE_LOCK,{mode:'shared'},async()=>{resolve();await done;}).catch(reject);});await held;}
 async function db(){await hold();if(!connection)connection=new Promise((resolve,reject)=>{const r=indexedDB.open('apartment-booking-manager:backup-stage',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('backupSpace'));r.onblocked=()=>reject(Error('backupBusy'));});return connection;}
 async function operation(mode,action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('photos',mode);let value;const request=action(tx.objectStore('photos'));if(request)request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(Error('backupSpace'));});}
 return {
  async put(id,blob){const key=session+':'+id;await operation('readwrite',store=>store.put(blob,key));keys.push(key);return {size:blob.size,read:async()=>{const b=await operation('readonly',store=>store.get(key));if(!(b instanceof Blob))throw Error('backupReadFailed');return b;}};},
  async clear(){if(!connection)return;try{await operation('readwrite',store=>{for(const key of keys)store.delete(key);});keys.length=0;}finally{try{(await connection).close();}finally{connection=null;release?.();release=null;held=null;}}}
 };
}
