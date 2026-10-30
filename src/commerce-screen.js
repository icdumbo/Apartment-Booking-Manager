import {createPlayBilling} from './play-billing.js';
// Commercial controls live in Account and access; existing editors/data paths are untouched.
export function mountCommerce({root,auth,capacitor=globalThis.Capacitor,t,getEntitlement,changed=()=>{}}){
 const native=capacitor?.getPlatform?.()==='android'?capacitor.Plugins:null;
 const billing=createPlayBilling({plugin:native?.BookingBilling,auth:auth.bridge,secure:auth.secure});
 const panel=document.createElement('section'),description=document.createElement('p'),buy=document.createElement('button'),restore=document.createElement('button'),message=document.createElement('p');
 panel.id='commerce-controls';buy.type=restore.type='button';message.setAttribute('role','status');panel.append(description,buy,restore,message);root.append(panel);
 let product=null,busy=false,status='';
 function render(){description.textContent=t('purchaseTerms');buy.textContent=product?t('buyPremium',{price:product.price}):t('purchaseUnavailable');restore.textContent=t('restorePurchase');buy.disabled=busy||!product||getEntitlement().state==='PREMIUM';restore.disabled=busy||!auth.available;message.textContent=status?t(status):'';}
 async function act(operation){if(busy)return;busy=true;status='purchaseVerifying';render();try{
  if(!auth.bridge?.getCurrentUser())await auth.signIn();
  const result=await operation();status=result.status==='verified'?'purchaseVerified':result.status==='pending'?'purchasePending':result.status==='cancelled'?'purchaseCancelled':'purchaseNotFound';changed();
 }catch(error){status=error.message==='purchaseAlreadyOwned'||error.code==='purchaseAlreadyOwned'?'purchaseAlreadyOwned':error.message==='billingUnavailable'||error.code==='billingUnavailable'?'purchaseUnavailable':error.message==='authenticationRequired'?'purchaseSignIn':'purchaseFailed';}finally{busy=false;render();}}
 buy.onclick=()=>act(billing.purchase);restore.onclick=()=>act(billing.restore);
 const privacyPlugin=native?.BookingAds;
 if(privacyPlugin){const privacy=document.createElement('button');privacy.type='button';privacy.dataset.i18n='adsPrivacy';privacy.textContent=t('adsPrivacy');privacy.onclick=()=>privacyPlugin.privacy().catch(()=>{});panel.append(privacy);privacyPlugin.start().catch(()=>{});}
 async function refresh(){product=await billing.product();render();}
 render();return {render,refresh};
}
