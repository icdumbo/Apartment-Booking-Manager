import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {collectionsFixture as fixture} from './fixtures/collections.mjs';
import {xlsxParts} from './helpers/xlsx.mjs';
test.use({hasTouch:true});
async function load(page,expired=false){await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(({data,expired})=>{localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(data));if(expired)localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:0,lastSeen:0}));},{data:fixture,expired});await page.reload();await page.locator('.app-navigation [data-screen=reports]').click();}
for(const width of [360,430,768,1440])test(`offline Excel download RO/EN ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await load(page);const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'));await page.context().setOffline(true);
 for(const language of ['ro','en']){
  await page.locator(`.top [data-language=${language}]`).click();const button=page.locator('#report-export-excel');await expect(button).toHaveText('Export Excel');await expect(button).toBeEnabled();
  const [download]=await Promise.all([page.waitForEvent('download'),button.tap()]);expect(download.suggestedFilename()).toBe('Reservations-2026-10-01-2026-10-31-RON.xlsx');expect(await download.failure()).toBe(null);
  const parts=xlsxParts(await readFile(await download.path()));expect(parts['xl/worksheets/sheet1.xml']).toContain(language==='ro'?'Raport rezervări':'Reservations Report');expect(parts['xl/worksheets/sheet1.xml']).toMatch(/<c r="C5" s="7"><f>G\d+<\/f><v>1600<\/v><\/c>/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.locator('#report-currency').selectOption('EUR');await page.locator('#report-apartmentId').selectOption('b');const [eur]=await Promise.all([page.waitForEvent('download'),page.locator('#report-export-excel').tap()]);const sheet=xlsxParts(await readFile(await eur.path()))['xl/worksheets/sheet1.xml'];expect(sheet).toContain('Client Test EUR');expect(sheet).not.toContain('Client Test Cross');expect(sheet).toMatch(/<c r="C5" s="7"><f>G\d+<\/f><v>500<\/v><\/c>/);
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
});
test('BASIC, expired trial and invalid filters cannot download',async({page})=>{
 await load(page,true);await expect(page.locator('#report-export-excel')).not.toBeVisible();await expect(page.locator('#report-export-excel')).toBeDisabled();
 await page.evaluate(()=>localStorage.removeItem('apartment-booking-manager:access:v1'));await page.reload();await page.locator('.app-navigation [data-screen=reports]').click();
 await page.locator('#report-start').fill('2026-11-01');await page.locator('#report-start').dispatchEvent('change');await expect(page.locator('#report-export-excel')).toBeDisabled();
 await page.locator('#report-start').fill('2026-10-01');await page.locator('#report-start').dispatchEvent('change');await expect(page.locator('#report-export-excel')).toBeEnabled();
 const downloads=[];page.on('download',d=>downloads.push(d));await page.clock.setSystemTime(new Date('2026-10-22T09:00:00Z'));await page.locator('#report-export-excel').tap();await expect(page.locator('#reports-locked')).toBeVisible();expect(downloads).toHaveLength(0);
});
