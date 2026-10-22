import {saveExport} from './file-export.js';
import {selectReservationsReport} from './reservations-report.js';
import {dayNumber} from './domain.js?v=0.2.1';
import {displayDate} from './date-format.js?v=0.2.5';
import {formatMoney} from './booking-values.js';
import {t} from './i18n.js?v=0.3.1';
import {cell,createXlsx,xml} from './xlsx.js';
export const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// Always reselect using current filters and entitlement, including at the instant of export.
export function reservationsExcel(state,filters,entitlement){
 const result=selectReservationsReport(state,filters,entitlement);
 if(result.rows.length>1048550)throw new Error('reportExportTooLarge');
 const currency=result.currency,rows=[],merges=[],columns='ABCDEFGHIJK',widths=[36,32,15,15,12,20,21,21,21,25,30];
 function row(index,cells,height=26){rows.push(`<row r="${index}" ht="${height}" customHeight="1">${cells.join('')}</row>`);}
 function wide(index,value,style=0,height=28){row(index,[cell('A'+index,value,style)],height);merges.push(`A${index}:K${index}`);}
 wide(1,t('reportTitle'),1,34);wide(2,'Apartment Booking Manager',0);
 wide(3,`${t('reportStart')}: ${displayDate(filters.start)} · ${t('reportEnd')}: ${displayDate(filters.end)}`);
 wide(4,`${t('apartment')}: ${filters.apartmentId?(state.apartments.find(a=>a.id===filters.apartmentId)?.name??''):t('allApartments')}`);
 wide(5,`${t('bookingStatus')}: ${t(filters.status==='all'||!filters.status?'reportAllStatus':filters.status)} · ${t('collectionCurrency')}: ${currency}`);
 const summary=[['statisticsBookings',result.rows.length,8],['reportTotal',result.totalAmountCents/100,7],['reportReceived',result.receivedAmountCents/100,7],['remainingAmount',result.balanceCents/100,7],['reportUnspecified',result.unpricedCount,8],['reportLegacyAmount',result.legacyAmountCents/100,7]];
 summary.forEach(([label,value,style],i)=>{const n=7+i;row(n,[cell('A'+n,t(label),2),cell('B'+n,value,style)],Math.max(28,Math.ceil(t(label).length/30)*15+10));});
 const headings=['apartment','guest','checkIn','checkOut','nights','bookingStatus','reportTotal','reportReceived','remainingAmount','reportLegacyAmount','notes'];
 row(14,headings.map((key,i)=>cell(columns[i]+'14',t(key),2)),42);
 result.rows.forEach((entry,i)=>{
  const n=15+i,values=[entry.apartment,entry.guest,dayNumber(entry.checkIn)+25569,dayNumber(entry.checkOut)+25569,entry.nights,t(entry.status),entry.totalAmountCents===undefined?undefined:entry.totalAmountCents/100,entry.receivedAmountCents/100,entry.balanceCents===undefined?undefined:entry.balanceCents/100,entry.legacyAmountCents/100,''];
  const lines=Math.max(...values.map((value,j)=>typeof value==='string'?Math.ceil(value.length/(widths[j]-3)):1));
  row(n,values.map((value,j)=>cell(columns[j]+n,value,j===2||j===3?5:j>=6&&j<=9?(value===undefined?6:3):0)),Math.max(44,Math.min(409,lines*15+8)));
 });
 const end=14+result.rows.length,total=end+1;
 row(total,[cell('A'+total,t('reportTotals'),2),cell('G'+total,result.totalAmountCents/100,4),cell('H'+total,result.receivedAmountCents/100,4),cell('I'+total,result.balanceCents/100,4),cell('J'+total,result.legacyAmountCents/100,4)],30);merges.push(`A${total}:F${total}`);
 wide(total+2,t('reportCalculation'),2,28);wide(total+3,t('reportBasis'),0,70);
 wide(total+4,t('reportNotice',{count:result.rows.length,unknown:result.unpricedCount,legacy:formatMoney(result.legacyAmountCents,currency)}),0,50);
 wide(total+5,t('reportExcelMissing'),0,34);
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const sheet=`<worksheet xmlns="${ns}"><dimension ref="A1:K${total+5}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="14" topLeftCell="A15" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A14:K${end}"/><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9"/></worksheet>`;
 const money=xml(`[$-0418]#,##0.00 "${currency}"`);
 const styles=`<styleSheet xmlns="${ns}"><numFmts count="2"><numFmt numFmtId="164" formatCode="${money}"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="3"><font><sz val="11"/><color rgb="FF18334E"/><name val="Calibri"/></font><font><b/><sz val="18"/><color rgb="FF1268BA"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF246399"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9">${[[0,0,0],[0,1,0],[0,2,2],[164,0,0],[164,2,2],[165,0,0],[0,0,3],[164,2,2],[0,2,2]].map(([num,font,fill],index)=>`<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"${index>=7?' horizontal="left"':num===164?' horizontal="right"':''}/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
 return {bytes:createXlsx(sheet,styles,t('reportSheetName')),filename:`Reservations-${filters.start}-${filters.end}-${currency}.xlsx`};
}
export function downloadReservationsExcel(state,filters,entitlement){
 const {bytes,filename}=reservationsExcel(state,filters,entitlement);
 return saveExport({bytes,filename,mimeType:XLSX_MIME});
}
