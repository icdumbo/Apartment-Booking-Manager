import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDeletionHandler,DELETION_CONFIRMATION} from '../backend/deletion-requests.js';
import {deletionMailto} from '../src/account-deletion.js';
import {policySections,privacyCopy} from '../src/privacy-content.js';
import {privacySettings,privacyConfigurationIssues,isPrivacyPublicationReady,publicLegalUrls} from '../src/privacy-settings.js';
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
test('manual request prepares a bilingual draft for the configured support address only',()=>{
 for(const language of ['ro','en']){
  const copy=privacyCopy[language],draft=new URL(deletionMailto(privacySettings.contact,copy));
  assert.equal(draft.protocol,'mailto:');
  assert.equal(draft.pathname,privacySettings.contact);
  assert.equal(draft.searchParams.get('subject'),copy.deletion);
  assert.equal(draft.searchParams.get('body'),copy.requestTemplate);
  assert.deepEqual([...draft.searchParams.keys()],['subject','body']);
 }
 assert.throws(()=>deletionMailto('support@example.invalid?bcc=other@example.invalid',privacyCopy.en),/Invalid support address/);
});
test('approved Android policy excludes all backup domains in legacy, cloud and D2D without changing manual JSON',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');assert.ok(manifest.includes('allowBackup="false"'));assert.ok(manifest.includes('fullBackupContent="@xml/backup_rules"'));assert.ok(manifest.includes('dataExtractionRules="@xml/data_extraction_rules"'));
 for(const file of ['backup_rules.xml','data_extraction_rules.xml']){const xml=await readFile(new URL('../android/app/src/main/res/xml/'+file,import.meta.url),'utf8');assert.ok(!xml.includes('<include '));const blocks=file==='backup_rules.xml'?[xml]:['cloud-backup','device-transfer'].map(tag=>xml.split('<'+tag+'>')[1].split('</'+tag+'>')[0]);for(const block of blocks)for(const domain of ['root','file','database','sharedpref','external','device_root','device_file','device_database','device_sharedpref'])assert.ok(block.includes('<exclude domain="'+domain+'" path="."/>'));}
});

test('separately requested local erase preserves preferences and rolls back a partial write',async()=>{
 const {eraseLocalBusinessData}=await import('../src/local-data-deletion.js');
 const {BACKUP_KEYS,BACKUP_JOURNAL}=await import('../src/backup-transaction.js');
 const map=new Map(BACKUP_KEYS.map((key,index)=>[key,'fixture-'+index]));
 map.set('unrelated','keep');
 let fail=true;
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>{
  if(k===BACKUP_KEYS[2]&&fail){fail=false;throw Error('fixture write failure');}
  map.delete(k);
 }};
 const locks={request:async(_name,action)=>action()};
 await assert.rejects(eraseLocalBusinessData({storage,locks}),/fixture write failure/);
 assert.equal(map.get(BACKUP_KEYS[0]),'fixture-0');
 assert.equal(map.get(BACKUP_KEYS[1]),'fixture-1');
 assert.equal(map.has(BACKUP_JOURNAL),false);
 await eraseLocalBusinessData({storage,locks});
 assert.deepEqual(JSON.parse(map.get(BACKUP_KEYS[0])).apartments,[]);
 assert.equal(map.has(BACKUP_KEYS[1]),false);
 assert.equal(map.has(BACKUP_KEYS[2]),false);
 assert.equal(map.get(BACKUP_KEYS[3]),'fixture-3');
 assert.equal(map.get(BACKUP_KEYS[4]),'fixture-4');
 assert.equal(map.get('unrelated'),'keep');
});


test('operator-approved policy is publication-ready and derives four permanent HTTPS links',()=>{
 assert.deepEqual(privacyConfigurationIssues(),[]);assert.equal(isPrivacyPublicationReady(),true);
 assert.equal(privacySettings.documentVersion,'2026-11-21');assert.equal(privacySettings.controllerType,'individual');assert.equal(Object.hasOwn(privacySettings,'address'),false);
 for(const [page,prefix]of [['privacy','privacy'],['deletion','delete-account']])for(const lang of ['ro','en'])assert.equal(publicLegalUrls()[page][lang],'https://icdumbo.github.io/Apartment-Booking-Manager/legal/'+prefix+'-'+lang+'.html');
});
test('both approved languages cover actual services, local data, manual deletion and twelve matching sections',()=>{
 for(const lang of ['ro','en']){
  const sections=policySections(lang),text=sections.flat().join(' ');assert.equal(sections.length,12);
  for(const term of ['Firebase','Cloudflare','Google Play','AdMob','Firebase Analytics','JSON','Excel','OWNER','PREMIUM','180','ANSPDCP','21','2026'])assert.ok(text.includes(term),term);
  for(const term of ['BASIC','DOCUMENT ÎN PREGĂTIRE','DRAFT','2 luni','2 months','99 RON','RON 99'])assert.ok(!text.includes(term),term);
  assert.match(text,lang==='ro'?/la fiecare cinci minute/:/every five minutes/);
  assert.match(text,lang==='ro'?/șase luni calendaristice/:/six calendar months/);
  assert.match(text,lang==='ro'?/nu este activ și nu este inclus/:/is not active and is not included/);
  assert.match(text,lang==='ro'?/nu sunt separate automat/:/not automatically separated/);
  assert.match(text,lang==='ro'?/nu justifică păstrarea nelimitată/:/does not justify indefinite retention/);
  assert.match(privacyCopy[lang].scope,/PREMIUM/);assert.match(privacyCopy[lang].scope,/OWNER/);
  assert.ok(text.includes(privacySettings.operator)&&text.includes(privacySettings.contact)&&text.includes(privacySettings.brand));
 }
});
test('controller contact processing and retention remain centrally configurable in both languages',()=>{
 const config={...privacySettings,brand:'Fictional brand',operator:'Fictional controller',contact:'privacy@example.invalid',retentionPolicy:{ro:'Retenție fictivă',en:'Fictional retention'},processingPolicy:{ro:'Temei fictiv',en:'Fictional basis'}};
 for(const lang of ['ro','en']){const text=policySections(lang,config).flat().join(' ');for(const value of [config.brand,config.operator,config.contact,config.retentionPolicy[lang],config.processingPolicy[lang]])assert.ok(text.includes(value));assert.ok(!text.includes(privacySettings.operator));assert.ok(!text.includes(privacySettings.contact));assert.doesNotMatch(text,/\{(?:brand|operator|contact|retention|processing)\}/);}
});
test('approval remains fail-closed when metadata is missing or invalid; approval is not an external legal opinion',()=>{
 for(const change of [{operator:' '},{contact:'bad-email'},{contact:'a@@fixture.invalid'},{retentionPolicy:'not localized'},{processingPolicy:{ro:' ',en:'test'}},{legalReviewApproved:false},{publicationApproved:false}])assert.equal(isPrivacyPublicationReady({...privacySettings,...change}),false);
 for(const publicBaseUrl of ['http://fixture.invalid/','https://user:secret@fixture.invalid/','https://fixture.invalid/legal?token=x','https://fixture.invalid/legal#x','https://fixture.invalid/legal']){assert.equal(publicLegalUrls({...privacySettings,publicBaseUrl}),null);assert.equal(isPrivacyPublicationReady({...privacySettings,publicBaseUrl}),false);}
});
test('published deletion procedure matches policy, includes response and retention criteria, and grants no automatic deletion',()=>{
 for(const lang of ['ro','en']){const sections=policySections(lang),copy=privacyCopy[lang];assert.ok(copy.scope.replaceAll('{contact}',()=>privacySettings.contact).includes(sections[9][1]));assert.ok(copy.scope.includes(sections[10][1]));assert.match(copy.scope,lang==='ro'?/litigiu concret/:/specific dispute/);assert.match(copy.scope,lang==='ro'?/nu produce ștergere automată/:/does not automatically delete/);assert.match(copy.scope,lang==='ro'?/nu șterge contul Google/:/does not delete the Google account/);assert.match(copy.scope,lang==='ro'?/o lună/:/one month/);}
});
