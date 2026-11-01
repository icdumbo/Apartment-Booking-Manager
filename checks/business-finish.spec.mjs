import {test,expect} from '@playwright/test';
import {maintenanceExportFixture} from '../tests/fixtures/maintenance-export.mjs';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';

const profiles=[['folded',344,882],['phone-360',360,800],['s24-ultra',430,932],['unfolded',840,900],['desktop',1440,1000]];
const keys=['apartment-booking-manager:v1','apartment-booking-manager:maintenance:v1'];
async function selectedValues(page,panel){
 const metrics=await page.locator(panel+' select:visible').evaluateAll(els=>els.map(el=>{
  const s=getComputedStyle(el),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=s.font;
  const options=[...el.options].map(o=>({text:o.textContent,width:ctx.measureText(o.textContent).width}));
  return {id:el.id,selected:el.selectedOptions[0]?.textContent,options,space:el.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),gutter:parseFloat(s.paddingRight),font:parseFloat(s.fontSize),height:el.getBoundingClientRect().height,appearance:s.appearance,arrow:s.backgroundImage};
 }));
 expect(metrics.length).toBeGreaterThan(0);
 for(const m of metrics){
  expect(m.font,JSON.stringify(m)).toBeGreaterThanOrEqual(16);expect(m.height).toBeGreaterThanOrEqual(44);
  expect(m.gutter).toBeGreaterThanOrEqual(36);expect(m.appearance).toBe('none');expect(m.arrow).toContain('svg');
  for(const option of m.options)expect(option.width,JSON.stringify({id:m.id,...option,space:m.space})).toBeLessThanOrEqual(m.space+.5);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 // Exercise the native select/change handler, then restore its actual prior value.
 const last=page.locator(panel+' select:visible').last(),old=await last.inputValue();
 const next=await last.locator('option').last().getAttribute('value');
 await last.selectOption(next);await expect(last).toHaveValue(next);await last.selectOption(old);await expect(last).toHaveValue(old);
}
async function calendarContrast(page){
 const metrics=await page.evaluate(()=>{
  const lum=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  return [...document.querySelectorAll('.apartment-label strong,.apartment-label small,.day-heading strong,.day-heading small,.month-label,.booking-guest')].filter(el=>el.getClientRects().length).map(el=>{
   let p=el,bg;while(p){bg=getComputedStyle(p).backgroundColor;if(bg!=='transparent'&&bg!=='rgba(0, 0, 0, 0)')break;p=p.parentElement;}
   const a=lum(getComputedStyle(el).color),b=lum(bg);return {text:el.textContent,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
 });
 expect(metrics.length).toBeGreaterThan(30);for(const m of metrics)expect(m.ratio,JSON.stringify(m)).toBeGreaterThanOrEqual(4.5);
 await expect(page.locator('.day-heading.current')).toHaveCount(1);
 expect(await page.locator('.day-heading.current').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(40, 68, 92)');
 const free=page.locator('.day-cell:not(.weekend):not(.current)').first();
 expect(await free.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(48, 54, 59)');
 expect(await free.evaluate(el=>getComputedStyle(el).boxShadow)).toContain('114, 155, 128');
 expect(await page.locator('.legend .free').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(114, 155, 128)');
}
for(const [name,width,height] of profiles)test(`BUSINESS complete native selects and neutral calendar RO/EN ${name}`,async({page,context})=>{
 await page.setViewportSize({width,height});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');
 const fixture=maintenanceExportFixture();fixture.state.bookings.push(
  {id:'finish-short-a',apartmentId:'a',guest:'Ana',phone:'0700000000',status:'confirmed',checkIn:'2026-10-05',checkOut:'2026-10-06'},
  {id:'finish-short-b',apartmentId:'b',guest:'Dan',phone:'0700000000',status:'unconfirmed',checkIn:'2026-10-06',checkOut:'2026-10-07'});
 await page.evaluate(({state,data})=>{localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(state));localStorage.setItem('apartment-booking-manager:maintenance:v1',JSON.stringify(data));},fixture);
 await seedBrowserTrial(page);await page.reload();await expect(page.locator('.timeline-row')).toHaveCount(4);await context.setOffline(true);
 const before=await page.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),keys);
 for(const language of ['ro','en']){
  await page.locator('.top [data-language='+language+']').click();await page.locator('.app-navigation [data-screen=calendar]').click();
  await page.mouse.move(0,0);await calendarContrast(page);
  for(const guest of ['Ana','Dan']){
   const bar=page.locator('.booking').filter({hasText:new RegExp(guest)}),label=bar.locator('.booking-guest');
   const m=await label.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return {text:r.getBoundingClientRect().width,width:el.getBoundingClientRect().width};});
   expect(m.text).toBeLessThanOrEqual(m.width+.5);await bar.click();await expect(page.locator('#fields [name=guest]')).toHaveValue(guest);await page.locator('#cancel').click();
  }
  await page.screenshot({path:`test-results/BUSINESS-finish-${name}-calendar-${language}.png`});
  for(const [screen,panel] of [['reports','#reports-panel'],['statistics','#statistics-panel'],['payments','#payments-panel'],['maintenance','#maintenance-panel']]){
   if(screen==='payments'||screen==='maintenance'){await page.locator('#open-menu').click();await page.locator(screen==='payments'?'#menu-payments':'#app-menu [data-screen=maintenance]').click();}
   else await page.locator('.app-navigation [data-screen='+screen+']').click();
   await selectedValues(page,panel);await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`test-results/BUSINESS-finish-${name}-${screen}-${language}.png`});
  }
 }
 expect(await page.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),keys)).toEqual(before);
});
