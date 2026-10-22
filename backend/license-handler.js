// Shared license resolver. verifyIdToken must validate Google/Firebase signatures,
// claims and revocation/account state for the intended project. Adapters are server-only.
export function createLicenseHandler({verifyIdToken,readOwnerSubject,readVerifiedPurchase,readGift=async()=>null,clock=Date.now}){
 return async function handle({method,authorization}){
  const reply=(status,body)=>({status,headers:{'Cache-Control':'no-store'},body});
  if(method!=='POST')return reply(405,{error:'methodNotAllowed'});
  const match=typeof authorization==='string'&&/^Bearer (\S+)$/.exec(authorization);
  if(!match)return reply(401,{error:'authenticationRequired'});
  let claims;
  try{claims=await verifyIdToken(match[1],true);}catch(error){return error.status===503?reply(503,{error:'verificationUnavailable'}):reply(401,{error:'invalidAuthentication'});}
  if(typeof claims?.uid!=='string'||!claims.uid||claims.sub!==claims.uid||claims.firebase?.sign_in_provider!=='google.com')return reply(401,{error:'invalidAuthentication'});
  // Only the validated Firebase token supplies identity. Client body/UID is unused.
  const subject=claims.uid;
  try{
   const owner=await readOwnerSubject();
   let source=null,permanent=true,expiresAt;
   if(typeof owner==='string'&&owner.length>0&&owner===subject)source='OWNER_GRANT';
   else{
    const purchase=await readVerifiedPurchase(subject);
    if(purchase?.subject===subject&&purchase.status==='active'&&purchase.permanent===true)source='GOOGLE_PLAY_PURCHASE';
    else {
     const gift=await readGift(subject);
     if(gift?.subject===subject&&gift.status==='active'&&(gift.permanent===true||(gift.permanent===false&&Number.isFinite(gift.expiresAt)&&gift.expiresAt>clock()))){source='ADMIN_GIFT';permanent=gift.permanent;expiresAt=gift.expiresAt;}
    }
   }
   return reply(200,{version:1,subject,entitlement:source?{source,permanent,verifiedUntil:permanent?clock()+5*60000:Math.min(clock()+5*60000,expiresAt),...(permanent?{}:{expiresAt})}:null});
  }catch{return reply(503,{error:'verificationUnavailable'});}
 };
}
