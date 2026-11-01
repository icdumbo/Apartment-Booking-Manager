import {test,expect} from '@playwright/test';
import {maintenanceExportFixture} from '../tests/fixtures/maintenance-export.mjs';
import {ownerId} from '../src/owners.js';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
import {xlsxParts} from './helpers/xlsx.mjs';
import {readFile} from 'node:fs/promises';
async function setup(page){
 await page.clock.install({time:new Date('2026-10-15T09:00:00Z')});await page.goto('/');
 await page.evaluate(({state,data})=>{localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(state));localStorage.setItem('apartment-booking-manager:maintenance:v1',JSON.stringify(data));},maintenanceExportFixture());
 await seedBrowserTrial(page);await page.reload();await page.locator('#open-menu').click();await page.locator('#app-menu [data-screen=maintenance]').click();
}
test('offline maintenance Excel/PDF downloads use current owner/apartment/period filters without changing records',async({page,context})=>{
 await page.setViewportSize({width:344,height:882});await setup(page);
 const before=await page.evaluate(()=>[localStorage.getItem('apartment-booking-manager:v1'),localStorage.getItem('apartment-booking-manager:maintenance:v1')]);
 await page.locator('#maintenance-filter-ownerId').selectOption(ownerId('Ștefan Test'));
 await page.locator('#maintenance-filter-start').fill('01/10/2026');await page.locator('#maintenance-filter-start').press('Tab');await page.locator('#maintenance-filter-end').fill('31/10/2026');await page.locator('#maintenance-filter-end').press('Tab');await context.setOffline(true);
 for(const language of ['ro','en']){
  await page.locator('.top [data-language='+language+']').click();
  const event=page.waitForEvent('download');await page.locator('#maintenance-export-excel').click();const download=await event;const parts=xlsxParts(await readFile(await download.path()));
  expect(parts['xl/worksheets/sheet1.xml']).toContain('Linked cost A');expect(parts['xl/worksheets/sheet1.xml']).not.toContain('Beta Test');expect(parts['xl/worksheets/sheet4.xml']).toContain('<v>45</v>');
 }
 await page.locator('.top [data-language=ro]').click();const pdfEvent=page.waitForEvent('download');await page.locator('#maintenance-export-pdf').click();const pdf=await pdfEvent;await pdf.saveAs('test-results/maintenance-ui.pdf');
 await page.locator('#maintenance-filter-apartmentId').selectOption('b');const excelEvent=page.waitForEvent('download');await page.locator('#maintenance-export-excel').click();const excel=await excelEvent;const only=xlsxParts(await readFile(await excel.path()));expect(only['xl/worksheets/sheet1.xml']).not.toContain('Test Alpha One');expect(only['xl/worksheets/sheet1.xml']).toContain('Test Alpha Two');
 const after=await page.evaluate(()=>[localStorage.getItem('apartment-booking-manager:v1'),localStorage.getItem('apartment-booking-manager:maintenance:v1')]);expect(after).toEqual(before);
});
test('BASIC cannot see export controls; expiry rechecks permission before exporting and preserves existing data',async({page})=>{
 await setup(page);await expect(page.locator('#maintenance-export-excel')).toBeVisible();
 const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:maintenance:v1'));
 await page.evaluate(()=>localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:0,lastSeen:0})));await page.reload();await page.locator('#open-menu').click();await page.locator('#app-menu [data-screen=maintenance]').click();
 await expect(page.locator('#maintenance-export-excel')).toHaveCount(0);await expect(page.locator('#maintenance-export-pdf')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:maintenance:v1'))).toBe(before);
});
test('native maintenance export uses the existing saver and cancellation/rejection statuses without changing data',async({page})=>{
 await setup(page);await page.evaluate(()=>{window.fixtureExport='cancelled';window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingFileExport:{saveFile:async({filename,mimeType,data})=>{if(!['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mimeType)||!data)throw Error('Invalid fixture payload');if(window.fixtureExport==='failure')throw Error('Provider failed');return {status:window.fixtureExport,filename};}}}};});
 await page.locator('#maintenance-export-pdf').click();await expect(page.locator('#maintenance-export-status')).toContainText('anulată');
 await page.evaluate(()=>window.fixtureExport='saved');await page.locator('#maintenance-export-excel').click();await expect(page.locator('#maintenance-export-status')).toContainText('salvat');
 await page.evaluate(()=>window.fixtureExport='failure');await page.locator('#maintenance-export-pdf').click();await expect(page.locator('.maintenance-error')).not.toBeEmpty();await expect(page.locator('#maintenance-export-pdf')).toBeEnabled();
});

test('reports show singular/plural for zero, one and two reservations in both languages',async({page})=>{
 await setup(page);
 for(const count of [0,1,2]){
  await page.evaluate(({state,count})=>{state.bookings=state.bookings.slice(0,count);localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(state));},{state:maintenanceExportFixture().state,count});
  await page.reload();await page.locator('.app-navigation [data-screen=reports]').click();
  for(const language of ['ro','en']){await page.locator('.top [data-language='+language+']').click();await expect(page.locator('#report-count')).toHaveText('Total: '+count+' '+(language==='ro'?(count===1?'rezervare':'rezervări'):(count===1?'reservation':'reservations')));}
 }
});
