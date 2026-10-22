// Native verifier is the sole source of persistent rights. Never reads a local flag/proof.
export function createSecureAccess({bridge,plugin,endpoint=null,fetchImpl=globalThis.fetch,monotonic=()=>performance.now(),changed=()=>{}}){
 const url=endpoint===null?null:new URL(endpoint);
 if(url&&(url.protocol!=='https:'||url.username||url.password||url.search||url.hash))throw Error('Secure license endpoint required');
 let value=null,anchor=0,generation=0,pending=null;
 const subject=()=>bridge.getCurrentUser()?.uid??null;
 function clearMemory(){generation++;value=null;changed();}
 function getVerifiedAccess(){
  if(!value||value.subject!==subject())return null;
  const remaining=value.remainingMs===undefined?undefined:value.remainingMs-Math.max(0,monotonic()-anchor);
  if(remaining!==undefined&&remaining<=0)return {state:'BASIC'};
  return {...value,...(remaining===undefined?{}:{remainingMs:remaining})};
 }
 async function read(){
  const revision=generation,account=subject();
  if(!plugin||!account){value=null;return null;}
  const requestedAt=monotonic();
  const result=await plugin.getAccess();
  if(revision!==generation||account!==subject())return null;
  value=result.subject===account?result:null;anchor=requestedAt;changed();return getVerifiedAccess();
 }
 async function verify(action='verify'){
  if(!url||!plugin)throw Error('licenseBackendUnavailable');
  const account=subject();if(!account)throw Error('authenticationRequired');
  const revision=generation;
  const {nonce}=await plugin.beginVerification();
  const token=await bridge.getIdToken({uid:account});
  if(revision!==generation||subject()!==account)throw Error('authenticationRequired');
  const response=await fetchImpl(url.href,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,nonce,...(action==='startTrial'?{terms:'trial-15d-v1'}:{})}),credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('verificationUnavailable');
  const data=await response.json();
  if(revision!==generation||subject()!==account)throw Error('authenticationRequired');
  if(data.version!==1||typeof data.proof!=='string')throw Error('invalidLicenseProof');
  // Native checks signature, issuer, audience, Firebase subject, nonce and time.
  await plugin.acceptProof({proof:data.proof});return read();
 }
 return {configured:Boolean(url&&plugin),provider:{requiresVerifiedTrial:true,getVerifiedAccess,getVerifiedEntitlement:()=>null},
  async sessionChanged(){clearMemory();await read();},
  async refresh(){if(pending)return pending;pending=verify().finally(()=>{pending=null;});return pending;},
  async activateTrial(){return verify('startTrial');},
  suspend:clearMemory,read,
  async signOut(){clearMemory();await plugin?.clear();}
 };
}
