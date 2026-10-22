import test from 'node:test';
import assert from 'node:assert/strict';
import {reservationsPDF,PDF_MIME} from '../src/report-pdf.js';
import {collectionsFixture as fixture} from '../checks/fixtures/collections.mjs';
import {selectLanguage} from '../src/i18n.js?v=0.3.1';
const filters={start:'2026-10-01',end:'2026-10-31',status:'all',currency:'RON'},trial={state:'TRIAL'};
function check(pdf){const text=Buffer.from(pdf.bytes).toString('latin1');assert.ok(text.startsWith('%PDF-'));assert.ok(text.trimEnd().endsWith('%%EOF'));assert.equal([...text.matchAll(/\/Type \/Page\b/g)].length,pdf.pageCount);assert.equal([...text.matchAll(/\/FontFile2 /g)].length,2);const box=text.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);assert.ok(box&&Math.abs(Number(box[1])-841.89)<.01&&Math.abs(Number(box[2])-595.28)<.01);return text;}
test('PDF is a real A4 document with embedded Unicode fonts and no business writes',()=>{
 const before=JSON.stringify(fixture),pdf=reservationsPDF(fixture,filters,trial);check(pdf);assert.equal(pdf.pageCount,1);assert.equal(PDF_MIME,'application/pdf');assert.equal(pdf.filename,'Reservations-2026-10-01-2026-10-31-RON.pdf');assert.equal(JSON.stringify(fixture),before);
});
test('long report paginates; long names wrap instead of truncating',()=>{
 const state=structuredClone(fixture);state.bookings=Array.from({length:70},(_,i)=>({...state.bookings[0],id:String(i),guest:'Ștefănescu Țîrlea Înger Ângela '.repeat(4)}));const pdf=reservationsPDF(state,filters,trial);check(pdf);assert.ok(pdf.pageCount>2);
});
test('RO and EN, filtered EUR, and empty result generate valid files',()=>{
 for(const language of ['ro','en']){selectLanguage(language);check(reservationsPDF(fixture,{...filters,currency:'EUR',apartmentId:'b'},trial));const empty=reservationsPDF(fixture,{...filters,status:'unconfirmed'},trial);check(empty);assert.equal(empty.pageCount,1);}
});
test('BASIC, expired access and invalid filters fail before producing PDF bytes',()=>{
 assert.throws(()=>reservationsPDF(fixture,filters,{state:'BASIC'}),/reportPremium/);assert.throws(()=>reservationsPDF(fixture,{...filters,end:'2026-09-30'},trial),/reportInvalidPeriod/);assert.throws(()=>reservationsPDF(fixture,{...filters,currency:'USD'},trial),/invalidCurrency/);
 check(reservationsPDF(fixture,filters,{state:'PREMIUM'}));
});
