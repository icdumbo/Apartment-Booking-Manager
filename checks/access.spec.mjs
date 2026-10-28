import {test,expect} from '@playwright/test';
const key='apartment-booking-manager:v1';
const fixture={version:1,migrations:{originalDemoRemoved:true},apartments:Array.from({length:5},(_,i)=>({id:'access-'+i,name:'Apartment '+i,address:'Test street',city:'Test city'})),bookings:[{id:'overflow-booking',apartmentId:'access-4',guest:'Test guest',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-12',status:'confirmed'}]};
test('trial expiry preserves data and restricts overflow while first apartments remain editable',async({page})=>{
 await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(({key,fixture})=>{localStorage.setItem(key,JSON.stringify(fixture));const startedAt=Date.now();localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt,lastSeen:startedAt}));},{key,fixture});await page.reload();
 await expect(page.locator('#access-message')).toContainText('15');await expect(page.locator('#add-apartment')).toBeEnabled();
 const before=await page.evaluate(key=>localStorage.getItem(key),key);
 const trial=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:access:v1'));
 await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('apartment-booking-manager:access:v1')).startedAt)).toBe(JSON.parse(trial).startedAt);
 await page.locator('.timeline-row .apartment-label').last().click();await expect(page.locator('input[name=name]')).toBeEnabled();await page.locator('input[name=name]').fill('Unsaved after expiry');
 await page.clock.setSystemTime(new Date('2026-10-21T09:01:00Z'));await page.locator('#editor [type=submit]').click();await expect(page.locator('#form-error')).toContainText('BASIC');await page.locator('#cancel').click();await page.reload();
 await expect(page.locator('.timeline-row')).toHaveCount(5);await expect(page.locator('#add-apartment')).toBeDisabled();
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(after.bookings).toEqual(JSON.parse(before).bookings);expect(after.apartments[4]).toEqual(fixture.apartments[4]);expect(after.apartments[0]).toEqual(fixture.apartments[0]);
 await page.locator('.timeline-row .apartment-label').last().click();await expect(page.locator('input[name=name]')).toBeDisabled();await page.locator('#cancel').click();
 await page.locator('.timeline-row .apartment-label').first().click();await expect(page.locator('input[name=name]')).toBeEnabled();
});

test('apartments tab reuses stored data, CRUD and BASIC overflow guards offline',async({page})=>{
 await page.goto('/');await page.evaluate(({key,fixture})=>{localStorage.setItem(key,JSON.stringify(fixture));localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt:0,lastSeen:0}));},{key,fixture});await page.reload();
 await page.context().setOffline(true);
 await page.locator('[data-screen=apartments]').click();await expect(page.locator('#calendar-panel')).toBeHidden();await expect(page.locator('.apartment-card')).toHaveCount(5);await expect(page.locator('#add-apartment')).toBeDisabled();
 await page.locator('.apartment-card').last().click();await expect(page.locator('input[name=name]')).toBeDisabled();await expect(page.locator('#delete')).toBeHidden();await page.locator('#cancel').click();
 await page.locator('.apartment-card').first().click();await page.locator('input[name=name]').fill('Edited offline');await page.locator('#editor [type=submit]').click();await expect(page.locator('.apartment-card').first()).toContainText('Edited offline');
 await page.locator('.apartment-card').first().click();await page.locator('#delete').click();await page.locator('#confirmation button[value=delete]').click();await expect(page.locator('.apartment-card')).toHaveCount(4);
 const data=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(data.bookings).toEqual(fixture.bookings);expect(data.apartments[3]).toEqual(fixture.apartments[4]);
 await page.context().setOffline(false);await page.reload();await page.locator('[data-screen=apartments]').click();await expect(page.locator('.apartment-card')).toHaveCount(4);
 await page.locator('[data-screen=calendar]').click();await expect(page.locator('.timeline-row')).toHaveCount(4);
});
test('new installations stay BASIC without minting a local trial and persist offline data',async({page})=>{
 await page.goto('/');await expect(page.locator('#access-message')).toContainText('BASIC');expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:access:v1'))).toBeNull();await page.locator('[data-screen=apartments]').click();await expect(page.locator('.apartments-empty')).toBeVisible();
 await page.locator('#add-apartment').click();await page.locator('input[name=name]').fill('New test apartment');await page.locator('input[name=address]').fill('Test address');await page.locator('input[name=city]').fill('Test city');await page.locator('#editor [type=submit]').click();
 await expect(page.locator('.apartment-card')).toContainText('New test apartment');await expect(page.locator('.apartment-card .apartment-photo')).toHaveText('Fără fotografie');
 await page.reload();await page.locator('[data-screen=apartments]').click();await expect(page.locator('.apartment-card')).toHaveCount(1);await expect(page.locator('#access-message')).toContainText('BASIC');
});

test('ongoing trial keeps its original deadline and corrupt trial history is not replaced',async({page})=>{
 await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');
 const startedAt=Date.parse('2026-10-01T09:00:00Z');await page.evaluate(startedAt=>localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt,lastSeen:startedAt})),startedAt);await page.reload();await expect(page.locator('#access-message')).toContainText('10');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('apartment-booking-manager:access:v1')).startedAt)).toBe(startedAt);
 await page.evaluate(()=>localStorage.setItem('apartment-booking-manager:access:v1','broken'));await page.reload();await expect(page.locator('#access-message')).toContainText('BASIC');expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:access:v1'))).toBe('broken');
});
