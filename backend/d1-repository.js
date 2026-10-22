import {TRIAL_MS} from './trial-handler.js';
export function createD1Repository(database,{allowNewTrials=false}={}){
 // Force authoritative reads if D1 read replication is enabled later.
 const db=database.withSession('first-primary');
 const select='SELECT subject,status,started_at,expires_at FROM trials WHERE subject=?';
 const normalize=row=>{
  if(!row||row.status==='blocked')return null;
  return {version:1,subject:row.subject,status:row.status,startedAt:row.started_at,expiresAt:row.expires_at};
 };
 return {
  trialRepository:{async resolve(subject,{activate,now}){
   if(!activate||!allowNewTrials)return normalize(await db.prepare(select).bind(subject).first());
   // D1 batch is atomic; PK + DO NOTHING leaves the first deadline immutable.
   const results=await db.batch([
    db.prepare('INSERT INTO trials(subject,status,started_at,expires_at) VALUES (?,\'used\',?,?) ON CONFLICT(subject) DO NOTHING').bind(subject,now,now+TRIAL_MS),
    db.prepare(select).bind(subject)
   ]);
   return normalize(results[1].results[0]);
  }},
  async readLicense(subject,source){
   const row=await db.prepare('SELECT subject,status,permanent,expires_at FROM licenses WHERE subject=? AND source=?').bind(subject,source).first();
   return row?{subject:row.subject,status:row.status,permanent:row.permanent===1,...(row.expires_at===null?{}:{expiresAt:row.expires_at})}:null;
  },
  readIdentityPolicy:subject=>db.prepare('SELECT blocked,tokens_valid_after FROM identity_policy WHERE subject=?').bind(subject).first()
 };
}
