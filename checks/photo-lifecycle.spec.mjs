import {test,expect} from '@playwright/test';
import {photo64} from '../tests/fixtures/backup-photo.mjs';
test('real IndexedDB restores reuse photos; live views protect staged images until a later safe startup',async({page,context})=>{
 await page.goto('/src/legal/privacy.html');
 const initial=await page.evaluate(async photo64=>{
  const {apartmentPhotos:photos}=await import('/src/apartment-photo.js');
  const {beginPhotoSession}=await import('/src/photo-lifecycle.js');
  const {createBackup,parseBackup,restoreBackup,disposeBackup}=await import('/src/backup.js');
  const photoId=await photos.write(new Blob([Uint8Array.from(atob(photo64),c=>c.charCodeAt(0))],{type:'image/jpeg'}));
  const business={version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'fictional-a',name:'Fictional apartment',address:'Fictional street',city:'Fictional city',photoId}],bookings:[{id:'fictional-b',apartmentId:'fictional-a',guest:'Fictional guest',phone:'0700000000',checkIn:'2026-11-01',checkOut:'2026-11-02',totalAmountCents:10000,paidAmountCents:1000}]};
  localStorage.setItem('apartment-booking-manager:v1',JSON.stringify(business));
  window.releasePhotoSession=await beginPhotoSession({photos});
  const bytes=await createBackup();
  for(let i=0;i<3;i++){const doc=await parseBackup(bytes);await restoreBackup(doc);await disposeBackup(doc);}
  const staged=await photos.write(new Blob(['fictional in-progress photo'],{type:'image/jpeg'}));
  window.testPhotoIds={photoId,staged};
  return {count:(await photos.ids()).length,business:JSON.parse(localStorage.getItem('apartment-booking-manager:v1')),expected:business};
 },photo64);
 expect(initial.count).toBe(2);expect(initial.business).toEqual(initial.expected);
 const other=await context.newPage();await other.goto('/src/legal/privacy.html');
 expect(await other.evaluate(async()=>{const {apartmentPhotos:photos}=await import('/src/apartment-photo.js');const {beginPhotoSession}=await import('/src/photo-lifecycle.js');window.releasePhotoSession=await beginPhotoSession({photos});return (await photos.ids()).length;})).toBe(2);
 await page.evaluate(()=>window.releasePhotoSession());await other.close();
 // Closing a page resolves before Chromium necessarily releases its Web Locks.
 await page.evaluate(()=>navigator.locks.request('apartment-booking-manager:photo-use',()=>{}));
 const result=await page.evaluate(async()=>{const {apartmentPhotos:photos}=await import('/src/apartment-photo.js');const {beginPhotoSession}=await import('/src/photo-lifecycle.js');window.releasePhotoSession=await beginPhotoSession({photos});const ids=await photos.ids();return {ids,expected:window.testPhotoIds.photoId,bytes:(await photos.read(window.testPhotoIds.photoId)).size};});
 expect(result.ids).toEqual([result.expected]);expect(result.bytes).toBeGreaterThan(100);
 await page.evaluate(()=>window.releasePhotoSession());
});
