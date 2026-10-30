import {selectStatistics} from './statistics.js';
import {canEditPayments} from './payments.js';
import {formatMoney} from './booking-values.js';
import {t,getLanguage} from './i18n.js?v=0.3.1';
import {ownerApartments,ownerOptions} from './owners.js';
const svgNS='http://www.w3.org/2000/svg';
export function createStatisticsScreen({root,getState,getEntitlement}){
 const now=new Date(),filters={mode:'monthly',year:now.getFullYear(),month:now.getMonth()+1,ownerId:'',apartmentId:'',currency:'RON'};
 function text(tag,key,parent=root){const el=document.createElement(tag);el.dataset.i18n=key;el.textContent=t(key);parent.append(el);return el;}
 const lock=document.createElement('div');lock.id='statistics-locked';lock.className='collections-locked';root.append(lock);text('strong','statisticsPremium',lock);text('p','statisticsBenefits',lock);
 const content=document.createElement('div');content.id='statistics-content';root.append(content);
 const controls=document.createElement('div');controls.className='collections-filters statistics-filters';content.append(controls);
 function control(key,name,type='select'){const label=document.createElement('label');text('span',key,label);const el=document.createElement(type);el.id='statistics-'+name;label.append(el);controls.append(label);el.onchange=()=>{filters[name]=name==='year'||name==='month'?Number(el.value):el.value;if(name==='ownerId')filters.apartmentId='';render();};return el;}
 const mode=control('statisticsMode','mode'),month=control('collectionMonth','month'),year=control('collectionYear','year','input'),currency=control('collectionCurrency','currency'),owner=control('apartmentOwner','ownerId'),apartment=control('apartment','apartmentId');year.type='number';year.min='1';year.max='9999';year.step='1';
 const error=document.createElement('p');error.id='statistics-error';error.setAttribute('role','alert');content.append(error);
 const main=document.createElement('div');main.className='statistics-primary';main.id='statistics-primary';content.append(main);
 const secondary=document.createElement('div');secondary.className='statistics-secondary';secondary.id='statistics-secondary';content.append(secondary);
 const notice=document.createElement('p');notice.id='statistics-notice';content.append(notice);
 const comparison=document.createElement('section');comparison.id='statistics-comparison';content.append(comparison);
 const charts=document.createElement('div');charts.className='statistics-charts';charts.id='statistics-charts';content.append(charts);
 const separate=document.createElement('section');separate.className='collections-legacy';separate.id='statistics-separate';content.append(separate);
 const definitions=document.createElement('details');definitions.className='statistics-definitions';content.append(definitions);text('summary','statisticsDefinitions',definitions);text('p','statisticsDefinitionsText',definitions);
 function option(el,value,label){const entry=document.createElement('option');entry.value=value;entry.textContent=label;el.append(entry);}
 const number=value=>new Intl.NumberFormat(getLanguage()==='ro'?'ro-RO':'en-GB',{maximumFractionDigits:1}).format(value);
 function card(parent,key,value,id){const item=document.createElement('div');text('span',key,item);const strong=document.createElement('strong');strong.id=id;strong.textContent=value;item.append(strong);parent.append(item);}
 function node(tag,attributes={},value){const el=document.createElementNS(svgNS,tag);for(const [key,val] of Object.entries(attributes))el.setAttribute(key,String(val));if(value!==undefined)el.textContent=value;return el;}
 function chart(key,result,metric,isMoney){
  const section=document.createElement('section');section.className='statistics-chart';text('h2',key,section);
  const previous=result.previousSeries?.some(p=>p.hasData)?result.previousSeries:null;
  const caption=document.createElement('p');caption.textContent=t('statisticsChartYear',{year:result.year,currency:isMoney?filters.currency:'%'});if(previous)caption.textContent+=' · '+t('statisticsChartPrevious',{year:result.year-1});section.append(caption);
  const peak=Math.max(0,...result.series.map(p=>p[metric]),...(previous?.map(p=>p[metric])??[]));
  const max=isMoney?Math.max(100,peak):100;
  // Keep labels in separate rows; compact sparse charts without changing their scale or values.
  const plotHeight=peak/max<0.1?65:145,baseline=42+plotHeight;
  const svg=node('svg',{viewBox:`0 0 600 ${baseline+78}`,role:'img','aria-label':t(key)});svg.append(node('title',{},t(key)));
  for(const [y,label] of [[20,isMoney?formatMoney(max,filters.currency):'100%'],[baseline+29,isMoney?formatMoney(0,filters.currency):'0%']])svg.append(node('text',{x:4,y,class:'statistics-axis'},label));
  svg.append(node('line',{x1:8,y1:baseline,x2:592,y2:baseline,stroke:'#dbe5ef'}));
  for(let i=0;i<12;i++){
   const x=12+i*48;
   for(const [values,offset,klass] of [[result.series,previous?17:10,'chart-current'],...(previous?[[previous,0,'chart-previous']]:[])]){
    if(klass==='chart-previous'&&!values[i].hasData)continue;
    const value=values[i][metric],height=value/max*plotHeight,width=previous?15:27;
    const rect=node('rect',{x:x+offset,y:baseline-height,width,height,rx:3,class:klass});rect.append(node('title',{},`${t('monthsShort')[i]} ${klass==='chart-current'?result.year:result.year-1}: ${isMoney?formatMoney(value,filters.currency):number(value)+'%'}`));svg.append(rect);
   }
   svg.append(node('text',{x:x+19,y:baseline+66,'text-anchor':'middle',class:'statistics-month'},t('monthsShort')[i]));
  }
  section.append(svg);
  const detail=document.createElement('details');text('summary','statisticsChartValues',detail);const table=document.createElement('table');table.className='statistics-values';const head=document.createElement('tr');for(const label of [t('collectionMonth'),String(result.year),...(previous?[String(result.year-1)]:[])]){const th=document.createElement('th');th.textContent=label;head.append(th);}table.append(head);
  result.series.forEach((point,index)=>{const row=document.createElement('tr');for(const value of [t('monthsShort')[index],isMoney?formatMoney(point[metric],filters.currency):number(point[metric])+'%',...(previous?[previous[index].hasData?(isMoney?formatMoney(previous[index][metric],filters.currency):number(previous[index][metric])+'%'):'—']:[])]){const td=document.createElement('td');td.textContent=value;row.append(td);}table.append(row);});detail.append(table);section.append(detail);charts.append(section);
 }
 function render(){
  const allowed=canEditPayments(getEntitlement());lock.hidden=allowed;content.hidden=!allowed;for(const el of [main,secondary,notice,comparison,charts,separate])el.replaceChildren();apartment.replaceChildren();error.hidden=true;if(!allowed)return;
  const state=getState(),apartments=ownerApartments(state.apartments,filters.ownerId);ownerOptions(owner,state.apartments,filters.ownerId,t);if(filters.apartmentId&&!apartments.some(a=>a.id===filters.apartmentId))filters.apartmentId='';
  mode.replaceChildren();for(const value of ['monthly','annual','comparison'])option(mode,value,t('statistics_'+value));mode.value=filters.mode;
  month.replaceChildren();t('monthsFull').forEach((value,index)=>option(month,String(index+1),value));month.value=String(filters.month);month.disabled=filters.mode==='annual';year.value=String(filters.year);
  option(apartment,'',t('allApartments'));for(const item of apartments)option(apartment,item.id,item.name);apartment.value=filters.apartmentId;
  currency.replaceChildren();for(const code of ['RON','EUR'])option(currency,code,code);currency.value=filters.currency;
  let result;try{result=selectStatistics(state,filters,getEntitlement());}catch(reason){if(reason.message==='statisticsPremium'){lock.hidden=false;content.hidden=true;return;}error.textContent=t(reason.message);error.hidden=false;return;}
  const c=result.current;
  card(main,'statisticsOccupancy',number(c.occupancy)+'%','statistics-occupancy');card(main,'statisticsBookings',number(c.bookingCount),'statistics-bookings');card(main,'statisticsNights',number(c.occupiedNights),'statistics-nights');card(main,'collectionsReceived',formatMoney(c.receivedAmountCents,filters.currency),'statistics-received');
  card(secondary,'statisticsAvailable',number(c.availableNights),'statistics-available');card(secondary,'statisticsAverageStay',number(c.averageStay),'statistics-average-stay');card(secondary,'statisticsNightValue',formatMoney(c.averageNightValueCents,filters.currency),'statistics-night-value');card(secondary,'statisticsBookingValue',formatMoney(c.averageBookingValueCents,filters.currency),'statistics-booking-value');
  notice.textContent=t(result.apartmentCount?'statisticsBasis':'statisticsNoApartments',{capacity:c.capacity,currency:filters.currency,unknown:c.unpricedCount});
  comparison.hidden=filters.mode!=='comparison';if(filters.mode==='comparison'){
   text('h2','statisticsComparison',comparison);if(!result.previous?.hasData)text('p','statisticsNoPrevious',comparison);else{
    const previous=result.previous,table=document.createElement('table');table.className='statistics-values';const head=document.createElement('tr');for(const title of [t('statisticsMetric'),String(filters.year),String(filters.year-1)]){const th=document.createElement('th');th.textContent=title;head.append(th);}table.append(head);
    for(const [key,a,b] of [['statisticsOccupancy',number(c.occupancy)+'%',number(previous.occupancy)+'%'],['statisticsBookings',number(c.bookingCount),number(previous.bookingCount)],['statisticsNights',number(c.occupiedNights),number(previous.occupiedNights)],['collectionsReceived',formatMoney(c.receivedAmountCents,filters.currency),formatMoney(previous.receivedAmountCents,filters.currency)]]){const tr=document.createElement('tr');for(const value of [t(key),a,b]){const td=document.createElement('td');td.textContent=value;tr.append(td);}table.append(tr);}comparison.append(table);
   }
  }
  chart('statisticsReceiptsChart',result,'receivedAmountCents',true);chart('statisticsOccupancyChart',result,'occupancy',false);
  text('h2','statisticsSeparate',separate);const old=document.createElement('p');old.id='statistics-legacy';old.textContent=t('statisticsLegacy',{amount:formatMoney(c.legacyAmountCents,filters.currency)});separate.append(old);const unrecorded=document.createElement('p');unrecorded.id='statistics-no-history';unrecorded.textContent=t('statisticsNoHistory',{count:c.noHistoryCount,amount:formatMoney(c.noHistoryValue,filters.currency)});separate.append(unrecorded);
 }
 return {render};
}
