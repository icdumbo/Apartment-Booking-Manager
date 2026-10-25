import {seedBrowserTrial} from './fixtures/browser-trial.mjs';
import {test,expect} from '@playwright/test';
import {collectionsFixture as fixture} from './fixtures/collections.mjs';
for(const width of [360,390,430])for(const language of ['ro','en'])test(`chart spacing ${width} ${language}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-10-06T09:00:00Z')});await page.goto('/');
 await page.evaluate(data=>localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(data)),fixture);await seedBrowserTrial(page);await page.reload();await page.locator(`.top [data-language=${language}]`).click();await page.locator('.app-navigation [data-screen=statistics]').click();
 async function check(){return page.locator('.statistics-chart').evaluateAll(sections=>sections.map(section=>{
  const svg=section.querySelector('svg'),box=svg.getBoundingClientRect(),months=[...svg.querySelectorAll('.statistics-month')].map(el=>el.getBoundingClientRect()),axes=[...svg.querySelectorAll('.statistics-axis')].map(el=>el.getBoundingClientRect()),line=svg.querySelector('line').getBoundingClientRect(),bars=[...svg.querySelectorAll('rect')].map(el=>el.getBoundingClientRect());
  return {height:box.height,count:months.length,gap:section.querySelector('summary').getBoundingClientRect().top-Math.max(...months.map(r=>r.bottom)),axisGap:axes[1].top-line.bottom,topGap:Math.min(line.top,...bars.map(r=>r.top))-axes[0].bottom,monthGap:months[0].top-axes[1].bottom,overlap:months.some((r,i)=>i&&r.left<months[i-1].right),inside:months.every(r=>r.left>=box.left&&r.right<=box.right)};
 }));}
 const normal=await check();
 for(const row of normal){expect(row.count).toBe(12);expect(row.gap).toBeGreaterThanOrEqual(16);expect(row.axisGap).toBeGreaterThan(3);expect(row.topGap).toBeGreaterThan(3);expect(row.monthGap).toBeGreaterThan(3);expect(row.overlap).toBe(false);expect(row.inside).toBe(true);}
 await page.locator('#statistics-currency').selectOption('EUR');for(const row of await check()){expect(row.gap).toBeGreaterThanOrEqual(16);expect(row.overlap).toBe(false);}
 await page.locator('#statistics-year').fill('2030');await page.locator('#statistics-year').dispatchEvent('change');const empty=await check();expect(empty[0].height).toBeLessThan(normal[0].height);
 for(const row of empty){expect(row.gap).toBeGreaterThanOrEqual(16);expect(row.axisGap).toBeGreaterThan(3);expect(row.monthGap).toBeGreaterThan(3);expect(row.overlap).toBe(false);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
