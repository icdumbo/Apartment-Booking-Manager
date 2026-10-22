import {test,expect} from '@playwright/test';
import {collectionsFixture as fixture} from './fixtures/collections.mjs';
for(const [width,language] of [[320,'ro'],[360,'en'],[390,'ro'],[1440,'en']])test(`chart value table ${width} ${language}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');
 const data=structuredClone(fixture);data.bookings.push({...data.bookings[0],id:'past',checkIn:'2025-10-10',checkOut:'2025-10-12',totalAmountCents:150000,paidAmountCents:150000,payments:[{id:'past',date:'2025-10-11',amountCents:150000,method:'cash'}]});
 await page.evaluate(data=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(data)),data);await page.reload();await page.locator(`.top [data-language=${language}]`).click();await page.locator('.app-navigation [data-screen=statistics]').click();await page.locator('#statistics-mode').selectOption('comparison');
 for(const section of await page.locator('.statistics-chart').all()){
  await expect(section.locator('> p')).not.toContainText(/blue|albastru/);await section.locator('summary').click();await expect(section.locator('.statistics-values tr')).toHaveCount(13);
  const layout=await section.locator('.statistics-values').evaluate(table=>{const row=table.rows[1],cells=[...row.cells];return {font:parseFloat(getComputedStyle(table).fontSize),padding:getComputedStyle(cells[0]).paddingTop,height:row.getBoundingClientRect().height,alignment:cells.map(c=>getComputedStyle(c).textAlign),width:table.getBoundingClientRect().width,parentWidth:table.parentElement.getBoundingClientRect().width,overlap:cells.some((c,i)=>i&&c.getBoundingClientRect().left<cells[i-1].getBoundingClientRect().right-.5)};});
  if(width<=600){expect(layout.font).toBeGreaterThanOrEqual(14);expect(parseFloat(layout.padding)).toBeGreaterThanOrEqual(14);expect(layout.height).toBeGreaterThanOrEqual(48);expect(layout.alignment).toEqual(['left','right','right']);}else{expect(layout.font).toBe(12);expect(layout.padding).toBe('9px');expect(layout.alignment).toEqual(['left','left','left']);}
  expect(layout.width).toBeLessThanOrEqual(layout.parentWidth+1);expect(layout.overlap).toBe(false);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#statistics-received')).toHaveText('800,00 RON');await expect(page.locator('#statistics-nights')).toHaveText('12');
 await page.locator('#statistics-currency').selectOption('EUR');await expect(page.locator('#statistics-received')).toHaveText('100,00 EUR');await expect(page.locator('#statistics-nights')).toHaveText('12');
});
