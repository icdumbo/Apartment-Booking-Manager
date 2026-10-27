import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
import {collectionsFixture} from './fixtures/collections.mjs';
import {xlsxParts} from './helpers/xlsx.mjs';
const key='apartment-booking-manager:v1';
for(const width of [360,430,840])test(`mixed-currency report and exports offline RO/EN ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-10-27T09:00:00Z')});await page.goto('/');
 const data=structuredClone(collectionsFixture);data.bookings=[{id:'ron',apartmentId:'a',guest:'Client Test Alpha',phone:'0700000000',checkIn:'2026-10-22',checkOut:'2026-10-28',status:'confirmed',totalAmountCents:50000,paidAmountCents:10000},{id:'eur',apartmentId:'a',guest:'Client Test Beta',phone:'0700000000',checkIn:'2026-10-28',checkOut:'2026-10-30',status:'unconfirmed',currency:'EUR',totalAmountCents:35000,paidAmountCents:10000,payments:[{id:'p',date:'2026-10-28',amountCents:10000,method:'card'}]}];
 await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data});await seedBrowserTrial(page);await page.reload();const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.locator('.app-navigation [data-screen=reports]').click();await page.context().setOffline(true);
 for(const language of ['ro','en']){
  await page.locator(`.top [data-language=${language}]`).click();await expect(page.locator('#report-currency')).toHaveValue('ALL');await expect(page.locator('#report-currency option:checked')).toHaveText(language==='ro'?'Toate monedele':'All currencies');
  await expect(page.locator('#report-start')).toHaveValue('01/10/2026');await expect(page.locator('.report-card')).toHaveCount(2);
  await expect(page.locator('#report-total-RON')).toHaveText('500,00 RON');await expect(page.locator('#report-total-EUR')).toHaveText('350,00 EUR');await expect(page.locator('#report-received-RON')).toHaveText('100,00 RON');await expect(page.locator('#report-received-EUR')).toHaveText('100,00 EUR');await expect(page.locator('#report-balance-RON')).toHaveText('400,00 RON');await expect(page.locator('#report-balance-EUR')).toHaveText('250,00 EUR');
  for(const type of ['excel','pdf']){const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#report-export-'+type).click()]);expect(d.suggestedFilename()).toContain('-ALL.');const bytes=await readFile(await d.path());if(type==='excel'){const sheet=xlsxParts(bytes)['xl/worksheets/sheet1.xml'];expect(sheet).toContain('Client Test Alpha');expect(sheet).toContain('Client Test Beta');}else expect(bytes.subarray(0,5).toString()).toBe('%PDF-');}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.locator('#report-currency').selectOption('RON');await expect(page.locator('.report-card')).toHaveCount(1);await expect(page.locator('#report-total')).toHaveText('500,00 RON');await page.locator('#report-currency').selectOption('ALL');await page.locator('#report-status').selectOption('unconfirmed');await expect(page.locator('.report-card')).toHaveCount(1);await expect(page.locator('#report-total-EUR')).toHaveText('350,00 EUR');await expect(page.locator('#report-total-RON')).toHaveCount(0);
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
