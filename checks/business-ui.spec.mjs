import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {maintenanceExportFixture} from '../tests/fixtures/maintenance-export.mjs';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';

// Real application, fictional isolated records. The baseline is the stable CSS,
// obtained by CI from commit 84317b2, never an approximation of its dimensions.
// Compare the unchanged horizontal geometry and booking placement within each row.
// The address and owner lines intentionally change row and viewport heights.
const key='apartment-booking-manager:v1';
const fixture=maintenanceExportFixture();
fixture.state.bookings.push({id:'business-handover',apartmentId:'a',guest:'Client Test Schimb',phone:'0700000000',checkIn:'2026-10-12',checkOut:'2026-10-16',status:'unconfirmed',totalAmountCents:42000});
async function setup(page){
 await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');
 await page.evaluate(({state,data})=>{localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(state));localStorage.setItem('apartment-booking-manager:maintenance:v1',JSON.stringify(data));},fixture);
 await seedBrowserTrial(page);await page.reload();await expect(page.locator('.timeline-row')).toHaveCount(4);await expect(page.locator('.day-heading')).toHaveCount(31);
}
async function contrast(page,selectors){
 const values=await page.evaluate(selectors=>{
  const rgb=value=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
  const lum=value=>value.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length&&!el.closest('[hidden]')&&!el.matches(':disabled')&&el.textContent.trim()).map(el=>{
   let parent=el,bg;while(parent){const value=getComputedStyle(parent).backgroundColor;if(value!=='rgba(0, 0, 0, 0)'&&value!=='transparent'){bg=value;break;}parent=parent.parentElement;}
   const a=lum(rgb(getComputedStyle(el).color)),b=lum(rgb(bg||'rgb(29,35,39)'));return {selector,text:el.textContent.trim().slice(0,36),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  }));
 },selectors);
 expect(values.length).toBeGreaterThan(0);for(const value of values)expect(value.ratio,JSON.stringify(value)).toBeGreaterThanOrEqual(4.5);
}
async function geometry(page){return page.evaluate(()=>{
 const selectors=['.top','.intro','.actions','.toolbar','.navigation','.month-selector','.year-navigation','.month-options','.legend','.timeline-scroll','.timeline','.timeline-head','.calendar-head','.month','.day-heading','.apartment-label','.timeline-row','.track','.day-cell','.booking','.booking-status-icon','.handover','.calendar-footer','.app-navigation'];
 return Object.fromEntries(selectors.map(selector=>[selector,[...document.querySelectorAll(selector)].map(el=>{const box=el.getBoundingClientRect(),style=getComputedStyle(el);
  const row=el.closest('.timeline-row');
  const changesHeight=row&&!el.matches('.booking,.booking-status-icon')||el.matches('.timeline,.timeline-scroll');
  const y=el.matches('.calendar-footer')?0:box.y-(row?.getBoundingClientRect().y??0);
  return [box.x,y,box.width,changesHeight?0:box.height].map(v=>Math.round(v*100)/100).concat([style.position,style.left,style.top,style.fontSize,style.fontFamily,style.fontWeight]);})]));
});}

for(const [name,width,height] of [['folded',344,882],['s24-ultra',430,932],['unfolded',840,900],['desktop',1440,1000]])test(`BUSINESS calendar preserves baseline day widths and booking alignment ${name}`,async({page})=>{
 await page.setViewportSize({width,height});await setup(page);await page.locator("#today").click();const before=await geometry(page);
 const palette=await page.locator('.booking').evaluateAll(els=>els.map(el=>[el.style.getPropertyValue('--booking-color'),getComputedStyle(el).backgroundColor,getComputedStyle(el).borderStyle,getComputedStyle(el.querySelector('.booking-guest')).color]));
 const source=(await readFile('checks/business-baseline.generated.css','utf8')).replace('url("./assets/welcome-seaside.jpg")','url("/src/assets/welcome-seaside.jpg")');
 await page.locator('link[rel=stylesheet]').evaluateAll(els=>els.forEach(el=>el.disabled=true));const baseline=await page.addStyleTag({content:source});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 expect(await geometry(page)).toEqual(before);
 // Stylesheet replacement can start the existing 150 ms color transition.
 // Wait for its final color, preserving exact equality with the stable palette.
 await expect.poll(()=>page.locator('.booking').evaluateAll(els=>els.map(el=>[el.style.getPropertyValue('--booking-color'),getComputedStyle(el).backgroundColor,getComputedStyle(el).borderStyle,getComputedStyle(el.querySelector('.booking-guest')).color]))).toEqual(palette);
 await baseline.evaluate(el=>el.remove());await page.locator('link[rel=stylesheet]').evaluateAll(els=>els.forEach(el=>el.disabled=false));
 await expect.poll(()=>page.locator('#add-booking').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(220, 226, 229)');
 await contrast(page,['h1','.brand strong','.brand small','.legend','.day-heading strong','.day-heading small','.booking-guest','#add-booking']);
});

for(const [name,width,height] of [['folded',344,882],['s24-ultra',430,932],['unfolded',840,900],['desktop',1440,1000]])test(`BUSINESS real screens, contrast and offline navigation ${name}`,async({page,context})=>{
 await page.setViewportSize({width,height});const errors=[];page.on('pageerror',error=>errors.push(error.message));await setup(page);const before=await page.evaluate(key=>localStorage.getItem(key),key);await context.setOffline(true);
 async function shot(screen){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/BUSINESS-${name}-${screen}.png`,fullPage:false});}
 for(const language of ['ro','en']){
  await page.locator('.top [data-language='+language+']').click();await page.locator('.app-navigation [data-screen=calendar]').click();await page.evaluate(()=>scrollTo(0,0));await shot('calendar-'+language);
  await page.locator('.app-navigation [data-screen=apartments]').click();await shot('apartments-'+language);await contrast(page,['.apartment-info strong','.apartment-info span','.apartment-info small','.apartment-badge']);
  await page.locator('.apartment-card').first().click();await contrast(page,['#editor-title','#fields label>span','#fields input','.photo-message']);await shot('apartment-details-'+language);await page.locator('#cancel').click();
  await page.locator('.app-navigation [data-screen=statistics]').click();await contrast(page,['.collections-filters label','.statistics-primary span','.statistics-primary strong','.statistics-secondary span','.statistics-secondary strong']);await page.evaluate(()=>scrollTo(0,0));await shot('statistics-'+language);await page.locator('#statistics-primary').evaluate(el=>el.scrollIntoView({block:'start'}));await shot('statistics-overview-'+language);
  await page.locator('.app-navigation [data-screen=reports]').click();await contrast(page,['#reports-panel h2','.report-filters label','.report-summary-table th','.report-summary-table td','.report-card dt','.report-card dd','#report-count','#report-unpriced','#report-export-excel','#report-export-pdf']);await page.evaluate(()=>scrollTo(0,0));await shot('reports-'+language);
  await page.locator('#open-menu').click();await expect(page.locator('#menu-account')).not.toHaveAttribute('open','');await contrast(page,['#app-menu h2','#app-menu .menu-functions-heading','#app-menu .menu-shortcuts button','#app-menu .menu-account-label strong','#menu-access-status']);await shot('menu-'+language);
  await page.locator('#menu-account>summary').click();await contrast(page,['#menu-access-details','#commerce-controls p','#commerce-controls button']);await shot('account-'+language);await page.locator('#close-menu').click();
  await page.locator('#open-menu').click();await page.locator('#menu-payments').click();await contrast(page,['#payments-panel h2','.collections-filters label','.collection-info strong','.collection-amount']);await page.evaluate(()=>scrollTo(0,0));await shot('payments-'+language);
  await page.locator('#open-menu').click();await page.locator('#app-menu [data-screen=maintenance]').click();await contrast(page,['.maintenance-tabs button','.maintenance-filters label','.maintenance-card h3','.maintenance-card p','.maintenance-totals strong','#maintenance-export-excel','#maintenance-export-pdf']);await page.evaluate(()=>scrollTo(0,0));await shot('maintenance-'+language);
  await page.locator('#open-menu').click();await page.locator('#open-backup').click();await contrast(page,['#backup-dialog h2','#backup-content p','#backup-content button']);await shot('backup-'+language);await page.locator('#close-backup').click();
 }
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(before);expect(errors).toEqual([]);
});

for(const state of ['BASIC','TRIAL','PREMIUM'])test(`BUSINESS verified-native UI state ${state} keeps compact account and controls`,async({page})=>{
 await page.setViewportSize({width:344,height:882});await page.addInitScript(state=>{localStorage.setItem('apartment-booking-manager:welcome:v1','dismissed');window.Capacitor={getPlatform:()=> 'android',Plugins:{BookingAuth:{addListener:()=>({remove:async()=>{}}),getCurrentUser:async()=>({user:{uid:'fictional-business-user'}})},BookingAccess:{getAccess:async()=>({subject:'fictional-business-user',state,premiumSource:state==='PREMIUM'?'OWNER_GRANT':null,...(state==='TRIAL'?{remainingMs:86400000}:{})}),beginVerification:async()=>{throw Error('UI fixture, no live service');}},BookingBilling:{addListener:()=>({remove:async()=>{}}),getProduct:async()=>({available:false})}}};},state);
 await page.goto('/');await expect(page.locator('#menu-access-status')).toContainText(state);await page.locator('#open-menu').click();await expect(page.locator('#menu-account')).not.toHaveAttribute('open','');await contrast(page,['#menu-access-status','#app-menu .menu-shortcuts button']);await page.screenshot({path:`test-results/BUSINESS-state-${state}.png`});await page.locator('#menu-account>summary').click();await expect(page.locator('#account-controls')).toBeVisible();
});

test('BUSINESS form errors and keyboard focus remain readable without saving invalid data',async({page})=>{
 await setup(page);const before=await page.evaluate(key=>localStorage.getItem(key),key);await page.locator('#add-apartment').click();await page.locator('#editor [type=submit]').click();await expect(page.locator('#form-error')).not.toBeEmpty();await contrast(page,['#form-error','#editor-title','#fields label>span','#fields input','#editor .primary']);const name=page.locator('#fields input[name=name]');await name.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(name).toBeFocused();expect(await name.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(before);
});
