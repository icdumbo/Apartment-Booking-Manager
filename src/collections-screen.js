import {selectCollections} from './collections.js';
import {canEditPayments} from './payments.js';
import {formatMoney} from './booking-values.js';
import {t} from './i18n.js?v=0.3.1';
import {displayDate} from './date-format.js?v=0.2.5';
export function createCollectionsScreen({root,getState,getEntitlement,openBooking}){
 const now=new Date(),filters={year:now.getFullYear(),month:now.getMonth()+1,apartmentId:'',currency:'RON'};
 function text(tag,key,parent=root){const element=document.createElement(tag);element.dataset.i18n=key;element.textContent=t(key);parent.append(element);return element;}
 const locked=document.createElement('div');locked.className='collections-locked';locked.id='collections-locked';root.append(locked);text('strong','collectionsPremium',locked);text('p','collectionsBenefits',locked);
 const content=document.createElement('div');content.id='collections-content';root.append(content);
 const controls=document.createElement('div');controls.className='collections-filters';content.append(controls);
 function control(key,name,tag='select'){
  const label=document.createElement('label');text('span',key,label);const input=document.createElement(tag);input.id='collections-'+name;label.append(input);controls.append(label);
  input.onchange=()=>{filters[name]=name==='year'||name==='month'?Number(input.value):input.value;render();};return input;
 }
 const month=control('collectionMonth','month'),year=control('collectionYear','year','input'),apartment=control('apartment','apartmentId'),currency=control('collectionCurrency','currency');year.type='number';year.min='1';year.max='9999';year.step='1';
 const error=text('p','invalidCollectionPeriod',content);error.id='collections-error';error.setAttribute('role','alert');
 const summary=document.createElement('div');summary.className='collections-summary';summary.id='collections-summary';summary.setAttribute('aria-live','polite');content.append(summary);
 text('p','collectionsStayBasis',content);
 const unknown=document.createElement('p');unknown.id='collections-unpriced';content.append(unknown);
 text('h2','collectionsDatedHeading',content);text('p','collectionsDateBasis',content);
 const list=document.createElement('div');list.className='collections-list';list.id='collections-list';content.append(list);
 const legacy=document.createElement('section');legacy.className='collections-legacy';legacy.id='collections-legacy';content.append(legacy);text('h2','collectionsLegacyHeading',legacy);text('p','collectionsLegacyBasis',legacy);
 const legacyTotal=document.createElement('strong');legacyTotal.id='collections-legacy-total';legacy.append(legacyTotal);
 const legacyList=document.createElement('div');legacyList.className='collections-list';legacy.append(legacyList);
 function navigate(id){if(!canEditPayments(getEntitlement())){render();return;}if(getState().bookings.some(b=>b.id===id))openBooking(id);}
 function option(select,value,label){const entry=document.createElement('option');entry.value=value;entry.textContent=label;select.append(entry);}
 function amountCard(key,value,id){const card=document.createElement('div');text('span',key,card);const amount=document.createElement('strong');amount.id=id;amount.textContent=value;card.append(amount);summary.append(card);}
 function row(item,amount,dateLabel){
  const button=document.createElement('button');button.type='button';button.className='collection-row';button.onclick=()=>navigate(item.bookingId);
  const date=document.createElement('span');date.className='collection-date';date.textContent=dateLabel;
  const info=document.createElement('span');info.className='collection-info';const name=document.createElement('strong');name.textContent=item.guest;const apartmentName=document.createElement('span');apartmentName.textContent=item.apartment;info.append(name,apartmentName);
  const method=document.createElement('span');method.className='collection-method';method.textContent=item.payment?t('method_'+item.payment.method):t('collectionsUnknownMethod');
  const sum=document.createElement('strong');sum.className='collection-amount';sum.textContent=formatMoney(amount,filters.currency);button.append(date,info,method,sum);return button;
 }
 function render(){
  const allowed=canEditPayments(getEntitlement());locked.hidden=allowed;content.hidden=!allowed;
  summary.replaceChildren();list.replaceChildren();legacyList.replaceChildren();legacyTotal.textContent='';unknown.textContent='';error.hidden=true;legacy.hidden=true;
  apartment.replaceChildren();if(!allowed)return;
  const state=getState();if(filters.apartmentId&&!state.apartments.some(a=>a.id===filters.apartmentId))filters.apartmentId='';
  month.replaceChildren();t('monthsFull').forEach((name,index)=>option(month,String(index+1),name));month.value=String(filters.month);year.value=String(filters.year);
  option(apartment,'',t('allApartments'));for(const a of state.apartments)option(apartment,a.id,a.name);apartment.value=filters.apartmentId;
  currency.replaceChildren();for(const code of ['RON','EUR'])option(currency,code,code);currency.value=filters.currency;
  let result;try{result=selectCollections(state,filters,getEntitlement());}catch(reason){if(reason.message==='premiumPayments'){locked.hidden=false;content.hidden=true;return;}error.textContent=t(reason.message);error.hidden=false;return;}
  amountCard('collectionsReceived',formatMoney(result.receivedAmountCents,filters.currency),'collections-received');amountCard('collectionsCount',String(result.paymentCount),'collections-count');amountCard('collectionsOutstanding',formatMoney(result.outstandingAmountCents,filters.currency),'collections-outstanding');
  unknown.hidden=!result.unpricedStays;unknown.textContent=t('collectionsUnpriced',{count:result.unpricedStays});
  if(!result.rows.length)text('p','collectionsEmpty',list);
  for(const item of result.rows)list.append(row(item,item.payment.amountCents,displayDate(item.payment.date)));
  legacy.hidden=!result.legacy.length;legacyTotal.textContent=formatMoney(result.legacyAmountCents,filters.currency);
  for(const item of result.legacy)legacyList.append(row(item,item.amountCents,t('collectionsUnknownDate')));
 }
 return {render};
}
