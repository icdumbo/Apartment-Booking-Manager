import {test,expect} from '@playwright/test';
test('browser BASIC starts offline without auth controls or network dependency',async({page,context})=>{
 await page.goto('/');await expect(page.locator('#account-controls')).toBeHidden();await context.setOffline(true);await page.locator('#add-apartment').click();await page.getByLabel('Nume / identificare',{exact:true}).fill('Offline Test');await page.getByLabel('Adresă',{exact:true}).fill('Test street');await page.getByLabel('Localitate',{exact:true}).fill('Test city');await page.locator('#editor [type=submit]').click();await expect(page.locator('.timeline-row')).toHaveCount(1);
});
test('Android mock login is optional and cannot unlock PREMIUM without backend; logout keeps data',async({page})=>{
 await page.addInitScript(()=>{let user=null,listener;window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{}};},getCurrentUser:async()=>({user}),signInWithGoogle:async()=>{user={uid:'fixture-user'};listener?.({user});return {user};},signOut:async()=>{user=null;listener?.({user});}}}};});
 await page.goto('/');await expect(page.locator('#account-controls')).toBeVisible();await page.locator('#google-sign-in').click();await expect(page.locator('#auth-status')).toContainText('nu este încă disponibilă');await expect(page.locator('#access-message')).not.toContainText('TRIAL PREMIUM activ');await page.locator('#google-sign-out').click();await expect(page.locator('#google-sign-in')).toBeVisible();await expect(page.locator('.timeline-row')).toHaveCount(0);
});

test('secure trial shows terms first; cancellation and unconfigured backend cannot start a local trial',async({page})=>{
 await page.addInitScript(()=>{window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:async()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:null})}}};});
 await page.goto('/');const key='apartment-booking-manager:access:v1';
 page.once('dialog',async dialog=>{expect(dialog.message()).toContain('15 zile');expect(dialog.message()).toContain('fără card');await dialog.dismiss();});
 await page.locator('#activate-secure-trial').click();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 page.once('dialog',dialog=>dialog.accept());await page.locator('#activate-secure-trial').click();
 await expect(page.locator('#auth-status')).toContainText('serverul și verificatorul');await expect(page.locator('#access-message')).toContainText('BASIC');expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 await page.locator('.top [data-language=en]').click();page.once('dialog',async dialog=>{expect(dialog.message()).toContain('15 free PREMIUM days');await dialog.dismiss();});await page.locator('#activate-secure-trial').click();
});
