// Offline entitlement foundation. Never stores or rewrites apartment/booking data.
export const ACCESS_KEY='apartment-booking-manager:access:v1';
export const BASIC_LIMIT=3;
export const TRIAL_DURATION=15*86400000;
export const ACCESS_STATES=Object.freeze({TRIAL:'TRIAL',BASIC:'BASIC',PREMIUM:'PREMIUM'});
export const PREMIUM_SOURCES=Object.freeze({PURCHASE:'GOOGLE_PLAY_PURCHASE',OWNER:'OWNER_GRANT'});
function validPremiumGrant(grant,now){
 return grant?.permanent===true&&Object.values(PREMIUM_SOURCES).includes(grant.source)&&typeof grant.subject==='string'&&grant.subject.length>0&&Number.isFinite(grant.verifiedUntil)&&grant.verifiedUntil>now;
}
// Trust boundary: verifyAccess must authenticate the session and verify backend proof.
// Never pass localStorage, an email comparison or an unverified HTTP JSON reader here.
export function createPremiumProvider({verifyAccess,getAuthenticatedSubject,clock=Date.now}){
 if(typeof verifyAccess!=='function'||typeof getAuthenticatedSubject!=='function')throw new TypeError('Trusted access adapter required');
 let grant=null,generation=0,lastSeen=-Infinity;
 function now(){lastSeen=Math.max(lastSeen,clock());return lastSeen;}
 function subject(){try{return getAuthenticatedSubject();}catch{return null;}}
 function getVerifiedEntitlement(){
  if(!validPremiumGrant(grant,now())||grant.subject!==subject()){grant=null;return null;}
  return {...grant};
 }
 return Object.freeze({getVerifiedEntitlement,clear(){generation++;grant=null;},async refresh(){
  const request=++generation;grant=null;const account=subject();
  if(typeof account!=='string'||!account)return null;
  try{
   const result=await verifyAccess({subject:account});
   if(request!==generation)return null;
   if(subject()!==account||result?.subject!==account||!validPremiumGrant(result,now()))return null;
   grant=Object.freeze({subject:result.subject,source:result.source,permanent:true,verifiedUntil:result.verifiedUntil});
   return getVerifiedEntitlement();
  }catch{return null;}
 }});
}
export function createAccessService(storage=globalThis.localStorage,clock=Date.now,purchaseProvider=billingAdapter){
 let record,unavailable=false;
 try{const raw=storage.getItem(ACCESS_KEY);record=raw===null?null:JSON.parse(raw);
  if(record!==null&&(record.version!==1||!Number.isFinite(record.startedAt)||record.startedAt<0||!Number.isFinite(record.lastSeen)||record.lastSeen<record.startedAt))throw new Error('Invalid entitlement');
 }catch{unavailable=true;}
 function snapshot(){
  const now=clock();
  if(record&&!unavailable&&now>record.lastSeen){const next={...record,lastSeen:now};try{storage.setItem(ACCESS_KEY,JSON.stringify(next));record=next;}catch{unavailable=true;}}
  const effectiveNow=Math.max(now,record?.lastSeen??now);
  let premium=null;try{const grant=purchaseProvider.getVerifiedEntitlement();if(validPremiumGrant(grant,effectiveNow))premium=grant;}catch{}
  return {state:premium!==null?'PREMIUM':!unavailable&&record&&effectiveNow<record.startedAt+TRIAL_DURATION?'TRIAL':'BASIC',trialAvailable:!unavailable&&!record&&premium===null,expiresAt:record?record.startedAt+TRIAL_DURATION:null,unavailable,premiumSource:premium?.source??null};
 }
 return {snapshot,startTrial(){if(!snapshot().trialAvailable)return false;const now=clock(),next={version:1,startedAt:now,lastSeen:now};try{storage.setItem(ACCESS_KEY,JSON.stringify(next));record=next;return true;}catch{unavailable=true;return false;}}};
}
export function accessPolicy(entitlement,apartments){
 const unlimited=['TRIAL','PREMIUM'].includes(entitlement.state);
 const active=new Set(apartments.slice(0,BASIC_LIMIT).map(a=>a.id));
 return {adsEligible:true,canAddApartment:unlimited||apartments.length<BASIC_LIMIT,canManageApartment:id=>unlimited||active.has(id)};
}
// Future Billing adapter: only a verified purchase provider may supply PREMIUM.
// No UI/local flag grants PREMIUM; purchasing and restoration are unavailable.
export const billingAdapter=Object.freeze({available:false,getVerifiedEntitlement(){return null;},async purchase(){throw new Error('billingUnavailable');},async restore(){throw new Error('billingUnavailable');}});
