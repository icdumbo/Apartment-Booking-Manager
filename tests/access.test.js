import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCESS_KEY,TRIAL_DURATION,createAccessService,accessPolicy,billingAdapter} from '../src/access.js';
function fixture(){let now=1000;const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};return {storage,values,clock:()=>now,time:v=>now=v};}
test('trial requires explicit activation, survives reopening and expires exactly at 15 days',()=>{
 const f=fixture(),service=createAccessService(f.storage,f.clock);assert.equal(service.snapshot().state,'BASIC');assert.equal(service.snapshot().trialAvailable,true);assert.equal(f.values.size,0);
 assert.equal(service.startTrial(),true);f.time(1000+TRIAL_DURATION-1);assert.equal(createAccessService(f.storage,f.clock).snapshot().state,'TRIAL');
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
 const premium=createAccessService(f.storage,f.clock,{getVerifiedEntitlement:()=>({permanent:true})});assert.equal(premium.snapshot().state,'PREMIUM');assert.equal(premium.snapshot().trialAvailable,false);
});
