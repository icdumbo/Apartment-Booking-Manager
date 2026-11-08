import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {renderLegalPages,legalFiles} from '../scripts/prepare-legal-pages.mjs';
import {privacySettings} from '../src/privacy-settings.js';
import {privacyCopy,policySections} from '../src/privacy-content.js';
const fixture={...privacySettings,brand:'Fictional brand',operator:'Fictional controller',contact:'privacy@example.invalid'};
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

test('static export is restricted to four legal HTML files and reuses every shared policy section',()=>{
 const pages=renderLegalPages({configuration:fixture});
 assert.deepEqual(Object.keys(pages).sort(),legalFiles.map(name=>'legal/'+name).sort());
 for(const lang of ['ro','en']){
  const html=pages['legal/privacy-'+lang+'.html'];
  for(const [title,body] of policySections(lang,fixture)){assert.ok(html.includes(escape(title)));assert.ok(html.includes(escape(body)));}
  assert.ok(html.includes('lang="'+lang+'"'));assert.ok(html.includes('width=device-width'));
  assert.ok(html.includes(escape(privacyCopy[lang].draft)));assert.ok(html.includes('noindex,nofollow'));
  const deletion=pages['legal/delete-account-'+lang+'.html'];
  assert.ok(deletion.includes(escape(privacyCopy[lang].scope)));assert.ok(deletion.includes(escape(privacyCopy[lang].emailNotice)));assert.ok(deletion.includes('mailto:'+fixture.contact));assert.ok(deletion.includes(lang==='ro'?'Suportul verifică manual':'Support checks your identity manually'));for(const future of ['PLAN PROPUS','PROPOSED PLAN','24 luni','24 months','90 zile','90 days'])assert.ok(!html.includes(future)&&!deletion.includes(future));
 }
 for(const html of Object.values(pages)){
  assert.ok(!/<script|<iframe|<form|\son\w+\s*=/i.test(html));
  assert.ok(!/<link[^>]+stylesheet/i.test(html));assert.ok(!html.includes('src/app.js'));
 }
});

test('release fails closed for missing approvals and unresolved policy even when configuration is filled',()=>{
 assert.throws(()=>renderLegalPages({preview:false}),/Publication blocked/);
 const filled={...fixture,retentionPolicy:{ro:'Fictional retention RO',en:'Fictional retention EN'},processingPolicy:{ro:'Fictional processing RO',en:'Fictional processing EN'},publicBaseUrl:'https://fixture.invalid/legal/',legalReviewApproved:true,publicationApproved:true};
 const pages=renderLegalPages({configuration:filled,preview:false});
 for(const lang of ['ro','en']){
  assert.ok(!pages['legal/privacy-'+lang+'.html'].includes('noindex'));
  const html=pages['legal/delete-account-'+lang+'.html'];
  assert.match(html,/mailto:privacy@example\.invalid\?subject=/);
  assert.doesNotMatch(html,/accounts\.google|identitytoolkit|<script/i);
 }
 assert.throws(()=>renderLegalPages({configuration:{...filled,processingPolicy:{ro:'NECONFIRMAT',en:'UNCONFIRMED'}},preview:false}),/unresolved statements/);
});

test('public text is escaped and the exporter cannot introduce executable controller content',()=>{
 const pages=renderLegalPages({configuration:{...fixture,operator:'<script>alert("fixture")</script>'}});
 for(const lang of ['ro','en']){const html=pages['legal/privacy-'+lang+'.html'];assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));}
});

test('local HTTP serves all language and related-page links without scripts or missing dependencies',async()=>{
 const pages=renderLegalPages({configuration:fixture});
 const server=createServer((request,response)=>{
  const path=decodeURIComponent(new URL(request.url,'http://fixture.invalid').pathname).replace('/Apartment-Booking-Manager/','');
  const html=pages[path];response.writeHead(html?200:404,{'Content-Type':'text/html; charset=utf-8'});response.end(html??'not found');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{
  const base='http://127.0.0.1:'+server.address().port+'/Apartment-Booking-Manager/';
  for(const path of Object.keys(pages)){
   const url=new URL(path,base),response=await fetch(url),html=await response.text();assert.equal(response.status,200);
   for(const [,href] of html.matchAll(/href="([^"]+)"/g)){
    if(href.startsWith('mailto:'))continue;
    assert.equal((await fetch(new URL(href,url))).status,200);
   }
  }
  assert.equal((await fetch(new URL('index.html',base))).status,404,'Export contains no replacement application homepage');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
