import {REPORT_METRICS,reportGroups} from './report-summary.js';
import {saveExport} from './file-export.js';
import {selectReservationsReport} from './reservations-report.js';
import {dayNumber} from './domain.js?v=0.2.1';
import {displayDate} from './date-format.js?v=0.2.5';
import {t} from './i18n.js?v=0.3.1';
import {formatMoney} from './booking-values.js';
import {cell,formulaCell,createXlsx,xml} from './xlsx.js';
import {ownerScope,ownerLabel} from './owners.js';
export const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// Always reselect using current filters and entitlement, including at the instant of export.
export function reservationsExcel(state,filters,entitlement){
 const owner=ownerLabel(state.apartments,filters.ownerId,t);state=ownerScope(state,filters.ownerId);
 const result=selectReservationsReport(state,filters,entitlement);
 if(result.rows.length>1048550)throw new Error('reportExportTooLarge');
 const currency=result.currency,multi=currency==='ALL',groups=reportGroups(result),rows=[],merges=[],columns=multi?'ABCDEFGHIJK':'ABCDEFGHIJ';
 const extraCodes=multi?groups.map(group=>group.currency).filter(code=>code!=='RON'):[];
 const moneyStyle=(code,total=false)=>multi&&extraCodes.includes(code)?11+extraCodes.indexOf(code)*2+(total?1:0):(total?4:3);
 // Size numeric columns from formatted data and totals, with room for bold TOTAL text.
 const amounts=groups.flatMap(group=>[group.totalAmountCents,group.receivedAmountCents,group.balanceCents]).concat(result.rows.flatMap(r=>[r.totalAmountCents,r.receivedAmountCents,r.balanceCents]));
 const moneyWidth=amounts.reduce((width,value)=>Math.max(width,formatMoney(value,'RON').length+3),20);
 const widths=[17,21,11,11,6,12,moneyWidth,moneyWidth,moneyWidth,10];
 const notesById=new Map(state.bookings.map(booking=>[booking.id,booking.notes||''])),notes=[];
 function row(index,cells,height=24){rows.push(`<row r="${index}" ht="${height}" customHeight="1">${cells.join('')}</row>`);}
 function wide(index,value,style=0,height=24){row(index,[cell('A'+index,value,style)],height);merges.push(`A${index}:J${index}`);}
 wide(1,`${t('reportTitle')} · Apartment Booking Manager`,1,28);
 wide(2,`${t('reportStart')}: ${displayDate(filters.start)} · ${t('reportEnd')}: ${displayDate(filters.end)}`,0,20);
 const apartment=filters.apartmentId?(state.apartments.find(a=>a.id===filters.apartmentId)?.name??''):t('allApartments');
 const metadata=`${t('apartmentOwner')}: ${owner} · ${t('apartment')}: ${apartment} · ${t('bookingStatus')}: ${t(filters.status==='all'||!filters.status?'reportAllStatus':filters.status)} · ${t('collectionCurrency')}: ${multi?t('allCurrencies'):currency}`;
 wide(3,metadata,0,Math.max(22,Math.ceil(metadata.length/140)*12+6));
 const end=11+result.rows.length,total=end+1,lastTotal=total+Math.max(1,groups.length)-1;
 // 100-series SUBTOTAL ignores filtered/hidden rows. COUNT distinguishes numeric zero
 // from genuinely unspecified amounts; no financial reinterpretation.
 const subtotal=(code,col)=>result.rows.length?`SUBTOTAL(${code},$${col}$12:$${col}$${end})`:'0';
 const groupSum=(code,col)=>!result.rows.length?'0':multi?`SUMPRODUCT(SUBTOTAL(109,OFFSET($${col}$12,ROW($${col}$12:$${col}$${end})-ROW($${col}$12),0,1)),--($K$12:$K$${end}="${code}"))`:subtotal(109,col);
 const count=subtotal(103,'A'),unpriced=`${count}-${subtotal(102,'G')}`;
 const summaryColumns=groups.map((_,i)=>2+i*2);
 // Numeric matrix: currencies in columns; no mixed-currency financial cells.
 // A:B labels, C:D first currency, E:F second; general counts remain separate.
 row(4,[cell('A4',t('reportTotalCount',{count:''}),10),formulaCell('C4',count,result.rows.length,9),cell('E4',t('reportUnpricedCount',{count:''}),10),formulaCell('J4',unpriced,result.unpricedCount,9)],26);
 merges.push('A4:B4','E4:I4');
 const summaryHeader=[cell('A5',t('reportMetric'),2)];merges.push('A5:B5');
 groups.forEach((group,i)=>{const col=summaryColumns[i];summaryHeader.push(cell(columns[col]+'5',group.currency,2));merges.push(`${columns[col]}5:${columns[col+1]}5`);});
 row(5,summaryHeader,26);
 REPORT_METRICS.forEach(([label,field],i)=>{
  const n=6+i,cells=[cell('A'+n,t(label),10)];merges.push(`A${n}:B${n}`);
  groups.forEach((group,j)=>{const col=summaryColumns[j];
   const expression=field==='count'?(!result.rows.length?'0':multi?`SUMPRODUCT(SUBTOTAL(103,OFFSET($A$12,ROW($A$12:$A$${end})-ROW($A$12),0,1)),--($K$12:$K$${end}="${group.currency}"))`:count):`${['G','H','I'][i-1]}${total+j}`;
   cells.push(formulaCell(columns[col]+n,expression,field==='count'?group.count:group[field]/100,field==='count'?9:moneyStyle(group.currency)));
   merges.push(`${columns[col]}${n}:${columns[col+1]}${n}`);
  });
  row(n,cells,26);
 });
 row(10,[],6);
 const headings=['apartment','guest','checkIn','checkOut','reportPDFNights','bookingStatus','reportTotal','reportReceived','remainingAmount','notes',...(multi?['collectionCurrency']:[])];
 row(11,headings.map((key,i)=>cell(columns[i]+'11',t(key),2)),34);
 result.rows.forEach((entry,i)=>{
  const note=notesById.get(entry.bookingId);let noteRef='';
  if(note?.trim()){notes.push({entry,note});noteRef=`[${notes.length}]`;}
  const n=12+i,values=[entry.apartment,entry.guest,dayNumber(entry.checkIn)+25569,dayNumber(entry.checkOut)+25569,entry.nights,t(entry.status),entry.totalAmountCents===undefined?undefined:entry.totalAmountCents/100,entry.receivedAmountCents/100,entry.balanceCents===undefined?undefined:entry.balanceCents/100,noteRef,...(multi?[entry.currency]:[])];
  const lines=Math.max(...values.map((value,j)=>typeof value==='string'?Math.ceil(value.length/((widths[j]??9)*1.15)):1));
  row(n,values.map((value,j)=>cell(columns[j]+n,value,j===2||j===3?5:j===4||j===9?9:j>=6&&j<=8?(value===undefined?6:moneyStyle(entry.currency)):0)),Math.max(22,Math.min(409,lines*12+6)));
 });
 // Currency helper is part of the native table, so it follows sorting/filtering.
 // It is hidden; visible amounts carry their original ISO currency via numeric styles.
 const totalGroups=groups;
 if(!groups.length)row(total,[cell('A'+total,t('reportTotals'),2),...['B','C','D','E','F','G','H','I','J'].map(col=>cell(col+total,undefined,2))],28);
 totalGroups.forEach((group,i)=>{
  const n=total+i;
  row(n,[cell('A'+n,t('reportTotals')+(multi?' · '+group.currency:''),2),...['B','C','D','E','F'].map(col=>cell(col+n,undefined,2)),...['G','H','I'].map((col,j)=>formulaCell(col+n,groupSum(group.currency,col),group[['totalAmountCents','receivedAmountCents','balanceCents'][j]]/100,moneyStyle(group.currency,true))),cell('J'+n,undefined,2)],28);merges.push(`A${n}:F${n}`);
 });
 let next=lastTotal+1;
 if(notes.length){
  wide(next++,t('notes'),2,22);
  notes.forEach(({entry,note},i)=>{
   const label=`[${i+1}] ${entry.apartment} · ${entry.guest} · ${displayDate(entry.checkIn)} → ${displayDate(entry.checkOut)}`;
   wide(next++,label,0,Math.max(24,Math.ceil(label.length/130)*12+6));
   // Split long text into bounded rows; Excel has a 409 pt row-height limit.
   const lines=[];for(let line of note.replace(/\r\n?/g,'\n').split('\n')){while(line.length>130){let cut=line.lastIndexOf(' ',130);cut=cut>0?cut+1:130;lines.push(line.slice(0,cut));line=line.slice(cut);}lines.push(line);}
   for(let start=0;start<lines.length;start+=20){const chunk=lines.slice(start,start+20);wide(next++,chunk.join('\n'),0,chunk.length*12+8);}
  });
 }
 wide(next++,t('reportCalculation'),10,22);
 wide(next++,t('reportBasis'),0,28);
 wide(next++,t('reportExportNotice',{count:result.rows.length,unknown:result.unpricedCount}),0,28);
 wide(next++,t('reportExportMissing'),0,22);
 const last=next-1;if(last>1048576)throw new Error('reportExportTooLarge');
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const sheet=`<worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${multi?'K':'J'}${last}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="100"><pane ySplit="11" topLeftCell="A12" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join('')}${multi?'<col min="11" max="11" width="9" hidden="1" customWidth="1"/>':''}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A11:${multi?'K':'J'}${end}">${columns.split('').map((_,i)=>`<filterColumn colId="${i}" hiddenButton="0" showButton="1"/>`).join('')}</autoFilter><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
 const money=xml(`[$-0418]#,##0.00 "${multi?'RON':currency}"`);
 const styles=`<styleSheet xmlns="${ns}"><numFmts count="${2+extraCodes.length}"><numFmt numFmtId="164" formatCode="${money}"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/>${extraCodes.map((code,i)=>`<numFmt numFmtId="${166+i}" formatCode="${xml(`[$-0418]#,##0.00 "${code}"`)}"/>`).join('')}</numFmts><fonts count="4"><font><sz val="10"/><color rgb="FF18334E"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF1268BA"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FF18334E"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF246399"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${11+extraCodes.length*2}">${[[0,0,0],[0,1,0],[0,2,2],[164,0,0],[164,2,2],[165,0,0],[0,0,3],[164,2,2],[0,2,2],[0,0,0],[0,3,0],...extraCodes.flatMap((_,i)=>[[166+i,0,0],[166+i,2,2]])].map(([num,font,fill],index)=>`<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"${[2,5,7,8,9].includes(index)?' horizontal="center"':(num===164||num>=166)?' horizontal="right"':''}/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
 const byApartmentRows=[],byApartmentMerges=[];
 let groupedRow=1;
 const addGrouped=(cells,height=24)=>{const n=groupedRow++;byApartmentRows.push(`<row r="${n}" ht="${height}" customHeight="1">${cells.join('')}</row>`);return n;};
 const groupedWide=(value,style=0,height=24)=>{const n=groupedRow;addGrouped([cell('A'+n,value,style)],height);byApartmentMerges.push(`A${n}:J${n}`);};
 groupedWide(t('reportByApartment')+' · Apartment Booking Manager',1,28);
 const groupedMetadata=`${displayDate(filters.start)} – ${displayDate(filters.end)} · ${metadata}`;
 groupedWide(groupedMetadata,0,Math.max(34,Math.ceil(groupedMetadata.length/140)*12+6));
 groupedWide(t('reportGroupedNote'),0,34);
 addGrouped(headings.slice(0,10).map((key,i)=>cell(columns[i]+'4',t(key),2)),34);
 const originals=new Map(state.bookings.map(booking=>[booking.id,booking]));
 const noteRefs=new Map(notes.map(({entry},i)=>[entry.bookingId,`[${i+1}]`]));
 for(const apartment of state.apartments){
  const entries=result.rows.filter(entry=>originals.get(entry.bookingId)?.apartmentId===apartment.id);if(!entries.length)continue;
  groupedWide(apartment.name+' · '+t('reportCount',{count:entries.length}),2,26);
  const first=groupedRow;
  for(const entry of entries){
   const n=groupedRow,values=[entry.apartment,entry.guest,dayNumber(entry.checkIn)+25569,dayNumber(entry.checkOut)+25569,entry.nights,t(entry.status),entry.totalAmountCents===undefined?undefined:entry.totalAmountCents/100,entry.receivedAmountCents/100,entry.balanceCents===undefined?undefined:entry.balanceCents/100,noteRefs.get(entry.bookingId)||'',entry.currency];
   const lines=Math.max(...values.map((value,j)=>typeof value==='string'?Math.ceil(value.length/((widths[j]??9)*1.15)):1));
   addGrouped(values.map((value,j)=>cell('ABCDEFGHIJK'[j]+n,value,j===2||j===3?5:j===4||j===9?9:j>=6&&j<=8?(value===undefined?6:moneyStyle(entry.currency)):0)),Math.max(22,Math.min(409,lines*12+6)));
  }
  const last=groupedRow-1;
  for(const group of groups){
   const matching=entries.filter(entry=>entry.currency===group.currency);if(!matching.length)continue;
   const n=groupedRow;
   addGrouped([cell('A'+n,t('reportTotals')+' · '+group.currency,2),...['B','C','D','E','F'].map(col=>cell(col+n,undefined,2)),...['G','H','I'].map((col,i)=>{
    const field=['totalAmountCents','receivedAmountCents','balanceCents'][i];
    const cached=matching.reduce((sum,entry)=>sum+(entry[field]??0),0)/100;
    return formulaCell(col+n,`SUMIF($K$${first}:$K$${last},"${group.currency}",$${col}$${first}:$${col}$${last})`,cached,moneyStyle(group.currency,true));
   }),cell('J'+n,undefined,2)],28);byApartmentMerges.push(`A${n}:F${n}`);
  }
  addGrouped([],6);
 }
 if(!result.rows.length)groupedWide(t('reportEmpty'));
 if(groupedRow>1048577)throw new Error('reportExportTooLarge');
 const groupedSheet=`<worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:K${groupedRow-1}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="100"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join('')}<col min="11" max="11" width="9" hidden="1" customWidth="1"/></cols><sheetData>${byApartmentRows.join('')}</sheetData><mergeCells count="${byApartmentMerges.length}">${byApartmentMerges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`;
 return {bytes:createXlsx(sheet,styles,t('reportSheetName'),{headerRow:11,additionalSheets:[{name:t('reportByApartment'),sheet:groupedSheet,headerRow:4}],filterRange:`$A$11:$${multi?'K':'J'}$${end}`,filterHeaders:result.rows.length?headings.map(key=>t(key)):undefined}),filename:`Reservations-${filters.start}-${filters.end}-${currency}.xlsx`};
}
export function downloadReservationsExcel(state,filters,entitlement){
 const {bytes,filename}=reservationsExcel(state,filters,entitlement);
 return saveExport({bytes,filename,mimeType:XLSX_MIME});
}
