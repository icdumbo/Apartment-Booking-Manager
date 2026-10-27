import {test,expect} from '@playwright/test';
import {collectionsFixture} from './fixtures/collections.mjs';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
const profiles=[['phone-360',360,800],['phone-390',390,844],['phone-430',430,932],['fold-folded',344,882],['fold-unfolded',840,900]];
const fixture={...collectionsFixture,bookings:[...collectionsFixture.bookings,
 {id:'visual-one',apartmentId:'a',guest:'Client Test A',phone:'0700000000',checkIn:'2026-10-04',checkOut:'2026-10-10',status:'confirmed'},
 {id:'visual-two',apartmentId:'a',guest:'Client Test B',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-14',status:'unconfirmed'},
 {id:'short-a',apartmentId:'b',guest:'Ana',phone:'0700000000',checkIn:'2026-10-05',checkOut:'2026-10-06',status:'confirmed'},
 {id:'short-b',apartmentId:'b',guest:'Dan',phone:'0700000000',checkIn:'2026-10-06',checkOut:'2026-10-07',status:'unconfirmed'}]};
for(const [name,width,height] of profiles){
 test(`readability and unchanged calendar ${name}`,async({page})=>{
  await page.setViewportSize({width,height});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(s=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(s)),fixture);await seedBrowserTrial(page);await page.reload();
  const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'));
  const shot=async screen=>{expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/Readability-${name}-${screen}.png`});};
  for(const lang of ['ro','en']){
   await page.locator(`.top [data-language=${lang}]`).click();await page.locator('.app-navigation [data-screen=calendar]').click();
   for(const guest of ['Ana','Dan']){
    const label=page.locator('.booking-guest').filter({hasText:new RegExp('^'+guest+'$')});
    const m=await label.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return {font:parseFloat(getComputedStyle(el).fontSize),weight:Number(getComputedStyle(el).fontWeight),text:r.getBoundingClientRect().width,width:el.getBoundingClientRect().width};});
    expect(m.font).toBeGreaterThanOrEqual(11.5);expect(m.weight).toBeGreaterThanOrEqual(600);expect(m.text).toBeLessThanOrEqual(m.width+.5);
   }
   await shot(`calendar-${lang}`);
   await page.locator('.app-navigation [data-screen=statistics]').click();expect(await page.locator('#statistics-primary span').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13.5);await page.evaluate(()=>scrollTo(0,0));await shot(`statistics-${lang}`);
   await page.locator('.statistics-chart').first().evaluate(el=>el.scrollIntoView({block:'start'}));await shot(`charts-${lang}`);
   await page.locator('.app-navigation [data-screen=reports]').click();await page.evaluate(()=>scrollTo(0,0));await shot(`reports-${lang}`);
   await page.locator('.report-card').first().evaluate(el=>el.scrollIntoView({block:'start'}));expect(await page.locator('.report-card dt').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13.5);await shot(`report-list-${lang}`);
  }
  expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
 });
 test(`login information readability ${name}`,async({page})=>{
  await page.setViewportSize({width,height});await page.addInitScript(()=>{window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:async()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:null})}}};});
  await page.goto('/');await page.locator('#entry-to-login').click();
  for(const lang of ['ro','en']){
   await page.locator(`#entry-screen [data-language=${lang}]`).click();await expect(page.locator('#entry-login-terms')).toBeVisible();expect(await page.locator('#entry-login-terms').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
   expect(await page.locator('#entry-screen').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
   await page.screenshot({path:`test-results/Readability-${name}-login-${lang}.png`});
  }
 });
}
