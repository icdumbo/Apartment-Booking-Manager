import test from 'node:test';
import assert from 'node:assert/strict';
import {reservationsExcel} from '../src/report-excel.js';
import {selectLanguage} from '../src/i18n.js?v=0.3.1';
import {collectionsFixture as fixture} from '../checks/fixtures/collections.mjs';
import {xlsxParts} from '../checks/helpers/xlsx.mjs';
const filters={start:'2026-10-01',end:'2026-10-31',apartmentId:'',status:'all',currency:'RON'},trial={state:'TRIAL'};
function exported(data=fixture,extra={}){return xlsxParts(reservationsExcel(data,{...filters,...extra},trial).bytes);}
function filterPart(parts){return parts['xl/tables/table1.xml']||parts['xl/worksheets/sheet1.xml'];}
function value(sheet,ref){return sheet.match(new RegExp(`<c r="${ref}"[^>]*>(?:<f>[^<]*</f>)?<v>([^<]+)</v>`))?.[1];}
test('export uses current report rows, complete stays and matching numeric summary, without writes',()=>{
 const before=JSON.stringify(fixture),parts=exported(),sheet=parts['xl/worksheets/sheet1.xml'];
 assert.equal(value(sheet,'C4'),'3');assert.equal(value(sheet,'C7'),'1600');assert.equal(value(sheet,'C8'),'700');assert.equal(value(sheet,'C9'),'900');assert.equal(value(sheet,'J4'),'1');
 assert.equal(value(sheet,'E14'),'6');assert.equal(value(sheet,'G15'),'1600');assert.equal(value(sheet,'H15'),'700');assert.equal(value(sheet,'I15'),'900');
 assert.match(sheet,/<c r="G12" s="6"\/>/);assert.match(sheet,/<c r="I12" s="6"\/>/);assert.match(sheet,/Client Test Cross/);assert.doesNotMatch(sheet,/Client Test EUR|Client Test Outside/);assert.equal(JSON.stringify(fixture),before);
 assert.match(parts['xl/styles.xml'],/\[\$-0418\]#,##0\.00/);assert.match(sheet,/state="frozen"/);assert.match(filterPart(parts),/autoFilter ref="A11:J14"/);
});
test('currency, status, apartment and period filters are applied to exported contents',()=>{
 const eur=exported(fixture,{currency:'EUR'})['xl/worksheets/sheet1.xml'];assert.equal(value(eur,'C4'),'1');assert.equal(value(eur,'C7'),'500');assert.equal(value(eur,'C8'),'100');assert.match(eur,/Client Test EUR/);assert.doesNotMatch(eur,/Client Test Cross/);
 const a=exported(fixture,{apartmentId:'a',start:'2026-10-28',end:'2026-10-28'})['xl/worksheets/sheet1.xml'];assert.equal(value(a,'C4'),'1');assert.match(a,/Apartament Test A/);
 const empty=exported(fixture,{status:'unconfirmed'})['xl/worksheets/sheet1.xml'];assert.equal(value(empty,'C4'),'0');assert.equal(value(empty,'C7'),'0');
});
test('legacy amounts stay in received once without a separate breakdown, and zero stays numeric',()=>{
 const mixed=exported(fixture,{start:'2026-09-01'})['xl/worksheets/sheet1.xml'];assert.equal(value(mixed,'C8'),'900');assert.match(mixed,/Client Test Mixed/);
 const zero=structuredClone(fixture);zero.bookings=[{...zero.bookings[0],totalAmountCents:0,paidAmountCents:0,payments:[]}];const sheet=exported(zero)['xl/worksheets/sheet1.xml'];assert.equal(value(sheet,'G12'),'0');assert.equal(value(sheet,'I12'),'0');
});
test('RO/EN labels translate and user text is escaped as literal cells, never executable formulas',()=>{
 const data=structuredClone(fixture);data.bookings[0].guest='=HYPERLINK("https://example.invalid") & <test>\u0000';
 for(const [language,title] of [['ro','Raport rezervări'],['en','Reservations Report']]){selectLanguage(language);const parts=exported(data);const sheet=parts['xl/worksheets/sheet1.xml'];assert.match(sheet,new RegExp(title));assert.match(sheet,/=HYPERLINK\(&quot;/);assert.match(sheet,/&amp; &lt;test&gt;/);assert.doesNotMatch(sheet,/\u0000/);assert.match(sheet,/<c r="B12"[^>]*t="inlineStr"><is>/);}
});
test('BASIC and invalid filters cannot export; permanent PREMIUM uses the same report',()=>{
 assert.throws(()=>reservationsExcel(fixture,filters,{state:'BASIC'}),/reportPremium/);assert.throws(()=>exported(fixture,{start:'2026-11-01'}),/reportInvalidPeriod/);
 assert.deepEqual(reservationsExcel(fixture,filters,trial).bytes,reservationsExcel(fixture,filters,{state:'PREMIUM'}).bytes);
});
test('compact numeric currency matrix, apartment first and clean guest cells preserve legacy totals',()=>{
 selectLanguage('ro');const sheet=exported()['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/<c r="A11"[^>]*>.*?<t xml:space="preserve">Apartament<\/t>/);
 assert.match(sheet,/<c r="B11"[^>]*>.*?<t xml:space="preserve">Numele clientului<\/t>/);
 assert.match(sheet,/<c r="A13"[^>]*>.*?Apartament Test B/);assert.match(sheet,/<c r="B13"[^>]*>.*?Client Test Legacy/);
 assert.doesNotMatch(sheet,/Include .*încasări vechi|Includes .*legacy receipts/);
 assert.equal(value(sheet,'J13'),undefined);assert.equal(value(sheet,'H13'),'200');
 for(const ref of ['C4','C7','C8','C9','J4'])assert.match(sheet,new RegExp(`<c r="${ref}"`));
 assert.match(sheet,/<mergeCell ref="A5:B5"/);assert.match(sheet,/<mergeCell ref="C5:D5"/);
 assert.match(sheet,/Cum se calculează raportul/);assert.match(sheet,/Totalul încasat include toate sumele înregistrate o singură dată/);
});
test('six-reservation reference keeps unspecified values blank and reconciles received exactly once',()=>{
 const data=structuredClone(fixture);data.bookings=Array.from({length:6},(_,i)=>({id:'reference-'+i,apartmentId:'a',guest:'Reference '+i,checkIn:`2026-10-${String(2+i*3).padStart(2,'0')}`,checkOut:`2026-10-${String(3+i*3).padStart(2,'0')}`,status:'confirmed',...(i===0?{totalAmountCents:245000,paidAmountCents:50000}:{})}));
 const before=JSON.stringify(data),sheet=exported(data)['xl/worksheets/sheet1.xml'];
 for(const [ref,expected] of Object.entries({C4:'6',C7:'2450',C8:'500',C9:'1950',J4:'5',G18:'2450',H18:'500',I18:'1950'}))assert.equal(value(sheet,ref),expected,ref);
 assert.equal([...sheet.matchAll(/<c r="G(?:13|14|15|16|17)" s="6"\/>/g)].length,5);assert.equal(JSON.stringify(data),before);
});

test('compact ten-column sheet uses 100% zoom and A4 landscape fit-to-width printing',()=>{
 for(const language of ['ro','en']){selectLanguage(language);const parts=exported(),sheet=parts['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/zoomScale="100"/);assert.match(sheet,/<pageSetUpPr fitToPage="1"/);assert.match(sheet,/orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/);
 assert.doesNotMatch(sheet,/Încasări vechi|Undated legacy|legacy receipts|Încasările vechi/);assert.equal((sheet.match(/<col min=/g)||[]).length,10);
 assert.equal(value(sheet,'H15'),'700');assert.equal(value(sheet,'I15'),'900');assert.match(parts['xl/styles.xml'],/<sz val="10"/);
 }
});

test('financial columns allow full bold totals; notes stay associated below a compact table',()=>{
 const data=structuredClone(fixture);data.bookings[0].notes='A long observation '.repeat(50);data.bookings[0].totalAmountCents=12345678900;
 const before=JSON.stringify(data),sheet=exported(data)['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/<c r="J14"[^>]*>.*?\[1\]/);assert.match(sheet,/\[1\] Apartament Test A · Client Test Cross/);assert.match(sheet,/A long observation/);
 assert.equal(value(sheet,'G14'),'123456789');assert.equal(JSON.stringify(data),before);
 const widths=[...sheet.matchAll(/<col min="(\d+)"[^>]*width="([\d.]+)"/g)];for(const c of widths.filter(m=>['7','8','9'].includes(m[1])))assert.ok(Number(c[2])>=20);
 assert.match(sheet,/ySplit="11" topLeftCell="A12"/);assert.match(sheet,/<row r="14" ht="22"/);
});

test('thin separator keeps the approved widths, fonts, total columns and filter range',()=>{
 const parts=exported(),sheet=parts['xl/worksheets/sheet1.xml'];
 assert.match(sheet,/<row r="10" ht="6" customHeight="1"><\/row>/);
 assert.match(filterPart(parts),/autoFilter ref="A11:J14"/);assert.match(sheet,/zoomScale="100"/);
 assert.deepEqual([...sheet.matchAll(/<col min="\d+"[^>]*width="([\d.]+)"/g)].map(m=>Number(m[1])),[17,21,11,11,6,12,20,20,20,10]);
 for(const ref of ['G15','H15','I15'])assert.match(sheet,new RegExp(`<c r="${ref}" s="4">`));
});
test('separate notes section appears only for real notes on included reservations',()=>{
 selectLanguage('ro');const data=structuredClone(fixture);
 for(const b of data.bookings)b.notes=' \n\t ';
 const count=sheet=>[...sheet.matchAll(/<t xml:space="preserve">Observații<\/t>/g)].length;
 assert.equal(count(exported(data)['xl/worksheets/sheet1.xml']),1); // Column heading only.
 data.bookings.find(b=>b.id==='eur').notes='Outside currency filter';
 assert.equal(count(exported(data)['xl/worksheets/sheet1.xml']),1);
 data.bookings.find(b=>b.id==='legacy').notes='  Real note kept intact  ';const sheet=exported(data)['xl/worksheets/sheet1.xml'];
 assert.equal(count(sheet),2);assert.match(sheet,/\[1\] Apartament Test B · Client Test Legacy/);assert.match(sheet,/  Real note kept intact  /);assert.doesNotMatch(sheet,/Outside currency filter/);
});

test('filter boundaries exclude TOTAL, notes and explanations in sheet and Excel database metadata',()=>{
 selectLanguage('ro');
 for(const [extra,last] of [[{},14],[{apartmentId:'b'},12],[{status:'unconfirmed'},11]]){
  const parts=exported(fixture,extra),sheet=parts['xl/worksheets/sheet1.xml'],book=parts['xl/workbook.xml'];
  assert.match(filterPart(parts),new RegExp(`<autoFilter ref="A11:J${last}"`));
  if(last===11)assert.ok(book.includes(`name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">&apos;Rezervări&apos;!$A$11:$J$${last}</definedName>`));
  else{assert.ok(parts['xl/tables/table1.xml'].includes(`ref="A11:J${last}"`));assert.doesNotMatch(sheet,/<autoFilter/);}
  const total=last+1;assert.match(sheet,new RegExp(`<row r="${total}"[^>]*>.*?TOTAL`));
 }
 const sheet=exported()['xl/worksheets/sheet1.xml'];
 const apartments=[...sheet.matchAll(/<c r="A(12|13|14)"[^>]*>.*?<t xml:space="preserve">([^<]*)<\/t>/g)].map(m=>m[2]);
 assert.deepEqual([...new Set(apartments)].sort(),['Apartament Test A','Apartament Test B']);
});
test('TOTAL has blue styles through J; calculation heading is bold dark blue on white',()=>{
 selectLanguage('ro');const parts=exported(),sheet=parts['xl/worksheets/sheet1.xml'],styles=parts['xl/styles.xml'];
 const total=sheet.match(/<row r="15"[^>]*>(.*?)<\/row>/)[1];
 const cells=[...total.matchAll(/<c r="([A-J])15" s="(\d+)"/g)];assert.equal(cells.length,10);
 assert.deepEqual(cells.map(m=>Number(m[2])),[2,2,2,2,2,2,4,4,4,2]);
 assert.match(sheet,/<c r="A16" s="10"[^>]*>.*?Cum se calculează raportul/);
 const xfs=styles.match(/<cellXfs[^>]*>(.*?)<\/cellXfs>/)[1];const heading=[...xfs.matchAll(/<xf ([^>]*)>/g)][10][1];
 assert.match(heading,/fontId="3"/);assert.match(heading,/fillId="0"/);
 const fonts=[...styles.matchAll(/<font>(.*?)<\/font>/g)];assert.match(fonts[3][1],/<b\/>/);assert.match(fonts[3][1],/FF18334E/);
});

test('native table exposes ten buttons without overlapping sheet filter or merged data cells',()=>{
 const parts=exported(),table=filterPart(parts),sheet=parts['xl/worksheets/sheet1.xml'];
 assert.match(parts['[Content_Types].xml'],/spreadsheetml.table\+xml/);
 assert.match(parts['xl/worksheets/_rels/sheet1.xml.rels'],/Target="..\/tables\/table1.xml"/);assert.match(sheet,/<tablePart r:id="rIdTable1"/);
 assert.match(table,/ref="A11:J14"/);assert.match(table,/totalsRowShown="0"/);
 assert.equal([...table.matchAll(/<tableColumn id=/g)].length,10);
 assert.deepEqual([...table.matchAll(/<filterColumn colId="(\d+)" hiddenButton="0" showButton="1"\/>/g)].map(m=>Number(m[1])),[0,1,2,3,4,5,6,7,8,9]);
 assert.doesNotMatch(table,/tableStyleInfo name=/);assert.doesNotMatch(sheet,/<autoFilter|sheetProtection/);
 for(const m of sheet.matchAll(/<mergeCell ref="[A-Z]+(\d+):[A-Z]+(\d+)"/g))assert.ok(Number(m[2])<11||Number(m[1])>14);
});

test('filter-aware formulas share totals, count visible numeric zero, and avoid empty-range cycles',()=>{
 const parts=exported(),sheet=parts['xl/worksheets/sheet1.xml'];
 function formula(ref){return sheet.match(new RegExp(`<c r="${ref}"[^>]*><f>([^<]+)</f>`))?.[1];}
 assert.equal(formula('C4'),'SUBTOTAL(103,$A$12:$A$14)');
 assert.equal(formula('J4'),'SUBTOTAL(103,$A$12:$A$14)-SUBTOTAL(102,$G$12:$G$14)');
 for(const [top,bottom,col] of [['C7','G15','G'],['C8','H15','H'],['C9','I15','I']]){
  assert.equal(formula(top),bottom);assert.equal(formula(bottom),`SUBTOTAL(109,$${col}$12:$${col}$14)`);
 }
 assert.match(parts['xl/workbook.xml'],/<calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"\/>/);
 const empty=exported(fixture,{status:'unconfirmed'})['xl/worksheets/sheet1.xml'];
 for(const ref of ['G12','H12','I12'])assert.match(empty,new RegExp(`<c r="${ref}"[^>]*><f>0</f><v>0</v>`));
 assert.doesNotMatch(empty,/SUBTOTAL/);
});
