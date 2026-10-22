import {selectReservationsReport} from './reservations-report.js';
import {canEditPayments} from './payments.js';
import {formatMoney} from './booking-values.js';
import {displayDate} from './date-format.js?v=0.2.5';
import {today} from './domain.js?v=0.2.1';
import {t} from './i18n.js?v=0.3.1';
export function createReportsScreen({root,getState,getEntitlement}){
 const date=today(),year=Number(date.slice(0,4)),month=Number(date.slice(5,7));
 const last=new Date(Date.UTC(year,month,0)).getUTCDate();
 const filters={start:date.slice(0,7)+'-01',end:date.slice(0,7)+'-'+last,apartmentId:'',status:'all',currency:'RON'};
 function text(tag,key,parent){const el=document.createElement(tag);el.dataset.i18n=key;el.textContent=t(key);parent.append(el);return el;}
 const lock=document.createElement('div');lock.id='reports-locked';lock.className='collections-locked';root.append(lock);text('strong','reportPremium',lock);text('p','reportBenefits',lock);
 const content=document.createElement('section');content.id='reports-content';root.append(content);text('h2','reportTitle',content);
 const controls=document.createElement('div');controls.className='collections-filters report-filters';content.append(controls);
 const inputs={};for(const [name,key,type] of [['start','reportStart','date'],['end','reportEnd','date'],['apartmentId','apartment','select'],['status','bookingStatus','select'],['currency','collectionCurrency','select']]){
  const label=document.createElement('label');text('span',key,label);const el=document.createElement(type==='select'?'select':'input');if(type==='date')el.type='date';el.id='report-'+name;label.append(el);controls.append(label);inputs[name]=el;el.onchange=()=>{filters[name]=el.value;render();};
 }
 const error=document.createElement('p');error.id='report-error';error.setAttribute('role','alert');content.append(error);
 const summary=document.createElement('div');summary.id='report-summary';summary.className='collections-summary';summary.setAttribute('aria-live','polite');content.append(summary);
 const count=document.createElement('p');count.id='report-count';count.setAttribute('aria-live','polite');content.append(count);
 const explanation=document.createElement('details');explanation.id='report-explanation';content.append(explanation);text('summary','reportCalculation',explanation);
 text('p','reportBasis',explanation);const notice=document.createElement('p');notice.id='report-notice';explanation.append(notice);
 const list=document.createElement('div');list.id='report-list';list.className='report-list';content.append(list);
 function option(select,value,label){const el=document.createElement('option');el.value=value;el.textContent=label;select.append(el);}
 function render(){
  const allowed=canEditPayments(getEntitlement());lock.hidden=allowed;content.hidden=!allowed;summary.replaceChildren();list.replaceChildren();notice.textContent='';count.textContent='';error.hidden=true;if(!allowed)return;
  const state=getState();if(filters.apartmentId&&!state.apartments.some(a=>a.id===filters.apartmentId))filters.apartmentId='';
  for(const name of ['apartmentId','status','currency'])inputs[name].replaceChildren();
  option(inputs.apartmentId,'',t('allApartments'));for(const a of state.apartments)option(inputs.apartmentId,a.id,a.name);
  for(const status of ['all','confirmed','unconfirmed'])option(inputs.status,status,t(status==='all'?'reportAllStatus':status));for(const code of ['RON','EUR'])option(inputs.currency,code,code);
  for(const [name,input] of Object.entries(inputs))input.value=filters[name];
  let result;try{result=selectReservationsReport(state,filters,getEntitlement());}catch(reason){error.textContent=t(reason.message);error.hidden=false;return;}
  for(const [key,value,id] of [['reportTotal',result.totalAmountCents,'total'],['reportReceived',result.receivedAmountCents,'received'],['remainingAmount',result.balanceCents,'balance']]){const card=document.createElement('div');text('span',key,card);const amount=document.createElement('strong');amount.id='report-'+id;amount.textContent=formatMoney(value,filters.currency);card.append(amount);summary.append(card);}
  count.textContent=t('reportCount',{count:result.rows.length});
  notice.textContent=t('reportNotice',{count:result.rows.length,unknown:result.unpricedCount,legacy:formatMoney(result.legacyAmountCents,filters.currency)});
  if(!result.rows.length)text('p','reportEmpty',list);
  for(const row of result.rows){
   const card=document.createElement('article');card.className='report-card';card.dataset.bookingId=row.bookingId;
   const name=document.createElement('h3');name.textContent=row.guest;card.append(name);const apartment=document.createElement('p');apartment.textContent=row.apartment;card.append(apartment);
   const details=document.createElement('dl');for(const [key,value] of [['checkIn',displayDate(row.checkIn)],['checkOut',displayDate(row.checkOut)],['nights',String(row.nights)],['bookingStatus',t(row.status)],['reportTotal',formatMoney(row.totalAmountCents,filters.currency)],['reportReceived',formatMoney(row.receivedAmountCents,filters.currency)],['remainingAmount',formatMoney(row.balanceCents,filters.currency)]]){const pair=document.createElement('div');text('dt',key,pair);const dd=document.createElement('dd');dd.textContent=value;pair.append(dd);details.append(pair);}card.append(details);
   if(row.legacyAmountCents){const old=document.createElement('p');old.className='report-legacy';old.textContent=t('reportLegacy',{amount:formatMoney(row.legacyAmountCents,filters.currency)});card.append(old);}list.append(card);
  }
 }
 return {render};
}
