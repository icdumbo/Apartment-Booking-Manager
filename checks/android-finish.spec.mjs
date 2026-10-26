import {test,expect} from '@playwright/test';
import {collectionsFixture} from './fixtures/collections.mjs';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';

test.use({hasTouch:true,isMobile:true});
// Fictional data in isolated browser contexts only, never imported by the app.
const fixture={...collectionsFixture,apartments:[...collectionsFixture.apartments,
 {id:'c',name:'Studio Test',address:'Adresă fictivă',city:'Oraș Test'},
 {id:'d',name:'Apartament Test D',address:'Adresă fictivă',city:'Oraș Test'}],bookings:[...collectionsFixture.bookings,
 {id:'visual-one',apartmentId:'a',guest:'Client Test A',phone:'0700000000',checkIn:'2026-10-04',checkOut:'2026-10-10',status:'confirmed',currency:'RON',totalAmountCents:150000,paidAmountCents:50000,payments:[{id:'visual-payment',date:'2026-10-05',amountCents:50000,method:'transfer'}]},
 {id:'visual-two',apartmentId:'a',guest:'Client Test B',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-14',status:'unconfirmed'},
 {id:'short-a',apartmentId:'c',guest:'Ana',phone:'0700000000',checkIn:'2026-10-05',checkOut:'2026-10-06',status:'confirmed'},
 {id:'short-b',apartmentId:'c',guest:'Dan',phone:'0700000000',checkIn:'2026-10-06',checkOut:'2026-10-07',status:'unconfirmed'},
 {id:'short-long',apartmentId:'c',guest:'Client Test Sejur',phone:'0700000000',checkIn:'2026-10-07',checkOut:'2026-10-13',status:'confirmed'},
 {id:'short-c',apartmentId:'d',guest:'Mia',phone:'0700000000',checkIn:'2026-10-08',checkOut:'2026-10-09',status:'unconfirmed'},
 {id:'tablet-stay',apartmentId:'d',guest:'Client Test D',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-18',status:'confirmed'}]};
const profiles=[['phone-360',360,800],['phone-390',390,844],['phone-430',430,932],['fold-folded',344,882],['fold-unfolded',840,900],['tablet-portrait',800,1280],['tablet-landscape',1280,800]];
for(const [name,width,height] of profiles)test(`Android final design ${name}`,async({page})=>{
 await page.setViewportSize({width,height});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');
 await page.evaluate(s=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(s)),fixture);await seedBrowserTrial(page);await page.reload();
 const before=await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'));
 const screenshot=async screen=>{
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(!screen.endsWith('-charts')&&!screen.endsWith('-list')&&!['reservation','menu'].includes(screen))await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`test-results/Android-${name}-${screen}.png`,fullPage:false});
 };
 await expect(page.locator('.day-heading')).toHaveCount(30);
 const metrics=await page.evaluate(()=>{
  const box=s=>document.querySelector(s).getBoundingClientRect();
  const viewport=box('.timeline-scroll'),day=box('.day-heading'),label=box('.corner');
  return {top:viewport.top,visible:(viewport.width-label.width)/day.width};
 });
 if(width<=600){expect(metrics.visible).toBeCloseTo(width<360?9:10,1);expect(metrics.top).toBeLessThan(315);}
 else if(width<=1099)expect(metrics.visible).toBeCloseTo(15,1);
 else expect(metrics.visible).toBeCloseTo(30,1);
 const ana=page.locator('.booking').filter({hasText:/^✓Ana$/});
 await expect(ana).toHaveCount(1);await expect(ana.locator('.booking-status-icon')).toHaveText('✓');
 const short=await ana.evaluate(el=>{
  const guest=el.querySelector('.booking-guest'),r=document.createRange();r.selectNodeContents(guest);const text=r.getBoundingClientRect(),box=guest.getBoundingClientRect(),icon=el.querySelector('.booking-status-icon').getBoundingClientRect();
  return {available:box.width,text:text.width,font:parseFloat(getComputedStyle(guest).fontSize),textTop:text.top,iconBottom:icon.bottom};
 });
 expect(short.font).toBeGreaterThanOrEqual(11);expect(short.text).toBeLessThanOrEqual(short.available+.5);expect(short.iconBottom).toBeLessThanOrEqual(short.textTop+1);
 const pending=page.locator('.booking.unconfirmed').filter({hasText:/Dan/});
 expect(await pending.evaluate(el=>getComputedStyle(el).overflow)).toBe('visible');
 if(width<=1099){const label=await page.locator('.month-label').first().boundingBox(),viewport=await page.locator('.timeline-scroll').boundingBox();expect(label.x+label.width).toBeLessThanOrEqual(viewport.x+viewport.width+.5);}
 await screenshot('calendar');
 await ana.click();await expect(page.locator('[name=guest]')).toHaveValue('Ana');await page.locator('#cancel').click();
 await page.locator('.timeline-scroll').evaluate(el=>{el.scrollLeft=90;});
 const sticky=await page.evaluate(()=>{const v=document.querySelector('.timeline-scroll'),a=document.querySelector('.timeline-row .apartment-label');return {left:a.getBoundingClientRect().left,viewport:v.getBoundingClientRect().left,scroll:v.scrollLeft};});
 if(width<=1099){expect(sticky.scroll).toBeGreaterThan(80);expect(sticky.left).toBeCloseTo(sticky.viewport,0);}
 await screenshot('calendar-swiped');await page.locator('.timeline-scroll').evaluate(el=>{el.scrollLeft=0;});
 await page.locator('.booking').filter({hasText:'Client Test A'}).click();
 expect(await page.locator('[name=status]').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
 await screenshot('reservation');await page.locator('#cancel').click();
 await page.locator('.app-navigation [data-screen=apartments]').click();await expect(page.locator('.apartment-card')).toHaveCount(4);
 const full=['phone-390','fold-unfolded','tablet-portrait','tablet-landscape'].includes(name);
 if(full)await screenshot('apartments');
 await page.locator('.app-navigation [data-screen=statistics]').click();await expect(page.locator('#statistics-primary>div')).toHaveCount(4);if(full){await screenshot('statistics');await page.locator('.statistics-chart').first().evaluate(el=>el.scrollIntoView({block:'start'}));await screenshot('statistics-charts');}
 await page.locator('.app-navigation [data-screen=reports]').click();await expect(page.locator('#report-export-excel')).toBeVisible();if(full){await screenshot('reports');await page.locator('.report-card').first().evaluate(el=>el.scrollIntoView({block:'start'}));await screenshot('reports-list');}
 await page.locator('#open-menu').click();await expect(page.locator('#app-menu')).toBeVisible();if(full)await screenshot('menu');
 await page.locator('#menu-payments').click();await expect(page.locator('#collections-content')).toBeVisible();if(full)await screenshot('payments');
 await page.locator('.top [data-language=en]').click();await expect(page.locator('h1')).toHaveText('Payments');
 expect(await page.evaluate(()=>localStorage.getItem('apartment-booking-manager:v1'))).toBe(before);
});
