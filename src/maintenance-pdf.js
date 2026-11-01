import {selectMaintenanceExport,maintenanceExportMetrics} from './maintenance-export.js';
import {jsPDF} from './vendor/jspdf.js';
import {normal,bold} from './vendor/report-fonts.js';
import {saveExport} from './file-export.js';
import {formatMoney} from './booking-values.js';
import {displayDate} from './date-format.js?v=0.2.5';
import {t} from './i18n.js?v=0.3.1';
export function maintenancePDF(state,data,filters,access){
 const result=selectMaintenanceExport(state,data,filters,access),doc=new jsPDF({orientation:'landscape',unit:'pt',format:'a4',compress:true});
 for(const [style,font] of [['normal',normal],['bold',bold]]){doc.addFileToVFS(style+'.ttf',font);doc.addFont(style+'.ttf','Maintenance',style);}
 doc.setProperties({title:t('maintenanceExportTitle'),author:'Apartment Booking Manager'});
 const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=32,available=width-64,bottom=height-36;let y;
 function font(size=8.5,bold=false){doc.setFont('Maintenance',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor('#18334e');}
 function wrap(value,width,bold=false){font(8.5,bold);return doc.splitTextToSize(String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' '),width);}
 function heading(){font(14,true);doc.text('Apartment Booking Manager',margin,32);font(12,true);doc.text(t('maintenanceExportTitle'),margin,50);y=68;for(const line of wrap(result.metadata,available)){font();doc.text(line,margin,y);y+=12;}y+=8;}
 function page(){doc.addPage();heading();}
 function paragraph(value,bold=false){for(const line of wrap(value,available,bold)){if(y+14>bottom)page();font(8.5,bold);doc.text(line,margin,y);y+=12;}y+=8;}
 function table(headings,widths,rows){
  function header(){const values=headings.map((label,i)=>wrap(label,widths[i]-12,true)),h=Math.max(...values.map(v=>v.length))*11+14;if(y+h+28>bottom)page();doc.setFillColor('#246399');doc.rect(margin,y,available,h,'F');let x=margin;values.forEach((lines,i)=>{font(8.5,true);doc.setTextColor('#ffffff');lines.forEach((line,k)=>doc.text(line,x+6,y+13+k*11));x+=widths[i];});y+=h;}
  header();
  for(const [index,row] of rows.entries()){
   const values=row.map((value,i)=>wrap(value,widths[i]-12)),length=Math.max(1,...values.map(v=>v.length));let offset=0;
   // Split oversized rows across pages; never clip or shrink the text to fit.
   while(offset<length){if(y+26>bottom){page();header();}const count=Math.min(length-offset,Math.floor((bottom-y-14)/11));if(count<1){page();header();continue;}
    const h=count*11+14;doc.setFillColor(index%2?'#f2f6fb':'#ffffff');doc.rect(margin,y,available,h,'F');let x=margin;
    values.forEach((lines,i)=>{font();lines.slice(offset,offset+count).forEach((line,k)=>doc.text(line,x+6,y+13+k*11));x+=widths[i];});y+=h;offset+=count;
    if(offset<length){page();header();}
   }
  }
  if(!rows.length)paragraph(t('maintenanceEmpty'));y+=12;
 }
 heading();paragraph(t('maintenanceExportBasis'));paragraph(t('maintenanceExportRows',{count:result.rows.length}),true);
 const values=result.rows.map(row=>{
  const details=[t('maintenance_'+row.kind),row.description,row.category?t('maintenanceCategory_'+row.category):'',row.status?t('maintenanceStatus_'+row.status):'',row.provider?`${t('maintenanceProvider')}: ${row.provider}`:'',row.completedDate?`${t('maintenanceCompleted')}: ${displayDate(row.completedDate)}`:'',row.estimatedCents!==undefined?`${t('maintenanceEstimated')}: ${formatMoney(row.estimatedCents,row.currency)}`:'',row.linked||row.workId?t('maintenanceExportLinkedNote'):'',row.notes??''].filter(Boolean).join('\n');
  return [displayDate(row.exportDate),row.owner,row.apartment,details,formatMoney(row.amountCents,row.currency),row.currency,formatMoney(row.countedCents,row.currency)];
 });
 table(['maintenanceExportDate','apartmentOwner','apartment','maintenanceDescription','maintenanceAmount','collectionCurrency','maintenanceExportCounted'].map(key=>t(key)),[72,90,100,240,90,54,available-646],values);
 for(const [title,groups] of [[t('reportByApartment'),result.byApartment],[t('maintenanceExportByOwner'),result.byOwner],[t('maintenanceExportGrand'),[{name:t('maintenanceExportGrand'),totals:result.totals}]]]){
  if(y+110>bottom)page();paragraph(title,true);
  const rows=groups.flatMap(group=>Object.values(group.totals).map(sum=>[group.owner?group.owner+' · '+group.name:group.name,sum.currency,...maintenanceExportMetrics.map(([,field])=>formatMoney(sum[field],sum.currency)),String(sum.unknownWorks)]));
  table([title,t('collectionCurrency'),...maintenanceExportMetrics.map(([key])=>t(key)),t('maintenanceExportUnknown')],[220,54,100,130,100,100,available-704],rows);
 }
 const pageCount=doc.getNumberOfPages();for(let n=1;n<=pageCount;n++){doc.setPage(n);font(8);doc.text(t('reportPDFPage',{page:n,total:pageCount}),width-margin,height-15,{align:'right'});}
 return {bytes:new Uint8Array(doc.output('arraybuffer')),filename:`Maintenance-${filters.start||'all'}-${filters.end||'all'}.pdf`,pageCount};
}
export function downloadMaintenancePDF(...args){const {bytes,filename}=maintenancePDF(...args);return saveExport({bytes,filename,mimeType:'application/pdf'});}
