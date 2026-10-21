import {test,expect} from '@playwright/test';
const key='apartment-booking-manager:v1';
const fixture={version:1,migrations:{originalDemoRemoved:true},apartments:Array.from({length:5},(_,i)=>({id:'access-'+i,name:'Apartment '+i,address:'Test street',city:'Test city'})),bookings:[{id:'overflow-booking',apartmentId:'access-4',guest:'Test guest',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-12',status:'confirmed'}]};
test('trial expiry preserves data and restricts overflow while first apartments remain editable',async({page})=>{
 await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');await page.evaluate(({key,fixture})=>localStorage.setItem(key,JSON.stringify(fixture)),{key,fixture});await page.reload();
 await expect(page.locator('#access-message')).toContainText('15');await expect(page.locator('#add-apartment')).toBeDisabled();
 const before=await page.evaluate(key=>localStorage.getItem(key),key);
 await page.locator('.timeline-row .apartment-label').last().click();await expect(page.locator('input[name=name]')).toBeDisabled();await expect(page.locator('#delete')).toBeHidden();await page.locator('#cancel').click();
 await page.locator('.timeline-row .apartment-label').first().click();await page.locator('input[name=name]').fill('Editable BASIC');await page.locator('#editor [type=submit]').click();await expect(page.locator('.timeline-row .apartment-label').first()).toContainText('Editable BASIC');
 await page.locator('#start-trial').click();await expect(page.locator('#add-apartment')).toBeEnabled();await expect(page.locator('#start-trial')).toBeHidden();
 await page.locator('.timeline-row .apartment-label').last().click();await expect(page.locator('input[name=name]')).toBeEnabled();await page.locator('input[name=name]').fill('Unsaved after expiry');
 await page.clock.setSystemTime(new Date('2026-10-21T09:01:00Z'));await page.locator('#editor [type=submit]').click();await expect(page.locator('#form-error')).toContainText('BASIC');await page.locator('#cancel').click();await page.reload();
 await expect(page.locator('.timeline-row')).toHaveCount(5);await expect(page.locator('#add-apartment')).toBeDisabled();await expect(page.locator('#start-trial')).toBeHidden();
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(after.bookings).toEqual(JSON.parse(before).bookings);expect(after.apartments[4]).toEqual(fixture.apartments[4]);expect(after.apartments[0].name).toBe('Editable BASIC');
});
