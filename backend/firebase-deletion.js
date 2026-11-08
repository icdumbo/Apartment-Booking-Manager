import {createPrivateKey,sign} from 'node:crypto';
import {FIREBASE_PROJECT} from './firebase-token.js';

// Dedicated server-only credential, never the Google Play service account.
export function createFirebaseDeletionApi({project=FIREBASE_PROJECT,serviceAccount,fetchImpl=fetch,clock=Date.now}){
 let account;
 try{account=JSON.parse(serviceAccount);}catch{throw Error('Deletion credential unavailable');}
 if(!account||account.type!=='service_account'||account.project_id!==project||typeof account.private_key!=='string'||typeof account.client_email!=='string')throw Error('Deletion credential unavailable');
 let cached,expires=0;
 async function accessToken(){
  if(cached&&clock()<expires)return cached;
  const now=Math.floor(clock()/1000);
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:account.client_email,scope:'https://www.googleapis.com/auth/identitytoolkit',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const assertion=unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),createPrivateKey(account.private_key)).toString('base64url');
  const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),redirect:'error',signal:AbortSignal.timeout(10000)});
  const data=await response.json();
  if(!response.ok||typeof data.access_token!=='string'||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<=60)throw Error('Deletion authorization unavailable');
  cached=data.access_token;expires=clock()+(Math.min(data.expires_in,3600)-60)*1000;return cached;
 }
 async function call(action,uid){
  if(typeof uid!=='string'||!uid||uid.length>128)throw Error('Invalid identity');
  const response=await fetchImpl('https://identitytoolkit.googleapis.com/v1/projects/'+project+'/accounts:'+action,{method:'POST',headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json'},body:JSON.stringify({localId:action==='lookup'?[uid]:uid}),redirect:'error',signal:AbortSignal.timeout(10000)});
  const data=await response.json();
  if(!response.ok){if(response.status===400&&data.error?.message==='USER_NOT_FOUND')return null;throw Error('Deletion provider unavailable');}
  if(!data||typeof data!=='object'||Array.isArray(data)||data.error)throw Error('Deletion provider response invalid');
  return data;
 }
 return {
  async lookup(uid){
   const result=await call('lookup',uid);
   if(result===null||!Object.keys(result).length)return null;
   if(!Array.isArray(result.users))throw Error('Deletion lookup invalid');
   if(!result.users.length)return null;
   if(result.users.length!==1)throw Error('Ambiguous identity');
   const user=result.users[0];
   return {uid:user.localId,createdAt:typeof user.createdAt==='string'&&/^\d+$/.test(user.createdAt)?Number(user.createdAt):NaN,provider:user.providerUserInfo?.length===1?user.providerUserInfo[0].providerId:null};
  },
  delete:uid=>call('delete',uid)
 };
}
