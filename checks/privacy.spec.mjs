import {test,expect} from '@playwright/test';
import {privacySettings} from '../src/privacy-settings.js';

const fixture={version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'manual-a',name:'Fictional apartment',address:'Fictional street',city:'Fictional city'}],bookings:[]};
async function verifyDraft(root,language){
 const link=root.locator('form a');
 const url=new URL(await link.getAttribute('href'));
 expect(url.protocol).toBe('mailto:');
 expect(url.pathname).toBe(privacySettings.contact);
 expect(url.searchParams.get('subject')).toBe(language==='ro'?'Solicită ștergerea contului':'Request account deletion');
 expect(url.searchParams.get('body')).not.toContain('fictional-user@example.invalid');
 await expect(root.locator('form textarea')).toHaveJSProperty('readOnly',true);
 await expect(root.locator('form')).toContainText(language==='ro'?'Mesajul nu este trimis automat':'The message is not sent automatically');
}

test('anonymous BASIC can read RO/EN policy offline; account request works without sign-in',async({page,context})=>{
 await page.addInitScript(data=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(data)),fixture);
 await page.goto('/');await expect(page.locator('.timeline-row')).toHaveCount(1);
 const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'));
 await context.setOffline(true);
 for(const language of ['ro','en']){
  await page.setViewportSize(language==='ro'?{width:360,height:640}:{width:1280,height:800});
  await page.locator('.top [data-language='+language+']').click();
  await page.locator('#open-menu').click();
  const details=page.locator('#menu-account');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
  await page.locator('#open-account-deletion').click();
  const dialog=page.locator('#privacy-dialog');
  await verifyDraft(dialog,language);
  const email=dialog.locator('input[type=email]');
  const send=dialog.getByRole('button',{name:language==='ro'?'Trimite solicitarea prin e-mail':'Send request by email'});
  await send.scrollIntoViewIfNeeded();
  await expect(send).toBeInViewport({ratio:1});
  await expect(email).toHaveValue('');
  await expect(email).toHaveJSProperty('required',true);
  await send.click();
  await expect(dialog.locator('#deletion-email-error')).toBeVisible();
  await expect(dialog.locator('#deletion-email-error')).toHaveText(language==='ro'?'Introdu o adresă de e-mail validă pentru contul Google.':'Enter a valid email address for your Google account.');
  await expect(email).toBeFocused();
  await email.fill('invalid');
  await send.press('Enter');
  await expect(email).toHaveAttribute('aria-invalid','true');
  await email.fill('fictional-user@example.invalid');
  await expect(dialog.locator('#deletion-email-error')).toBeHidden();
  await dialog.locator('form a').evaluate(link=>link.addEventListener('click',event=>{
   event.preventDefault();
   link.dataset.opened=link.href;
  }));
  await send.press('Enter');
  await expect(dialog.locator('form a')).toHaveAttribute('data-opened',/^mailto:/);
  const draft=new URL(await dialog.locator('form a').getAttribute('data-opened'));
  expect(draft.pathname).toBe(privacySettings.contact);
  expect(draft.searchParams.get('body')).toContain('fictional-user@example.invalid');
  await expect(dialog).toContainText(language==='ro'?'Suportul verifică manual identitatea':'Support checks your identity manually');
  await dialog.locator('.dialog-heading button').click();
  await page.locator('#open-menu').click();
  await page.locator('#open-privacy').click();
  await expect(page.locator('#privacy-dialog')).toContainText('Cloudflare');
  await page.locator('#privacy-dialog .dialog-heading button').click();
 }
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
});

test('signed-in account request prepares email only and leaves local business data intact',async({page})=>{
 await page.addInitScript(data=>{
  localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(data));
  window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{
   addListener:()=>({remove:async()=>{}}),
   getCurrentUser:async()=>({user:{uid:'fictional-a',email:'fictional-user@example.invalid'}}),
   signInWithGoogle:async()=>{throw Error('Must not reauthenticate for email');},
   signOut:async()=>{throw Error('Must not sign out');}
  },BookingAccess:{getAccess:async()=>({state:'BASIC',subject:'fictional-a'}),beginVerification:async()=>{throw Error('offline fixture');}}}};
 },fixture);
 let requests=0;
 await page.route('**/account-deletion',route=>{requests++;return route.abort();});
 await page.goto('/');await expect(page.locator('.timeline-row')).toHaveCount(1);
 const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'));
 for(const language of ['ro','en']){
  await page.locator('.top [data-language='+language+']').click();
  await page.locator('#open-menu').click();
  const details=page.locator('#menu-account');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
  await page.locator('#open-account-deletion').click();
  const dialog=page.locator('#privacy-dialog');
  await verifyDraft(dialog,language);
  await expect(dialog.locator('button[type=submit]')).toHaveCount(0);
  await dialog.locator('.dialog-heading button').click();
 }
 expect(requests).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
});

test('public request page works in RO/EN without Google authentication or deletion API',async({page})=>{
 const external=[];
 page.on('request',request=>{if(/accounts\.google|identitytoolkit|\/account-deletion(?:$|\?)/.test(request.url()))external.push(request.url());});
 await page.goto('/src/legal/delete-account.html?lang=ro');
 await verifyDraft(page.locator('#legal-content'),'ro');
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await verifyDraft(page.locator('#legal-content'),'en');
 expect(external).toEqual([]);
});

for(const history of ['broken',JSON.stringify({version:1,startedAt:0,lastSeen:0})])test('legacy local history reaches server trial decision without local grant: '+history,async({page})=>{
 await page.addInitScript(history=>{localStorage.setItem('apartment-booking-manager:access:v1',history);window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:{uid:'fictional-trial'}}),getIdToken:async()=>({token:'fixture-token'})},BookingAccess:{getAccess:async()=>({state:'BASIC',subject:'fictional-trial'}),beginVerification:async()=>({nonce:'fixture-nonce'}),clear:async()=>{}}}};},history);
 let activations=0;await page.route('https://apartment-booking-access.ionutliviucraciun1982.workers.dev/access',route=>{const body=route.request().postDataJSON();if(body.action==='startTrial'){activations++;expect(body.terms).toBe('trial-15d-v1');expect(body).not.toHaveProperty('startedAt');}return route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{}'});});
 await page.goto('/');await page.locator('#open-menu').click();await page.locator('#menu-account summary').click();
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('#activate-secure-trial').click();expect(activations).toBe(0);
 page.once('dialog',dialog=>{expect(dialog.message()).toContain('6 luni');return dialog.accept();});await page.locator('#activate-secure-trial').click();await expect.poll(()=>activations).toBe(1);await expect(page.locator('#auth-status')).toContainText('nu a putut');await expect(page.locator('#menu-access-status')).toContainText('BASIC');
 const retained=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:access:v1'));if(history==='broken')expect(retained).toBe(history);else expect(JSON.parse(retained).startedAt).toBe(0);
});

