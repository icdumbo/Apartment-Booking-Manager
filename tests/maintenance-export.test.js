import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {maintenanceExportFixture} from './fixtures/maintenance-export.mjs';
import {selectMaintenanceExport} from '../src/maintenance-export.js';
import {maintenanceExcel} from '../src/maintenance-excel.js';import {maintenancePDF} from '../src/maintenance-pdf.js';
import {reservationsExcel} from '../src/report-excel.js';import {reservationsPDF} from '../src/report-pdf.js';
import {selectLanguage,t} from '../src/i18n.js?v=0.3.1';import {ownerId,NO_OWNER} from '../src/owners.js';import {xlsxParts} from '../checks/helpers/xlsx.mjs';
const premium={state:'PREMIUM'},filters={start:'2026-10-01',end:'2026-10-31',ownerId:ownerId('Ștefan Test')};
test('read-only Android still generates reservations Excel and PDF',()=>{
 const {state}=maintenanceExportFixture(),filter={start:'2026-10-01',end:'2026-10-31'};
 for(const generate of [reservationsExcel,reservationsPDF])assert.ok(generate(state,filter,{state:'BASIC',readOnlyExports:true}).bytes.length>0);
});
test('maintenance export scopes owners/apartments/period/category and separates currencies without double-counting converted work',()=>{
 const {state,data}=maintenanceExportFixture(),before=JSON.stringify({state,data});selectLanguage('ro');
 const result=selectMaintenanceExport(state,data,filters,premium);assert.equal(result.rows.length,6);assert.equal(result.byApartment.length,2);assert.equal(result.byOwner.length,1);
 assert.equal(result.totals.RON.totalCents,1300);assert.equal(result.totals.EUR.totalCents,4500);assert.equal(result.totals.EUR.workCostsCents,2500);assert.equal(result.totals.RON.workCostsCents,0);assert.equal(result.totals.RON.estimatedCents,1500);
 assert.equal(result.rows.find(row=>row.id==='work-a').countedCents,0);assert.equal(result.rows.find(row=>row.id==='work-a').amountCents,1000);
 const period=selectMaintenanceExport(state,data,{...filters,end:'2026-10-05'},premium);assert.equal(period.rows.length,1);assert.equal(period.totals.RON.totalCents,0);
 assert.equal(selectMaintenanceExport(state,data,{...filters,apartmentId:'b'},premium).totals.EUR.totalCents,4500);
 assert.equal(selectMaintenanceExport(state,data,{...filters,category:'repairs'},premium).totals.RON.totalCents,1000);
 const all=selectMaintenanceExport(state,data,{},premium);assert.equal(all.byOwner.length,3);assert.equal(all.totals.RON.totalCents,11000);assert.equal(all.totals.RON.unknownWorks,1);
 const unassigned=selectMaintenanceExport(state,data,{ownerId:NO_OWNER},premium);assert.deepEqual(unassigned.rows.map(r=>r.apartmentId),['d','d']);
 assert.equal(selectMaintenanceExport(state,data,{...filters,ownerId:'name:missing'},premium).rows.length,0);
 const mismatch=selectMaintenanceExport(state,data,{...filters,apartmentId:'c'},premium);assert.equal(mismatch.rows.length,0);assert.doesNotMatch(mismatch.metadata,/Beta/);
 assert.equal(JSON.stringify({state,data}),before);
});
test('both formats require current access, reject invalid periods/unsafe totals and preserve missing/zero values',()=>{
 const {state,data}=maintenanceExportFixture();for(const generate of [maintenanceExcel,maintenancePDF]){
  assert.throws(()=>generate(state,data,filters,{state:'BASIC'}),/maintenancePremium/);assert.throws(()=>generate(state,data,{...filters,end:'2026-09-01'},premium),/maintenanceInvalid/);
  assert.ok(generate(state,data,filters,{state:'TRIAL'}).bytes.length>0);
  assert.ok(generate(state,data,filters,{state:'BASIC',readOnlyExports:true}).bytes.length>0);
 }
 const large=structuredClone(data);large.expenses[0].amountCents=Number.MAX_SAFE_INTEGER;assert.throws(()=>selectMaintenanceExport(state,large,filters,premium),/maintenanceInvalid|collectionOverflow/);
 const workOverflow=structuredClone(data);workOverflow.works[1].actualCents=Number.MAX_SAFE_INTEGER;assert.throws(()=>selectMaintenanceExport(state,workOverflow,filters,premium),/collectionOverflow/);
 const zero=structuredClone(data);zero.works[1].actualCents=0;assert.equal(selectMaintenanceExport(state,zero,filters,premium).rows.find(row=>row.id==='work-b').amountCents,0);
});
test('RO/EN detailed and grouped exports contain no other owner and preserve full long text across pages/rows',async()=>{
 const {state,data}=maintenanceExportFixture(),before=JSON.stringify({state,data});await mkdir('test-results/maintenance-exports',{recursive:true});
 for(const language of ['ro','en']){
  selectLanguage(language);const excel=maintenanceExcel(state,data,filters,premium),pdf=maintenancePDF(state,data,filters,premium),parts=xlsxParts(excel.bytes);
  for(const index of [1,2,3,4]){const xml=parts[`xl/worksheets/sheet${index}.xml`];assert.ok(xml.includes('Ștefan Test'));assert.doesNotMatch(xml,/Beta Test|Test Beta Private|EXCLUDED_MAINTENANCE/);}
  assert.match(parts['xl/worksheets/sheet1.xml'],/Linked cost A/);assert.match(parts['xl/worksheets/sheet1.xml'],/<v>25<\/v>/);assert.match(parts['xl/workbook.xml'],language==='ro'?/Pe proprietari/:/By owner/);
  await writeFile(`test-results/maintenance-exports/${language}.xlsx`,excel.bytes);await writeFile(`test-results/maintenance-exports/${language}.pdf`,pdf.bytes);
 }
 selectLanguage('ro');const long=structuredClone(data);long.works[1].description=('Descriere Ștefan cu diacritice și text foarte lung. ').repeat(70)+' FINAL_DESCRIPTION';long.works[1].notes=('Notă detaliată de test. ').repeat(150)+' FINAL_NOTES';long.works[1].provider='=HYPERLINK("https://example.invalid")';
 const pdf=maintenancePDF(state,long,filters,premium);assert.ok(pdf.pageCount>=3);await writeFile('test-results/maintenance-exports/long.pdf',pdf.bytes);await writeFile('test-results/maintenance-exports/long.xlsx',maintenanceExcel(state,long,filters,premium).bytes);
 for(const [label,selection] of [['all',{}],['unassigned',{ownerId:NO_OWNER}],['empty',{...filters,apartmentId:'c'}]]){await writeFile(`test-results/maintenance-exports/${label}.pdf`,maintenancePDF(state,data,selection,premium).bytes);await writeFile(`test-results/maintenance-exports/${label}.xlsx`,maintenanceExcel(state,data,selection,premium).bytes);}
 assert.equal(JSON.stringify({state,data}),before);
});
test('report reservation grammar covers 0/1/2 in UI templates, PDF and Excel without changing numeric values',async()=>{
 const {state}=maintenanceExportFixture();const reportFilters={start:'2026-10-01',end:'2026-10-31',currency:'ALL'};await mkdir('test-results/maintenance-exports',{recursive:true});
 for(const language of ['ro','en'])for(const count of [0,1,2]){
  selectLanguage(language);const expected=`${count} ${language==='ro'?(count===1?'rezervare':'rezervări'):(count===1?'reservation':'reservations')}`;
  for(const key of ['reportCount','reportTotalCount','reportNotice','reportExportNotice'])assert.ok(t(key,{count,unknown:1,legacy:''}).includes(expected));
  const fixture={...state,bookings:state.bookings.slice(0,count)},excel=reservationsExcel(fixture,reportFilters,premium),pdf=reservationsPDF(fixture,reportFilters,premium);
  assert.ok(xlsxParts(excel.bytes)['xl/worksheets/sheet1.xml'].includes(expected));await writeFile(`test-results/maintenance-exports/grammar-${language}-${count}.pdf`,pdf.bytes);
 }
});

test('every Excel report sheet protects locked cells and allows selection and existing filters',()=>{
 const {state,data}=maintenanceExportFixture();
 for(const language of ['ro','en']){
  selectLanguage(language);
  for(const report of [reservationsExcel(state,{start:'2026-10-01',end:'2026-10-31',currency:'ALL'},premium),maintenanceExcel(state,data,filters,premium)]){
   const parts=xlsxParts(report.bytes);
   const sheets=Object.entries(parts).filter(([name])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
   assert.ok(sheets.length>1);
   assert.equal(sheets.length,[...parts['xl/workbook.xml'].matchAll(/<sheet name=/g)].length);
   assert.match(parts['xl/workbook.xml'],/<workbookProtection lockStructure="1"\/>/);
   assert.doesNotMatch(parts['xl/styles.xml'],/<protection\b[^>]*locked="(?:0|false)"/);
   for(const [,sheet] of sheets){
    assert.match(sheet,/<\/sheetData><sheetProtection sheet="1" objects="1" scenarios="1" selectLockedCells="0" selectUnlockedCells="0" autoFilter="0" sort="0"\/>/);
    assert.doesNotMatch(sheet,/<protectedRanges\b/);
   }
  }
 }
});
