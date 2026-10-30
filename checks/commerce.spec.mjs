import {test,expect} from '@playwright/test';
const key='apartment-booking-manager:v1';
test('BASIC offers upgrade at three apartments, with no configured purchase or auth requirement and no data loss offline',async({page,context})=>{
 await page.addInitScript(()=>{localStorage.setItem('apartment-booking-manager:welcome:v1','dismissed');localStorage.setItem('apartment-booking-manager:v1',JSON.stringify({version:1,migrations:{originalDemoRemoved:true},apartments:Array.from({length:3},(_,i)=>({id:'a'+i,name:'Fixture '+i,address:'Test street',city:'Test city'})),bookings:[]}));});
 await page.goto('/');await expect(page.locator('#add-apartment')).toBeDisabled();const before=await page.evaluate(key=>localStorage.getItem(key),key);await context.setOffline(true);
 await page.locator('.access-card summary').click();await page.getByRole('button',{name:'Vezi opțiunile PREMIUM'}).click();await expect(page.locator('#commerce-controls')).toBeVisible();await expect(page.locator('#commerce-controls button').first()).toBeDisabled();await expect(page.locator('#account-controls')).toBeHidden();
 await page.locator('#app-menu [data-language=en]').click();await expect(page.locator('#commerce-controls')).toContainText('one Google Play purchase');expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(before);
});
test('UI-only Play fixture: pending/cancelled cannot unlock access; verified receipt and explicit restore use native proof boundary',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('apartment-booking-manager:welcome:v1','dismissed');window.fixturePurchase='pending';let state='BASIC';
  window.Capacitor={getPlatform:()=> 'android',Plugins:{
   BookingAuth:{addListener:async()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:{uid:'commerce-fixture'}}),getIdToken:async()=>({token:'fixture-token'})},
   BookingAccess:{beginVerification:async()=>({nonce:'01234567-0123-0123-0123-012345678901'}),acceptProof:async({proof})=>{if(proof==='fixture-purchase-proof')state='PREMIUM';},getAccess:async()=>({subject:'commerce-fixture',state,premiumSource:state==='PREMIUM'?'GOOGLE_PLAY_PURCHASE':null})},
   BookingBilling:{getProduct:async()=>({available:true,price:'49,99 TEST'}),purchase:async()=>({status:window.fixturePurchase,purchaseToken:'fixture-receipt'}),restore:async()=>({purchases:[{status:'purchased',purchaseToken:'fixture-receipt'}]})}
  }};
 });
 await page.route('https://apartment-booking-access.ionutliviucraciun1982.workers.dev/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:1,proof:route.request().url().endsWith('/purchase')?'fixture-purchase-proof':'fixture-basic-proof'})}));
 await page.goto('/');await page.locator('#open-menu').click();const buy=page.locator('#commerce-controls button').first();await expect(buy).toContainText('49,99 TEST');await buy.click();await expect(page.locator('#commerce-controls [role=status]')).toContainText('așteptare');await expect(page.locator('#access-message')).toContainText('BASIC');
 await page.evaluate(()=>window.fixturePurchase='cancelled');await buy.click();await expect(page.locator('#commerce-controls [role=status]')).toContainText('anulată');await expect(page.locator('#access-message')).toContainText('BASIC');
 await page.locator('#commerce-controls button').nth(1).click();await expect(page.locator('#access-message')).toContainText('PREMIUM');await expect(buy).toBeDisabled();expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:access:v1'))).toBeNull();
});
