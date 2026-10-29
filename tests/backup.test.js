import test from 'node:test';import assert from 'node:assert/strict';
import {createBackup,parseBackup,restoreBackup,backupCounts,BACKUP_MAX} from '../src/backup.js';
import {BACKUP_KEYS,BACKUP_JOURNAL,recoverLocalBackup,assertBackupIdle} from '../src/backup-transaction.js';
import {photo64} from './fixtures/backup-photo.mjs';
const locks={request:async(_name,run)=>run()},verifyPhoto=async blob=>{assert.ok(blob.size>100);},options={verifyPhoto};
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const photoStore=()=>{const map=new Map();let n=0;return {map,read:async id=>map.get(id),write:async blob=>{const id='staged-'+(++n);map.set(id,blob);return id;},remove:async id=>map.delete(id)};};
function data(){return {business:{version:1,apartments:[{id:'a',name:'Apartament Ștefan',address:'Stradă test',city:'Constanța',photoId:'p'}],bookings:[{id:'ron',apartmentId:'a',guest:'Test Ștefan',phone:'0700000000',checkIn:'2026-10-22',checkOut:'2026-10-28',currency:'RON',totalAmountCents:150000,paidAmountCents:50000,payments:[{id:'pay',date:'2026-10-22',amountCents:50000,method:'cash'}]},{id:'eur',apartmentId:'a',guest:'Test EUR',phone:'0700000000',checkIn:'2026-10-28',checkOut:'2026-10-30',currency:'EUR',totalAmountCents:35000,paidAmountCents:0}]},maintenance:{version:1,expenses:[{id:'e',apartmentId:'a',description:'Test apă',date:'2026-10-28',category:'water',currency:'RON',amountCents:12500}],works:[{id:'w',apartmentId:'a',description:'Test AC',scheduledDate:'2026-10-28',currency:'EUR',actualCents:600000,status:'completed'}],reviews:[{id:'r',apartmentId:'a',description:'Test revizie',equipment:'boiler',nextDate:'2027-01-01'}]},drafts:{version:1,activeKind:'works',drafts:{works:{recordId:'draft',values:{description:'Ciornă',scheduledDate:'28/10/'}}}},preferences:{language:'ro',welcomeDismissed:true},photos:[{id:'p',mimeType:'image/jpeg',data:photo64}]};}
const encoded=d=>new TextEncoder().encode(JSON.stringify({format:'apartment-booking-manager-backup',version:1,createdAt:'2026-10-29T00:00:00.000Z',data:d}));
function fill(s,d=data()){s.setItem(BACKUP_KEYS[0],JSON.stringify(d.business));s.setItem(BACKUP_KEYS[1],JSON.stringify(d.maintenance));s.setItem(BACKUP_KEYS[2],JSON.stringify(d.drafts));s.setItem(BACKUP_KEYS[3],'ro');s.setItem(BACKUP_KEYS[4],'dismissed');s.setItem('apartment-booking-manager:access:v1','untouched-license');s.setItem('firebase-token-test','untouched-token');}
test('full export/import preserves records, currencies, Romanian text, legacy aggregates, drafts and photos without credentials',async()=>{
 const s=memory(),photos=photoStore();fill(s);photos.map.set('p',new Blob([Buffer.from(photo64,'base64')],{type:'image/jpeg'}));const before=JSON.stringify([...s.map]);
 const bytes=await createBackup({storage:s,photos,verifyPhoto});const text=new TextDecoder().decode(bytes);assert.ok(!text.includes('untouched-token')&&!text.includes('untouched-license'));assert.equal(JSON.stringify([...s.map]),before);
 const doc=await parseBackup(bytes,options);assert.deepEqual(backupCounts(doc),{apartments:1,photos:1,bookings:2,payments:1,expenses:1,works:1,reviews:1,drafts:1});
 const target=memory(),targetPhotos=photoStore();target.setItem('apartment-booking-manager:access:v1','BASIC-stays-BASIC');await restoreBackup(doc,{storage:target,photos:targetPhotos,locks});assert.equal(target.getItem('apartment-booking-manager:access:v1'),'BASIC-stays-BASIC');
 const b=JSON.parse(target.getItem(BACKUP_KEYS[0]));assert.equal(b.apartments[0].name,'Apartament Ștefan');assert.equal(b.apartments[0].photoId,'staged-1');assert.equal(await targetPhotos.read('staged-1').then(b=>b.size),Buffer.from(photo64,'base64').length);assert.deepEqual(b.bookings,data().business.bookings);assert.deepEqual(JSON.parse(target.getItem(BACKUP_KEYS[1])),data().maintenance);assert.deepEqual(JSON.parse(target.getItem(BACKUP_KEYS[2])),data().drafts);assert.equal(target.getItem(BACKUP_JOURNAL),null);
});
test('complete validation rejects incompatible schema, credentials, bad references/amounts/dates and invalid photos before mutation',async()=>{
 const invalid=[d=>d.business.bookings[0].apartmentId='missing',d=>d.business.bookings[0].totalAmountCents=-1,d=>d.business.bookings[0].checkOut='2026-02-30',d=>d.business.bookings.push(d.business.bookings[0]),d=>d.preferences.owner=true,d=>d.licenses={owner:true},d=>d.photos=[],d=>d.photos[0].data='AAAA',d=>d.maintenance.expenses[0].amountCents=1.5,d=>d.business.apartments[0].token='secret'];
 for(const alter of invalid){const d=data();alter(d);await assert.rejects(parseBackup(encoded(d),options));}
 await assert.rejects(parseBackup(new Uint8Array(BACKUP_MAX+1),options),/backupTooLarge/);await assert.rejects(parseBackup(encoded(data()),{verifyPhoto:async()=>{throw Error('decoder failed');}}),/backupInvalid/);
 const d=JSON.parse(new TextDecoder().decode(encoded(data())));d.version=2;await assert.rejects(parseBackup(new TextEncoder().encode(JSON.stringify(d)),options));
});
test('photo staging failure and concurrent data edits leave old data intact',async()=>{
 const doc=await parseBackup(encoded(data()),options),s=memory();fill(s);const original=[...s.map];const photos=photoStore();photos.write=async()=>{throw Error('quota');};await assert.rejects(restoreBackup(doc,{storage:s,photos,locks}),/backupRestoreFailed/);assert.deepEqual([...s.map],original);
 const p=photoStore(),write=p.write;p.write=async b=>{s.setItem(BACKUP_KEYS[3],'en');return write(b);};await assert.rejects(restoreBackup(doc,{storage:s,photos:p,locks}),/backupChanged/);assert.equal(s.getItem(BACKUP_KEYS[3]),'en');assert.equal(p.map.size,0);assert.equal(s.getItem(BACKUP_KEYS[0]),original[0][1]);
});
test('mid-write failure rolls back all managed keys, retains old photos and does not touch rights',async()=>{
 const doc=await parseBackup(encoded(data()),options),s=memory();fill(s);const original=[...s.map],p=photoStore(),set=s.setItem;let fail=true;s.setItem=(k,v)=>{if(k===BACKUP_KEYS[1]&&fail){fail=false;throw Error('quota');}return set(k,v);};
 await assert.rejects(restoreBackup(doc,{storage:s,photos:p,locks}),/backupRestoreFailed/);for(const [k,v] of original)assert.equal(s.getItem(k),v);assert.equal(s.getItem(BACKUP_JOURNAL),null);assert.equal(p.map.size,0);
});
test('interruption recovers the whole old snapshot before repositories read; committed journal keeps complete new data',async()=>{
 const s=memory();fill(s);const before=Object.fromEntries(BACKUP_KEYS.map(k=>[k,s.getItem(k)]));s.setItem(BACKUP_JOURNAL,JSON.stringify({version:1,phase:'prepared',before}));s.setItem(BACKUP_KEYS[0],'partial-new');assert.throws(()=>assertBackupIdle(s),/backupBusy/);await recoverLocalBackup(s,locks);for(const [k,v]of Object.entries(before))assert.equal(s.getItem(k),v);
 s.setItem(BACKUP_JOURNAL,JSON.stringify({version:1,phase:'committed',before}));s.setItem(BACKUP_KEYS[0],'complete-new');await recoverLocalBackup(s,locks);assert.equal(s.getItem(BACKUP_KEYS[0]),'complete-new');
});
test('failed rollback retains journal, blocks reads and recovers after storage becomes available',async()=>{
 const doc=await parseBackup(encoded(data()),options),s=memory();fill(s);const old=s.getItem(BACKUP_KEYS[0]),set=s.setItem;let fail=false;s.setItem=(k,v)=>{if(k===BACKUP_KEYS[1])fail=true;if(fail&&k!==BACKUP_JOURNAL)throw Error('quota');return set(k,v);};
 await assert.rejects(restoreBackup(doc,{storage:s,photos:photoStore(),locks}),/backupRecoveryFailed/);assert.ok(s.getItem(BACKUP_JOURNAL));assert.throws(()=>assertBackupIdle(s),/backupBusy/);s.setItem=set;await recoverLocalBackup(s,locks);assert.equal(s.getItem(BACKUP_KEYS[0]),old);assert.equal(s.getItem('firebase-token-test'),'untouched-token');
});
test('missing photos, invalid source data and absent locking produce explicit errors; unverified objects cannot restore',async()=>{
 const s=memory();fill(s);await assert.rejects(createBackup({storage:s,photos:photoStore(),verifyPhoto}),/backupPhotoMissing/);await assert.rejects(restoreBackup({data:data()},{storage:s,photos:photoStore(),locks}));const doc=await parseBackup(encoded(data()),options);await assert.rejects(restoreBackup(doc,{storage:s,photos:photoStore(),locks:null}),/backupLockUnavailable/);
});
test('legacy receipts remain undated aggregates and linked work costs stay single expenses',async()=>{
 const d=data();d.business.bookings[1].paidAmountCents=30000;d.maintenance.expenses.push({id:'linked',workId:'w',apartmentId:'a',date:'2026-10-28',description:'Test linked cost',category:'repairs',amountCents:600000,currency:'EUR'});
 const doc=await parseBackup(encoded(d),options),s=memory();await restoreBackup(doc,{storage:s,photos:photoStore(),locks});const b=JSON.parse(s.getItem(BACKUP_KEYS[0]));assert.equal(b.bookings[1].paidAmountCents,30000);assert.equal(b.bookings[1].payments,undefined);const m=JSON.parse(s.getItem(BACKUP_KEYS[1]));assert.equal(m.expenses.filter(e=>e.workId==='w').length,1);assert.equal(m.expenses.find(e=>e.workId==='w').amountCents,m.works[0].actualCents);
});
