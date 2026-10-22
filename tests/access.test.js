import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCESS_KEY,TRIAL_DURATION,createAccessService,accessPolicy,billingAdapter,createPremiumProvider,PREMIUM_SOURCES} from '../src/access.js';
function fixture(){let now=1000;const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};return {storage,values,clock:()=>now,time:v=>now=v};}
test('trial initialization is idempotent, survives reopening and expires exactly at 15 days',()=>{
 const f=fixture(),service=createAccessService(f.storage,f.clock);assert.equal(service.snapshot().state,'BASIC');assert.equal(service.snapshot().trialAvailable,true);assert.equal(f.values.size,0);
 assert.equal(service.startTrial(),true);assert.equal(service.startTrial(),false);assert.equal(JSON.parse(f.values.get(ACCESS_KEY)).startedAt,1000);f.time(1000+TRIAL_DURATION-1);assert.equal(createAccessService(f.storage,f.clock).snapshot().state,'TRIAL');
 f.time(1000+TRIAL_DURATION);assert.equal(service.snapshot().state,'BASIC');assert.equal(service.startTrial(),false);
 f.time(1000);assert.equal(createAccessService(f.storage,f.clock).snapshot().state,'BASIC');
});
test('access never changes existing data; BASIC manages only first three; trial/premium allow all; all tiers eligible for ads',()=>{
 const apartments=Array.from({length:6},(_,i)=>({id:String(i)})),before=JSON.stringify(apartments);
 for(const state of ['BASIC','TRIAL','PREMIUM']){const p=accessPolicy({state},apartments);assert.equal(p.adsEligible,true);assert.equal(p.canAddApartment,state!=='BASIC');assert.equal(p.canManageApartment('0'),true);assert.equal(p.canManageApartment('3'),state!=='BASIC');}
 assert.equal(JSON.stringify(apartments),before);assert.equal(accessPolicy({state:'BASIC'},apartments.slice(0,2)).canAddApartment,true);
});
test('corrupt or unavailable storage fails to BASIC without overwriting record or touching business storage',()=>{
 const f=fixture();f.values.set(ACCESS_KEY,'broken');const service=createAccessService(f.storage,f.clock);assert.equal(service.snapshot().state,'BASIC');assert.equal(service.startTrial(),false);assert.equal(f.values.get(ACCESS_KEY),'broken');
 const bad=createAccessService({getItem(){throw Error();},setItem(){throw Error();}},f.clock);assert.equal(bad.snapshot().unavailable,true);
 const full=createAccessService({getItem(){return null;},setItem(){throw Error();}},f.clock);assert.equal(full.startTrial(),false);assert.equal(full.snapshot().state,'BASIC');
});
test('Billing placeholder cannot grant premium or initiate real payments',async()=>{assert.equal(billingAdapter.available,false);await assert.rejects(billingAdapter.purchase(),/billingUnavailable/);await assert.rejects(billingAdapter.restore(),/billingUnavailable/);});
test('verified purchase provider resolves permanent PREMIUM without a local premium flag',()=>{
 const f=fixture();f.values.set(ACCESS_KEY,JSON.stringify({version:1,startedAt:0,lastSeen:0,premium:true}));f.time(TRIAL_DURATION+1);
 assert.equal(createAccessService(f.storage,f.clock).snapshot().state,'BASIC');
 const premium=createAccessService(f.storage,f.clock,{getVerifiedEntitlement:()=>({permanent:true,source:PREMIUM_SOURCES.PURCHASE,subject:'test-account',verifiedUntil:TRIAL_DURATION*2})});assert.equal(premium.snapshot().state,'PREMIUM');assert.equal(premium.snapshot().trialAvailable,false);
});
test('trusted provider recognizes purchase and exclusive owner grants without persisting identity',async()=>{
 for(const source of Object.values(PREMIUM_SOURCES)){
  const f=fixture(),account='test-owner',provider=createPremiumProvider({clock:f.clock,getAuthenticatedSubject:()=>account,verifyAccess:async()=>({subject:account,source,permanent:true,verifiedUntil:5000})});
  const service=createAccessService(f.storage,f.clock,provider);assert.equal(service.snapshot().state,'BASIC');await provider.refresh();assert.equal(service.snapshot().state,'PREMIUM');assert.equal(service.snapshot().premiumSource,source);assert.equal(service.startTrial(),false);assert.equal(f.values.size,0);
  const copy=provider.getVerifiedEntitlement();copy.source='tampered';assert.equal(provider.getVerifiedEntitlement().source,source);
  f.time(5000);assert.equal(service.snapshot().state,'BASIC');f.time(1000);assert.equal(service.snapshot().state,'BASIC');
 }
});
test('identity change, logout, revocation, malformed proof and provider failure never grant PREMIUM',async()=>{
 const f=fixture();let account='test-owner',answer={subject:account,source:PREMIUM_SOURCES.OWNER,permanent:true,verifiedUntil:5000};
 const provider=createPremiumProvider({clock:f.clock,getAuthenticatedSubject:()=>account,verifyAccess:async()=>answer});const service=createAccessService(f.storage,f.clock,provider);
 await provider.refresh();account='test-other';assert.equal(service.snapshot().state,'BASIC');await provider.refresh();assert.equal(service.snapshot().state,'BASIC');
 account='test-owner';await provider.refresh();assert.equal(service.snapshot().state,'PREMIUM');answer=null;await provider.refresh();assert.equal(service.snapshot().state,'BASIC');
 for(const invalid of [{...answer,premium:true},{subject:account,source:'LOCAL',permanent:true,verifiedUntil:5000},{subject:account,source:PREMIUM_SOURCES.OWNER,permanent:false,verifiedUntil:5000},{subject:account,source:PREMIUM_SOURCES.OWNER,permanent:true,verifiedUntil:1000}]){answer=invalid;await provider.refresh();assert.equal(service.snapshot().state,'BASIC');}
 const broken=createAccessService(f.storage,f.clock,{getVerifiedEntitlement(){throw Error('offline');}});assert.equal(broken.snapshot().state,'BASIC');
 account=null;assert.equal(await provider.refresh(),null);
});
test('failed verification falls back to ongoing TRIAL and BASIC without changing business storage',async()=>{
 const f=fixture();const business='{"apartments":["existing"],"bookings":["existing"]}';f.values.set('apartment-booking-manager:v1',business);
 const provider=createPremiumProvider({clock:f.clock,getAuthenticatedSubject:()=> 'test-account',verifyAccess:async()=>{throw Error('offline');}});const service=createAccessService(f.storage,f.clock,provider);service.startTrial();await provider.refresh();assert.equal(service.snapshot().state,'TRIAL');f.time(1000+TRIAL_DURATION);assert.equal(service.snapshot().state,'BASIC');assert.equal(f.values.get('apartment-booking-manager:v1'),business);
});
test('stale verification results cannot restore revoked or previous-account access',async()=>{
 let resolve,account='test-owner';const provider=createPremiumProvider({clock:()=>1000,getAuthenticatedSubject:()=>account,verifyAccess:()=>new Promise(r=>{resolve=r;})});
 const pending=provider.refresh();provider.clear();resolve({subject:account,source:PREMIUM_SOURCES.OWNER,permanent:true,verifiedUntil:5000});assert.equal(await pending,null);assert.equal(provider.getVerifiedEntitlement(),null);
 const switched=provider.refresh();account='test-other';resolve({subject:'test-owner',source:PREMIUM_SOURCES.OWNER,permanent:true,verifiedUntil:5000});assert.equal(await switched,null);assert.equal(provider.getVerifiedEntitlement(),null);
});

test('eligible initialization never resets ongoing or expired trials or writes over permanent rights',()=>{
 for(const elapsed of [100,TRIAL_DURATION+100]){
  const f=fixture();const service=createAccessService(f.storage,f.clock);service.startTrial();f.time(1000+elapsed);
  const reopened=createAccessService(f.storage,f.clock);assert.equal(reopened.startTrial(),false);assert.equal(JSON.parse(f.values.get(ACCESS_KEY)).startedAt,1000);
 }
 const f=fixture();const premium=createAccessService(f.storage,f.clock,{getVerifiedEntitlement:()=>({subject:'test',source:PREMIUM_SOURCES.OWNER,permanent:true,verifiedUntil:5000})});assert.equal(premium.startTrial(),false);assert.equal(f.values.size,0);assert.equal(premium.snapshot().state,'PREMIUM');
});
