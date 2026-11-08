import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {SignJWT} from 'jose';
import {FIREBASE_PROJECT,createFirebaseVerifier} from '../firebase-token.js';
import {createFirebaseDeletionApi} from '../firebase-deletion.js';
import {createDeletionStagingWorker,PRODUCTION_D1} from '../deletion-staging-worker.js';
import {stagingConfig} from '../../scripts/prepare-deletion-staging.mjs';

const fixture={project:'abm-delete-test-fixture',accountId:'a'.repeat(32),databaseId:'00000000-0000-4000-8000-000000000001',origin:'https://abm-delete-test-fixture.example.invalid'};

test('configuration refuses production IDs and packages only isolated, disabled resources',()=>{
 const config=stagingConfig(fixture);
 assert.equal(config.name,'abm-deletion-test');
 assert.equal(config.d1_databases[0].database_name,'abm-deletion-test-d1');
 assert.equal(config.d1_databases[0].migrations_dir,'../../migrations');
 assert.equal(config.vars.DELETION_REQUESTS_ENABLED,'false');
 assert.equal(config.vars.DELETION_EXECUTION_ENABLED,'false');
 assert.equal(config.triggers,undefined);
 for(const change of [{project:FIREBASE_PROJECT},{databaseId:PRODUCTION_D1.toUpperCase()},{origin:'https://icdumbo.github.io'},{accountId:''}]){
  assert.throws(()=>stagingConfig({...fixture,...change}));
 }
});

test('test entry point has no commerce routes and refuses production credentials and unknown OWNER fixture',async()=>{
 const config=stagingConfig(fixture);
 let calls=0;
 const worker=createDeletionStagingWorker(({project})=>{
  assert.equal(project,fixture.project);calls++;
  return {fetch:()=>new Response(null,{status:204}),scheduled:()=>({test:true})};
 });
 const env={...config.vars,DB:{}};
 const request=(path,origin=fixture.origin)=>new Request('https://fixture.invalid'+path,{headers:{Origin:origin}});
 for(const path of ['/access','/purchase'])assert.equal((await worker.fetch(request(path),env)).status,404);
 assert.equal((await worker.fetch(request('/account-deletion','https://localhost'),env)).status,403);
 for(const extra of [{TEST_FIREBASE_PROJECT:FIREBASE_PROJECT},{PLAY_PRODUCT_ID:'fixture'},{ACCESS_PRIVATE_KEY:'fixture'},{NEW_TRIALS_ENABLED:'true'}]){
  assert.equal((await worker.fetch(request('/account-deletion'),{...env,...extra})).status,503);
 }
 assert.deepEqual(await worker.scheduled({},env),{disabled:true});
 assert.deepEqual(await worker.scheduled({},{...env,DELETION_REQUESTS_ENABLED:'true'}),{disabled:true});
 assert.equal(calls,0);
 assert.equal((await worker.fetch(request('/account-deletion'),env)).status,204);
 assert.deepEqual(await worker.scheduled({},{...env,DELETION_REQUESTS_ENABLED:'true',OWNER_SUBJECT:'fictional-owner'}),{test:true});
});

test('test verifier accepts only its own Firebase issuer/audience and rejects mismatched deletion credentials',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const now=1800000000000;
 const issue=(iss,aud)=>new SignJWT({firebase:{sign_in_provider:'google.com'},auth_time:now/1000})
  .setProtectedHeader({alg:'RS256'}).setSubject('fictional-a').setIssuer('https://securetoken.google.com/'+iss)
  .setAudience(aud).setIssuedAt(now/1000).setExpirationTime(now/1000+300).sign(privateKey);
 const verify=createFirebaseVerifier({project:fixture.project,resolveKey:async()=>publicKey,clock:()=>now});
 assert.equal((await verify(await issue(fixture.project,fixture.project),false)).uid,'fictional-a');
 for(const [iss,aud] of [[FIREBASE_PROJECT,FIREBASE_PROJECT],[fixture.project,FIREBASE_PROJECT],[FIREBASE_PROJECT,fixture.project]]){
  await assert.rejects(verify(await issue(iss,aud),false),/invalidAuthentication/);
 }
 assert.throws(()=>createFirebaseDeletionApi({project:fixture.project,serviceAccount:JSON.stringify({
  type:'service_account',project_id:FIREBASE_PROJECT,private_key:'fixture',client_email:'fixture@example.invalid'
 })}),/Deletion credential unavailable/);
});
