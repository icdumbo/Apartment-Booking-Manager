import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync,verify} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {SignJWT,exportSPKI,importSPKI} from 'jose';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {createFirebaseVerifier,createCertificateResolver,FIREBASE_PROJECT,CERTIFICATE_URL} from '../firebase-token.js';
import {createD1Repository} from '../d1-repository.js';
import {createWorker} from '../index.js';
const now=Math.floor(Date.now()/1000),nonce='01234567-0123-0123-0123-012345678901';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:3072});
const pem=privateKey.export({type:'pkcs8',format:'pem'});
// Ephemeral test credential in a private OS temp directory, removed before tests.
const temporary=mkdtempSync(join(tmpdir(),'abm-auth-fixture-'));let certificate;
try{const path=join(temporary,'fixture.pem');writeFileSync(path,pem,{mode:0o600});certificate=spawnSync('openssl',['req','-new','-x509','-key',path,'-subj','/CN=Fictional Auth Test','-days','1'],{encoding:'utf8'});}finally{rmSync(temporary,{recursive:true,force:true});}
assert.equal(certificate.status,0,certificate.stderr);
const publicCryptoKey=await importSPKI(await exportSPKI(publicKey),'RS256');
const claims={iss:`https://securetoken.google.com/${FIREBASE_PROJECT}`,aud:FIREBASE_PROJECT,sub:'test-user',iat:now-10,exp:now+3500,auth_time:now-100,firebase:{sign_in_provider:'google.com'}};
async function token(overrides={},header={alg:'RS256',kid:'test-key'},key=privateKey){return new SignJWT({...claims,...overrides}).setProtectedHeader(header).sign(key);}
const account={localId:'test-user',validSince:String(now-200)};
function verifier(overrides={}){return createFirebaseVerifier({apiKey:'fixture-api-key',resolveKey:()=>publicCryptoKey,clock:()=>now*1000,fetchImpl:async()=>Response.json({users:[account]}),...overrides});}
let runtime,db,lookupMode='valid';
before(async()=>{
 runtime=new Miniflare(convertV4MiniflareOptions({name:'access',modules:true,scriptPath:new URL('../.worker-build/index.js',import.meta.url).pathname,compatibilityDate:'2026-10-22',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'local-access-test'},bindings:{FIREBASE_WEB_API_KEY:'fixture-api-key',ACCESS_PRIVATE_KEY:pem,OWNER_SUBJECT:'test-owner',NEW_TRIALS_ENABLED:'true'},outboundService:async request=>{
  if(new URL(request.url).hostname==='www.googleapis.com')return Response.json({'test-key':certificate.stdout},{headers:{'Cache-Control':'public, max-age=3600'}});
  assert.equal(new URL(request.url).origin,'https://identitytoolkit.googleapis.com');
  if(lookupMode==='outage')return Response.json({error:{message:'QUOTA_EXCEEDED'}},{status:429});
  const body=await request.json();const payload=JSON.parse(Buffer.from(body.idToken.split('.')[1],'base64url'));
  return Response.json({users:[{...account,localId:payload.sub,...(lookupMode==='revoked'?{validSince:String(now+1)}:{})}]});
 }}));
 db=await runtime.getD1Database('DB','access');await db.exec(await readFile(new URL('../migrations/0001_access.sql',import.meta.url),'utf8'));
});
after(async()=>runtime?.dispose());
function decode(proof){const [body,sig]=proof.split('.');assert.equal(verify('RSA-SHA256',Buffer.from(body),publicKey,Buffer.from(sig,'base64url')),true);return JSON.parse(Buffer.from(body,'base64url'));}
async function post(action='verify',{jwt,extra={},body,headers={},path='/access'}={}){return runtime.dispatchFetch('https://fixture.invalid'+path,{method:'POST',headers:{Origin:'https://localhost','Content-Type':'application/json',Authorization:'Bearer '+(jwt??await token()),...headers},body:body??JSON.stringify({action,nonce,...(action==='startTrial'?{terms:'trial-15d-v1'}:{}),...extra})});}

test('Firebase signature, issuer, audience, expiry, iat/auth_time, provider and algorithm are validated',async()=>{
 const validate=verifier();assert.equal((await validate(await token(),true)).uid,'test-user');
 for(const overrides of [{iss:'https://attacker.invalid'},{aud:'wrong-project'},{aud:[FIREBASE_PROJECT,'other']},{exp:now},{iat:now+1},{auth_time:now+1},{auth_time:now},{auth_time:-1},{sub:''},{firebase:{sign_in_provider:'anonymous'}},{firebase:{sign_in_provider:'google.com',tenant:'other'}}])await assert.rejects(validate(await token(overrides),true),{status:401});
 const wrong=generateKeyPairSync('rsa',{modulusLength:3072});await assert.rejects(validate(await token({},undefined,wrong.privateKey),true),{status:401});
 await assert.rejects(validate('eyJhbGciOiJub25lIn0.e30.',true),{status:401});
});
test('Auth lookup enforces revocation/account binding; configuration or quota errors return availability errors',async()=>{
 const jwt=await token();
 for(const user of [{...account,disabled:true},{...account,validSince:String(now)},{...account,localId:'other'}])await assert.rejects(verifier({fetchImpl:async()=>Response.json({users:[user]})})(jwt,true),{status:401});
 await assert.rejects(verifier({fetchImpl:async()=>Response.json({users:[{localId:'test-user'}]})})(jwt,true),{status:503});
 await assert.rejects(verifier({fetchImpl:async()=>Response.json({error:{message:'INVALID_ID_TOKEN'}},{status:400})})(jwt,true),{status:401});
 await assert.rejects(verifier({fetchImpl:async()=>Response.json({error:{message:'QUOTA_EXCEEDED'}},{status:429})})(jwt,true),{status:503});
 await assert.rejects(verifier({apiKey:''})(jwt,true),{status:503});
 await assert.rejects(verifier({readIdentityPolicy:async()=>({blocked:1,tokens_valid_after:0})})(jwt,true),{status:401});
 await assert.rejects(verifier({readIdentityPolicy:async()=>({blocked:0,tokens_valid_after:now})})(jwt,true),{status:401});
});
test('fixed Google certificate source, cache lifetime, concurrent refresh, unknown kid and outages fail safely',async()=>{
 let calls=0,time=1000;
 const resolve=createCertificateResolver({clock:()=>time,fetchImpl:async(url,options)=>{assert.equal(url,CERTIFICATE_URL);assert.equal(options.redirect,'manual');calls++;return Response.json({'test-key':'fixture-certificate'},{headers:{'Cache-Control':'public, max-age=10','Age':'2'}});},importCertificate:async()=>publicCryptoKey});
 const header={alg:'RS256',kid:'test-key'};
 await Promise.all([resolve(header),resolve(header)]);assert.equal(calls,1);await resolve(header);assert.equal(calls,1);
 await assert.rejects(resolve({alg:'RS256',kid:'attacker-key'}),{status:401});assert.equal(calls,1);
 await assert.rejects(resolve({alg:'HS256',kid:'test-key'}),{status:401});
 time=9000;await resolve(header);assert.equal(calls,2);
 await assert.rejects(createCertificateResolver({fetchImpl:async()=>{throw Error('offline');}})(header),{status:503});
 await assert.rejects(createCertificateResolver({fetchImpl:async()=>new Response(null,{status:302,headers:{Location:'https://attacker.invalid'}})})(header),{status:503});
});
test('actual Workers runtime verifies Firebase-shaped JWT and emits Android-compatible signed trial proof',async()=>{
 let response=await post();assert.equal(response.status,200,await response.clone().text());assert.equal(decode((await response.json()).proof).state,'BASIC');
 response=await post('startTrial');assert.equal(response.status,200);const first=decode((await response.json()).proof);
 assert.equal(first.state,'TRIAL');assert.equal(first.expiresAt-first.startedAt,15*86400000);assert.equal(first.nonce,nonce);assert.equal(first.audience,'ro.icdapps.apartmentbookingmanager');
 const repeated=decode((await (await post('startTrial')).json()).proof);assert.equal(repeated.expiresAt,first.expiresAt);
 // A fresh installation has no client state; the same Firebase UID finds the same D1 row.
 assert.equal(decode((await (await post('startTrial',{jwt:await token()})).json()).proof).startedAt,first.startedAt);
});
test('actual D1 constraints and atomic batch prevent concurrent renewal, deadline edits and deletion',async()=>{
 const repo=createD1Repository(db,{allowNewTrials:true});
 const rows=await Promise.all(Array.from({length:10},(_,i)=>repo.trialRepository.resolve('parallel-test',{activate:true,now:1000+i})));
 assert.equal(new Set(rows.map(r=>r.startedAt)).size,1);const first=rows[0];assert.equal(first.expiresAt-first.startedAt,15*86400000);
 const expired=await repo.trialRepository.resolve('parallel-test',{activate:true,now:first.expiresAt+1});assert.equal(expired.expiresAt,first.expiresAt);
 const serverExpired=decode((await (await post('startTrial',{jwt:await token({sub:'parallel-test'})})).json()).proof);assert.equal(serverExpired.state,'BASIC');assert.equal(serverExpired.expiresAt,first.expiresAt);
 await assert.rejects(db.prepare('UPDATE trials SET expires_at=expires_at+1 WHERE subject=?').bind('parallel-test').run());
 await assert.rejects(db.prepare('DELETE FROM trials WHERE subject=?').bind('parallel-test').run());
 await assert.rejects(db.prepare("INSERT INTO trials VALUES ('invalid','used',0,1)").run());
 await db.prepare("INSERT INTO trials(subject,status) VALUES (?,'blocked')").bind('legacy-blocked').run();assert.equal(await repo.trialRepository.resolve('legacy-blocked',{activate:true,now:1000}),null);
 const disabled=createD1Repository(db);assert.equal(await disabled.trialRepository.resolve('new-disabled',{activate:true,now:1000}),null);
});
test('owner is exclusive, license records are server-only, expiry and revocation preserve trial history',async()=>{
 const owner=decode((await (await post('verify',{jwt:await token({sub:'test-owner'})})).json()).proof);assert.equal(owner.source,'OWNER_GRANT');assert.equal(owner.expiresAt,null);
 const family=decode((await (await post('verify',{jwt:await token({sub:'test-family'})})).json()).proof);assert.equal(family.state,'BASIC');
 await db.prepare("INSERT INTO licenses(subject,source,status,permanent) VALUES (?,'GOOGLE_PLAY_PURCHASE','active',1)").bind('test-buyer').run();
 const purchased=decode((await (await post('verify',{jwt:await token({sub:'test-buyer'})})).json()).proof);assert.equal(purchased.source,'GOOGLE_PLAY_PURCHASE');assert.equal(purchased.expiresAt,null);
 await db.prepare("UPDATE licenses SET status='revoked' WHERE subject=?").bind('test-buyer').run();assert.equal(decode((await (await post('verify',{jwt:await token({sub:'test-buyer'})})).json()).proof).state,'BASIC');
 await assert.rejects(db.prepare("INSERT INTO licenses(subject,source,status,permanent) VALUES ('x','OWNER_GRANT','active',1)").run());
});
test('HTTP interface denies forged rights, wrong origin, missing consent, oversized/invalid bodies and unknown paths',async()=>{
 assert.equal((await post('verify',{extra:{uid:'test-owner',premium:true}})).status,400);
 assert.equal((await post('startTrial',{body:JSON.stringify({action:'startTrial',nonce})})).status,400);
 assert.equal((await post('verify',{headers:{Origin:'https://attacker.invalid'}})).status,403);
 assert.equal((await post('verify',{body:'x'.repeat(2049)})).status,413);
 assert.equal((await post('verify',{body:'{'})).status,400);
 assert.equal((await post('verify',{path:'/admin/grant'})).status,404);
 assert.equal((await post('verify',{jwt:'forged'})).status,401);
 const response=await runtime.dispatchFetch('https://fixture.invalid/access',{method:'OPTIONS',headers:{Origin:'https://localhost'}});assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://localhost');
});
test('auth outages preserve cached client rights via 503, invalid/revoked tokens use 401, D1 failure uses 503',async()=>{
 lookupMode='outage';assert.equal((await post()).status,503);lookupMode='revoked';assert.equal((await post()).status,401);lookupMode='valid';
 const broken=createWorker({makeVerifier:()=>async()=>({...claims,uid:'test-user'}),makeSigner:()=>()=> 'unused'});
 const response=await broken.fetch(new Request('https://fixture.invalid/access',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture'},body:JSON.stringify({action:'verify',nonce})}),{FIREBASE_WEB_API_KEY:'fixture',DB:{withSession(){throw Error('quota');}},ACCESS_PRIVATE_KEY:'fixture'});
 assert.equal(response.status,503);
});
