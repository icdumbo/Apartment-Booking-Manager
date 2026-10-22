import test from 'node:test';
import assert from 'node:assert/strict';
import {reservationsExcel} from '../src/report-excel.js';
import {selectLanguage} from '../src/i18n.js?v=0.3.1';
import {collectionsFixture as fixture} from '../checks/fixtures/collections.mjs';
import {xlsxParts} from '../checks/helpers/xlsx.mjs';
const filters={start:'2026-10-01',end:'2026-10-31',apartmentId:'',status:'all',currency:'RON'},trial={state:'TRIAL'};
function exported(data=fixture,extra={}){return xlsxParts(reservationsExcel(data,{...filters,...extra},trial).bytes);}
function value(sheet,ref){return sheet.match(new RegExp(`<c r="${ref}"[^>]*><v>([^<]+)</v>`))?.[1];}
test('export uses current report rows, complete stays and matching numeric summary, without writes',()=>{
 const before=JSON.stringify(fixture),parts=exported(),sheet=parts['xl/worksheets/sheet1.xml'];
 assert.equal(value(sheet,'G7'),'3');assert.equal(value(sheet,'G8'),'1600');assert.equal(value(sheet,'G9'),'700');assert.equal(value(sheet,'G10'),'900');assert.equal(value(sheet,'G11'),'1');assert.equal(value(sheet,'G12'),'200');
 assert.equal(value(sheet,'E17'),'6');assert.equal(value(sheet,'G18'),'1600');assert.equal(value(sheet,'H18'),'700');assert.equal(value(sheet,'I18'),'900');
 assert.match(sheet,/<c r="G15" s="6"\/>/);assert.match(sheet,/<c r="I15" s="6"\/>/);assert.match(sheet,/Client Test Cross/);assert.doesNotMatch(sheet,/Client Test EUR|Client Test Outside/);assert.equal(JSON.stringify(fixture),before);
 assert.match(parts['xl/styles.xml'],/\[\$-0418\]#,##0\.00/);assert.match(sheet,/state="frozen"/);assert.match(sheet,/autoFilter ref="A14:K17"/);
});
test('currency, status, apartment and period filters are applied to exported contents',()=>{
 const eur=exported(fixture,{currency:'EUR'})['xl/worksheets/sheet1.xml'];assert.equal(value(eur,'G7'),'1');assert.equal(value(eur,'G8'),'500');assert.equal(value(eur,'G9'),'100');assert.match(eur,/Client Test EUR/);assert.doesNotMatch(eur,/Client Test Cross/);
 const a=exported(fixture,{apartmentId:'a',start:'2026-10-28',end:'2026-10-28'})['xl/worksheets/sheet1.xml'];assert.equal(value(a,'G7'),'1');assert.match(a,/Apartament Test A/);
 const empty=exported(fixture,{status:'unconfirmed'})['xl/worksheets/sheet1.xml'];assert.equal(value(empty,'G7'),'0');assert.equal(value(empty,'G8'),'0');
});
test('legacy amounts remain included once with explicit notes, and zero stays numeric',()=>{
 const mixed=exported(fixture,{start:'2026-09-01'})['xl/worksheets/sheet1.xml'];assert.equal(value(mixed,'G12'),'300');assert.match(mixed,/Client Test Mixed/);
 const zero=structuredClone(fixture);zero.bookings=[{...zero.bookings[0],totalAmountCents:0,paidAmountCents:0,payments:[]}];const sheet=exported(zero)['xl/worksheets/sheet1.xml'];assert.equal(value(sheet,'G15'),'0');assert.equal(value(sheet,'I15'),'0');
});
test('RO/EN labels translate and user text is escaped as literal cells, never executable formulas',()=>{
 const data=structuredClone(fixture);data.bookings[0].guest='=HYPERLINK("https://example.invalid") & <test>\u0000';
 for(const [language,title] of [['ro','Raport rezervări'],['en','Reservations Report']]){selectLanguage(language);const parts=exported(data);const sheet=parts['xl/worksheets/sheet1.xml'];assert.match(sheet,new RegExp(title));assert.match(sheet,/=HYPERLINK\(&quot;/);assert.match(sheet,/&amp; &lt;test&gt;/);assert.doesNotMatch(sheet,/<f>|\u0000/);}
});
test('BASIC and invalid filters cannot export; permanent PREMIUM uses the same report',()=>{
 assert.throws(()=>reservationsExcel(fixture,filters,{state:'BASIC'}),/reportPremium/);assert.throws(()=>exported(fixture,{start:'2026-11-01'}),/reportInvalidPeriod/);
 assert.deepEqual(reservationsExcel(fixture,filters,trial).bytes,reservationsExcel(fixture,filters,{state:'PREMIUM'}).bytes);
});
