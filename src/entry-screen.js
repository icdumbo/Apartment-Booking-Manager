// A presentation preference only. This flag never authenticates or grants access.
export const ENTRY_KEY='apartment-booking-manager:welcome:v1';
export function shouldShowWelcome({native,hasData,signedIn,dismissed}){
 return Boolean(native&&!hasData&&!signedIn&&!dismissed);
}
export function createEntryScreen({auth,hasData,storage=globalThis.localStorage,t,root=document.getElementById('entry-screen')}){
 const $=id=>root.querySelector('#'+id);
 let busy=false,fromWelcome=false;
 const remembered=()=>{try{return storage.getItem(ENTRY_KEY)==='dismissed';}catch{return false;}};
 function remember(){try{storage.setItem(ENTRY_KEY,'dismissed');}catch{/* BASIC is still reachable if preferences cannot be saved. */}}
 function message(key=''){const el=$('entry-message');if(key)el.dataset.i18n=key;else delete el.dataset.i18n;el.textContent=key?t(key):'';}
 function enter(){remember();root.close();}
 function show(view){
  root.dataset.view=view;
  $('entry-welcome').hidden=view!=='welcome';$('entry-login').hidden=view!=='login';
  $('entry-back').hidden=view!=='login';
  const connected=Boolean(auth.available&&auth.bridge.getCurrentUser());
  $('entry-google').hidden=connected;$('entry-connected').hidden=!connected;
  $('entry-google').disabled=!auth.available;
  $('entry-login-description').hidden=connected;$('entry-login-terms').hidden=connected;
  message(!auth.available&&view==='login'?'entryAndroidOnly':'');
  if(!root.open)root.showModal();
  (view==='welcome'?$('entry-start'):$('entry-basic')).focus({preventScroll:true});
 }
 $('entry-start').onclick=$('entry-basic').onclick=$('entry-connected').onclick=enter;
 $('entry-to-login').onclick=()=>{fromWelcome=true;show('login');};
 $('entry-back').onclick=()=>{if(busy)return;if(fromWelcome)show('welcome');else enter();};
 root.addEventListener('cancel',event=>{event.preventDefault();if(busy)return;if(root.dataset.view==='login'&&fromWelcome)show('welcome');else enter();});
 $('entry-google').onclick=async()=>{
  if(busy||!auth.available)return;
  if(globalThis.navigator?.onLine===false){message('entryOffline');return;}
  busy=true;for(const id of ['entry-google','entry-basic','entry-back'])$(id).disabled=true;
  message('authPending');
  try{
   // Reuse the native Google/Firebase flow. This never starts a trial or purchase.
   await auth.signIn();
   if(!auth.bridge.getCurrentUser())throw Error('authenticationRequired');
   enter();
  }catch(error){message(error.code==='authCancelled'?'authCancelled':'authError');}
  finally{busy=false;for(const id of ['entry-google','entry-basic','entry-back'])$(id).disabled=false;}
 };
 return {
  start(){
   if(shouldShowWelcome({native:auth.available,hasData:hasData(),signedIn:Boolean(auth.available&&auth.bridge.getCurrentUser()),dismissed:remembered()})){fromWelcome=true;show('welcome');}
   else if(auth.available)remember();
  },
  login(){fromWelcome=false;show('login');}
 };
}
