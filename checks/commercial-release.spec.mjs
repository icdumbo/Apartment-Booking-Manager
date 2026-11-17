import {test,expect} from '@playwright/test';

test('Android commercial package keeps 12 apartments and exports after trial expires in an open editor',async({page})=>{
 const key='apartment-booking-manager:v1';
 const apartments=Array.from({length:12},(_,i)=>({id:'a'+i,name:'Fixture '+i,address:'Test street',city:'Test city'}));
 const fixture={version:1,migrations:{originalDemoRemoved:true},apartments,bookings:[]};
 await page.addInitScript(({key,fixture})=>{
  localStorage.setItem(key,JSON.stringify(fixture));
  localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:1,lastSeen:1}));
  let verified=false,signedIn=false;
  const user={uid:'trial-fixture'};
  window.commercialTime=0;
  Object.defineProperty(performance,'now',{value:()=>window.commercialTime});
  window.Capacitor={getPlatform:()=> 'android',Plugins:{
   BookingAuth:{addListener:async()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:signedIn?user:null}),signInWithGoogle:async()=>{signedIn=true;return {user};},getIdToken:async()=>({token:'fixture-token'})},
   BookingAccess:{beginVerification:async()=>({nonce:'fixture-nonce'}),acceptProof:async({proof})=>{verified=proof==='fixture-trial-proof';},getAccess:async()=>({subject:'trial-fixture',state:verified?'TRIAL':'BASIC',...(verified?{remainingMs:10000,expiresAt:Date.now()+10000}:{})})}
  }};
 },{key,fixture});
 await page.route('**/index.html',async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:(await response.text()).replace('<html ','<html data-commercial-release="true" ')});
 });
 let activations=0,verifications=0;
 await page.route('https://apartment-booking-access.ionutliviucraciun1982.workers.dev/access',route=>{
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  const body=route.request().postDataJSON();
  if(body.action==='verify'){verifications++;return route.fulfill({headers,json:{version:1,proof:'fixture-view-only-proof'}});}
  expect(body.action).toBe('startTrial');
  expect(body.terms).toBe('trial-15d-v1');
  activations++;
  return route.fulfill({headers,json:{version:1,proof:'fixture-trial-proof'}});
 });
 await page.goto('/index.html');
 await expect(page.locator('.timeline-row')).toHaveCount(12);
 await expect(page.locator('#range')).toHaveText(/^01\//);
 await expect(page.locator('#add-apartment')).toBeDisabled();
 await page.locator('#open-menu').click();
 await page.locator('#menu-account summary').click();
 await page.locator('#google-sign-in').click();
 await page.locator('#entry-google').click();
 await expect.poll(()=>verifications).toBeGreaterThan(0);
 expect(activations).toBe(0);
 await page.locator('#open-menu').click();
 await page.locator('#menu-account summary').click();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('#activate-secure-trial').click();
 expect(activations).toBe(0);
 page.once('dialog',dialog=>{
  expect(dialog.message()).toContain('expiră după 15 zile');
  return dialog.accept();
 });
 await page.locator('#activate-secure-trial').click();
 await expect(page.locator('#add-apartment')).toBeEnabled();
 await page.locator('#close-menu').click();
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
 await expect(page.locator('.backup-actions button').first()).toBeEnabled();
 await expect(page.locator('.backup-actions button').nth(1)).toBeDisabled();
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(before);
});
