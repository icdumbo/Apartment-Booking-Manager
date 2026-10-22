import test from 'node:test';
import assert from 'node:assert/strict';
import {totalReceived,upsertPayment,removePayment,validatePaymentHistory,assertPaymentHistoryAccess} from '../src/payments.js';
import {bookingBalance,validateBookingExtras} from '../src/booking-values.js';
import {createLocalRepository} from '../src/storage.js';
const payment=(id,amountCents=10000)=>({id,amountCents,date:'2026-10-10',method:'cash'});
const initial={totalAmountCents:100000};
test('partial payments, edit and deletion derive exact totals without mutating previous data',()=>{
 const before=JSON.stringify(initial);let booking={...initial,...upsertPayment(initial,payment('one'))};booking={...booking,...upsertPayment(booking,payment('two',25000))};assert.equal(totalReceived(booking),35000);assert.equal(bookingBalance(booking),65000);
 booking={...booking,...upsertPayment(booking,{...payment('one',15000),method:'transfer'})};assert.equal(totalReceived(booking),40000);assert.equal(booking.payments.length,2);
 booking={...booking,...removePayment(booking,'two')};assert.equal(totalReceived(booking),15000);assert.equal(bookingBalance(booking),85000);validateBookingExtras(booking);assert.equal(JSON.stringify(initial),before);
});
test('legacy aggregate is preserved; explicit detailing reallocates without doubling and never invents payment dates',()=>{
 const legacy={...initial,paidAmountCents:40000};const untouched=JSON.stringify(legacy);
 let booking={...legacy,...upsertPayment(legacy,payment('new',10000))};assert.equal(totalReceived(booking),50000);assert.equal(booking.legacyPaidAmountCents,40000);
 booking={...booking,...upsertPayment(booking,payment('old',15000),{fromLegacy:true})};assert.equal(totalReceived(booking),50000);assert.equal(booking.legacyPaidAmountCents,25000);
 assert.throws(()=>upsertPayment(booking,payment('tooMuch',30000),{fromLegacy:true}),/legacyPaymentLimit/);assert.equal(JSON.stringify(legacy),untouched);
 assert.throws(()=>upsertPayment(legacy,{...payment('missing'),date:''},{fromLegacy:true}),/invalidPaymentDate/);
});
test('overpayment, zero, invalid methods/dates, duplicate IDs and inconsistent totals are rejected',()=>{
 for(const amount of [0,-1,0.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>upsertPayment(initial,payment('bad',amount)),/invalidPayment/);
 assert.throws(()=>upsertPayment(initial,payment('over',100001)),/paidExceedsTotal/);
 for(const date of ['2026-02-30','2026-13-01','10/10/2026',''])assert.throws(()=>upsertPayment(initial,{...payment('bad'),date}),/invalidPaymentDate/);
 assert.throws(()=>upsertPayment(initial,{...payment('bad'),method:''}),/invalidPaymentMethod/);
 assert.throws(()=>validatePaymentHistory({payments:[payment('a'),payment('a')],paidAmountCents:20000}),/invalidPaymentHistory/);
 assert.throws(()=>validatePaymentHistory({payments:[payment('a')],paidAmountCents:1}),/invalidPaymentHistory/);
 assert.throws(()=>validatePaymentHistory({legacyPaidAmountCents:10000}),/invalidPaymentHistory/);
 assert.throws(()=>upsertPayment(initial,{...payment('a'),notes:'x'.repeat(2001)}),/invalidPaymentNotes/);
});
test('BASIC cannot change history; TRIAL and PREMIUM can; normal BASIC reservation edits retain history',()=>{
 const after={...initial,...upsertPayment(initial,payment('a'))};
 for(const state of ['TRIAL','PREMIUM'])assert.doesNotThrow(()=>assertPaymentHistoryAccess(initial,after,{state}));
 assert.throws(()=>assertPaymentHistoryAccess(initial,after,{state:'BASIC'}),/premiumPayments/);
 assert.throws(()=>assertPaymentHistoryAccess(after,{...after,...removePayment(after,'a')},{state:'BASIC'}),/premiumPayments/);
 assert.doesNotThrow(()=>assertPaymentHistoryAccess(after,{...after,guest:'Edited guest'},{state:'BASIC'}));
});
test('offline repository persists ledger and legacy remainder, rejecting invalid updates without data loss',()=>{
 let raw;const storage={getItem:()=>raw??null,setItem:(_,value)=>raw=value};const repo=createLocalRepository(storage);
 const booking={id:'b',apartmentId:'a',guest:'Test guest',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-15',...initial,paidAmountCents:20000};
 const state={version:1,apartments:[{id:'a',name:'Test',address:'Test address',city:'Test city'}],bookings:[booking]};repo.save(state);const legacy=raw;repo.load();assert.equal(raw,legacy);
 state.bookings=[{...booking,...upsertPayment(booking,payment('detail',10000),{fromLegacy:true})}];repo.save(state);assert.deepEqual(createLocalRepository(storage).load(),state);const valid=raw;
 assert.throws(()=>repo.save({...state,bookings:[{...state.bookings[0],paidAmountCents:100}]}),/invalidPaymentHistory/);assert.equal(raw,valid);
});
