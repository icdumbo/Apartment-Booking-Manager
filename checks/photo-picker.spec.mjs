import {test,expect} from '@playwright/test';
const key='apartment-booking-manager:v1';
const fixture={version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'a',name:'Apartament Test',address:'Adresă test',city:'Oraș test'}],bookings:[]};
async function open(page){await page.locator('.app-navigation [data-screen=apartments]').click();await page.locator('.apartment-card').click();}
async function setup(page){await page.goto('/');await page.evaluate(({key,fixture})=>{localStorage.setItem(key,JSON.stringify(fixture));localStorage.setItem('apartment-booking-manager:language','ro');},{key,fixture});await page.reload();await open(page);}
async function bytes(page,color){return page.evaluate(color=>{const c=document.createElement('canvas');c.width=80;c.height=60;c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,80,60);return c.toDataURL('image/png').split(',')[1];},color);}
async function native(page,reply){await page.evaluate(reply=>{window.photoCalls=0;window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingPhoto:{selectPhoto:async()=>{window.photoCalls++;if(reply.code)throw reply;return reply;}}}};},reply);}
const current=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const select=page=>page.locator('#select-apartment-photo').click();
test('Android bridge bytes with missing MIME are prepared/saved offline; replace, cancel and remove retain existing data',async({page})=>{
 await setup(page);await page.context().setOffline(true);const original=await current(page),red=await bytes(page,'#ac3322');await native(page,{status:'selected',data:red});await select(page);await expect(page.locator('.photo-message')).toContainText('Salvează');await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();await expect(page.locator('.apartment-card img')).toBeVisible();const first=(await current(page)).apartments[0].photoId;expect(first).toBeTruthy();
 await page.locator('.apartment-card').click();await native(page,{status:'cancelled'});await select(page);await expect(page.locator('.photo-message')).toContainText('anulată');await expect(page.locator('.apartment-photo-preview img')).toBeVisible();await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();expect((await current(page)).apartments[0].photoId).toBe(first);
 await page.locator('.apartment-card').click();await native(page,{status:'selected',data:await bytes(page,'#2366ac')});await select(page);await expect(page.locator('.photo-message')).toContainText('Salvează');await page.locator('#cancel').click();expect((await current(page)).apartments[0].photoId).toBe(first);
 await page.locator('.apartment-card').click();await select(page);await expect(page.locator('.photo-message')).toContainText('Salvează');await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();const second=(await current(page)).apartments[0].photoId;expect(second).not.toBe(first);
 await page.locator('.apartment-card').click();await page.locator('#remove-apartment-photo').click();await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();expect((await current(page)).apartments[0].photoId).toBeUndefined();expect((await current(page)).bookings).toEqual(original.bookings);expect(await page.evaluate(()=>indexedDB.databases())).toEqual(expect.arrayContaining([expect.objectContaining({name:'apartment-booking-manager:photos'})]));
});
test('native provider failure, bad result, missing adapter, oversize and corrupt image are visible in RO/EN without deleting current photo',async({page})=>{
 await setup(page);await native(page,{status:'selected',data:await bytes(page,'#2478eb')});await select(page);await expect(page.locator('.photo-message')).toContainText('Salvează');await page.locator('#editor [type=submit]').click();await expect(page.locator('#editor')).not.toBeVisible();const saved=await current(page);await page.locator('.apartment-card').click();
 for(const lang of ['ro','en']){
  await page.locator(`#editor [data-language=${lang}]`).click();
  for(const [reply,message] of [[{code:'SecurityException',message:'content://private/provider'},lang==='ro'?'nu a putut fi citită':'could not be read'],[{status:'selected'},lang==='ro'?'nu a putut fi citită':'could not be read'],[{code:'photoTooLarge'},lang==='ro'?'prea mare':'too large'],[{status:'selected',data:btoa('corrupt image')},lang==='ro'?'nu poate fi citită':'could not be read']]){
   await native(page,reply);await select(page);await expect(page.locator('.photo-error')).toContainText(message);expect(await current(page)).toEqual(saved);await expect(page.locator('.apartment-photo-preview img')).toBeVisible();await expect(page.locator('#editor [type=submit]')).toBeEnabled();expect(await page.locator('.photo-message').textContent()).not.toContain('content://');
  }
  await page.evaluate(()=>window.Capacitor.Plugins={});await select(page);await expect(page.locator('.photo-error')).toContainText(lang==='ro'?'APK-ul actualizat':'updated APK');expect(await current(page)).toEqual(saved);
 }
});
test('pending native callback disables duplicate selection and saving; errors restore controls',async({page})=>{
 await setup(page);await page.evaluate(()=>{window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingPhoto:{selectPhoto:()=>new Promise((resolve,reject)=>{window.rejectPhoto=reject;})}}};});await select(page);await expect(page.locator('#select-apartment-photo')).toBeDisabled();await expect(page.locator('#editor [type=submit]')).toBeDisabled();await page.evaluate(()=>window.rejectPhoto({code:'photoLoadFailed'}));await expect(page.locator('.photo-error')).toBeVisible();await expect(page.locator('#select-apartment-photo')).toBeEnabled();await expect(page.locator('#editor [type=submit]')).toBeEnabled();
});
test('browser document files with empty/generic/wrong MIME are decoded by content; unsupported data stays rejected',async({page})=>{
 await setup(page);const png=Buffer.from(await bytes(page,'#66aa88'),'base64');
 for(const type of ['','application/octet-stream','image/jpeg']){await page.locator('#apartment-photo-file').setInputFiles({name:'provider-image.bin',mimeType:type,buffer:png});await expect(page.locator('.photo-message')).toContainText('Salvează');await expect(page.locator('.apartment-photo-preview img')).toBeVisible();}
 await page.locator('#apartment-photo-file').setInputFiles({name:'fake.jpg',mimeType:'image/jpeg',buffer:Buffer.from('<svg/>')});await expect(page.locator('.photo-error')).toContainText('nu poate fi citită');expect((await current(page)).apartments[0].photoId).toBeUndefined();
});
