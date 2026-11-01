import {test,expect} from '@playwright/test';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
const businessKey='apartment-booking-manager:v1',maintenanceKey='apartment-booking-manager:maintenance:v1';
const profiles=[['folded',344,882],['s24-ultra',430,932],['unfolded',840,900],['desktop',1440,1000]];
function fixture(){
 const apartments=Array.from({length:8},(_,i)=>({id:'reach-'+i,name:'Apartament Test '+i,address:'Adresă fictivă',city:'Oraș Test',owner:i%2?'Proprietar Test B':'Proprietar Test A'}));
 const bookings=apartments.flatMap((a,i)=>Array.from({length:4},(_,j)=>{const day=2+j*6,id='stay-'+i+'-'+j,currency=i%2?'EUR':'RON';return {id,apartmentId:a.id,guest:'Client Test '+i+'-'+j,phone:'0700000000',checkIn:`2026-10-${String(day).padStart(2,'0')}`,checkOut:`2026-10-${String(day+2).padStart(2,'0')}`,status:j%2?'unconfirmed':'confirmed',currency,totalAmountCents:10000,paidAmountCents:1000,payments:[{id:'payment-'+id,date:`2026-10-${String(day).padStart(2,'0')}`,amountCents:1000,method:'cash'}]};}));
 const expenses=Array.from({length:28},(_,i)=>({id:'expense-'+i,apartmentId:apartments[i%8].id,description:'Cheltuială Test '+i,date:`2026-10-${String(i+1).padStart(2,'0')}`,category:'water',amountCents:100+i,currency:i%2?'EUR':'RON'}));
 return {state:{version:1,migrations:{originalDemoRemoved:true},apartments,bookings},maintenance:{version:1,expenses,works:[],reviews:[]}};
}
async function setup(page,data){await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(({state,maintenance})=>{localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(state));localStorage.setItem('apartment-booking-manager:maintenance:v1',JSON.stringify(maintenance));},data);await seedBrowserTrial(page);await page.reload();await expect(page.locator('.timeline-row')).toHaveCount(data.state.apartments.length);}
async function atDocumentEnd(page,last){
 await page.evaluate(()=>scrollTo(0,document.scrollingElement.scrollHeight));
 await expect.poll(()=>last.evaluate(el=>{const box=el.getBoundingClientRect(),nav=document.querySelector('.app-navigation'),n=nav.getBoundingClientRect();const overlaps=getComputedStyle(nav).position==='fixed'&&box.left<n.right&&box.right>n.left;return box.bottom-Math.min(innerHeight,overlaps?n.top:innerHeight);})).toBeLessThanOrEqual(1);
 await expect(last).toBeInViewport();
}
async function menu(page,selector){await page.locator('#open-menu').click();await page.locator('#app-menu '+selector).click();}
for(const [name,width,height] of profiles)test(`BUSINESS last content and actual commands remain reachable ${name}`,async({page,context})=>{
 await page.setViewportSize({width,height});const data=fixture();await setup(page,data);await context.setOffline(true);
 const before=await page.evaluate(([a,b])=>[localStorage.getItem(a),localStorage.getItem(b)],[businessKey,maintenanceKey]);
 await page.locator('.timeline-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
 const calendarLast=page.locator('.timeline-row:last-child .apartment-label');
 await expect.poll(()=>calendarLast.evaluate(el=>{const v=document.querySelector('.timeline-scroll').getBoundingClientRect(),n=document.querySelector('.app-navigation').getBoundingClientRect();return el.getBoundingClientRect().bottom-Math.min(v.bottom,n.left<v.right&&n.right>v.left?n.top:innerHeight);})).toBeLessThanOrEqual(1);
 await calendarLast.click();await expect(page.locator('#fields [name=name]')).toHaveValue('Apartament Test 7');await page.locator('#cancel').click();
 await page.locator('.app-navigation [data-screen=apartments]').click();const entry=page.locator('.apartment-entry').last();await atDocumentEnd(page,entry);await entry.locator('.apartment-reservations summary').click();const booking=entry.locator('.apartment-booking-link').last();await atDocumentEnd(page,booking);await booking.click();await expect(page.locator('#fields [name=guest]')).toHaveValue('Client Test 7-3');await page.locator('#cancel').click();
 await page.locator('.app-navigation [data-screen=statistics]').click();await page.locator('.statistics-chart summary').last().click();await atDocumentEnd(page,page.locator('#statistics-no-history'));await expect(page.locator('.statistics-chart').last().locator('tr')).toHaveCount(13);
 await page.locator('.app-navigation [data-screen=reports]').click();await expect(page.locator('.report-card')).toHaveCount(32);await atDocumentEnd(page,page.locator('.report-card').last());
 const downloaded=page.waitForEvent('download');await page.locator('#report-export-excel').click();expect(await (await downloaded).failure()).toBeNull();
 await menu(page,'#menu-payments');await expect(page.locator('.collection-row')).toHaveCount(16);const receipt=page.locator('.collection-row').last();await atDocumentEnd(page,receipt);await receipt.click();await expect(page.locator('#editor')).toBeVisible();await expect(page.locator('#fields [name=guest]')).toHaveValue(/Client Test/);await page.locator('#cancel').click();
 await menu(page,'[data-screen=maintenance]');await expect(page.locator('.maintenance-card')).toHaveCount(28);const work=page.locator('.maintenance-card').last();await atDocumentEnd(page,work);await work.locator('.maintenance-actions button').first().click();await expect(page.locator('.maintenance-editor')).toBeVisible();await page.locator('.maintenance-editor .maintenance-actions button').first().click();
 await page.locator('.top [data-language=en]').click();await atDocumentEnd(page,page.locator('.maintenance-card').last());
 await menu(page,'#open-backup');await expect(page.locator('#backup-dialog')).toBeVisible();await page.locator('#backup-dialog').evaluate(el=>el.scrollTop=el.scrollHeight);await expect(page.locator('#backup-file')).toBeHidden();await expect(page.locator('.backup-actions button').last()).toBeInViewport();await page.locator('#close-backup').click();
 const after=await page.evaluate(([a,b])=>[localStorage.getItem(a),localStorage.getItem(b)],[businessKey,maintenanceKey]);expect(after).toEqual(before);
 await page.screenshot({path:`test-results/BUSINESS-stable-${name}-last-maintenance.png`});
});

for(const [name,width,height] of profiles.slice(0,2))test(`BUSINESS mobile reservation names remain readable and open full details ${name}`,async({page})=>{
 await page.setViewportSize({width,height});const data=fixture();data.state.apartments=data.state.apartments.slice(0,2);data.maintenance.expenses=[];data.state.bookings=[{id:'short-a',apartmentId:'reach-0',guest:'Ana',phone:'0700000000',checkIn:'2026-10-05',checkOut:'2026-10-06',status:'confirmed'},{id:'short-b',apartmentId:'reach-1',guest:'Dan',phone:'0700000000',checkIn:'2026-10-05',checkOut:'2026-10-06',status:'unconfirmed'}];await setup(page,data);
 for(const language of ['ro','en']){await page.locator('.top [data-language='+language+']').click();for(const guest of ['Ana','Dan']){
  const bar=page.locator('.booking').filter({hasText:guest}),label=bar.locator('.booking-guest');await expect(bar).toHaveAttribute('title',new RegExp(guest));
  const metrics=await label.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const style=getComputedStyle(el);return {font:parseFloat(style.fontSize),weight:Number(style.fontWeight),text:range.getBoundingClientRect().width,width:el.getBoundingClientRect().width};});
  expect(metrics.font).toBeGreaterThanOrEqual(12);expect(metrics.weight).toBeGreaterThanOrEqual(650);expect(metrics.text).toBeLessThanOrEqual(metrics.width+.5);
  await bar.click();await expect(page.locator('#fields [name=guest]')).toHaveValue(guest);await page.locator('#cancel').click();
 }}
 await page.screenshot({path:`test-results/BUSINESS-stable-${name}-names.png`});
});
