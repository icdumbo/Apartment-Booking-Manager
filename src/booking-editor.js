import {renderPaymentHistory} from './payment-editor.js';
import {dayNumber,today,isoDay} from './domain.js?v=0.2.1';
import {parseDate} from './date-format.js?v=0.2.5';
import {t} from './i18n.js?v=0.3.1';
import {BOOKING_SOURCES,moneyInput,parseMoney,bookingBalance,formatRON} from './booking-values.js';
export function renderBookingFields({container,state,item,defaults,field,textLabel,canManagePayments}){
 function section(title){const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.dataset.i18n=title;legend.textContent=t(title);group.append(legend);container.append(group);return group;}
 function input(group,key,name,value,type='text',optional=false){const control=field(key,name,value,type);control.required=!optional;group.append(control.parentElement);return control;}
 function select(group,key,name,options,value,optional=false){const label=textLabel(key),control=document.createElement('select');control.name=name;control.required=!optional;
  for(const [id,labelKey,literal] of options){const option=document.createElement('option');option.value=id;if(labelKey)option.dataset.i18n=labelKey;option.textContent=labelKey?t(labelKey):literal;control.append(option);}
  control.value=value;if(name==='apartmentId'||name==='status')label.className='booking-'+name;label.append(control);group.append(label);return control;
 }
 function output(group,key,id){const label=textLabel(key),control=document.createElement('output');control.id=id;label.append(control);group.append(label);return control;}
 const guest=section('guestSection');input(guest,'guest','guest',item?.guest);input(guest,'phone','phone',item?.phone,'tel');
 const stay=section('staySection');
 select(stay,'apartment','apartmentId',state.apartments.map(a=>[a.id,null,a.name]),item?.apartmentId||defaults.apartmentId||state.apartments[0]?.id);
 select(stay,'bookingStatus','status',[['confirmed','confirmed'],['unconfirmed','unconfirmed']],item?.status||'confirmed');
 const checkIn=item?.checkIn||defaults.checkIn||today();input(stay,'checkIn','checkIn',checkIn,'date');input(stay,'checkOut','checkOut',item?.checkOut||isoDay(dayNumber(checkIn)+1),'date');
 output(stay,'nights','booking-nights');const persons=input(stay,'persons','persons',item?.persons??'','text',true);persons.inputMode='numeric';
 const payment=section('paymentSection');
 for(const [key,name] of [['totalAmount','totalAmountCents'],['paidAmount','paidAmountCents']]){const control=input(payment,key,name,moneyInput(item?.[name]),'text',true);control.inputMode='decimal';control.placeholder='0,00';control.maxLength=18;}
 output(payment,'remainingAmount','booking-balance');
 const paid=container.querySelector('[name=paidAmountCents]');
 const history=renderPaymentHistory(container,{booking:item,canManage:canManagePayments,getTotal:()=>parseMoney(container.querySelector('[name=totalAmountCents]').value),getPaid:()=>parseMoney(paid.value),onChange:ledger=>{paid.value=moneyInput(ledger.paidAmountCents);paid.readOnly=true;updateBookingSummary(container);}});
 paid.readOnly=item?.payments!==undefined;
 paid.addEventListener('input',()=>{try{history.refresh();}catch{}});
 const additional=section('additionalSection');select(additional,'bookingSource','source',[['','notSpecified'],...BOOKING_SOURCES.map(source=>[source,'source_'+source])],item?.source??'',true);
 const label=textLabel('notes'),notes=document.createElement('textarea');notes.name='notes';notes.rows=3;notes.maxLength=4000;notes.value=item?.notes??'';label.className='booking-notes';label.append(notes);additional.append(label);
 const hint=document.createElement('p');hint.className='booking-optional-hint';hint.dataset.i18n='bookingOptional';hint.textContent=t('bookingOptional');container.append(hint);
 updateBookingSummary(container);
 return history;
}
export function updateBookingSummary(container){
 const get=name=>container.querySelector(`[name="${name}"]`)?.value??'';
 const nights=container.querySelector('#booking-nights'),balance=container.querySelector('#booking-balance');if(!nights)return;
 try{const count=dayNumber(parseDate(get('checkOut')))-dayNumber(parseDate(get('checkIn')));nights.textContent=count>0?t('nightCount',{count}):'—';}catch{nights.textContent='—';}
 try{const totalAmountCents=parseMoney(get('totalAmountCents')),paidAmountCents=parseMoney(get('paidAmountCents'));const amount=bookingBalance({totalAmountCents,paidAmountCents});balance.textContent=amount===undefined||amount<0?'—':formatRON(amount);}catch{balance.textContent='—';}
}
