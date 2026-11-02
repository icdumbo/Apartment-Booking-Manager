import {privacyCopy,renderPolicy} from '../privacy-content.js';
import {privacySettings as settings,isPrivacyPublicationReady,isDeletionWebReady,publicLegalUrls} from '../privacy-settings.js';
import {createDeletionClient} from '../account-deletion.js';
const root=document.getElementById('legal-content'),title=document.getElementById('legal-title'),nav=document.getElementById('legal-language');
let language=new URL(location.href).searchParams.get('lang')==='en'?'en':'ro',user=null,idToken=null,busy=false,generation=0;
const isDeletion=location.pathname.endsWith('delete-account.html');
const configured=isDeletionWebReady();
function googleSignIn(container,message){
 if(!configured)return;
 const version=++generation;
 const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.referrerPolicy='no-referrer';script.async=true;
 script.onerror=()=>message.textContent=privacyCopy[language].error;
 script.onload=()=>{
  if(version!==generation)return;
  google.accounts.id.initialize({client_id:settings.webClientId,callback:async({credential})=>{
   try{
    const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key='+encodeURIComponent(settings.firebaseApiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postBody:new URLSearchParams({id_token:credential,providerId:'google.com'}).toString(),requestUri:location.origin,returnSecureToken:true}),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();const result=await response.json();if(version!==generation)return;if(typeof result.localId!=='string'||typeof result.idToken!=='string')throw Error();
    user={uid:result.localId};idToken=result.idToken;render();
   }catch{message.textContent=privacyCopy[language].error;}
  }});google.accounts.id.renderButton(container,{type:'standard',theme:'outline',size:'large'});
 };document.head.append(script);
}
function render(){
 const c=privacyCopy[language];document.documentElement.lang=language;nav.replaceChildren();for(const lang of ['ro','en']){const b=document.createElement('button');b.type='button';b.textContent=lang.toUpperCase();b.disabled=busy;b.onclick=()=>{generation++;language=lang;user=null;idToken=null;render();};nav.append(b);}
 const current=new URL(location.href);current.searchParams.set('lang',language);history.replaceState(null,'',current);
 const related=document.querySelector('main>p>a');related.href=(isDeletion?'privacy.html':'delete-account.html')+'?lang='+language;related.textContent=isDeletion?c.title:c.deletion;
 const urls=publicLegalUrls();let canonical=document.querySelector('link[rel=canonical]');if(isPrivacyPublicationReady()&&urls){if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href=urls[isDeletion?'deletion':'privacy'][language];}
 title.textContent=isDeletion?c.deletion:c.title;root.replaceChildren();
 if(!isDeletion){renderPolicy(root,language);return;}
 const scope=document.createElement('p'),notice=document.createElement('p'),message=document.createElement('p');scope.textContent=c.scope;if(!isPrivacyPublicationReady())notice.textContent=c.draft;message.setAttribute('role','status');root.append(scope,notice);
 if(!configured){message.textContent=c.unconfigured;root.append(message);return;}
 const signin=document.createElement('button'),googleContainer=document.createElement('div');signin.type='button';signin.textContent=c.signIn;signin.onclick=()=>{signin.disabled=true;googleSignIn(googleContainer,message);};root.append(signin,googleContainer);
 if(user){
  const form=document.createElement('form'),label=document.createElement('label'),check=document.createElement('input'),submit=document.createElement('button'),status=document.createElement('button');check.type='checkbox';check.style.width='22px';label.append(check,document.createTextNode(c.confirm));submit.type='submit';submit.textContent=c.submit;submit.disabled=true;status.type='button';status.textContent=c.status;form.append(label,submit,status);root.append(form);
  const client=createDeletionClient({endpoint:settings.deletionEndpoint,getUser:()=>user,getIdToken:async()=>idToken,reauthenticate:async()=>{if(!idToken)throw Error('authenticationRequired');}});
  check.onchange=()=>submit.disabled=busy||!check.checked;
  async function run(request){if(busy)return;busy=true;for(const b of nav.querySelectorAll('button'))b.disabled=true;check.disabled=submit.disabled=status.disabled=signin.disabled=true;message.textContent=c.busy;try{const result=await(request?client.request({confirmed:check.checked,language}):client.status());message.textContent=result.status==='pending_review'?c.pending+result.requestId:c.none;}catch(error){message.textContent=error.message==='recentAuthenticationRequired'?c.session:c.error;}finally{busy=false;for(const b of nav.querySelectorAll('button'))b.disabled=false;check.disabled=status.disabled=false;submit.disabled=!check.checked;signin.disabled=false;}}
  form.onsubmit=e=>{e.preventDefault();if(check.checked)run(true);};status.onclick=()=>run(false);
 }
 root.append(message);
}
render();
