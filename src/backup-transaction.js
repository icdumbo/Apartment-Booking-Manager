// Only the five explicitly managed data/preference keys; never credentials or entitlements.
export const BACKUP_KEYS=['apartment-booking-manager:v1','apartment-booking-manager:maintenance:v1','apartment-booking-manager:maintenance-drafts:v1','apartment-booking-manager:language','apartment-booking-manager:welcome:v1'];
export const BACKUP_JOURNAL='apartment-booking-manager:backup-journal:v1';
const LOCK='apartment-booking-manager:backup';
export const captureBackupKeys=storage=>Object.fromEntries(BACKUP_KEYS.map(key=>[key,storage.getItem(key)]));
function journal(storage){const raw=storage.getItem?.(BACKUP_JOURNAL)??null;if(raw===null)return null;try{const j=JSON.parse(raw);if(j.version!==1||!['prepared','committed'].includes(j.phase)||!j.before||Object.keys(j.before).length!==BACKUP_KEYS.length||BACKUP_KEYS.some(k=>!Object.hasOwn(j.before,k)||j.before[k]!==null&&typeof j.before[k]!=='string'))throw Error();return j;}catch{throw Error('backupRecoveryFailed');}}
export function assertBackupIdle(storage){const j=journal(storage);if(j?.phase==='prepared')throw Error('backupBusy');}
export function recoverBackupUnlocked(storage){const j=journal(storage);if(!j)return;
 if(j.phase==='prepared'){
  // The journal keeps the full old values until recovery is complete. Removing partial
  // replacements first makes room even after a quota failure. A crash repeats this safely.
  for(const key of BACKUP_KEYS)storage.removeItem(key);
  for(const key of BACKUP_KEYS)if(j.before[key]!==null)storage.setItem(key,j.before[key]);
 }
 storage.removeItem(BACKUP_JOURNAL);
}
export async function recoverLocalBackup(storage=globalThis.localStorage,locks=globalThis.navigator?.locks){
 if(storage.getItem(BACKUP_JOURNAL)===null)return;
 try{if(locks)await locks.request(LOCK,()=>recoverBackupUnlocked(storage));else recoverBackupUnlocked(storage);}catch{throw Error('backupRecoveryFailed');}
}
export async function backupLock(action,locks=globalThis.navigator?.locks){if(!locks)throw Error('backupLockUnavailable');return locks.request(LOCK,action);}
