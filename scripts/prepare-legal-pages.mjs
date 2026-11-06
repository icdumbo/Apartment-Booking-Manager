import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import {privacySettings,isPrivacyPublicationReady,privacyConfigurationIssues,isDeletionWebReady} from '../src/privacy-settings.js';
import {privacyCopy,policySections} from '../src/privacy-content.js';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const legalFiles=['privacy-ro.html','privacy-en.html','delete-account-ro.html','delete-account-en.html'];
const css='*{box-sizing:border-box}html{color-scheme:light}body{margin:0;background:#f5f5f5;color:#202428;font:1rem/1.65 system-ui,sans-serif}main{max-width:52rem;margin:auto;padding:clamp(16px,4vw,32px)}h1,h2,h3{line-height:1.3;overflow-wrap:anywhere}h1{font-size:clamp(1.5rem,5vw,2rem)}h2{font-size:1.4rem}h3{font-size:1.12rem;margin-top:1.8rem}p,a{overflow-wrap:anywhere}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#174f82}nav a{display:inline-flex;align-items:center;min-height:44px;padding:8px 12px;border:1px solid #67727b;border-radius:6px}.draft{padding:16px;border:2px solid #8c5700;background:#fff0d0}section{break-inside:avoid}@media print{body{background:white}nav{display:none}}';
const section=([title,body])=>'<section><h3>'+escape(title)+'</h3><p>'+escape(body)+'</p></section>';

// Publication preparation only: never copies application scripts, storage or credentials.
export function renderLegalPages({configuration=privacySettings,preview=true}={}){
 const sections=Object.fromEntries(['ro','en'].map(lang=>[lang,policySections(lang,configuration)]));
 if(!preview){
  if(!isPrivacyPublicationReady(configuration))throw Error('Publication blocked: '+privacyConfigurationIssues(configuration).join(', '));
  // Approving configuration alone cannot turn unresolved editorial statements into final policy.
  const unresolved=/NECONFIRMAT|UNCONFIRMED|nu sunt încă aprobate|not yet been approved|trebuie confirmate înainte de publicare|must be confirmed before publication|PLAN PROPUS — NEIMPLEMENTAT|PROPOSED PLAN — NOT IMPLEMENTED|VALIDARE JURIDICĂ NECESARĂ|LEGAL VALIDATION REQUIRED|Nu declarăm aceste verificări finalizate|Those checks are not claimed as completed/;
  if(Object.values(sections).some(items=>unresolved.test(items.flat().join(' '))))throw Error('Publication blocked: unresolved statements in shared RO/EN policy');
 }
 // The verified interactive request flow remains in src/legal/. Do not pretend a
 // static export implements it or silently replace an activated request flow.
 if(isDeletionWebReady(configuration))throw Error('Verified interactive deletion requires a separately reviewed public integration');
 const pages={};
 for(const lang of ['ro','en'])for(const deletion of [false,true]){
  const c=privacyCopy[lang],name=(deletion?'delete-account-':'privacy-')+lang+'.html';
  const title=deletion?c.deletion:c.title;
  const body=deletion?'<p>'+escape(c.scope)+'</p><p role="status">'+escape(c.unconfigured)+'</p>'+sections[lang].slice(9).map(section).join(''):sections[lang].map(section).join('');
  const warning=preview?'<p class="draft" role="note">'+escape(c.draft)+'</p>':'';
  const support=configuration.contact;
  if(typeof support!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support))throw Error('Invalid public contact');
  const links='<nav aria-label="'+(lang==='ro'?'Limba documentului':'Document language')+'">'+['ro','en'].map(target=>'<a href="'+(deletion?'delete-account-':'privacy-')+target+'.html" lang="'+target+'"'+(target===lang?' aria-current="page"':'')+'>'+target.toUpperCase()+'</a>').join('')+'</nav>';
  pages['legal/'+name]='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">'+(preview?'<meta name="robots" content="noindex,nofollow">':'')+'<title>'+escape(title)+' — Apartment Booking Manager</title><style>'+css+'</style></head><body><main><h1>Apartment Booking Manager</h1>'+links+'<h2>'+escape(title)+'</h2>'+warning+body+'<p>'+escape(deletion?c.deletionSupportLabel:c.supportLabel)+'<a href="mailto:'+escape(support)+'">'+escape(support)+'</a></p><p><a href="'+(deletion?'privacy-':'delete-account-')+lang+'.html">'+escape(deletion?c.title:c.deletion)+'</a></p></main></body></html>\n';
 }
 return pages;
}

export async function prepareLegalPages({preview=true}={}){
 const pages=renderLegalPages({preview});
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const output=resolve(root,'build',preview?'legal-pages-preview':'legal-pages-release');
 await mkdir(resolve(output,'legal'),{recursive:true});
 const manifest={mode:preview?'draft-preview-not-for-publication':'release-requires-explicit-approval',files:[]};
 for(const [path,content] of Object.entries(pages)){
  await writeFile(resolve(output,path),content,'utf8');
  manifest.files.push({path,sha256:createHash('sha256').update(content).digest('hex')});
 }
 await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return {output,manifest};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 if(args.length!==1||!['--preview','--release'].includes(args[0]))throw Error('Use exactly --preview or --release; no publication is performed');
 try{const result=await prepareLegalPages({preview:args[0]==='--preview'});console.log(JSON.stringify(result,null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
