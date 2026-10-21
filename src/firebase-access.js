import {createPremiumProvider,PREMIUM_SOURCES} from './access.js';

// Optional, dependency-injected Firebase/native bridge. Not imported by app.js.
// The real bridge must exchange the Google credential with Firebase Authentication.
export function createFirebaseAccess({authBridge,endpoint,fetchImpl=globalThis.fetch,clock=Date.now}){
 const url=new URL(endpoint);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('Secure license endpoint required');
 const subject=()=>authBridge.getCurrentUser()?.uid??null;
 const provider=createPremiumProvider({clock,getAuthenticatedSubject:subject,async verifyAccess({subject:expected}){
  const user=authBridge.getCurrentUser();
  if(!user||user.uid!==expected)throw new Error('authenticationRequired');
  const token=await authBridge.getIdToken(user);
  if(typeof token!=='string'||!token||subject()!==expected)throw new Error('authenticationRequired');
  const response=await fetchImpl(url.href,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('verificationUnavailable');
  const data=await response.json();
  if(data?.version!==1||data.subject!==expected)throw new Error('invalidLicenseResponse');
  if(data.entitlement===null)return null;
  const grant=data.entitlement;
  if(grant?.permanent!==true||!Object.values(PREMIUM_SOURCES).includes(grant.source)||!Number.isFinite(grant.verifiedUntil)||grant.verifiedUntil<=clock())throw new Error('invalidLicenseResponse');
  return {subject:expected,source:grant.source,permanent:true,verifiedUntil:grant.verifiedUntil};
 }});
 let unsubscribe=null;
 return Object.freeze({provider,
  // Call explicitly in the future composition root, never to gate BASIC startup.
  start(){if(!unsubscribe)unsubscribe=authBridge.onIdTokenChanged(()=>{provider.clear();});},
  async signInWithGoogle(){provider.clear();await authBridge.signInWithGoogle();return provider.refresh();},
  async signOut(){provider.clear();await authBridge.signOut();},
  dispose(){provider.clear();unsubscribe?.();unsubscribe=null;}
 });
}
