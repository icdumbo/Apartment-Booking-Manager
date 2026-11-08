import {privacyCopy,renderPolicy} from '../privacy-content.js';
import {privacySettings,isPrivacyPublicationReady,publicLegalUrls} from '../privacy-settings.js';
import {renderDeletionRequest} from '../account-deletion.js';

const root=document.getElementById('legal-content');
const title=document.getElementById('legal-title');
const nav=document.getElementById('legal-language');
const isDeletion=location.pathname.endsWith('delete-account.html');
let language=new URL(location.href).searchParams.get('lang')==='en'?'en':'ro';

function render(){
 const copy=privacyCopy[language],urls=isPrivacyPublicationReady()?publicLegalUrls():null;
 document.documentElement.lang=language;nav.replaceChildren();
 for(const lang of ['ro','en']){
  const button=document.createElement('button');button.type='button';button.textContent=lang.toUpperCase();
  button.onclick=()=>{language=lang;render();};nav.append(button);
 }
 const current=new URL(location.href);current.searchParams.set('lang',language);history.replaceState(null,'',current);
 const related=document.querySelector('main>p>a');
 related.href=urls?.[isDeletion?'privacy':'deletion'][language]??((isDeletion?'privacy.html':'delete-account.html')+'?lang='+language);
 related.textContent=isDeletion?copy.title:copy.deletion;
 if(urls){
  const canonical=document.querySelector('link[rel=canonical]')??document.createElement('link');
  canonical.rel='canonical';canonical.href=urls[isDeletion?'deletion':'privacy'][language];document.head.append(canonical);
 }
 title.textContent=isDeletion?copy.deletion:copy.title;root.replaceChildren();
 if(isDeletion){
  if(!urls){
   const warning=document.createElement('p');warning.textContent=copy.draft;warning.setAttribute('role','note');root.append(warning);
  }
  renderDeletionRequest(root,privacySettings.contact,copy);
 }else renderPolicy(root,language);
}
render();
