import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {createPrivacyWorker} from '../privacy-worker.js';
let runtime,db;
before(async()=>{runtime=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-10-22',d1Databases:{DB:'deletion-fixture'}}));db=await runtime.getD1Database('DB');await db.exec(await readFile(new URL('../migrations/0001_access.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../migrations/0003_deletion_requests.sql',import.meta.url),'utf8'));await db.prepare("INSERT INTO trials(subject,status,started_at,expires_at) VALUES ('fictional-a','used',0,1296000000)").run();});
after(async()=>runtime?.dispose());
const now=1800000000000;
const worker=createPrivacyWorker({clock:()=>now,makeVerifier:()=>async token=>{if(!['fictional-a','fictional-b'].includes(token))throw Object.assign(Error(),{status:401});return {uid:token,sub:token,auth_time:now/1000,firebase:{sign_in_provider:'google.com'}};},worker:{fetch:async()=>new Response('unchanged access delegate',{status:418})}});
function call({uid='fictional-a',origin='https://localhost',body={action:'request',confirmation:'request-account-deletion-v1',language:'ro'},enabled=true,path='/account-deletion',raw}={}){return worker.fetch(new Request('https://fixture.invalid'+path,{method:'POST',headers:{Authorization:'Bearer '+uid,Origin:origin,'Content-Type':'application/json'},body:raw??JSON.stringify(body)}),{DB:db,FIREBASE_API_KEY:'fixture',DELETION_REQUESTS_ENABLED:String(enabled),DELETION_WEB_ORIGIN:'https://public.fixture.invalid'});}
test('real D1 intake is idempotent, UID-bound and never mutates trial history',async()=>{
 const first=await(await call()).json(),second=await(await call()).json();assert.equal(first.status,'pending_review');assert.equal(first.deleted,false);assert.equal(first.requestId,second.requestId);
 assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM account_deletion_requests').first()).count,1);
 assert.equal((await(await call({uid:'fictional-b',body:{action:'status'}})).json()).status,'not_requested');
 assert.equal((await call({body:{action:'status',subject:'fictional-a'},uid:'fictional-b'})).status,400);
 assert.equal((await db.prepare("SELECT expires_at FROM trials WHERE subject='fictional-a'").first()).expires_at,1296000000);
});
test('deployment gate, identity, bounded body and dedicated web origin fail closed',async()=>{
 assert.equal((await call({enabled:false})).status,503);assert.equal((await call({uid:'forged'})).status,401);
 assert.equal((await call({origin:'https://attacker.fixture.invalid'})).status,403);assert.equal((await call({origin:'https://public.fixture.invalid',body:{action:'status'}})).status,200);
 assert.equal((await call({raw:'x'.repeat(1025)})).status,413);
 assert.equal((await call({path:'/access',origin:'https://public.fixture.invalid'})).status,418);
});
