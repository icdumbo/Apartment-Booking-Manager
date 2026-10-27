import {test,expect} from '@playwright/test';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
const key='apartment-booking-manager:v1';
const data={version:1,migrations:{originalDemoRemoved:true},apartments:Array.from({length:12},(_,i)=>({id:`a${i}`,name:`Apartament Test ${i+1}`,address:'Adresă test',city:'Oraș test'})),bookings:[]};
test.use({isMobile:true,hasTouch:true});
for(const [width,height] of [[344,882],[360,800],[430,932],[840,690],[840,900],[1280,800]])test(`last apartment reachable on first load and resize ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('/');await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data});await seedBrowserTrial(page);await page.reload();
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 for(const language of ['ro','en']){
  await page.locator(`.top [data-language=${language}]`).click();
  if(language==='en'){await page.setViewportSize({width,height:height-80});await page.locator('.app-navigation [data-screen=apartments]').click();await page.locator('.app-navigation [data-screen=calendar]').click();}
  await page.locator('.timeline-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await expect.poll(async()=>page.evaluate(()=>{const v=document.querySelector('.timeline-scroll'),last=document.querySelector('.timeline-row:last-child'),nav=document.querySelector('.app-navigation');return last.getBoundingClientRect().bottom-Math.min(nav.getBoundingClientRect().top,v.getBoundingClientRect().bottom);})).toBeLessThanOrEqual(1);
  const m=await page.evaluate(()=>{const v=document.querySelector('.timeline-scroll'),last=document.querySelector('.timeline-row:last-child'),nav=document.querySelector('.app-navigation');return {bottom:last.getBoundingClientRect().bottom,nav:nav.getBoundingClientRect().top,view:v.getBoundingClientRect().bottom};});
  expect(m.bottom).toBeLessThanOrEqual(Math.min(m.nav,m.view)+1);
  await page.locator('.timeline-scroll').evaluate(el=>{el.scrollLeft=100;});
  const sticky=await page.evaluate(()=>{const v=document.querySelector('.timeline-scroll'),h=document.querySelector('.timeline-head'),a=document.querySelector('.timeline-row:last-child .apartment-label');return {top:h.getBoundingClientRect().top-v.getBoundingClientRect().top,left:a.getBoundingClientRect().left-v.getBoundingClientRect().left};});expect(Math.abs(sticky.top)).toBeLessThan(1);expect(Math.abs(sticky.left)).toBeLessThan(1);
  await page.locator('.timeline-row:last-child .apartment-label').click();await expect(page.locator('[name=name]')).toHaveValue('Apartament Test 12');await page.locator('#cancel').click();
 }
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
test('report dates have explicit DD/MM/YYYY in RO and EN, independent of browser locale',async({page})=>{
 await page.goto('/');await seedBrowserTrial(page);await page.reload();await page.locator('.app-navigation [data-screen=reports]').click();
 for(const language of ['ro','en']){await page.locator(`.top [data-language=${language}]`).click();await expect(page.locator('#report-start')).toHaveAttribute('type','text');await page.locator('#report-start').fill('01102026');await page.locator('#report-start').dispatchEvent('change');await expect(page.locator('#report-start')).toHaveValue('01/10/2026');await page.locator('#report-end').fill('31.10.2026');await page.locator('#report-end').dispatchEvent('change');await expect(page.locator('#report-end')).toHaveValue('31/10/2026');await expect(page.locator('#report-error')).not.toBeVisible();}
});
test('consecutive stays appear in calendar, apartment and offline report exports after reload',async({page})=>{
 await page.clock.install({time:new Date('2026-10-27T09:00:00Z')});await page.goto('/');
 const state=structuredClone(data);state.bookings=[{id:'alpha',apartmentId:'a0',guest:'Client Test Alpha',phone:'0700000000',checkIn:'2026-10-22',checkOut:'2026-10-28',status:'confirmed',totalAmountCents:50000},{id:'beta',apartmentId:'a0',guest:'Client Test Beta',phone:'0700000000',checkIn:'2026-10-28',checkOut:'2026-10-30',status:'unconfirmed'}];
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state});await seedBrowserTrial(page);await page.reload();
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await expect(page.locator('.booking')).toHaveCount(2);await expect(page.locator('.handover')).toHaveCount(1);
 await page.locator('.app-navigation [data-screen=apartments]').click();await page.locator('.apartment-reservations summary').click();await expect(page.locator('.apartment-booking-link')).toHaveCount(2);
 await page.locator('.app-navigation [data-screen=reports]').click();await page.context().setOffline(true);
 await expect(page.locator('.report-card')).toHaveCount(2);
 for(const selector of ['#report-export-excel','#report-export-pdf']){const [download]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);expect(await download.failure()).toBe(null);}
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
 await page.context().setOffline(false);await page.reload();await page.locator('.app-navigation [data-screen=reports]').click();await expect(page.locator('.report-card')).toHaveCount(2);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
