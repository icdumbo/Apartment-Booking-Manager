import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeletionHandler} from '../deletion-requests.js';

test('receipt lookup never authenticates as the deleted user or returns identity data',async()=>{
 const requestId='00000000-0000-4000-8000-000000000001';
 const now=1800000000000;
 let completed=false;
 const handle=createDeletionHandler({clock:()=>now,verifyIdToken:()=>assert.fail('Receipt lookup must work after Firebase deletion'),repository:{
  async receipt(id,at){assert.equal(at,now);return completed&&id===requestId?{completed_at:now,subject:'must not be returned'}:null;}
 }});
 const check=(body)=>handle({body});
 assert.deepEqual((await check({action:'receipt',requestId})).body,{version:1,deleted:false});
 assert.equal((await check({action:'receipt',requestId,subject:'forged'})).status,400);
 assert.equal((await check({action:'receipt',requestId:'guessed'})).status,400);
 completed=true;
 assert.deepEqual((await check({action:'receipt',requestId})).body,{version:1,deleted:true});
});

test('isolated Worker intake, partial Firebase/D1 failure and retry expose completion only after cleanup',async()=>{
 const {localD1SQLite}=await import('./local-d1-sqlite.mjs');
 const {readFile}=await import('node:fs/promises');
 const {createPrivacyWorker}=await import('../privacy-worker.js');
 const {createDeletionExecutor,createExecutionRepository}=await import('../deletion-executor.js');
 const {db,dispose}=await localD1SQLite();
 try{
  for(const file of ['0001_access.sql','0002_play_purchases.sql','0003_deletion_requests.sql','0004_deletion_execution.sql']){
   const sql=(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8')).replace(/--[^\n]*/g,'').trim();
   for(const statement of sql.split(/(?<=;)\s*(?=CREATE)/))await db.prepare(statement).run();
  }
  let now=1800000000000,user={uid:'fictional-a',provider:'google.com',createdAt:now-1000};
  const env={DB:db,FIREBASE_API_KEY:'fixture',DELETION_REQUESTS_ENABLED:'true',DELETION_WEB_ORIGIN:'https://fixture.invalid',
   DELETION_EXECUTION_ENABLED:'true',DELETION_BACKEND_VERIFIED:'true',DELETION_RETENTION_APPROVED:'true',DELETION_MAINTENANCE_VERIFIED:'true',NEW_TRIALS_ENABLED:'false',DELETION_RECEIPT_TTL_DAYS:'1'};
  const worker=createPrivacyWorker({clock:()=>now,makeVerifier:()=>async token=>{
   if(!user||!['recent','stale'].includes(token))throw Object.assign(Error(),{status:401});
   return {uid:user.uid,sub:user.uid,firebase:{sign_in_provider:'google.com'},auth_time:Math.floor(now/1000)-(token==='stale'?301:0)};
  }});
  const call=(body,token,origin='https://fixture.invalid')=>worker.fetch(new Request('https://worker.fixture.invalid/account-deletion',{
   method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)
  }),env);
  const request={action:'request',confirmation:'request-account-deletion-v1',language:'en'};
  assert.equal((await call(request)).status,401);
  assert.equal((await call(request,'stale')).status,401);
  assert.equal((await call({...request,confirmation:''},'recent')).status,400);
  assert.equal((await call(request,'recent','https://wrong.invalid')).status,403);
  const result=await(await call(request,'recent')).json();
  assert.equal(result.status,'pending_review');
  const receipt={action:'receipt',requestId:result.requestId};
  const repository=createExecutionRepository(db);
  let fail=true;
  const run=createDeletionExecutor({clock:()=>now,repository:{...repository,finish:async(...args)=>{
   if(fail){fail=false;throw Error('fixture D1 failure');}
   return repository.finish(...args);
  }},firebase:{lookup:async()=>user,delete:async()=>{user=null;}}});
  assert.equal((await run(env)).retry,1);
  assert.equal(user,null);
  assert.deepEqual(await(await call(receipt)).json(),{version:1,deleted:false});
  assert.equal((await call({action:'status'},'recent')).status,401);
  now+=300001;
  assert.equal((await run(env)).completed,1);
  assert.deepEqual(await(await call(receipt)).json(),{version:1,deleted:true});
 }finally{dispose();}
});
