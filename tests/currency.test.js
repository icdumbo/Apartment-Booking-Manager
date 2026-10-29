import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingCurrency,assertCurrencyChange} from '../src/currency.js';
import {formatMoney,validateBookingExtras} from '../src/booking-values.js';
import {upsertPayment} from '../src/payments.js';
import {createLocalRepository} from '../src/storage.js';
const payment={id:'p',date:'2026-10-10',method:'cash',amountCents:10000};
test('currency defaults to RON without inserting metadata or changing amounts',()=>{
 const legacy={totalAmountCents:150000,paidAmountCents:10000};const before=JSON.stringify(legacy);assert.equal(bookingCurrency(legacy),'RON');validateBookingExtras(legacy);assert.equal(JSON.stringify(legacy),before);assert.equal(formatMoney(150000),'1.500,00 RON');assert.equal(formatMoney(35000,'EUR'),'350,00 EUR');assert.equal(formatMoney(0,'EUR'),'0,00 EUR');assert.equal(formatMoney(undefined,'EUR'),'—');
});
test('paid history and legacy receipts lock currency, including deletion in same transaction',()=>{
 for(const before of [{paidAmountCents:100},{payments:[payment],paidAmountCents:10000},{legacyPaidAmountCents:100,payments:[],paidAmountCents:100}]){
  assert.throws(()=>assertCurrencyChange(before,{currency:'EUR',payments:[],paidAmountCents:0}),/currencyLocked/);assert.doesNotThrow(()=>assertCurrencyChange(before,{...before,currency:'RON'}));
 }
 assert.doesNotThrow(()=>assertCurrencyChange({totalAmountCents:100,paidAmountCents:0},{currency:'EUR',totalAmountCents:100}));
});
test('payments inherit booking currency; mismatched or unsupported currencies are rejected',()=>{
 const booking={currency:'EUR',totalAmountCents:20000};const ledger=upsertPayment(booking,payment);assert.equal(ledger.paidAmountCents,10000);assert.equal(ledger.payments[0].currency,undefined);validateBookingExtras({...booking,...ledger});
 assert.throws(()=>upsertPayment(booking,{...payment,currency:'RON'}),/paymentCurrencyMismatch/);assert.throws(()=>validateBookingExtras({...booking,...ledger,payments:[{...payment,currency:'RON'}]}),/paymentCurrencyMismatch/);
 for(const currency of ['USD','',null])assert.throws(()=>validateBookingExtras({currency}),/invalidCurrency/);
});
test('EUR and legacy RON ledgers round-trip offline without modifying stored integers or history',()=>{
 let raw;const repo=createLocalRepository({getItem:key=>key==='apartment-booking-manager:v1'?(raw??null):null,setItem:(_,v)=>raw=v});const booking={id:'b',apartmentId:'a',guest:'Test',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-15',totalAmountCents:20000,...upsertPayment({totalAmountCents:20000},payment)};
 const state={version:1,apartments:[{id:'a',name:'Test',address:'Test',city:'Test'}],bookings:[booking,{...booking,id:'eur',currency:'EUR',checkIn:'2026-10-15',checkOut:'2026-10-17'}]};repo.save(state);const before=raw;assert.deepEqual(repo.load(),state);assert.equal(raw,before);assert.equal(bookingCurrency(repo.load().bookings[0]),'RON');assert.equal(bookingCurrency(repo.load().bookings[1]),'EUR');
});
