import accessWorker from './index.js';
import {createFirebaseVerifier,createCertificateResolver} from './firebase-token.js';
import {createDeletionHandler,createDeletionRepository} from './deletion-requests.js';
import {createDeletionExecutor,createExecutionRepository,deletionExecutionReady} from './deletion-executor.js';
import {createFirebaseDeletionApi} from './firebase-deletion.js';
import {runTrialRetention} from './trial-retention.js';
const resolveKey=createCertificateResolver();
export function createPrivacyWorker({worker=accessWorker,makeVerifier=createFirebaseVerifier,project,clock=Date.now}={}){
 return {async scheduled(controller,env){
  // Separate invocation budget; retention never starts the deletion executor.
  if(env.TRIAL_RETENTION_ENABLED==='true')return runTrialRetention(env,{clock});
  // No cron is configured. Production activation needs a separate reviewed deployment.
  if(!env.DB||!deletionExecutionReady(env))return {disabled:true};
  const firebase=createFirebaseDeletionApi({project,serviceAccount:env.DELETION_FIREBASE_SERVICE_ACCOUNT_JSON,clock});
  return createDeletionExecutor({repository:createExecutionRepository(env.DB),firebase,clock})(env);
 },async fetch(request,env,context){
  if(new URL(request.url).pathname!=='/account-deletion')return worker.fetch(request,env,context);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  const origin=request.headers.get('Origin');
  let webOrigin=null;
  try{const url=new URL(env.DELETION_WEB_ORIGIN);if(url.protocol==='https:'&&url.origin===env.DELETION_WEB_ORIGIN)webOrigin=url.origin;}catch{}
  if(origin&&origin!=='https://localhost'&&origin!==webOrigin)return reply(403,{error:'originNotAllowed'});
  if(origin)headers['Access-Control-Allow-Origin']=origin;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Authorization, Content-Type'}});
  if(request.method!=='POST')return reply(405,{error:'methodNotAllowed'});
  if(env.DELETION_REQUESTS_ENABLED!=='true'||!env.DB)return reply(503,{error:'deletionRequestUnavailable'});
  if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return reply(400,{error:'invalidRequest'});
  let body;
  try{
   const reader=request.body?.getReader();if(!reader)throw Error();const chunks=[];let size=0;
   while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return reply(413,{error:'invalidRequest'});}chunks.push(value);}
   const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
   body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }catch{return reply(400,{error:'invalidRequest'});}
  try{
   const repository=createDeletionRepository(env.DB);
   if(body?.action==='receipt'){
    const result=await createDeletionHandler({repository,clock})({body});
    return reply(result.status,result.body);
   }
   if(!/^Bearer \S+$/.test(request.headers.get('Authorization')||''))return reply(401,{error:'authenticationRequired'});
   if(env.FIREBASE_API_KEY&&env.FIREBASE_WEB_API_KEY&&env.FIREBASE_API_KEY!==env.FIREBASE_WEB_API_KEY)throw Error();
   const apiKey=env.FIREBASE_API_KEY??env.FIREBASE_WEB_API_KEY;if(!apiKey)throw Error();
   const db=env.DB.withSession('first-primary');
   const verifyIdToken=makeVerifier({project,apiKey,resolveKey,clock,readIdentityPolicy:uid=>db.prepare('SELECT blocked,tokens_valid_after FROM identity_policy WHERE subject=?').bind(uid).first()});
   const result=await createDeletionHandler({verifyIdToken,repository,clock})({authorization:request.headers.get('Authorization'),body});
   return reply(result.status,result.body);
  }catch{return reply(503,{error:'deletionRequestUnavailable'});}
 }};
}
export default createPrivacyWorker();
