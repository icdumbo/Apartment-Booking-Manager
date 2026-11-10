import {test,expect} from '@playwright/test';

test('Android commercial package keeps 12 apartments and exports after trial expires in an open editor',async({page})=>{
 const key='apartment-booking-manager:v1';
 const apartments=Array.from({length:12},(_,i)=>({id:'a'+i,name:'Fixture '+i,address:'Test street',city:'Test city'}));
 const fixture={version:1,migrations:{originalDemoRemoved:true},apartments,bookings:[]};
 await page.addInitScript(({key,fixture})=>{
  localStorage.setItem(key,JSON.stringify(fixture));
  localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:1,lastSeen:1}));
  let verified=false;
  window.commercialTime=0;
  Object.defineProperty(performance,'now',{value:()=>window.commercialTime});
  window.Capacitor={getPlatform:()=> 'android',Plugins:{
   BookingAuth:{addListener:async()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:{uid:'trial-fixture'}}),getIdToken:async()=>({token:'fixture-token'})},
   BookingAccess:{beginVerification:async()=>({nonce:'fixture-nonce'}),acceptProof:async()=>{verified=true;},getAccess:async()=>({subject:'trial-fixture',state:verified?'TRIAL':'BASIC',...(verified?{remainingMs:10000,expiresAt:Date.now()+10000}:{})})}
  }};
 },{key,fixture});
 await page.route('**/index.html',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:(await response.text()).replace('<html ','<html data-commercial-release="true" ')});
 });
 let activations=0;
 await page.route('https://apartment-booking-access.ionutliviucraciun1982.workers.dev/access',route=>{
  const body=route.request().postDataJSON();
  expect(body.action).toBe('startTrial');
  expect(body.terms).toBe('trial-15d-v1');
  activations++;
  return route.fulfill({json:{version:1,proof:'fixture-proof'}});
 });
 await page.goto('/index.html');
 await expect(page.locator('.timeline-row')).toHaveCount(12);
 await expect(page.locator('#range')).toHaveText(/^01\//);
 await expect(page.locator('#add-apartment')).toBeEnabled();
 expect(activations).toBe(1);
 const before=await page.evaluate(key=>localStorage.getItem(key),key);
 await page.locator('#add-apartment').click();
 await page.locator('#fields [name=name]').fill('Must not be saved');
 await page.evaluate(()=>{window.commercialTime=10001;document.querySelector('#editor-form').requestSubmit();});
 await expect(page.locator('#form-error')).toContainText('Mod de consultare');
 await page.locator('#cancel').click();
 await page.locator('nav [data-screen=reports]').first().click();
 await expect(page.locator('#report-export-excel')).toBeEnabled();
 await expect(page.locator('#report-export-pdf')).toBeEnabled();
 await page.locator('#open-menu').click();
 await page.locator('#open-backup').click();
 await expect(page.getByRole('button',{name:'Salvează backup'})).toBeEnabled();
 await expect(page.locator('.backup-actions button').nth(1)).toBeDisabled();
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(before);
});
