import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../deletion-staging-worker.js';

test('retired staging worker ignores every legacy activation flag and credential',async()=>{
 const env={DELETION_STAGE:'isolated-test',DELETION_REQUESTS_ENABLED:'true',DELETION_EXECUTION_ENABLED:'true',get DB(){assert.fail('No D1 access');}};
 assert.equal((await worker.fetch(new Request('https://fixture.invalid/account-deletion',{method:'POST'}),env)).status,410);
 assert.deepEqual(await worker.scheduled({},env),{disabled:true});
});
