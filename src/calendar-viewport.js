// Measure real available space, including Fold rotation, wrapped text and fixed navigation.
// Fixed vh offsets cannot account for these changes and can leave the last row behind the nav.
export function fitCalendarViewport(viewport,navigation){
 let frame;
 const update=()=>{
  frame=undefined;if(!viewport.getClientRects().length)return;
  const top=viewport.getBoundingClientRect().top;
  const visual=window.visualViewport;
  let bottom=visual?visual.offsetTop+visual.height:window.innerHeight;
  const nav=navigation.getBoundingClientRect();
  if(getComputedStyle(navigation).position==='fixed'&&nav.top>top)bottom=Math.min(bottom,nav.top);
  viewport.style.maxHeight=`${Math.max(96,Math.floor(bottom-top-12))}px`;
 };
 const schedule=()=>{if(frame===undefined)frame=requestAnimationFrame(update);};
 const observer=new ResizeObserver(schedule);
 for(const el of [viewport.closest('.calendar-card'),document.querySelector('.top'),document.querySelector('.intro'),document.querySelector('.access-card'),navigation])if(el)observer.observe(el);
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
 // Visibility changes on navigation must also be measured, even if dimensions are unchanged.
 const visibility=new MutationObserver(schedule);visibility.observe(document.getElementById('calendar-panel'),{attributes:true,attributeFilter:['hidden']});
 schedule();return schedule;
}
