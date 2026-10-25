import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeAuthBridge,createOptionalAndroidAuth,LICENSE_ENDPOINT} from '../src/native-auth.js';
import {createLicenseHandler} from '../backend/license-handler.js';
import {prepareGiftOperation} from '../backend/gift-admin-contract.js';
import {createPremiumProvider,validPremiumGrant} from '../src/access.js';
const claims={uid:'test-admin',sub:'test-admin',auth_time:1,firebase:{sign_in_provider:'google.com'}};
test('native adapter handles restored session, login, token and local logout without granting a license',async()=>{
 let listener,user=null;const plugin={addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{}};},getCurrentUser:async()=>({user}),getIdToken:async()=>({token:'test-token'}),signInWithGoogle:async()=>({user:{uid:'test-user'}}),signOut:async()=>{throw Error('chooser unavailable');}};
 const bridge=createNativeAuthBridge(plugin);await bridge.initialize();assert.equal(bridge.getCurrentUser(),null);await bridge.signInWithGoogle();assert.equal(await bridge.getIdToken({uid:'test-user'}),'test-token');await assert.rejects(bridge.getIdToken({uid:'another'}));await assert.rejects(bridge.signOut());assert.equal(bridge.getCurrentUser(),null);listener({user:{uid:'next-user'}});assert.equal(bridge.getCurrentUser().uid,'next-user');await bridge.dispose();assert.equal(bridge.getCurrentUser(),null);
 assert.equal(LICENSE_ENDPOINT,'https://apartment-booking-access.ionutliviucraciun1982.workers.dev/access');assert.equal(createOptionalAndroidAuth({getPlatform:()=> 'web'}).available,false);
 const native=createOptionalAndroidAuth({getPlatform:()=> 'android',Plugins:{BookingAuth:plugin}});await native.initialize();await native.signIn();assert.equal(native.provider.getVerifiedEntitlement(),null);
});
test('late initial native response cannot overwrite a new account event',async()=>{
 let listener,resolve;const bridge=createNativeAuthBridge({addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{}};},getCurrentUser:()=>new Promise(r=>{resolve=r;})});
 const initial=bridge.initialize();await Promise.resolve();listener({user:{uid:'new-account'}});resolve({user:{uid:'stale-account'}});await initial;assert.equal(bridge.getCurrentUser().uid,'new-account');
});
test('gift lifetime and revocation are server controlled, with deadline bounded by gift expiry',async()=>{
 let now=1000,gift={subject:'test-user',status:'active',permanent:false,expiresAt:2000};
 const handler=createLicenseHandler({verifyIdToken:async()=>({...claims,uid:'test-user',sub:'test-user'}),readOwnerSubject:async()=>null,readVerifiedPurchase:async()=>null,readGift:async()=>gift,clock:()=>now});
 const provider=createPremiumProvider({getAuthenticatedSubject:()=> 'test-user',clock:()=>now,verifyAccess:async()=>{const {body}=await handler({method:'POST',authorization:'Bearer test-token'});return body.entitlement&&{...body.entitlement,subject:body.subject};}});
 await provider.refresh();const grant=provider.getVerifiedEntitlement();assert.equal(grant.source,'ADMIN_GIFT');assert.equal(grant.permanent,false);assert.equal(grant.verifiedUntil,2000);now=2000;assert.equal(provider.getVerifiedEntitlement(),null);
 gift={subject:'test-user',status:'active',permanent:true};await provider.refresh();assert.equal(provider.getVerifiedEntitlement().permanent,true);gift.status='revoked';await provider.refresh();assert.equal(provider.getVerifiedEntitlement(),null);
 gift={subject:'another',status:'active',permanent:true};await provider.refresh();assert.equal(provider.getVerifiedEntitlement(),null);
 assert.equal(validPremiumGrant({subject:'test',source:'ADMIN_GIFT',permanent:false,expiresAt:4000,verifiedUntil:5000},1000),false);
});
test('gift operation contract requires verified authorized recent admin and never writes grants',async()=>{
 let authorizations=0;const deps={verifyIdToken:async(token,check)=>{assert.equal(check,true);if(token!=='verified')throw Error('invalid token');return claims;},isAuthorizedAdmin:async uid=>{authorizations++;return uid==='test-admin';},clock:()=>2000};
 const request={token:'verified',operation:{kind:'grant',targetSubject:'test-user',permanent:false,expiresAt:5000}};
 const plan=await prepareGiftOperation(request,deps);assert.deepEqual(plan,{actor:'test-admin',...request.operation});assert.equal(Object.isFrozen(plan),true);
 await assert.rejects(prepareGiftOperation({...request,token:'forged'},deps));assert.equal(authorizations,1);
 await assert.rejects(prepareGiftOperation(request,{...deps,isAuthorizedAdmin:async()=>false}),/adminRequired/);
 await assert.rejects(prepareGiftOperation(request,{...deps,clock:()=>1000000}),/recentAuthenticationRequired/);
 await assert.rejects(prepareGiftOperation({...request,operation:{...request.operation,expiresAt:1000}},deps),/invalidGiftDuration/);
 const revoke=await prepareGiftOperation({token:'verified',operation:{kind:'revoke',targetSubject:'test-user'}},deps);assert.equal(revoke.kind,'revoke');
});
