import {REPORT_METRICS,reportGroups} from './report-summary.js';
import {saveExport} from './file-export.js';
import {jsPDF} from './vendor/jspdf.js';
import {normal,bold} from './vendor/report-fonts.js';
import {selectReservationsReport} from './reservations-report.js';
import {formatMoney} from './booking-values.js';
import {displayDate} from './date-format.js?v=0.2.5';
import {t} from './i18n.js?v=0.3.1';
export const PDF_MIME='application/pdf';
// A read-only snapshot. Always re-check the current entitlement and filters before generating bytes.
export function reservationsPDF(state,filters,entitlement){
 const result=selectReservationsReport(state,filters,entitlement),currency=result.currency;
 const doc=new jsPDF({orientation:'landscape',unit:'pt',format:'a4',compress:true});
 for(const [style,font] of [['normal',normal],['bold',bold]]){doc.addFileToVFS(style+'.ttf',font);doc.addFont(style+'.ttf','Report',style);}
 doc.setFont('Report','normal');doc.setProperties({title:t('reportPDFTitle'),author:'Apartment Booking Manager',creator:'Apartment Booking Manager'});
 const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=32,available=width-2*margin,bottom=height-40;
 const ink='#18334e',blue='#246399',muted='#526c85';let y=0;
 const clean=value=>String(value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 function font(size=9,style='normal',color=ink){doc.setFont('Report',style);doc.setFontSize(size);doc.setTextColor(color);}
 function lines(value,max,size=9,style='normal'){font(size,style);return doc.splitTextToSize(clean(value),max);}
 function heading(){font(15,'bold',blue);doc.text('Apartment Booking Manager',margin,38);font(12,'bold');doc.text(t('reportPDFTitle'),margin,58);doc.setDrawColor('#d8e7f8');doc.line(margin,68,width-margin,68);y=84;}
 function page(){doc.addPage();heading();}
 function paragraph(value,{size=8.5,style='normal',color=muted}={}){const wrapped=lines(value,available,size,style),step=size*1.45;for(const line of wrapped){if(y+step>bottom)page();font(size,style,color);doc.text(line,margin,y);y+=step;}y+=6;}
 heading();
 paragraph(`${t('reportStart')}: ${displayDate(filters.start)} · ${t('reportEnd')}: ${displayDate(filters.end)}`,{size:9,color:ink});
 paragraph(`${t('apartment')}: ${filters.apartmentId?(state.apartments.find(a=>a.id===filters.apartmentId)?.name??''):t('allApartments')} · ${t('bookingStatus')}: ${t(filters.status==='all'||!filters.status?'reportAllStatus':filters.status)} · ${t('collectionCurrency')}: ${currency==='ALL'?t('allCurrencies'):currency}`,{size:9,color:ink});
 const groups=reportGroups(result);
 paragraph(t('reportTotalCount',{count:result.rows.length})+' · '+t('reportUnpricedCount',{count:result.unpricedCount}),{size:10,style:'bold',color:ink});
 if(groups.length){
  const labelWidth=Math.min(240,available*.4),valueWidth=(available-labelWidth)/groups.length;
  const summaryRows=[['reportMetric',null],...REPORT_METRICS];
  for(const [index,[key,field]] of summaryRows.entries()){
   const values=[t(key),...groups.map(group=>field===null?group.currency:field==='count'?String(group.count):formatMoney(group[field],group.currency))];
   const sizes=[labelWidth,...groups.map(()=>valueWidth)];
   const wrapped=values.map((value,i)=>lines(value,sizes[i]-18,9,index===0?'bold':'normal'));
   const h=Math.max(25,Math.max(...wrapped.map(value=>value.length))*12+12);
   if(y+h>bottom)page();
   doc.setFillColor(index===0?blue:index%2?'#ffffff':'#f2f6fb');doc.rect(margin,y,available,h,'F');
   let x=margin;wrapped.forEach((value,i)=>{font(9,index===0||i>0?'bold':'normal',index===0?'#ffffff':ink);doc.text(value,i?x+sizes[i]-9:x+9,y+16,{align:i?'right':'left'});x+=sizes[i];});y+=h;
  }
  y+=12;
 }
 paragraph(t('reportBasis'));
 paragraph(t('reportExportNotice',{count:result.rows.length,unknown:result.unpricedCount}));
 const widths=[116,126,65,65,46,82,92,92,available-684];
 const headings=['apartment','guest','checkIn','checkOut','reportPDFNights','bookingStatus','reportTotal','reportReceived','remainingAmount'];
 function tableHeader(){
  const labels=headings.map((key,i)=>lines(t(key),widths[i]-12,8,'bold')),h=Math.max(...labels.map(a=>a.length))*11+14;
  doc.setFillColor(blue);doc.rect(margin,y,available,h,'F');let x=margin;
  labels.forEach((label,i)=>{font(8,'bold','#ffffff');doc.text(label,x+6,y+14);x+=widths[i];});y+=h;return h;
 }
 if(y+80>bottom)page();tableHeader();
 function money(amount,code){return formatMoney(amount,code);}
 for(const [index,row] of result.rows.entries()){
  const values=[row.apartment,row.guest,displayDate(row.checkIn),displayDate(row.checkOut),String(row.nights),t(row.status),money(row.totalAmountCents,row.currency),money(row.receivedAmountCents,row.currency),money(row.balanceCents,row.currency)];
  const wrapped=values.map((value,i)=>lines(value,widths[i]-12,8)),rowHeight=Math.max(30,Math.max(...wrapped.map(a=>a.length))*11+14);
  if(y+rowHeight>bottom){page();tableHeader();}
  doc.setFillColor(row.totalAmountCents===undefined?'#fff8e8':index%2?'#f2f6fb':'#ffffff');doc.rect(margin,y,available,rowHeight,'F');let x=margin;
  wrapped.forEach((value,i)=>{font(8);const right=i>=6;doc.text(value,right?x+widths[i]-6:x+6,y+14,{align:right?'right':'left'});x+=widths[i];});
  doc.setDrawColor('#e0e8f2');doc.line(margin,y+rowHeight,width-margin,y+rowHeight);y+=rowHeight;
 }
 if(!result.rows.length){y+=18;paragraph(t('reportEmpty'));}
 for(const group of groups){
 const totalValues=[group.totalAmountCents,group.receivedAmountCents,group.balanceCents].map((amount,i)=>lines(money(amount,group.currency),widths[i+6]-12,8,'bold'));
 const totalHeight=Math.max(34,Math.max(...totalValues.map(a=>a.length))*11+14);
 if(y+totalHeight>bottom){page();tableHeader();}
 doc.setFillColor('#eef5fd');doc.rect(margin,y,available,totalHeight,'F');font(9,'bold',blue);doc.text(t('reportTotals')+' · '+group.currency,margin+6,y+21);
 let x=margin+widths.slice(0,6).reduce((a,b)=>a+b,0);
 totalValues.forEach((value,i)=>{font(8,'bold',blue);doc.text(value,x+widths[i+6]-6,y+14,{align:'right'});x+=widths[i+6];});y+=totalHeight;
 }
 const pageCount=doc.getNumberOfPages();for(let i=1;i<=pageCount;i++){doc.setPage(i);font(8,'normal',muted);doc.text(t('reportPDFPage',{page:i,total:pageCount}),width-margin,height-18,{align:'right'});}
 return {bytes:new Uint8Array(doc.output('arraybuffer')),filename:`Reservations-${filters.start}-${filters.end}-${currency}.pdf`,pageCount};
}
export function downloadReservationsPDF(state,filters,entitlement){
 const {bytes,filename}=reservationsPDF(state,filters,entitlement);
 return saveExport({bytes,filename,mimeType:PDF_MIME});
}
