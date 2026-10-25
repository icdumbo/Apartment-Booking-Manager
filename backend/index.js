import {createTrialHandler} from './trial-handler.js';
import {createProofSigner} from './proof.js';
import {createCertificateResolver,createFirebaseVerifier} from './firebase-token.js';
import {createD1Repository} from './d1-repository.js';
const resolveKey=createCertificateResolver();
// Cached CryptoKey/KeyObject only, never authentication decisions or token contents.
let signingPem,signer;
function proofSigner(pem){if(!pem||typeof pem!=='string')throw Error('Missing signing configuration');if(pem!==signingPem){const next=createProofSigner(pem);signingPem=pem;signer=next;}return signer;}
export function createWorker({makeVerifier=createFirebaseVerifier,makeSigner=proofSigner,clock=Date.now}={}){
 return {async fetch(request,env){
  const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  const origin=request.headers.get('Origin');
  if(origin==='https://localhost')headers['Access-Control-Allow-Origin']=origin;
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  if(new URL(request.url).pathname!=='/access')return reply(404,{error:'notFound'});
  if(origin&&origin!=='https://localhost')return reply(403,{error:'originNotAllowed'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Authorization, Content-Type'}});
  if(request.method!=='POST')return reply(405,{error:'methodNotAllowed'});
  if(!/^Bearer \S+$/.test(request.headers.get('Authorization')||''))return reply(401,{error:'authenticationRequired'});
  if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return reply(400,{error:'invalidRequest'});
  let body;
  try{
   // Enforce actual byte limit, even with absent/forged Content-Length.
   const reader=request.body?.getReader();if(!reader)return reply(400,{error:'invalidRequest'});
   const chunks=[];let length=0;
   while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>2048){await reader.cancel();return reply(413,{error:'invalidRequest'});}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }catch{return reply(400,{error:'invalidRequest'});}
  try{
   // Accept the deployed secret name and retain older installations. Ambiguous
   // configuration fails closed; neither value is logged or sent to the client.
   if(env.FIREBASE_API_KEY&&env.FIREBASE_WEB_API_KEY&&env.FIREBASE_API_KEY!==env.FIREBASE_WEB_API_KEY)throw Error('Conflicting server configuration');
   const apiKey=env.FIREBASE_API_KEY??env.FIREBASE_WEB_API_KEY;
   if(!env.DB||typeof apiKey!=='string'||!apiKey)throw Error('Missing server configuration');
   const repository=createD1Repository(env.DB,{allowNewTrials:env.NEW_TRIALS_ENABLED==='true'});
   const handle=createTrialHandler({clock,verifyIdToken:makeVerifier({apiKey,resolveKey,clock,readIdentityPolicy:repository.readIdentityPolicy}),
    readOwnerSubject:async()=>env.OWNER_SUBJECT||null,
    readVerifiedPurchase:subject=>repository.readLicense(subject,'GOOGLE_PLAY_PURCHASE'),
    readGift:subject=>repository.readLicense(subject,'ADMIN_GIFT'),
    trialRepository:repository.trialRepository,signProof:makeSigner(env.ACCESS_PRIVATE_KEY)});
   const result=await handle({method:'POST',authorization:request.headers.get('Authorization'),body});
   return reply(result.status,result.body);
  }catch{return reply(503,{error:'verificationUnavailable'});}
 }};
}
export default createWorker();
