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
