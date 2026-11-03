import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {createDeletionExecutor,createExecutionRepository,deletionExecutionReady} from '../deletion-executor.js';
import {createFirebaseDeletionApi} from '../firebase-deletion.js';
import {FIREBASE_PROJECT} from '../firebase-token.js';
import {createAccessService} from '../../src/access.js';
let runtime,db,repo;
let now=1800000000000;
const approved=()=>({DELETION_EXECUTION_ENABLED:'true',DELETION_BACKEND_VERIFIED:'true',DELETION_RETENTION_APPROVED:'true',DELETION_MAINTENANCE_VERIFIED:'true',NEW_TRIALS_ENABLED:'false',DELETION_RECEIPT_TTL_DAYS:'30'});
before(async()=>{
 if(process.env.ABM_LOCAL_SQLITE==='1'){
  const local=await (await import('./local-d1-sqlite.mjs')).localD1SQLite();runtime={dispose:local.dispose};db=local.db;
 }else{
  runtime=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-22',d1Databases:{DB:'deletion-executor-fixture'}}));
  db=await runtime.getD1Database('DB');
 }
 for(const name of ['0001_access.sql','0002_play_purchases.sql','0003_deletion_requests.sql','0004_deletion_execution.sql','0005_trial_retention.sql','0006_trial_retention_cursor.sql','0007_approved_trial_policy.sql']){
  const sql=(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8')).replace(/--[^\n]*/g,'').trim();
  for(const statement of sql.split(/(?<=;)\s*(?=CREATE|INSERT INTO trial_retention_control|DROP TRIGGER|ALTER TABLE|UPDATE trial_retention_control)/))await db.prepare(statement).run();
 }
 repo=createExecutionRepository(db);
});
after(async()=>runtime?.dispose());
async function seed(subject){await db.prepare("INSERT INTO account_deletion_requests VALUES (?,?,'pending_review',?,'ro')").bind(subject,'reference-'+subject,now).run();return {subject,request_id:'reference-'+subject,created_at:now};}
const read=(table,subject)=>db.prepare('SELECT * FROM '+table+' WHERE subject=?').bind(subject).first();
async function executeOne(request,firebase,changes={}){
 return createDeletionExecutor({repository:{...repo,candidates:async()=>[request]},firebase,clock:()=>now})({...approved(),...changes});
}
test('execution is off without every approval, bounded retention and frozen commercial writes',async()=>{
 assert.equal(deletionExecutionReady({}),false);
 for(const key of ['DELETION_EXECUTION_ENABLED','DELETION_BACKEND_VERIFIED','DELETION_RETENTION_APPROVED','DELETION_MAINTENANCE_VERIFIED'])assert.equal(deletionExecutionReady({...approved(),[key]:'false'}),false);
 for(const changes of [{NEW_TRIALS_ENABLED:'true'},{PLAY_PRODUCT_ID:'configured-product'},{DELETION_RECEIPT_TTL_DAYS:undefined},{DELETION_RECEIPT_TTL_DAYS:'0'},{DELETION_RECEIPT_TTL_DAYS:'366'}])assert.equal(deletionExecutionReady({...approved(),...changes}),false);
 const result=await createDeletionExecutor({repository:{candidates(){throw Error('must not read');}},firebase:{}})({});assert.equal(result.disabled,true);
});
test('confirmed Firebase absence and atomic D1 cleanup; local business data stays accessible in BASIC',async()=>{
 const request=await seed('ordinary'),users=new Map([['ordinary',{uid:'ordinary',provider:'google.com',createdAt:now-1000}]]);
 await db.prepare("INSERT INTO licenses(subject,source,status,permanent) VALUES ('ordinary','ADMIN_GIFT','active',1)").run();
 const local=new Map([['apartment-booking-manager:v1',JSON.stringify({version:1,apartments:[{id:'a',name:'Fictional apartment'}],bookings:[{id:'b',guest:'Fictional guest',paidAmountCents:100}]})]]),before=JSON.stringify([...local]);
 const result=await executeOne(request,{lookup:async uid=>users.get(uid)??null,delete:async uid=>users.delete(uid)});
 assert.equal(result.completed,1);assert.equal(users.size,0);
 for(const table of ['licenses','account_deletion_requests','deletion_execution'])assert.equal(await read(table,'ordinary'),null);
 const receipt=await db.prepare('SELECT * FROM deletion_receipts WHERE request_id=?').bind(request.request_id).first();
 assert.deepEqual(Object.keys(receipt).sort(),['completed_at','expires_at','request_id']);assert.equal(receipt.expires_at,now+30*86400000);
 const access=createAccessService({getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value)});
 assert.equal(access.snapshot().state,'BASIC');assert.equal(JSON.stringify([...local]),before);
});
test('all purchase evidence, identity restrictions and OWNER block before contacting Firebase',async()=>{
 const scenarios=[['paid',"INSERT INTO play_purchases VALUES ('"+'a'.repeat(64)+"','paid','fixture','encrypted-fixture','revoked',0)",'purchase_recovery'],['license',"INSERT INTO licenses(subject,source,status,permanent) VALUES ('license','GOOGLE_PLAY_PURCHASE','revoked',1)",'purchase_recovery'],['policy',"INSERT INTO identity_policy(subject) VALUES ('policy')",'trial_policy'],['owner',null,'owner_configuration']];
 for(const [subject,sql,reason] of scenarios){const request=await seed(subject);if(sql)await db.prepare(sql).run();
  const result=await executeOne(request,{lookup:async()=>{throw Error('must not call Firebase');}},{OWNER_SUBJECT:'owner'});
  assert.equal(result.blocked,1);assert.equal((await read('deletion_execution',subject)).reason,reason);assert.ok(await read('account_deletion_requests',subject));
 }
 assert.ok(await read('play_purchases','paid'));
});
test('provider failure retries with lease, then handles an already deleted Firebase user idempotently',async()=>{
 const request=await seed('retry');let calls=0;
 const failed=await executeOne(request,{lookup:async()=>{calls++;throw Error('SECRET must never reach D1');}});assert.equal(failed.retry,1);
 const record=await read('deletion_execution','retry');assert.equal(record.reason,'backend_failure');assert.ok(!JSON.stringify(record).includes('SECRET'));
 const immediate=await executeOne(request,{lookup:async()=>{throw Error('not yet');}});assert.equal(immediate.skipped,1);assert.equal(calls,1);
 now+=300001;
 const done=await executeOne(request,{lookup:async()=>null,delete:async()=>{throw Error('already absent');}});assert.equal(done.completed,1);
});
test('approved policy permits authenticated account cleanup of active trial history only after Firebase absence',async()=>{
 const request=await seed('trial-delete');
 await db.prepare("INSERT INTO trials VALUES ('trial-delete','used',?,?)").bind(now,now+1296000000).run();
 await assert.rejects(db.prepare("DELETE FROM trials WHERE subject='trial-delete'").run(),/expiry|authenticated/);
 let present=true;
 const result=await executeOne(request,{lookup:async()=>present?{uid:request.subject,provider:'google.com',createdAt:now-1}:null,delete:async()=>{present=false;}});
 assert.equal(result.completed,1);assert.equal(present,false);assert.equal(await read('trials',request.subject),null);assert.equal(await read('trial_retention',request.subject),null);
});
test('Free plan housekeeping bounds receipt deletion and returns at most one account per invocation',async()=>{
 await seed('quota-a');await seed('quota-b');
 for(let i=0;i<30;i++)await db.prepare('INSERT INTO deletion_receipts VALUES (?,?,?)').bind('quota-'+i,now-1000,now-1).run();
 assert.equal((await repo.candidates(now)).length,1);
 assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM deletion_receipts WHERE request_id LIKE 'quota-%'").first()).count,5);
 const plan=(await db.prepare('EXPLAIN QUERY PLAN SELECT request_id FROM deletion_receipts WHERE expires_at<=? ORDER BY expires_at,request_id LIMIT 25').bind(now).all()).results;
 assert.ok(plan.some(row=>row.detail.includes('deletion_receipts_due')));
});
test('recreated UID and unexpected provider cannot be deleted by an older request',async()=>{
 for(const [suffix,user] of [['new',{provider:'google.com',createdAt:now+1}],['provider',{provider:'password',createdAt:now-1}],['uid',{uid:'different',provider:'google.com',createdAt:now-1}]]){
  const request=await seed('changed-'+suffix);let deletes=0;
  const result=await executeOne(request,{lookup:async()=>({uid:request.subject,...user}),delete:async()=>deletes++});
  assert.equal(result.blocked,1);assert.equal(deletes,0);assert.equal((await read('deletion_execution',request.subject)).reason,'identity_changed');
 }
});
test('lost leases cannot clean records, concurrent claims have one winner, receipt expiry is enforced',async()=>{
 const request=await seed('lease');const leases=await Promise.all([repo.claim(request,now),repo.claim(request,now)]);assert.equal(leases.filter(Boolean).length,1);
 assert.equal(await repo.finish(request,'wrong-lease',now,1000),false);assert.ok(await read('account_deletion_requests','lease'));
 await db.prepare('INSERT INTO deletion_receipts VALUES (?,?,?)').bind('expired',now-2000,now-1).run();await repo.candidates(now);assert.equal(await db.prepare("SELECT * FROM deletion_receipts WHERE request_id='expired'").first(),null);
});
test('Firebase success followed by D1 failure never claims completion and cleanup can resume',async()=>{
 const request=await seed('boundary');let present=true,deletes=0,failed=false;
 const firebase={lookup:async()=>present?{uid:request.subject,provider:'google.com',createdAt:now-1}:null,delete:async()=>{present=false;deletes++;}};
 const repository={...repo,candidates:async()=>[request],finish:async(...args)=>{if(!failed){failed=true;throw Error('D1 unavailable');}return repo.finish(...args);}};
 const execute=createDeletionExecutor({repository,firebase,clock:()=>now});
 assert.equal((await execute(approved())).completed,0);assert.equal(present,false);assert.ok(await read('account_deletion_requests',request.subject));
 now+=300001;assert.equal((await execute(approved())).completed,1);assert.equal(deletes,1);assert.equal(await read('account_deletion_requests',request.subject),null);
});
test('Firebase adapter restricts project, token destination, body and confirms actual REST lookup/delete responses',async()=>{
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const credential={type:'service_account',project_id:FIREBASE_PROJECT,client_email:'fictional@fixture.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})};
 assert.throws(()=>createFirebaseDeletionApi({serviceAccount:JSON.stringify({...credential,project_id:'other-project'})}));
 let present=true,oauth=0;const actions=[];
 const api=createFirebaseDeletionApi({serviceAccount:JSON.stringify(credential),clock:()=>now,fetchImpl:async(url,options)=>{
  assert.equal(options.redirect,'error');assert.ok(options.signal);
  if(url==='https://oauth2.googleapis.com/token'){oauth++;return Response.json({access_token:'fictional-access',expires_in:3600});}
  assert.ok(url.startsWith('https://identitytoolkit.googleapis.com/v1/projects/'+FIREBASE_PROJECT+'/accounts:'));
  assert.equal(options.headers.Authorization,'Bearer fictional-access');const body=JSON.parse(options.body);
  if(url.endsWith(':lookup')){assert.deepEqual(body,{localId:['fixture-user']});return Response.json(present?{users:[{localId:'fixture-user',createdAt:String(now-1),providerUserInfo:[{providerId:'google.com'}]}]}:{});}
  assert.deepEqual(body,{localId:'fixture-user'});actions.push('delete');present=false;return Response.json({});
 }});
 assert.deepEqual(await api.lookup('fixture-user'),{uid:'fixture-user',createdAt:now-1,provider:'google.com'});await api.delete('fixture-user');assert.equal(await api.lookup('fixture-user'),null);assert.equal(oauth,1);assert.deepEqual(actions,['delete']);
});
