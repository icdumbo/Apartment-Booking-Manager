// Native purchase results are receipts, never rights. Only accepted signed proofs grant access.
export function createPlayBilling({plugin,auth,secure}){
 let busy=false;
 const signedIn=()=>auth?.getCurrentUser()?.uid;
 async function operation(run){if(busy)throw Error('billingBusy');if(!plugin||!secure?.configured)throw Error('billingUnavailable');const uid=signedIn();if(!uid)throw Error('authenticationRequired');busy=true;try{return await run(uid);}finally{busy=false;}}
 async function accept(result,uid){
  if(signedIn()!==uid)throw Error('authenticationRequired');
  if(result?.status==='cancelled')return {status:'cancelled'};
  if(result?.status==='pending')return {status:'pending'};
  if(result?.status!=='purchased'||typeof result.purchaseToken!=='string')throw Error('purchaseRejected');
  const proof=await secure.verifyPurchase(result.purchaseToken);
  if(signedIn()!==uid||proof?.state!=='PREMIUM'||proof?.premiumSource!=='GOOGLE_PLAY_PURCHASE')throw Error('purchaseRejected');
  return {status:'verified'};
 }
 return {async product(){if(!plugin)return null;try{const product=await plugin.getProduct();return product?.available===true&&typeof product.price==='string'?product:null;}catch{return null;}},
  purchase:()=>operation(async uid=>accept(await plugin.purchase(),uid)),
  restore:()=>operation(async uid=>{const result=await plugin.restore();if(signedIn()!==uid)throw Error('authenticationRequired');if(!Array.isArray(result?.purchases))throw Error('purchaseRejected');let found=false,pending=false;for(const item of result.purchases){const status=await accept(item,uid);found||=status.status==='verified';pending||=status.status==='pending';}if(!found)await secure.refresh();return {status:found?'verified':pending?'pending':'notFound'};})};
}
