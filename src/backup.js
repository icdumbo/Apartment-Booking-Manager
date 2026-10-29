import {validateState} from './storage.js?v=0.2.1';
import {validateMaintenance,emptyMaintenance} from './maintenance.js';
import {createMaintenanceDraftRepository} from './maintenance-drafts.js';
import {apartmentPhotos} from './apartment-photo.js';
import {BACKUP_KEYS,BACKUP_JOURNAL,captureBackupKeys,assertBackupIdle,recoverBackupUnlocked,backupLock} from './backup-transaction.js';
export const BACKUP_MAX=24*1024*1024;
const prepared=new WeakMap();
const APARTMENT=['id','name','address','city','photoId'];
const BOOKING=['id','apartmentId','guest','phone','checkIn','checkOut','status','persons','totalAmountCents','paidAmountCents','legacyPaidAmountCents','source','notes','currency','payments'];
const PAYMENT=['id','date','amountCents','method','notes','currency'];
const MAINT=['id','apartmentId','date','category','description','amountCents','currency','notes','workId','scheduledDate','completedDate','provider','estimatedCents','actualCents','status','equipment','lastDate','nextDate'];
const RAW=['apartmentId','description','notes','date','category','amountCents','currency','scheduledDate','completedDate','provider','estimatedCents','actualCents','status','equipment','lastDate','nextDate'];
const bad=()=>{throw Error('backupInvalid');};
function keys(value,allowed){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))bad();}
function pick(value,allowed){return Object.fromEntries(allowed.filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]));}
function records(values,allowed,strict){if(!Array.isArray(values))bad();return values.map(v=>{if(strict)keys(v,allowed);return pick(v,allowed);});}
function canonical(source,strict=false){
 if(strict)keys(source,['business','maintenance','drafts','preferences','photos']);
 const b=source.business;if(strict)keys(b,['version','apartments','bookings','migrations']);
 if(strict&&b.migrations!==undefined){keys(b.migrations,['originalDemoRemoved']);if(typeof b.migrations.originalDemoRemoved!=='boolean')bad();}
 const business={version:b.version,apartments:records(b.apartments,APARTMENT,strict),bookings:records(b.bookings,BOOKING,strict),migrations:{originalDemoRemoved:true}};
 for(const booking of business.bookings)if(booking.payments!==undefined)booking.payments=records(booking.payments,PAYMENT,strict);
 const m=source.maintenance;if(strict)keys(m,['version','expenses','works','reviews']);
 const maintenance={version:m.version,...Object.fromEntries(['expenses','works','reviews'].map(k=>[k,records(m[k],MAINT,strict)]))};
 let drafts=null;
 if(source.drafts){const doc=source.drafts;if(strict){keys(doc,['version','activeKind','drafts']);keys(doc.drafts,['expenses','works','reviews']);}
  drafts={version:doc.version,activeKind:doc.activeKind,drafts:{}};
  for(const [kind,row] of Object.entries(doc.drafts)){if(strict){keys(row,['recordId','id','baseRecord','values']);keys(row.values,RAW);if(row.baseRecord)keys(row.baseRecord,MAINT);}
   drafts.drafts[kind]={...pick(row,['recordId','id']),...(row.baseRecord?{baseRecord:pick(row.baseRecord,MAINT)}:{}),values:pick(row.values,RAW)};
  }
 }
 const p=source.preferences;if(strict)keys(p,['language','welcomeDismissed']);if(![null,'ro','en'].includes(p.language)||typeof p.welcomeDismissed!=='boolean')bad();
 return {business,maintenance,drafts,preferences:pick(p,['language','welcomeDismissed']),photos:source.photos};
}
function validateData(data){
 validateState(data.business);validateMaintenance(data.maintenance);
 for(const row of [...data.business.apartments,...data.business.bookings])if(typeof row.id!=='string'||!row.id||row.id.length>200)bad();
 for(const a of data.business.apartments)if(a.photoId!==undefined&&(typeof a.photoId!=='string'||!a.photoId))bad();
 if(data.drafts)createMaintenanceDraftRepository({getItem:key=>key==='apartment-booking-manager:maintenance-drafts:v1'?JSON.stringify(data.drafts):null}).load();
 const wanted=new Set(data.business.apartments.map(a=>a.photoId).filter(Boolean)),ids=new Set();if(!Array.isArray(data.photos))bad();
 for(const photo of data.photos){keys(photo,['id','mimeType','data']);if(typeof photo.id!=='string'||!wanted.has(photo.id)||ids.has(photo.id)||photo.mimeType!=='image/jpeg'||typeof photo.data!=='string')bad();ids.add(photo.id);}
 if(ids.size!==wanted.size)throw Error('backupPhotoMissing');
}
export function binary64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
export function decode64(text,max){if(typeof text!=='string'||text.length>4*Math.ceil(max/3)||text.length%4||/[^A-Za-z0-9+/=]/.test(text))bad();let s;try{s=atob(text);}catch{bad();}if(!s.length||s.length>max)bad();return Uint8Array.from(s,c=>c.charCodeAt(0));}
function jpegDimensions(bytes){
 let i=2;
 while(i+3<bytes.length){
  if(bytes[i++]!==255)bad();while(bytes[i]===255)i++;const marker=bytes[i++];
  if(marker===1||marker>=208&&marker<=215)continue;if(marker===218||marker===217)bad();
  const length=(bytes[i]<<8)|bytes[i+1];if(length<2||i+length>bytes.length)bad();
  if(marker>=192&&marker<=207&&![196,200,204].includes(marker)){
   if(length<8)bad();const height=(bytes[i+3]<<8)|bytes[i+4],width=(bytes[i+5]<<8)|bytes[i+6];if(!width||!height||Math.max(width,height)>1280)bad();return;
  }
  i+=length;
 }
 bad();
}
async function verifyJPEG(blob){
 if(globalThis.createImageBitmap){const bitmap=await createImageBitmap(blob);try{if(!bitmap.width||!bitmap.height||Math.max(bitmap.width,bitmap.height)>1280)bad();}finally{bitmap.close();}return;}
 const url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight||Math.max(image.naturalWidth,image.naturalHeight)>1280)bad();}finally{URL.revokeObjectURL(url);}
}
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value))freeze(item);}return value;}
export async function parseBackup(bytes,{verifyPhoto=verifyJPEG}={}){
 try{
  if(!bytes?.byteLength||bytes.byteLength>BACKUP_MAX)throw Error('backupTooLarge');
  const root=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));keys(root,['format','version','createdAt','data']);
  if(root.format!=='apartment-booking-manager-backup'||root.version!==1||typeof root.createdAt!=='string'||!Number.isFinite(Date.parse(root.createdAt)))bad();
  const data=canonical(root.data,true);validateData(data);const blobs=new Map();
  for(const photo of data.photos){const bytes=decode64(photo.data,512*1024);if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)bad();jpegDimensions(bytes);const blob=new Blob([bytes],{type:'image/jpeg'});await verifyPhoto(blob);blobs.set(photo.id,blob);}
  const result=freeze({...root,data});prepared.set(result,blobs);return result;
 }catch(error){throw Error(['backupTooLarge','backupPhotoMissing'].includes(error.message)?error.message:'backupInvalid');}
}
export function backupCounts(doc){const d=doc.data;return {apartments:d.business.apartments.length,photos:d.photos.length,bookings:d.business.bookings.length,payments:d.business.bookings.reduce((n,b)=>n+(b.payments?.length??0),0),expenses:d.maintenance.expenses.length,works:d.maintenance.works.length,reviews:d.maintenance.reviews.length,drafts:Object.keys(d.drafts?.drafts??{}).length};}
export async function createBackup({storage=globalThis.localStorage,photos=apartmentPhotos,verifyPhoto}={}){
 try{
  assertBackupIdle(storage);const before=captureBackupKeys(storage);
  const source={business:before[BACKUP_KEYS[0]]?JSON.parse(before[BACKUP_KEYS[0]]):{version:1,apartments:[],bookings:[]},maintenance:before[BACKUP_KEYS[1]]?JSON.parse(before[BACKUP_KEYS[1]]):emptyMaintenance(),drafts:before[BACKUP_KEYS[2]]?JSON.parse(before[BACKUP_KEYS[2]]):null,preferences:{language:before[BACKUP_KEYS[3]],welcomeDismissed:before[BACKUP_KEYS[4]]==='dismissed'},photos:[]};
  const data=canonical(source);
  for(const id of new Set(data.business.apartments.map(a=>a.photoId).filter(Boolean))){const blob=await photos.read(id);if(!(blob instanceof Blob)||blob.type!=='image/jpeg')throw Error('backupPhotoMissing');data.photos.push({id,mimeType:'image/jpeg',data:binary64(new Uint8Array(await blob.arrayBuffer()))});}
  if(JSON.stringify(before)!==JSON.stringify(captureBackupKeys(storage)))throw Error('backupChanged');assertBackupIdle(storage);
  const bytes=new TextEncoder().encode(JSON.stringify({format:'apartment-booking-manager-backup',version:1,createdAt:new Date().toISOString(),data}));await parseBackup(bytes,{verifyPhoto});return bytes;
 }catch(error){throw Error(['backupPhotoMissing','backupChanged','backupTooLarge','backupBusy'].includes(error.message)?error.message:'backupExportFailed');}
}
export async function restoreBackup(doc,{storage=globalThis.localStorage,photos=apartmentPhotos,locks=globalThis.navigator?.locks}={}){
 if(!prepared.has(doc))throw Error('backupInvalid');
 return backupLock(async()=>{
  const staged=[];let committed=false,journalWritten=false;
  try{
   recoverBackupUnlocked(storage);const before=captureBackupKeys(storage),data=structuredClone(doc.data),ids=new Map();
   for(const [id,blob] of prepared.get(doc)){const next=await photos.write(blob);staged.push(next);ids.set(id,next);}
   for(const a of data.business.apartments)if(a.photoId)a.photoId=ids.get(a.photoId);
   if(JSON.stringify(before)!==JSON.stringify(captureBackupKeys(storage)))throw Error('backupChanged');
   const after=[JSON.stringify(data.business),JSON.stringify(data.maintenance),data.drafts?JSON.stringify(data.drafts):null,data.preferences.language,data.preferences.welcomeDismissed?'dismissed':null];
   const journal={version:1,phase:'prepared',before};storage.setItem(BACKUP_JOURNAL,JSON.stringify(journal));journalWritten=true;
   BACKUP_KEYS.forEach((key,i)=>{if(after[i]===null)storage.removeItem(key);else storage.setItem(key,after[i]);});
   storage.setItem(BACKUP_JOURNAL,JSON.stringify({...journal,phase:'committed'}));committed=true;
   try{storage.removeItem(BACKUP_JOURNAL);}catch{/* Startup safely finishes committed cleanup. */}
   // Keep old photos: they remain a safe fallback and cannot break other open views.
   return backupCounts(doc);
  }catch(error){
   if(journalWritten&&!committed){try{recoverBackupUnlocked(storage);}catch{throw Error('backupRecoveryFailed');}}
   throw Error(error.message==='backupChanged'?'backupChanged':'backupRestoreFailed');
  }finally{if(!committed)for(const id of staged)await photos.remove(id).catch(()=>{});}
 },locks);
}
