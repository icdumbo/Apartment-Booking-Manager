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
 await expect(page.locator('#range')).toHaveText('01/10/2026 – 31/10/2026');
 await page.getByRole('button',{name:'Nov 2026',exact:true}).click();
 await expect(first).toHaveText('1');
 await expect(page.locator('.booking')).toBeInViewport();
 await page.locator('#today').click();
 await expect(page.locator('.day-heading.current strong')).toHaveText('7');
 await expect(page.locator('.day-heading.current')).toBeInViewport();
});

for(const [year,month,last] of [[2026,2,28],[2028,2,29],[2026,11,30],[2026,7,31],[2026,8,31],[2026,10,31]]){
 test(`month ${year}-${month} reaches day ${last} at the existing mobile day width`,async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.clock.setFixedTime(new Date('2026-11-07T12:00:00Z'));
  await page.addInitScript(()=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify({
   version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'test-a',name:'Apartament test',address:'Adresă fictivă',city:'Oraș test'}],bookings:[]
  })));
  await page.goto('/');
  const columns=page.locator('.day-heading');
  await expect(columns).toHaveCount(30);
  const baseline=await columns.first().boundingBox();
  const label=page.locator('.timeline-row .apartment-label').first();
  const labelWidth=(await label.boundingBox()).width;
  for(let y=2026;y<year;y++)await page.getByRole('button',{name:'Anul următor',exact:true}).click();
  await page.locator('.month-option').nth(month-1).click();
  const mm=String(month).padStart(2,'0');
  await expect(page.locator('#range')).toHaveText(`01/${mm}/${year} – ${last}/${mm}/${year}`);
  await expect(columns).toHaveCount(last);
  expect((await columns.first().boundingBox()).width).toBeCloseTo(baseline.width,1);
  expect((await label.boundingBox()).width).toBeCloseTo(labelWidth,1);
  await page.locator('.timeline-scroll').evaluate(el=>{el.scrollLeft=el.scrollWidth;});
  await expect(columns.last()).toBeInViewport();
  await page.locator('.timeline-row .day-cell').last().click();
  await expect(page.locator('[name=checkIn]')).toHaveValue(`${last}/${mm}/${year}`);
 }
 );
}
