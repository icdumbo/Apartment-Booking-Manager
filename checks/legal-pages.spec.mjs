import {test,expect} from '@playwright/test';
import {renderLegalPages} from '../scripts/prepare-legal-pages.mjs';
import {privacySettings} from '../src/privacy-settings.js';
const pages=renderLegalPages({configuration:{...privacySettings,brand:'Fictional brand',operator:'Fictional controller',contact:'privacy@example.invalid'}});

test('static legal pages have no runtime scripts, preserve existing storage and link both languages',async({page})=>{
 const original=JSON.stringify({version:1,apartments:[{id:'fictional-static',name:'Fictional apartment',address:'Fictional street',city:'Fictional city'}],bookings:[]});
 await page.route('**/legal/*.html',route=>{
  const path=new URL(route.request().url()).pathname.replace(/^\//,'');
  return route.fulfill({contentType:'text/html; charset=utf-8',status:pages[path]?200:404,body:pages[path]??'not found'});
 });
 // Start on an inert page: app startup migrations must not race the fixture.
 await page.goto('/legal/privacy-ro.html');
 await page.evaluate(value=>localStorage.setItem('apartment-booking-manager:v1',value),original);
 for(const width of [320,390,840,1440]){
  await page.setViewportSize({width,height:800});
  for(const path of Object.keys(pages)){
   const response=await page.goto('/'+path);expect(response.status()).toBe(200);
   await expect(page.locator('main')).toBeVisible();
   await expect(page.locator('[role=note]')).toBeVisible();
   await expect(page.locator('script')).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
   expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(original);
   await page.locator('main>p:last-child>a').click();await expect(page.locator('h2')).toBeVisible();
  }
 }
 await page.goto('/legal/privacy-ro.html');await page.getByRole('link',{name:'EN',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await expect(page.locator('h2')).toHaveText('Privacy policy');
});
