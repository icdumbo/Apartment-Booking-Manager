import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivacyWorker} from '../privacy-worker.js';

test('old automatic deletion requests, status, receipt and preflight are retired despite legacy flags',async()=>{
 const worker=createPrivacyWorker({worker:{fetch:()=>assert.fail('Deletion must not fall through')}});
 const env={DELETION_REQUESTS_ENABLED:'true',DELETION_EXECUTION_ENABLED:'true',get DB(){assert.fail('Deletion must not access D1');}};
 for(const [method,action] of [['POST','request'],['POST','status'],['POST','receipt'],['OPTIONS',null],['GET',null]]){
  const request=new Request('https://worker.fixture.invalid/account-deletion',{method,headers:{Authorization:'Bearer fixture',Origin:'https://localhost','Content-Type':'application/json'},...(action?{body:JSON.stringify({action})}:{})});
  const response=await worker.fetch(request,env);
  assert.equal(response.status,410);
  assert.deepEqual(await response.json(),{error:'automaticDeletionRetired'});
  assert.equal(response.headers.has('Access-Control-Allow-Origin'),false);
 }
 assert.deepEqual(await worker.scheduled({},env),{disabled:true});
});

test('auth and license routes still delegate to the existing access worker',async()=>{
 const env={},context={};
 const worker=createPrivacyWorker({worker:{fetch:(request,e,c)=>{
  assert.equal(e,env);assert.equal(c,context);
  return new Response(new URL(request.url).pathname);
 }}});
 for(const path of ['/access','/purchase'])assert.equal(await (await worker.fetch(new Request('https://fixture.invalid'+path),env,context)).text(),path);
});
