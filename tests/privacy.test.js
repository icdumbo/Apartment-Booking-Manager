import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDeletionHandler,DELETION_CONFIRMATION} from '../backend/deletion-requests.js';
import {createDeletionClient} from '../src/account-deletion.js';
import {policySections,privacyCopy} from '../src/privacy-content.js';
import {privacySettings,privacyConfigurationIssues,isPrivacyPublicationReady,isDeletionBackendReady,isDeletionWebReady,publicLegalUrls} from '../src/privacy-settings.js';
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
test('policy covers actual flows in both languages and does not invent missing controller or retention',()=>{for(const lang of ['ro','en']){const sections=policySections(lang);assert.equal(sections.length,13);const text=sections.flat().join(' ');for(const word of ['Firebase','Cloudflare','JSON','Google Play','AdMob'])assert.ok(text.includes(word));assert.ok(text.includes(lang==='ro'?'VALIDARE JURIDICĂ NECESARĂ':'LEGAL VALIDATION REQUIRED'));assert.ok(privacyCopy[lang].scope.includes(lang==='ro'?'nu au':'not')||privacyCopy[lang].scope.includes(lang==='ro'?'nu șterge':'does not'));}});
test('approved Android policy excludes all backup domains in legacy, cloud and D2D without changing manual JSON',async()=>{
 const manifest=await readFile(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');assert.ok(manifest.includes('allowBackup="false"'));assert.ok(manifest.includes('fullBackupContent="@xml/backup_rules"'));assert.ok(manifest.includes('dataExtractionRules="@xml/data_extraction_rules"'));
 for(const file of ['backup_rules.xml','data_extraction_rules.xml']){const xml=await readFile(new URL('../android/app/src/main/res/xml/'+file,import.meta.url),'utf8');assert.ok(!xml.includes('<include '));const blocks=file==='backup_rules.xml'?[xml]:['cloud-backup','device-transfer'].map(tag=>xml.split('<'+tag+'>')[1].split('</'+tag+'>')[0]);for(const block of blocks)for(const domain of ['root','file','database','sharedpref','external','device_root','device_file','device_database','device_sharedpref'])assert.ok(block.includes('<exclude domain="'+domain+'" path="."/>'));}
});

const approvedConfiguration=()=>({...privacySettings,operator:'Fictional Controller',contact:'privacy@example.invalid',retentionPolicy:{ro:'Retenție fictivă RO',en:'Fictional EN retention'},processingPolicy:{ro:'Cadru fictiv RO',en:'Fictional EN framework'},publicBaseUrl:'https://legal.fixture.invalid/legal/',publicationApproved:true,webClientId:'fixture-client',firebaseApiKey:'fixture-key',deletionEndpoint:'https://api.fixture.invalid/account-deletion',deletionBackendVerified:true});
test('default configuration reports all missing fields and keeps publication and deletion disabled',()=>{
 assert.deepEqual(privacyConfigurationIssues(),['processingPolicy.ro','processingPolicy.en','publicBaseUrl','publicationApproved']);
 assert.equal(isPrivacyPublicationReady(),false);assert.equal(isDeletionWebReady(),false);assert.equal(publicLegalUrls(),null);assert.equal(privacySettings.controllerType,'individual');assert.equal(Object.hasOwn(privacySettings,'address'),false);
});
test('confirmed public contact is reused in RO/EN without enabling publication or requests',()=>{
 assert.equal(privacyConfigurationIssues().includes('contact'),false);
 for(const language of ['ro','en'])assert.ok(policySections(language).flat().join(' ').includes(privacySettings.contact));
 assert.equal(isPrivacyPublicationReady(),false);assert.equal(isDeletionBackendReady(),false);assert.equal(isDeletionWebReady(),false);
});
test('single configuration supplies localized retention and processing without copying personal fields into translations',()=>{
 const config=approvedConfiguration();assert.equal(isPrivacyPublicationReady(config),true);assert.equal(isDeletionWebReady(config),true);
 for(const lang of ['ro','en']){const rendered=policySections(lang,config).flat().join(' ');assert.ok(rendered.includes(config.operator));assert.ok(rendered.includes(config.contact));assert.ok(rendered.includes(config.retentionPolicy[lang]));assert.ok(rendered.includes(config.processingPolicy[lang]));assert.ok(!rendered.includes(config.retentionPolicy[lang==='ro'?'en':'ro']));assert.ok(!rendered.includes('{retention}'));}
 assert.equal(isPrivacyPublicationReady({...config,retentionPolicy:'one unlocalized string'}),false);assert.equal(isPrivacyPublicationReady({...config,processingPolicy:{ro:' ',en:'test'}}),false);
});
test('public URLs are derived for both languages; malformed URLs and incomplete configuration fail closed',()=>{
 const config=approvedConfiguration(),urls=publicLegalUrls(config);assert.equal(urls.privacy.ro,'https://legal.fixture.invalid/legal/privacy.html?lang=ro');assert.equal(urls.deletion.en,'https://legal.fixture.invalid/legal/delete-account.html?lang=en');
 for(const publicBaseUrl of ['http://fixture.invalid/','https://user:secret@fixture.invalid/','https://fixture.invalid/legal?token=x','https://fixture.invalid/legal#x','https://fixture.invalid/legal']){assert.equal(publicLegalUrls({...config,publicBaseUrl}),null);assert.equal(isPrivacyPublicationReady({...config,publicBaseUrl}),false);}
 for(const change of [{contact:'bad-email'},{contact:'a@@fixture.invalid'},{operator:' '},{publicationApproved:false}])assert.equal(isPrivacyPublicationReady({...config,...change}),false);
 assert.equal(isDeletionWebReady({...config,deletionBackendVerified:false}),false);assert.equal(isDeletionWebReady({...config,deletionEndpoint:'https://api.fixture.invalid/access'}),false);assert.equal(isDeletionWebReady({...config,deletionEndpoint:'https://api.fixture.invalid/account-deletion?token=x'}),false);
 assert.equal(isDeletionBackendReady({...config,webClientId:null,firebaseApiKey:null}),true);assert.equal(isDeletionWebReady({...config,webClientId:null}),false);
});

test('confirmed trial retention does not silently approve unrelated periods or publication',()=>{
 for(const lang of ['ro','en']){const text=policySections(lang).flat().join(' ');assert.ok(text.includes(lang==='ro'?'șase luni calendaristice':'six calendar months'));assert.ok(text.includes('UTC'));assert.ok(text.includes(lang==='ro'?'hash-uri și tokenuri criptate':'hashes and encrypted tokens'));assert.ok(text.includes(lang==='ro'?'ștergere periodică':'periodic deletion'));assert.ok(text.includes(lang==='ro'?'procesarea automată sunt dezactivate':'automated form and processing are disabled'));}
 assert.equal(typeof privacySettings.operator,'string');assert.ok(privacySettings.operator.trim());assert.ok(privacySettings.retentionPolicy.ro);assert.ok(privacySettings.retentionPolicy.en);assert.equal(isPrivacyPublicationReady(),false);assert.equal(isDeletionBackendReady(),false);
});

test('cancelled reauthentication sends no deletion request and retry remains possible',async()=>{
 let cancel=true,calls=0;const client=createDeletionClient({endpoint:'https://fixture.invalid/account-deletion',getUser:()=>({uid:'fictional-a'}),getIdToken:async()=> 'fixture',reauthenticate:async()=>{if(cancel)throw Error('authCancelled');},fetchImpl:async()=>{calls++;return Response.json({version:1,status:'pending_review',deleted:false,requestId:'fixture',createdAt:now});}});
 await assert.rejects(client.request({confirmed:true}),/authCancelled/);assert.equal(calls,0);cancel=false;assert.equal((await client.request({confirmed:true})).deleted,false);assert.equal(calls,1);
});


test('confirmed individual controller and brand are shared by RO/EN without approving missing legal fields',()=>{
 for(const lang of ['ro','en']){const text=policySections(lang).flat().join(' ');assert.ok(text.includes(privacySettings.operator));assert.ok(text.includes(privacySettings.brand));assert.ok(text.includes(privacySettings.contact));assert.ok(text.includes('180'));assert.ok(text.includes(lang==='ro'?'SUA':'US'));assert.ok(text.includes(lang==='ro'?'VALIDARE JURIDICĂ NECESARĂ':'LEGAL VALIDATION REQUIRED'));assert.ok(!text.includes('{brand}'));}
 const fictional={...privacySettings,brand:'Fictional brand',operator:'Fictional individual'};for(const lang of ['ro','en']){const text=policySections(lang,fictional).flat().join(' ');assert.ok(text.includes(fictional.brand));assert.ok(text.includes(fictional.operator));assert.ok(!text.includes(privacySettings.operator));}
 assert.equal(isPrivacyPublicationReady(),false);assert.equal(isDeletionWebReady(),false);assert.equal(privacySettings.publicationApproved,false);
});


test('public policies contain actual handling only; recommendations stay in internal documentation',async()=>{
 const internal=JSON.parse(await readFile(new URL('../docs/internal-privacy-recommendations.json',import.meta.url),'utf8'));
 for(const lang of ['ro','en']){const text=policySections(lang).flat().join(' ');assert.equal(policySections(lang).length,13);for(const future of ['PLAN PROPUS','PROPOSED PLAN','24 luni','24 months','90 zile','90 days','12 luni','12 months','7 zile','7 days'])assert.ok(!text.includes(future),future);assert.ok(internal[lang][0][1].includes('24'));assert.ok(text.includes(lang==='ro'?'gestionate manual':'handled manually'));assert.ok(text.includes('6(1)(b)'));assert.ok(text.includes('6(1)(c)'));assert.ok(text.includes('6(1)(f)'));assert.ok(text.includes('https://firebase.google.com/terms/data-processing-terms'));assert.ok(text.includes('https://www.cloudflare.com/cloudflare-customer-dpa/'));assert.ok(text.includes('https://policies.google.com/privacy'));assert.ok(text.includes(lang==='ro'?'Nu declarăm aceste verificări finalizate':'Those checks are not claimed as completed'));}
 assert.equal(isPrivacyPublicationReady(),false);assert.equal(isDeletionBackendReady(),false);assert.equal(privacySettings.publicationApproved,false);
});


test('setting publication metadata cannot approve a pending legitimate-interest assessment',()=>{
 const config={...privacySettings,publicBaseUrl:'https://fixture.invalid/legal/',publicationApproved:true};assert.equal(isPrivacyPublicationReady(config),false);assert.deepEqual(privacyConfigurationIssues(config),['processingPolicy.ro','processingPolicy.en']);
});
