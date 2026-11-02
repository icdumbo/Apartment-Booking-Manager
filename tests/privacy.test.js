import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDeletionHandler,DELETION_CONFIRMATION} from '../backend/deletion-requests.js';
import {createDeletionClient} from '../src/account-deletion.js';
import {policySections,privacyCopy} from '../src/privacy-content.js';
const now=1800000000000;
function fixture(){let subject='fictional-a',age=0,fail=false;const rows=new Map();const handler=createDeletionHandler({clock:()=>now,verifyIdToken:async token=>{if(token!=='fixture')throw Object.assign(Error(),{status:401});return {uid:subject,sub:subject,auth_time:now/1000-age,firebase:{sign_in_provider:'google.com'}};},repository:{read:async uid=>rows.get(uid),submit:async(uid,language,time)=>{if(!rows.has(uid))rows.set(uid,{request_id:'fixture-reference',status:'pending_review',created_at:time});if(fail)throw Error();return rows.get(uid);}}});return {handler,rows,subject:v=>subject=v,age:v=>age=v,fail:v=>fail=v};}
const request=(extra={})=>({authorization:'Bearer fixture',body:{action:'request',confirmation:DELETION_CONFIRMATION,language:'ro',...extra}});
test('deletion intake requires identity, recent authentication, explicit consent and rejects a target UID',async()=>{
 const f=fixture();assert.equal((await f.handler({...request(),authorization:null})).status,401);
 assert.equal((await f.handler(request({subject:'fictional-b'}))).status,400);assert.equal(f.rows.size,0);
 assert.equal((await f.handler(request({confirmation:'no'}))).status,400);f.age(301);assert.equal((await f.handler(request())).status,401);assert.equal(f.rows.size,0);
 f.age(0);const result=await f.handler(request());assert.equal(result.status,200);assert.equal(result.body.status,'pending_review');assert.equal(result.body.deleted,false);
 assert.deepEqual((await f.handler(request())).body,result.body);assert.equal(f.rows.size,1);
 f.subject('fictional-b');assert.equal((await f.handler({authorization:'Bearer fixture',body:{action:'status'}})).body.status,'not_requested');
});
test('partial intake failure never claims deletion; retry is idempotent',async()=>{const f=fixture();f.fail(true);assert.equal((await f.handler(request())).status,503);assert.equal(f.rows.size,1);f.fail(false);assert.equal((await f.handler(request())).body.deleted,false);assert.equal(f.rows.size,1);});
test('client confirmation, identity change, unavailable server and false-completion responses are rejected',async()=>{
 let uid='fictional-a',calls=0,mode='valid';const client=createDeletionClient({endpoint:'https://fixture.invalid/account-deletion',getUser:()=>({uid}),getIdToken:async()=> 'fixture',reauthenticate:async()=>{if(mode==='switch')uid='fictional-b';},fetchImpl:async()=>{calls++;if(mode==='unavailable')return Response.json({}, {status:503});return Response.json(mode==='false-completion'?{version:1,status:'completed',deleted:true}:{version:1,status:'pending_review',deleted:false,requestId:'fixture',createdAt:now});}});
 await assert.rejects(client.request({confirmed:false}));assert.equal(calls,0);mode='switch';await assert.rejects(client.request({confirmed:true}),/identityChanged/);assert.equal(calls,0);
 uid='fictional-a';mode='unavailable';await assert.rejects(client.request({confirmed:true}));mode='false-completion';await assert.rejects(client.request({confirmed:true}),/invalidDeletionResult/);
 mode='valid';assert.equal((await client.request({confirmed:true})).deleted,false);
});
test('policy covers actual flows in both languages and does not invent missing controller or retention',()=>{for(const lang of ['ro','en']){const sections=policySections(lang);assert.equal(sections.length,12);const text=sections.flat().join(' ');for(const word of ['Firebase','Cloudflare','JSON','Google Play','AdMob'])assert.ok(text.includes(word));assert.ok(text.includes(lang==='ro'?'NECONFIRMAT':'UNCONFIRMED'));assert.ok(privacyCopy[lang].scope.includes(lang==='ro'?'nu au':'not')||privacyCopy[lang].scope.includes(lang==='ro'?'nu șterge':'does not'));}});
test('backup rules exclude native auth/proof and cookies while preserving business WebView storage; no storage migration',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');assert.match(manifest,/allowBackup="true"/);assert.match(manifest,/fullBackupContent="@xml\/backup_rules"/);assert.match(manifest,/dataExtractionRules="@xml\/data_extraction_rules"/);
 for(const file of ['backup_rules.xml','data_extraction_rules.xml']){const xml=await readFile(new URL('../android/app/src/main/res/xml/'+file,import.meta.url),'utf8');assert.match(xml,/<include domain="root" path="app_webview"\/>/);for(const domain of ['sharedpref','device_sharedpref','file','database'])assert.ok(xml.includes('<exclude domain="'+domain+'" path="."/>'));assert.ok(xml.includes('Default/Network/Cookies'));assert.ok(!xml.includes('path="app_webview/Default/Local Storage"'));assert.ok(!xml.includes('path="app_webview/Default/IndexedDB"'));if(file.startsWith('data_')){assert.ok(xml.includes('<cloud-backup>'));assert.ok(xml.includes('<device-transfer>'));}}
});
