import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {STAGING_WORKER,STAGING_DATABASE,PRODUCTION_D1,isTestProject,isTestOrigin} from '../backend/deletion-staging-worker.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function stagingConfig({project,accountId,databaseId,origin}){
 if(!isTestProject(project))throw Error('Use a dedicated Firebase project ID starting with abm-delete-test-');
 if(!/^[a-f0-9]{32}$/i.test(accountId??''))throw Error('A Cloudflare test account ID is required');
 if(!uuid.test(databaseId??'')||databaseId.toLowerCase()===PRODUCTION_D1)throw Error('A separate test D1 UUID is required');
 if(!isTestOrigin(origin))throw Error('Use an exact HTTPS origin with an abm-delete-test- hostname');
 return {
  name:STAGING_WORKER,account_id:accountId,main:'../../deletion-staging-worker.js',
  compatibility_date:'2026-10-22',compatibility_flags:['nodejs_compat'],
  workers_dev:true,preview_urls:false,observability:{enabled:false},
  vars:{
   DELETION_STAGE:'isolated-test',TEST_FIREBASE_PROJECT:project,DELETION_WEB_ORIGIN:origin,
   NEW_TRIALS_ENABLED:'false',TRIAL_RETENTION_ENABLED:'false',DELETION_REQUESTS_ENABLED:'false',
   DELETION_EXECUTION_ENABLED:'false',DELETION_BACKEND_VERIFIED:'false',
   DELETION_RETENTION_APPROVED:'false',DELETION_MAINTENANCE_VERIFIED:'false'
  },
  d1_databases:[{binding:'DB',database_name:STAGING_DATABASE,database_id:databaseId,migrations_dir:'../../migrations'}]
 };
}

function webConfig({workerOrigin,firebaseApiKey,webClientId}){
 let url;
 try{url=new URL(workerOrigin);}catch{throw Error('Enter the exact test Worker origin');}
 if(url.protocol!=='https:'||url.origin!==workerOrigin||!/^abm-deletion-test\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname))throw Error('Enter the exact test Worker origin');
 if(!/^AIza[0-9A-Za-z_-]+$/.test(firebaseApiKey??'')||!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(webClientId??''))throw Error('Enter Firebase web API key and Google web OAuth client ID from the test project');
 return {firebaseApiKey,webClientId,deletionEndpoint:workerOrigin+'/account-deletion'};
}

export async function prepareDeletionStaging(settings){
 const config=stagingConfig(settings);
 const web=webConfig(settings);
 const output=resolve(root,'backend','build','deletion-stage');
 await mkdir(resolve(output,'web','legal'),{recursive:true});
 await writeFile(resolve(output,'wrangler.json'),JSON.stringify(config,null,2)+'\n');
 for(const path of ['legal/delete-account.html','legal/privacy.html','legal/public.js','privacy-content.js','account-deletion.js','styles.css']){
  const data=await readFile(resolve(root,'src',path),'utf8');
  const marked=path.endsWith('.html')?data.replace('<main class="shell">','<main class="shell"><p role="note">MEDIU IZOLAT DE TEST / ISOLATED TEST ENVIRONMENT. Folosiți exclusiv conturi fictive / Test accounts only.</p>'):data;
  await writeFile(resolve(output,'web',path),marked);
 }
 await writeFile(resolve(output,'web','privacy-settings.js'),
  'export const privacySettings=Object.freeze('+JSON.stringify(web)+');\n'+
  'export const isPrivacyPublicationReady=()=>false;\n'+
  'export const privacyConfigurationIssues=()=>["stagingOnly","contact"];\n'+
  'export const isDeletionWebReady=()=>true;\n'+
  'export const publicLegalUrls=()=>null;\n');
 return output;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const env=process.env;
  const output=await prepareDeletionStaging({project:env.ABM_TEST_FIREBASE_PROJECT,accountId:env.ABM_TEST_CLOUDFLARE_ACCOUNT,
   databaseId:env.ABM_TEST_D1_ID,origin:env.ABM_TEST_WEB_ORIGIN,workerOrigin:env.ABM_TEST_WORKER_ORIGIN,
   firebaseApiKey:env.ABM_TEST_FIREBASE_WEB_KEY,webClientId:env.ABM_TEST_GOOGLE_WEB_CLIENT});
  console.log('Local test configuration prepared in '+output);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
