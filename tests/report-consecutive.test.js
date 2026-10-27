import test from 'node:test';
import assert from 'node:assert/strict';
import {validateState,createLocalRepository} from '../src/storage.js?v=0.2.1';
import {selectReservationsReport} from '../src/reservations-report.js';
import {reservationsExcel} from '../src/report-excel.js';
import {reservationsPDF} from '../src/report-pdf.js';
import {xlsxParts} from '../checks/helpers/xlsx.mjs';
const state={version:1,apartments:[{id:'a',name:'Apartament Test',address:'Adresă test',city:'Oraș test'}],bookings:[
 {id:'first',apartmentId:'a',guest:'Client Test Alpha',phone:'0700000000',checkIn:'2026-10-22',checkOut:'2026-10-28',status:'confirmed',totalAmountCents:50000,paidAmountCents:10000},
 {id:'next',apartmentId:'a',guest:'Client Test Beta',phone:'0700000000',checkIn:'2026-10-28',checkOut:'2026-10-30',status:'unconfirmed'}]};
const filters={start:'2026-10-01',end:'2026-10-31',status:'all',currency:'RON'},access={state:'PREMIUM'};
test('consecutive stays survive offline persistence and both exports without losing unspecified values',()=>{
 const before=JSON.stringify(state);validateState(state);let raw;
 const repo=createLocalRepository({getItem:()=>raw??null,setItem:(key,value)=>raw=value});repo.save(state);const restored=repo.load();
 const result=selectReservationsReport(restored,filters,access);assert.deepEqual(result.rows.map(b=>b.bookingId),['first','next']);assert.equal(result.unpricedCount,1);assert.equal(result.totalAmountCents,50000);assert.equal(result.receivedAmountCents,10000);
 const sheet=xlsxParts(reservationsExcel(restored,filters,access).bytes)['xl/worksheets/sheet1.xml'];assert.match(sheet,/Client Test Alpha/);assert.match(sheet,/Client Test Beta/);assert.match(xlsxParts(reservationsExcel(restored,filters,access).bytes)['xl/tables/table1.xml'],/autoFilter ref="A7:J9"/);
 const pdf=reservationsPDF(restored,filters,access);assert.ok(pdf.bytes.length>0);
 assert.equal(JSON.stringify(restored),before);assert.equal(JSON.stringify(state),before);
 // Currency/status exclusions are deliberate, never repaired by silently including EUR in RON.
 restored.bookings[1].currency='EUR';assert.deepEqual(selectReservationsReport(restored,filters,access).rows.map(b=>b.bookingId),['first']);
 assert.equal(selectReservationsReport(state,{...filters,status:'confirmed'},access).rows.length,1);
});
