import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {cleanTrialHistory,runTrialRetention,TRIAL_RETENTION_BATCH} from '../trial-retention.js';
import {createD1Repository} from '../d1-repository.js';
import {createPrivacyWorker} from '../privacy-worker.js';
let db,runtime;
const now=Date.now();
const cases=[
 ['2023-08-31T23:59:59.123Z','2024-02-29T23:59:59.123Z'],
 ['2024-08-31T12:10:11.999Z','2025-02-28T12:10:11.999Z'],
 ['2024-12-31T00:00:00.000Z','2025-06-30T00:00:00.000Z'],
 ['2025-01-31T00:00:00.000Z','2025-07-31T00:00:00.000Z'],
 ['2025-03-31T00:00:00.000Z','2025-09-30T00:00:00.000Z'],
 ['2024-02-29T05:01:02.003Z','2024-08-29T05:01:02.003Z'],
 ['2025-10-26T01:30:00.321Z','2026-04-26T01:30:00.321Z']
];
async function migrate(name){
 const sql=(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8')).replace(/--[^\n]*/g,'').trim();
 for(const statement of sql.split(/(?<=;)\s*(?=CREATE|INSERT INTO trial_retention_control|DROP TRIGGER|ALTER TABLE|UPDATE trial_retention_control)/))await db.prepare(statement).run();
}
before(async()=>{
 if(process.env.ABM_LOCAL_SQLITE==='1'){
  const local=await (await import('./local-d1-sqlite.mjs')).localD1SQLite();db=local.db;runtime={dispose:local.dispose};
 }else{
  runtime=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-22',d1Databases:{DB:'retention-fixture'}}));db=await runtime.getD1Database('DB');
 }
 for(const name of ['0001_access.sql','0002_play_purchases.sql','0003_deletion_requests.sql','0004_deletion_execution.sql'])await migrate(name);
 for(const [i,[start]] of cases.entries())await db.prepare("INSERT INTO trials VALUES (?,'used',?,?)").bind('case-'+i,Date.parse(start),Date.parse(start)+1296000000).run();
 await db.prepare("INSERT INTO trials VALUES ('active','used',?,?)").bind(now-1000,now-1000+1296000000).run();
 for(let i=0;i<60;i++)await db.prepare("INSERT INTO trials(subject,status) VALUES (?,'blocked')").bind('legacy-'+String(i).padStart(3,'0')).run();
 // This is valid under the old schema but outside the date range we can verify.
 await db.prepare("INSERT INTO trials VALUES ('unknown-range','used',253402300800000,253403596800000)").run();
 await db.prepare("INSERT INTO licenses(subject,source,status,permanent) VALUES ('legacy-001','ADMIN_GIFT','active',1),('legacy-002','GOOGLE_PLAY_PURCHASE','active',1)").run();
 await db.prepare("INSERT INTO play_purchases VALUES (?,'legacy-002','fixture','encrypted-fixture','active',0)").bind('a'.repeat(64)).run();
 await db.prepare("INSERT INTO identity_policy(subject,blocked) VALUES ('legacy-003',1)").run();
 await migrate('0005_trial_retention.sql');
 await migrate('0006_trial_retention_cursor.sql');
});
after(async()=>runtime?.dispose());
const rows=async table=>(await db.prepare('SELECT * FROM '+table+' ORDER BY subject').all()).results;

test('six UTC calendar months clamp month ends, leap years and preserve time/milliseconds',async()=>{
 for(const [i,[,end]] of cases.entries()){
  const row=await db.prepare('SELECT retention_until FROM trial_retention_source WHERE subject=?').bind('case-'+i).first();assert.equal(row.retention_until,Date.parse(end));
 }
 for(const subject of ['legacy-000','unknown-range'])assert.equal((await db.prepare('SELECT retention_until FROM trial_retention_source WHERE subject=?').bind(subject).first()).retention_until,0);
});
test('migration fences new enrolment immediately; existing trials stay unchanged and cannot be renewed',async()=>{
 const repository=createD1Repository(db,{allowNewTrials:true});
 const existing=await repository.trialRepository.resolve('active',{activate:true,now});assert.equal(existing.startedAt,now-1000);assert.equal(existing.expiresAt,now-1000+1296000000);
 await assert.rejects(repository.trialRepository.resolve('new-account',{activate:true,now}),/anti-abuse/);
 await assert.rejects(db.prepare("UPDATE trials SET started_at=started_at+1,expires_at=expires_at+1 WHERE subject='active'").run(),/immutable/);
 await assert.rejects(db.prepare("DELETE FROM trials WHERE subject='active'").run(),/unexpired|unclassified/);
 assert.equal(await db.prepare("SELECT * FROM trials WHERE subject='new-account'").first(),null);
});
test('bounded indexed keyset cleanup removes dated/undated legacy history without changing purchases or access data',async()=>{
 const protectedBefore=JSON.stringify(await Promise.all(['licenses','play_purchases','identity_policy'].map(rows)));
 const originalCount=(await rows('trials')).length;
 let calls=0;const budgetDb={withSession:()=>budgetDb,prepare:sql=>db.prepare(sql),batch:statements=>{calls++;assert.equal(statements.length,3);return db.batch(statements);}};
 let previous=originalCount;
 for(let i=0;i<5;i++){
  await cleanTrialHistory(budgetDb,Date.now());const remaining=(await rows('trials')).length;
  assert.ok(previous-remaining<=TRIAL_RETENTION_BATCH);previous=remaining;
 }
 assert.equal(calls,5);assert.deepEqual((await rows('trials')).map(row=>row.subject),['active']);
 const control=await db.prepare('SELECT * FROM trial_retention_control WHERE singleton=1').first();
 assert.equal(control.backfill_complete,1);assert.equal(control.backfill_after,'');assert.equal(control.enrollment_locked,1);
 assert.deepEqual(Object.keys(control).sort(),['backfill_after','backfill_complete','enrollment_locked','singleton']);
 assert.deepEqual((await rows('trial_retention')).map(row=>row.subject),['active']);
 assert.equal(JSON.stringify(await Promise.all(['licenses','play_purchases','identity_policy'].map(rows))),protectedBefore);
 await assert.rejects(db.prepare("UPDATE trial_retention SET retention_until=retention_until+1 WHERE subject='active'").run(),/immutable/);
 await assert.rejects(db.prepare("DELETE FROM trials WHERE subject='active'").run(),/unexpired/);
 await assert.rejects(cleanTrialHistory(db,now+200*86400000),/unexpired/);
 assert.ok(await db.prepare("SELECT * FROM trials WHERE subject='active'").first());
 const plan=(await db.prepare('EXPLAIN QUERY PLAN SELECT subject FROM trial_retention WHERE retention_until<=? ORDER BY retention_until,subject LIMIT 25').bind(now).all()).results;
 assert.ok(plan.some(row=>row.detail.includes('trial_retention_due')));
 const backfillPlan=(await db.prepare('EXPLAIN QUERY PLAN SELECT subject FROM trials WHERE subject>? ORDER BY subject LIMIT 25').bind('legacy-001').all()).results;
 assert.ok(backfillPlan.some(row=>row.detail.includes('INDEX')&&row.detail.includes('subject>')));
 // A purged UID and a recreated UID are both denied, even if NEW_TRIALS is enabled.
 for(const subject of ['case-0','legacy-000','recreated-uid'])await assert.rejects(createD1Repository(db,{allowNewTrials:true}).trialRepository.resolve(subject,{activate:true,now}),/anti-abuse/);
});
test('after-insert classification handles rows behind the cursor and repeated cleanup is idempotent',async()=>{
 await db.prepare("INSERT INTO trials(subject,status) VALUES ('aaa-new-block','blocked')").run();
 assert.equal((await db.prepare("SELECT retention_until FROM trial_retention WHERE subject='aaa-new-block'").first()).retention_until,0);
 await cleanTrialHistory(db,Date.now());await cleanTrialHistory(db,Date.now());
 assert.deepEqual((await rows('trials')).map(row=>row.subject),['active']);
 assert.equal((await db.prepare('SELECT backfill_after FROM trial_retention_control WHERE singleton=1').first()).backfill_after,'');
 await assert.rejects(db.prepare('UPDATE trial_retention_control SET enrollment_locked=0').run());
});
test('cursor migration removes an old completed UID cursor without changing admission or trial data',async()=>{
 let fixture;
 if(process.env.ABM_LOCAL_SQLITE==='1')fixture=await (await import('./local-d1-sqlite.mjs')).localD1SQLite();
 else{
  const engine=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-22',d1Databases:{DB:'old-cursor-fixture'}}));
  fixture={db:await engine.getD1Database('DB'),dispose:()=>engine.dispose()};
 }
 try{
  await fixture.db.prepare('CREATE TABLE trials(subject TEXT PRIMARY KEY)').run();
  await fixture.db.prepare("INSERT INTO trials VALUES ('active')").run();
  await fixture.db.prepare("CREATE TABLE trial_retention_control(singleton INTEGER PRIMARY KEY,enrollment_locked INTEGER NOT NULL CHECK(enrollment_locked=1),backfill_after TEXT NOT NULL)").run();
  await fixture.db.prepare("INSERT INTO trial_retention_control VALUES (1,1,'old-processed-uid')").run();
  const sql=(await readFile(new URL('../migrations/0006_trial_retention_cursor.sql',import.meta.url),'utf8')).replace(/--[^\n]*/g,'').trim();
  for(const statement of sql.split(/(?<=;)\s*(?=UPDATE)/))await fixture.db.prepare(statement).run();
  const control=await fixture.db.prepare('SELECT * FROM trial_retention_control').first();assert.equal(control.backfill_after,'');assert.equal(control.backfill_complete,1);assert.equal(control.enrollment_locked,1);
  assert.equal((await fixture.db.prepare('SELECT * FROM trials').all()).results.length,1);
 }finally{await fixture.dispose();}
});
test('flags default off, no Firebase calls or deletion processing, and scheduling is not activated',async()=>{
 const never={withSession(){throw Error('must not query');}};
 for(const env of [{},{TRIAL_RETENTION_ENABLED:'true'},{TRIAL_RETENTION_ENABLED:'true',TRIAL_RETENTION_BACKEND_VERIFIED:'true'}])assert.deepEqual(await runTrialRetention({...env,DB:never}),{disabled:true});
 const worker=createPrivacyWorker();
 assert.deepEqual(await worker.scheduled({},{}),{disabled:true});
 const result=await worker.scheduled({},{DB:db,TRIAL_RETENTION_ENABLED:'true',TRIAL_RETENTION_BACKEND_VERIFIED:'true',TRIAL_RETENTION_POLICY_APPROVED:'true',DELETION_EXECUTION_ENABLED:'true'});
 assert.ok(Object.hasOwn(result,'removed')); // Retention branch never instantiates Firebase.
 const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(config.vars.DELETION_REQUESTS_ENABLED,'false');assert.equal(config.vars.NEW_TRIALS_ENABLED,'false');assert.equal(config.triggers,undefined);
});
