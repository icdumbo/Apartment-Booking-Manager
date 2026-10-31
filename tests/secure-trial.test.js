import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {createTrialHandler,createTrialRepository,TRIAL_MS,TRIAL_TERMS} from '../backend/trial-handler.js';
import {createProofSigner} from '../backend/proof.js';
import {createSecureAccess} from '../src/secure-access.js';
import {createAccessService,ACCESS_KEY} from '../src/access.js';
const nonce='01234567-0123-0123-0123-012345678901';
const request=(action='verify')=>({method:'POST',authorization:'Bearer valid',body:{action,nonce,...(action==='startTrial'?{terms:TRIAL_TERMS}:{})}});
// Private test material is ephemeral, in memory only; never a deployment/signing credential.
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:3072});
const signProof=createProofSigner(privateKey.export({type:'pkcs8',format:'pem'}));
function fixture(){
 let now=1000,account='test-user',owner=null,purchase=null;const records=new Map();let chain=Promise.resolve();
 const database={runTransaction(fn){const result=chain.then(()=>fn({get:async ref=>({exists:records.has(ref),data:()=>records.get(ref)}),create:(ref,value)=>{assert.equal(records.has(ref),false);records.set(ref,value);}}));chain=result.catch(()=>{});return result;}};
 const repository=createTrialRepository({database,documentForSubject:s=>s,allowNewTrials:true});
 const handle=createTrialHandler({clock:()=>now,verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);if(token!=='valid')throw Error();return {uid:account,sub:account,firebase:{sign_in_provider:'google.com'}};},readOwnerSubject:async()=>owner,readVerifiedPurchase:async()=>purchase,trialRepository:repository,signProof});
 return {handle,records,time:n=>now=n,account:n=>account=n,owner:n=>owner=n,purchase:n=>purchase=n};
}
function decode(reply){assert.equal(reply.status,200);const [body,signature]=reply.body.proof.split('.');assert.equal(verify('RSA-SHA256',Buffer.from(body),publicKey,Buffer.from(signature,'base64url')),true);return JSON.parse(Buffer.from(body,'base64url'));}
test('server trial starts only with authenticated explicit consent; exactly 15 days, never renewed after clearing/reinstall',async()=>{
 const f=fixture();assert.equal(decode(await f.handle(request())).state,'BASIC');assert.equal(f.records.size,0);
 assert.equal((await f.handle({...request('startTrial'),body:{action:'startTrial',nonce}})).status,400);
 assert.equal((await f.handle({...request('startTrial'),authorization:'Bearer forged'})).status,401);assert.equal(f.records.size,0);
 const first=decode(await f.handle(request('startTrial')));assert.equal(first.state,'TRIAL');assert.equal(first.expiresAt-first.startedAt,TRIAL_MS);
 f.time(2000);const retry=decode(await f.handle(request('startTrial')));assert.equal(retry.expiresAt,first.expiresAt);
 f.time(first.expiresAt);assert.equal(decode(await f.handle(request('startTrial'))).state,'BASIC');assert.equal(f.records.size,1);
 // New local installation submits the same authenticated account; the server record survives.
 f.time(first.expiresAt+100);const reinstall=decode(await f.handle(request('startTrial')));assert.equal(reinstall.startedAt,first.startedAt);assert.equal(reinstall.expiresAt,first.expiresAt);
});
test('parallel activation, accounts, blocked legacy records and malformed client privilege claims',async()=>{
 const f=fixture();const proofs=await Promise.all(Array.from({length:8},()=>f.handle(request('startTrial'))));assert.equal(new Set(proofs.map(p=>decode(p).startedAt)).size,1);assert.equal(f.records.size,1);
 f.account('other');assert.equal(decode(await f.handle(request())).state,'BASIC');
 f.records.set('other',{status:'blocked'});assert.equal(decode(await f.handle(request('startTrial'))).state,'BASIC');
 assert.equal((await f.handle({...request(),body:{...request().body,uid:'test-user',owner:true}})).status,400);
 f.records.set('other',{version:1,subject:'different',status:'used',startedAt:1000,expiresAt:1000+TRIAL_MS});assert.equal((await f.handle(request())).status,503);
});
test('owner is server-only, purchases are read only, and no trial is issued over permanent rights',async()=>{
 const f=fixture();f.owner('test-user');let c=decode(await f.handle(request('startTrial')));assert.equal(c.state,'PREMIUM');assert.equal(c.source,'OWNER_GRANT');assert.equal(c.expiresAt,null);assert.equal(f.records.size,0);
 f.account('test-family');assert.equal(decode(await f.handle(request())).state,'BASIC');
 f.purchase({subject:'test-family',status:'active',permanent:true});c=decode(await f.handle(request()));assert.equal(c.source,'GOOGLE_PLAY_PURCHASE');
});
test('disabled enrolment never creates a trial; repository outages fail closed',async()=>{
 const records=new Map();const repo=createTrialRepository({database:{runTransaction:fn=>fn({get:async()=>({exists:false}),create:(...args)=>records.set(...args)})},documentForSubject:s=>s});
 assert.equal(await repo.resolve('test',{activate:true,now:1}),null);assert.equal(records.size,0);
 const f=fixture();f.records.set('test-user',{version:1,subject:'test-user',status:'used',startedAt:1,expiresAt:2});assert.equal((await f.handle(request())).status,503);
});

test('verified OWNER bypasses blocked legacy trial history, without granting relatives access or altering trial records',async()=>{
 const f=fixture();f.owner('test-user');
 f.records.set('test-user',{status:'blocked'});f.records.set('test-family',{status:'blocked'});
 const before=structuredClone([...f.records]);
 const owner=decode(await f.handle(request('verify')));
 assert.equal(owner.state,'PREMIUM');assert.equal(owner.source,'OWNER_GRANT');assert.equal(owner.expiresAt,null);
 f.account('test-family');const ordinary=decode(await f.handle(request('verify')));
 assert.equal(ordinary.state,'BASIC');assert.equal(ordinary.source,null);
 assert.deepEqual([...f.records],before);
 assert.equal((await f.handle({...request(),body:{...request().body,owner:true,subject:'test-user'}})).status,400);
});
test('signed proof authenticates all claims, rejects tampering, and includes fixed app/project binding',async()=>{
 const f=fixture();const p=(await f.handle(request('startTrial'))).body.proof;const [body,sig]=p.split('.');const c=JSON.parse(Buffer.from(body,'base64url'));
 assert.equal(c.audience,'ro.icdapps.apartmentbookingmanager');assert.equal(c.issuer,'apartment-booking-manage-2d218');assert.equal(c.nonce,nonce);
 c.state='PREMIUM';const modified=Buffer.from(JSON.stringify(c)).toString('base64url');assert.equal(verify('RSA-SHA256',Buffer.from(modified),publicKey,Buffer.from(sig,'base64url')),false);
});
test('client BASIC works without account/network; activation requires a configured verifier and never writes booking data',async()=>{
 const values=new Map([['apartment-booking-manager:v1','unchanged']]);const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const bridge={getCurrentUser:()=>null};const secure=createSecureAccess({bridge});const access=createAccessService(storage,()=>1000,secure.provider);
 assert.equal(access.snapshot().state,'BASIC');await assert.rejects(secure.activateTrial(),/licenseBackendUnavailable/);assert.equal(values.has(ACCESS_KEY),false);assert.equal(values.get('apartment-booking-manager:v1'),'unchanged');
});
test('native-verified access survives network failure, expires monotonically and clears on account switch',async()=>{
 let now=10,user={uid:'test'},native={subject:'test',state:'TRIAL',expiresAt:2000,remainingMs:1000};
 const bridge={getCurrentUser:()=>user,getIdToken:async()=> 'firebase-token'};
 const secure=createSecureAccess({bridge,plugin:{getAccess:async()=>native,beginVerification:async()=>({nonce})},endpoint:'https://licenses.example.test',monotonic:()=>now,fetchImpl:async()=>{throw Error('offline');}});
 await secure.read();assert.equal(secure.provider.getVerifiedAccess().state,'TRIAL');await assert.rejects(secure.refresh(),/offline/);assert.equal(secure.provider.getVerifiedAccess().state,'TRIAL');now=1010;assert.equal(secure.provider.getVerifiedAccess().state,'BASIC');
 native={subject:'test',state:'PREMIUM',premiumSource:'GOOGLE_PLAY_PURCHASE'};await secure.read();now+=1000000000000;assert.equal(secure.provider.getVerifiedAccess().state,'PREMIUM');user={uid:'other'};assert.equal(secure.provider.getVerifiedAccess(),null);
});
test('client only accepts native verification, server body carries no client UID, and stale account responses fail',async()=>{
 let user={uid:'test'},accepted=0;const bridge={getCurrentUser:()=>user,getIdToken:async()=> 'firebase-token'};
 const plugin={beginVerification:async()=>({nonce}),acceptProof:async({proof})=>{assert.equal(proof,'signed-proof');accepted++;},getAccess:async()=>({subject:'test',state:'TRIAL',expiresAt:2000,remainingMs:1000})};
 const secure=createSecureAccess({bridge,plugin,endpoint:'https://licenses.example.test',fetchImpl:async(url,options)=>{assert.deepEqual(JSON.parse(options.body),{action:'startTrial',nonce,terms:TRIAL_TERMS});assert.equal(options.headers.Authorization,'Bearer firebase-token');return {ok:true,json:async()=>({version:1,proof:'signed-proof'})};}});
 assert.equal((await secure.activateTrial()).state,'TRIAL');assert.equal(accepted,1);
 const stale=createSecureAccess({bridge,plugin,endpoint:'https://licenses.example.test',fetchImpl:async()=>{user={uid:'other'};return {ok:true,json:async()=>({version:1,proof:'signed-proof'})};}});
 await assert.rejects(stale.refresh(),/authenticationRequired/);assert.equal(accepted,1);
});

test('Android requires verified evidence even for legacy local trial records; records and business data are retained',()=>{
 const record=JSON.stringify({version:1,startedAt:1000,lastSeen:1000});const values=new Map([[ACCESS_KEY,record],['apartment-booking-manager:v1','unchanged']]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const provider=createSecureAccess({bridge:{getCurrentUser:()=>null}}).provider;
 const service=createAccessService(storage,()=>1000,provider);
 assert.equal(service.snapshot().state,'BASIC');assert.equal(service.snapshot().legacyTrialPending,true);assert.equal(service.startTrial(),false);
 assert.equal(values.get(ACCESS_KEY),record);assert.equal(values.get('apartment-booking-manager:v1'),'unchanged');
});

test('a definitive authenticated denial clears cached rights, while a network failure does not',async()=>{
 let native={subject:'test',state:'PREMIUM',premiumSource:'OWNER_GRANT'},cleared=0;
 const bridge={getCurrentUser:()=>({uid:'test'}),getIdToken:async()=> 'firebase-token'};
 const plugin={getAccess:async()=>native,beginVerification:async()=>({nonce}),clear:async()=>{cleared++;native={state:'BASIC'};}};
 const secure=createSecureAccess({bridge,plugin,endpoint:'https://licenses.example.test',fetchImpl:async()=>({ok:false,status:401})});
 await secure.read();assert.equal(secure.provider.getVerifiedAccess().state,'PREMIUM');await assert.rejects(secure.refresh(),/authenticationRequired/);assert.equal(cleared,1);assert.equal(secure.provider.getVerifiedAccess(),null);
});
