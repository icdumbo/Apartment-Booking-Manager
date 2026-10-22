import {test,expect} from '@playwright/test';
const key='apartment-booking-manager:v1';
const state={version:1,migrations:{originalDemoRemoved:true},apartments:Array.from({length:4},(_,i)=>({id:'detail-'+i,name:'Apartament Test '+(i+1),address:'Adresă fictivă',city:'Oraș Test'})),bookings:[{id:'legacy-detail',apartmentId:'detail-0',guest:'Client Test',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-15',status:'confirmed',retainedMetadata:'unchanged'},{id:'overflow-detail',apartmentId:'detail-3',guest:'Client Test 2',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-12',status:'unconfirmed'}]};
async function load(page,{expired=false}={}){await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(({key,state,expired})=>{localStorage.setItem(key,JSON.stringify(state));if(expired)localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:0,lastSeen:0}));},{key,state,expired});await page.reload();}
const field=(page,name)=>page.locator(`#fields [name="${name}"]`);
async function save(page){await page.locator('#editor [type=submit]').click();}
test('legacy booking opens from calendar without rewriting data or inventing amounts',async({page})=>{
 await load(page);const before=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('.booking').first().click();await expect(page.locator('#editor-title')).toHaveText('Detalii rezervare');await expect(page.locator('#booking-nights')).toHaveText('5 nopți');await expect(field(page,'totalAmountCents')).toHaveValue('');await expect(page.locator('#booking-balance')).toHaveText('—');await page.locator('#cancel').click();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
 await page.locator('.booking').first().click();await save(page);const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).bookings[0],key);expect(stored).toEqual(state.bookings[0]);
});
test('details calculate nights and balance, save offline and persist after restart',async({page})=>{
 await load(page);await page.context().setOffline(true);await page.locator('.booking').first().click();await field(page,'persons').fill('4');await field(page,'totalAmountCents').fill('1500,25');await field(page,'paidAmountCents').fill('500.15');await field(page,'source').selectOption('booking');await field(page,'notes').fill('Notă fictivă pentru test');await expect(page.locator('#booking-balance')).toContainText('1.000,10');
 await page.locator('#editor [data-language=en]').click();await expect(field(page,'notes')).toHaveValue('Notă fictivă pentru test');await expect(page.locator('#booking-nights')).toHaveText('5 nights');await save(page);
 const booking=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).bookings[0],key);expect(booking).toMatchObject({persons:4,totalAmountCents:150025,paidAmountCents:50015,source:'booking',notes:'Notă fictivă pentru test',retainedMetadata:'unchanged'});
 await page.context().setOffline(false);await page.reload();await page.locator('.booking').first().click();await expect(field(page,'totalAmountCents')).toHaveValue('1500.25');await expect(field(page,'paidAmountCents')).toHaveValue('500.15');await expect(field(page,'persons')).toHaveValue('4');await expect(field(page,'notes')).toHaveValue('Notă fictivă pentru test');
});
test('invalid money, payment and people do not change persisted bookings',async({page})=>{
 await load(page);const before=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('.booking').first().click();
 for(const invalid of ['-1','1,234','1e3']){await field(page,'totalAmountCents').fill(invalid);await save(page);await expect(page.locator('#form-error')).toContainText('zecimale');}
 await field(page,'totalAmountCents').fill('100');await field(page,'paidAmountCents').fill('101');await save(page);await expect(page.locator('#form-error')).toContainText('depăși');await field(page,'paidAmountCents').fill('50');await field(page,'persons').fill('0');await save(page);await expect(page.locator('#form-error')).toContainText('persoane');expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
test('free-day creation still enforces overlap and allows same-day checkout/checkin',async({page})=>{
 await load(page);await page.locator('.timeline-row').first().locator('.day-cell').first().click();await expect(page.locator('#editor-title')).toHaveText('Adaugă rezervare');await field(page,'guest').fill('Client Test Nou');await field(page,'phone').fill('0700000000');await field(page,'checkIn').fill('14/10/2026');await field(page,'checkOut').fill('16/10/2026');await expect(page.locator('#booking-nights')).toHaveText('2 nopți');await save(page);await expect(page.locator('#form-error')).toContainText('suprapune');await field(page,'checkIn').fill('15/10/2026');await save(page);await expect(page.locator('.booking')).toHaveCount(3);await expect(page.locator('.handover')).toHaveCount(1);
 await page.locator('.booking').filter({hasText:'Client Test Nou'}).click();await page.locator('#delete').click();await page.locator('#confirmation button[value=delete]').click();await expect(page.locator('.booking')).toHaveCount(2);
});
test('BASIC overflow booking details are read-only including new fields',async({page})=>{
 await load(page,{expired:true});const before=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('.booking').last().click();for(const name of ['guest','persons','totalAmountCents','paidAmountCents','source','notes'])await expect(field(page,name)).toBeDisabled();await expect(page.locator('#editor [type=submit]')).toBeHidden();await expect(page.locator('#delete')).toBeHidden();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
for(const width of [360,390,1024])test(`booking detail responsive preview ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await load(page);await page.locator('.booking').first().click();await field(page,'persons').fill('4');await field(page,'totalAmountCents').fill('1500');await field(page,'paidAmountCents').fill('500');await field(page,'source').selectOption('booking');await field(page,'notes').fill('Notă fictivă exclusiv pentru preview.');
 await page.locator('#editor').evaluate(el=>el.scrollTop=0);expect(await page.locator('#editor').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:`test-results/Booking-details-${width}.png`});await page.locator('#editor').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:`test-results/Booking-payment-${width}.png`});
});
test('standalone interactive preview creates a booking using only bundled assets',async({page})=>{
 await page.goto('/ui-preview/Apartment-Booking-Manager-UI.html');await page.locator('#add-apartment').click();await field(page,'name').fill('Apartament Test Preview');await field(page,'address').fill('Adresă fictivă');await field(page,'city').fill('Oraș Test');await save(page);await page.locator('#add-booking').click();await field(page,'guest').fill('Client Test Preview');await field(page,'phone').fill('0700000000');await field(page,'totalAmountCents').fill('100');await field(page,'paidAmountCents').fill('25');await expect(page.locator('#booking-balance')).toContainText('75,00');await save(page);await expect(page.locator('.booking')).toHaveCount(1);
});

test('RON display stays Romanian in RO and EN; zero and blank values remain distinct',async({page})=>{
 await load(page);await expect(page.locator('#days')).toHaveCount(0);await page.locator('.booking').first().click();
 for(const language of ['ro','en']){
  await page.locator(`#editor [data-language=${language}]`).click();
  await field(page,'totalAmountCents').fill('');await field(page,'paidAmountCents').fill('');await expect(page.locator('#booking-balance')).toHaveText('—');
  await field(page,'totalAmountCents').fill('0');await field(page,'paidAmountCents').fill('0');await expect(page.locator('#booking-balance')).toHaveText('0,00 RON');
  await field(page,'totalAmountCents').fill('1500.25');await field(page,'paidAmountCents').fill('0,25');await expect(page.locator('#booking-balance')).toHaveText('1.500,00 RON');
 }
 await save(page);const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).bookings[0],key);expect(saved.totalAmountCents).toBe(150025);expect(saved.paidAmountCents).toBe(25);
 await page.reload();await page.locator('.booking').first().click();await expect(field(page,'totalAmountCents')).toHaveValue('1500.25');await expect(page.locator('#booking-balance')).toHaveText('1.500,00 RON');
 await field(page,'totalAmountCents').fill('0');await field(page,'paidAmountCents').fill('0');await save(page);await page.reload();await page.locator('.booking').first().click();await expect(page.locator('#booking-balance')).toHaveText('0,00 RON');
});
