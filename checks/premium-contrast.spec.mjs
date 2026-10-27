import {test,expect} from '@playwright/test';
import {collectionsFixture} from './fixtures/collections.mjs';
import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
for(const width of [360,840])test(`PREMIUM text contrast RO/EN ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');
 await page.evaluate(s=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(s)),{...collectionsFixture,bookings:[...collectionsFixture.bookings,
 {id:'contrast-a',apartmentId:'a',guest:'Test Confirmat',phone:'0700000000',checkIn:'2026-10-04',checkOut:'2026-10-10',status:'confirmed'},
 {id:'contrast-b',apartmentId:'a',guest:'Test Neconfirmat',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-14',status:'unconfirmed'}]});await seedBrowserTrial(page);await page.reload();
 const check=async selectors=>{
  const results=await page.evaluate(selectors=>{
   const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
   const lum=a=>a.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
   return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length).map(el=>{
    let node=el,background;while(node){const c=getComputedStyle(node).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){background=c;break;}node=node.parentElement;}
    const style=getComputedStyle(el),a=lum(rgb(style.color)),b=lum(rgb(background||'rgb(248, 250, 252)'));
    return {selector,text:el.textContent.trim().slice(0,30),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
   }));
  },selectors);
  expect(results.length).toBeGreaterThan(0);for(const result of results)expect(result.ratio,JSON.stringify(result)).toBeGreaterThanOrEqual(4.5);
 };
 for(const language of ['ro','en']){
  await page.locator(`.top [data-language=${language}]`).click();
  await check(['h1','.brand strong','.brand small','.day-heading strong','.day-heading small','.booking-guest','.legend','#add-booking','#access-message']);
  await page.locator('.booking').filter({hasText:'Test Confirmat'}).click();await check(['#fields label>span','#fields input','#fields select','#editor-title','#editor .primary']);await page.locator('#cancel').click();
  await page.locator('.app-navigation [data-screen=statistics]').click();await check(['.collections-filters label','.statistics-primary span','.statistics-primary strong','.statistics-secondary span','.statistics-secondary strong']);
  await page.locator('.app-navigation [data-screen=calendar]').click();
 }
});
