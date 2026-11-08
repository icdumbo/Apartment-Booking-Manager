import {createPrivacyWorker} from './privacy-worker.js';

export const STAGING_WORKER='abm-deletion-test';
export const STAGING_DATABASE='abm-deletion-test-d1';
export const PRODUCTION_D1='8b381c2f-aca1-4799-abb6-f02bea37cfe5';
export const isTestProject=project=>typeof project==='string'&&/^abm-delete-test-[a-z0-9](?:[a-z0-9-]{0,12}[a-z0-9])?$/.test(project);

export function isTestOrigin(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&url.origin===value&&url.hostname.startsWith('abm-delete-test-')&&!url.port;
 }catch{return false;}
}
const noAccess={fetch:()=>new Response(null,{status:404})};
const unavailable=()=>new Response(null,{status:503});
export function createDeletionStagingWorker(makeWorker=createPrivacyWorker){
 function configured(env){
  return env.DELETION_STAGE==='isolated-test'&&isTestProject(env.TEST_FIREBASE_PROJECT)&&
   isTestOrigin(env.DELETION_WEB_ORIGIN)&&Boolean(env.DB)&&env.NEW_TRIALS_ENABLED==='false'&&
   env.TRIAL_RETENTION_ENABLED==='false'&&!env.PLAY_PRODUCT_ID&&!env.ACCESS_PRIVATE_KEY;
 }
 return {
  fetch(request,env,context){
   if(new URL(request.url).pathname!=='/account-deletion')return noAccess.fetch();
   if(!configured(env))return unavailable();
   const origin=request.headers.get('Origin');
   if(origin&&origin!==env.DELETION_WEB_ORIGIN)return new Response(null,{status:403});
   return makeWorker({worker:noAccess,project:env.TEST_FIREBASE_PROJECT}).fetch(request,env,context);
  },
  scheduled(controller,env){
   if(!configured(env)||env.DELETION_REQUESTS_ENABLED!=='true'||!env.OWNER_SUBJECT?.trim())return {disabled:true};
   return makeWorker({worker:noAccess,project:env.TEST_FIREBASE_PROJECT}).scheduled(controller,env);
  }
 };
}
export default createDeletionStagingWorker();
