// Intake only. This module cannot delete Firebase users, trial history or purchases.
import {randomUUID} from 'node:crypto';
export const DELETION_CONFIRMATION='request-account-deletion-v1';
export function createDeletionRepository(database){
 const db=database.withSession('first-primary');
 return {async read(subject){return db.prepare('SELECT request_id, status, created_at FROM account_deletion_requests WHERE subject=?').bind(subject).first();},
  async submit(subject,language,now){
   await db.prepare('INSERT INTO account_deletion_requests(subject,request_id,status,created_at,language) VALUES (?,?,\'pending_review\',?,?) ON CONFLICT(subject) DO NOTHING').bind(subject,randomUUID(),now,language).run();
   return this.read(subject);
  }};
}
export function createDeletionHandler({verifyIdToken,repository,clock=Date.now}){
 return async({authorization,body})=>{
  const reply=(status,value)=>({status,body:value});
  const bearer=typeof authorization==='string'&&/^Bearer (\S+)$/.exec(authorization);
  if(!bearer)return reply(401,{error:'authenticationRequired'});
  try{
   const c=await verifyIdToken(bearer[1],true);
   if(!c?.uid||c.uid!==c.sub||c.firebase?.sign_in_provider!=='google.com')return reply(401,{error:'authenticationRequired'});
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','confirmation','language'].includes(k))||!['request','status'].includes(body.action))return reply(400,{error:'invalidRequest'});
   let record;
   if(body.action==='request'){
    if(body.confirmation!==DELETION_CONFIRMATION||!['ro','en'].includes(body.language))return reply(400,{error:'confirmationRequired'});
    const now=clock(),age=Math.floor(now/1000)-c.auth_time;
    if(!Number.isSafeInteger(c.auth_time)||age<0||age>300)return reply(401,{error:'recentAuthenticationRequired'});
    record=await repository.submit(c.uid,body.language,now);
    if(!record)throw Error('Unconfirmed write');
   }else record=await repository.read(c.uid);
   if(!record)return reply(200,{version:1,status:'not_requested',deleted:false});
   // No completion state exists until an approved retention/deletion executor is built.
   if(record.status!=='pending_review'||typeof record.request_id!=='string'||!Number.isSafeInteger(record.created_at))throw Error('Invalid intake record');
   return reply(200,{version:1,requestId:record.request_id,status:'pending_review',createdAt:record.created_at,deleted:false});
  }catch(error){return reply(error.status===401?401:503,{error:error.status===401?'authenticationRequired':'deletionRequestUnavailable'});}
 };
}
