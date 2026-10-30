import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';import {readFile} from 'node:fs/promises';import {DatabaseSync} from 'node:sqlite';
import {createPlayApi,createPlayPurchases,createTokenVault,createPurchaseHandler,purchaseAccount,PLAY_PACKAGE} from '../backend/play-purchases.js';
import {createPlayRepository} from '../backend/play-repository.js';
import {createPlayBilling} from '../src/play-billing.js';import {createSecureAccess} from '../src/secure-access.js';
const nonce='01234567-0123-0123-0123-012345678901',product='fixture_lifetime',uid='fictional-buyer';
const key=Buffer.alloc(32,17).toString('base64');
async function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(await readFile(new URL('../backend/migrations/0002_play_purchases.sql',import.meta.url),'utf8'));
 function statement(query){let params=[];return {bind(...values){params=values;return this;},first:async()=>sql.prepare(query).get(...params)??null,all:async()=>({results:sql.prepare(query).all(...params)}),run:async()=>sql.prepare(query).run(...params),execute:()=>/^SELECT/i.test(query)?{results:sql.prepare(query).all(...params)}:sql.prepare(query).run(...params)};}
 const database={withSession:mode=>{assert.equal(mode,'first-primary');return {prepare:statement,batch:async statements=>{sql.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}};}};
 const repository=createPlayRepository(database),vault=createTokenVault(key);let purchase={purchaseState:0,consumptionState:0,acknowledgementState:0,obfuscatedExternalAccountId:purchaseAccount(uid)},acknowledged=0,outage=false,ackFails=false;
 const api={get:async(p,t)=>{assert.equal(p,product);assert.equal(t,'fixture-receipt');if(outage)throw Error('offline');return purchase;},acknowledge:async()=>{acknowledged++;if(ackFails)throw Error('offline');purchase={...purchase,acknowledgementState:1};}};
 const service=createPlayPurchases({api,repository,vault,productId:product,clock:()=>12345});
 return {sql,repository,vault,service,setPurchase:p=>purchase=p,getPurchase:()=>purchase,acknowledged:()=>acknowledged,outage:b=>outage=b,ackFails:b=>ackFails=b};
}
test('real SQL: verified non-consumable is acknowledged once, encrypted, account-bound and restored after a new client installation',async()=>{
 const f=await fixture();try{
  const access=await f.service.verifyPurchase(uid,'fixture-receipt');assert.deepEqual(access,{subject:uid,status:'active',permanent:true});assert.equal(f.acknowledged(),1);
  const row=f.sql.prepare('SELECT * FROM play_purchases').get();assert.equal(row.status,'active');assert.ok(!row.encrypted_token.includes('fixture-receipt'));assert.equal(f.vault.open(row.encrypted_token,uid),'fixture-receipt');
  assert.equal((await f.service.readVerifiedPurchase(uid)).permanent,true);assert.equal(f.acknowledged(),1);assert.equal(await f.service.readVerifiedPurchase('family-member'),null);
  await assert.rejects(f.service.verifyPurchase('family-member','fixture-receipt'),{status:409});assert.equal(f.sql.prepare('SELECT subject FROM play_purchases').get().subject,uid);
  assert.throws(()=>f.sql.prepare("UPDATE play_purchases SET subject='family-member'").run());
 }finally{f.sql.close();}
});
test('pending/cancelled/consumed/test/wrong-account/quantity/unknown acknowledgement receipts never grant access',async()=>{
 for(const change of [{purchaseState:2},{purchaseState:1},{consumptionState:1},{purchaseType:0},{obfuscatedExternalAccountId:purchaseAccount('other')},{quantity:2},{acknowledgementState:2}]){
  const f=await fixture();try{f.setPurchase({...f.getPurchase(),...change});await assert.rejects(f.service.verifyPurchase(uid,'fixture-receipt'),{status:409});assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM play_purchases').get().n,0);assert.equal(f.acknowledged(),0);}finally{f.sql.close();}
 }
});
test('acknowledgement/network failure grants nothing; retry recovers pending row; Google cancellation revokes online',async()=>{
 const f=await fixture();try{f.ackFails(true);await assert.rejects(f.service.verifyPurchase(uid,'fixture-receipt'));assert.equal(f.sql.prepare('SELECT status FROM play_purchases').get().status,'pending');f.ackFails(false);assert.equal((await f.service.readVerifiedPurchase(uid)).status,'active');
  f.outage(true);await assert.rejects(f.service.readVerifiedPurchase(uid));assert.equal(f.sql.prepare('SELECT status FROM play_purchases').get().status,'active');f.outage(false);
  f.setPurchase({...f.getPurchase(),purchaseState:1});assert.equal(await f.service.readVerifiedPurchase(uid),null);assert.equal(f.sql.prepare('SELECT status FROM play_purchases').get().status,'revoked');
 }finally{f.sql.close();}
});
test('token vault authenticates ciphertext and account; malformed keys and forged token ownership are rejected',async()=>{
 assert.throws(()=>createTokenVault(''));const vault=createTokenVault(key),sealed=vault.seal('fixture-receipt',uid);assert.throws(()=>vault.open(sealed,'other'));assert.throws(()=>vault.open(sealed.slice(0,-4)+'AAAA',uid));
 const f=await fixture();try{await f.repository.reserve({hash:'f'.repeat(64),subject:uid,productId:product,encryptedToken:'sealed'});await assert.rejects(f.repository.reserve({hash:'f'.repeat(64),subject:'other',productId:product,encryptedToken:'other'}),{status:409});}finally{f.sql.close();}
});
test('publisher API uses fixed package/scope, signed service JWT, cached OAuth and server acknowledgement',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});let oauth=0;const calls=[];
 const api=createPlayApi({clock:()=>100000,serviceAccount:JSON.stringify({type:'service_account',client_email:'fixture@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})}),fetchImpl:async(url,options)=>{
  calls.push([url,options.method]);if(url==='https://oauth2.googleapis.com/token'){oauth++;const jwt=options.body.get('assertion'),[h,p,s]=jwt.split('.');assert.ok(verify('RSA-SHA256',Buffer.from(h+'.'+p),publicKey,Buffer.from(s,'base64url')));assert.equal(JSON.parse(Buffer.from(p,'base64url')).scope,'https://www.googleapis.com/auth/androidpublisher');return Response.json({access_token:'fixture-oauth',expires_in:3600});}
  assert.ok(url.startsWith('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+PLAY_PACKAGE+'/'));assert.equal(options.headers.Authorization,'Bearer fixture-oauth');return options.method==='POST'?new Response(null,{status:200}):Response.json({purchaseState:0});
 }});
 await api.get(product,'fixture-receipt');await api.acknowledge(product,'fixture-receipt');assert.equal(oauth,1);assert.ok(calls.at(-1)[0].endsWith(':acknowledge'));
});
test('publisher denial/outage is not a false refund; definitive missing receipts are invalid',async()=>{
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});let status=404;
 const api=createPlayApi({serviceAccount:JSON.stringify({type:'service_account',client_email:'fixture@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})}),fetchImpl:async url=>url==='https://oauth2.googleapis.com/token'?Response.json({access_token:'fixture',expires_in:3600}):new Response(null,{status})});
 assert.equal(await api.get(product,'fixture-receipt'),null);status=403;await assert.rejects(api.get(product,'fixture-receipt'),{status:503});status=429;await assert.rejects(api.get(product,'fixture-receipt'),{status:503});
});
test('receipt endpoint authenticates Google Firebase identity and signs only after validation; no client UID/owner/product accepted',async()=>{
 let signed=0,verified=0;const handle=createPurchaseHandler({verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);if(token!=='fixture')throw Object.assign(Error(),{status:401});return {uid,sub:uid,firebase:{sign_in_provider:'google.com'}};},purchases:{verifyPurchase:async(subject,token)=>{assert.equal(subject,uid);if(token!=='fixture-receipt')throw Object.assign(Error(),{status:409});verified++;}},signProof:claims=>{signed++;assert.equal(claims.source,'GOOGLE_PLAY_PURCHASE');assert.equal(claims.subject,uid);assert.equal(claims.expiresAt,null);return 'fixture-signed-proof';}});
 const req={method:'POST',authorization:'Bearer fixture',body:{action:'verifyPurchase',nonce,purchaseToken:'fixture-receipt'}};
 assert.equal((await handle({...req,authorization:'Bearer forged'})).status,401);
 for(const extra of [{uid:'other'},{owner:true},{productId:'other'}])assert.equal((await handle({...req,body:{...req.body,...extra}})).status,400);
 assert.equal((await handle({...req,body:{...req.body,purchaseToken:'forged'}})).status,409);assert.equal(signed,0);assert.equal((await handle(req)).status,200);assert.equal(signed,1);assert.equal(verified,1);
});
test('client purchase, cancellation, pending, restore and account switches never mint local PREMIUM',async()=>{
 let user={uid},receipt={status:'purchased',purchaseToken:'fixture-receipt'},checks=0;
 const secure={configured:true,verifyPurchase:async token=>{assert.equal(token,'fixture-receipt');checks++;return {state:'PREMIUM',premiumSource:'GOOGLE_PLAY_PURCHASE'};},refresh:async()=>{}};
 const billing=createPlayBilling({auth:{getCurrentUser:()=>user},secure,plugin:{getProduct:async()=>({available:true,price:'fixture-price'}),purchase:async()=>receipt,restore:async()=>({purchases:[receipt]})}});
 assert.equal((await billing.purchase()).status,'verified');assert.equal((await billing.restore()).status,'verified');assert.equal(checks,2);
 receipt={status:'pending'};assert.equal((await billing.purchase()).status,'pending');receipt={status:'cancelled'};assert.equal((await billing.purchase()).status,'cancelled');assert.equal(checks,2);
 user=null;await assert.rejects(billing.purchase(),/authenticationRequired/);
 const switched=createPlayBilling({auth:{getCurrentUser:()=>user},secure,plugin:{purchase:async()=>{user={uid:'other'};return {status:'purchased',purchaseToken:'fixture-receipt'};}}});user={uid};await assert.rejects(switched.purchase(),/authenticationRequired/);assert.equal(checks,2);
});
test('server proof still passes through native signature acceptance before the client grants purchase access',async()=>{
 let accepted=0;const bridge={getCurrentUser:()=>({uid}),getIdToken:async()=> 'fixture-id-token'};
 const secure=createSecureAccess({bridge,plugin:{beginVerification:async()=>({nonce}),acceptProof:async({proof})=>{assert.equal(proof,'fixture-signed-proof');accepted++;},getAccess:async()=>({subject:uid,state:'PREMIUM',premiumSource:'GOOGLE_PLAY_PURCHASE'})},endpoint:'https://fixture.invalid/access',fetchImpl:async(url,options)=>{assert.equal(url,'https://fixture.invalid/purchase');assert.deepEqual(JSON.parse(options.body),{action:'verifyPurchase',nonce,purchaseToken:'fixture-receipt'});return Response.json({version:1,proof:'fixture-signed-proof'});}});
 assert.equal((await secure.verifyPurchase('fixture-receipt')).state,'PREMIUM');assert.equal(accepted,1);
});
