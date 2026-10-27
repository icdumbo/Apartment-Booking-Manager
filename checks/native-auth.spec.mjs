import {test,expect} from '@playwright/test';
// These account tests represent an existing installation; onboarding has its own tests.
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('apartment-booking-manager:welcome:v1','dismissed'));});
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
