import {test,expect} from '@playwright/test';
import {photo64} from '../tests/fixtures/backup-photo.mjs';

for(const [width,height] of [[360,800],[840,690]]){
 test(`apartment photo, address and twelve calendar rows at ${width}×${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.clock.setFixedTime(new Date('2026-11-07T12:00:00Z'));
  await page.goto('/');
  await page.evaluate(async photo64=>{
   const {apartmentPhotos}=await import('/src/apartment-photo.js');
   const photoId=await apartmentPhotos.write(new Blob([Uint8Array.from(atob(photo64),c=>c.charCodeAt(0))],{type:'image/jpeg'}));
   localStorage.setItem('apartment-booking-manager:v1',JSON.stringify({
    version:1,migrations:{originalDemoRemoved:true},
    apartments:Array.from({length:12},(_,i)=>({id:'fixture-'+i,name:'Apartament '+(i+1),owner:'Proprietar test',address:'Strada fictivă cu o adresă lungă, numărul 123, corpul B, apartamentul 14',city:'Oraș test',...(i===0?{photoId}:{})})),
    bookings:[]
   }));
  },photo64);
  await page.reload();
  const rows=page.locator('.timeline-row');
  await expect(rows).toHaveCount(12);
  const address=rows.first().locator('.apartment-address');
  await expect(rows.first().locator('.apartment-owner')).toHaveText('Proprietar test');
  const lineCount=await address.evaluate(el=>el.clientHeight/parseFloat(getComputedStyle(el).lineHeight));
  expect(lineCount).toBeCloseTo(2,0);
  const row=rows.first();
  const cell=await row.locator('.day-cell').first().boundingBox();
  const label=await row.locator('.apartment-label').boundingBox();
  expect(cell.y).toBeCloseTo(label.y,0);
  expect(cell.height).toBeCloseTo(label.height,0);
  await page.locator('.timeline-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await expect(rows.last().locator('.apartment-label')).toBeInViewport();
  await row.locator('.apartment-label').click();
  const dialog=page.locator('#editor');
  await expect(dialog.locator('.apartment-photo-preview img')).toBeVisible();
  expect((await dialog.locator('.apartment-photo-preview').boundingBox()).height).toBe(width>=700?165:135);
  const input=dialog.locator('textarea[name=address]');
  await input.fill('Strada de test\nNumărul 123, corpul B');
  const before=(await input.boundingBox()).height;
  await input.fill('Strada de test\nNumărul 123, corpul B\nEtajul 2\nApartamentul 14');
  expect((await input.boundingBox()).height).toBeGreaterThan(before);
  await input.fill('Strada de test\nNumărul 123, corpul B');
  const dialogBox=await dialog.boundingBox();
  for(const selector of ['#delete','#cancel','button[type=submit]']){
   const button=await dialog.locator(selector).boundingBox();
   expect(button.y+button.height).toBeLessThanOrEqual(dialogBox.y+dialogBox.height);
  }
  await dialog.locator('button[type=submit]').click();
  await expect(dialog).not.toBeVisible();
  await expect(address).toContainText('Numărul 123, corpul B');
 });
}
