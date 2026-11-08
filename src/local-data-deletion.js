import {BACKUP_KEYS,BACKUP_JOURNAL,backupLock,captureBackupKeys,recoverBackupUnlocked} from './backup-transaction.js';

// The separate destructive action uses the same recovery protocol as restore.
export async function eraseLocalBusinessData({storage=globalThis.localStorage,locks=globalThis.navigator?.locks}={}){
 return backupLock(()=>{
  recoverBackupUnlocked(storage);
  const before=captureBackupKeys(storage);
  const journal={version:1,phase:'prepared',before};
  storage.setItem(BACKUP_JOURNAL,JSON.stringify(journal));
  try{
   storage.setItem(BACKUP_KEYS[0],JSON.stringify({version:1,migrations:{originalDemoRemoved:true},apartments:[],bookings:[]}));
   storage.removeItem(BACKUP_KEYS[1]);
   storage.removeItem(BACKUP_KEYS[2]);
   storage.setItem(BACKUP_JOURNAL,JSON.stringify({...journal,phase:'committed'}));
  }catch(error){recoverBackupUnlocked(storage);throw error;}
  storage.removeItem(BACKUP_JOURNAL);
  // The next safe startup collects unreferenced photos, after other views close.
 },locks);
}
