import {getLanguage} from './i18n.js?v=0.3.1';
import {privacySettings,isDeletionBackendReady} from './privacy-settings.js';
import {privacyCopy,renderPolicy,renderSupportContact} from './privacy-content.js';
import {createDeletionClient} from './account-deletion.js';
export function mountPrivacy({auth}){
 const menu=document.getElementById('app-menu'),links=document.createElement('nav'),privacy=document.createElement('button'),deletion=document.createElement('button');
 links.id='privacy-actions';links.style.cssText='display:flex;gap:6px;margin-top:8px';privacy.type=deletion.type='button';privacy.id='open-privacy';deletion.id='open-account-deletion';for(const button of [privacy,deletion])button.style.cssText='flex:1 1 auto;min-width:0;min-height:44px;font-size:13px;padding:9px 10px';links.append(privacy,deletion);menu.append(links);
 const dialog=document.createElement('dialog');dialog.id='privacy-dialog';dialog.setAttribute('aria-labelledby','privacy-title');dialog.style.maxHeight='calc(100dvh - 24px)';dialog.style.overflowY='auto';
 const heading=document.createElement('div'),title=document.createElement('h2'),close=document.createElement('button'),body=document.createElement('div');heading.className='dialog-heading';title.id='privacy-title';close.type='button';close.style.minHeight='44px';heading.append(title,close);dialog.append(heading,body);document.body.append(dialog);
 let mode='policy',busy=false,session=auth.bridge?.getCurrentUser()?.uid;
 const client=auth.bridge&&isDeletionBackendReady()?createDeletionClient({endpoint:privacySettings.deletionEndpoint,getUser:()=>auth.bridge.getCurrentUser(),getIdToken:expected=>auth.bridge.getIdToken(expected),reauthenticate:()=>auth.signIn()}):null;
 function labels(){const c=privacyCopy[getLanguage()];privacy.textContent=c.title;deletion.textContent=getLanguage()==='ro'?'Ștergere cont':'Delete account';deletion.hidden=!auth.bridge?.getCurrentUser();close.textContent=c.close;}
 function render(){
  const c=privacyCopy[getLanguage()];title.textContent=mode==='policy'?c.title:c.deletion;labels();body.replaceChildren();
  if(mode==='policy'){renderPolicy(body,getLanguage());return;}
  const scope=document.createElement('p');scope.textContent=c.scope;body.append(scope);renderSupportContact(body,getLanguage(),true);
  if(!client){const notice=document.createElement('p');notice.textContent=c.backendUnavailable;notice.setAttribute('role','status');body.append(notice);return;}
  const form=document.createElement('form'),label=document.createElement('label'),check=document.createElement('input'),submit=document.createElement('button'),status=document.createElement('button'),message=document.createElement('p');
  check.type='checkbox';check.id='deletion-confirm';check.style.width='22px';check.style.minHeight='22px';label.append(check,document.createTextNode(c.confirm));submit.type='submit';submit.textContent=c.submit;submit.disabled=true;status.type='button';status.textContent=c.status;message.id='deletion-message';message.setAttribute('role','status');form.append(label,submit,status,message);body.append(form);
  check.onchange=()=>submit.disabled=busy||!check.checked;
  async function run(request){if(busy)return;busy=true;check.disabled=submit.disabled=status.disabled=true;message.textContent=c.busy;const expected=session;try{
   const result=await(request?client.request({confirmed:check.checked,language:getLanguage()}):client.status());if(expected!==session)return;
   message.textContent=result.status==='pending_review'?c.pending+result.requestId:c.none;
  }catch(error){if(expected!==session)return;message.textContent=['identityChanged','recentAuthenticationRequired'].includes(error.message)?c.session:c.error;}finally{busy=false;check.disabled=status.disabled=false;submit.disabled=!check.checked;}}
  form.onsubmit=e=>{e.preventDefault();if(check.checked)run(true);};status.onclick=()=>run(false);
 }
 privacy.onclick=()=>{mode='policy';render();menu.close();dialog.showModal();dialog.scrollTop=0;};
 deletion.onclick=()=>{if(!auth.bridge?.getCurrentUser())return;mode='deletion';render();menu.close();dialog.showModal();};close.onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 auth.bridge?.onIdTokenChanged(()=>{const next=auth.bridge.getCurrentUser()?.uid;if(next!==session){session=next;if(dialog.open)dialog.close();}labels();});
 let language=getLanguage();new MutationObserver(()=>{if(language===getLanguage())return;language=getLanguage();labels();if(dialog.open&&!busy)render();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});labels();
}
