import {createLicenseHandler} from './license-handler.js';
export const TRIAL_MS=15*86400000;
export const TRIAL_TERMS='trial-15d-v1';
// Reuses the existing authenticated license resolver. No client-selected identity.
export function createTrialHandler({trialRepository,signProof,clock=Date.now,...licenseDependencies}){
 const license=createLicenseHandler({...licenseDependencies,clock});
 return async request=>{
  const resolved=await license(request);
  if(resolved.status!==200)return resolved;
  const reply=(status,body)=>({status,headers:resolved.headers,body});
  const body=request.body;
  if(!body||Object.keys(body).some(k=>!['action','nonce','terms'].includes(k))||!['verify','startTrial'].includes(body.action)||typeof body.nonce!=='string'||!/^[-A-Za-z0-9_]{32,128}$/.test(body.nonce))return reply(400,{error:'invalidRequest'});
  if(body.action==='startTrial'&&body.terms!==TRIAL_TERMS)return reply(400,{error:'trialConfirmationRequired'});
  try{
   const subject=resolved.body.subject,now=clock();
   let state='BASIC',source=null,startedAt=null,expiresAt=null;
   const entitlement=resolved.body.entitlement;
   if(entitlement){state='PREMIUM';source=entitlement.source;expiresAt=entitlement.permanent?null:entitlement.expiresAt;}
   else{
    const trial=await trialRepository.resolve(subject,{activate:body.action==='startTrial',now});
    if(trial){
     if(!Number.isSafeInteger(trial.startedAt)||!Number.isSafeInteger(trial.expiresAt)||trial.startedAt<0||trial.expiresAt!==trial.startedAt+TRIAL_MS)throw Error('invalidTrial');
     startedAt=trial.startedAt;expiresAt=trial.expiresAt;
     if(now>=startedAt&&now<expiresAt){state='TRIAL';source='SERVER_TRIAL';}
    }
   }
   const proof=await signProof({version:1,subject,state,source,startedAt,expiresAt,issuedAt:now,nonce:body.nonce});
   return reply(200,{version:1,proof});
  }catch{return reply(503,{error:'verificationUnavailable'});}
 };
}
// Transaction adapter: create once, never renew, including expired records.
// Eligibility is server-owned; legacy/blocked accounts cannot self-enrol.
export function createTrialRepository({database,documentForSubject,allowNewTrials=false}){
 return {resolve(subject,{activate,now}){return database.runTransaction(async tx=>{
  const ref=documentForSubject(subject),snapshot=await tx.get(ref);
  if(snapshot.exists){const record=snapshot.data();if(record.status==='blocked')return null;if(record.version!==1||record.subject!==subject||record.status!=='used')throw Error('invalidTrialRecord');return record;}
  if(!activate||!allowNewTrials)return null;
  const record={version:1,subject,status:'used',startedAt:now,expiresAt:now+TRIAL_MS};
  tx.create(ref,record);return record;
 });}};
}
