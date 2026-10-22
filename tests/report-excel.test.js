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
 assert.equal(value(sheet,'A5'),'3');assert.equal(value(sheet,'C5'),'1600');assert.equal(value(sheet,'E5'),'700');assert.equal(value(sheet,'G5'),'900');assert.equal(value(sheet,'I5'),'1');
 assert.equal(value(sheet,'E9'),'6');assert.equal(value(sheet,'G10'),'1600');assert.equal(value(sheet,'H10'),'700');assert.equal(value(sheet,'I10'),'900');
 assert.match(sheet,/<c r="G7" s="6"\/>/);assert.match(sheet,/<c r="I7" s="6"\/>/);assert.match(sheet,/Client Test Cross/);assert.doesNotMatch(sheet,/Client Test EUR|Client Test Outside/);assert.equal(JSON.stringify(fixture),before);
 assert.match(parts['xl/styles.xml'],/\[\$-0418\]#,##0\.00/);assert.match(sheet,/state="frozen"/);assert.match(sheet,/autoFilter ref="A6:J9"/);
});
test('currency, status, apartment and period filters are applied to exported contents',()=>{
 const eur=exported(fixture,{currency:'EUR'})['xl/worksheets/sheet1.xml'];assert.equal(value(eur,'A5'),'1');assert.equal(value(eur,'C5'),'500');assert.equal(value(eur,'E5'),'100');assert.match(eur,/Client Test EUR/);assert.doesNotMatch(eur,/Client Test Cross/);
 const a=exported(fixture,{apartmentId:'a',start:'2026-10-28',end:'2026-10-28'})['xl/worksheets/sheet1.xml'];assert.equal(value(a,'A5'),'1');assert.match(a,/Apartament Test A/);
 const empty=exported(fixture,{status:'unconfirmed'})['xl/worksheets/sheet1.xml'];assert.equal(value(empty,'A5'),'0');assert.equal(value(empty,'C5'),'0');
});
test('legacy amounts stay in received once without a separate breakdown, and zero stays numeric',()=>{
 const mixed=exported(fixture,{start:'2026-09-01'})['xl/worksheets/sheet1.xml'];assert.equal(value(mixed,'E5'),'900');assert.match(mixed,/Client Test Mixed/);
 const zero=structuredClone(fixture);zero.bookings=[{...zero.bookings[0],totalAmountCents:0,paidAmountCents:0,payments:[]}];const sheet=exported(zero)['xl/worksheets/sheet1.xml'];assert.equal(value(sheet,'G7'),'0');assert.equal(value(sheet,'I7'),'0');
});
test('RO/EN labels translate and user text is escaped as literal cells, never executable formulas',()=>{
 const data=structuredClone(fixture);data.bookings[0].guest='=HYPERLINK("https://example.invalid") & <test>\u0000';
 for(const [language,title] of [['ro','Raport rezervări'],['en','Reservations Report']]){selectLanguage(language);const parts=exported(data);const sheet=parts['xl/worksheets/sheet1.xml'];assert.match(sheet,new RegExp(title));assert.match(sheet,/=HYPERLINK\(&quot;/);assert.match(sheet,/&amp; &lt;test&gt;/);assert.doesNotMatch(sheet,/<f>|\u0000/);}
});
test('BASIC and invalid filters cannot export; permanent PREMIUM uses the same report',()=>{
 assert.throws(()=>reservationsExcel(fixture,filters,{state:'BASIC'}),/reportPremium/);assert.throws(()=>exported(fixture,{start:'2026-11-01'}),/reportInvalidPeriod/);
 assert.deepEqual(reservationsExcel(fixture,filters,trial).bytes,reservationsExcel(fixture,filters,{state:'PREMIUM'}).bytes);
});
test('horizontal compact summary, apartment first and clean guest cells preserve legacy totals',()=>{
 selectLanguage('ro');const sheet=exported()['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/<c r="A6"[^>]*>.*?<t xml:space="preserve">Apartament<\/t>/);
 assert.match(sheet,/<c r="B6"[^>]*>.*?<t xml:space="preserve">Numele clientului<\/t>/);
 assert.match(sheet,/<c r="A8"[^>]*>.*?Apartament Test B/);assert.match(sheet,/<c r="B8"[^>]*>.*?Client Test Legacy/);
 assert.doesNotMatch(sheet,/Include .*încasări vechi|Includes .*legacy receipts/);
 assert.equal(value(sheet,'J8'),undefined);assert.equal(value(sheet,'H8'),'200');
 for(const ref of ['A5','C5','E5','G5','I5'])assert.match(sheet,new RegExp(`<c r="${ref}"`));
 assert.match(sheet,/<mergeCell ref="A4:B4"/);assert.match(sheet,/<mergeCell ref="I5:J5"/);
 assert.match(sheet,/Cum se calculează raportul/);assert.match(sheet,/Totalul încasat include toate sumele înregistrate o singură dată/);
});
test('six-reservation reference keeps unspecified values blank and reconciles received exactly once',()=>{
 const data=structuredClone(fixture);data.bookings=Array.from({length:6},(_,i)=>({id:'reference-'+i,apartmentId:'a',guest:'Reference '+i,checkIn:`2026-10-${String(2+i*3).padStart(2,'0')}`,checkOut:`2026-10-${String(3+i*3).padStart(2,'0')}`,status:'confirmed',...(i===0?{totalAmountCents:245000,paidAmountCents:50000}:{})}));
 const before=JSON.stringify(data),sheet=exported(data)['xl/worksheets/sheet1.xml'];
 for(const [ref,expected] of Object.entries({A5:'6',C5:'2450',E5:'500',G5:'1950',I5:'5',G13:'2450',H13:'500',I13:'1950'}))assert.equal(value(sheet,ref),expected,ref);
 assert.equal([...sheet.matchAll(/<c r="G(?:8|9|10|11|12)" s="6"\/>/g)].length,5);assert.equal(JSON.stringify(data),before);
});

test('compact ten-column sheet uses 100% zoom and A4 landscape fit-to-width printing',()=>{
 for(const language of ['ro','en']){selectLanguage(language);const parts=exported(),sheet=parts['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/zoomScale="100"/);assert.match(sheet,/<pageSetUpPr fitToPage="1"/);assert.match(sheet,/orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/);
 assert.doesNotMatch(sheet,/Încasări vechi|Undated legacy|legacy receipts|Încasările vechi/);assert.equal((sheet.match(/<col min=/g)||[]).length,10);
 assert.equal(value(sheet,'H10'),'700');assert.equal(value(sheet,'I10'),'900');assert.match(parts['xl/styles.xml'],/<sz val="10"/);
 }
});

test('financial columns allow full bold totals; notes stay associated below a compact table',()=>{
 const data=structuredClone(fixture);data.bookings[0].notes='A long observation '.repeat(50);data.bookings[0].totalAmountCents=12345678900;
 const before=JSON.stringify(data),sheet=exported(data)['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/<c r="J9"[^>]*>.*?\[1\]/);assert.match(sheet,/\[1\] Apartament Test A · Client Test Cross/);assert.match(sheet,/A long observation/);
 assert.equal(value(sheet,'G9'),'123456789');assert.equal(JSON.stringify(data),before);
 const widths=[...sheet.matchAll(/<col min="(\d+)"[^>]*width="([\d.]+)"/g)];for(const c of widths.filter(m=>['7','8','9'].includes(m[1])))assert.ok(Number(c[2])>=20);
 assert.match(sheet,/ySplit="6" topLeftCell="A7"/);assert.match(sheet,/<row r="9" ht="22"/);
});
