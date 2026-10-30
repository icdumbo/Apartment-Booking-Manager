import {test,expect} from '@playwright/test';
import {collectionsFixture} from './fixtures/collections.mjs';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';

// Screenshot data stays in an isolated test browser, never in the real app.
const fixture={...collectionsFixture,bookings:[...collectionsFixture.bookings,
 {id:'visual-one',apartmentId:'a',guest:'Client Test A',phone:'0700000000',checkIn:'2026-10-04',checkOut:'2026-10-10',status:'confirmed',currency:'RON',totalAmountCents:150000,paidAmountCents:50000,payments:[{id:'visual-payment',date:'2026-10-05',amountCents:50000,method:'transfer'}]},
 {id:'visual-two',apartmentId:'a',guest:'Client Test B',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-14',status:'unconfirmed'}
]};
for(const width of [390,1440])test(`PREMIUM reference captures and navigation ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});
 await page.goto('/');await page.evaluate(data=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(data)),fixture);await seedBrowserTrial(page);await page.reload();
 const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'));
 const capture=async(name,fullPage=true)=>{
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/Premium-${name}-${width}.png`,fullPage});
 };
 await expect(page.locator('.day-heading')).toHaveCount(30);await capture('calendar');
 await page.locator('.booking.confirmed').filter({hasText:'Client Test A'}).click();await expect(page.locator('#editor')).toBeVisible();await capture('reservation',false);await page.locator('#cancel').click();
 await page.locator('.app-navigation [data-screen=apartments]').click();await expect(page.locator('.apartment-card')).toHaveCount(2);await expect(page.locator('.apartment-photo')).toHaveText(['Fără fotografie','Fără fotografie']);await capture('apartments');
 await page.locator('.apartment-card').first().click();await expect(page.locator('#editor')).toBeVisible();await capture('apartment-details',false);await page.locator('#cancel').click();
 await page.locator('.app-navigation [data-screen=statistics]').click();await expect(page.locator('#statistics-primary>div')).toHaveCount(4);await capture('statistics');
 await page.locator('.app-navigation [data-screen=reports]').click();await expect(page.locator('#reports-content')).toBeVisible();await capture('reports');
 await page.locator('#open-menu').click();await expect(page.locator('#app-menu')).toBeVisible();await capture('menu',false);
 await page.locator('#menu-payments').click();await expect(page.locator('#collections-content')).toBeVisible();await capture('payments');
 await page.locator('.top [data-language=en]').click();await expect(page.locator('h1')).toHaveText('Payments');
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
 // Isolated browser fixture only: capture the existing BASIC presentation too.
 await page.locator('.top [data-language=ro]').click();
 await page.evaluate(()=>localStorage.removeItem('apartment-booking-manager:access:v1'));await page.reload();
 await page.locator('.app-navigation [data-screen=statistics]').click();await expect(page.locator('#statistics-locked')).toBeVisible();await capture('premium-presentation');
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
});


test('stable multicolor bookings, independent status and RO/EN legend',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});
 await page.goto('/');await page.evaluate(data=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(data)),fixture);await seedBrowserTrial(page);await page.reload();
 const bar=()=>page.locator('.booking').filter({hasText:'Client Test A'});
 const color=await bar().evaluate(el=>getComputedStyle(el).backgroundColor);
 await expect(bar().locator('.booking-status-icon')).toHaveText('✓');
 await bar().click();await page.locator('#fields select[name=status]').selectOption('unconfirmed');await page.locator('#editor-form button[type=submit]').click();
 await expect(bar()).toHaveClass(/unconfirmed/);await expect(bar().locator('.booking-status-icon')).toHaveText('◷');
 expect(await bar().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(color);
 expect(await bar().evaluate(el=>getComputedStyle(el).borderTopStyle)).toBe('dashed');
 await page.reload();expect(await bar().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(color);
 await page.locator('.app-navigation [data-screen=apartments]').click();await page.locator('.app-navigation [data-screen=calendar]').click();
 expect(await bar().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(color);
 await expect(page.locator('.legend>span')).toHaveCount(4);await expect(page.locator('.legend .color-key,.legend [data-i18n=halfDays]')).toHaveCount(0);
 await page.locator('.top [data-language=en]').click();await expect(page.locator('.legend>span')).toHaveCount(4);await expect(page.locator('.legend')).not.toContainText('Distinct reservation colors');
 expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(248, 250, 252)');
});
