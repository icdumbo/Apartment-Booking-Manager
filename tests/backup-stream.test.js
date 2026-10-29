import test from 'node:test';import assert from 'node:assert/strict';import {parseBackup,disposeBackup} from '../src/backup.js';import {openNativeBackup} from '../src/backup-io.js';import {photo64} from './fixtures/backup-photo.mjs';
function file(){return {format:'apartment-booking-manager-backup',version:1,createdAt:'2026-10-29T00:00:00.000Z',data:{business:{version:1,apartments:[{id:'a',name:'Ștefan "AB" \\ test',address:'Stradă test',city:'Constanța',photoId:'p'}],bookings:[]},maintenance:{version:1,expenses:[],works:[],reviews:[]},drafts:null,preferences:{language:'ro',welcomeDismissed:true},photos:[{id:'p',mimeType:'image/jpeg',data:photo64}]}};}
test('legacy JSON remains compatible across arbitrary chunk and multibyte UTF-8 boundaries',async()=>{
 const original=file(),bytes=new TextEncoder().encode(JSON.stringify(original));
 for(const size of [1,7,103]){async function* chunks(){for(let p=0;p<bytes.length;p+=size)yield bytes.subarray(p,p+size);}const doc=await parseBackup(chunks(),{verifyPhoto:async()=>{}});assert.equal(doc.data.business.apartments[0].name,original.data.business.apartments[0].name);assert.equal(doc.data.photos[0].size,Buffer.from(photo64,'base64').length);await disposeBackup(doc);}
});
test('truncated or duplicate envelope is rejected and temporary staged photos are cleaned',async()=>{
 const raw=JSON.stringify(file()),staged=new Set();let cleared=0;const stage={async put(id,b){staged.add(id);return {size:b.size,read:async()=>b};},async clear(){staged.clear();cleared++;}};
 for(const text of [raw.slice(0,-1),raw+'trailing',raw.replace('"version":1','"version":1,"version":1')])await assert.rejects(parseBackup(new TextEncoder().encode(text),{verifyPhoto:async()=>{},stage}),/backupInvalid/);assert.equal(staged.size,0);assert.equal(cleared,3);
});
test('transient staging quota errors are clear; cleanup failure never changes the already successful data result',async()=>{
 await assert.rejects(parseBackup(new TextEncoder().encode(JSON.stringify(file())),{verifyPhoto:async()=>{},stage:{async put(){throw Error('backupSpace');},async clear(){}}}),/backupSpace/);
 const doc=await parseBackup(new TextEncoder().encode(JSON.stringify(file())),{verifyPhoto:async()=>{},stage:{async put(id,b){return {size:b.size,read:async()=>b};},async clear(){throw Error('cleanup');}}});await assert.doesNotReject(disposeBackup(doc));
});
test('native read protocol rejects unexpected EOF and always releases private cache handles',async()=>{
 let closed=false;const capacitor={Plugins:{BookingBackup:{selectBackup:async()=>({status:'selected',handle:'in',size:10}),readChunk:async()=>({data:'AQI=',done:true}),closeImport:async()=>{closed=true;}}}};
 const source=await openNativeBackup(capacitor);await assert.rejects(async()=>{for await(const chunk of source)void chunk;},/backupReadFailed/);assert.equal(closed,true);
});
