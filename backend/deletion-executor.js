import {randomUUID} from 'node:crypto';

// Deliberately no default retention and no public execution endpoint.
export function deletionExecutionReady(env){
 const days=Number(env.DELETION_RECEIPT_TTL_DAYS);
 return env.DELETION_EXECUTION_ENABLED==='true'&&env.DELETION_BACKEND_VERIFIED==='true'&&
  env.DELETION_RETENTION_APPROVED==='true'&&env.DELETION_MAINTENANCE_VERIFIED==='true'&&
  env.NEW_TRIALS_ENABLED==='false'&&!env.PLAY_PRODUCT_ID&&
  Number.isSafeInteger(days)&&days>=1&&days<=365;
}
export function createExecutionRepository(database){
 const db=database.withSession('first-primary');
 const statement=(sql,...args)=>db.prepare(sql).bind(...args);
 return {
  async candidates(now){
   await statement('DELETE FROM deletion_receipts WHERE request_id IN (SELECT request_id FROM deletion_receipts WHERE expires_at<=? ORDER BY expires_at,request_id LIMIT 25)',now).run();
   return (await statement("SELECT r.subject,r.request_id,r.created_at FROM account_deletion_requests r LEFT JOIN deletion_execution e ON e.subject=r.subject WHERE e.subject IS NULL OR (e.state IN ('processing','retry') AND e.lease_until<=?) ORDER BY r.created_at,r.subject LIMIT 1",now).all()).results;
  },
  async claim(request,now){
   const lease=randomUUID();
   const result=await statement("INSERT INTO deletion_execution(subject,lease,lease_until,state,updated_at) VALUES (?,?,?,'processing',?) ON CONFLICT(subject) DO UPDATE SET lease=excluded.lease,lease_until=excluded.lease_until,state='processing',reason=NULL,updated_at=excluded.updated_at WHERE deletion_execution.state IN ('processing','retry') AND deletion_execution.lease_until<=?",request.subject,lease,now+300000,now,now).run();
   return result.meta.changes===1?lease:null;
  },
  async blocker(subject,owner){
   if(subject===owner)return 'owner_configuration';
   if(await statement('SELECT 1 FROM play_purchases WHERE subject=? LIMIT 1',subject).first()||await statement("SELECT 1 FROM licenses WHERE subject=? AND (source='GOOGLE_PLAY_PURCHASE' OR purchase_token_hash IS NOT NULL) LIMIT 1",subject).first())return 'purchase_recovery';
   // Identity revocation/security restrictions remain independent of trial history.
   if(await statement('SELECT 1 FROM identity_policy WHERE subject=? LIMIT 1',subject).first())return 'trial_policy';
   return null;
  },
  async mark(subject,lease,state,reason,now){
   await statement('UPDATE deletion_execution SET state=?,reason=?,updated_at=? WHERE subject=? AND lease=?',state,reason,now,subject,lease).run();
  },
  async finish(request,lease,now,ttl){
   // All deletions and the completion receipt commit together. A lost lease
   // cannot remove rows or claim completion. Purchase evidence is never erased.
   const guard='EXISTS(SELECT 1 FROM deletion_execution WHERE subject=? AND lease=? AND state=\'processing\')';
   const absent="NOT EXISTS(SELECT 1 FROM identity_policy WHERE subject=?) AND NOT EXISTS(SELECT 1 FROM play_purchases WHERE subject=?) AND NOT EXISTS(SELECT 1 FROM licenses WHERE subject=? AND (source='GOOGLE_PLAY_PURCHASE' OR purchase_token_hash IS NOT NULL))";
   const condition=guard+' AND '+absent;
   const args=[request.subject,lease,...Array(3).fill(request.subject)];
   await db.batch([
    statement('INSERT INTO deletion_receipts(request_id,completed_at,expires_at) SELECT ?,?,? WHERE '+condition,request.request_id,now,now+ttl,...args),
    statement('DELETE FROM trials WHERE subject=? AND '+condition,request.subject,...args),
    statement('DELETE FROM licenses WHERE subject=? AND '+condition,request.subject,...args),
    statement('DELETE FROM account_deletion_requests WHERE subject=? AND '+condition,request.subject,...args),
    statement('DELETE FROM deletion_execution WHERE subject=? AND lease=? AND EXISTS(SELECT 1 FROM deletion_receipts WHERE request_id=?)',request.subject,lease,request.request_id)
   ]);
   return Boolean(await statement('SELECT 1 FROM deletion_receipts WHERE request_id=?',request.request_id).first());
  }
 };
}
export function createDeletionExecutor({repository,firebase,clock=Date.now}){
 return async env=>{
  const counts={completed:0,blocked:0,retry:0,skipped:0};
  if(!deletionExecutionReady(env))return {...counts,disabled:true};
  for(const request of await repository.candidates(clock())){
   const lease=await repository.claim(request,clock());if(!lease){counts.skipped++;continue;}
   try{
    const reason=await repository.blocker(request.subject,env.OWNER_SUBJECT);
    if(reason){await repository.mark(request.subject,lease,'blocked',reason,clock());counts.blocked++;continue;}
    const user=await firebase.lookup(request.subject);
    // A recreated UID must never be deleted by a request for an older account.
    if(user&&(user.uid!==request.subject||!Number.isSafeInteger(user.createdAt)||user.createdAt>request.created_at||user.provider!=='google.com')){
     await repository.mark(request.subject,lease,'blocked','identity_changed',clock());counts.blocked++;continue;
    }
    if(user)await firebase.delete(request.subject);
    // Confirm absence, including ambiguous timeout/retry after a successful delete.
    if(await firebase.lookup(request.subject))throw Error('Deletion unconfirmed');
    if(!await repository.finish(request,lease,clock(),Number(env.DELETION_RECEIPT_TTL_DAYS)*86400000))throw Error('Cleanup unconfirmed');
    counts.completed++;
   }catch{
    // Never persist raw provider errors, identifiers, credentials or request bodies.
    await repository.mark(request.subject,lease,'retry','backend_failure',clock());counts.retry++;
   }
  }
  return counts;
 };
}
