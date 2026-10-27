import {test,expect} from '@playwright/test';
const entryKey='apartment-booking-manager:welcome:v1',dataKey='apartment-booking-manager:v1';
const profiles=[['phone-360',360,800],['phone-390',390,844],['phone-430',430,932],['fold-folded',344,882],['fold-unfolded',840,900],['tablet-portrait',800,1280],['tablet-landscape',1280,800]];
async function native(page,{signedIn=false,fail=false}={}){
 await page.addInitScript(({signedIn,fail})=>{
  let user=signedIn?{uid:'fixture-user'}:null,listener;
  globalThis.__uiAuthCalls={signIn:0};
  window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{
   addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{}};},getCurrentUser:async()=>({user}),
   signInWithGoogle:async()=>{globalThis.__uiAuthCalls.signIn++;if(fail)throw Object.assign(Error('UI fixture cancellation'),{code:'authCancelled'});user={uid:'fixture-user'};listener?.({user});return {user};},
   signOut:async()=>{user=null;listener?.({user});}
  }}};
 },{signedIn,fail});
}
for(const [name,width,height] of profiles)test(`Android welcome/login ${name}`,async({page})=>{
 await page.setViewportSize({width,height});await native(page);await page.goto('/');
 await expect(page.locator('#entry-screen')).toBeVisible();await expect(page.locator('#entry-welcome')).toBeVisible();
 const before=await page.evaluate(k=>localStorage.getItem(k),dataKey);
 const capture=async screen=>{
  const metrics=await page.locator('#entry-screen').evaluate(el=>({width:el.scrollWidth,viewport:el.clientWidth}));expect(metrics.width).toBeLessThanOrEqual(metrics.viewport);
  await page.screenshot({path:`test-results/Entry-${name}-${screen}.png`});
 };
 await capture('welcome');await page.locator('#entry-to-login').click();await expect(page.locator('#entry-login')).toBeVisible();
 await expect(page.locator('#entry-login-terms')).toContainText('nu activează automat trialul');await capture('login');
 await page.locator('#entry-screen [data-language=en]').click();await expect(page.locator('#entry-google')).toHaveText('Continue with Google');await expect(page.locator('#entry-login-terms')).toContainText('15 PREMIUM days');
 await page.locator('#entry-back').click();await expect(page.locator('#entry-welcome')).toBeVisible();
 await page.locator('#entry-start').click();await expect(page.locator('#entry-screen')).not.toBeVisible();await expect(page.locator('#access-message')).toContainText('BASIC');
 expect(await page.evaluate(()=>globalThis.__uiAuthCalls.signIn)).toBe(0);
 expect(await page.evaluate(k=>localStorage.getItem(k),dataKey)).toBe(before);
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:access:v1'))).toBeNull();
 await page.reload();await expect(page.locator('#entry-screen')).not.toBeVisible();await page.locator('#open-menu').click();await expect(page.locator('#auth-status')).toContainText('without an account');
});
test('login reuses native Google sign-in, keeps BASIC and never calls trial endpoints',async({page})=>{
 await native(page);let requests=0;await page.route('https://*.workers.dev/**',route=>{requests++;return route.abort();});
 await page.goto('/');await page.locator('#entry-to-login').click();const before=await page.evaluate(k=>localStorage.getItem(k),dataKey);
 await page.locator('#entry-google').click();await expect(page.locator('#entry-screen')).not.toBeVisible();await expect(page.locator('#access-message')).toContainText('BASIC');
 expect(await page.evaluate(()=>globalThis.__uiAuthCalls.signIn)).toBe(1);expect(requests).toBe(0);
 await page.locator('#open-menu').click();await expect(page.locator('#auth-status')).toContainText('Cont Google conectat. BASIC');
 expect(await page.evaluate(k=>localStorage.getItem(k),dataKey)).toBe(before);expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:access:v1'))).toBeNull();
});
test('restored Google session and existing apartments bypass introduction without resetting data',async({page})=>{
 await native(page,{signedIn:true});await page.goto('/');await expect(page.locator('#entry-screen')).not.toBeVisible();await page.locator('#open-menu').click();await expect(page.locator('#auth-status')).toContainText('Cont Google conectat.');
 await page.evaluate(({entryKey,dataKey})=>{localStorage.removeItem(entryKey);localStorage.setItem(dataKey,JSON.stringify({version:1,apartments:[{id:'a',name:'Test existent',address:'Adresă fictivă',city:'Oraș Test'}],bookings:[]}));},{entryKey,dataKey});
 await page.reload();await expect(page.locator('#entry-screen')).not.toBeVisible();await expect(page.locator('.timeline-row')).toHaveCount(1);
});
test('cancelled and offline login keep an accessible BASIC exit',async({page,context})=>{
 await native(page,{fail:true});await page.goto('/');await page.locator('#entry-to-login').click();await page.locator('#entry-google').click();await expect(page.locator('#entry-message')).toContainText('anulată');
 await context.setOffline(true);await page.locator('#entry-google').click();await expect(page.locator('#entry-message')).toContainText('necesită internet');
 expect(await page.evaluate(()=>globalThis.__uiAuthCalls.signIn)).toBe(1);
 await page.locator('#entry-basic').click();await expect(page.locator('#entry-screen')).not.toBeVisible();await expect(page.locator('#access-message')).toContainText('BASIC');
});
test('unsigned existing installation retains apartments and the original legacy trial start',async({page})=>{
 await native(page);await page.addInitScript(({entryKey,dataKey})=>{
  localStorage.removeItem(entryKey);localStorage.setItem(dataKey,JSON.stringify({version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'a',name:'Test existent',address:'Adresă fictivă',city:'Oraș Test'}],bookings:[]}));
  localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:0,lastSeen:0}));
 },{entryKey,dataKey});
 await page.goto('/');await expect(page.locator('.timeline-row')).toHaveCount(1);await expect(page.locator('#entry-screen')).not.toBeVisible();
 const legacy=await page.evaluate(()=>JSON.parse(localStorage.getItem('apartment-booking-manager:access:v1')));
 expect(legacy.startedAt).toBe(0);expect(legacy.lastSeen).toBeGreaterThanOrEqual(0); // Existing anti-rollback bookkeeping may advance lastSeen.
 await expect(page.locator('#access-message')).toContainText('BASIC');
});

test('standalone welcome preview embeds its image and needs no external assets',async({page})=>{
 await native(page);const external=[];page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith('http://127.0.0.1:8080/'))external.push(request.url());});
 await page.goto('/ui-preview/Apartment-Booking-Manager-UI.html');await expect(page.locator('#entry-screen')).toBeVisible();
 expect(await page.locator('.entry-photo').evaluate(el=>getComputedStyle(el).backgroundImage.startsWith('url("data:image/jpeg;base64,'))).toBe(true);
 expect(external).toEqual([]);await page.locator('#entry-start').click();await expect(page.locator('.day-heading')).toHaveCount(30);
});
