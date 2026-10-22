import {test,expect} from '@playwright/test';
const key='apartment-booking-manager:v1';
const booking={id:'payment-booking',apartmentId:'payment-apartment',guest:'Client Test',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-15',status:'confirmed',totalAmountCents:100000};
async function load(page,extra={},expired=false){await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(({key,booking,extra,expired})=>{localStorage.setItem(key,JSON.stringify({version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'payment-apartment',name:'Apartament Test',address:'Adresă Test',city:'Oraș Test'}],bookings:[{...booking,...extra}]}));if(expired)localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:0,lastSeen:0}));},{key,booking,extra,expired});await page.reload();await page.locator('.booking').click();}
const entry=(page,key)=>page.locator(`[data-payment-field=${key}]`);
const action=(page,key)=>page.locator(`.payment-history [data-i18n=${key}]`);
async function fill(page,amount='100',date='10/10/2026',method='cash'){await entry(page,'paymentDate').fill(date);await entry(page,'paymentAmount').fill(amount);await entry(page,'paymentMethod').selectOption(method);}
async function apply(page){await action(page,'savePayment').click();}
async function save(page){await page.locator('#editor [type=submit]').click();}
async function stored(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)).bookings[0],key);}
test('partial payments add, edit and delete offline with exact persistent totals',async({page})=>{
 await load(page);await page.context().setOffline(true);await action(page,'addPayment').click();await fill(page,'100,25');await entry(page,'paymentNotes').fill('Notă test');await apply(page);await action(page,'addPayment').click();await fill(page,'200.15','11/10/2026','transfer');await apply(page);await expect(page.locator('.payment-row')).toHaveCount(2);await expect(page.locator('#booking-balance')).toHaveText('699,60 RON');
 await action(page,'editPayment').first().click();await entry(page,'paymentAmount').fill('150.25');await apply(page);await expect(page.locator('#booking-balance')).toHaveText('649,60 RON');await action(page,'delete').last().click();await expect(page.locator('.payment-row')).toHaveCount(2);await action(page,'delete').last().click();await expect(page.locator('.payment-row')).toHaveCount(1);await save(page);
 expect(await stored(page)).toMatchObject({paidAmountCents:15025,legacyPaidAmountCents:0,payments:[{amountCents:15025,method:'cash',date:'2026-10-10',notes:'Notă test'}]});await page.context().setOffline(false);await page.reload();await page.locator('.booking').click();await expect(page.locator('.payment-row')).toHaveCount(1);await expect(page.locator('[name=paidAmountCents]')).toHaveAttribute('readonly','');await expect(page.locator('#booking-balance')).toHaveText('849,75 RON');
});
test('legacy aggregate survives viewing; detailing requires real data and never doubles receipt',async({page})=>{
 await load(page,{paidAmountCents:40000});const before=await stored(page);await expect(page.locator('.payment-history')).toContainText('400,00 RON');await action(page,'detailLegacyPayment').click();await expect(entry(page,'paymentDate')).toHaveValue('');await expect(entry(page,'paymentMethod')).toHaveValue('');await apply(page);await expect(page.locator('.payment-error')).toContainText('data');expect(await stored(page)).toEqual(before);
 await fill(page,'200','09/10/2026','card');await apply(page);await expect(page.locator('#booking-balance')).toHaveText('600,00 RON');await expect(page.locator('.payment-history')).toContainText('200,00 RON');await action(page,'addPayment').click();await fill(page,'100','10/10/2026','other');await apply(page);await save(page);const after=await stored(page);expect(after.paidAmountCents).toBe(50000);expect(after.legacyPaidAmountCents).toBe(20000);expect(after.payments).toHaveLength(2);
});
test('invalid and excess payments are rejected; cancelling the reservation discards draft payments',async({page})=>{
 await load(page);const before=await stored(page);await action(page,'addPayment').click();await fill(page,'1001');await apply(page);await expect(page.locator('.payment-error')).toContainText('depăși');await entry(page,'paymentAmount').fill('0');await apply(page);await expect(page.locator('.payment-error')).toContainText('zero');await entry(page,'paymentAmount').fill('100');await entry(page,'paymentMethod').selectOption('');await apply(page);await expect(page.locator('.payment-error')).toContainText('metoda');await entry(page,'paymentMethod').selectOption('cash');await apply(page);await page.locator('#cancel').click();expect(await stored(page)).toEqual(before);
});
const ledger={paidAmountCents:25000,legacyPaidAmountCents:5000,payments:[{id:'receipt',date:'2026-10-10',method:'cash',amountCents:20000}]};
test('BASIC displays history read-only and preserves ledger when other booking fields are edited',async({page})=>{
 await load(page,ledger,true);await expect(page.locator('.payment-row')).toHaveCount(1);for(const key of ['addPayment','detailLegacyPayment','editPayment','delete'])await expect(action(page,key)).toBeDisabled();await page.locator('[name=guest]').fill('Client Test Editat');await save(page);const after=await stored(page);expect(after).toMatchObject(ledger);expect(after.guest).toBe('Client Test Editat');
});
test('trial expiry rejects pending ledger mutation and preserves all recorded data',async({page})=>{
 await load(page,ledger);const before=await stored(page);await action(page,'addPayment').click();await fill(page,'100');await apply(page);await page.clock.setSystemTime(new Date('2026-10-21T09:05:00Z'));await save(page);await expect(page.locator('#form-error')).toContainText('PREMIUM');expect(await stored(page)).toEqual(before);await page.locator('#cancel').click();await page.reload();await page.getByRole('button',{name:'Oct 2026',exact:true}).click();await page.locator('.booking').click();await expect(page.locator('.payment-row')).toHaveCount(1);await expect(action(page,'addPayment')).toBeDisabled();
});
test('payment draft survives language changes and mobile form remains within viewport',async({page})=>{
 await page.setViewportSize({width:360,height:850});await load(page);await action(page,'addPayment').click();await fill(page,'100');await page.locator('#editor [data-language=en]').click();await expect(entry(page,'paymentAmount')).toHaveValue('100');await expect(action(page,'savePayment')).toHaveText('Apply payment');await apply(page);await expect(page.locator('.payment-row')).toContainText('Cash');expect(await page.locator('#editor').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await save(page);expect((await stored(page)).paidAmountCents).toBe(10000);
});

test('unchanged existing history without a legacy remainder is preserved in BASIC',async({page})=>{
 const old={paidAmountCents:20000,payments:[{id:'receipt',date:'2026-10-10',method:'card',amountCents:20000}]};await load(page,old,true);await page.locator('[name=guest]').fill('Test edit');await save(page);const after=await stored(page);expect(after).toMatchObject(old);expect(after).not.toHaveProperty('legacyPaidAmountCents');
});

test('invalid aggregate input survives language changes and pending payment entries cannot be silently lost',async({page})=>{
 await load(page,{paidAmountCents:40000});const before=await stored(page);await page.locator('[name=paidAmountCents]').fill('invalid');await page.locator('#editor [data-language=en]').click();await expect(page.locator('[name=paidAmountCents]')).toHaveValue('invalid');await page.locator('[name=paidAmountCents]').fill('400');await action(page,'detailLegacyPayment').click();await fill(page,'100');await save(page);await expect(page.locator('#form-error')).toContainText('Apply or cancel');expect(await stored(page)).toEqual(before);
});
