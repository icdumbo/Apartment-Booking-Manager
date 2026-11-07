import {test,expect} from '@playwright/test';
test('calendar opens on day one and Today brings the current date into view',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.clock.setFixedTime(new Date('2026-11-07T12:00:00Z'));
 await page.addInitScript(()=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify({
  version:1,migrations:{originalDemoRemoved:true},
  apartments:[{id:'test-a',name:'Apartament test',address:'Adresă fictivă',city:'Oraș test'}],
  bookings:[{id:'test-b',apartmentId:'test-a',guest:'Client test',phone:'0700000000',checkIn:'2026-11-02',checkOut:'2026-11-04'}]
 })));
 await page.goto('/');
 const first=page.locator('.day-heading strong').first();
 await expect(page.locator('#range')).toHaveText('01/11/2026 – 30/11/2026');
 await expect(first).toHaveText('1');
 await expect(page.locator('.booking')).toBeInViewport();
 await page.getByRole('button',{name:'Oct 2026',exact:true}).click();
 await expect(page.locator('#range')).toHaveText('01/10/2026 – 30/10/2026');
 await page.getByRole('button',{name:'Nov 2026',exact:true}).click();
 await expect(first).toHaveText('1');
 await expect(page.locator('.booking')).toBeInViewport();
 await page.locator('#today').click();
 await expect(page.locator('.day-heading.current strong')).toHaveText('7');
 await expect(page.locator('.day-heading.current')).toBeInViewport();
});
