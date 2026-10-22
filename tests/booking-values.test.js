import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMoney,moneyInput,formatRON,bookingBalance,readBookingExtras,validateBookingExtras} from '../src/booking-values.js';
import {createLocalRepository} from '../src/storage.js';
const legacy={version:1,apartments:[{id:'a',name:'Test',address:'Test address',city:'Test city'}],bookings:[{id:'b',apartmentId:'a',guest:'Test guest',phone:'0700000000',checkIn:'2026-10-10',checkOut:'2026-10-15'}]};
test('money conversion accepts decimal comma/dot and keeps exact integer bani',()=>{
 for(const [input,cents] of [['0',0],['0,01',1],['0.10',10],['1200,50',120050],['1200.5',120050],['90071992547409.91',Number.MAX_SAFE_INTEGER]]){assert.equal(parseMoney(input),cents);assert.equal(parseMoney(moneyInput(cents)),cents);}
 assert.equal(parseMoney('  '),undefined);assert.equal(moneyInput(undefined),'');assert.equal(bookingBalance({totalAmountCents:30,paidAmountCents:10}),20);
});
test('amounts reject negatives, exponents, excess decimals, grouping, NaN and unsafe values',()=>{
 for(const value of ['-1','1.234','NaN','Infinity','1e3','1,000.00','1.000,00','90071992547409.92'])assert.throws(()=>parseMoney(value),/invalidAmount/);
 for(const value of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'100',null])assert.throws(()=>validateBookingExtras({totalAmountCents:value}),/invalidAmount/);
});
test('blank values remain absent; no implicit financial data for legacy bookings',()=>{
 assert.deepEqual(readBookingExtras({persons:'',totalAmountCents:'',paidAmountCents:'',source:'',notes:''}),{});
 assert.equal(bookingBalance({}),undefined);assert.equal(bookingBalance({totalAmountCents:0}),0);assert.equal(bookingBalance({totalAmountCents:100}),100);
});
test('payment cannot exceed total and a positive payment requires a specified total',()=>{
 for(const extra of [{totalAmountCents:100,paidAmountCents:101},{paidAmountCents:1}])assert.throws(()=>validateBookingExtras(extra),/paidExceedsTotal/);
 validateBookingExtras({totalAmountCents:100,paidAmountCents:100});validateBookingExtras({paidAmountCents:0});
});
test('guest count, source and notes are optional and validated',()=>{
 for(const persons of ['0','-1','1.5','1e2','9007199254740992'])assert.throws(()=>readBookingExtras({persons}),/invalidPersons/);
 for(const source of ['booking','airbnb','direct','other'])assert.equal(readBookingExtras({source}).source,source);
 assert.throws(()=>validateBookingExtras({source:'unknown'}),/invalidSource/);assert.throws(()=>validateBookingExtras({notes:'x'.repeat(4001)}),/invalidNotes/);
 assert.equal(readBookingExtras({persons:'4',notes:'Test note'}).persons,4);
});
test('legacy and extended bookings round-trip without migrations or retroactive defaults',()=>{
 let raw=JSON.stringify(legacy);const before=raw;const repository=createLocalRepository({getItem:()=>raw,setItem:(_,value)=>raw=value});
 assert.deepEqual(repository.load(),legacy);assert.equal(raw,before);repository.save(repository.load());assert.equal(raw,before);
 const extended={...legacy,bookings:[{...legacy.bookings[0],...readBookingExtras({persons:'3',totalAmountCents:'1500,25',paidAmountCents:'500,15',source:'direct',notes:'Test note'})}]};repository.save(extended);assert.deepEqual(repository.load(),extended);assert.equal(bookingBalance(repository.load().bookings[0]),100010);
});
test('repository rejects invalid booking metadata without overwriting existing local data',()=>{
 let raw=JSON.stringify(legacy);const before=raw,repository=createLocalRepository({getItem:()=>raw,setItem:(_,value)=>raw=value});
 assert.throws(()=>repository.save({...legacy,bookings:[{...legacy.bookings[0],totalAmountCents:-1}]}),/invalidAmount/);assert.equal(raw,before);
});

test('RON display distinguishes zero from unspecified and always uses Romanian separators',()=>{
 assert.equal(formatRON(undefined),'—');assert.equal(formatRON(0),'0,00 RON');assert.equal(formatRON(150000),'1.500,00 RON');assert.equal(formatRON(150025),'1.500,25 RON');assert.equal(formatRON(Number.MAX_SAFE_INTEGER),'90.071.992.547.409,91 RON');
 assert.equal(formatRON(bookingBalance({totalAmountCents:0,paidAmountCents:0})),'0,00 RON');
});
