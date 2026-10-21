// Authorization + validation only. No writer, endpoint or issuance is implemented.
// isAuthorizedAdmin must consult server-owned roles, never client body/UID flags.
export async function prepareGiftOperation({token,operation}, {verifyIdToken,isAuthorizedAdmin,clock=Date.now}){
 const claims=await verifyIdToken(token,true);
 if(typeof claims?.uid!=='string'||!claims.uid||claims.sub!==claims.uid||!await isAuthorizedAdmin(claims.uid))throw Error('adminRequired');
 if(!Number.isFinite(claims.auth_time)||clock()-claims.auth_time*1000>5*60000||claims.auth_time*1000>clock())throw Error('recentAuthenticationRequired');
 if(!['grant','revoke'].includes(operation?.kind)||typeof operation.targetSubject!=='string'||!operation.targetSubject.trim())throw Error('invalidGiftOperation');
 if(operation.kind==='grant'&&!(operation.permanent===true||(operation.permanent===false&&Number.isFinite(operation.expiresAt)&&operation.expiresAt>clock())))throw Error('invalidGiftDuration');
 return Object.freeze({actor:claims.uid,targetSubject:operation.targetSubject,kind:operation.kind,...(operation.kind==='grant'?{permanent:operation.permanent,...(operation.permanent?{}:{expiresAt:operation.expiresAt})}:{})});
}
