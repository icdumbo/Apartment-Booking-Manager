import {test,expect} from '@playwright/test';
const state={version:1,apartments:[{id:'fixture-a',name:'Apartament Test cu nume lung',address:'Adresă fictivă',city:'Oraș Test'}],bookings:[{id:'fixture-one',apartmentId:'fixture-a',guest:'Client Test 1',phone:'0700000000',checkIn:'2026-10-04',checkOut:'2026-10-10',status:'confirmed'},{id:'fixture-two',apartmentId:'fixture-a',guest:'Client Test 2',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-15',status:'unconfirmed'}]};
for(const [name,width,height] of [['narrow portrait',320,800],['Fold folded',360,800],['portrait',390,844],['S24 Ultra',412,915],['landscape',740,360],['Fold unfolded',840,900],['tablet',1024,768],['desktop',1440,900]]){
 test(name,async({page})=>{
  await page.setViewportSize({width,height});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});
  await page.addInitScript(s=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(s)),state);await page.goto('/');
  await expect(page.locator('.day-heading')).toHaveCount(30);await expect(page.locator('.month-option')).toHaveCount(12);await expect(page.locator('.booking')).toHaveCount(2);
  const metrics=await page.evaluate(()=>{
   const r=e=>{const x=e.getBoundingClientRect();return {left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width}};
   const text=e=>{const range=document.createRange();range.selectNodeContents(e);return r(range)};
   return {body:[document.documentElement.scrollWidth,document.documentElement.clientWidth],days:[...document.querySelectorAll('.day-heading')].map(e=>({cell:r(e),text:text(e.querySelector('strong'))})),months:[...document.querySelectorAll('.month-option')].map(e=>({cell:r(e),text:text(e)})),headers:[...document.querySelectorAll('.months .month')].map(r),bookings:[...document.querySelectorAll('.booking')].map(r),handover:r(document.querySelector('.handover')),dayFont:parseFloat(getComputedStyle(document.querySelector('.day-heading strong')).fontSize),corner:{cell:r(document.querySelector('.corner')),text:text(document.querySelector('.corner'))},apartmentWidth:document.querySelector('.apartment-label').getBoundingClientRect().width,scroll:[...document.querySelectorAll('.timeline-scroll,.month-options-scroll')].map(e=>[e.scrollWidth,e.clientWidth])};
  });
  expect(metrics.body[0]).toBeLessThanOrEqual(metrics.body[1]);for(const [index,[scroll,client]] of metrics.scroll.entries()){if(width<=600&&index===1)expect(scroll).toBeGreaterThan(client);else expect(scroll).toBeLessThanOrEqual(client);}
  for(const {cell,text} of [...metrics.days,...metrics.months]){expect(text.left).toBeGreaterThanOrEqual(cell.left-.5);expect(text.right).toBeLessThanOrEqual(cell.right+.5);}
  const days=metrics.days;const oldSize=Math.min(13,(days[0].cell.width-1)*.62);if(width<=600){expect(metrics.dayFont).toBeGreaterThanOrEqual(8);expect(metrics.apartmentWidth).toBeGreaterThanOrEqual(110);expect(metrics.apartmentWidth).toBeLessThanOrEqual(130);expect(metrics.corner.text.right).toBeLessThanOrEqual(metrics.corner.cell.right+.5);expect(metrics.corner.text.bottom-metrics.corner.text.top).toBeLessThan(16);}else{expect(metrics.dayFont).toBeCloseTo(oldSize,1);const available=metrics.days[29].cell.right-metrics.days[0].cell.left+metrics.apartmentWidth;expect(metrics.apartmentWidth).toBeCloseTo(Math.min(180,Math.max(60,available*.16)),1);}expect(metrics.headers[0].left).toBeCloseTo(days[0].cell.left,1);expect(metrics.headers[0].right).toBeCloseTo(days[27].cell.right,1);expect(metrics.headers[1].right).toBeCloseTo(days[29].cell.right,1);
  const center=(days[6].cell.left+days[6].cell.right)/2;expect(metrics.bookings[0].right).toBeCloseTo(center,1);expect(metrics.bookings[1].left).toBeCloseTo(center,1);expect((metrics.handover.left+metrics.handover.right)/2).toBeCloseTo(center,1);
  await expect(page.locator('.month-option.active')).toHaveText('Oct');await expect(page.locator('.month-option.upcoming')).toHaveText('Nov');
  await page.screenshot({path:`test-results/${name.replaceAll(' ','-')}.png`,fullPage:true});
  await page.getByRole('button',{name:'Anul următor',exact:true}).click();await expect(page.locator('#selector-year')).toHaveText('2027');await expect(page.locator('#range')).toHaveText('04/10/2026 – 02/11/2026');await page.getByRole('button',{name:'Astăzi',exact:true}).click();await expect(page.locator('#selector-year')).toHaveText('2026');
  await page.getByRole('button',{name:'+ Rezervare',exact:true}).click();await expect(page.getByLabel('Check-in (DD/MM/YYYY)',{exact:true})).toHaveValue('06/10/2026');await expect(page.getByLabel('Check-out (DD/MM/YYYY)',{exact:true})).toHaveValue('07/10/2026');
 });
}
test('new installation remains empty after reload',async({page})=>{await page.goto('/');await expect(page.locator('.booking')).toHaveCount(0);await expect(page.locator('.timeline-row')).toHaveCount(0);await page.reload();await expect(page.locator('.timeline-row')).toHaveCount(0);});
test('layout adapts when folding and rotating without a reload',async({page})=>{await page.addInitScript(s=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(s)),state);await page.goto('/');for(const width of [360,840,740,320,1440]){await page.setViewportSize({width,height:800});await expect(page.locator('.day-heading')).toHaveCount(30);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);}});

for(const width of [360,390,430]){
 test(`phone sticky timeline ${width}`,async({page})=>{
  await page.setViewportSize({width,height:600});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});
  const fixtures={...state,apartments:Array.from({length:10},(_,i)=>({...state.apartments[0],id:i?'fixture-'+i:'fixture-a',name:'Apartamentul cu un nume foarte lung pentru verificarea trunchierii '+i}))};
  await page.addInitScript(s=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(s)),fixtures);await page.goto('/');
  const measure=()=>page.evaluate(()=>{
   const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,width:b.width,height:b.height}};
   const viewport=document.querySelector('.timeline-scroll'),label=document.querySelector('.timeline-row .apartment-label');
   return {viewport:r(viewport),label:r(label),head:r(document.querySelector('.timeline-head')),corner:r(document.querySelector('.corner')),date:r(document.querySelector('.day-heading')),cell:r(document.querySelector('.day-cell')),track:r(document.querySelector('.track')),name:r(label.querySelector('strong')),font:parseFloat(getComputedStyle(document.querySelector('.day-heading strong')).fontSize),scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop,monthLabel:r(document.querySelector('.month-label'))};
  });
  const before=await measure();expect((before.viewport.width-before.label.width)/before.date.width).toBeCloseTo(15,1);expect(before.font).toBeGreaterThanOrEqual(10);expect(before.label.width).toBeGreaterThanOrEqual(110);expect(before.name.height).toBeLessThanOrEqual(27);expect(before.label.top).toBeCloseTo(before.track.top,1);expect(before.date.left).toBeCloseTo(before.cell.left,1);
  const controls=await page.locator('#prev,#today,#next').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().top));expect(Math.max(...controls)-Math.min(...controls)).toBeLessThan(1);
  await page.screenshot({path:`test-results/phone-${width}-start.png`,fullPage:true});
  await page.locator('.timeline-scroll').evaluate(el=>{el.scrollLeft=100;el.scrollTop=110});
  await expect.poll(async()=>(await measure()).scrollLeft).toBeGreaterThan(90);
  const after=await measure();expect(after.label.left).toBeCloseTo(before.label.left,1);expect(after.corner.left).toBeCloseTo(before.corner.left,1);expect(after.head.top).toBeCloseTo(after.viewport.top,1);expect(after.label.top).toBeCloseTo(after.track.top,1);expect(after.date.left).toBeCloseTo(after.cell.left,1);expect(before.date.left-after.date.left).toBeCloseTo(after.scrollLeft,1);expect(after.scrollTop).toBeGreaterThan(100);expect(after.monthLabel.left).toBeGreaterThanOrEqual(after.corner.right-.5);expect(after.monthLabel.right).toBeLessThanOrEqual(after.viewport.right+.5);
  const geometry=await page.evaluate(()=>{const days=[...document.querySelectorAll('.day-heading')],d=days[6].getBoundingClientRect(),bars=[...document.querySelectorAll('.booking')].map(e=>e.getBoundingClientRect()),line=document.querySelector('.handover').getBoundingClientRect();return {center:(d.left+d.right)/2,end:bars[0].right,start:bars[1].left,line:(line.left+line.right)/2}});for(const edge of [geometry.end,geometry.start,geometry.line])expect(edge).toBeCloseTo(geometry.center,1);
  await page.screenshot({path:`test-results/phone-${width}-scrolled.png`,fullPage:true});
  await page.locator('.timeline-scroll').evaluate(el=>{el.scrollLeft=el.scrollWidth;el.scrollTop=0});const last=await page.locator('.day-heading').last().boundingBox();const viewport=(await measure()).viewport;expect(last.x+last.width).toBeLessThanOrEqual(viewport.right+.5);
 });
}

test('BASIC ten-apartment limit preserves existing data and editing',async({page})=>{
 const fixtures={version:1,apartments:Array.from({length:9},(_,i)=>({...state.apartments[0],id:'limit-'+i,name:'Apartment '+i})),bookings:[]};
 await page.goto('/');await page.evaluate(s=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(s)),fixtures);await page.reload();
 await page.locator('#add-apartment').click();await page.getByLabel('Nume / identificare',{exact:true}).fill('Apartment 10');await page.getByLabel('Adresă',{exact:true}).fill('Test address');await page.getByLabel('Localitate',{exact:true}).fill('Test city');await page.getByRole('button',{name:'Salvează',exact:true}).click();
 await expect(page.locator('.timeline-row')).toHaveCount(10);await expect(page.locator('#add-apartment')).toBeDisabled();
 await page.locator('.timeline-row .apartment-label').first().click();await page.getByLabel('Nume / identificare',{exact:true}).fill('Edited apartment');await page.getByRole('button',{name:'Salvează',exact:true}).click();await expect(page.locator('.timeline-row').first()).toContainText('Edited apartment');
 await page.reload();await expect(page.locator('.timeline-row')).toHaveCount(10);await expect(page.locator('#add-apartment')).toBeDisabled();
 await page.locator('.top [data-language="en"]').click();await expect(page.locator('#add-apartment')).toHaveAttribute('title','The BASIC version allows up to 10 apartments.');
});
