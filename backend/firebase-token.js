import {importX509,jwtVerify} from 'jose';
export const FIREBASE_PROJECT='apartment-booking-manage-2d218';
export const CERTIFICATE_URL='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const unavailable=()=>Object.assign(new Error('authenticationVerificationUnavailable'),{status:503});
const rejected=()=>Object.assign(new Error('invalidAuthentication'),{status:401});
// Cache only Google's public signing keys. Never caches tokens or user/revocation results.
export function createCertificateResolver({fetchImpl=fetch,clock=Date.now,importCertificate=importX509}={}){
 let keys=new Map(),expires=0,pending=null;
 return async header=>{
  if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid||header.kid.length>256)throw rejected();
  if(clock()>=expires){
   if(!pending)pending=(async()=>{
    let response;try{response=await fetchImpl(CERTIFICATE_URL,{redirect:'manual',signal:AbortSignal.timeout(5000)});}catch{throw unavailable();}
    if(!response.ok)throw unavailable();
    let certificates;try{certificates=await response.json();}catch{throw unavailable();}
    if(!certificates||typeof certificates!=='object'||Array.isArray(certificates)||Object.keys(certificates).length>20)throw unavailable();
    const imported=new Map();
    try{for(const [kid,pem] of Object.entries(certificates)){if(typeof pem!=='string'||pem.length>20000)throw Error();imported.set(kid,await importCertificate(pem,'RS256'));}}catch{throw unavailable();}
    if(!imported.size)throw unavailable();
    const maxAge=Number(/(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get('cache-control')||'')?.[1]??0);
    const age=Number(response.headers.get('age')||0);
    keys=imported;expires=clock()+Math.max(0,Math.min(86400,maxAge)-(Number.isFinite(age)?age:0))*1000;
   })().finally(()=>{pending=null;});
   await pending;
  }
  // Unknown kids cannot cause unlimited outbound requests during a valid cache window.
  if(!keys.has(header.kid))throw rejected();
  return keys.get(header.kid);
 };
}
export function createFirebaseVerifier({apiKey,resolveKey=createCertificateResolver(),fetchImpl=fetch,clock=Date.now,readIdentityPolicy=async()=>null}){
 return async(token,checkRevoked=true)=>{
  if(typeof token!=='string'||token.length>16384)throw rejected();
  let payload;
  try{({payload}=await jwtVerify(token,resolveKey,{algorithms:['RS256'],issuer:`https://securetoken.google.com/${FIREBASE_PROJECT}`,audience:FIREBASE_PROJECT,currentDate:new Date(clock()),clockTolerance:0,requiredClaims:['exp','iat','sub','auth_time']}));}
  catch(error){if(error.status===503)throw error;throw rejected();}
  const now=Math.floor(clock()/1000);
  if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128||payload.aud!==FIREBASE_PROJECT||!Number.isSafeInteger(payload.exp)||!Number.isSafeInteger(payload.iat)||!Number.isSafeInteger(payload.auth_time)||payload.auth_time<0||payload.iat>now||payload.auth_time>now||payload.auth_time>payload.iat||payload.firebase?.sign_in_provider!=='google.com'||payload.firebase?.tenant!==undefined)throw rejected();
  if(checkRevoked){
   if(typeof apiKey!=='string'||!apiKey)throw unavailable();
   // Firebase Auth REST end-user lookup: no service-account key, Functions or Blaze.
   let response;
   try{response=await fetchImpl('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),redirect:'manual',signal:AbortSignal.timeout(5000)});}catch{throw unavailable();}
   let data;try{data=await response.json();}catch{throw unavailable();}
   if(!response.ok){if(['INVALID_ID_TOKEN','TOKEN_EXPIRED','USER_DISABLED','USER_NOT_FOUND','CREDENTIAL_TOO_OLD_LOGIN_AGAIN'].includes(data.error?.message))throw rejected();throw unavailable();}
   const user=data.users?.length===1?data.users[0]:null;
   if(!user||user.localId!==payload.sub||user.disabled===true)throw rejected();
   if(typeof user.validSince!=='string'||!/^\d+$/.test(user.validSince)||!Number.isSafeInteger(Number(user.validSince)))throw unavailable();
   if(payload.auth_time<Number(user.validSince))throw rejected();
   let policy;try{policy=await readIdentityPolicy(payload.sub);}catch{throw unavailable();}
   if(policy&&(policy.blocked===1||payload.auth_time<policy.tokens_valid_after))throw rejected();
  }
  return {...payload,uid:payload.sub};
 };
}
