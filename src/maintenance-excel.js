import {selectMaintenanceExport,maintenanceExportColumns,maintenanceExportValues,maintenanceExportMetrics} from './maintenance-export.js';
import {cell,createXlsx} from './xlsx.js';
import {saveExport} from './file-export.js';
import {t} from './i18n.js?v=0.3.1';
const MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const styles=`<styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF246399"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4">${[[0,0,0],[0,1,0],[0,2,2],[164,0,0]].map(([num,font,fill])=>`<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function wrap(value,width){const output=[];for(let line of String(value).replace(/\r\n?/g,'\n').split('\n')){while(line.length>width){output.push(line.slice(0,width));line=line.slice(width);}output.push(line);}return output;}
export function maintenanceExcel(state,data,filters,access){
 const result=selectMaintenanceExport(state,data,filters,access),letters='ABCDEFGHIJKLMNOP';
 // Excel preserves at most 15 significant decimal digits. Refuse a monetary
 // snapshot that would silently round cents instead of exporting wrong values.
 const amounts=result.rows.flatMap(row=>[row.amountCents,row.countedCents,row.estimatedCents]).concat(Object.values(result.totals).flatMap(sum=>maintenanceExportMetrics.map(([,field])=>sum[field])));
 if(amounts.some(value=>value!==undefined&&value>999999999999999))throw Error('collectionOverflow');
 function sheet(headings,widths,entries){
  const rows=[],merges=[];let n=1;
  function row(values,height=25,header=false){rows.push(`<row r="${n}" ht="${height}" customHeight="1">${values.map((value,i)=>cell(letters[i]+n,value,header?2:typeof value==='number'&&!(headings.length===8&&i===7)?3:0)).join('')}</row>`);n++;}
  function wide(value,title=false){const lines=wrap(value,110);for(let i=0;i<lines.length;i+=12){const part=lines.slice(i,i+12);rows.push(`<row r="${n}" ht="${part.length*14+10}" customHeight="1">${cell('A'+n,part.join('\n'),title?1:0)}</row>`);merges.push(`A${n}:${letters[headings.length-1]}${n}`);n++;}}
  wide(t('maintenanceExportTitle')+' · Apartment Booking Manager',true);wide(result.metadata);wide(t('maintenanceExportBasis'));wide(t('maintenanceExportRows',{count:result.rows.length}));
  const header=n;row(headings,Math.max(38,...headings.map((value,i)=>wrap(value,Math.floor(widths[i])).length*14+10)),true);
  for(const entry of entries){const lines=entry.map((value,i)=>typeof value==='string'?wrap(value,Math.floor(widths[i])):null),count=Math.max(1,...lines.map(value=>value?.length??0));
   for(let offset=0;offset<count;offset+=12){const chunk=entry.map((value,i)=>lines[i]?lines[i].slice(offset,offset+12).join('\n'):offset===0?value:undefined),height=Math.max(25,Math.max(...lines.map(value=>Math.min(12,Math.max(0,(value?.length??0)-offset))))*14+10);row(chunk,height);}
   if(n>1048576)throw Error('reportExportTooLarge');
  }
  if(!entries.length)wide(t('maintenanceEmpty'));
  const end=header+Math.max(0,n-header-1);
  return {header,sheet:`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${header}" topLeftCell="A${header+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A${header}:${letters[headings.length-1]}${end}"/><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`};
 }
 const detail=sheet(maintenanceExportColumns.map(key=>t(key)),[18,14,26,28,48,18,10,20,18,14,14,28,18,18,35,60],result.rows.map(maintenanceExportValues));
 const summaryHeadings=[t('apartmentOwner'),t('apartment'),t('collectionCurrency'),...maintenanceExportMetrics.map(([key])=>t(key)),t('maintenanceExportUnknown')];
 const summaryRows=groups=>groups.flatMap(group=>Object.values(group.totals).map(sum=>[group.owner??group.name,group.owner?group.name:'',sum.currency,...maintenanceExportMetrics.map(([,field])=>sum[field]/100),sum.unknownWorks]));
 const apartments=sheet(summaryHeadings,[28,30,12,20,24,20,22,18],summaryRows(result.byApartment));
 const owners=sheet(summaryHeadings,[28,30,12,20,24,20,22,18],summaryRows(result.byOwner));
 const total=sheet(summaryHeadings,[28,30,12,20,24,20,22,18],summaryRows([{name:t('maintenanceExportGrand'),totals:result.totals}]));
 return {bytes:createXlsx(detail.sheet,styles,t('maintenanceExportDetails'),{headerRow:detail.header,additionalSheets:[{name:t('reportByApartment'),sheet:apartments.sheet,headerRow:apartments.header},{name:t('maintenanceExportByOwner'),sheet:owners.sheet,headerRow:owners.header},{name:t('maintenanceExportGrand'),sheet:total.sheet,headerRow:total.header}]}),filename:`Maintenance-${filters.start||'all'}-${filters.end||'all'}.xlsx`};
}
export function downloadMaintenanceExcel(...args){const {bytes,filename}=maintenanceExcel(...args);return saveExport({bytes,filename,mimeType:MIME});}
