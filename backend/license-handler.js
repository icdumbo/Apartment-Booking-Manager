// Pure backend design scaffold. No Firebase initialization, network listener or deployment.
// verifyIdToken must be Firebase Admin Auth.verifyIdToken(token, true), configured
// for the intended project. Repository/config adapters must be server-only.
export function createLicenseHandler({verifyIdToken,readOwnerSubject,readVerifiedPurchase,clock=Date.now}){
 return async function handle({method,authorization}){
  const reply=(status,body)=>({status,headers:{'Cache-Control':'no-store'},body});
  if(method!=='POST')return reply(405,{error:'methodNotAllowed'});
  const match=typeof authorization==='string'&&/^Bearer (\S+)$/.exec(authorization);
  if(!match)return reply(401,{error:'authenticationRequired'});
  let claims;
  try{claims=await verifyIdToken(match[1],true);}catch{return reply(401,{error:'invalidAuthentication'});}
  if(typeof claims?.uid!=='string'||!claims.uid||claims.sub!==claims.uid||claims.firebase?.sign_in_provider!=='google.com')return reply(401,{error:'invalidAuthentication'});
  // Only the validated Firebase token supplies identity. Client body/UID is unused.
  const subject=claims.uid;
  try{
   const owner=await readOwnerSubject();
   let source=null;
   if(typeof owner==='string'&&owner.length>0&&owner===subject)source='OWNER_GRANT';
   else{
    const purchase=await readVerifiedPurchase(subject);
    if(purchase?.subject===subject&&purchase.status==='active'&&purchase.permanent===true)source='GOOGLE_PLAY_PURCHASE';
   }
   return reply(200,{version:1,subject,entitlement:source?{source,permanent:true,verifiedUntil:clock()+5*60000}:null});
  }catch{return reply(503,{error:'verificationUnavailable'});}
 };
}
