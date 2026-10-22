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
 assert.equal(value(sheet,'B7'),'3');assert.equal(value(sheet,'B8'),'1600');assert.equal(value(sheet,'B9'),'700');assert.equal(value(sheet,'B10'),'900');assert.equal(value(sheet,'B11'),'1');
 assert.equal(value(sheet,'E17'),'6');assert.equal(value(sheet,'G18'),'1600');assert.equal(value(sheet,'H18'),'700');assert.equal(value(sheet,'I18'),'900');
 assert.match(sheet,/<c r="G15" s="6"\/>/);assert.match(sheet,/<c r="I15" s="6"\/>/);assert.match(sheet,/Client Test Cross/);assert.doesNotMatch(sheet,/Client Test EUR|Client Test Outside/);assert.equal(JSON.stringify(fixture),before);
 assert.match(parts['xl/styles.xml'],/\[\$-0418\]#,##0\.00/);assert.match(sheet,/state="frozen"/);assert.match(sheet,/autoFilter ref="A14:J17"/);
});
test('currency, status, apartment and period filters are applied to exported contents',()=>{
 const eur=exported(fixture,{currency:'EUR'})['xl/worksheets/sheet1.xml'];assert.equal(value(eur,'B7'),'1');assert.equal(value(eur,'B8'),'500');assert.equal(value(eur,'B9'),'100');assert.match(eur,/Client Test EUR/);assert.doesNotMatch(eur,/Client Test Cross/);
 const a=exported(fixture,{apartmentId:'a',start:'2026-10-28',end:'2026-10-28'})['xl/worksheets/sheet1.xml'];assert.equal(value(a,'B7'),'1');assert.match(a,/Apartament Test A/);
 const empty=exported(fixture,{status:'unconfirmed'})['xl/worksheets/sheet1.xml'];assert.equal(value(empty,'B7'),'0');assert.equal(value(empty,'B8'),'0');
});
test('legacy amounts stay in received once without a separate breakdown, and zero stays numeric',()=>{
 const mixed=exported(fixture,{start:'2026-09-01'})['xl/worksheets/sheet1.xml'];assert.equal(value(mixed,'B9'),'900');assert.match(mixed,/Client Test Mixed/);
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
test('compact adjacent summary, apartment first and clean guest cells preserve legacy totals',()=>{
 selectLanguage('ro');const sheet=exported()['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/<c r="A14"[^>]*>.*?<t xml:space="preserve">Apartament<\/t>/);
 assert.match(sheet,/<c r="B14"[^>]*>.*?<t xml:space="preserve">Numele clientului<\/t>/);
 assert.match(sheet,/<c r="A16"[^>]*>.*?Apartament Test B/);assert.match(sheet,/<c r="B16"[^>]*>.*?Client Test Legacy/);
 assert.doesNotMatch(sheet,/Include .*încasări vechi|Includes .*legacy receipts/);
 assert.equal(value(sheet,'J16'),undefined);assert.equal(value(sheet,'H16'),'200');
 for(let n=7;n<=11;n++){assert.match(sheet,new RegExp(`<c r="B${n}"`));assert.doesNotMatch(sheet,new RegExp(`<mergeCell ref="[A-Z]+${n}:`));}
 assert.match(sheet,/Cum se calculează raportul/);assert.match(sheet,/Totalul încasat include toate sumele înregistrate o singură dată/);
});
test('six-reservation reference keeps unspecified values blank and reconciles received exactly once',()=>{
 const data=structuredClone(fixture);data.bookings=Array.from({length:6},(_,i)=>({id:'reference-'+i,apartmentId:'a',guest:'Reference '+i,checkIn:`2026-10-${String(2+i*3).padStart(2,'0')}`,checkOut:`2026-10-${String(3+i*3).padStart(2,'0')}`,status:'confirmed',...(i===0?{totalAmountCents:245000,paidAmountCents:50000}:{})}));
 const before=JSON.stringify(data),sheet=exported(data)['xl/worksheets/sheet1.xml'];
 for(const [ref,expected] of Object.entries({B7:'6',B8:'2450',B9:'500',B10:'1950',B11:'5',G21:'2450',H21:'500',I21:'1950'}))assert.equal(value(sheet,ref),expected,ref);
 assert.equal([...sheet.matchAll(/<c r="G(?:16|17|18|19|20)" s="6"\/>/g)].length,5);assert.equal(JSON.stringify(data),before);
});

test('compact ten-column sheet uses 100% zoom and A4 landscape fit-to-width printing',()=>{
 for(const language of ['ro','en']){selectLanguage(language);const parts=exported(),sheet=parts['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/zoomScale="100"/);assert.match(sheet,/<pageSetUpPr fitToPage="1"/);assert.match(sheet,/orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/);
 assert.doesNotMatch(sheet,/Încasări vechi|Undated legacy|legacy receipts|Încasările vechi/);assert.equal((sheet.match(/<col min=/g)||[]).length,10);
 assert.equal(value(sheet,'H18'),'700');assert.equal(value(sheet,'I18'),'900');assert.match(parts['xl/styles.xml'],/<sz val="11"/);
 }
});
