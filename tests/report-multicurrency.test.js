import test from 'node:test';
import assert from 'node:assert/strict';
import {selectReservationsReport as select} from '../src/reservations-report.js';
import {reservationsExcel} from '../src/report-excel.js';
import {reservationsPDF} from '../src/report-pdf.js';
import {xlsxParts} from '../checks/helpers/xlsx.mjs';
import {createLocalRepository} from '../src/storage.js?v=0.2.1';
// Fictional guests; dates reproduce the reported same-day RON/EUR handover.
export const fixture={version:1,migrations:{originalDemoRemoved:true},apartments:[{id:'a',name:'Apartament Test',address:'Test',city:'Test'}],bookings:[
 {id:'ron',apartmentId:'a',guest:'Client Test Alpha',phone:'0700000000',checkIn:'2026-10-22',checkOut:'2026-10-28',status:'confirmed',totalAmountCents:50000,paidAmountCents:10000},
 {id:'eur',apartmentId:'a',guest:'Client Test Beta',phone:'0700000000',checkIn:'2026-10-28',checkOut:'2026-10-30',status:'unconfirmed',currency:'EUR',totalAmountCents:35000,paidAmountCents:10000,payments:[{id:'p',date:'2026-10-28',amountCents:10000,method:'card'}]},
 {id:'unknown',apartmentId:'a',guest:'Client Test Unknown',phone:'0700000000',checkIn:'2026-10-30',checkOut:'2026-10-31',currency:'EUR',status:'confirmed'},
 {id:'zero',apartmentId:'a',guest:'Client Test Zero',phone:'0700000000',checkIn:'2026-10-31',checkOut:'2026-11-01',currency:'RON',status:'confirmed',totalAmountCents:0,paidAmountCents:0}
]};
const filters={start:'2026-10-01',end:'2026-10-31'},access={state:'PREMIUM'};
test('ALL is default, consecutive RON/EUR stays retain original amounts and currency after offline reload',()=>{
 const before=JSON.stringify(fixture);let raw;const repo=createLocalRepository({getItem:()=>raw??null,setItem:(key,value)=>raw=value});repo.save(fixture);const data=repo.load(),r=select(data,filters,access);
 assert.equal(r.currency,'ALL');assert.equal(r.rows.length,4);assert.equal(r.totalAmountCents,undefined);assert.equal(r.receivedAmountCents,undefined);
 assert.equal(r.totalsByCurrency.RON.totalAmountCents,50000);assert.equal(r.totalsByCurrency.RON.receivedAmountCents,10000);assert.equal(r.totalsByCurrency.RON.balanceCents,40000);assert.equal(r.totalsByCurrency.RON.legacyAmountCents,10000);
 assert.equal(r.totalsByCurrency.EUR.totalAmountCents,35000);assert.equal(r.totalsByCurrency.EUR.receivedAmountCents,10000);assert.equal(r.totalsByCurrency.EUR.balanceCents,25000);assert.equal(r.totalsByCurrency.EUR.unpricedCount,1);assert.equal(r.totalsByCurrency.RON.unpricedCount,0);
 assert.equal(r.rows.find(b=>b.bookingId==='unknown').totalAmountCents,undefined);assert.equal(r.rows.find(b=>b.bookingId==='zero').totalAmountCents,0);assert.equal(JSON.stringify(data),before);
});
test('period, apartment, status and optional currency filters still combine; BASIC is denied',()=>{
 assert.equal(select(fixture,{...filters,currency:'RON'},access).rows.length,2);assert.equal(select(fixture,{...filters,currency:'EUR'},access).rows.length,2);
 assert.equal(select(fixture,{...filters,status:'unconfirmed'},access).rows.length,1);
 assert.deepEqual(select(fixture,{...filters,start:'2026-10-28',end:'2026-10-28'},access).rows.map(b=>b.bookingId),['eur']);
 assert.equal(select(fixture,{...filters,apartmentId:'missing'},access).rows.length,0);assert.throws(()=>select(fixture,filters,{state:'BASIC'}),/reportPremium/);
});
test('mixed Excel has numeric source cells, per-currency styles, filter-safe currency totals and summary references',()=>{
 const before=JSON.stringify(fixture),parts=xlsxParts(reservationsExcel(fixture,filters,access).bytes),sheet=parts['xl/worksheets/sheet1.xml'],styles=parts['xl/styles.xml'],table=parts['xl/tables/table1.xml'];
 assert.match(sheet,/Client Test Alpha/);assert.match(sheet,/Client Test Beta/);assert.match(sheet,/<c r="G8" s="3"><v>500<\/v>/);assert.match(sheet,/<c r="G9" s="11"><v>350<\/v>/);
 assert.match(styles,/RON/);assert.match(styles,/EUR/);assert.match(sheet,/min="11" max="11"[^>]*hidden="1"/);assert.match(table,/ref="A7:K11"/);assert.match(table,/name="Currency"|name="Monedă"/);
 assert.match(sheet,/SUMPRODUCT\(SUBTOTAL\(109,OFFSET\(\$G\$8/);assert.match(sheet,/\$K\$8:\$K\$11=&quot;RON&quot;/);assert.match(sheet,/\$K\$8:\$K\$11=&quot;EUR&quot;/);
 assert.match(sheet,/<c r="G12"[^>]*><f>[^<]+<\/f><v>500<\/v>/);assert.match(sheet,/<c r="G13"[^>]*><f>[^<]+<\/f><v>350<\/v>/);
 assert.match(sheet,/TEXT\(G12/);assert.match(sheet,/TEXT\(G13/);assert.doesNotMatch(sheet,/NaN|Infinity/);assert.equal(JSON.stringify(fixture),before);
});
test('mixed and empty PDF/Excel generate offline without mutating data or mixing currency totals',()=>{
 const before=JSON.stringify(fixture);for(const state of [fixture,{version:1,apartments:[],bookings:[]}]){const pdf=reservationsPDF(state,filters,access);assert.equal(pdf.filename,'Reservations-2026-10-01-2026-10-31-ALL.pdf');assert.ok(pdf.bytes.length>10000);const sheet=xlsxParts(reservationsExcel(state,filters,access).bytes)['xl/worksheets/sheet1.xml'];assert.doesNotMatch(sheet,/NaN|Infinity/);}
 assert.equal(JSON.stringify(fixture),before);
});
