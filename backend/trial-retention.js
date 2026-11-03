export const TRIAL_RETENTION_BATCH=25;
export function trialRetentionReady(env){
 return env.TRIAL_RETENTION_ENABLED==='true'&&env.TRIAL_RETENTION_BACKEND_VERIFIED==='true'&&env.TRIAL_RETENTION_POLICY_APPROVED==='true';
}
export async function cleanTrialHistory(database,now=Date.now()){
 if(!Number.isSafeInteger(now)||now<0)throw Error('Invalid retention time');
 const db=database.withSession('first-primary');
 // Keyset backfill: no repeated scan of previously classified rows. The primary
 // key supports the cursor; AFTER INSERT classifies all future rows atomically.
 const next="SELECT subject FROM trials WHERE subject>(SELECT backfill_after FROM trial_retention_control WHERE singleton=1) ORDER BY subject LIMIT "+TRIAL_RETENTION_BATCH;
 const result=await db.batch([
  db.prepare('INSERT INTO trial_retention(subject,retention_until) SELECT subject,retention_until FROM trial_retention_source WHERE subject IN ('+next+') ON CONFLICT(subject) DO NOTHING'),
  db.prepare('UPDATE trial_retention_control SET backfill_after=COALESCE((SELECT MAX(subject) FROM ('+next+')),backfill_after) WHERE singleton=1'),
  db.prepare('DELETE FROM trials WHERE subject IN (SELECT subject FROM trial_retention WHERE retention_until<=? ORDER BY retention_until,subject LIMIT '+TRIAL_RETENTION_BATCH+')').bind(Math.floor(now/1000)*1000)
 ]);
 // Counts only; no UID, token or raw database error is emitted or persisted.
 return {classified:result[0].meta.changes,removed:result[2].meta.changes};
}
export async function runTrialRetention(env,{clock=Date.now}={}){
 if(!env.DB||!trialRetentionReady(env))return {disabled:true};
 return cleanTrialHistory(env.DB,clock());
}
