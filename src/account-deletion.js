const CONFIRMATION='request-account-deletion-v1';
export function createDeletionClient({getUser,getIdToken,reauthenticate,endpoint,fetchImpl=globalThis.fetch}){
 const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('deletionUnavailable');
 let busy=false;
 async function call(action,{confirmed=false,language='en'}={}){
  if(busy)throw Error('deletionBusy');const uid=getUser()?.uid;if(!uid)throw Error('authenticationRequired');
  if(action==='request'&&!confirmed)throw Error('confirmationRequired');
  busy=true;
  const same=()=>{if(getUser()?.uid!==uid)throw Error('identityChanged');};
  try{
   if(action==='request')await reauthenticate();same();
   const token=await getIdToken({uid});same();
   const response=await fetchImpl(url.href,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...(action==='request'?{confirmation:CONFIRMATION,language}:{})}),credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
   same();if(!response.ok)throw Error(response.status===401?'recentAuthenticationRequired':'deletionUnavailable');
   const result=await response.json();same();
   if(result.version!==1||result.deleted!==false||!['pending_review','not_requested'].includes(result.status)||result.status==='pending_review'&&(typeof result.requestId!=='string'||!Number.isSafeInteger(result.createdAt))||action==='request'&&result.status!=='pending_review')throw Error('invalidDeletionResult');
   return result;
  }finally{busy=false;}
 }
 return {request:options=>call('request',options),status:()=>call('status')};
}
