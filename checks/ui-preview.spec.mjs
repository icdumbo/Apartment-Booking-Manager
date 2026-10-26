import {test,expect} from '@playwright/test';
import {bookingColor} from '../src/timeline.js';
const key='apartment-booking-manager:v1';
const fixture={version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'ui-a',name:'Apartament Central',address:'Adresă de test',city:'Oraș Test'},{id:'ui-b',name:'Studio cu terasă',address:'Adresă de test',city:'Oraș Test'},{id:'ui-c',name:'Apartament Parc',address:'Adresă de test',city:'Oraș Test'}],bookings:[{id:'ui-one',apartmentId:'ui-a',guest:'Client Test A',phone:'0700000000',checkIn:'2026-10-04',checkOut:'2026-10-10',status:'confirmed'},{id:'ui-two',apartmentId:'ui-a',guest:'Client Test B',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-15',status:'unconfirmed'}]};
for(const width of [360,390,430,840,1440])test(`final interface ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(({key,fixture})=>localStorage.setItem(key,JSON.stringify(fixture)),{key,fixture});await page.reload();const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await expect(page.locator('.day-heading')).toHaveCount(30);await expect(page.locator('.app-navigation [data-screen=reports]')).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const [status,id] of [['confirmed','ui-one'],['unconfirmed','ui-two']]){
  const bar=page.locator(`.booking.${status}`);
  expect(await bar.evaluate(el=>el.style.getPropertyValue('--booking-color'))).toBe(bookingColor(id));
  expect(await bar.evaluate(el=>getComputedStyle(el).borderTopStyle)).toBe(status==='confirmed'?'solid':'dashed');
  await expect(bar.locator('.booking-status-icon')).toHaveText(status==='confirmed'?'✓':'◷');
 }
 expect(bookingColor('ui-one')).not.toBe(bookingColor('ui-two'));
 await page.screenshot({path:`test-results/Final-UI-${width}.png`,fullPage:true});
 await page.locator('[data-screen=apartments]').click();await expect(page.locator('.apartment-card')).toHaveCount(3);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/Apartments-UI-${width}.png`,fullPage:true});await page.locator('[data-screen=calendar]').click();
 await page.locator('#open-menu').click();await expect(page.locator('#app-menu')).toBeVisible();await expect(page.locator('#access-message')).toContainText('BASIC');await expect(page.locator('#menu-add-apartment')).toBeDisabled();await expect(page.locator('#menu-add-booking')).toBeEnabled();await page.locator('#menu-add-booking').click();await expect(page.locator('#editor')).toBeVisible();await page.locator('#cancel').click();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
test('standalone preview runs the actual interface without external assets',async({page})=>{await page.goto('/ui-preview/Apartment-Booking-Manager-UI.html');await expect(page.locator('.day-heading')).toHaveCount(30);await expect(page.locator('#timeline .empty')).toBeVisible();await page.locator('#open-menu').click();await expect(page.locator('#app-menu')).toBeVisible();});
