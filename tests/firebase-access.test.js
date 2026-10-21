import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseAccess} from '../src/firebase-access.js';
import {createAccessService} from '../src/access.js';
import {createLicenseHandler} from '../backend/license-handler.js';
const claims=uid=>({uid,sub:uid,firebase:{sign_in_provider:'google.com'}});
const memory=()=>({getItem:()=>null,setItem(){}});
function setup(){let user=null,listener;const requests=[];const bridge={getCurrentUser:()=>user,getIdToken:async()=> 'test-token',onIdTokenChanged:fn=>{listener=fn;return ()=>{listener=null;};},signInWithGoogle:async()=>{user={uid:'test-owner'};listener?.();},signOut:async()=>{user=null;listener?.();}};return {bridge,requests,change(uid){user=uid?{uid}:null;listener?.();}};}
test('optional Google/Firebase bridge verifies token through HTTPS and reuses existing policy',async()=>{
 const f=setup(),integration=createFirebaseAccess({authBridge:f.bridge,endpoint:'https://licenses.example.test/access',clock:()=>1000,fetchImpl:async(url,options)=>{f.requests.push(options);return {ok:true,json:async()=>({version:1,subject:'test-owner',entitlement:{source:'OWNER_GRANT',permanent:true,verifiedUntil:2000}})};}});
 const service=createAccessService(memory(),()=>1000,integration.provider);assert.equal(service.snapshot().state,'BASIC');assert.equal(f.requests.length,0);integration.start();await integration.signInWithGoogle();assert.equal(service.snapshot().state,'PREMIUM');assert.equal(f.requests[0].headers.Authorization,'Bearer test-token');assert.equal(f.requests[0].body,'{}');assert.equal(f.requests[0].redirect,'error');f.change('test-other');assert.equal(service.snapshot().state,'BASIC');await integration.signOut();integration.dispose();
});
test('offline, forged subject, unrecognized grant and HTTP denial fall back without requiring login for BASIC',async()=>{
 for(const response of [null,{ok:false},{ok:true,json:async()=>({version:1,subject:'other',entitlement:{permanent:true}})},{ok:true,json:async()=>({version:1,subject:'test-owner',entitlement:{source:'LOCAL',permanent:true,verifiedUntil:2000}})}]){
  const f=setup(),integration=createFirebaseAccess({authBridge:f.bridge,endpoint:'https://licenses.example.test/access',clock:()=>1000,fetchImpl:async()=>{if(!response)throw Error('offline');return response;}});await integration.signInWithGoogle();assert.equal(createAccessService(memory(),()=>1000,integration.provider).snapshot().state,'BASIC');
 }
 assert.throws(()=>createFirebaseAccess({endpoint:'http://licenses.example.test',authBridge:{}}),/Secure/);
});
test('server verifies Firebase token including revocation before consulting any license source',async()=>{
 let lookedUp=false;const handler=createLicenseHandler({verifyIdToken:async(token,revoked)=>{assert.equal(revoked,true);if(token!=='valid')throw Error();return claims('test-owner');},readOwnerSubject:async()=>{lookedUp=true;return 'test-owner';},readVerifiedPurchase:async()=>null,clock:()=>1000});
 assert.equal((await handler({method:'POST',body:{uid:'test-owner'}})).status,401);assert.equal(lookedUp,false);assert.equal((await handler({method:'POST',authorization:'Bearer forged'})).status,401);assert.equal(lookedUp,false);
 const reply=await handler({method:'POST',authorization:'Bearer valid',body:{uid:'attacker'}});assert.equal(reply.body.subject,'test-owner');assert.equal(reply.body.entitlement.source,'OWNER_GRANT');assert.equal(reply.body.entitlement.verifiedUntil,301000);assert.equal(reply.headers['Cache-Control'],'no-store');
});
test('server owner grant is exclusive; purchased rights require server record; errors deny safely',async()=>{
 let purchase=null;const deps={verifyIdToken:async()=>claims('test-other'),readOwnerSubject:async()=> 'test-owner',readVerifiedPurchase:async()=>purchase};const handler=createLicenseHandler(deps);
 assert.equal((await handler({method:'POST',authorization:'Bearer valid'})).body.entitlement,null);
 purchase={subject:'test-other',status:'active',permanent:true};assert.equal((await handler({method:'POST',authorization:'Bearer valid'})).body.entitlement.source,'GOOGLE_PLAY_PURCHASE');
 purchase.status='revoked';assert.equal((await handler({method:'POST',authorization:'Bearer valid'})).body.entitlement,null);
 purchase={subject:'test-owner',status:'active',permanent:true};assert.equal((await handler({method:'POST',authorization:'Bearer valid'})).body.entitlement,null);
 assert.equal((await createLicenseHandler({...deps,readOwnerSubject:async()=>{throw Error();}})({method:'POST',authorization:'Bearer valid'})).status,503);
 assert.equal((await createLicenseHandler({...deps,verifyIdToken:async()=>({...claims('test-owner'),firebase:{sign_in_provider:'anonymous'}})})({method:'POST',authorization:'Bearer valid'})).status,401);
 assert.equal((await handler({method:'GET'})).status,405);
});
