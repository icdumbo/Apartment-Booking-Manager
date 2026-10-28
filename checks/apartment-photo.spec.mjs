import {test,expect} from '@playwright/test';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
const key='apartment-booking-manager:v1';
const fixture={version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'a',name:'Apartament Test A',address:'Adresă test',city:'Oraș test'}],bookings:[{id:'b',apartmentId:'a',guest:'Client Test',phone:'0700000000',checkIn:'2026-11-01',checkOut:'2026-11-03',status:'confirmed'}]};
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const photo=async(page,id)=>page.evaluate(async id=>{const {apartmentPhotos}=await import('/src/apartment-photo.js');const b=await apartmentPhotos.read(id);return b?{size:b.size,type:b.type}:null;},id);
async function pixels(page,color){return Buffer.from(await page.evaluate(color=>{const c=document.createElement('canvas');c.width=64;c.height=48;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,64,48);return c.toDataURL('image/png').split(',')[1];},color),'base64');}
async function choose(page,color='#d86644'){
 await page.locator('#apartment-photo-file').setInputFiles({name:'fictional-test.png',mimeType:'image/png',buffer:await pixels(page,color)});await expect(page.locator('.photo-message')).toContainText(/Salvează|Save/);await expect(page.locator('#editor [type=submit]')).toBeEnabled();
}
async function open(page){await page.locator('.app-navigation [data-screen=apartments]').click();await page.locator('.apartment-card').first().click();}
async function setup(page,premium=false){await page.goto('/');await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data:fixture});if(premium)await seedBrowserTrial(page);await page.reload();await open(page);}
for(const premium of [false,true])test(`photo add, replace, picker/form cancellation and remove offline ${premium?'TRIAL':'BASIC'}`,async({page})=>{
 await page.setViewportSize({width:344,height:900});await setup(page,premium);await page.context().setOffline(true);const before=await state(page);
 await choose(page);await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();await expect(page.locator('.apartment-card .apartment-photo img')).toBeVisible();
 const first=(await state(page)).apartments[0].photoId;expect(first).toBeTruthy();expect(await photo(page,first)).toMatchObject({type:'image/jpeg'});expect((await photo(page,first)).size).toBeLessThanOrEqual(512*1024);
 await page.locator('.apartment-card').first().click();await page.locator('#apartment-photo-file').setInputFiles([]);await page.locator('#apartment-photo-file').dispatchEvent('cancel');await expect(page.locator('.apartment-photo-preview img')).toBeVisible();await page.locator('#editor [type=submit]').click();expect((await state(page)).apartments[0].photoId).toBe(first);
 await page.locator('.apartment-card').first().click();await choose(page,'#3a7ab0');await page.locator('#cancel').click();expect((await state(page)).apartments[0].photoId).toBe(first);
 await page.locator('.apartment-card').first().click();await choose(page,'#3a7ab0');await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();const second=(await state(page)).apartments[0].photoId;expect(second).not.toBe(first);expect(await photo(page,first)).toBeNull();expect(await photo(page,second)).not.toBeNull();
 await page.locator('.apartment-card').first().click();await page.locator('#remove-apartment-photo').click();await page.locator('#cancel').click();expect((await state(page)).apartments[0].photoId).toBe(second);
 await page.locator('.apartment-card').first().click();await page.locator('#remove-apartment-photo').click();await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();expect((await state(page)).apartments[0].photoId).toBeUndefined();expect(await photo(page,second)).toBeNull();await expect(page.locator('.apartment-card .apartment-photo img')).toHaveCount(0);await expect(page.locator('.apartment-card .apartment-photo')).toContainText('Fără fotografie');expect((await state(page)).bookings).toEqual(before.bookings);
});
for(const width of [344,360,430,840])test(`apartment close corner and RO/EN photo controls ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});await setup(page);
 for(const language of ['ro','en']){
  await page.locator(`#editor [data-language=${language}]`).click();await expect(page.locator('#select-apartment-photo')).toHaveText(language==='ro'?'Alege din galerie':'Choose from gallery');
  const layout=await page.locator('#editor').evaluate(editor=>{const r=el=>el.getBoundingClientRect(),close=r(editor.querySelector('#close')),lang=r(editor.querySelector('.language-selector')),dialog=r(editor);return {overlap:close.left<lang.right&&close.right>lang.left&&close.top<lang.bottom&&close.bottom>lang.top,right:dialog.right-close.right,width:close.width,height:close.height,overflow:document.documentElement.scrollWidth>innerWidth};});
  expect(layout.overlap).toBe(false);expect(layout.right).toBeGreaterThanOrEqual(12);expect(layout.right).toBeLessThanOrEqual(26);expect(layout.width).toBe(44);expect(layout.height).toBe(44);expect(layout.overflow).toBe(false);
  if(width===360&&language==='ro')await page.screenshot({path:'test-results/Apartment-photo-details-360.png'});
 }
});
test('invalid files and failed photo storage preserve existing data; BASIC overflow remains read-only',async({page})=>{
 await setup(page);const before=await state(page);
 await page.locator('#apartment-photo-file').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await expect(page.locator('.photo-error')).toContainText('nu poate fi citită');expect(await state(page)).toEqual(before);
 await choose(page);await page.evaluate(async()=>{const {apartmentPhotos}=await import('/src/apartment-photo.js');window.originalWrite=apartmentPhotos.write;apartmentPhotos.write=async()=>{throw Error('photoStorageFailed');};});await page.locator('#editor [type=submit]').click();await expect(page.locator('#form-error')).toContainText('nu a putut fi salvată');expect(await state(page)).toEqual(before);await page.locator('#cancel').click();
 await page.evaluate(({key,data})=>{data.apartments=Array.from({length:4},(_,i)=>({...data.apartments[0],id:i?'a'+i:'a'}));localStorage.setItem(key,JSON.stringify(data));},{key,data:fixture});await page.reload();await page.locator('.app-navigation [data-screen=apartments]').click();await page.locator('.apartment-card').last().click();await expect(page.locator('#select-apartment-photo')).toBeDisabled();await expect(page.locator('#apartment-photo-file')).toBeDisabled();await expect(page.locator('#editor [type=submit]')).not.toBeVisible();
});
test('photo survives a complete offline browser-process restart with the same storage profile',async({playwright},testInfo)=>{
 const directory=await mkdtemp(join(tmpdir(),'abm-photo-profile-'));const options={...testInfo.project.use.launchOptions,viewport:{width:390,height:900}};const repo=resolve('.');
 async function launch(){const context=await playwright.chromium.launchPersistentContext(directory,options);await context.route('http://127.0.0.1:8080/**',async route=>{const path=decodeURIComponent(new URL(route.request().url()).pathname),file=resolve(repo,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(repo+'/'))return route.abort();try{const type={'.js':'text/javascript','.css':'text/css','.html':'text/html','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';await route.fulfill({body:await readFile(file),contentType:type});}catch{await route.abort();}});await context.setOffline(true);return context;}
 let context;
 try{
  context=await launch();let page=context.pages()[0];await setup(page);await choose(page);await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();const saved=await state(page);await context.close();context=undefined;
  context=await launch();page=context.pages()[0];await page.goto('/');await page.locator('.app-navigation [data-screen=apartments]').click();await expect(page.locator('.apartment-card .apartment-photo img')).toBeVisible();expect(await state(page)).toEqual(saved);expect(await photo(page,saved.apartments[0].photoId)).not.toBeNull();
 }finally{await context?.close();await rm(directory,{recursive:true,force:true});}
});
test('new apartment saves its photo reference; failed metadata save retains the prior photo',async({page})=>{
 await setup(page);await page.locator('#cancel').click();await page.locator('#add-apartment').click();await page.locator('[name=name]').fill('Apartament Test Nou');await page.locator('[name=address]').fill('Adresă test nouă');await page.locator('[name=city]').fill('Oraș Test');await choose(page);await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();await expect(page.locator('.apartment-card').last().locator('img')).toBeVisible();
 const saved=await state(page),id=saved.apartments[1].photoId;expect(id).toBeTruthy();await page.locator('.apartment-card').last().click();await choose(page,'#8c51ad');
 await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,value){if(k===key)throw new DOMException('test quota','QuotaExceededError');return original.call(this,k,value);};window.restoreBusinessSave=()=>Storage.prototype.setItem=original;},key);
 await page.locator('#editor [type=submit]').click();await expect(page.locator('#form-error')).toContainText('salv');expect(await state(page)).toEqual(saved);expect(await photo(page,id)).not.toBeNull();
 const count=await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('apartment-booking-manager:photos',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('photos'),r=tx.objectStore('photos').count();r.onsuccess=()=>{resolve(r.result);db.close();};r.onerror=()=>reject();};}));expect(count).toBe(1);
 await page.evaluate(()=>window.restoreBusinessSave());await page.locator('#cancel').click();
});
