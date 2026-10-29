import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,open,readFile,writeFile,rm,stat} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {prepareBackupExport,parseBackup,restoreBackup,disposeBackup,ensureBackupSpace} from '../src/backup.js';import {saveBackup,openNativeBackup} from '../src/backup-io.js';import {photo64} from './fixtures/backup-photo.mjs';
const KEY='apartment-booking-manager:v1',locks={request:async(_,fn)=>fn()};
function memory(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
// Valid JPEG APP metadata fills a realistic large image payload without a test-only giant bitmap.
function jpeg(){const original=Buffer.from(photo64,'base64'),parts=[original.subarray(0,2)];let remaining=400*1024;while(remaining){const size=Math.min(65533,remaining),header=Buffer.from([255,239,(size+2)>>8,(size+2)&255]);parts.push(header,Buffer.alloc(size,77));remaining-=size;}parts.push(original.subarray(2));return new Blob(parts,{type:'image/jpeg'});}
test('over 50 MB complete JSON exports through 48 KB bridge chunks, validates incrementally and restores all photos and records',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'abm-backup-large-'));let sink,source;
 try{
  const storage=memory(),blob=jpeg(),originalBytes=Buffer.from(await blob.arrayBuffer()),count=100,apartments=Array.from({length:count},(_,i)=>({id:'a'+i,name:'Test Ștefan '+i,address:'Adresă test',city:'Constanța',photoId:'p'+i}));storage.setItem(KEY,JSON.stringify({version:1,apartments,bookings:[]}));
  const snapshot=await prepareBackupExport({storage,photos:{read:async()=>blob},verifyPhoto:async()=>{}});assert.ok(snapshot.size>50*1024*1024);t.diagnostic('Complete backup bytes: '+snapshot.size+'; photos: '+count);let maxChunk=0,exportCalls=0,importClosed=false;
  const file=join(dir,'large.abmbackup.json');
  const plugin={
   async beginExport({size}){assert.equal(size,snapshot.size);sink=await open(file,'w');return {status:'ready',handle:'out'};},
   async appendExport({data}){const bytes=Buffer.from(data,'base64');maxChunk=Math.max(maxChunk,bytes.length);exportCalls++;await sink.write(bytes);},
   async finishExport(){await sink.close();sink=null;return {status:'saved'};},async abortExport(){await sink?.close();sink=null;},
   async selectBackup(){source=await open(file,'r');return {status:'selected',handle:'in',size:(await stat(file)).size};},
   async readChunk({offset}){const bytes=Buffer.alloc(Math.min(48*1024,snapshot.size-offset));const {bytesRead}=await source.read(bytes,0,bytes.length,offset);return {data:bytes.subarray(0,bytesRead).toString('base64'),done:offset+bytesRead===snapshot.size};},
   async closeImport(){importClosed=true;await source.close();source=null;}
  };
  const capacitor={getPlatform:()=> 'android',Plugins:{BookingBackup:plugin}};assert.equal((await saveBackup(snapshot,'Test.abmbackup.json',capacitor)).status,'saved');assert.ok(maxChunk<=48*1024);assert.ok(exportCalls>1000);assert.equal((await stat(file)).size,snapshot.size);
  const stageFiles=[];const stage={async put(id,b){const path=join(dir,id+'.jpg');await writeFile(path,Buffer.from(await b.arrayBuffer()));stageFiles.push(path);return {size:b.size,read:async()=>new Blob([await readFile(path)],{type:'image/jpeg'})};},async clear(){for(const f of stageFiles)await rm(f,{force:true});}};
  const doc=await parseBackup(await openNativeBackup(capacitor),{verifyPhoto:async()=>{},stage});assert.equal(importClosed,true);assert.equal(doc.data.photos.length,count);assert.ok(doc.data.photos.every(p=>!Object.hasOwn(p,'data')));
  const target=memory();target.setItem('apartment-booking-manager:access:v1','BASIC');let restored=0;await restoreBackup(doc,{storage:target,locks,photos:{async write(b){assert.equal(b.size,blob.size);assert.deepEqual(Buffer.from(await b.arrayBuffer()),originalBytes);return 'new-'+restored++;},async remove(){}}});assert.equal(restored,count);assert.equal(JSON.parse(target.getItem(KEY)).apartments.length,count);assert.equal(target.getItem('apartment-booking-manager:access:v1'),'BASIC');await disposeBackup(doc);
 }finally{await sink?.close();await source?.close();await rm(dir,{recursive:true,force:true});}
});
test('quota preflight and native ENOSPC are explicit; cancellation/abort do not report a saved backup',async()=>{
 await assert.rejects(ensureBackupSpace(100,{estimate:async()=>({quota:200,usage:150})}),/backupSpace/);
 let abort=false;const cap={getPlatform:()=> 'android',Plugins:{BookingBackup:{beginExport:async()=>({status:'ready',handle:'out'}),appendExport:async()=>{throw {code:'backupSpace'};},abortExport:async()=>{abort=true;},finishExport:async()=>({status:'saved'})}}};
 await assert.rejects(saveBackup({size:3,async *chunks(){yield new Uint8Array([1,2,3]);}},'Test.abmbackup.json',cap),/backupSpace/);assert.equal(abort,true);
 cap.Plugins.BookingBackup.beginExport=async()=>({status:'cancelled'});assert.equal((await saveBackup({size:3,async *chunks(){throw Error('must not generate');}},'Test.abmbackup.json',cap)).status,'cancelled');
});
