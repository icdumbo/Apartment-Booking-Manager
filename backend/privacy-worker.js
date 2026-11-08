import accessWorker from './index.js';
import {runTrialRetention} from './trial-retention.js';

export function createPrivacyWorker({worker=accessWorker,clock=Date.now}={}){
 return {
  async scheduled(_controller,env){
   if(env.TRIAL_RETENTION_ENABLED==='true')return runTrialRetention(env,{clock});
   return {disabled:true};
  },
  async fetch(request,env,context){
   const path=new URL(request.url).pathname;
   if(path==='/account-deletion'||path.startsWith('/account-deletion/')){
    return new Response(JSON.stringify({error:'automaticDeletionRetired'}),{
     status:410,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
    });
   }
   return worker.fetch(request,env,context);
  }
 };
}
export default createPrivacyWorker();
