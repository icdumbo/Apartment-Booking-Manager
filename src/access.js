// Offline entitlement foundation. Never stores or rewrites apartment/booking data.
export const ACCESS_KEY='apartment-booking-manager:access:v1';
export const BASIC_LIMIT=3;
export const TRIAL_DURATION=15*86400000;
export const ACCESS_STATES=Object.freeze({TRIAL:'TRIAL',BASIC:'BASIC',PREMIUM:'PREMIUM'});
export function createAccessService(storage=globalThis.localStorage,clock=Date.now,purchaseProvider=billingAdapter){
 let record,unavailable=false;
 try{const raw=storage.getItem(ACCESS_KEY);record=raw===null?null:JSON.parse(raw);
  if(record!==null&&(record.version!==1||!Number.isFinite(record.startedAt)||record.startedAt<0||!Number.isFinite(record.lastSeen)||record.lastSeen<record.startedAt))throw new Error('Invalid entitlement');
 }catch{unavailable=true;}
 function snapshot(){
  const now=clock();
  if(record&&!unavailable&&now>record.lastSeen){const next={...record,lastSeen:now};try{storage.setItem(ACCESS_KEY,JSON.stringify(next));record=next;}catch{unavailable=true;}}
  const effectiveNow=Math.max(now,record?.lastSeen??now);
  return {state:purchaseProvider.getVerifiedEntitlement()?.permanent===true?'PREMIUM':!unavailable&&record&&effectiveNow<record.startedAt+TRIAL_DURATION?'TRIAL':'BASIC',trialAvailable:!unavailable&&!record&&purchaseProvider.getVerifiedEntitlement()?.permanent!==true,expiresAt:record?record.startedAt+TRIAL_DURATION:null,unavailable};
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
