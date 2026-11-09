import {getLanguage} from './i18n.js?v=0.3.1';
import {privacySettings} from './privacy-settings.js';
import {privacyCopy,renderPolicy} from './privacy-content.js';
import {eraseLocalBusinessData} from './local-data-deletion.js';
import {renderDeletionRequest} from './account-deletion.js';

export function mountPrivacy({auth}){
 const menu=document.getElementById('app-menu');
 const links=document.createElement('nav');
 links.id='privacy-actions';
 links.style.cssText='display:flex;gap:6px;margin-top:8px';
 const privacy=document.createElement('button'),deletion=document.createElement('button');
 privacy.type=deletion.type='button';
 privacy.id='open-privacy';deletion.id='open-account-deletion';
 for(const button of [privacy,deletion])button.style.cssText='flex:1 1 auto;min-height:44px;padding:9px 10px';
 links.append(privacy);menu.append(links);
 document.getElementById('menu-account-content').append(deletion);
 const dialog=document.createElement('dialog'),heading=document.createElement('div'),title=document.createElement('h2');
 const close=document.createElement('button'),body=document.createElement('div');
 dialog.id='privacy-dialog';dialog.setAttribute('aria-labelledby','privacy-title');dialog.style.cssText='max-height:calc(100dvh - 24px);overflow-y:auto';
 heading.className='dialog-heading';title.id='privacy-title';close.type='button';close.style.minHeight='44px';
 heading.append(title,close);dialog.append(heading,body);document.body.append(dialog);
 const allowGuest=!(globalThis.Capacitor?.isNativePlatform?.() ?? (globalThis.Capacitor?.getPlatform?.()==='android'));
 let mode='policy',busy=false;
 function labels(){
  const copy=privacyCopy[getLanguage()];
  privacy.textContent=copy.title;deletion.textContent=copy.deletion;
  deletion.hidden=!allowGuest&&!auth.bridge?.getCurrentUser();close.textContent=copy.close;
 }
 function render(){
  const copy=privacyCopy[getLanguage()];
  title.textContent=mode==='policy'?copy.title:copy.deletion;
  body.replaceChildren();labels();
  if(mode==='deletion'){
   renderDeletionRequest(body,privacySettings.contact,copy,{enterEmail:allowGuest});
   return;
  }
  renderPolicy(body,getLanguage());
  // Existing local-only operation remains separate from requesting account deletion.
  const local=document.createElement('button');local.type='button';local.textContent=copy.eraseLocal;
  const status=document.createElement('p');status.setAttribute('aria-live','polite');
  local.onclick=async()=>{
   if(busy||!confirm(copy.eraseLocalConfirm))return;
   busy=true;local.disabled=true;
   try{await eraseLocalBusinessData();location.reload();}
   catch{status.textContent=copy.localEraseError;}
   finally{busy=false;local.disabled=false;}
  };
  body.append(local,status);
 }
 function open(next){
  mode=next;render();menu.close();dialog.showModal();dialog.scrollTop=0;
 }
 privacy.onclick=()=>open('policy');
 deletion.onclick=()=>{if(allowGuest||auth.bridge?.getCurrentUser())open('deletion');};
 close.onclick=()=>{if(!busy)dialog.close();};
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 let subject=auth.bridge?.getCurrentUser()?.uid,language=getLanguage();
 auth.bridge?.onIdTokenChanged(()=>{
  const next=auth.bridge.getCurrentUser()?.uid;
  if(next!==subject&&mode==='deletion'&&dialog.open)dialog.close();
  subject=next;labels();
 });
 new MutationObserver(()=>{
  if(language===getLanguage())return;
  language=getLanguage();labels();if(dialog.open&&!busy)render();
 }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 labels();
}
