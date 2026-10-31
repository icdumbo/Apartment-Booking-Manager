import {test,expect} from '@playwright/test';
import {ownerFixture} from '../tests/fixtures/owners.mjs';
// These account tests represent an existing installation; onboarding has its own tests.
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('apartment-booking-manager:welcome:v1','dismissed'));});
for(const session of ['anonymous','ordinary','owner'])test(`Android synchronous Billing listener: menu and secure auth initialize for ${session}, preserving legacy trial and business data`,async({page})=>{
 await page.setViewportSize({width:430,height:932});
 const errors=[],actions=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({session,fixture})=>{
  localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(fixture.business));
  localStorage.setItem('apartment-booking-manager:maintenance:v1',JSON.stringify(fixture.maintenance));
  localStorage.setItem('apartment-booking-manager:maintenance-drafts:v1',JSON.stringify(fixture.drafts));
  localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:1000,lastSeen:1000}));
  let user=session==='anonymous'?null:{uid:'fixture-'+session},state='BASIC';
  window.Capacitor={getPlatform:()=> 'android',Plugins:{
   BookingAuth:{addListener:()=>({remove:async()=>{}}),getCurrentUser:async()=>({user}),getIdToken:async()=>({token:'fictional-ui-token'})},
   BookingAccess:{beginVerification:async()=>({nonce:'01234567-0123-0123-0123-012345678901'}),getAccess:async()=>({subject:user?.uid,state,premiumSource:state==='PREMIUM'?'OWNER_GRANT':null}),acceptProof:async({proof})=>{state=session==='owner'&&proof==='fictional-owner-proof'?'PREMIUM':'BASIC';}},
   // Exact return contract of assets/native-bridge.js from the delivered APK.
   BookingBilling:{addListener:()=>({remove:async()=>{}}),getProduct:async()=>{throw Error('billingUnavailable');}}
  }};
 },{session,fixture:ownerFixture()});
 await page.route('https://apartment-booking-access.ionutliviucraciun1982.workers.dev/access',route=>{
  actions.push(route.request().postDataJSON().action);
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:1,proof:session==='owner'?'fictional-owner-proof':'fictional-basic-proof'})});
 });
 await page.goto('/');await expect(page.locator('.timeline-row')).toHaveCount(4);
 await expect(page.locator('#access-message')).toContainText(session==='owner'?'PREMIUM':'BASIC');
 const before=await page.evaluate(()=>Object.fromEntries(['apartment-booking-manager:v1','apartment-booking-manager:maintenance:v1','apartment-booking-manager:maintenance-drafts:v1'].map(key=>[key,localStorage.getItem(key)])));
 for(const screen of ['apartments','calendar','statistics','reports']){
  await page.locator('.app-navigation [data-screen='+screen+']').click();
  await page.locator('#open-menu').click();await expect(page.locator('#app-menu')).toBeVisible();
  await expect(page.locator('#account-controls')).toBeVisible();
  await page.locator('#close-menu').click();await expect(page.locator('#app-menu')).not.toBeVisible();
 }
 await page.locator('#open-menu').click();await page.locator('#app-menu [data-language=en]').click();await page.locator('#app-menu [data-language=ro]').click();
 if(session==='anonymous'){
  await expect(page.locator('#google-sign-in')).toBeVisible();await page.locator('#google-sign-in').click();await expect(page.locator('#entry-login')).toBeVisible();await page.locator('#entry-basic').click();await page.locator('#open-menu').click();
 }else{await expect(page.locator('#auth-status')).toContainText('Cont Google conectat.');expect(actions.length).toBeGreaterThan(0);}
 await page.locator('#open-backup').click();await expect(page.locator('#backup-dialog')).toBeVisible();await page.locator('#close-backup').click();
 if(session==='owner'){
  await expect(page.locator('.brand small')).toContainText('PREMIUM permanent');await expect(page.locator('#access-details')).not.toContainText('istoric de trial');
  await page.locator('.app-navigation [data-screen=statistics]').click();await expect(page.locator('#statistics-panel select').first()).toBeVisible();
  await page.locator('.app-navigation [data-screen=reports]').click();await expect(page.locator('#reports-panel select').first()).toBeVisible();
 }
 expect(actions.every(action=>action==='verify')).toBe(true);
 const after=await page.evaluate(()=>Object.fromEntries(['apartment-booking-manager:v1','apartment-booking-manager:maintenance:v1','apartment-booking-manager:maintenance-drafts:v1'].map(key=>[key,localStorage.getItem(key)])));
 expect(after).toEqual(before);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('apartment-booking-manager:access:v1')).startedAt)).toBe(1000);expect(errors).toEqual([]);
});
for(const state of ['BASIC','TRIAL','PREMIUM'])test(`account and header reflect native ${state} in RO/EN without changing data`,async({page,context})=>{
 // UI boundary only: a native verifier snapshot is mocked; no server grants are issued.
 await page.addInitScript(state=>{
  window.Capacitor={getPlatform:()=> 'android',Plugins:{
   BookingAuth:{addListener:async()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:{uid:'ui-fixture'}})},
   BookingAccess:{getAccess:async()=>({subject:'ui-fixture',state,premiumSource:state==='PREMIUM'?'OWNER_GRANT':null,...(state==='TRIAL'?{remainingMs:2*86400000}:{})}),beginVerification:async()=>{throw Error('No network in UI fixture');}}
  }};
 },state);
 await page.goto('/');await page.locator('#open-menu').click();
 const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'));
 await expect(page.locator('#auth-status')).toContainText('Cont Google conectat.');
 await expect(page.locator('.brand small')).toContainText(state==='PREMIUM'?'PREMIUM permanent':state);
 await expect(page.locator('#auth-status')).toContainText(state);
 await expect(page.locator('#auth-status')).not.toContainText('nu este încă disponibilă');
 if(state==='BASIC')await expect(page.locator('#activate-secure-trial')).toBeVisible();
 else await expect(page.locator('#activate-secure-trial')).toBeHidden();
 if(state==='PREMIUM')await expect(page.locator('#access-details')).not.toContainText('trial');
 await context.setOffline(true);
 await page.locator('#app-menu [data-language=en]').click();
 await expect(page.locator('#auth-status')).toContainText('Google account connected.');
 await expect(page.locator('#auth-status')).toContainText(state);
 await expect(page.locator('.brand small')).toContainText(state==='PREMIUM'?'Permanent PREMIUM':state);
 await expect(page.locator('#auth-status')).not.toContainText('not available yet');
 await page.locator('#app-menu [data-language=ro]').click();
 await expect(page.locator('#auth-status')).toContainText('Cont Google conectat.');
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
});
test('browser BASIC starts offline without auth controls or network dependency',async({page,context})=>{
 await page.goto('/');await expect(page.locator('#account-controls')).toBeHidden();await context.setOffline(true);await page.locator('#add-apartment').click();await page.getByLabel('Nume / identificare',{exact:true}).fill('Offline Test');await page.getByLabel('Adresă',{exact:true}).fill('Test street');await page.getByLabel('Localitate',{exact:true}).fill('Test city');await page.locator('#editor [type=submit]').click();await expect(page.locator('.timeline-row')).toHaveCount(1);
});
test('Android mock login is optional and cannot unlock PREMIUM without backend; logout keeps data',async({page})=>{
 await page.addInitScript(()=>{let user=null,listener;window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{}};},getCurrentUser:async()=>({user}),signInWithGoogle:async()=>{user={uid:'fixture-user'};listener?.({user});return {user};},signOut:async()=>{user=null;listener?.({user});}}}};});
 await page.goto('/');await page.locator('#open-menu').click();await expect(page.locator('#account-controls')).toBeVisible();await page.locator('#google-sign-in').click();await expect(page.locator('#entry-login')).toBeVisible();await page.locator('#entry-google').click();await expect(page.locator('#entry-screen')).not.toBeVisible();await page.locator('#open-menu').click();await expect(page.locator('#auth-status')).toContainText('Cont Google conectat. BASIC');await expect(page.locator('#access-message')).not.toContainText('TRIAL PREMIUM activ');await page.locator('#google-sign-out').click();await expect(page.locator('#google-sign-in')).toBeVisible();await expect(page.locator('.timeline-row')).toHaveCount(0);
});

test('secure trial shows terms first; cancellation and unconfigured backend cannot start a local trial',async({page})=>{
 await page.addInitScript(()=>{window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:async()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:null})}}};});
 await page.goto('/');await page.locator('#open-menu').click();const key='apartment-booking-manager:access:v1';
 page.once('dialog',async dialog=>{expect(dialog.message()).toContain('15 zile');expect(dialog.message()).toContain('fără card');await dialog.dismiss();});
 await page.locator('#activate-secure-trial').click();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 page.once('dialog',dialog=>dialog.accept());await page.locator('#activate-secure-trial').click();
 await expect(page.locator('#auth-status')).toContainText('serverul și verificatorul');await expect(page.locator('#access-message')).toContainText('BASIC');expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 await page.locator('#app-menu [data-language=en]').click();page.once('dialog',async dialog=>{expect(dialog.message()).toContain('15 free PREMIUM days');await dialog.dismiss();});await page.locator('#activate-secure-trial').click();
});
