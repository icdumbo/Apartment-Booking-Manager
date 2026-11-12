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
test('policy covers actual flows in both languages and does not invent missing controller or retention',()=>{for(const lang of ['ro','en']){const sections=policySections(lang);assert.equal(sections.length,13);const text=sections.flat().join(' ');for(const word of ['Firebase','Cloudflare','JSON','Google Play','AdMob'])assert.ok(text.includes(word));assert.ok(text.includes(lang==='ro'?'scopul':'purpose'));assert.ok(privacyCopy[lang].scope.includes('OWNER'));}});
test('approved Android policy excludes all backup domains in legacy, cloud and D2D without changing manual JSON',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');assert.ok(manifest.includes('allowBackup="false"'));assert.ok(manifest.includes('fullBackupContent="@xml/backup_rules"'));assert.ok(manifest.includes('dataExtractionRules="@xml/data_extraction_rules"'));
 for(const file of ['backup_rules.xml','data_extraction_rules.xml']){const xml=await readFile(new URL('../android/app/src/main/res/xml/'+file,import.meta.url),'utf8');assert.ok(!xml.includes('<include '));const blocks=file==='backup_rules.xml'?[xml]:['cloud-backup','device-transfer'].map(tag=>xml.split('<'+tag+'>')[1].split('</'+tag+'>')[0]);for(const block of blocks)for(const domain of ['root','file','database','sharedpref','external','device_root','device_file','device_database','device_sharedpref'])assert.ok(block.includes('<exclude domain="'+domain+'" path="."/>'));}
});

const approvedConfiguration=()=>({...privacySettings,operator:'Fictional Controller',contact:'privacy@example.invalid',retentionPolicy:{ro:'Retenție fictivă RO',en:'Fictional EN retention'},processingPolicy:{ro:'Cadru fictiv RO',en:'Fictional EN framework'},publicBaseUrl:'https://legal.fixture.invalid/legal/',legalReviewApproved:true,publicationApproved:true});
test('default configuration reports all missing fields and keeps publication and deletion disabled',()=>{
 assert.deepEqual(privacyConfigurationIssues(),['publicBaseUrl','legalReviewApproved','publicationApproved']);
 assert.equal(isPrivacyPublicationReady(),false);assert.equal(publicLegalUrls(),null);assert.equal(privacySettings.controllerType,'individual');assert.equal(Object.hasOwn(privacySettings,'address'),false);
});
test('confirmed public contact is reused in RO/EN without enabling publication or requests',()=>{
 assert.equal(privacyConfigurationIssues().includes('contact'),false);
 for(const language of ['ro','en'])assert.ok(policySections(language).flat().join(' ').includes(privacySettings.contact));
 assert.equal(isPrivacyPublicationReady(),false);
});
test('single configuration supplies localized retention and processing without copying personal fields into translations',()=>{
 const config=approvedConfiguration();assert.equal(isPrivacyPublicationReady(config),true);
 for(const lang of ['ro','en']){const rendered=policySections(lang,config).flat().join(' ');assert.ok(rendered.includes(config.operator));assert.ok(rendered.includes(config.contact));assert.ok(rendered.includes(config.retentionPolicy[lang]));assert.ok(rendered.includes(config.processingPolicy[lang]));assert.ok(!rendered.includes(config.retentionPolicy[lang==='ro'?'en':'ro']));assert.ok(!rendered.includes('{retention}'));}
 assert.equal(isPrivacyPublicationReady({...config,retentionPolicy:'one unlocalized string'}),false);assert.equal(isPrivacyPublicationReady({...config,processingPolicy:{ro:' ',en:'test'}}),false);
});
test('public URLs are derived for both languages; malformed URLs and incomplete configuration fail closed',()=>{
 const config=approvedConfiguration(),urls=publicLegalUrls(config);assert.equal(urls.privacy.ro,'https://legal.fixture.invalid/legal/privacy-ro.html');assert.equal(urls.deletion.en,'https://legal.fixture.invalid/legal/delete-account-en.html');
 for(const publicBaseUrl of ['http://fixture.invalid/','https://user:secret@fixture.invalid/','https://fixture.invalid/legal?token=x','https://fixture.invalid/legal#x','https://fixture.invalid/legal']){assert.equal(publicLegalUrls({...config,publicBaseUrl}),null);assert.equal(isPrivacyPublicationReady({...config,publicBaseUrl}),false);}
 for(const change of [{contact:'bad-email'},{contact:'a@@fixture.invalid'},{operator:' '},{publicationApproved:false}])assert.equal(isPrivacyPublicationReady({...config,...change}),false);
});

test('confirmed trial retention does not silently approve unrelated periods or publication',()=>{
 for(const lang of ['ro','en']){const text=policySections(lang).flat().join(' ');assert.ok(text.includes(lang==='ro'?'șase luni calendaristice':'six calendar months'));assert.ok(text.includes('UTC'));assert.ok(text.includes(lang==='ro'?'hash-uri și tokenuri criptate':'hashes and encrypted tokens'));assert.ok(text.includes(lang==='ro'?'ștergere periodică':'periodic deletion'));assert.ok(text.includes(lang==='ro'?'verifică identitatea înainte de procesare':'verifies identity before processing'));}
 assert.equal(typeof privacySettings.operator,'string');assert.ok(privacySettings.operator.trim());assert.ok(privacySettings.retentionPolicy.ro);assert.ok(privacySettings.retentionPolicy.en);assert.equal(isPrivacyPublicationReady(),false);
});



test('confirmed individual controller and brand are shared by RO/EN without approving missing legal fields',()=>{
 for(const lang of ['ro','en']){const text=policySections(lang).flat().join(' ');assert.ok(text.includes(privacySettings.operator));assert.ok(text.includes(privacySettings.brand));assert.ok(text.includes(privacySettings.contact));assert.ok(text.includes('180'));assert.ok(text.includes(lang==='ro'?'SUA':'US'));assert.ok(text.includes(lang==='ro'?'scopul':'purpose'));assert.ok(!text.includes('{brand}'));}
 const fictional={...privacySettings,brand:'Fictional brand',operator:'Fictional individual'};for(const lang of ['ro','en']){const text=policySections(lang,fictional).flat().join(' ');assert.ok(text.includes(fictional.brand));assert.ok(text.includes(fictional.operator));assert.ok(!text.includes(privacySettings.operator));}
 assert.equal(isPrivacyPublicationReady(),false);assert.equal(privacySettings.publicationApproved,false);
});


test('public policies contain actual handling only; recommendations stay in internal documentation',async()=>{
 const internal=JSON.parse(await readFile(new URL('../docs/internal-privacy-recommendations.json',import.meta.url),'utf8'));
 for(const lang of ['ro','en']){const text=policySections(lang).flat().join(' ');assert.equal(policySections(lang).length,13);for(const future of ['PLAN PROPUS','PROPOSED PLAN','24 luni','24 months','90 zile','90 days','12 luni','12 months','7 zile','7 days'])assert.ok(!text.includes(future),future);assert.ok(internal[lang][0][1].includes('24'));assert.ok(text.includes(lang==='ro'?'gestionate manual':'handled manually'));assert.ok(text.includes('6(1)(b)'));assert.ok(text.includes('6(1)(c)'));assert.ok(text.includes('6(1)(f)'));assert.ok(text.includes('https://firebase.google.com/terms/data-processing-terms'));assert.ok(text.includes('https://www.cloudflare.com/cloudflare-customer-dpa/'));assert.ok(text.includes('https://policies.google.com/privacy'));assert.ok(text.includes(lang==='ro'?'garanțiile aplicabile transferurilor':'safeguards applicable to transfers'));}
 assert.equal(isPrivacyPublicationReady(),false);assert.equal(privacySettings.publicationApproved,false);
});


test('setting publication metadata cannot approve a pending legitimate-interest assessment',()=>{
 const config={...privacySettings,publicBaseUrl:'https://fixture.invalid/legal/',publicationApproved:true};assert.equal(isPrivacyPublicationReady(config),false);assert.deepEqual(privacyConfigurationIssues(config),['legalReviewApproved']);
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

test('release drafts distinguish planned Analytics from active processing in both languages',()=>{
 for(const lang of ['ro','en']){
  const text=policySections(lang).flat().join(' ');
  assert.match(text,/Firebase Analytics/);
  assert.match(text,/99 RON|RON 99/);
  assert.match(text,/2 luni|2 months/);
  assert.match(text,/nu sunt active în versiunea verificată|are not active in the reviewed version/);
  assert.match(text,/posibilitatea retragerii|option to withdraw consent/);
  assert.match(privacyCopy[lang].scope,/trial/);
 }
 assert.equal(isPrivacyPublicationReady(),false);
});
