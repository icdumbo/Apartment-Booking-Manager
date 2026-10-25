import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
import {test,expect} from '@playwright/test';
import {collectionsFixture as fixture} from './fixtures/collections.mjs';
test.use({hasTouch:true});
const key='apartment-booking-manager:v1';
async function load(page,{expired=false}={}){
 await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');
 const data=structuredClone(fixture);data.bookings[0].status='unconfirmed';
 await page.evaluate(({key,data,expired})=>{localStorage.setItem(key,JSON.stringify(data));},{key,data,expired});await seedBrowserTrial(page,{expired});await page.reload();
}
const reports=page=>page.locator('.app-navigation [data-screen=reports]').click();
for(const width of [360,390,430,768,1440])test(`report responsive RO/EN ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await load(page);const before=await page.evaluate(k=>localStorage.getItem(k),key);const trial=await page.evaluate(()=>JSON.parse(localStorage.getItem('apartment-booking-manager:access:v1')).startedAt);
 await page.context().setOffline(true);await reports(page);
 for(const language of ['ro','en']){
  await page.locator(`.top [data-language=${language}]`).click();await expect(page.locator('#reports-content h2')).toHaveText(language==='ro'?'Raport rezervări':'Reservations Report');
  const explanation=page.locator('#report-explanation');await expect(explanation).not.toHaveAttribute('open');
  await expect(page.locator('#report-count')).toBeVisible();await expect(page.locator('#report-count')).toHaveText(language==='ro'?'3 rezervări':'3 reservations');
  await expect(explanation.locator('summary')).toHaveText(language==='ro'?'Cum se calculează raportul?':'How is the report calculated?');
  await expect(explanation.locator('[data-i18n=reportBasis]')).not.toBeVisible();await expect(page.locator('#report-notice')).not.toBeVisible();
  await explanation.locator('summary').tap();await expect(explanation).toHaveAttribute('open','');
  await expect(explanation.locator('[data-i18n=reportBasis]')).toBeVisible();await expect(explanation.locator('[data-i18n=reportBasis]')).toContainText('check-out');
  await expect(page.locator('#report-notice')).toContainText(language==='ro'?'1 fără valoare':'1 without a value');await expect(page.locator('#report-notice')).toContainText('200,00 RON');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await explanation.locator('summary').tap();await expect(explanation).not.toHaveAttribute('open');
  await expect(page.locator('.report-card')).toHaveCount(3);await expect(page.locator('#report-total')).toHaveText('1.600,00 RON');await expect(page.locator('#report-received')).toHaveText('700,00 RON');await expect(page.locator('#report-balance')).toHaveText('900,00 RON');
  await expect(page.locator('#report-list .report-card[data-booking-id=cross]')).toContainText('03/11/2026');await expect(page.locator('#report-list .report-card[data-booking-id=legacy] .report-legacy')).toContainText('200,00 RON');
  const layout=await page.locator('#reports-panel').evaluate(root=>({overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...root.querySelectorAll('input,select,dd,dt,h3')].some(el=>{const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+.5;})}));expect(layout).toEqual({overflow:false,clipped:false});
 }
 await page.locator('[data-screen=calendar]').click();await expect(page.locator('#calendar-panel')).toBeVisible();await page.locator('#open-menu').click();await page.locator('#app-menu [data-screen=reports]').click();await expect(page.locator('#app-menu')).not.toBeVisible();await expect(page.locator('#reports-content')).toBeVisible();
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);await page.context().setOffline(false);await page.reload();await reports(page);await expect(page.locator('.report-card')).toHaveCount(3);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('apartment-booking-manager:access:v1')).startedAt)).toBe(trial);
});
test('filters, invalid and empty periods, and currency stay independent offline',async({page})=>{
 await load(page);await reports(page);await page.context().setOffline(true);
 await page.locator('#report-status').selectOption('unconfirmed');await expect(page.locator('.report-card')).toHaveCount(1);await expect(page.locator('#report-total')).toHaveText('1.000,00 RON');
 await page.locator('#report-apartmentId').selectOption('b');await expect(page.locator('.report-card')).toHaveCount(0);await expect(page.locator('#report-total')).toHaveText('0,00 RON');
 await page.locator('#report-status').selectOption('all');await page.locator('#report-currency').selectOption('EUR');await expect(page.locator('.report-card')).toHaveCount(1);await expect(page.locator('#report-total')).toHaveText('500,00 EUR');await expect(page.locator('#report-balance')).toHaveText('400,00 EUR');
 await page.locator('#report-start').fill('2026-11-01');await page.locator('#report-start').dispatchEvent('change');await expect(page.locator('#report-error')).toBeVisible();await expect(page.locator('.report-card')).toHaveCount(0);
 await page.locator('#report-end').fill('2026-11-30');await page.locator('#report-end').dispatchEvent('change');await expect(page.locator('#report-error')).not.toBeVisible();await expect(page.locator('#report-list')).toContainText('Nu există');
});
test('BASIC and expiry lock report without changing stored bookings',async({page})=>{
 await load(page,{expired:true});const before=await page.evaluate(k=>localStorage.getItem(k),key);await reports(page);await expect(page.locator('#reports-locked')).toBeVisible();await expect(page.locator('#reports-content')).not.toBeVisible();await expect(page.locator('.report-card')).toHaveCount(0);
 await load(page);await reports(page);await expect(page.locator('.report-card')).toHaveCount(3);await page.clock.setSystemTime(new Date('2026-10-22T09:00:00Z'));await page.locator('#report-currency').selectOption('EUR');await expect(page.locator('#reports-locked')).toBeVisible();await expect(page.locator('.report-card')).toHaveCount(0);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
