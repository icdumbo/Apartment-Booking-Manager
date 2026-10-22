import test from 'node:test';
import assert from 'node:assert/strict';
import {selectReservationsReport as select} from '../src/reservations-report.js';
import {collectionsFixture as fixture} from '../checks/fixtures/collections.mjs';
const filters={start:'2026-10-01',end:'2026-10-31',currency:'RON'},trial={state:'TRIAL'};
test('overlapping stays retain full dates, nights and current amounts; no writes',()=>{
 const before=JSON.stringify(fixture),r=select(fixture,filters,trial);
 assert.deepEqual(r.rows.map(b=>b.bookingId),['unknown','legacy','cross']);
 const cross=r.rows.find(b=>b.bookingId==='cross');assert.equal(cross.checkOut,'2026-11-03');assert.equal(cross.nights,6);assert.equal(cross.totalAmountCents,100000);assert.equal(cross.receivedAmountCents,50000);
 assert.equal(r.totalAmountCents,160000);assert.equal(r.receivedAmountCents,70000);assert.equal(r.balanceCents,90000);assert.equal(r.unpricedCount,1);assert.equal(r.rows[0].balanceCents,undefined);assert.equal(JSON.stringify(fixture),before);
});
test('inclusive last date and exclusive check-out, including a one-day selection',()=>{
 assert.deepEqual(select(fixture,{...filters,start:'2026-10-28',end:'2026-10-28'},trial).rows.map(b=>b.bookingId),['cross']);
 assert.equal(select(fixture,{...filters,start:'2026-11-03',end:'2026-11-03'},trial).rows.length,0);
 assert.deepEqual(select(fixture,{...filters,end:'2026-10-01'},trial).rows.map(b=>b.bookingId),['unknown']);
});
test('apartment, status and currency filters combine without mixing amounts',()=>{
 const data=structuredClone(fixture);data.bookings.find(b=>b.id==='cross').status='unconfirmed';
 assert.equal(select(data,{...filters,status:'unconfirmed',apartmentId:'a'},trial).totalAmountCents,100000);
 assert.equal(select(data,{...filters,status:'confirmed',apartmentId:'a'},trial).totalAmountCents,0);
 const eur=select(data,{...filters,currency:'EUR'},trial);assert.equal(eur.rows.length,1);assert.equal(eur.totalAmountCents,50000);assert.equal(eur.receivedAmountCents,10000);assert.equal(eur.balanceCents,40000);
});
test('legacy and mixed receipts are counted once; missing prices and explicit zero stay distinct',()=>{
 const r=select(fixture,{...filters,start:'2026-09-01'},trial);assert.equal(r.legacyAmountCents,30000);assert.equal(r.rows.find(b=>b.bookingId==='mixed').receivedAmountCents,20000);assert.equal(r.rows.find(b=>b.bookingId==='legacy').receivedAmountCents,20000);
 const zero={...fixture,bookings:[{...fixture.bookings[0],totalAmountCents:0,paidAmountCents:0,payments:[]}]};const z=select(zero,filters,trial);assert.equal(z.balanceCents,0);assert.equal(z.unpricedCount,0);
});
test('BASIC denies access, PREMIUM matches trial, invalid filters and overflow fail safely',()=>{
 assert.throws(()=>select(fixture,filters,{state:'BASIC'}),/reportPremium/);assert.deepEqual(select(fixture,filters,{state:'PREMIUM'}),select(fixture,filters,trial));
 for(const extra of [{start:''},{start:'2026-02-30'},{end:'2026-09-30'},{status:'cancelled'}])assert.throws(()=>select(fixture,{...filters,...extra},trial),/reportInvalidPeriod/);
 assert.throws(()=>select(fixture,{...filters,currency:'USD'},trial),/invalidCurrency/);
 const data={...fixture,bookings:[0,1].map(i=>({...fixture.bookings[0],id:String(i),totalAmountCents:Number.MAX_SAFE_INTEGER}))};assert.throws(()=>select(data,filters,trial),/collectionOverflow/);
});
test('empty results have zero totals and do not fabricate rows',()=>{
 const r=select({apartments:[],bookings:[]},filters,trial);assert.equal(r.rows.length,0);assert.equal(r.totalAmountCents,0);assert.equal(r.receivedAmountCents,0);assert.equal(r.balanceCents,0);
});
