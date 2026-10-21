import {test,expect} from '@playwright/test';
test('browser BASIC starts offline without auth controls or network dependency',async({page,context})=>{
 await page.goto('/');await expect(page.locator('#account-controls')).toBeHidden();await context.setOffline(true);await page.locator('#add-apartment').click();await page.getByLabel('Nume / identificare',{exact:true}).fill('Offline Test');await page.getByLabel('Adresă',{exact:true}).fill('Test street');await page.getByLabel('Localitate',{exact:true}).fill('Test city');await page.locator('#editor [type=submit]').click();await expect(page.locator('.timeline-row')).toHaveCount(1);
});
test('Android mock login is optional and cannot unlock PREMIUM without backend; logout keeps data',async({page})=>{
 await page.addInitScript(()=>{let user=null,listener;window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{}};},getCurrentUser:async()=>({user}),signInWithGoogle:async()=>{user={uid:'fixture-user'};listener?.({user});return {user};},signOut:async()=>{user=null;listener?.({user});}}}};});
 await page.goto('/');await expect(page.locator('#account-controls')).toBeVisible();await page.locator('#google-sign-in').click();await expect(page.locator('#auth-status')).toContainText('nu este încă disponibilă');await expect(page.locator('#access-message')).not.toContainText('TRIAL PREMIUM activ');await page.locator('#google-sign-out').click();await expect(page.locator('#google-sign-in')).toBeVisible();await expect(page.locator('.timeline-row')).toHaveCount(0);
});
