import {test,expect} from '@playwright/test';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
import {collectionsFixture} from './fixtures/collections.mjs';
import {xlsxParts} from './helpers/xlsx.mjs';
import {readFile} from 'node:fs/promises';
const key='apartment-booking-manager:v1';
test.use({hasTouch:true,isMobile:true});
for(const width of [344,360,430,840,800])test(`report currency matrix, general counters and grouped Excel ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data:collectionsFixture});await seedBrowserTrial(page);await page.reload();
 const before=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('.app-navigation [data-screen=reports]').click();await page.context().setOffline(true);
 for(const language of ['ro','en']){
  await page.locator(`.top [data-language=${language}]`).click();
  await expect(page.locator('#report-count')).toHaveText(language==='ro'?'Total rezervări: 4':'Total reservations: 4');
  await expect(page.locator('#report-unpriced')).toHaveText(language==='ro'?'Fără valoare completată: 1':'Unspecified value: 1');
  await expect(page.locator('.report-summary-table thead th')).toHaveText(language==='ro'?['Indicator','RON','EUR']:['Metric','RON','EUR']);
  await expect(page.locator('.report-summary-table tbody tr')).toHaveCount(4);
  await expect(page.locator('.report-summary-table tbody tr').first().locator('td')).toHaveText(['3','1']);
  await expect(page.locator('#report-total-RON')).toHaveText('1.600,00 RON');await expect(page.locator('#report-total-EUR')).toHaveText('500,00 EUR');
  await expect(page.locator('#report-explanation')).not.toHaveAttribute('open');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.report-summary-table').evaluate(el=>parseFloat(getComputedStyle(el.querySelector('td')).fontSize))).toBeGreaterThanOrEqual(13);
  await page.screenshot({path:`test-results/Report-summary-${width}-${language}.png`,fullPage:true});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#report-export-excel').click()]);
  const parts=xlsxParts(await readFile(await download.path()));expect(parts['xl/workbook.xml']).toContain(language==='ro'?'Pe apartamente':'By apartment');
  const grouped=parts['xl/worksheets/sheet2.xml'];expect(grouped).not.toContain('autoFilter');
  for(const guest of ['Client Test Unknown','Client Test Cross','Client Test EUR','Client Test Legacy'])expect(grouped.split(guest).length-1).toBe(1);
 }
 await page.locator('#report-status').selectOption('unconfirmed');await expect(page.locator('#report-unpriced')).toContainText('0');await expect(page.locator('.report-card')).toHaveCount(0);
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
