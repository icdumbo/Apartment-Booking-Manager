import test from 'node:test';
import assert from 'node:assert/strict';
import {createSecureAccess} from '../src/secure-access.js';
import {createBackup,parseBackup,restoreBackup,disposeBackup} from '../src/backup.js';
import {beginPhotoSession} from '../src/photo-lifecycle.js';
import {BACKUP_JOURNAL,BACKUP_KEYS,recoverLocalBackup} from '../src/backup-transaction.js';
import {photo64} from './fixtures/backup-photo.mjs';

const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
test('account switch starts a new verification; stale completion cannot clear its pending request or grant rights',async()=>{
 let uid='fictional-A',native={state:'BASIC',subject:uid},requests=[],accepted=[];
 const firstSeen=deferred(),secondSeen=deferred();
 const secure=createSecureAccess({bridge:{getCurrentUser:()=>({uid}),getIdToken:async()=>uid},
  plugin:{getAccess:async()=>native,beginVerification:async()=>({nonce:'fictional-nonce'}),acceptProof:async({proof})=>{assert.equal(proof,'fictional-B-proof');accepted.push(proof);native={state:'PREMIUM',subject:uid,premiumSource:'OWNER_GRANT'};}},
  endpoint:'https://fixture.invalid/access',fetchImpl:async(_url,request)=>{const result=deferred();requests.push({uid:request.headers.Authorization,result});(requests.length===1?firstSeen:secondSeen).resolve();return result.promise;}
 });
 const old=secure.refresh();const oldRejected=assert.rejects(old,/authenticationRequired/);await firstSeen.promise;
 uid='fictional-B';native={state:'BASIC',subject:uid};await secure.sessionChanged();
 const current=secure.refresh();await secondSeen.promise;
 requests[0].result.resolve(Response.json({version:1,proof:'stale-proof'}));await oldRejected;
 const duplicate=secure.refresh();assert.equal(requests.length,2);assert.equal(accepted.length,0);
 requests[1].result.resolve(Response.json({version:1,proof:'fictional-B-proof'}));
 assert.equal((await current).state,'PREMIUM');assert.equal((await duplicate).subject,'fictional-B');
 assert.deepEqual(accepted,['fictional-B-proof']);assert.equal(secure.provider.getVerifiedAccess().subject,'fictional-B');
});

test('new generation for the same UID also avoids a stale pending verification',async()=>{
 let calls=0;const first=deferred(),seen=deferred();
 const secure=createSecureAccess({bridge:{getCurrentUser:()=>({uid:'fictional'}),getIdToken:async()=> 'fixture'},
  plugin:{beginVerification:async()=>({nonce:'fixture'}),getAccess:async()=>({state:'BASIC',subject:'fictional'}),acceptProof:async()=>{}},
  endpoint:'https://fixture.invalid/access',fetchImpl:async()=>{if(++calls===1){seen.resolve();return first.promise;}return Response.json({version:1,proof:'current-proof'});}
 });
 const old=secure.refresh(),rejected=assert.rejects(old,/authenticationRequired/);await seen.promise;
 await secure.sessionChanged();assert.equal((await secure.refresh()).state,'BASIC');assert.equal(calls,2);
 first.resolve(Response.json({version:1,proof:'old-proof'}));await rejected;
});

function memory(){
 const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
const business=()=>({version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'fictional-a',name:'Fictional apartment',owner:'Fictional owner',address:'Fictional street',city:'Fictional city',photoId:'photo'}],bookings:[{id:'fictional-b',apartmentId:'fictional-a',guest:'Fictional guest',phone:'0700000000',checkIn:'2026-11-01',checkOut:'2026-11-02',totalAmountCents:10000,paidAmountCents:1000,payments:[{id:'fictional-pay',date:'2026-11-01',amountCents:1000,method:'cash'}]}]});
function fixture(){
 const storage=memory();storage.setItem(BACKUP_KEYS[0],JSON.stringify(business()));storage.setItem('apartment-booking-manager:access:v1','unchanged rights');
 const blob=new Blob([Buffer.from(photo64,'base64')],{type:'image/jpeg'}),blobs=new Map([['photo',blob]]);let next=0,writes=0;
 const photos={ids:async()=>[...blobs.keys()],read:async id=>blobs.get(id),write:async image=>{writes++;const id='new-'+(++next);blobs.set(id,image);return id;},remove:async id=>blobs.delete(id)};
 return {storage,photos,blobs,blob,writes:()=>writes};
}
const locks={request:async(_name,action)=>action()};
const verifyPhoto=async()=>{};
test('repeated restore reuses identical referenced photos and preserves bookings, payments, owners and rights',async()=>{
 const f=fixture(),bytes=await createBackup({...f,verifyPhoto}),before=business();
 for(let i=0;i<3;i++){
  const doc=await parseBackup(bytes,{verifyPhoto});await restoreBackup(doc,{...f,locks});await disposeBackup(doc);
  assert.equal(f.blobs.size,1);assert.equal(f.writes(),0);assert.deepEqual(JSON.parse(f.storage.getItem(BACKUP_KEYS[0])),before);
  assert.equal(f.storage.getItem('apartment-booking-manager:access:v1'),'unchanged rights');
 }
});
test('different photo is never reused; failed commit removes only staged photos and preserves rollback originals',async()=>{
 const f=fixture(),bytes=await createBackup({...f,verifyPhoto});
 const different=new Blob([f.blob,new Uint8Array([0])],{type:'image/jpeg'});f.blobs.set('photo',different);
 const before=f.storage.getItem(BACKUP_KEYS[0]),write=f.storage.setItem;let fail=true;
 f.storage.setItem=(key,value)=>{if(key===BACKUP_KEYS[1]&&fail){fail=false;throw Error('fixture quota');}write(key,value);};
 const doc=await parseBackup(bytes,{verifyPhoto});await assert.rejects(restoreBackup(doc,{...f,locks}),/backupRestoreFailed/);await disposeBackup(doc);
 assert.equal(f.writes(),1);assert.equal(f.blobs.size,1);assert.equal(f.blobs.get('photo'),different);
 assert.equal(f.storage.getItem(BACKUP_KEYS[0]),before);assert.equal(f.storage.getItem(BACKUP_JOURNAL),null);
});
function leaseLocks(){
 let shared=0,exclusive=false;
 return {request(_name,options,action){
  const mode=options.mode??'exclusive';
  if(options.ifAvailable&&(exclusive||shared))return Promise.resolve(action(null));
  assert.equal(exclusive,false);if(mode==='exclusive')assert.equal(shared,0);
  if(mode==='shared')shared++;else exclusive=true;
  return Promise.resolve().then(()=>action({mode})).finally(()=>{if(mode==='shared')shared--;else exclusive=false;});
 }};
}
test('startup collection skips all cleanup while another photo session is live; then removes only orphans',async()=>{
 const f=fixture(),leases=leaseLocks();f.blobs.set('orphan',f.blob);
 const first=await beginPhotoSession({...f,locks:leases});assert.equal(f.blobs.size,1);
 f.blobs.set('in-progress-photo',f.blob);
 const second=await beginPhotoSession({...f,locks:leases});assert.ok(f.blobs.has('in-progress-photo'));
 await first();await second();
 const before=f.storage.getItem(BACKUP_KEYS[0]);const third=await beginPhotoSession({...f,locks:leases});
 assert.deepEqual([...f.blobs.keys()],['photo']);assert.equal(f.storage.getItem(BACKUP_KEYS[0]),before);third();
});
test('journal, corrupt/missing state and missing locks all prevent collection',async()=>{
 for(const mode of ['journal','corrupt','missing','no-locks']){
  const f=fixture();f.blobs.set('orphan',f.blob);
  if(mode==='journal')f.storage.setItem(BACKUP_JOURNAL,'unresolved journal');
  if(mode==='corrupt')f.storage.setItem(BACKUP_KEYS[0],'broken');
  if(mode==='missing')f.storage.removeItem(BACKUP_KEYS[0]);
  const release=await beginPhotoSession({...f,locks:mode==='no-locks'?null:leaseLocks()});
  assert.equal(f.blobs.size,2);release();
 }
});
test('collection stops if references change while IDs are read and never deletes the newly referenced image',async()=>{
 const f=fixture();f.blobs.set('next',f.blob);f.photos.ids=async()=>{const next=business();next.apartments[0].photoId='next';f.storage.setItem(BACKUP_KEYS[0],JSON.stringify(next));return ['next','photo'];};
 const release=await beginPhotoSession({...f,locks:leaseLocks()});assert.equal(f.blobs.size,2);release();
});
test('recovery restores the old referenced photo before startup can collect abandoned restoration copies',async()=>{
 const f=fixture(),before=Object.fromEntries(BACKUP_KEYS.map(key=>[key,f.storage.getItem(key)]));
 f.blobs.set('abandoned',f.blob);const partial=business();partial.apartments[0].photoId='abandoned';
 f.storage.setItem(BACKUP_KEYS[0],JSON.stringify(partial));f.storage.setItem(BACKUP_JOURNAL,JSON.stringify({version:1,phase:'prepared',before}));
 await recoverLocalBackup(f.storage,locks);
 const release=await beginPhotoSession({...f,locks:leaseLocks()});assert.deepEqual([...f.blobs.keys()],['photo']);assert.equal(f.storage.getItem(BACKUP_KEYS[0]),before[BACKUP_KEYS[0]]);release();
});
