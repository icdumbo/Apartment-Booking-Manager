// Browser-only legacy trial fixture for UI tests, never a native license proof.
// New installs remain BASIC; financial UI tests must declare their access state.
export async function seedBrowserTrial(page,{expired=false}={}){
 await page.evaluate(expired=>{
  if(globalThis.Capacitor?.getPlatform?.()==='android')throw Error('Browser trial fixture cannot authorize Android');
  const startedAt=expired?0:Date.now();
  localStorage.setItem('apartment-booking-manager:access:v1',JSON.stringify({version:1,startedAt,lastSeen:startedAt}));
 },expired);
}
