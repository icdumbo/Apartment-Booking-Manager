import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {privacySettings} from '../src/privacy-settings.js';
async function mockLegalConfiguration(page,changes={}){
 const source=await readFile('src/privacy-settings.js','utf8');
 const fixture={controllerType:'individual',operator:'Fictional Controller',contact:'privacy@example.invalid',retentionPolicy:{ro:'Retenție fictivă RO',en:'Fictional EN retention'},processingPolicy:{ro:'Cadru fictiv RO',en:'Fictional EN framework'},publicBaseUrl:'https://legal.fixture.invalid/legal/',legalReviewApproved:true,publicationApproved:true,automaticBackup:'excluded',webClientId:'fixture-client',firebaseApiKey:'fixture-key',deletionEndpoint:'https://api.fixture.invalid/account-deletion',deletionBackendVerified:true,...changes};
 await page.route('**/src/privacy-settings.js',route=>route.fulfill({contentType:'text/javascript',body:source.replace(/export const privacySettings=Object\.freeze\(\{[\s\S]*?\}\);/,'export const privacySettings=Object.freeze('+JSON.stringify(fixture)+');')}));
}
test('offline anonymous BASIC can read both policy languages without touching business data',async({page,context})=>{
 const fixture={version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'privacy-a',name:'Fictional apartment',address:'Test street',city:'Test city'}],bookings:[{id:'privacy-b',apartmentId:'privacy-a',guest:'Fictional guest',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-12',status:'confirmed'}]};
 await page.addInitScript(value=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(value)),fixture);
 await page.goto('/');await expect(page.locator('.timeline-row')).toHaveCount(1);await expect(page.locator('#open-privacy')).toHaveCount(1);const original=JSON.stringify(fixture);await context.setOffline(true);
 for(const lang of ['ro','en']){await page.locator('.top [data-language='+lang+']').click();await page.locator('#open-menu').click();await expect(page.locator('#open-account-deletion')).toBeHidden();await page.locator('#open-privacy').click();await expect(page.locator('#privacy-dialog')).toContainText('Cloudflare');await expect(page.locator('#privacy-dialog [data-privacy-contact] a')).toHaveAttribute('href','mailto:'+privacySettings.contact);await page.locator('#privacy-dialog .dialog-heading button').click();}
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toEqual(original);
});
test('authenticated deletion asks confirmation, reauthenticates and never claims deletion after network failure',async({page})=>{
 await page.addInitScript(()=>{window.__reauth=0;window.__signedOut=false;localStorage.setItem('apartment-booking-manager:v1',JSON.stringify({version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'erase-a',name:'Fixture',address:'Fixture',city:'Fixture'}],bookings:[]}));window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:window.__signedOut?null:{uid:'fictional-a'}}),signOut:async()=>{window.__signedOut=true;},getIdToken:async()=>({token:'fixture-token'}),signInWithGoogle:async()=>{window.__reauth++;return {user:{uid:'fictional-a'}};}},BookingAccess:{clear:async()=>{},getAccess:async()=>({state:'BASIC',subject:'fictional-a'}),beginVerification:async()=>{throw Error('fixture offline');}}}};});
 let submissions=0,fail=true,completed=false;
 await page.route('**/account-deletion',async route=>{if(route.request().postDataJSON().action==='receipt')return route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{version:1,deleted:completed}});submissions++;expect(route.request().postDataJSON()).not.toHaveProperty('subject');await route.fulfill({status:fail?503:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization'},contentType:'application/json',body:JSON.stringify(fail?{error:'deletionRequestUnavailable'}:{version:1,status:'pending_review',deleted:false,requestId:'fictional-reference',createdAt:1800000000000})});});
 await page.goto('/');await page.locator('#open-menu').click();await page.locator('#menu-account summary').click();await page.locator('#open-account-deletion').click();await expect(page.locator('#privacy-dialog [type=submit]')).toHaveCount(0);await expect(page.locator('#privacy-dialog [role=status]')).toContainText('nu sunt încă activate');await expect(page.locator('#privacy-dialog [data-privacy-contact] a')).toHaveAttribute('href','mailto:'+privacySettings.contact);expect(submissions).toBe(0);expect(await page.evaluate(()=>window.__reauth)).toBe(0);
 await mockLegalConfiguration(page);await page.reload();await page.locator('#open-menu').click();await page.locator('#menu-account summary').click();await page.locator('#open-account-deletion').click();await expect(page.locator('#privacy-dialog [type=submit]')).toBeDisabled();expect(submissions).toBe(0);
 await page.locator('#deletion-confirm').check();await page.locator('#privacy-dialog [type=submit]').click();await expect(page.locator('#deletion-message')).toContainText('nu a putut');expect(await page.evaluate(()=>window.__reauth)).toBe(1);
 fail=false;await page.locator('#privacy-dialog [type=submit]').click();await expect(page.locator('#deletion-message')).toContainText('fictional-reference');await expect(page.locator('#deletion-message')).toContainText('nu au fost încă șterse');
 const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'));
 completed=true;await page.locator('#privacy-dialog form button[type=button]').click();
 await expect(page.locator('#privacy-dialog')).not.toBeVisible();
 expect(await page.evaluate(()=>window.__signedOut)).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
});
test('public legal pages work without app authentication and unconfigured web requests are visibly unavailable',async({page})=>{
 for(const lang of ['ro','en']){await page.goto('/src/legal/privacy.html?lang='+lang);await expect(page.locator('#legal-content')).toContainText('Firebase');await expect(page.locator('#legal-content [data-privacy-contact] a')).toHaveAttribute('href','mailto:'+privacySettings.contact);await expect(page.locator('#legal-content')).toContainText('Cloudflare');await page.locator('main>p>a').click();await expect(page).toHaveURL(new RegExp('delete-account.html\\?lang='+lang+'$'));await expect(page.locator('html')).toHaveAttribute('lang',lang);await expect(page.locator('#legal-content')).toContainText(lang==='ro'?'Formularul web automat nu este activ':'The automated web form is inactive');await expect(page.locator('#legal-content input')).toHaveCount(0);await expect(page.locator('#legal-content [data-privacy-contact] a')).toHaveAttribute('href','mailto:'+privacySettings.contact);await page.locator('main>p>a').click();await expect(page).toHaveURL(new RegExp('privacy.html\\?lang='+lang+'$'));}
});
test('configured public web flow retains the receipt across languages and confirms deletion',async({page})=>{
 await mockLegalConfiguration(page);
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'text/javascript',body:'window.google={accounts:{id:{initialize(o){this.cb=o.callback;},renderButton(el){const b=document.createElement("button");b.textContent="Fixture Google";b.onclick=()=>this.cb({credential:"fixture-google"});el.append(b);}}}};'}));
 await page.route('https://identitytoolkit.googleapis.com/**',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization'},contentType:'application/json',body:JSON.stringify({localId:'fictional-a',idToken:'fixture-token'})}));
 await page.route('https://api.fixture.invalid/account-deletion',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization'},contentType:'application/json',body:JSON.stringify(route.request().postDataJSON().action==='receipt'?{version:1,deleted:true}:{version:1,status:'pending_review',deleted:false,requestId:'web-fixture',createdAt:1800000000000})}));
 await page.goto('/src/legal/delete-account.html?lang=en');await page.getByRole('button',{name:'Google sign-in for your request'}).click();await page.getByRole('button',{name:'Fixture Google'}).click();await page.locator('input[type=checkbox]').check();await page.getByRole('button',{name:'Confirm request and verify identity'}).click();await expect(page.getByRole('status')).toContainText('web-fixture');await expect(page.getByRole('status')).toContainText('not yet been deleted');
 await page.getByRole('button',{name:'RO',exact:true}).click();
 await page.locator('#legal-content form button[type=button]').click();
 await expect(page.getByRole('status')).toContainText('a fost confirmată');
 await expect(page.locator('#legal-content form')).toHaveCount(0);
});
test('publication-ready policy renders the correct language; an unverified backend cannot start sign-in or intake',async({page})=>{
 await mockLegalConfiguration(page,{deletionBackendVerified:false});
 for(const lang of ['ro','en']){await page.goto('/src/legal/privacy.html?lang='+lang);await expect(page.locator('#legal-content')).toContainText(lang==='ro'?'Retenție fictivă RO':'Fictional EN retention');await expect(page.locator('#legal-content [role=note]')).toHaveCount(0);await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://legal.fixture.invalid/legal/privacy-'+lang+'.html');await page.goto('/src/legal/delete-account.html?lang='+lang);await expect(page.locator('#legal-content')).toContainText(lang==='ro'?'Formularul web automat nu este activ':'The automated web form is inactive');await expect(page.locator('#legal-content button')).toHaveCount(0);await expect(page.locator('script[src="https://accounts.google.com/gsi/client"]')).toHaveCount(0);}
});

for(const history of ['broken',JSON.stringify({version:1,startedAt:0,lastSeen:0})])test('legacy local history reaches server trial decision without local grant: '+history,async({page})=>{
 await page.addInitScript(history=>{localStorage.setItem('apartment-booking-manager:access:v1',history);window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:{uid:'fictional-trial'}}),getIdToken:async()=>({token:'fixture-token'})},BookingAccess:{getAccess:async()=>({state:'BASIC',subject:'fictional-trial'}),beginVerification:async()=>({nonce:'fixture-nonce'}),clear:async()=>{}}}};},history);
 let activations=0;await page.route('https://apartment-booking-access.ionutliviucraciun1982.workers.dev/access',route=>{const body=route.request().postDataJSON();if(body.action==='startTrial'){activations++;expect(body.terms).toBe('trial-15d-v1');expect(body).not.toHaveProperty('startedAt');}return route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{}'});});
 await page.goto('/');await page.locator('#open-menu').click();await page.locator('#menu-account summary').click();
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('#activate-secure-trial').click();expect(activations).toBe(0);
 page.once('dialog',dialog=>{expect(dialog.message()).toContain('6 luni');return dialog.accept();});await page.locator('#activate-secure-trial').click();await expect.poll(()=>activations).toBe(1);await expect(page.locator('#auth-status')).toContainText('nu a putut');await expect(page.locator('#menu-access-status')).toContainText('BASIC');
 const retained=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:access:v1'));if(history==='broken')expect(retained).toBe(history);else expect(JSON.parse(retained).startedAt).toBe(0);
});

test('a saved deletion receipt cannot sign out a session that is still initializing',async({page})=>{
 await mockLegalConfiguration(page);
 await page.clock.install();
 await page.addInitScript(()=>{
  localStorage.setItem('apartment-booking-manager:deletion-receipt:v1',JSON.stringify({uid:'deleted-fixture',requestId:'00000000-0000-4000-8000-000000000001'}));
  window.__signOuts=0;
  window.Capacitor={getPlatform:()=> 'android',Plugins:{
   BookingAuth:{
    addListener:()=>({remove:async()=>{}}),
    getCurrentUser:()=>new Promise(resolve=>{window.__resolveAuth=()=>resolve({user:{uid:'other-fixture'}});}),
    signOut:async()=>{window.__signOuts++;}
   },
   BookingAccess:{getAccess:async()=>({state:'BASIC',subject:'other-fixture'}),clear:async()=>{},beginVerification:async()=>{throw Error('fixture offline');}}
  }};
 });
 let receipts=0;
 await page.route('**/account-deletion',route=>{receipts++;return route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{version:1,deleted:true}});});
 await page.goto('/');
 await page.waitForFunction(()=>typeof window.__resolveAuth==='function');
 await page.clock.runFor(16000);
 expect(receipts).toBe(0);
 await page.evaluate(()=>window.__resolveAuth());
 await page.clock.runFor(16000);
 await expect.poll(()=>receipts).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.__signOuts)).toBe(0);
});
