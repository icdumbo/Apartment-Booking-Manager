import test from 'node:test';
import assert from 'node:assert/strict';
import {selectStatistics} from '../src/statistics.js';
import {collectionsFixture as fixture} from '../checks/fixtures/collections.mjs';
const filters={year:2026,month:10,mode:'monthly',currency:'RON'},trial={state:'TRIAL'};
test('monthly nights clip cross-month stays and occupancy is independent of currency',()=>{
 const before=JSON.stringify(fixture),ron=selectStatistics(fixture,filters,trial),eur=selectStatistics(fixture,{...filters,currency:'EUR'},trial);
 // Cross: Oct 28-31 = 4; unknown: 1; EUR: 2; legacy: 5. Check-out Oct 1 excluded.
 assert.equal(ron.current.occupiedNights,12);assert.equal(ron.current.bookingCount,4);assert.equal(ron.current.capacity,62);assert.equal(ron.current.availableNights,50);assert.equal(ron.current.averageStay,3);assert.equal(ron.current.occupancy,12/62*100);
 assert.equal(eur.current.occupiedNights,12);assert.equal(eur.current.occupancy,ron.current.occupancy);assert.equal(JSON.stringify(fixture),before);
});
test('cash uses payment dates; valuation metrics use only priced stays of selected currency',()=>{
 const ron=selectStatistics(fixture,filters,trial).current,eur=selectStatistics(fixture,{...filters,currency:'EUR'},trial).current;
 assert.equal(ron.receivedAmountCents,80000);assert.equal(eur.receivedAmountCents,10000);assert.equal(ron.averageBookingValueCents,80000);assert.equal(eur.averageBookingValueCents,50000);
 // RON prorated values: round(100000 * 4 / 6) + 60000 = 126667; 9 priced nights.
 assert.equal(ron.averageNightValueCents,14074);assert.equal(eur.averageNightValueCents,25000);assert.equal(ron.unpricedCount,1);assert.equal(ron.legacyAmountCents,30000);assert.equal(ron.noHistoryValue,60000);assert.equal(ron.noHistoryCount,1);
});
test('annual reservations count once, nights and cash match the twelve monthly series',()=>{
 const result=selectStatistics(fixture,{...filters,mode:'annual'},trial);assert.equal(result.current.bookingCount,8);assert.equal(result.current.occupiedNights,22);assert.equal(result.current.capacity,730);assert.equal(result.current.receivedAmountCents,90000);
 assert.equal(result.series.reduce((sum,m)=>sum+m.occupiedNights,0),result.current.occupiedNights);assert.equal(result.series.reduce((sum,m)=>sum+m.receivedAmountCents,0),result.current.receivedAmountCents);assert.ok(result.series.reduce((sum,m)=>sum+m.bookingCount,0)>result.current.bookingCount);
});
test('apartment selection changes capacity; empty, unknown-priced and zero-priced periods are safe',()=>{
 const a=selectStatistics(fixture,{...filters,apartmentId:'a'},trial).current;assert.equal(a.capacity,31);assert.equal(a.occupiedNights,5);assert.equal(a.receivedAmountCents,70000);
 const empty=selectStatistics({apartments:[],bookings:[]},filters,trial).current;assert.equal(empty.occupancy,0);assert.equal(empty.averageStay,0);assert.equal(empty.availableNights,0);assert.equal(empty.averageBookingValueCents,undefined);assert.equal(empty.averageNightValueCents,undefined);
 const unknown={...fixture,bookings:[fixture.bookings.find(b=>b.id==='unknown')]};assert.equal(selectStatistics(unknown,filters,trial).current.averageNightValueCents,undefined);
 unknown.bookings=[{...unknown.bookings[0],totalAmountCents:0}];assert.equal(selectStatistics(unknown,filters,trial).current.averageNightValueCents,0);
});
test('comparison uses same month of previous year and explicitly distinguishes missing records',()=>{
 const noPrevious=selectStatistics(fixture,{...filters,mode:'comparison'},trial);assert.equal(noPrevious.previous.hasData,false);
 const history={...fixture,bookings:[...fixture.bookings,{...fixture.bookings[0],id:'past',checkIn:'2025-10-10',checkOut:'2025-10-12',totalAmountCents:40000,paidAmountCents:20000,payments:[{id:'past-p',date:'2025-10-11',amountCents:20000,method:'cash'}]}]};const result=selectStatistics(history,{...filters,mode:'comparison'},trial);assert.equal(result.previous.occupiedNights,2);assert.equal(result.previous.receivedAmountCents,20000);assert.equal(result.previousSeries[9].receivedAmountCents,20000);assert.equal(result.current.receivedAmountCents,80000);
});
test('leap-year capacity, interval union, access checks and filter validation',()=>{
 const leap=selectStatistics({apartments:fixture.apartments,bookings:[]},{...filters,year:2024,month:2},trial);assert.equal(leap.current.capacity,58);
 const duplicate={...fixture,bookings:[fixture.bookings[0],{...fixture.bookings[0],id:'overlap',checkIn:'2026-10-29',checkOut:'2026-10-31'}]};assert.equal(selectStatistics(duplicate,filters,trial).current.occupiedNights,4);
 assert.throws(()=>selectStatistics(fixture,filters,{state:'BASIC'}),/statisticsPremium/);assert.deepEqual(selectStatistics(fixture,filters,{state:'PREMIUM'}),selectStatistics(fixture,filters,trial));
 for(const changes of [{mode:'bad'},{year:0},{month:13}])assert.throws(()=>selectStatistics(fixture,{...filters,...changes},trial),/invalidCollectionPeriod/);
 assert.throws(()=>selectStatistics(fixture,{...filters,currency:'USD'},trial),/invalidCurrency/);assert.equal(selectStatistics({apartments:[],bookings:[]},{...filters,year:1,mode:'comparison'},trial).previous,null);
});
