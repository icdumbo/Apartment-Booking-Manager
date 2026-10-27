import test from 'node:test';
import assert from 'node:assert/strict';
import {reservationsExcel} from '../src/report-excel.js';
import {selectReservationsReport} from '../src/reservations-report.js';
import {reportGroups,REPORT_METRICS} from '../src/report-summary.js';
import {xlsxParts} from '../checks/helpers/xlsx.mjs';
import {collectionsFixture} from '../checks/fixtures/collections.mjs';
import {selectLanguage} from '../src/i18n.js?v=0.3.1';
const filters={start:'2026-10-01',end:'2026-10-31'},access={state:'PREMIUM'};
const value=(sheet,ref)=>sheet.match(new RegExp(`<c r="${ref}"[^>]*>(?:<f>[^<]*</f>)?<v>([^<]+)</v>`))?.[1];
test('currency matrix uses numeric counts and amounts, separate overall counts and no cross-currency total',()=>{
 const data=structuredClone(collectionsFixture),before=JSON.stringify(data),r=selectReservationsReport(data,filters,access),parts=xlsxParts(reservationsExcel(data,filters,access).bytes),s=parts['xl/worksheets/sheet1.xml'];
 assert.equal(value(s,'C4'),'4');assert.equal(value(s,'J4'),'1');
 assert.equal(value(s,'C6'),'3');assert.equal(value(s,'E6'),'1');assert.equal(value(s,'C7'),'1600');assert.equal(value(s,'E7'),'500');assert.equal(value(s,'C8'),'700');assert.equal(value(s,'E8'),'100');assert.equal(value(s,'C9'),'900');assert.equal(value(s,'E9'),'400');
 for(const ref of ['C4','J4','C6','E6','C7','E7','C8','E8','C9','E9'])assert.match(s,new RegExp(`<c r="${ref}" s="\\d+"><f>`));
 assert.equal(r.totalAmountCents,undefined);assert.equal(JSON.stringify(data),before);
 assert.equal(REPORT_METRICS.length,4);assert.deepEqual(reportGroups({totalsByCurrency:{EUR:{currency:'EUR'},RON:{currency:'RON'},USD:{currency:'USD'}}}).map(g=>g.currency),['RON','EUR','USD']);
});
test('grouped view includes all selected reservations once, per-apartment per-currency totals, notes and dates',()=>{
 const data=structuredClone(collectionsFixture);data.bookings.find(b=>b.id==='legacy').notes='Actual test note';
 // Duplicate apartment names must not combine distinct apartment identities.
 data.apartments[1].name=data.apartments[0].name;
 const before=JSON.stringify(data),parts=xlsxParts(reservationsExcel(data,filters,access).bytes),s=parts['xl/worksheets/sheet2.xml'];
 for(const guest of ['Client Test Unknown','Client Test Cross','Client Test EUR','Client Test Legacy'])assert.equal(s.split(guest).length-1,1,guest);
 assert.doesNotMatch(s,/Client Test Outside|Client Test Mixed|autoFilter|tableParts/);
 assert.match(s,/SUMIF\(\$K\$6:\$K\$7,&quot;RON&quot;,\$G\$6:\$G\$7\)/);assert.equal(value(s,'G8'),'1000');assert.equal(value(s,'H8'),'500');assert.equal(value(s,'I8'),'500');
 assert.equal(value(s,'G13'),'600');assert.equal(value(s,'H13'),'200');assert.equal(value(s,'G14'),'500');assert.equal(value(s,'H14'),'100');
 assert.match(s,/<c r="G6" s="6"\/>/);assert.match(s,/<c r="C6" s="5"><v>\d+<\/v>/);assert.match(s,/\[1\]/);assert.match(parts['xl/worksheets/sheet1.xml'],/Actual test note/);
 assert.match(s,/ySplit="4" topLeftCell="A5"/);assert.match(s,/orientation="landscape" paperSize="9" fitToWidth="1"/);
 assert.equal(JSON.stringify(data),before);
});
test('both bilingual sheets have valid workbook relationships and repeated print headers; empty view stays valid',()=>{
 for(const [lang,name] of [['ro','Pe apartamente'],['en','By apartment']]){
  selectLanguage(lang);const p=xlsxParts(reservationsExcel(collectionsFixture,filters,access).bytes);
  assert.match(p['xl/workbook.xml'],new RegExp(`sheet name="${name}" sheetId="2" r:id="rId3"`));assert.match(p['xl/_rels/workbook.xml.rels'],/Id="rId3"[^>]+Target="worksheets\/sheet2.xml"/);assert.match(p['[Content_Types].xml'],/PartName="\/xl\/worksheets\/sheet2.xml"/);
  assert.match(p['xl/workbook.xml'],/name="_xlnm.Print_Titles" localSheetId="0"[^<]+\$11:\$11/);assert.match(p['xl/workbook.xml'],/name="_xlnm.Print_Titles" localSheetId="1"[^<]+\$4:\$4/);
  const empty=xlsxParts(reservationsExcel({version:1,apartments:[],bookings:[]},filters,access).bytes);assert.ok(empty['xl/worksheets/sheet2.xml']);assert.equal(value(empty['xl/worksheets/sheet1.xml'],'C4'),'0');assert.equal(value(empty['xl/worksheets/sheet1.xml'],'J4'),'0');
 }
});
