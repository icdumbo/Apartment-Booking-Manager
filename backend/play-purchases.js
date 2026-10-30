import {createHash,createPrivateKey,sign,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
export const PLAY_PACKAGE='ro.icdapps.apartmentbookingmanager';
export const purchaseAccount=subject=>createHash('sha256').update('ABM:firebase:'+subject).digest('hex');
const unavailable=()=>Object.assign(Error('purchaseVerificationUnavailable'),{status:503});
const rejected=()=>Object.assign(Error('purchaseRejected'),{status:409});
export function createTokenVault(encodedKey){
 const key=Buffer.from(encodedKey??'','base64');if(key.length!==32)throw unavailable();
 return {seal(token,subject){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(subject));return [iv.toString('base64url'),Buffer.concat([cipher.update(token,'utf8'),cipher.final()]).toString('base64url'),cipher.getAuthTag().toString('base64url')].join('.');},
  open(value,subject){try{const [iv,body,tag]=value.split('.');const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));cipher.setAAD(Buffer.from(subject));cipher.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([cipher.update(Buffer.from(body,'base64url')),cipher.final()]).toString('utf8');}catch{throw unavailable();}}};
}
export function createPlayApi({serviceAccount,fetchImpl=fetch,clock=Date.now}){
 let cached=null,expires=0,pending;
 async function accessToken(){
  if(cached&&clock()<expires)return cached;
  if(!pending)pending=(async()=>{try{
   const account=JSON.parse(serviceAccount),now=Math.floor(clock()/1000);
   if(account.type!=='service_account'||typeof account.client_email!=='string'||typeof account.private_key!=='string')throw unavailable();
   const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
   const payload=Buffer.from(JSON.stringify({iss:account.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})).toString('base64url');
   const unsigned=header+'.'+payload,assertion=unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),createPrivateKey(account.private_key)).toString('base64url');
   const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),redirect:'error',signal:AbortSignal.timeout(10000)});
   const data=await response.json();if(!response.ok||typeof data.access_token!=='string'||!Number.isFinite(data.expires_in)||data.expires_in<=60)throw unavailable();
   cached=data.access_token;expires=clock()+(Math.min(data.expires_in,3600)-60)*1000;return cached;
  }catch{throw unavailable();}})().finally(()=>{pending=null;});return pending;
 }
 async function request(product,token,ack=false){try{
  const url='https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+PLAY_PACKAGE+'/purchases/products/'+encodeURIComponent(product)+'/tokens/'+encodeURIComponent(token)+(ack?':acknowledge':'');
  const response=await fetchImpl(url,{method:ack?'POST':'GET',headers:{Authorization:'Bearer '+await accessToken(),...(ack?{'Content-Type':'application/json'}:{})},...(ack?{body:'{}'}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!ack&&[404,410].includes(response.status))return null;
  if(!response.ok)throw unavailable();return ack?true:await response.json();
 }catch{throw unavailable();}}
 return {get:(product,token)=>request(product,token),acknowledge:(product,token)=>request(product,token,true)};
}
export function createPlayPurchases({api,repository,vault,productId,allowTestPurchases=false,clock=Date.now}){
 if(typeof productId!=='string'||!productId||productId.length>128)throw unavailable();
 async function validate(subject,token,{restoring=false}={}){
  if(typeof token!=='string'||token.length<1||token.length>4096||/[\s\x00-\x1f]/.test(token))throw rejected();
  const hash=createHash('sha256').update(token).digest('hex'),purchase=await api.get(productId,token);
  if(!purchase||purchase.purchaseState!==0){if(restoring)await repository.revoke(hash,subject);throw rejected();}
  if(purchase.obfuscatedExternalAccountId!==purchaseAccount(subject)||purchase.consumptionState!==0||(purchase.quantity??1)!==1||(!allowTestPurchases&&purchase.purchaseType===0)||![0,1].includes(purchase.acknowledgementState))throw rejected();
  // Reserve ownership atomically before acknowledging. A receipt cannot move accounts.
  await repository.reserve({hash,subject,productId,encryptedToken:vault.seal(token,subject)});
  if(purchase.acknowledgementState===0)await api.acknowledge(productId,token);
  await repository.activate(hash,subject,clock());
  return {subject,status:'active',permanent:true};
 }
 return {verifyPurchase:(subject,token)=>validate(subject,token),async readVerifiedPurchase(subject){
  const rows=await repository.list(subject);let active=null;
  for(const row of rows){try{if(row.productId!==productId)throw unavailable();active=await validate(subject,vault.open(row.encryptedToken,subject),{restoring:true});}catch(error){if(error.status!==409)throw unavailable();}}
  return active;
 }};
}
export function createPurchaseHandler({verifyIdToken,purchases,signProof,clock=Date.now}){
 return async({method,authorization,body})=>{
  const reply=(status,body)=>({status,body});
  if(method!=='POST')return reply(405,{error:'methodNotAllowed'});
  const bearer=typeof authorization==='string'&&/^Bearer (\S+)$/.exec(authorization);if(!bearer)return reply(401,{error:'authenticationRequired'});
  try{
   const c=await verifyIdToken(bearer[1],true);if(!c?.uid||c.uid!==c.sub||c.firebase?.sign_in_provider!=='google.com')return reply(401,{error:'invalidAuthentication'});
   if(!body||body.action!=='verifyPurchase'||Object.keys(body).some(k=>!['action','nonce','purchaseToken'].includes(k))||typeof body.nonce!=='string'||!/^[-A-Za-z0-9_]{32,128}$/.test(body.nonce))return reply(400,{error:'invalidRequest'});
   await purchases.verifyPurchase(c.uid,body.purchaseToken);
   return reply(200,{version:1,proof:await signProof({version:1,subject:c.uid,state:'PREMIUM',source:'GOOGLE_PLAY_PURCHASE',startedAt:null,expiresAt:null,issuedAt:clock(),nonce:body.nonce})});
  }catch(error){return reply([401,409].includes(error.status)?error.status:503,{error:error.status===401?'invalidAuthentication':error.status===409?'purchaseRejected':'verificationUnavailable'});}
 };
}
