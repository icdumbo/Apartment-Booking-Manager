import {test,expect} from '@playwright/test';
import {ownerFixture} from '../tests/fixtures/owners.mjs';

const dataKey='apartment-booking-manager:v1';
async function setup(page,state='BASIC'){
 await page.addInitScript(({state,fixture})=>{
  localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(fixture.business));
  localStorage.setItem('apartment-booking-manager:maintenance:v1',JSON.stringify(fixture.maintenance));
  localStorage.setItem('apartment-booking-manager:welcome:v1','dismissed');
  // UI boundary fixture only; it is not production authentication or a license.
  let user=state==='BASIC'?null:{uid:'fictional-menu-user'};
  window.Capacitor={getPlatform:()=> 'android',Plugins:{
   BookingAuth:{addListener:()=>({remove:async()=>{}}),getCurrentUser:async()=>({user}),signOut:async()=>{user=null;return {};},signInWithGoogle:async()=>{user={uid:'fictional-menu-user'};return {user};}},
   BookingAccess:{getAccess:async()=>({subject:user?.uid,state,premiumSource:state==='PREMIUM'?'OWNER_GRANT':null,...(state==='TRIAL'?{remainingMs:2*86400000}:{})}),beginVerification:async()=>{throw Error('No live service in UI fixture');},clear:async()=>{}},
   BookingBilling:{addListener:()=>({remove:async()=>{}}),getProduct:async()=>({available:false})}
  }};
 },{state,fixture:ownerFixture()});
 await page.goto('/');await expect(page.locator('.timeline-row')).toHaveCount(4);
 await expect(page.locator('#menu-access-status')).toContainText(state);
}
const profiles=[['small',320,568],['folded',344,882],['phone',430,932],['unfolded',840,900],['landscape',900,600],['short',344,400]];
for(const [profile,width,height] of profiles)for(const state of ['BASIC','TRIAL','PREMIUM'])test(`compact menu ${profile} ${state}: RO/EN, functions first and account collapsed`,async({page,context})=>{
 await page.setViewportSize({width,height});const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page,state);
 const before=await page.evaluate(key=>localStorage.getItem(key),dataKey);await context.setOffline(true);
 await page.locator('#open-menu').click();const account=page.locator('#menu-account');
 await expect(account).not.toHaveAttribute('open','');await expect(page.locator('#commerce-controls')).toBeHidden();await expect(page.locator('#account-controls')).toBeHidden();
 for(const language of ['ro','en']){
  await page.locator('#app-menu [data-language='+language+']').click();
  await expect(page.locator('#menu-access-status')).toHaveText(await page.locator('#access-message').textContent());
  const metrics=await page.locator('#app-menu').evaluate(menu=>{
   const box=menu.getBoundingClientRect(),buttons=[...menu.querySelectorAll('.menu-shortcuts button')],heading=menu.querySelector('.dialog-heading'),intro=menu.querySelector('.menu-functions-heading'),list=menu.querySelector('.menu-shortcuts'),account=menu.querySelector('.menu-account');
   return {scrollTop:menu.scrollTop,overflowX:menu.scrollWidth>menu.clientWidth+1,top:box.top,bottom:box.bottom,clientHeight:menu.clientHeight,scrollHeight:menu.scrollHeight,order:buttons.map(button=>button.dataset.i18n),heights:buttons.map(button=>button.getBoundingClientRect().height),firstTop:buttons[0].getBoundingClientRect().top,lastBottom:buttons.at(-1).getBoundingClientRect().bottom,accountTop:account.getBoundingClientRect().top,headingFirst:heading.nextElementSibling===intro&&intro.nextElementSibling===list&&list.nextElementSibling===account};
  });
  expect(metrics.order).toEqual(['navReports','navStatistics','navPayments','navMaintenance','backupHeading','addApartment','addBooking']);expect(metrics.headingFirst).toBe(true);expect(metrics.scrollTop).toBe(0);expect(metrics.overflowX).toBe(false);
  expect(metrics.heights.every(height=>height>=44&&height<=56)).toBe(true);expect(metrics.accountTop).toBeGreaterThan(metrics.lastBottom);expect(metrics.top).toBeGreaterThanOrEqual(0);expect(metrics.bottom).toBeLessThanOrEqual(height+1);
  if(height>=568){expect(metrics.lastBottom).toBeLessThan(metrics.bottom);expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight+1);}
  if(state==='PREMIUM'&&['folded','unfolded'].includes(profile))await page.screenshot({path:`test-results/Menu-${profile}-${language}.png`});
 }
 // Native details keyboard semantics and access to the existing controls.
 await page.locator('#menu-account>summary').focus();await page.keyboard.press('Enter');await expect(account).toHaveAttribute('open','');
 await expect(page.locator('#commerce-controls')).toBeVisible();await expect(page.locator('#menu-access-details')).toHaveText(await page.locator('#access-details').textContent());
 await expect(page.locator('#account-controls')).toBeVisible();await expect(page.locator(state==='BASIC'?'#google-sign-in':'#google-sign-out')).toBeVisible();
 await page.locator('#close-menu').click();await page.locator('#open-menu').click();await expect(account).not.toHaveAttribute('open','');expect(await page.locator('#app-menu').evaluate(el=>el.scrollTop)).toBe(0);
 if(height<568){await page.locator('#menu-add-booking').scrollIntoViewIfNeeded();await expect(page.locator('#menu-add-booking')).toBeVisible();}
 expect(await page.evaluate(key=>localStorage.getItem(key),dataKey)).toBe(before);expect(errors).toEqual([]);
});

test('menu shortcuts reuse navigation, backup and editors; Google login remains available after expansion',async({page})=>{
 await page.setViewportSize({width:344,height:882});await setup(page);
 const before=await page.evaluate(key=>localStorage.getItem(key),dataKey);
 for(const [button,panel] of [['[data-screen=reports]','#reports-panel'],['#menu-statistics','#statistics-panel'],['#menu-payments','#payments-panel'],['[data-screen=maintenance]','#maintenance-panel']]){
  await page.locator('#open-menu').click();await page.locator('#app-menu '+button).click();await expect(page.locator('#app-menu')).toBeHidden();await expect(page.locator(panel)).toBeVisible();
 }
 await page.locator('#open-menu').click();await page.locator('#open-backup').click();await expect(page.locator('#backup-dialog')).toBeVisible();await page.locator('#close-backup').click();
 await page.locator('#open-menu').click();await expect(page.locator('#menu-add-apartment')).toBeDisabled();await page.locator('#menu-add-booking').click();await expect(page.locator('#editor')).toBeVisible();await page.locator('#cancel').click();
 await page.locator('#open-menu').click();await page.locator('#menu-account>summary').click();await page.locator('#google-sign-in').click();await expect(page.locator('#entry-login')).toBeVisible();await expect(page.locator('#entry-google')).toBeEnabled();await page.locator('#entry-basic').click();
 expect(await page.evaluate(key=>localStorage.getItem(key),dataKey)).toBe(before);
});

test('expanded account preserves logout and compact live status; upgrade opens account intentionally',async({page})=>{
 await setup(page,'PREMIUM');const before=await page.evaluate(key=>localStorage.getItem(key),dataKey);
 await page.locator('#open-menu').click();await page.locator('#menu-account>summary').click();await page.locator('#google-sign-out').click();await expect(page.locator('#menu-access-status')).toContainText('BASIC');await expect(page.locator('#google-sign-in')).toBeVisible();
 await page.locator('#close-menu').click();await page.locator('.access-card summary').click();await page.getByRole('button',{name:'Vezi opțiunile PREMIUM'}).click();await expect(page.locator('#menu-account')).toHaveAttribute('open','');await expect(page.locator('#commerce-controls')).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),dataKey)).toBe(before);
});

test('Fold resize retains function access and account expansion without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:344,height:882});await setup(page,'TRIAL');await page.locator('#open-menu').click();
 for(const [width,height] of [[840,900],[900,600],[344,882]]){
  await page.setViewportSize({width,height});await expect(page.locator('#menu-account')).not.toHaveAttribute('open','');await expect(page.locator('#menu-add-booking')).toBeInViewport();expect(await page.locator('#app-menu').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
 await page.locator('#menu-account>summary').click();await expect(page.locator('#commerce-controls')).toBeVisible();
});
