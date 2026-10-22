import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCollections} from '../src/collections.js';
import {collectionsFixture as state} from '../checks/fixtures/collections.mjs';
const filters={year:2026,month:10,currency:'RON'},trial={state:'TRIAL'};
test('collections use receipt dates; balances use intersecting stays with check-out excluded',()=>{
 const before=JSON.stringify(state),result=selectCollections(state,filters,trial);
 assert.equal(result.receivedAmountCents,80000);assert.equal(result.paymentCount,3);assert.equal(result.outstandingAmountCents,90000);assert.equal(result.unpricedStays,1);
 assert.deepEqual(result.rows.map(r=>r.payment.date),['2026-10-20','2026-10-10','2026-10-05']);assert.ok(result.rows.some(r=>r.bookingId==='outside'));assert.equal(JSON.stringify(state),before);
 const november=selectCollections(state,{...filters,month:11},trial);assert.equal(november.paymentCount,0);assert.equal(november.outstandingAmountCents,60000);
});
test('RON/EUR and apartment filters stay separate without conversions',()=>{
 const eur=selectCollections(state,{...filters,currency:'EUR'},trial);assert.equal(eur.receivedAmountCents,10000);assert.equal(eur.outstandingAmountCents,40000);assert.equal(eur.paymentCount,1);assert.equal(eur.legacyAmountCents,0);
 const a=selectCollections(state,{...filters,apartmentId:'a'},trial);assert.equal(a.receivedAmountCents,70000);assert.equal(a.outstandingAmountCents,50000);assert.equal(a.legacy.length,0);
 const b=selectCollections(state,{...filters,apartmentId:'b'},trial);assert.equal(b.receivedAmountCents,10000);assert.equal(b.outstandingAmountCents,40000);
});
test('undated legacy amounts are separate across all periods and never double counted',()=>{
 const result=selectCollections(state,filters,trial);assert.equal(result.legacyAmountCents,30000);assert.equal(result.legacy.length,2);assert.equal(result.receivedAmountCents,80000);
 const oldYear=selectCollections(state,{...filters,year:2025},trial);assert.equal(oldYear.paymentCount,0);assert.equal(oldYear.outstandingAmountCents,0);assert.equal(oldYear.legacyAmountCents,30000);
});
test('empty state, missing totals and BASIC restrictions are explicit',()=>{
 const empty=selectCollections({apartments:[],bookings:[]},filters,trial);assert.equal(empty.paymentCount,0);assert.equal(empty.receivedAmountCents,0);assert.equal(empty.outstandingAmountCents,0);assert.equal(empty.legacy.length,0);
 assert.throws(()=>selectCollections(state,filters,{state:'BASIC'}),/premiumPayments/);
 assert.deepEqual(selectCollections(state,filters,{state:'PREMIUM'}),selectCollections(state,filters,trial));
});
test('invalid filters and unsafe aggregate totals fail without returning rounded money',()=>{
 for(const extra of [{year:0},{year:10000},{year:2026.5},{month:0},{month:13}])assert.throws(()=>selectCollections(state,{...filters,...extra},trial),/invalidCollectionPeriod/);
 assert.throws(()=>selectCollections(state,{...filters,currency:'USD'},trial),/invalidCurrency/);
 const big={...state,bookings:state.bookings.slice(0,2).map((b,i)=>({...b,totalAmountCents:Number.MAX_SAFE_INTEGER,paidAmountCents:Number.MAX_SAFE_INTEGER,payments:[{id:String(i),date:'2026-10-01',amountCents:Number.MAX_SAFE_INTEGER,method:'cash'}]}))};assert.throws(()=>selectCollections(big,filters,trial),/collectionOverflow/);
});
test('leap day and year boundaries filter exact collection days',()=>{
 const fixture={...state,bookings:[{...state.bookings[0],checkIn:'2024-02-28',checkOut:'2024-03-01',totalAmountCents:300,paidAmountCents:200,payments:[{id:'feb',date:'2024-02-29',amountCents:100,method:'cash'},{id:'march',date:'2024-03-01',amountCents:100,method:'cash'}]}]};
 const feb=selectCollections(fixture,{...filters,year:2024,month:2},trial);assert.equal(feb.paymentCount,1);assert.equal(feb.outstandingAmountCents,100);assert.equal(selectCollections(fixture,{...filters,year:2024,month:3},trial).outstandingAmountCents,0);
 assert.doesNotThrow(()=>selectCollections({apartments:[],bookings:[]},{...filters,year:9999,month:12},trial));assert.doesNotThrow(()=>selectCollections({apartments:[],bookings:[]},{...filters,year:1,month:1},trial));
});
